# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Template resolver for video app scenarios."""

import sqlite3
import logging
from digiworld.scenarios.template_resolver import TemplateResolver

logger = logging.getLogger(__name__)


class VideoTemplateResolver(TemplateResolver):
    """
    Template resolver for video app scenarios.
    Handles video-specific template variables and database queries.
    """
    
    def __init__(self, user_context, positioning_data=None, db_path=None):
        """
        Initialize video template resolver.
        
        Args:
            user_context: Dictionary of user context information
            positioning_data: Dictionary of positioning data (video counts, etc.)
            db_path: Path to the database file
        """
        super().__init__(user_context)
        self.positioning_data = positioning_data or {}
        self.db_path = db_path
    
    def resolve(self, template_value):
        """
        Resolve template variables specific to video app.
        
        Args:
            template_value: The template string to resolve
            
        Returns:
            The resolved value with templates replaced
        """
        # Handle video-specific templates
        if template_value == "{{current_user_channel_id}}":
            return self._get_current_user_channel_id()
        
        # First try base resolver for common patterns
        result = super().resolve(template_value)
        
        return result
    
    def _get_current_user_channel_id(self):
        """Get the channel ID for the current user (1:1 relationship with users)"""
        current_user_id = self.user_context.get('current_user_id')
        if not current_user_id:
            raise ValueError("current_user_id not available, cannot resolve channel_id")
        
        if not self.db_path:
            raise ValueError("db_path not available, cannot query for channel_id")
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM channels WHERE user_id = ?", (current_user_id,))
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return result[0]
        else:
            raise ValueError(f"No channel found for user_id {current_user_id} in database {self.db_path}")

