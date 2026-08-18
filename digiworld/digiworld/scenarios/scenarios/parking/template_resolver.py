# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Template resolver for parking app scenarios."""

import logging
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, Set

from digiworld.scenarios.template_resolver import TemplateResolver
from digiworld.scenarios.positioning_service import Position, InsufficientDataError

logger = logging.getLogger(__name__)


class ParkingTemplateResolver(TemplateResolver):
    """Parking-specific template resolver using PositioningService for smart positioning."""

    # Parking-specific context dependencies for positioning templates.
    # Positioning uses current_user_id to filter vehicles by user.
    CONTEXT_DEPENDENCIES: Dict[str, Set[str]] = {
        **TemplateResolver.CONTEXT_DEPENDENCIES,
        'middle_timestamp': {'current_user_id'},
        'beginning_timestamp': {'current_user_id'},
        'end_timestamp': {'current_user_id'},
    }

    def __init__(self, user_context: Dict[str, Any], positioning_data: Optional[Dict[str, Any]] = None, db_path: Optional[str] = None):
        """
        Initialize parking template resolver.

        Args:
            user_context: User context information
            positioning_data: Pre-computed parking data (locations, reservations, vehicles, etc.)
            db_path: Database path for queries
        """
        super().__init__(user_context)
        self.positioning_data = positioning_data or {}
        self.db_path = db_path
        self._positioning_service = None
        self._current_timestamp_base: Optional[datetime] = None

    def _get_positioning_service(self):
        """Lazy initialization of positioning service configured for parking vehicles."""
        if self._positioning_service is None:
            from digiworld.scenarios.positioning_service import PositioningService, PositioningConfig

            # Parking filters by user_id (integer), similar to banking.
            # NOTE: SQLite column names are snake_case (user_id, created_at),
            # NOT the camelCase used in Drizzle ORM / JSON mockdata.
            user_id = self.user_context.get('current_user_id', '')
            config = PositioningConfig(
                table_name='vehicles',
                timestamp_column='created_at',
                filter_column='user_id',
                filter_pattern=str(user_id),
            )
            self._positioning_service = PositioningService(config)
        return self._positioning_service

    def resolve(self, template_str: str) -> str:
        """Resolve parking-specific templates"""

        # Normalize single-brace tokens for compatibility
        if isinstance(template_str, str) and template_str.startswith('{') and template_str.endswith('}') and not template_str.startswith('{{'):
            template_str = '{{' + template_str[1:-1] + '}}'

        # Try parking-specific templates first
        parking_resolved = self._resolve_parking_specific_template(template_str)
        if parking_resolved != template_str:
            return parking_resolved

        # Fall back to base resolver
        return super().resolve(template_str)

    def _resolve_parking_specific_template(self, template_str: str) -> str:
        """Resolve parking-specific template patterns"""

        if template_str == "{{current_user_password}}":
            password = self.user_context.get("current_user_password")
            if password:
                return str(password)
            raise ValueError(
                "User password not found in context. "
                "Ensure 'current_user_password' is in context_fields."
            )

        if template_str == "{{current_timestamp}}":
            return self._to_iso_z(self._get_current_timestamp_base())

        plus_minutes_match = re.fullmatch(
            r"\{\{current_timestamp_plus_(\d+)_minutes\}\}",
            template_str,
        )
        if plus_minutes_match:
            minutes = int(plus_minutes_match.group(1))
            return self._to_iso_z(
                self._get_current_timestamp_base() + timedelta(minutes=minutes)
            )

        positioning_templates = {
            "{{middle_timestamp}}": Position.middle,
            "{{beginning_timestamp}}": Position.beginning,
            "{{end_timestamp}}": Position.end,
        }

        if template_str not in positioning_templates:
            return template_str

        position = positioning_templates[template_str]

        if not self.db_path:
            raise ValueError(f"Cannot resolve {template_str}: db_path is not set on the template resolver")

        # Try PositioningService first (works when user has 2+ vehicles)
        positioning_service = self._get_positioning_service()
        user_id = str(self.user_context.get('current_user_id', ''))

        try:
            return positioning_service.get_positioned_timestamp(position, self.db_path, user_id)
        except InsufficientDataError as e:
            # Known case: user has <2 vehicles. Use single-item fallback.
            logger.debug(f"PositioningService needs 2+ items for {template_str}, using single-item fallback: {e}")
            return self._fallback_position_from_db(position)
        # All other exceptions (QueryError, etc.) propagate — no silent failures.

    def _fallback_position_from_db(self, position: Position) -> str:
        """
        Fallback positioning when user has only 1 vehicle (PositioningService needs 2+).
        Queries the user's existing vehicle timestamps directly and computes a relative position.
        """
        user_id = self.user_context.get('current_user_id', '')

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        # NOTE: SQLite column names are snake_case (created_at, user_id)
        cursor.execute(
            "SELECT created_at FROM vehicles WHERE user_id = ? ORDER BY created_at ASC",
            (user_id,)
        )
        rows = [r[0] for r in cursor.fetchall() if r[0] and '{{' not in r[0]]
        conn.close()

        if not rows:
            raise ValueError(
                f"Cannot position vehicle for user {user_id}: no existing vehicles found in database at {self.db_path}"
            )

        if position == Position.end:
            # Place before the earliest existing vehicle (appears last in DESC sort)
            earliest = datetime.fromisoformat(rows[0].replace('Z', '+00:00'))
            new_time = earliest - timedelta(hours=48)
            return self._to_iso_z(new_time)
        elif position == Position.beginning:
            # Place after the latest existing vehicle (appears first in DESC sort)
            latest = datetime.fromisoformat(rows[-1].replace('Z', '+00:00'))
            new_time = latest + timedelta(hours=1)
            return self._to_iso_z(new_time)
        else:
            # Middle: with only 1 item, use the same timestamp
            ts = datetime.fromisoformat(rows[0].replace('Z', '+00:00'))
            return self._to_iso_z(ts)

    def _get_current_timestamp_base(self) -> datetime:
        """Return a stable current timestamp for all related template resolutions."""
        if self._current_timestamp_base is None:
            self._current_timestamp_base = datetime.now(timezone.utc)
        return self._current_timestamp_base

    @staticmethod
    def _to_iso_z(dt: datetime) -> str:
        """Normalize a datetime to ISO 8601 string with 'Z' suffix."""
        if dt.tzinfo is None:
            return dt.isoformat() + "Z"
        dt_utc = dt.astimezone(timezone.utc)
        return dt_utc.isoformat().replace("+00:00", "Z")
