#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Generate the Music app's song and playlist cover art from its album art.

``AssetManager`` resolves every music entity to
``mockdata/assets/{entityType}/{entityId}/main.jpg`` -- it does not read the
``coverArt`` string in the mockdata JSON, so the legacy
``playlists/playlist_{id}.jpg`` values there are inert. Only ``albums/`` and
``artists/`` have ever existed on disk, which is why Top Albums renders real
art while Recently Played (``songs/{songId}/main.jpg``) and every playlist
surface (``playlists/{playlistId}/main.jpg``) fall back to
``album_placeholder.jpg``.

Both gaps are filled from art the profile already ships:

* ``songs/{songId}/main.jpg`` -- a copy of the song's own album art, which is
  what ``mock-songs.json`` already names in its ``coverArt`` field.
* ``playlists/{playlistId}/main.jpg`` -- a mosaic of the albums the playlist's
  songs belong to, the way a real music app builds a playlist cover:

      4+ distinct albums -> 2x2 grid
      3 distinct albums  -> full-height left, two stacked right
      2 distinct albums  -> 2x2 grid, each album repeated once
      1 distinct album   -> that album's art, full bleed

Album order follows ``songIds`` order, so output is deterministic: the same
profile always produces byte-identical covers.

Covers are written into every music profile, because each profile has its own
playlist set (6 in minimal_playlists, 55 in playlist_heavy) and its own
song -> album mapping.

Usage:
    python digiworld/scripts/generate_music_covers.py
    python digiworld/scripts/generate_music_covers.py --profile default
    python digiworld/scripts/generate_music_covers.py --force
    python digiworld/scripts/generate_music_covers.py --dry-run
"""

import argparse
import json
import logging
import os
import shutil
import sys
from typing import Dict, List

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import digiworld

BUNDLE_ID = "com.andojomusic.sbx"

# Album art is uniformly 384x384; matching it keeps the mosaic tiles at their
# native resolution when they are halved.
COVER_SIZE = 384
JPEG_QUALITY = 88

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("music_covers")


def _load_json(path: str):
    with open(path, "r", encoding="utf-8") as fp:
        return json.load(fp)


def album_ids_for_playlist(playlist: Dict, songs_by_id: Dict[int, Dict]) -> List[int]:
    """Return the playlist's distinct album ids, in song order."""
    album_ids: List[int] = []
    for song_id in playlist.get("songIds", []):
        song = songs_by_id.get(song_id)
        if not song:
            continue
        album_id = song.get("albumId")
        if album_id is not None and album_id not in album_ids:
            album_ids.append(album_id)
    return album_ids


def _fit(tile: Image.Image, width: int, height: int) -> Image.Image:
    """Centre-crop *tile* to the target aspect ratio, then resize to it.

    Album art is square, so a non-square slot (the tall panel in the 3-album
    layout) would visibly squash the artwork if it were resized directly.
    """
    src_w, src_h = tile.size
    if src_w * height != src_h * width:
        if src_w / src_h > width / height:
            crop_w = round(src_h * width / height)
            left = (src_w - crop_w) // 2
            tile = tile.crop((left, 0, left + crop_w, src_h))
        else:
            crop_h = round(src_w * height / width)
            top = (src_h - crop_h) // 2
            tile = tile.crop((0, top, src_w, top + crop_h))
    return tile.resize((width, height), Image.LANCZOS)


