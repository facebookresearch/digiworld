# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Template resolver for flight booking app scenarios."""

import logging
from typing import Dict, Any, Optional, Set

from digiworld.scenarios.template_resolver import TemplateResolver
from digiworld.scenarios.positioning_service import Position

logger = logging.getLogger(__name__)


class FlightBookingTemplateResolver(TemplateResolver):
    """Flight booking-specific template resolver using PositioningService for smart positioning"""

    # Flight booking-specific templates that need context pre-extraction.
    # Positioning templates use current_user_id to filter bookings.
    CONTEXT_DEPENDENCIES: Dict[str, Set[str]] = {
        **TemplateResolver.CONTEXT_DEPENDENCIES,
        'middle_timestamp': {'current_user_id'},
        'beginning_timestamp': {'current_user_id'},
        'end_timestamp': {'current_user_id'},
    }

    # Database configuration for bookings
    DB_CONFIG = {
        'table_name': 'bookings',
        'timestamp_column': 'created_at',
        'filter_column': 'user_id',
        'filter_pattern': '{user_id}',  # Exact match for user_id
        'additional_filters': {}
    }

    def __init__(self, user_context: Dict[str, Any], positioning_data: Optional[Dict[str, Any]] = None, db_path: Optional[str] = None):
        """
        Initialize flight booking template resolver.

        Args:
            user_context: User context information
            positioning_data: Pre-computed flight data (flights, airports, bookings, etc.)
            db_path: Database path for queries
        """
        super().__init__(user_context)
        self.positioning_data = positioning_data or {}
        self.db_path = db_path
        self._positioning_service = None

    def _get_positioning_service(self):
        """Lazy initialization of positioning service"""
        if self._positioning_service is None:
            from digiworld.scenarios.positioning_service import PositioningService

            # Custom config for flight bookings - filter by user_id (exact match)
            config = {
                'table_name': 'bookings',
                'timestamp_column': 'created_at',
                'filter_column': 'user_id',
                'filter_pattern': None,  # We'll handle user_id filtering differently
                'additional_filters': {}
            }
            self._positioning_service = PositioningService(config)
        return self._positioning_service
    
    def resolve(self, template_str: str) -> str:
        """Resolve flight booking-specific templates"""

        # Normalize single-brace tokens first for compatibility
        if isinstance(template_str, str) and template_str.startswith('{') and template_str.endswith('}') and not template_str.startswith('{{'):
            template_str = '{{' + template_str[1:-1] + '}}'

        # Try flight booking-specific templates first
        flight_resolved = self._resolve_flight_specific_template(template_str)
        if flight_resolved != template_str:
            return flight_resolved

        # Fall back to base resolver
        return super().resolve(template_str)
    
    def _resolve_flight_specific_template(self, template_str: str) -> str:
        """Resolve flight booking-specific template patterns"""

        # Inline substitution: dynamic dates relative to now (UTC)
        # tomorrow_date = tomorrow, so flights depart ~24-48h from now
        dynamic_date_tags = ("{{tomorrow_date}}", "{{tomorrow_date_plus1}}", "{{tomorrow_date_plus7}}")
        if any(tag in template_str for tag in dynamic_date_tags):
            from datetime import datetime, timedelta
            now = datetime.utcnow()
            replacements = {
                "{{tomorrow_date_plus7}}": (now + timedelta(days=8)).strftime("%Y-%m-%d"),
                "{{tomorrow_date_plus1}}": (now + timedelta(days=2)).strftime("%Y-%m-%d"),
                "{{tomorrow_date}}": (now + timedelta(days=1)).strftime("%Y-%m-%d"),
            }
            result = template_str
            for tag, value in replacements.items():
                result = result.replace(tag, value)
            return result

        # Handle positioning templates - these need database access
        if template_str in ("{{middle_timestamp}}", "{{beginning_timestamp}}", "{{end_timestamp}}"):
            user_id = self.user_context.get('current_user_id', '')
            
            if not self.db_path or not user_id:
                # Fall through to base resolver
                return template_str
            
            if template_str == "{{middle_timestamp}}":
                return self._get_positioned_timestamp_for_user(Position.middle, user_id)
            elif template_str == "{{beginning_timestamp}}":
                return self._get_positioned_timestamp_for_user(Position.beginning, user_id)
            elif template_str == "{{end_timestamp}}":
                return self._get_positioned_timestamp_for_user(Position.end, user_id)

        # Return unchanged if not recognized - the main resolve method will handle exceptions
        return template_str

    def _get_positioned_timestamp_for_user(self, position: Position, user_id: str) -> str:
        """
        Get positioned timestamp filtering by user_id.
        
        Note: The flight booking app sorts bookings by created_at DESC (newest first).
        - beginning = newest created_at (appears first in list)
        - middle = between newest and oldest
        - end = oldest created_at (appears last in list)
        """
        import sqlite3
        from datetime import datetime, timedelta
        import random

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Query created_at for this user's bookings, ordered ASC
        cursor.execute(
            "SELECT created_at FROM bookings WHERE user_id = ? ORDER BY created_at ASC",
            (user_id,)
        )
        timestamps = [row[0] for row in cursor.fetchall()]
        conn.close()

        if len(timestamps) < 1:
            # No existing bookings - generate a recent timestamp
            now = datetime.now()
            return (now - timedelta(hours=random.randint(1, 24))).isoformat() + "Z"

        # Parse earliest and latest created_at
        earliest = datetime.fromisoformat(timestamps[0].replace('Z', '+00:00'))
        latest = datetime.fromisoformat(timestamps[-1].replace('Z', '+00:00'))

        if position == Position.beginning:
            # Generate timestamp NEWER than the latest (will appear FIRST in DESC list)
            new_time = latest + timedelta(hours=random.randint(1, 24))
            return new_time.isoformat().replace('+00:00', 'Z')
        elif position == Position.middle:
            # Generate timestamp in the middle of the time range
            time_range = latest - earliest
            if time_range.total_seconds() < 60:  # Less than 1 minute difference
                # All timestamps are essentially the same - use the same timestamp
                mid_time = earliest
            else:
                # True middle: halfway between earliest and latest
                mid_time = earliest + time_range / 2
            return mid_time.isoformat().replace('+00:00', 'Z')
        else:  # end
            # Generate timestamp OLDER than the earliest (will appear LAST in DESC list)
            new_time = earliest - timedelta(hours=random.randint(1, 48))
            return new_time.isoformat().replace('+00:00', 'Z')
