# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared primitives for music scenario instance generation."""

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


GENRES = [
    "Rock", "Pop", "Jazz", "Electronic", "Experimental", "Ambient",
]

_MUSIC_STATE_DIR = (
    Path(__file__).resolve().parents[2].parent
    / "state_data"
    / "com.andojomusic.sbx"
)


def collect_profile_artists() -> List[Dict[str, str]]:
    """Read artist names from all music profile SQLite databases.

    Queries the ``artists`` table in each profile's default.db so the
    returned names are guaranteed to match what the feasibility
    constraint will check at profile-compatibility time.

    Returns a list of dicts ``{"name": ..., "profile": ...}`` covering
    every artist across every non-variant profile.
    """
    artists: List[Dict[str, str]] = []
    if not _MUSIC_STATE_DIR.is_dir():
        return artists

    for profile_dir in sorted(_MUSIC_STATE_DIR.iterdir()):
        if not profile_dir.is_dir():
            continue
        if "-theme_" in profile_dir.name:
            continue
        db_path = profile_dir / "sessions" / "default" / "default.db"
        if not db_path.exists():
            continue
        try:
            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
            rows = conn.execute("SELECT name FROM artists").fetchall()
            conn.close()
        except (sqlite3.DatabaseError, sqlite3.OperationalError):
            continue
        for row in rows:
            artists.append({
                "name": row[0],
                "profile": profile_dir.name,
            })
    return artists


class PlaylistNameBatch(BaseModel):
    names: List[str]


def playlist_name_prompt(theme: str, count: int) -> str:
    return (
        f"Generate exactly {count} creative, unique playlist names for a "
        f"music app. The theme is '{theme}'. "
        f"Names should be catchy and 2-5 words long. "
        f"Ensure variety. Return JSON with key 'names' as a list of strings."
    )


def build_playlist_record(
    name: str,
    user_id: str = "{{current_user_id}}",
    song_ids: Optional[List[int]] = None,
    **overrides: Any,
) -> Dict[str, Any]:
    record: Dict[str, Any] = {
        "id": "{{auto_id}}",
        "name": name,
        "description": f"A playlist called {name}",
        "userId": user_id,
        "categories": [],
        "coverArt": "playlists/playlist_default.jpg",
        "songIds": song_ids if song_ids is not None else [1, 5, 10, 15, 20],
        "createdAt": "{{recent_timestamp}}",
        "updatedAt": "{{recent_timestamp}}",
    }
    record.update(overrides)
    return record
