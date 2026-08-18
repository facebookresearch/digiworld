# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Standalone DigiWorld evaluation entry point.

Usage:
    python -m digiworld_eval.eval config=digiworld_eval/configs/run_one_gpt.yaml
"""

import importlib
import json
import logging
import os
import queue
import tempfile
import threading
from functools import partial
from pathlib import Path

# ---------------------------------------------------------------------------
# Imports — digiworld_eval.lib.* plus omegaconf/upath
# ---------------------------------------------------------------------------

from omegaconf import DictConfig, ListConfig, OmegaConf

from digiworld_eval.lib.agent import Agent, _thread_wrapper
from digiworld_eval.lib.args import API_BACKENDS, EvalArgs, eval_args_to_agent_args
from digiworld_eval.lib.dataset import Dataset
from digiworld_eval.lib.env_config import to_task_idx_datum
from digiworld_eval.lib.logging_utils import (
    add_logger_file_handler,
    initialize_logger,
    set_root_log_level,
)
from digiworld_eval.lib.params import save_params
from digiworld_eval.lib.eval_utils import (
    aggregate_by_task,
    build_metrics_logger,
    create_dump_trajectory_dirs,
    dump_samples,
    load_data,
    validate_aggregation_spec,
    infer_n_samples,
)

import digiworld_eval.env  # noqa: F401 — registers server_env

logger = logging.getLogger()


# ---------------------------------------------------------------------------
# Config loading
# ---------------------------------------------------------------------------

def _apply_cli_list_overrides(cli_args, reference_cfgs):
    keys_to_remove = []
    for key in list(cli_args):
        cli_val = cli_args[key]
        if not isinstance(cli_val, DictConfig):
            continue
        if not all(k.isdigit() for k in cli_val):
            continue
        target = None
        for cfg in reversed(reference_cfgs):
            if cfg is not None and key in cfg and isinstance(cfg[key], ListConfig):
                target = cfg
                break
        if target is None:
            continue
        for idx_str, overrides in cli_val.items():
            idx = int(idx_str)
            if idx < 0 or idx >= len(target[key]):
                raise IndexError(f"CLI override index {idx} out of range for '{key}'")
            if isinstance(overrides, DictConfig):
                target[key][idx] = OmegaConf.merge(target[key][idx], overrides)
            else:
                target[key][idx] = overrides
        keys_to_remove.append(key)
    for key in keys_to_remove:
        del cli_args[key]


def load_from_cli(dataclass_cls, *, from_config_file=False, with_preset=False):
    default_cfg = OmegaConf.structured(dataclass_cls)
    cli_args = OmegaConf.from_cli()
    logger.info(f"CLI args: {cli_args}")

    if "--config" in cli_args:
        config_path = cli_args["--config"]
        cli_dict = {"config": config_path}
        if "--dump_dir" in cli_args:
            cli_dict["dump_dir"] = cli_args["--dump_dir"]
        if "dump_dir" in cli_args:
            cli_dict["dump_dir"] = cli_args["dump_dir"]
        cli_args = OmegaConf.create(cli_dict)

    file_cfg = None
    if from_config_file:
        file_cfg = OmegaConf.load(cli_args.config)
        del cli_args.config

    preset_cfg = None
    if with_preset:
        preset_cfgs = []
        if "__preset_config" in cli_args:
            preset_cfgs.append(OmegaConf.load(cli_args.__preset_config))
            del cli_args.__preset_config
        if file_cfg and "__preset_config" in file_cfg:
            preset_cfgs.append(OmegaConf.load(file_cfg.__preset_config))
            del file_cfg.__preset_config
        if preset_cfgs:
            preset_cfg = OmegaConf.merge(*preset_cfgs)

    ordered_cfgs = [default_cfg]
    if preset_cfg:
        ordered_cfgs.append(preset_cfg)
    if file_cfg:
        ordered_cfgs.append(file_cfg)
    _apply_cli_list_overrides(cli_args, ordered_cfgs)
    ordered_cfgs.append(cli_args)
    cfg = OmegaConf.merge(*ordered_cfgs)
    config = OmegaConf.to_object(cfg)
    assert isinstance(config, dataclass_cls)
    return config


# ---------------------------------------------------------------------------
# Core eval loop
# ---------------------------------------------------------------------------

def run_agent_evals(args: EvalArgs, dump_samples_path: Path) -> None:
    agent = Agent(args=eval_args_to_agent_args(args))

    exc_queue = queue.Queue[Exception]()

    # Single-process eval (global rank 0): always load data and dump on this process.
    task_datasets = {}
    for env_idx, task in enumerate(args.tasks):
        task_query = (task.init_args or {}).get("task_query")
        has_path = task.path is not None
        has_query = task_query is not None
        assert has_path or has_query, "Tasks must have 'path' or 'task_query'"
        assert not (has_path and has_query), "Tasks must have 'path' or 'task_query', not both"

        to_task_idx_datum_te = partial(to_task_idx_datum, task, env_idx)

        if has_path:
            dataset_path = Path(task.path)
            task_datasets[task.name] = Dataset.from_jsonl(dataset_path).map(to_task_idx_datum_te)
        else:
            from digiworld_eval.env.server_env import fetch_tasks_by_tag

            task_query = dict(task_query)
            tag = task_query.pop("tag")
            filter_params = task_query if task_query else None
            env, _ = agent.environments_and_rewards[env_idx]
            server_url = env.server_urls[0]
            tag_tasks = fetch_tasks_by_tag(server_url, tag, params=filter_params)
            task_dicts = [{"task_id": t["id"], **t.get("metadata", {})} for t in tag_tasks]
            logger.info(f"Fetched {len(task_dicts)} tasks for tag '{tag}'")

            tmp_f = tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".jsonl")
            try:
                with tmp_f:
                    for td in task_dicts:
                        tmp_f.write(json.dumps(td) + "\n")
                task_datasets[task.name] = Dataset.from_jsonl(Path(tmp_f.name)).map(to_task_idx_datum_te)
            finally:
                os.unlink(tmp_f.name)

    dataset = Dataset.chain(list(task_datasets.values()))

    loading_thread = threading.Thread(
        target=_thread_wrapper,
        kwargs=dict(
            target=load_data,
            dump_samples_path=dump_samples_path,
            dataset=dataset,
            data_queue=agent.data_queue,
            num_rollout_threads=agent.num_rollout_threads,
            exc_queue=exc_queue,
            no_resume=args.no_resume,
        ),
    )
    loading_thread.start()

    agent.rollout_threads_start()

    dump_thread = threading.Thread(
        target=_thread_wrapper,
        kwargs=dict(
            target=dump_samples,
            dump_queue=agent.dump_queue,
            dump_samples_path=dump_samples_path,
            num_rollout_threads=agent.num_rollout_threads,
            dump_mode=args.dump_mode,
            exc_queue=exc_queue,
            dump_compress=args.dump_compress,
        ),
    )
    dump_thread.start()

    logging.info("Start generating")
    agent.rollout_generations()
    logging.info("Generation done")

    try:
        ex = exc_queue.get_nowait()
    except queue.Empty:
        pass
    else:
        raise RuntimeError("Exception in thread") from ex

    if loading_thread:
        loading_thread.join()
    if dump_thread:
        dump_thread.join()
        if args.run_metrics_aggregation:
            task_results = aggregate_by_task(args, dump_samples_path)
            metrics = {}
            for task_name, results in task_results.items():
                for k, v in results.items():
                    metrics[f"{task_name}/{k}"] = v
            assert args.metric_log_dir is not None
            with build_metrics_logger(Path(args.metric_log_dir), "rl_eval") as eval_logger:
                eval_logger.log_metrics(metrics)
    agent.generator.shutdown()


def eval_agent(args: EvalArgs) -> None:
    if args.run_metrics_aggregation:
        for task_args in args.tasks:
            validate_aggregation_spec(
                task_args.metrics_spec,
                task_args.samples_per_prompt or infer_n_samples(task_args.metrics_spec),
            )

    assert args.dump_dir is not None
    dump_path = Path(args.dump_dir)
    dump_samples_path = dump_path / "trajectories"
    dump_path.mkdir(parents=True, exist_ok=True)
    create_dump_trajectory_dirs(dump_samples_path, args.tasks)
    save_params(args, dump_path / "rl_eval_config.yaml")
    add_logger_file_handler(dump_path / "rl_eval.log")

    run_agent_evals(args, dump_samples_path)


def main() -> None:
    initialize_logger()
    eval_args = load_from_cli(EvalArgs, from_config_file=True, with_preset=True)
    set_root_log_level(eval_args.log_level)

    for module_path in eval_args.extra_env_imports:
        logger.info(f"Importing extra env module: {module_path}")
        importlib.import_module(module_path)

    eval_agent(eval_args)


if __name__ == "__main__":
    main()
