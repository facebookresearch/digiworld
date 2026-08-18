# Copyright (c) Meta Platforms, Inc. and affiliates.
import os
import sqlite3
import logging

from digiworld.scenarios.scenario_base import Scenario
from digiworld.scenarios.scenarios.video.template_resolver import VideoTemplateResolver

logger = logging.getLogger(__name__)


class VideoScenario(Scenario):
    """Base class for video scenarios."""
    
    def _get_positioning_data(self, db_path):
        """
        Get video-specific data for template resolution.
        Note: Positioning timestamps now use PositioningService, this returns video context data.
        """
        if not hasattr(self, 'current_user_id') or self.current_user_id is None:
            logger.debug("Note: current_user_id not available yet, returning empty positioning data")
            return {
                'video_count': 0,
                'channel_count': 0,
                'playlist_count': 0,
                'subscription_count': 0
            }
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM videos WHERE status = 'active' AND visibility = 'public'")
        video_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM channels WHERE deleted_at IS NULL")
        channel_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM playlists WHERE user_id = ? AND deleted_at IS NULL", (self.current_user_id,))
        playlist_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM subscriptions WHERE user_id = ?", (self.current_user_id,))
        subscription_count = cursor.fetchone()[0]

        conn.close()

        logger.info(f"Found {video_count} videos, {channel_count} channels, {playlist_count} playlists for user")
        return {
            'video_count': video_count,
            'channel_count': channel_count,
            'playlist_count': playlist_count,
            'subscription_count': subscription_count
        }
    
    def _create_template_resolver(self, user_context, positioning_data):
        """
        Create VideoTemplateResolver with positioning support.
        """
        return VideoTemplateResolver(
            user_context=user_context,
            positioning_data=positioning_data,
            db_path=getattr(self, '_current_db_path', None)
        )

    # Override context field support for video scenarios
    def _get_supported_context_fields(self):
        """
        Video scenarios support basic user context fields.
        """
        # Explicitly call Scenario._get_supported_context_fields to avoid MRO issues with multiple inheritance
        base_fields = Scenario._get_supported_context_fields(self)
        return base_fields

