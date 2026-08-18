# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared app configuration for APK management scripts.

This module provides APK-specific configuration derived from the centralized
app registry. The keys here are APK keys (short names used in GitHub releases)
rather than the internal app names used elsewhere.
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from digiworld.app_registry import get_apk_config

# Maps apk_key -> (apk_filename, bundle_id, internal_app_name)
# Note: GitHub releases use "app-release.apk" as filename, download script renames to apk_filename
APP_CONFIG = get_apk_config()

DEFAULT_APPS = ["email", "pay", "ryde", "shop", "music", "eats"]
ALL_APPS = list(APP_CONFIG.keys())


def get_apk_filename(app_name: str) -> str:
    """Get the APK filename for an app."""
    return APP_CONFIG[app_name][0]


def get_bundle_id(app_name: str) -> str:
    """Get the bundle ID for an app."""
    return APP_CONFIG[app_name][1]


def get_release_tag_pattern(app_name: str) -> str:
    """Get the release tag pattern (internal app name) for an app."""
    return APP_CONFIG[app_name][2]
