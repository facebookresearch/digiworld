# Copyright (c) Meta Platforms, Inc. and affiliates.
import base64
import json
import logging
from io import BytesIO
from typing import Any

from PIL import Image

from digiworld_eval.lib.core import history as history_utils
from digiworld_eval.lib.core.actions import ActionSpace, CoordinateSystem, ParsedAction
from digiworld_eval.lib.core.history import HistoryEntry

from .base import ModelAdapter
from .prompts import build_system_prompt

logger = logging.getLogger(__name__)

_COORD_SYSTEM_SUFFIXES: dict[CoordinateSystem, str] = {
    CoordinateSystem.NORMALIZED_999: (
        "\n\nCoordinates use 0-999 normalized range "
        "where (0,0) is top-left and (999,999) is bottom-right."
    ),
    CoordinateSystem.NORMALIZED_01: (
        "\n\nCoordinates use 0-1 normalized range "
        "where (0,0) is top-left and (1,1) is bottom-right."
    ),
    CoordinateSystem.PIXELS: (
        "\n\nCoordinates use pixel values where (0,0) is top-left."
    ),
}


def encode_image_to_base64(image: Image.Image) -> str:
    buffer = BytesIO()
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    image.save(buffer, format="JPEG", quality=85)
    base64_data = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{base64_data}"


class FunctionCallingAdapter(ModelAdapter):
    def __init__(
        self, model: str, action_space: ActionSpace,
        coord_system: CoordinateSystem = CoordinateSystem.NORMALIZED_999,
        system_prompt_suffix: str | None = None,
        history_k: int | None = None,
    ):
        super().__init__(model, action_space)
        self._coord_system = coord_system
        self._history_k = history_k
        suffix = system_prompt_suffix
        if suffix is None:
            suffix = _COORD_SYSTEM_SUFFIXES.get(coord_system, "")
        self._system_prompt = build_system_prompt(action_space) + suffix

    def _get_extra_headers(self) -> dict[str, str]:
        return {}

    def format_request(
        self, goal: str, screenshot: Image.Image,
        history: list[HistoryEntry], screen_size: tuple[int, int],
    ) -> dict[str, Any]:
        if self._history_k is not None:
            history = history_utils.last_k(history, self._history_k)

        width, height = screen_size
        image_b64 = encode_image_to_base64(screenshot)
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": self._system_prompt}
        ]

        call_id_counter = 0
        for entry in history:
            if entry.role == "user" and entry.screenshot is not None:
                screenshot_b64 = encode_image_to_base64(entry.screenshot)
                messages.append({
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": screenshot_b64}},
                        {"type": "text", "text": entry.text or goal},
                    ],
                })
            elif entry.role == "assistant" and entry.action:
                normalized = self.action_space.normalize_coords(
                    entry.action, (width, height), self._coord_system
                )
                call_id = f"call_{call_id_counter}"
                call_id_counter += 1
                messages.append({
                    "role": "assistant", "content": None,
                    "tool_calls": [{
                        "id": call_id, "type": "function",
                        "function": {
                            "name": normalized.action_type.value,
                            "arguments": json.dumps(dict(normalized.params)),
                        },
                    }],
                })
                messages.append({
                    "role": "tool", "tool_call_id": call_id,
                    "content": "Action executed successfully.",
                })

        messages.append({
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": image_b64}},
                {"type": "text", "text": f"Goal: {goal}\n\nWhat action should I take next?"},
            ],
        })

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "tools": self.action_space.get_tool_definitions(self._coord_system),
        }
        extra = self._get_extra_headers()
        if extra:
            payload["extra_headers"] = extra
        return payload

    def parse_response(self, response: dict[str, Any]) -> ParsedAction | None:
        choices = response.get("choices", [])
        if not choices:
            logger.warning("Empty API response: no choices")
            return None

        message = choices[0].get("message", {})
        tool_calls = message.get("tool_calls", [])
        if tool_calls:
            tool_call = tool_calls[0]
            function = tool_call.get("function", {})
            func_name = function.get("name", "")
            args = function.get("arguments", "{}")
            if isinstance(args, str):
                try:
                    args = json.loads(args)
                except (json.JSONDecodeError, ValueError):
                    args = {}
            result = self.action_space.from_function_call(func_name, args, self._coord_system)
            if result is None:
                logger.warning(f"Could not parse function call: {func_name}({args!r})")
            return result

        content = message.get("content", "")
        if content:
            result = self.action_space.match_keyword_fallback(content, self._coord_system)
            if result is None:
                logger.warning(f"Unparsable text response: {content[:200]!r}")
            return result

        logger.warning("Empty API message: no tool calls and no content")
        return None

    @staticmethod
    def _reorder_user_text_first(payload: dict[str, Any]) -> None:
        """Reorder each user message's content so text parts precede images (in place)."""
        new_messages = []
        for msg in payload.get("messages", []):
            content = msg.get("content")
            if msg.get("role") == "user" and isinstance(content, list):
                text_parts = [p for p in content if p.get("type") != "image_url"]
                image_parts = [p for p in content if p.get("type") == "image_url"]
                new_messages.append({**msg, "content": text_parts + image_parts})
            else:
                new_messages.append(msg)
        payload["messages"] = new_messages
