# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Any

from PIL import Image

from digiworld_eval.lib.core.actions import NORMALIZED_COORD_MAX, ActionSpace, CoordinateSystem, ParsedAction
from digiworld_eval.lib.core.history import HistoryEntry
from .function_calling import FunctionCallingAdapter

logger = logging.getLogger(__name__)

_LOOP_THRESHOLD = 2

_GPT_SYSTEM_SUFFIX = """

COORDINATE SYSTEM:
- All coordinates use a 0-999 normalized range. (0,0) is the top-left corner, (999,999) is the bottom-right corner.
- ALL coordinate values MUST be integers between 0 and 999 inclusive.
- NEVER output coordinates outside 0-999. Do NOT use raw pixel values (e.g. 1080, 1920). The screen is always mapped to a 999×999 grid regardless of actual resolution.

AVAILABLE TOOLS:
- GUI tools: tap(x, y), long_press(x, y), swipe(x1, y1, x2, y2), type(text), scroll(direction), navigate(option)
- Terminal tools: status(status, reason), answer(message)

RULES:
- Every turn you MUST output exactly one tool call. Never describe what you would do — just do it.
- To interact with any UI element, ALWAYS call the appropriate GUI tool with numeric coordinates or parameters.
- To enter text into a field, FIRST tap the field to focus it, THEN call type(text) with the text you want to enter. Do NOT try to tap individual characters or keys.
- NEVER describe actions in natural language. NEVER put descriptions like "Tap the submit button" into answer(). That is WRONG.
- answer() is ONLY for reporting factual information the user asked you to look up (e.g. a price, count, or date).
- status() is ONLY for signaling task completion or impossibility.
- NEVER repeat the same action twice in a row. If you just tapped a location and nothing changed, try a different approach: scroll to reveal more content, tap a different element, use type() to enter text, or call status(impossible)."""


class GPTAdapter(FunctionCallingAdapter):
    def __init__(self, model: str, action_space: ActionSpace, history_k: int | None = None):
        super().__init__(model, action_space, coord_system=CoordinateSystem.NORMALIZED_999,
                         system_prompt_suffix=_GPT_SYSTEM_SUFFIX, history_k=history_k)

    @staticmethod
    def _detect_action_loop(history: list[HistoryEntry], threshold: int = _LOOP_THRESHOLD) -> int:
        assistant_actions: list[ParsedAction] = []
        for entry in reversed(history):
            if entry.role == "assistant" and entry.action is not None:
                assistant_actions.append(entry.action)
            if len(assistant_actions) > threshold + 1:
                break
        if len(assistant_actions) < threshold:
            return 0
        last = assistant_actions[0]
        count = 1
        for prev in assistant_actions[1:]:
            if prev.action_type == last.action_type and prev.params == last.params:
                count += 1
            else:
                break
        return count if count >= threshold else 0

    def format_request(self, goal: str, screenshot: Image.Image,
                       history: list[HistoryEntry], screen_size: tuple[int, int]) -> dict[str, Any]:
        payload = super().format_request(goal, screenshot, history, screen_size)
        for tool in payload.get("tools", []):
            props = tool.get("function", {}).get("parameters", {}).get("properties", {})
            for prop in props.values():
                prop.pop("minimum", None)
                prop.pop("maximum", None)

        self._reorder_user_text_first(payload)

        prompt_parts = [
            f"Goal: {goal}\n",
            "Look at the screenshot and call exactly one GUI tool.",
            "Available tools: tap(x, y), long_press(x, y), swipe(x1, y1, x2, y2), "
            "type(text), scroll(direction), navigate(option), status(status, reason), answer(message).",
            "IMPORTANT: All x, y coordinates MUST be integers between 0 and 999.",
            "To enter text, first tap the input field, then call type(text).",
            "Do NOT use answer() to describe actions — call the appropriate tool.",
        ]
        loop_count = self._detect_action_loop(history)
        if loop_count >= _LOOP_THRESHOLD:
            prompt_parts.append(
                f"\nWARNING: Your last {loop_count} actions were identical. "
                "Try a COMPLETELY DIFFERENT action now."
            )

        last_msg = payload["messages"][-1]
        if last_msg.get("role") == "user" and isinstance(last_msg.get("content"), list):
            for part in last_msg["content"]:
                if part.get("type") == "text":
                    part["text"] = "\n".join(prompt_parts)
                    break
        return payload

    def parse_response(self, response: dict[str, Any]) -> ParsedAction | None:
        action = super().parse_response(response)
        if action is None:
            return None
        defn = self.action_space.get_definition(action.action_type)
        if defn is None:
            return action
        clamped_params = dict(action.params)
        did_clamp = False
        for param in defn.params:
            if param.param_type == "coordinate" and param.name in clamped_params:
                raw_val = clamped_params[param.name]
                clamped_val = max(0, min(float(raw_val), NORMALIZED_COORD_MAX))
                if clamped_val != raw_val:
                    did_clamp = True
                clamped_params[param.name] = clamped_val
        if did_clamp:
            return ParsedAction(action_type=action.action_type, params=clamped_params,
                                coordinate_system=action.coordinate_system, raw=action.raw)
        return action
