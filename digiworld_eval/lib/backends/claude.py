# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Any

from PIL import Image

from digiworld_eval.lib.core.actions import ActionSpace, CoordinateSystem, ParsedAction
from digiworld_eval.lib.core.history import HistoryEntry
from .function_calling import FunctionCallingAdapter

logger = logging.getLogger(__name__)

_TARGET_LONG_EDGE = 1568


def _resize_for_claude(image: Image.Image) -> Image.Image:
    w, h = image.size
    if max(w, h) <= _TARGET_LONG_EDGE:
        return image
    scale = _TARGET_LONG_EDGE / max(w, h)
    return image.resize((int(w * scale), int(h * scale)), Image.LANCZOS)


class ClaudeAdapter(FunctionCallingAdapter):
    def __init__(self, model: str, action_space: ActionSpace, history_k: int | None = None):
        super().__init__(model, action_space, coord_system=CoordinateSystem.PIXELS, history_k=history_k)
        self._resized_size: tuple[int, int] = (0, 0)

    def _get_extra_headers(self) -> dict[str, str]:
        return {"anthropic-version": "2023-06-01"}

    def format_request(self, goal: str, screenshot: Image.Image,
                       history: list[HistoryEntry], screen_size: tuple[int, int]) -> dict[str, Any]:
        resized = _resize_for_claude(screenshot)
        self._resized_size = (resized.width, resized.height)
        resized_history = []
        for entry in history:
            if entry.screenshot is not None:
                resized_history.append(HistoryEntry(
                    step=entry.step, role=entry.role, action=entry.action,
                    screenshot=_resize_for_claude(entry.screenshot), text=entry.text,
                ))
            else:
                resized_history.append(entry)

        payload = super().format_request(goal, resized, resized_history, self._resized_size)
        self._reorder_user_text_first(payload)
        return payload

    def parse_response(self, response: dict[str, Any]) -> ParsedAction | None:
        result = super().parse_response(response)
        if result is None:
            return None
        w, h = self._resized_size
        if w == 0 or h == 0:
            return result
        return self.action_space.normalize_coords(result, (w, h), CoordinateSystem.NORMALIZED_999)
