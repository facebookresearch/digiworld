# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld_eval.lib.core.action_spaces import CUA_ACTION_SPACE
from digiworld_eval.lib.core.actions import ActionSpace

from .base import ModelAdapter
from .claude import ClaudeAdapter
from .function_calling import FunctionCallingAdapter
from .gemini import GeminiAdapter
from .gpt import GPTAdapter
from .openai_text import OpenAITextAdapter

logger = logging.getLogger(__name__)


def get_adapter(
    model: str,
    action_space: ActionSpace | None = None,
    history_k: int | None = None,
) -> ModelAdapter:
    _action_space = action_space or CUA_ACTION_SPACE
    model_lower = model.lower()

    if "gemini" in model_lower:
        return GeminiAdapter(model, _action_space, history_k=history_k)
    if "claude" in model_lower:
        return ClaudeAdapter(model, _action_space, history_k=history_k)
    if "gpt" in model_lower:
        return GPTAdapter(model, _action_space, history_k=history_k)

    logger.info(
        "No specific adapter for model '%s', using text-based OpenAI adapter", model
    )
    return OpenAITextAdapter(model, _action_space, history_k=history_k)
