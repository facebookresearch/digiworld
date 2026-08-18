# Copyright (c) Meta Platforms, Inc. and affiliates.
# Inlined eval pipeline: outcomes, DataSource, RolloutInfo, load_data,
# dump_samples, aggregate_by_task, create_dump_trajectory_dirs, etc.

import contextlib
import copy
import gzip
import json
import logging
import math
import queue
import random
import re
import time
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field, fields
from pathlib import Path
from typing import Any

import numpy as np

from functools import lru_cache
import os

from digiworld_eval.lib.core.datatypes import BaseTextDatum
from digiworld_eval.lib.params import save_params
from digiworld_eval.lib.env_api import Trajectory, Transition

logger = logging.getLogger(__name__)

Metrics = dict[str, Any]

# ---------------------------------------------------------------------------
# DataSource / RolloutInfo
# ---------------------------------------------------------------------------


@lru_cache
def get_world_size() -> int:
    if os.environ.get("LOCAL_RANK") is not None:
        return int(os.environ["WORLD_SIZE"])
    return 1

@dataclass(frozen=True)
class DataSource:
    path: str
    line_no: int
    pos: int

    @classmethod
    def from_base_text_datum_source(cls, src: BaseTextDatum.Source) -> "DataSource":
        return cls(str(src.path), src.line_no, src.pos)


@dataclass
class RolloutDumpInfo:
    file_path: Path
    json: dict


@dataclass
class RolloutInfo:
    traj: Trajectory
    data_src: DataSource
    start_args: dict
    begin_step: int
    end_step: int
    rl_task_args: Any
    metrics: dict[str, float] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Outcomes (only functions used by eval)
# ---------------------------------------------------------------------------


def pass_at_k(n: int, c: int, k: int) -> float:
    if n - c < k:
        return 1.0 if c > 0 else 0.0
    return 1.0 - np.prod(1.0 - k / np.arange(n - c + 1, n + 1))


@dataclass
class AnswerData:
    pass_value: bool
    answer: str | None = None
    length: int | float = 0


def get_combinations_with_limit(iterable, k, max_comb=100000):
    from itertools import combinations

    total_combinations = math.comb(len(iterable), k)
    if total_combinations <= max_comb:
        yield from combinations(iterable, k)
    else:
        for _ in range(max_comb):
            yield tuple(random.sample(iterable, k))


def rank_score_at_k(n, k, scores_sorted):
    numerator_sum = 0
    for i in range(1, n - k + 2):
        numerator_sum += math.comb(n - i, k - 1) * scores_sorted[i - 1]
    return numerator_sum / math.comb(n, k)


def short_1_at_k(n, k, pass_length_tup):
    sorted_list = sorted(pass_length_tup, key=lambda x: (x[1] <= 0, x[1]))
    pass_sorted = [a[0] for a in sorted_list]
    return rank_score_at_k(n, k, pass_sorted)


def _short_m_at_k_impl(n, k, m, answer_data_lst):
    total_pass_val = 0.0
    num_subsets = 0
    for subset in get_combinations_with_limit(answer_data_lst, k):
        num_subsets += 1
        sorted_subset = sorted(
            subset, key=lambda ad: (ad.length <= 0, ad.length)
        )[:m]
        answer_counts = {}
        for ad in sorted_subset:
            if ad.answer not in answer_counts:
                answer_counts[ad.answer] = [0, float("-inf"), 0]
                if ad.answer is None:
                    answer_counts[ad.answer][0] = float("-inf")
            answer_counts[ad.answer][0] += 1
            answer_counts[ad.answer][1] = max(answer_counts[ad.answer][1], -ad.length)
            answer_counts[ad.answer][2] += ad.pass_value
        _, _, max_item_sum_pass = max(answer_counts.values())
        max_item_count = max(v[0] for v in answer_counts.values())
        total_pass_val += max_item_sum_pass / max_item_count
    return total_pass_val / num_subsets


def short_m_at_k(n, k, m, answer_data_lst):
    if m == 1:
        pass_length_tup = [
            (ad.pass_value, 0 if ad.answer is None else ad.length)
            for ad in answer_data_lst
        ]
        return short_1_at_k(n, k, pass_length_tup)
    return _short_m_at_k_impl(n, k, m, answer_data_lst)


