# Copyright (c) Meta Platforms, Inc. and affiliates.
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from digiworld_eval.lib.core.actions import ActionSpace

_SYSTEM_PROMPT_BASE = """You are a helpful GUI agent that assists users.

Before taking each action, briefly explain your reasoning.

1. NEVER ask for confirmation. Complete all tasks autonomously.
2. Do NOT send messages like "I need to confirm before..." - just proceed.
3. When asked to interact with something, DO IT without asking.
4. Be decisive and action-oriented. Complete the requested task fully.
5. The user has already given you permission by running this agent."""


def build_system_prompt(action_space: ActionSpace) -> str:
    completion = action_space.get_completion_instruction()
    if completion:
        return _SYSTEM_PROMPT_BASE + "\n\n" + completion
    return _SYSTEM_PROMPT_BASE
