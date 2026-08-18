# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld_eval.env.server_commands import ServerCommands
from digiworld_eval.env.server_env import ServerEnv, fetch_tasks_by_tag
from digiworld_eval.env.types import ServerState
from digiworld_eval.lib.env_api import RewardFn, Transition
from digiworld_eval.lib import env_config as config

__all__ = [
    "ServerCommands",
    "ServerEnv",
    "ServerState",
    "fetch_tasks_by_tag",
]


# ---------------------------------------------------------------------------
# Built-in reward functions
# ---------------------------------------------------------------------------

class PassOnlyRewardFn(RewardFn):
    @property
    def range(self) -> tuple[float, float]:
        return (-1.0, 1.0)

    def __call__(self, tr: Transition) -> list[float]:
        if not tr.terminal:
            return [0.0]
        reward = 2.0 * float(tr.outcomes.get("pass", False)) - 1.0
        return [reward]


if "pass_only" not in config.REWARDS_REGISTRY:
    config.register_reward_fn("pass_only", PassOnlyRewardFn)