def compose_cover(tiles: List[Image.Image]) -> Image.Image:
    """Lay *tiles* out as a square playlist cover."""
    size = COVER_SIZE
    half = size // 2

    if len(tiles) == 1:
        return _fit(tiles[0], size, size)

    canvas = Image.new("RGB", (size, size))

    if len(tiles) == 3:
        # Full-height left, two stacked right.
        canvas.paste(_fit(tiles[0], half, size), (0, 0))
        canvas.paste(_fit(tiles[1], half, half), (half, 0))
        canvas.paste(_fit(tiles[2], half, half), (half, half))
        return canvas

    # 2 tiles are cycled to fill the grid; 4+ are truncated to the first 4.
    quadrants = [tiles[i % len(tiles)] for i in range(4)]
    for index, tile in enumerate(quadrants):
        canvas.paste(
            _fit(tile, half, half),
            ((index % 2) * half, (index // 2) * half),
        )
    return canvas


class Counts:
    """Per-profile tally of what the generator did."""

    def __init__(self):
        self.written = 0
        self.skipped = 0
        self.unresolved = 0

    def __iadd__(self, other: "Counts") -> "Counts":
        self.written += other.written
        self.skipped += other.skipped
        self.unresolved += other.unresolved
        return self

    def __bool__(self) -> bool:
        return bool(self.written or self.skipped or self.unresolved)


def _generate_song_covers(
    profile: str,
    mockdata_dir: str,
    songs: List[Dict],
    force: bool,
    dry_run: bool,
) -> Counts:
    """Copy each song's album art to ``assets/songs/{songId}/main.jpg``."""
    albums_assets = os.path.join(mockdata_dir, "assets", "albums")
    counts = Counts()

    for song in songs:
        song_id = song.get("id")
        if song_id is None:
            continue

        out_path = os.path.join(mockdata_dir, "assets", "songs", str(song_id), "main.jpg")
        if os.path.exists(out_path) and not force:
            counts.skipped += 1
            continue

        art = os.path.join(albums_assets, str(song.get("albumId")), "main.jpg")
        if not os.path.exists(art):
            logger.warning(
                "[%s] song %s has no album art at %s -- leaving cover absent",
                profile, song_id, art,
            )
            counts.unresolved += 1
            continue

        if not dry_run:
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            # A byte copy, not a re-encode: identical content means git-lfs
            # stores one object no matter how many songs share an album.
            shutil.copyfile(art, out_path)
        counts.written += 1

    return counts


def _generate_playlist_covers(
    profile: str,
    mockdata_dir: str,
    playlists: List[Dict],
    songs_by_id: Dict[int, Dict],
    force: bool,
    dry_run: bool,
) -> Counts:
    """Compose a mosaic cover for each playlist from its songs' album art."""
    albums_assets = os.path.join(mockdata_dir, "assets", "albums")
    counts = Counts()

    for playlist in playlists:
        playlist_id = playlist.get("id")
        if playlist_id is None:
            continue

        out_path = os.path.join(
            mockdata_dir, "assets", "playlists", str(playlist_id), "main.jpg"
        )
        if os.path.exists(out_path) and not force:
            counts.skipped += 1
            continue

        album_ids = album_ids_for_playlist(playlist, songs_by_id)
        tiles: List[Image.Image] = []
        for album_id in album_ids[:4]:
            art = os.path.join(albums_assets, str(album_id), "main.jpg")
            if os.path.exists(art):
                tiles.append(Image.open(art).convert("RGB"))

        if not tiles:
            # No song in this playlist maps to album art we hold, so there is
            # nothing to compose from. Leaving the file absent keeps the app's
            # placeholder fallback, which is better than a blank square.
            logger.warning(
                "[%s] playlist %s has no usable album art -- leaving cover absent",
                profile, playlist_id,
            )
            counts.unresolved += 1
            continue

        if not dry_run:
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            compose_cover(tiles).save(out_path, "JPEG", quality=JPEG_QUALITY)
        counts.written += 1

    return counts


def generate_for_profile(
    profile_dir: str, force: bool = False, dry_run: bool = False
) -> Counts:
    """Generate every song and playlist cover for one profile."""
    profile = os.path.basename(profile_dir)
    mockdata_dir = os.path.join(profile_dir, "mockdata")
    playlists_json = os.path.join(mockdata_dir, "mock-playlists.json")
    songs_json = os.path.join(mockdata_dir, "mock-songs.json")

    if not (os.path.exists(playlists_json) and os.path.exists(songs_json)):
        logger.info("[%s] no playlist/song mockdata -- skipping", profile)
        return Counts()

    playlists = _load_json(playlists_json)
    songs = _load_json(songs_json)
    songs_by_id = {song["id"]: song for song in songs}

    counts = Counts()
    counts += _generate_song_covers(profile, mockdata_dir, songs, force, dry_run)
    counts += _generate_playlist_covers(
        profile, mockdata_dir, playlists, songs_by_id, force, dry_run
    )
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--profile",
        action="append",
        help="Only process this profile (repeatable). Default: every profile.",
    )
    parser.add_argument(
        "--force", action="store_true", help="Overwrite covers that already exist."
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Report what would be written."
    )
    args = parser.parse_args()

    app_state_path = os.path.join(digiworld.get_state_data_path(), BUNDLE_ID)
    if not os.path.isdir(app_state_path):
        logger.error("No state data for %s at %s", BUNDLE_ID, app_state_path)
        return 1

    profiles = sorted(
        name
        for name in os.listdir(app_state_path)
        if os.path.isdir(os.path.join(app_state_path, name)) and not name.startswith(".")
    )
    if args.profile:
        requested = set(args.profile)
        unknown = requested - set(profiles)
        if unknown:
            logger.error("Unknown profile(s): %s", ", ".join(sorted(unknown)))
            return 1
        profiles = [name for name in profiles if name in requested]

    totals = Counts()
    for profile in profiles:
        counts = generate_for_profile(
            os.path.join(app_state_path, profile), force=args.force, dry_run=args.dry_run
        )
        if counts:
            logger.info(
                "[%s] %d written, %d already present, %d without album art",
                profile, counts.written, counts.skipped, counts.unresolved,
            )
        totals += counts

    logger.info(
        "Done: %d cover(s) %s, %d already present, %d without album art",
        totals.written,
        "would be written" if args.dry_run else "written",
        totals.skipped,
        totals.unresolved,
    )
    return 1 if totals.unresolved else 0


if __name__ == "__main__":
    sys.exit(main())
