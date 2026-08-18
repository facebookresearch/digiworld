# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Auto-discovery of per-app configurations.

Builds a registry from:
    * app name + bundle ID   -> ``digiworld.app_registry.APP_REGISTRY``
    * mockdata files         -> ``state_data/<bundle_id>/<profile>/mockdata/mock-*.json``
    * table names            -> derived from filename (``mock-payment_methods.json`` -> ``payment_methods``)
    * deeplink format        -> ``apps/<app>/app.json`` scheme + intent-filter host/path

Exposes for each app:
    APP_NAME, BUNDLE_ID, TABLE_CONFIGS (source_file/table_name),
    DEEPLINK_FORMAT, EXTRA_MOCKDATA_FILES, RECORD_TRANSFORMERS
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace
from typing import Dict, List, Optional

from digiworld.app_registry import APP_REGISTRY

logger = logging.getLogger(__name__)

# This file lives at digiworld/digiworld/config/discovery.py, so the inner
# ``digiworld`` package directory is two levels up.
_PKG_DIR = Path(__file__).resolve().parent.parent
_STATE_DATA_DIR = _PKG_DIR / "state_data"

# Deeplink shape shared by every app (see apps/<app>/app.json intentFilters:
# scheme "andojo<x>", host "sbx", pathPrefix "/event").  The ``{action}`` /
# ``{session_id}`` placeholders are filled in by ADBActions via ``str.format``.
_DEEPLINK_TEMPLATE = "{scheme}://{host}{path}?action={{action}}&sessionId={{session_id}}"
_DEFAULT_HOST = "sbx"
_DEFAULT_PATH = "/event"

_cache: Optional[Dict[str, SimpleNamespace]] = None


@dataclass
class TableConfig:
    """Mapping between a mockdata JSON file and its SQLite table."""

    source_file: str
    table_name: str


def _find_apps_dir() -> Optional[Path]:
    """Locate the repo-root ``apps/`` directory holding the RN app sources."""
    for parent in _PKG_DIR.parents:
        candidate = parent / "apps"
        if candidate.is_dir() and (candidate / "auction" / "app.json").exists():
            return candidate
    return None


def _derive_table_name(mockdata_filename: str) -> str:
    """``mock-payment_methods.json`` -> ``payment_methods``."""
    stem = mockdata_filename
    if stem.startswith("mock-"):
        stem = stem[len("mock-"):]
    if stem.endswith(".json"):
        stem = stem[: -len(".json")]
    return stem.replace("-", "_")


def _discover_mockdata_files(bundle_id: str) -> List[str]:
    """Return the ``mock-*.json`` filenames shipped for an app.

    Prefers the ``default`` profile; falls back to the first profile that has a
    ``mockdata`` directory.  Returns an empty list if no state data is present
    (e.g. LFS not pulled).
    """
    app_state_dir = _STATE_DATA_DIR / bundle_id
    if not app_state_dir.is_dir():
        return []

    profile_dirs = [
        p for p in app_state_dir.iterdir()
        if p.is_dir() and (p / "mockdata").is_dir()
    ]
    if not profile_dirs:
        return []

    # Prefer the canonical "default" profile so themed variants
    # (default-theme_*) don't change the file set.
    profile_dirs.sort(key=lambda p: (p.name != "default", p.name))
    mockdata_dir = profile_dirs[0] / "mockdata"

    return sorted(p.name for p in mockdata_dir.glob("mock-*.json"))


def _build_deeplink_format(app_name: str, apps_dir: Optional[Path]) -> Optional[str]:
    """Reconstruct the deeplink format string from ``apps/<app>/app.json``."""
    if apps_dir is None:
        return None
    app_json = apps_dir / app_name / "app.json"
    if not app_json.exists():
        return None

    try:
        cfg = json.loads(app_json.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        logger.warning("Could not read/parse %s", app_json, exc_info=True)
        return None

    expo = cfg.get("expo", cfg)

    # ``scheme`` may be a single string or a list of strings.
    scheme = expo.get("scheme")
    if isinstance(scheme, list):
        scheme = scheme[0] if scheme else None
    if not scheme:
        return None

    # Prefer the host / pathPrefix from the Android intent filter (this is what
    # the OS uses to route the deeplink to the app); fall back to defaults.
    host, path = _DEFAULT_HOST, _DEFAULT_PATH
    for intent_filter in (expo.get("android") or {}).get("intentFilters") or []:
        for data in intent_filter.get("data") or []:
            if data.get("scheme"):
                host = data.get("host") or host
                path = data.get("pathPrefix") or ""
                break
        else:
            continue
        break

    return _DEEPLINK_TEMPLATE.format(scheme=scheme, host=host, path=path)


def _build_app_config(app_name: str, apps_dir: Optional[Path]) -> Optional[SimpleNamespace]:
    bundle_id = (APP_REGISTRY.get(app_name) or {}).get("bundle_id")
    if not bundle_id:
        return None

    mockdata_files = _discover_mockdata_files(bundle_id)
    table_configs = [
        TableConfig(source_file=fn, table_name=_derive_table_name(fn))
        for fn in mockdata_files
    ]

    return SimpleNamespace(
        APP_NAME=app_name,
        BUNDLE_ID=bundle_id,
        TABLE_CONFIGS=table_configs,
        DEEPLINK_FORMAT=_build_deeplink_format(app_name, apps_dir),
        EXTRA_MOCKDATA_FILES=[],
        RECORD_TRANSFORMERS={},
    )


def _discover() -> Dict[str, SimpleNamespace]:
    """Build (and cache) the ``{app_name: config}`` registry."""
    global _cache
    if _cache is not None:
        return _cache

    apps_dir = _find_apps_dir()
    configs: Dict[str, SimpleNamespace] = {}
    for app_name in APP_REGISTRY:
        cfg = _build_app_config(app_name, apps_dir)
        if cfg is not None:
            configs[app_name] = cfg

    _cache = configs
    return configs


def get_all_app_configs() -> Dict[str, SimpleNamespace]:
    """Return ``{app_name: config}`` for all discovered apps."""
    return dict(_discover())
