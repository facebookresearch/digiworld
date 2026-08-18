# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Reusable mockdata record builders shared across apps.

Each app's shared.py can import and use these generic helpers, or define
app-specific builders that delegate to these for common patterns.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional


def write_mockdata(path: Path, records: List[Dict[str, Any]]) -> None:
    """Write a list of record dicts to a mock-*.json file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(records, indent=2))


def base_record(**fields: Any) -> Dict[str, Any]:
    """Create a record dict from keyword arguments.

    Template placeholders (``{{auto_id}}``, ``{{current_user_id}}``, etc.)
    are passed as plain strings.
    """
    return dict(fields)


def slugify(text: str, max_len: int = 30) -> str:
    """Convert text to a filesystem-safe slug."""
    slug = text[:max_len].lower().strip()
    safe = []
    for ch in slug:
        if ch.isalnum():
            safe.append(ch)
        elif ch in (" ", "-", "_"):
            safe.append("_")
    result = "".join(safe).strip("_")
    return result or "unnamed"


def derive_email_from_name(name: str, domain: str = "example.com") -> str:
    """Turn 'John Smith' into 'john.smith@example.com'.

    Sanitizes LLM output that may include titles, commas, or other
    extraneous text (e.g. 'Laura Mitchell, Product Manager at HomeTech').
    Only the first two name-like words are used.
    """
    import re
    cleaned = name.split(",")[0].strip()
    cleaned = re.sub(r"[^a-zA-Z\s\-']", "", cleaned).strip()
    words = cleaned.lower().split()
    words = [w for w in words if len(w) > 1]
    parts = words[:2] if words else ["user"]
    local = ".".join(parts)
    return f"{local}@{domain}"