def majority_at_k(n, k, answer_data_lst):
    for ad in answer_data_lst:
        ad.length = random.random()
    return _short_m_at_k_impl(n, k, k, answer_data_lst)


def get_ks(aggregation_spec):
    return {
        int(agg[1:])
        for aggregation in aggregation_spec.values()
        for agg in aggregation
        if agg.startswith("@")
    }


def infer_n_samples(aggregation_spec):
    ks = get_ks(aggregation_spec)
    if ks:
        max_k = max(ks)
        if max_k > 1:
            return 2 * max_k
    return 1


def validate_aggregation_spec(aggregation_spec, n_samples):
    ks = get_ks(aggregation_spec)
    if ks:
        assert n_samples >= max(ks), (
            f"To run @k evaluation with ks = {sorted(ks)}, at least {max(ks)} "
            f"samples_per_prompt must be passed. n_samples == {n_samples}"
        )


def aggregate_outcomes_from_spec(aggregation_spec, sequences_of_samples):
    outcome_keys = [key for key in sequences_of_samples[0][0].keys()]
    n_samples = len(sequences_of_samples[0])

    def check_outcomes_type(samples, key, T):
        for sample in samples:
            if not isinstance(sample[key], T):
                raise ValueError(
                    f"Type for outcome {key} in sample {sample} is "
                    f"{type(sample[key])}, expected {T}"
                )

    for samples in sequences_of_samples:
        assert n_samples == len(samples)

    aggregate_metrics = []
    for samples in sequences_of_samples:
        metrics = {}
        for key in outcome_keys:
            if key not in aggregation_spec:
                if key == "answer":
                    continue
                if any(not isinstance(s[key], (bool, int, float)) for s in samples):
                    continue
            aggregates = aggregation_spec.get(key, ["mean"])
            for aggregate in aggregates:
                if aggregate.startswith("@"):
                    check_outcomes_type(samples, key, bool)
                    k = int(aggregate[1:])
                    metrics[f"{key}@{k}"] = pass_at_k(
                        n_samples, sum(int(a[key]) for a in samples), k
                    )
                elif aggregate == "mean":
                    check_outcomes_type(samples, key, bool | int | float)
                    metrics[f"{key}_mean"] = sum(a[key] for a in samples) / len(samples)
                elif match := re.fullmatch(r"max(?P<m>\d+)@(?P<k>\d+)", aggregate):
                    check_outcomes_type(samples, key, bool)
                    m_val = int(match.group("m"))
                    k_val = int(match.group("k"))
                    metrics[f"{key}_max{m_val}@{k_val}"] = pass_at_k(
                        n_samples,
                        sum(int(a[key]) and a["n_steps"] <= m_val for a in samples),
                        k_val,
                    )
                elif match := re.fullmatch(r"short(?P<m>\d+)?@(?P<k>\d+)", aggregate):
                    check_outcomes_type(samples, key, bool)
                    k_val = int(match.group("k"))
                    m_val = int(match.group("m"))
                    if m_val == 1:
                        ad_lst = [
                            AnswerData(
                                answer="<DUMMY>",
                                length=s["n_reasoning_tokens"],
                                pass_value=s["pass"],
                            )
                            for s in samples
                        ]
                    else:
                        ad_lst = [
                            AnswerData(
                                answer=s["answer"],
                                length=s["n_reasoning_tokens"],
                                pass_value=s["pass"],
                            )
                            for s in samples
                        ]
                    metrics[f"{key}_short{m_val}@{k_val}"] = short_m_at_k(
                        n_samples, k_val, m_val, ad_lst
                    )
                elif match := re.fullmatch(r"majority@(?P<k>\d+)", aggregate):
                    check_outcomes_type(samples, key, bool)
                    k_val = int(match.group("k"))
                    ad_lst = [
                        AnswerData(answer=s["answer"], pass_value=s["pass"])
                        for s in samples
                    ]
                    metrics[f"{key}_majority@{k_val}"] = majority_at_k(
                        n_samples, k_val, ad_lst
                    )
                else:
                    raise ValueError(f"Aggregate {aggregate} not supported.")
        aggregate_metrics.append(metrics)

    return {
        key: sum(float(am[key]) for am in aggregate_metrics) / len(aggregate_metrics)
        for key in aggregate_metrics[0].keys()
    }


# ---------------------------------------------------------------------------
# Trajectory serialization
# ---------------------------------------------------------------------------


