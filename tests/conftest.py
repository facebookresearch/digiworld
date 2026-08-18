# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Root test configuration for digiworld.

This conftest.py sets up the Python path so all tests can import from:
- digiworld package
- digiworld modules
- digiworld/utils modules
"""

import sys
from pathlib import Path

# Repository root
REPO_ROOT = Path(__file__).parent.parent

# Add paths to sys.path for imports
_paths_to_add = [
    REPO_ROOT / "digiworld",
    REPO_ROOT / "digiworld" / "utils",
    REPO_ROOT / "digiworld",
]

for path in _paths_to_add:
    path_str = str(path)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)
