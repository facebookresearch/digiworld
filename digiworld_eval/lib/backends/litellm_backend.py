# Copyright (c) Meta Platforms, Inc. and affiliates.
# LiteLLM generation backend — one client for many providers (OpenAI, Anthropic,
# Google, ...). Reuses the OpenAI-format adapters; litellm handles per-provider
# translation and reads each provider's API key from the environment
# (OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY).

import logging
from typing import Any

from PIL import Image

from digiworld_eval.lib.args import LiteLLMArgs
from digiworld_eval.lib.core.actions import ParsedAction
from digiworld_eval.lib.core.history import HistoryEntry
from digiworld_eval.lib.backends.adapters import ModelAdapter, get_adapter

logger = logging.getLogger(__name__)


class LiteLLMGen:
    """Generation backend using litellm.completion for direct multi-provider access.

    The model string selects the provider via litellm's prefix convention, e.g.
    ``gpt-4o`` (OpenAI), ``claude-3-5-sonnet-...`` (Anthropic), ``gemini/...`` (Google).
    """

    def __init__(self, args: LiteLLMArgs, gen_args: Any):
        try:
            import litellm
        except ImportError:
            raise ImportError(
                "litellm package required for litellm backend. "
                "Install with: pip install litellm"
            )
        self._litellm = litellm
        # Silently drop params a given provider doesn't support (e.g. top_p).
        litellm.drop_params = True

        self.args = args
        self.model = args.model
        self.timeout = args.timeout
        self.max_retries = args.max_retries
        self.max_tokens = args.max_tokens
        self.base_url = args.base_url or None
        self.temperature = gen_args.temperature
        self.top_p = gen_args.top_p
        self._adapter: ModelAdapter | None = None

        logger.info(
            "LiteLLM backend initialized: model=%s, base_url=%s",
            args.model, self.base_url or "(provider default)",
        )

    def work(self) -> bool:
        return True

    def stop(self) -> None:
        pass

    def get_adapter(self) -> ModelAdapter:
        if self._adapter is None:
            self._adapter = get_adapter(self.model)
        return self._adapter

    def generate_with_adapter(
        self,
        goal: str,
        screenshot: Image.Image,
        history: list[HistoryEntry],
        screen_size: tuple[int, int],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> tuple[ParsedAction | None, dict[str, Any]]:
        adapter = self.get_adapter()
        request_payload = adapter.format_request(
            goal=goal, screenshot=screenshot, history=history, screen_size=screen_size,
        )

        temp = temperature if temperature is not None else self.temperature
        max_tok = max_tokens or self.max_tokens

        create_kwargs: dict[str, Any] = {
            "model": request_payload.get("model", self.model),
            "messages": request_payload["messages"],
            "temperature": temp,
            "max_tokens": max_tok,
            "timeout": self.timeout,
            "num_retries": self.max_retries,
        }
        if self.base_url:
            create_kwargs["api_base"] = self.base_url
        if self.top_p is not None and self.top_p != 1.0:
            create_kwargs["top_p"] = self.top_p

        tools = request_payload.get("tools")
        if tools:
            create_kwargs["tools"] = tools

        completion = self._litellm.completion(**create_kwargs)
        result = completion.model_dump()

        action = adapter.parse_response(result)
        return action, result
