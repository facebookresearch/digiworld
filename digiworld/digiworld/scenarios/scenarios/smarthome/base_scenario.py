# Copyright (c) Meta Platforms, Inc. and affiliates.
import os
import sqlite3
import logging

from digiworld.scenarios.scenario_base import Scenario
from digiworld.scenarios.scenarios.smarthome.template_resolver import SmartHomeTemplateResolver

logger = logging.getLogger(__name__)


class SmartHomeScenario(Scenario):
    """Base class for smart home scenarios."""
    
    def _get_positioning_data(self, db_path):
        """
        Get smart home-specific data for template resolution.
        Note: Positioning timestamps now use PositioningService, this returns smart home context data.
        """
        if not hasattr(self, 'current_user_id') or self.current_user_id is None:
            logger.debug("Note: current_user_id not available yet, returning empty positioning data")
            return {
                'device_count': 0,
                'room_count': 0,
                'scene_count': 0,
                'automation_count': 0,
                'online_device_count': 0
            }
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM devices WHERE user_id = ?", (self.current_user_id,))
        device_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM rooms WHERE user_id = ?", (self.current_user_id,))
        room_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM scenes WHERE user_id = ?", (self.current_user_id,))
        scene_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM automations WHERE user_id = ?", (self.current_user_id,))
        automation_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM devices WHERE user_id = ? AND is_on = 1", (self.current_user_id,))
        online_device_count = cursor.fetchone()[0]

        conn.close()

        logger.info(f"Found {device_count} devices, {room_count} rooms, {scene_count} scenes for user")
        return {
            'device_count': device_count,
            'room_count': room_count,
            'scene_count': scene_count,
            'automation_count': automation_count,
            'online_device_count': online_device_count
        }
    
    def _create_template_resolver(self, user_context, positioning_data):
        """
        Create SmartHomeTemplateResolver with positioning support.
        """
        return SmartHomeTemplateResolver(
            user_context=user_context,
            positioning_data=positioning_data,
            db_path=getattr(self, '_current_db_path', None)
        )

    # Override context field support for smart home scenarios
    def _get_supported_context_fields(self):
        """
        Smart home scenarios support basic user context fields.
        """
        # Explicitly call Scenario._get_supported_context_fields to avoid MRO issues with multiple inheritance
        base_fields = Scenario._get_supported_context_fields(self)
        return base_fields

