# Copyright (c) Meta Platforms, Inc. and affiliates.
# Env / reward registry + TaskIdxDatum

import inspect
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from digiworld_eval.lib.core.datatypes import BaseTextDatum, DictDatum
from digiworld_eval.lib.env_api import AbstractRewardFn, Env


@dataclass
class EnvConfig:
    name: str
    cls: type[Env]
    init_kwargs: dict[str, Any]


ENVS_REGISTRY: dict[str, EnvConfig] = {}


def register_env(config: EnvConfig) -> None:
    name = config.name
    if name in ENVS_REGISTRY:
        raise ValueError(f"EnvConfig {name} already exists.")
    ENVS_REGISTRY[name] = config


def get_env_config(name: str) -> EnvConfig:
    if name not in ENVS_REGISTRY:
        raise ValueError(
            f"No EnvConfig registered under the name {name}. "
            f"ENVS_REGISTRY={ENVS_REGISTRY.keys()}"
        )
    return ENVS_REGISTRY[name]


REWARDS_REGISTRY: dict[str, Callable[..., AbstractRewardFn]] = {}


def register_reward_fn(
    name: str,
    reward_fn: Callable[..., AbstractRewardFn],
) -> None:
    if name in REWARDS_REGISTRY:
        raise ValueError(f"RewardFn {name} already exists.")
    REWARDS_REGISTRY[name] = reward_fn


def get_reward_fn(name: str) -> Callable[..., AbstractRewardFn]:
    if name not in REWARDS_REGISTRY:
        raise ValueError(f"No RewardFn registered under the name {name}")
    return REWARDS_REGISTRY[name]


def build_env(name: str, **runtime_kwargs: Any) -> Env:
    cfg = get_env_config(name)
    params = inspect.signature(cfg.cls.__init__).parameters
    for name in cfg.init_kwargs:
        assert name in params, f"Invalid keyword argument {name} for {cfg.cls}"
    kwargs = cfg.init_kwargs | {
        arg: value for arg, value in runtime_kwargs.items() if arg in params
    }
    return cfg.cls(**kwargs)


def build_env_overrides(task: Any, **runtime_kwargs: Any) -> Env:
    return build_env(
        task.env_config,
        **(
            dict(task.init_args and sorted(task.init_args.items()) or [])
            | runtime_kwargs
        ),
    )


class TaskIdxDatum(BaseTextDatum[tuple[Any, int, dict]]):
    def id(self) -> str:
        rl_task_args_name = self.val[0].name
        return f"{rl_task_args_name}|l{self.src.line_no}|p{self.src.pos}"  # type: ignore


def to_task_idx_datum(
    task: Any, env_idx: int, dict_datum: DictDatum
) -> TaskIdxDatum:
    # The dataset loader may mint foreign Source objects; rebuild as our
    # local Source so downstream isinstance(..., BaseTextDatum.Source) checks match.
    src = dict_datum.src
    if src is not None and not isinstance(src, BaseTextDatum.Source):
        src = BaseTextDatum.Source(path=src.path, line_no=src.line_no, pos=src.pos)
    return TaskIdxDatum(val=(task, env_idx, dict_datum.val), src=src)
