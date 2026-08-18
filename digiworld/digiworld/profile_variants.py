# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Utilities for profile variant management.

Profile variants are directories that share a base profile's database and
mockdata but differ in a single presentation dimension (theme, UI state, etc.).
Each variant directory contains a ``_variant_of.json`` marker that records
which base profile it derives from, allowing the generation and runtime
systems to treat variants correctly:

* Generation-time: only base profiles are evaluated for constraint feasibility.
* Runtime: compatible base profiles are expanded to include all their variants.
"""

import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

VARIANT_MARKER_FILENAME = "_variant_of.json"


def write_variant_marker(
    variant_path: str,
    base_profile: str,
    variant_type: str,
    variant_detail: str,
) -> None:
    """Write a variant marker file into a variant profile directory.

    Args:
        variant_path: Absolute path to the variant profile directory.
        base_profile: Name of the base profile this variant derives from.
        variant_type: Dimension being varied (e.g. ``"ui_state"`` or ``"theme"``).
        variant_detail: Specific value for this variant (e.g. ``"inbox_var0"``
            or ``"dark"``).
    """
    marker = {
        "base_profile": base_profile,
        "variant_type": variant_type,
        "variant_detail": variant_detail,
    }
    marker_path = os.path.join(variant_path, VARIANT_MARKER_FILENAME)
    with open(marker_path, "w") as f:
        json.dump(marker, f, indent=2)
        f.write("\n")


def read_variant_marker(profile_path: str) -> Optional[Dict]:
    """Read the variant marker from a profile directory, if present.

    Returns:
        The parsed marker dict, or ``None`` if this is a base profile.
    """
    marker_path = os.path.join(profile_path, VARIANT_MARKER_FILENAME)
    if not os.path.exists(marker_path):
        return None
    with open(marker_path, "r") as f:
        return json.load(f)


def is_variant(profile_path: str) -> bool:
    """Return ``True`` if the directory is a variant (has a marker file)."""
    return os.path.exists(os.path.join(profile_path, VARIANT_MARKER_FILENAME))


def list_base_profiles(app_state_dir: str) -> List[str]:
    """List only base (non-variant) profiles that have a valid session DB."""
    profiles = []
    app_state = Path(app_state_dir)
    for item in sorted(app_state.iterdir()):
        if not item.is_dir():
            continue
        db_path = item / "sessions" / "default" / "default.db"
        if db_path.exists() and not is_variant(str(item)):
            profiles.append(item.name)
    return profiles


def list_variants_of(app_state_dir: str, base_profile: str) -> List[str]:
    """List all variant profile names that derive from *base_profile*."""
    variants = []
    app_state = Path(app_state_dir)
    for item in sorted(app_state.iterdir()):
        if not item.is_dir():
            continue
        marker = read_variant_marker(str(item))
        if marker and marker.get("base_profile") == base_profile:
            variants.append(item.name)
    return variants


def expand_with_variants(
    app_state_dir: str,
    base_profiles: List[str],
    variant_types: Optional[List[str]] = None,
) -> List[str]:
    """Expand a list of base profile names to include all their variants.

    The returned list contains the original base profile names *plus* every
    variant directory whose marker references one of the given base profiles.

    Args:
        app_state_dir: Path to the app's state_data directory.
        base_profiles: List of base profile names to expand.
        variant_types: If provided, only include variants of these types
            (e.g. ``["theme"]``).  ``None`` means include all variant types
            except ``"ui_state"`` (which requires opt-in via the
            ``DIGIWORLD_INCLUDE_UI_STATE_VARIANTS`` env var).
    """
    import os as _os

    base_set = set(base_profiles)
    expanded = list(base_profiles)

    # Determine which variant types to include
    if variant_types is None:
        include_ui_state = _os.environ.get(
            "DIGIWORLD_INCLUDE_UI_STATE_VARIANTS", ""
        ).lower() in ("1", "true", "yes")
        allowed_types = None  # allow all …
        excluded_types = set() if include_ui_state else {"ui_state"}
    else:
        allowed_types = set(variant_types)
        excluded_types = set()

    app_state = Path(app_state_dir)
    if not app_state.is_dir():
        return expanded

    for item in sorted(app_state.iterdir()):
        if not item.is_dir():
            continue
        if item.name in base_set:
            continue
        marker = read_variant_marker(str(item))
        if marker and marker.get("base_profile") in base_set:
            vtype = marker.get("variant_type", "")
            if allowed_types is not None and vtype not in allowed_types:
                continue
            if vtype in excluded_types:
                continue
            db_path = item / "sessions" / "default" / "default.db"
            if db_path.exists():
                expanded.append(item.name)

    return expanded
