# Copyright (c) Meta Platforms, Inc. and affiliates.
from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    from PIL import Image

from digiworld_eval.lib.core.actions import ParsedAction


@dataclass
class HistoryEntry:
    step: int
    role: Literal["user", "assistant"]
    action: ParsedAction | None
    screenshot: Image.Image | None
    text: str | None


def last_k(history: list[HistoryEntry], k: int) -> list[HistoryEntry]:
    return history[-k:]
