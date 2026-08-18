# Copyright (c) Meta Platforms, Inc. and affiliates.
import sqlite3
import logging
import re
from typing import Dict, Any, Optional, Set

from digiworld.scenarios.template_resolver import TemplateResolver

logger = logging.getLogger(__name__)


class SmartHomeTemplateResolver(TemplateResolver):
    """Smart home-specific template resolver"""
    
    # SmartHome-specific templates that need context pre-extraction.
    # first_room_id queries the database using current_user_id.
    CONTEXT_DEPENDENCIES: Dict[str, Set[str]] = {
        **TemplateResolver.CONTEXT_DEPENDENCIES,
        'first_room_id': {'current_user_id'},
    }

    def __init__(self, user_context: Dict[str, Any], positioning_data: Optional[Dict[str, Any]] = None, db_path: Optional[str] = None):
        """
        Initialize smart home template resolver.

        Args:
            user_context: User context information
            positioning_data: Pre-computed smart home data (devices, rooms, scenes, etc.)
            db_path: Database path for queries
        """
        super().__init__(user_context)
        self.positioning_data = positioning_data or {}
        self.db_path = db_path
    
    def resolve(self, template_str: str) -> str:
        """Resolve smart home-specific templates"""

        # Try smart home-specific templates first
        smarthome_resolved = self._resolve_smarthome_specific_template(template_str)
        if smarthome_resolved != template_str:
            return smarthome_resolved

        # Fall back to base resolver
        return super().resolve(template_str)
    
    def _resolve_smarthome_specific_template(self, template_str: str) -> str:
        """Resolve smart home-specific template patterns"""

        # Handle {{first_room_id}} pattern - get the first room for the current user
        if template_str == "{{first_room_id}}":
            return self._get_first_room_id()

        # Handle {{room_id_by_name:Room Name}} pattern (legacy support)
        room_id_pattern = r'\{\{room_id_by_name:(.+?)\}\}'
        match = re.match(room_id_pattern, template_str)
        if match:
            room_name = match.group(1)
            return self._get_room_id_by_name(room_name)

        device_type_id_pattern = r'\{\{device_type_id_by_name:(.+?)\}\}'
        match = re.match(device_type_id_pattern, template_str)
        if match:
            device_type_name = match.group(1)
            return self._get_device_type_id_by_name(device_type_name)
        
        # Return unchanged if not recognized - the main resolve method will handle exceptions
        return template_str
    
    def _get_first_room_id(self):
        """Get the first available room ID for the current user"""
        current_user_id = self.user_context.get('current_user_id')
        if not current_user_id:
            raise ValueError("current_user_id not available, cannot resolve first_room_id")
        
        if not self.db_path:
            raise ValueError("db_path not available, cannot query for first_room_id")
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM rooms WHERE user_id = ? AND deleted_at IS NULL ORDER BY id LIMIT 1",
            (current_user_id,)
        )
        result = cursor.fetchone()
        conn.close()
        
        if result:
            logger.info(f"Found first room with ID {result[0]} for user {current_user_id}")
            return result[0]
        else:
            raise ValueError(f"No rooms found for user_id {current_user_id} in database {self.db_path}")
    
    def _get_room_id_by_name(self, room_name: str):
        """Get the room ID for a given room name"""
        current_user_id = self.user_context.get('current_user_id')
        if not current_user_id:
            raise ValueError(f"current_user_id not available, cannot resolve room_id for '{room_name}'")
        
        if not self.db_path:
            raise ValueError(f"db_path not available, cannot query for room_id for '{room_name}'")
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM rooms WHERE user_id = ? AND name = ? AND deleted_at IS NULL",
            (current_user_id, room_name)
        )
        result = cursor.fetchone()
        conn.close()
        
        if result:
            logger.info(f"Found room '{room_name}' with ID {result[0]} for user {current_user_id}")
            return result[0]
        else:
            raise ValueError(f"No room found with name '{room_name}' for user_id {current_user_id} in database {self.db_path}")

    def _get_device_type_id_by_name(self, device_type_name: str):
        """Get the device type ID for a given device type name."""
        if not self.db_path:
            raise ValueError(
                f"db_path not available, cannot query for device type '{device_type_name}'"
            )

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM device_types WHERE LOWER(name) = LOWER(?) AND is_active = 1",
            (device_type_name,),
        )
        result = cursor.fetchone()
        conn.close()

        if result:
            logger.info(
                f"Found device type '{device_type_name}' with ID {result[0]}"
            )
            return result[0]

        raise ValueError(
            f"No device type found with name '{device_type_name}' in database {self.db_path}"
        )