def transition_to_dict(tr, keep_info=True):
    d = asdict(tr)
    if not keep_info:
        del d["info"]
    if "media" in d:
        del d["media"]
    return d


def trajectory_to_dict(traj, keep_info=True):
    d: dict[str, Any] = {
        "transitions": [
            transition_to_dict(tr, keep_info) for tr in traj.transitions
        ],
    }
    if traj.truncated:
        d["truncation_return"] = traj._truncation_return
    return d


def rollout_to_dict(rollout, keep_info=True):
    return {
        "traj": trajectory_to_dict(rollout.traj, keep_info),
        "data_src": asdict(rollout.data_src),
        "start_args": rollout.start_args,
        "begin_step": rollout.begin_step,
        "end_step": rollout.end_step,
        "metrics": rollout.metrics,
        "rl_task_args": asdict(rollout.rl_task_args),
    }


def task_name_to_path_name(task_name: str) -> str:
    return re.sub("[:;]", "", re.sub("[/.]", "_", task_name))


def create_dump_trajectory_dirs(traj_dump_dir: Path, tasks) -> None:
    traj_dump_dir.mkdir(parents=True, exist_ok=True)
    for rl_task_args in tasks:
        task_name = rl_task_args.name
        dump_task_name = task_name_to_path_name(task_name)
        dump_dir_for_task = traj_dump_dir / dump_task_name
        dump_dir_for_task.mkdir(parents=True, exist_ok=True)
        task_config_dump_path = dump_dir_for_task / "task_config.yaml"
        save_params(rl_task_args, task_config_dump_path)


def get_rollout_dump_info(rollouts, metrics, trajectory_dump_dir, dump_mode, worker_id, compress=True):
    assert dump_mode in ("full", "minimal")
    assert metrics is None or len(metrics) == len(rollouts)
    keep_info = True

    rollouts_json = []
    for rollout in rollouts:
        rollouts_json.append(rollout_to_dict(rollout, keep_info=keep_info))
    json_to_dump = {"rollouts": rollouts_json}
    if metrics is not None:
        json_to_dump["metrics"] = metrics

    task_name = rollouts[0].rl_task_args.name
    dump_task_name = task_name_to_path_name(task_name)
    ext = "jsonl.gz" if compress else "jsonl"
    filename = f"worker_{worker_id}.{ext}" if worker_id else f"{dump_task_name}.{ext}"
    file_dir = trajectory_dump_dir / dump_task_name
    assert file_dir.exists()
    return RolloutDumpInfo(file_path=file_dir / filename, json=json_to_dump)


# ---------------------------------------------------------------------------
# load_data / dump_samples / aggregate
# ---------------------------------------------------------------------------


def load_data(dump_samples_path, dataset, data_queue, num_rollout_threads, no_resume=False):
    samples_path = dump_samples_path / "all_metrics.jsonl"
    count_per_source: Counter = Counter()
    if samples_path.exists() and not no_resume:
        with samples_path.open("r") as s:
            for line in s:
                sample = json.loads(line)
                count_per_source.update(
                    [(sample["task_name"], DataSource(**sample["data_src"]))]
                )
    if count_per_source:
        logger.info(f"TaskDatum counts: {count_per_source}")

    from digiworld_eval.lib.env_config import TaskIdxDatum

    world_size = get_world_size()
    logger.info("Start data loading")
    data_cnt = 0
    data_queue_cnt = 0
    for data in dataset:
        assert isinstance(data, TaskIdxDatum)
        assert isinstance(data.src, BaseTextDatum.Source)
        data_src = DataSource.from_base_text_datum_source(data.src)
        task_args = data.val[0]
        needed = task_args.samples_per_prompt or infer_n_samples(task_args.metrics_spec)
        missing = needed - count_per_source[(task_args.name, data_src)]
        if missing > 0:
            data_cnt += 1
        for _ in range(missing):
            while data_queue.qsize() > 200:
                time.sleep(0.2)
            data_queue.put_object(data)
            data_queue_cnt += 1
            logger.info(
                f"Running data loading: loaded {data_cnt} data and put "
                f"{data_queue_cnt} data into data queue"
            )

    for _ in range(num_rollout_threads * world_size):
        data_queue.put_object(None)

    logger.info(f"End of data loading. {data_cnt} data, {data_queue_cnt} queued.")


