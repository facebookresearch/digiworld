# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared test helpers -- mock heavy dependencies before scenario imports."""

import sys
from unittest.mock import MagicMock

_MOCK_MODULES = [
    "packaging",
    "packaging.version",
    "adb_actions",
    "emulator_backends",
    "database_validator",
    "pydantic",
    "digiworld.app_registry",
    "digiworld.profile_variants",
    "digiworld.scenarios.config_loader",
    "digiworld.scenarios.state_manager",
    "digiworld.scenarios.context_extractor",
    "digiworld.scenarios.mockdata_handler",
]

for mod in _MOCK_MODULES:
    if mod not in sys.modules:
        sys.modules[mod] = MagicMock()
