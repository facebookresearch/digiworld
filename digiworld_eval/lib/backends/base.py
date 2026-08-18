# Copyright (c) Meta Platforms, Inc. and affiliates.
from abc import ABC, abstractmethod
from typing import Any

from PIL import Image

from digiworld_eval.lib.core.actions import ActionSpace, ParsedAction
from digiworld_eval.lib.core.history import HistoryEntry


class ModelAdapter(ABC):
    def __init__(self, model: str, action_space: ActionSpace):
        self.model = model
        self.action_space = action_space

    @abstractmethod
    def format_request(
        self, goal: str, screenshot: Image.Image,
        history: list[HistoryEntry], screen_size: tuple[int, int],
    ) -> dict[str, Any]: ...

    @abstractmethod
    def parse_response(self, response: dict[str, Any]) -> ParsedAction | None: ...
