# Copyright (c) Meta Platforms, Inc. and affiliates.
import os
import sqlite3
import logging

from digiworld.scenarios.scenario_base import Scenario
from digiworld.scenarios.scenarios.music.template_resolver import MusicTemplateResolver

logger = logging.getLogger(__name__)


class MusicScenario(Scenario):
    """Base class for music scenarios."""
    
    def _get_positioning_data(self, db_path):
        """
        Get music-specific data for template resolution.
        Note: Positioning timestamps now use PositioningService, this returns music context data.
        """
        if not hasattr(self, 'current_user_id') or self.current_user_id is None:
            logger.debug("current_user_id not available yet, returning empty positioning data")
            return {
                'song_count': 0, 'artist_count': 0, 'playlist_count': 0,
                'favorite_song_ids': None, 'favorite_categories': None, 'recently_played': None
            }

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT favorite_song_ids, favorite_categories, recently_played 
            FROM users WHERE id = ?
        """, (self.current_user_id,))
        user_data = cursor.fetchone()

        cursor.execute("SELECT COUNT(*) FROM songs")
        song_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM artists")
        artist_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM playlists WHERE user_id = ?", (self.current_user_id,))
        playlist_count = cursor.fetchone()[0]

        conn.close()

        logger.info(f"Found {song_count} songs, {artist_count} artists, {playlist_count} playlists for user")
        return {
            'song_count': song_count,
            'artist_count': artist_count,
            'playlist_count': playlist_count,
            'favorite_song_ids': user_data[0] if user_data else None,
            'favorite_categories': user_data[1] if user_data else None,
            'recently_played': user_data[2] if user_data else None
        }
    
    def _create_template_resolver(self, user_context, positioning_data):
        """
        Create MusicTemplateResolver with positioning support.
        """
        return MusicTemplateResolver(
            user_context=user_context,
            positioning_data=positioning_data,
            db_path=getattr(self, '_current_db_path', None)
        )

    # Override context field support for music scenarios
    def _get_supported_context_fields(self):
        """
        Music scenarios support basic user context fields.
        """
        # Explicitly call Scenario._get_supported_context_fields to avoid MRO issues with multiple inheritance
        base_fields = Scenario._get_supported_context_fields(self)
        return base_fields
