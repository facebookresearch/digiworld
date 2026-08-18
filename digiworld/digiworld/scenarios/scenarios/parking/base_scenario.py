# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Base scenario class for parking app scenarios."""

import os
import sqlite3
import logging
from typing import Any, Dict, Optional

from digiworld.scenarios.scenario_base import Scenario
from digiworld.scenarios.scenarios.parking.template_resolver import ParkingTemplateResolver

logger = logging.getLogger(__name__)


class ParkingScenario(Scenario):
    """Base class for parking scenarios."""
    
    def _get_positioning_data(self, db_path):
        """
        Get parking-specific data for template resolution.
        """
        if not hasattr(self, 'current_user_id') or self.current_user_id is None:
            logger.debug("current_user_id not available yet, returning empty positioning data")
            return {'location_count': 0, 'reservation_count': 0, 'vehicle_count': 0}

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM parking_zones")
        location_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM parking_history WHERE user_id = ?", (self.current_user_id,))
        reservation_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM vehicles WHERE user_id = ?", (self.current_user_id,))
        vehicle_count = cursor.fetchone()[0]

        conn.close()

        logger.info(f"Found {location_count} locations, {reservation_count} reservations, {vehicle_count} vehicles")
        return {
            'location_count': location_count,
            'reservation_count': reservation_count,
            'vehicle_count': vehicle_count
        }
    
    def _create_template_resolver(self, user_context, positioning_data):
        """
        Create ParkingTemplateResolver with positioning support.
        """
        return ParkingTemplateResolver(
            user_context=user_context,
            positioning_data=positioning_data,
            db_path=getattr(self, '_current_db_path', None)
        )

    def _get_supported_context_fields(self):
        base_fields = Scenario._get_supported_context_fields(self)
        base_fields['current_user_password'] = (
            "The current user's account password, needed for password-change verification."
        )
        return base_fields

    def _extract_context_field(
        self,
        field_name: str,
        db_path: str,
        user_context: Dict[str, Any],
    ) -> Optional[str]:
        if field_name == 'current_user_password':
            user_id = user_context.get('current_user_id')
            if user_id is None:
                raise ValueError("current_user_id is required to extract current_user_password")
            return self._extract_user_password(db_path, user_id)
        return super()._extract_context_field(field_name, db_path, user_context)

    @staticmethod
    def _extract_user_password(db_path: str, user_id: Any) -> str:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT password FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            raise ValueError(f"No user found with id {user_id}")
        return str(row[0])
