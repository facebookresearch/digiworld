# Copyright (c) Meta Platforms, Inc. and affiliates.
# Stripped: training-only methods and all tokenization — the eval is text/turn-based.

from abc import ABC, abstractmethod
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Any, Self

from PIL import Image

from digiworld_eval.lib.core.datatypes import LlamaChatMessage, MessageBase


# ---------------------------------------------------------------------------
# MediaInput
# ---------------------------------------------------------------------------

@dataclass
class MediaInput:
    input_tensor: Any | None = None
    hash: str | None = None
    image_pos_index: list[int] | None = None


# ---------------------------------------------------------------------------
# Base RL env types (text/turn-based)
# ---------------------------------------------------------------------------

@dataclass(init=False)
class Transition:
    action_str: str | None
    rewards: list[float] | None
    observation_str: str | None
    media: MediaInput | None
    terminal: bool
    context_switch: bool
    outcomes: dict[str, Any]
    info: dict

    def __init__(
        self,
        *,
        action_str: str | None = None,
        rewards: list[float] | None = None,
        reward: float | None = None,
        observation_str: str | None = None,
        media: MediaInput | None = None,
        terminal: bool = False,
        context_switch: bool = False,
        outcomes: dict[str, Any] | None = None,
        info: dict | None = None,
    ):
        assert not terminal or not context_switch
        assert reward is None or rewards is None

        self.action_str = action_str
        if reward is not None:
            self.rewards = [float(reward)]
        elif rewards is not None:
            self.rewards = [float(x) for x in rewards]
        elif action_str is None:
            # Observation-only transition (e.g. the initial one) carries no
            # action to reward; it is appended without add_rewards().
            self.rewards = []
        else:
            self.rewards = None

        self.observation_str = observation_str
        self.media = media
        self.terminal = terminal
        self.context_switch = context_switch
        self.outcomes = outcomes if outcomes is not None else {}
        self.info = info if info is not None else {}

    def add_rewards(self, rewards: list[float]) -> None:
        self.rewards = rewards


class AbstractRewardFn(ABC):
    @property
    @abstractmethod
    def range(self) -> tuple[float, float]: ...

    @abstractmethod
    def __call__(self, tr: Transition) -> list[float]: ...


class RewardFn(AbstractRewardFn):
    def __init__(self, *args, **kwargs):
        pass


class State:
    def clone(self) -> Self:
        raise NotImplementedError

    def close(self) -> None:
        pass

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *args) -> None:
        self.close()


class Env(ABC):
    @abstractmethod
    def max_action_len(self, state: State) -> int: ...

    @abstractmethod
    def start(self, episode_args: dict | None = None) -> tuple[State, Transition]: ...

    @abstractmethod
    def step(self, state: State, action: str) -> Transition: ...


# ---------------------------------------------------------------------------
# Trajectory (turn-based)
# ---------------------------------------------------------------------------

class Trajectory:
    def __init__(self) -> None:
        self.transitions: list[Transition] = []
        self.terminated: bool = False
        self.truncated: bool = False
        self._truncation_return: float | None = None

    def append(self, tr: Transition) -> None:
        assert not self.terminated
        assert tr.rewards is not None
        self.transitions.append(tr)
        self.terminated = tr.terminal

    @property
    def context(self) -> list[Transition]:
        """Turn list; its length is the rollout-length guard."""
        return self.transitions


# ---------------------------------------------------------------------------
# DialogEnv (tokenizer-free)
# ---------------------------------------------------------------------------

class DialogEnv(Env):
    message_cls: type[MessageBase]
    media_transform: Callable | None
    media_placeholder_tag: str
    add_system_prefix: bool

    def __init__(
        self,
        media_transform: Callable | None = None,
        media_placeholder_tag: str = "",
        add_system_prefix: bool = True,
    ) -> None:
        self.message_cls = LlamaChatMessage
        self.media_transform = media_transform
        self.media_placeholder_tag = media_placeholder_tag
        self.add_system_prefix = add_system_prefix

    def transition(
        self,
        *,
        messages: Sequence[MessageBase] | None = None,
        action_str: str | None = None,
        initial: bool = False,
        terminal: bool = False,
        outcomes: dict[str, Any] | None = None,
        info: dict | None = None,
        think: bool = False,
        media: Image.Image | None = None,
        context_switch: bool = False,
    ) -> Transition:
        observation_str: str | None = None
        if messages:
            observation_str = "\n".join(
                f"{m.source_str}: {m.body}" for m in messages
            )
        return Transition(
            action_str=action_str,
            observation_str=observation_str,
            terminal=terminal,
            outcomes=outcomes,
            info=info,
            context_switch=context_switch,
        )
