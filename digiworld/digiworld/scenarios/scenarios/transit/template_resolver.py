# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Template resolver for transit app scenarios."""

import logging
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Set

from digiworld.scenarios.template_resolver import TemplateResolver
from digiworld.scenarios.positioning_service import Position

logger = logging.getLogger(__name__)


class TransitTemplateResolver(TemplateResolver):
    """Transit-specific template resolver with PositioningService support.
    
    The transit app sorts saved_routes by updated_at DESC.
    Timestamps use SQLite strftime format ('YYYY-MM-DD HH:MM:SS.fff').
    """

    CONTEXT_DEPENDENCIES: Dict[str, Set[str]] = {
        **TemplateResolver.CONTEXT_DEPENDENCIES,
        'middle_timestamp': {'current_user_id'},
        'beginning_timestamp': {'current_user_id'},
        'end_timestamp': {'current_user_id'},
    }

    def __init__(self, user_context: Dict[str, Any], positioning_data: Optional[Dict[str, Any]] = None, db_path: Optional[str] = None):
        """
        Initialize transit template resolver.

        Args:
            user_context: User context information
            positioning_data: Pre-computed transit data (routes, stops, trips, etc.)
            db_path: Database path for queries
        """
        super().__init__(user_context)
        self.positioning_data = positioning_data or {}
        self.db_path = db_path
        self._positioning_service = None

    def _get_positioning_service(self):
        """Lazy initialization of positioning service for saved_routes."""
        if self._positioning_service is None:
            from digiworld.scenarios.positioning_service import PositioningService, PositioningConfig

            # Transit sorts saved routes by updated_at DESC.
            # SQLite column names are snake_case (user_id, updated_at).
            user_id = self.user_context.get('current_user_id', '')
            config = PositioningConfig(
                table_name='saved_routes',
                timestamp_column='updated_at',
                filter_column='user_id',
                filter_pattern=str(user_id),
            )
            self._positioning_service = PositioningService(config)
        return self._positioning_service

    def resolve(self, template_str: str) -> str:
        """Resolve transit-specific templates"""

        # Normalize single-brace tokens for compatibility
        if isinstance(template_str, str) and template_str.startswith('{') and template_str.endswith('}') and not template_str.startswith('{{'):
            template_str = '{{' + template_str[1:-1] + '}}'

        # Try transit-specific templates first
        transit_resolved = self._resolve_transit_specific_template(template_str)
        if transit_resolved != template_str:
            return transit_resolved

        # Fall back to base resolver
        return super().resolve(template_str)

    def _resolve_transit_specific_template(self, template_str: str) -> str:
        """Resolve transit-specific template patterns"""

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

        # Try PositioningService first (works when user has 2+ saved routes)
        positioning_service = self._get_positioning_service()
        user_id = str(self.user_context.get('current_user_id', ''))

        try:
            result = positioning_service.get_positioned_timestamp(position, self.db_path, user_id)
            # Reformat to match the existing DB format if needed
            return self._match_db_format(result, user_id)
        except Exception as e:
            from digiworld.scenarios.positioning_service import InsufficientDataError
            if isinstance(e, InsufficientDataError):
                logger.debug(f"PositioningService needs 2+ items for {template_str}, using single-item fallback: {e}")
                return self._fallback_position(position, user_id)
            raise

    def _match_db_format(self, iso_timestamp: str, user_id: str) -> str:
        """Reformat PositioningService output to match existing DB timestamp format."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT updated_at FROM saved_routes WHERE user_id = ? LIMIT 1",
            (user_id,)
        )
        row = cursor.fetchone()
        conn.close()

        if not row or not row[0]:
            return iso_timestamp

        sample = row[0]
        # If existing data uses space-separated format (SQLite strftime), convert
        if ' ' in sample and 'T' not in sample:
            dt = self._parse_ts(iso_timestamp)
            return self._format_sqlite(dt)
        return iso_timestamp

    def _fallback_position(self, position: Position, user_id: str) -> str:
        """Fallback when user has only 1 saved route."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT updated_at FROM saved_routes WHERE user_id = ? ORDER BY updated_at ASC",
            (user_id,)
        )
        rows = [r[0] for r in cursor.fetchall() if r[0] and '{{' not in r[0]]
        conn.close()

        if not rows:
            raise ValueError(f"No saved routes found for user {user_id}")

        dt = self._parse_ts(rows[0])
        sample = rows[0]
        uses_sqlite = ' ' in sample and 'T' not in sample

        if position == Position.end:
            result = dt - timedelta(hours=1)
        elif position == Position.beginning:
            result = dt + timedelta(hours=1)
        else:
            result = dt

        return self._format_sqlite(result) if uses_sqlite else self._format_iso(result)

    @staticmethod
    def _parse_ts(ts: str) -> datetime:
        ts = ts.replace('Z', '+00:00')
        if ' ' in ts and 'T' not in ts:
            ts = ts.replace(' ', 'T')
        return datetime.fromisoformat(ts)

    @staticmethod
    def _format_sqlite(dt: datetime) -> str:
        """Format as SQLite strftime('%Y-%m-%d %H:%M:%f') style."""
        base = dt.strftime('%Y-%m-%d %H:%M:%S')
        ms = dt.microsecond // 1000
        return f"{base}.{ms:03d}"

    @staticmethod
    def _format_iso(dt: datetime) -> str:
        from datetime import timezone
        if dt.tzinfo is None:
            return dt.isoformat() + "Z"
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