def dump_samples(dump_queue, dump_samples_path, num_rollout_threads, dump_mode, dump_compress):
    with contextlib.ExitStack() as stack:
        fmetrics = stack.enter_context(
            open(dump_samples_path / "all_metrics.jsonl", "a")
        )
        kill_counts = 0
        open_files: dict[str, Any] = {}
        while True:
            sample = dump_queue.get_object()
            if sample is None:
                kill_counts += 1
                if kill_counts >= num_rollout_threads * get_world_size():
                    logger.info("Dump thread received kill signal")
                    return
                continue

            assert len(sample["rollouts"]) == 1
            assert len(sample["metrics"]) == 1
            task_name = sample["rollouts"][0].rl_task_args.name
            data_src = asdict(sample["rollouts"][0].data_src)
            metrics = {
                "data_src": data_src,
                "task_name": task_name,
                "metrics": sample["metrics"],
            }
            fmetrics.write(json.dumps(metrics) + "\n")
            fmetrics.flush()

            rollout_dump_info = get_rollout_dump_info(
                rollouts=sample["rollouts"],
                metrics=sample["metrics"],
                trajectory_dump_dir=dump_samples_path,
                dump_mode=dump_mode,
                worker_id=None,
                compress=dump_compress,
            )
            open_fn = gzip.open if dump_compress else open
            open_kwargs = (
                {"mode": "at", "encoding": "utf-8"} if dump_compress else {"mode": "a"}
            )
            if task_name in open_files:
                f = open_files[task_name]
            else:
                f = stack.enter_context(open_fn(rollout_dump_info.file_path, **open_kwargs))  # type: ignore
                open_files[task_name] = f
            f.write(json.dumps(rollout_dump_info.json) + "\n")
            f.flush()


def aggregate_metrics(metrics_list, metrics_spec):
    all_metrics: dict[DataSource, dict] = defaultdict(lambda: defaultdict(list))
    for m in metrics_list:
        m.pop("task_name")
        data_src = DataSource(**m.pop("data_src"))
        for k, v in m.items():
            all_metrics[data_src][k].append(v)

    count = sum(len(ms["terminal_rewards"]) for ms in all_metrics.values())
    total_terminal_rewards = sum(
        sum(ms["terminal_rewards"]) for ms in all_metrics.values()
    )
    terminal_metrics = [ms["terminal_metrics"] for ms in all_metrics.values()]
    return {
        "terminal_reward_mean": total_terminal_rewards / count,
        "count": count,
        **aggregate_outcomes_from_spec(metrics_spec, terminal_metrics),
    }


def aggregate_by_task(args, dump_samples_path):
    metrics_specs_per_task = {t.name: t.metrics_spec for t in args.tasks}
    metrics_path = dump_samples_path / "all_metrics.jsonl"
    metrics_per_task: dict[str, list] = defaultdict(list)
    with metrics_path.open("r") as m:
        for line in m:
            sample = json.loads(line)
            assert len(sample["metrics"]) == 1
            metrics_per_task[sample["task_name"]].append(
                copy.deepcopy(sample["metrics"][0])
            )
    total = sum(len(v) for v in metrics_per_task.values())
    logger.info(f"Read {total} samples from {len(metrics_per_task)} tasks")

    task_results: dict[str, dict[str, float]] = {}
    logger.info("---- Aggregated results ----")
    for task_name, metrics_list in metrics_per_task.items():
        if task_name in metrics_specs_per_task:
            task_results[task_name] = aggregate_metrics(
                metrics_list, metrics_specs_per_task[task_name]
            )
            logger.info(f"Task {task_name} results: {task_results[task_name]}")
    return task_results


# ---------------------------------------------------------------------------
# Simple JSONL metrics logger (replaces build_metrics_logger)
# ---------------------------------------------------------------------------


class JsonlMetricsLogger:
    def __init__(self, path: Path) -> None:
        self._path = path
        self._path.parent.mkdir(parents=True, exist_ok=True)

    def log_metrics(self, metrics: dict[str, float], step: int = 0) -> None:
        with open(self._path, "a") as f:
            f.write(json.dumps({"step": step, **metrics}) + "\n")

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


def build_metrics_logger(log_dir: Path, name: str, **kwargs) -> JsonlMetricsLogger:
    return JsonlMetricsLogger(log_dir / f"{name}_metrics.jsonl")
