# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld_eval.lib.core.actions import ActionSpace, CoordinateSystem
from .function_calling import FunctionCallingAdapter


class GeminiAdapter(FunctionCallingAdapter):
    def __init__(self, model: str, action_space: ActionSpace, history_k: int | None = None):
        super().__init__(model, action_space, coord_system=CoordinateSystem.NORMALIZED_999, history_k=history_k)
