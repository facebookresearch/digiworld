# Copyright (c) Meta Platforms, Inc. and affiliates.
# Text-based adapter: plain-text actions instead of function calling.
# Uses plain text actions (tap, swipe, type, navigate, status) instead of function calling.
# Works with any model, including those that don't support tool use.

import logging
import re
from typing import Any

from PIL import Image

from digiworld_eval.lib.core import history as history_utils
from digiworld_eval.lib.core.actions import (
    ActionSpace,
    ActionType,
    CoordinateSystem,
    ParsedAction,
    StatusValue,
)
from digiworld_eval.lib.core.history import HistoryEntry

from .base import ModelAdapter
from .function_calling import encode_image_to_base64

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
Assist an Android user by generating actions based on their conversational input and the current screen image.
Available actions (pick one):
- tap(x, y): Tap at screen location (x, y). Example: tap(0.312, 0.589).
- swipe(x1, y1, x2, y2): Swipe from (x1, y1) to (x2, y2). Example: swipe(0.171, 0.350, 0.899, 0.357).
- type(text): Type text. Example: type('Hello').
- navigate(option): Navigate options: {back, home, enter}. Example: navigate(back).
- status(option): Report task status: {complete, impossible}. Example: status(complete).
Coordinates are normalized 0-1 where (0,0) is top-left and (1,1) is bottom-right.
Please respond with a single action, with no additional text."""


def _format_action_history(
    actions: list[ParsedAction],
    action_space: ActionSpace,
) -> str:
    parts = []
    for a in actions:
        normalized = action_space.normalize_coords(
            a, (1, 1), CoordinateSystem.NORMALIZED_01
        )
        parts.append(action_space.to_text(normalized))
    return ", ".join(parts) if parts else "None"


_ACTION_PATTERNS = [
    (ActionType.TAP, re.compile(r"tap\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)")),
    (ActionType.SWIPE, re.compile(
        r"swipe\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*"
        r"(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)"
    )),
    (ActionType.TYPE, re.compile(r"type\(['\"]*(.*?)['\"]*\)")),
    (ActionType.NAVIGATE, re.compile(r"navigate\(['\"]*(.*?)['\"]*\)")),
    (ActionType.STATUS, re.compile(r"(?:status|end|complete)\(['\"]*(.*?)['\"]*\)")),
]


def _parse_text_action(text: str) -> ParsedAction | None:
    """Parse a plain-text action into a ParsedAction.

    Coordinates are kept as normalized 0-1 floats.
    """
    text = text.strip()
    for action_type, pattern in _ACTION_PATTERNS:
        m = pattern.search(text)
        if m is None:
            continue

        if action_type == ActionType.TAP:
            x, y = float(m.group(1)), float(m.group(2))
            return ParsedAction(
                action_type=ActionType.TAP,
                params={"x": x, "y": y},
                coordinate_system=CoordinateSystem.NORMALIZED_01,
                raw=text,
            )

        if action_type == ActionType.SWIPE:
            x1, y1 = float(m.group(1)), float(m.group(2))
            x2, y2 = float(m.group(3)), float(m.group(4))
            return ParsedAction(
                action_type=ActionType.SWIPE,
                params={"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                coordinate_system=CoordinateSystem.NORMALIZED_01,
                raw=text,
            )

        if action_type == ActionType.TYPE:
            return ParsedAction(
                action_type=ActionType.TYPE,
                params={"text": m.group(1)},
                coordinate_system=CoordinateSystem.NORMALIZED_01,
                raw=text,
            )

        if action_type == ActionType.NAVIGATE:
            option = m.group(1).lower().strip()
            return ParsedAction(
                action_type=ActionType.NAVIGATE,
                params={"option": option},
                coordinate_system=CoordinateSystem.NORMALIZED_01,
                raw=text,
            )

        if action_type == ActionType.STATUS:
            option = m.group(1).lower().strip() if m.group(1) else "complete"
            if option in ("complete", "impossible"):
                status_val = StatusValue.COMPLETE if option == "complete" else StatusValue.IMPOSSIBLE
            else:
                status_val = StatusValue.COMPLETE
            return ParsedAction(
                action_type=ActionType.STATUS,
                params={"status": status_val},
                coordinate_system=CoordinateSystem.NORMALIZED_01,
                raw=text,
            )

    if any(kw in text.lower() for kw in ("complete", "impossible", "done", "finished", "end")):
        return ParsedAction(
            action_type=ActionType.STATUS,
            params={"status": StatusValue.COMPLETE},
            coordinate_system=CoordinateSystem.NORMALIZED_01,
            raw=text,
        )

    return None


class OpenAITextAdapter(ModelAdapter):
    """Text-based adapter using plain-text prompts.

    Uses plain text actions (tap(x,y), swipe, type, navigate, status) with
    normalized 0-1 coordinates. Works with any model via OpenAI-compatible API.
    """

    def __init__(
        self,
        model: str,
        action_space: ActionSpace,
        history_k: int | None = None,
        system_prompt: str | None = None,
    ):
        super().__init__(model, action_space)
        self._history_k = history_k
        self._system_prompt = system_prompt or _SYSTEM_PROMPT

    def format_request(
        self,
        goal: str,
        screenshot: Image.Image,
        history: list[HistoryEntry],
        screen_size: tuple[int, int],
    ) -> dict[str, Any]:
        if self._history_k is not None:
            history = history_utils.last_k(history, self._history_k)

        image_url = encode_image_to_base64(screenshot)

        past_actions = []
        for entry in history:
            if entry.role == "assistant" and entry.action:
                past_actions.append(entry.action)

        history_str = _format_action_history(past_actions, self.action_space)

        user_text = f"Goal: {goal}\nPrevious actions: {history_str}\nWhat action should the user take next?"

        messages: list[dict[str, Any]] = [
            {"role": "system", "content": self._system_prompt},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url},
                    },
                    {"type": "text", "text": user_text},
                ],
            },
        ]

        return {"model": self.model, "messages": messages}

    def parse_response(self, response: dict[str, Any]) -> ParsedAction | None:
        choices = response.get("choices", [])
        if not choices:
            logger.warning("Empty API response: no choices")
            return None

        content = choices[0].get("message", {}).get("content", "")
        if not content:
            logger.warning("Empty content in API response")
            return None

        result = _parse_text_action(content)
        if result is None:
            result = self.action_space.match_keyword_fallback(
                content, CoordinateSystem.PIXELS
            )
        if result is None:
            logger.warning("Could not parse text action: %s", content[:200])
        return result
