# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Template resolver for qwikshop app scenarios."""

import logging
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Set

from digiworld.scenarios.template_resolver import TemplateResolver
from digiworld.scenarios.positioning_service import Position

logger = logging.getLogger(__name__)


class QwikshopTemplateResolver(TemplateResolver):
    """Qwikshop-specific template resolver using direct DB positioning.
    
    QwikShop's orders table has created_at set by SQLite CURRENT_TIMESTAMP
    (format: 'YYYY-MM-DD HH:MM:SS', space-separated, no T, no timezone).
    The app sorts by created_at DESC. The positioned timestamp must use
    the same format to sort correctly via string comparison.
    """

    # Positioning uses current_user_id to filter orders by user.
    CONTEXT_DEPENDENCIES: Dict[str, Set[str]] = {
        **TemplateResolver.CONTEXT_DEPENDENCIES,
        'middle_timestamp': {'current_user_id'},
        'beginning_timestamp': {'current_user_id'},
        'end_timestamp': {'current_user_id'},
        'current_user_address_full_name': {'current_user_id'},
        'current_user_address_street': {'current_user_id'},
        'current_user_address_city': {'current_user_id'},
        'current_user_address_state': {'current_user_id'},
        'current_user_address_pincode': {'current_user_id'},
    }

    def __init__(self, user_context: Dict[str, Any], positioning_data: Optional[Dict[str, Any]] = None, db_path: Optional[str] = None):
        """
        Initialize qwikshop template resolver.

        Args:
            user_context: User context information
            positioning_data: Pre-computed qwikshop data (products, orders, cart items, etc.)
            db_path: Database path for queries
        """
        super().__init__(user_context)
        self.positioning_data = positioning_data or {}
        self.db_path = db_path

    def resolve(self, template_str: str) -> str:
        """Resolve qwikshop-specific templates"""

        # Normalize single-brace tokens for compatibility
        if isinstance(template_str, str) and template_str.startswith('{') and template_str.endswith('}') and not template_str.startswith('{{'):
            template_str = '{{' + template_str[1:-1] + '}}'

        # Try qwikshop-specific templates first
        qwikshop_resolved = self._resolve_qwikshop_specific_template(template_str)
        if qwikshop_resolved != template_str:
            return qwikshop_resolved

        # Fall back to base resolver
        return super().resolve(template_str)

    def _resolve_qwikshop_specific_template(self, template_str: str) -> str:
        """Resolve qwikshop-specific template patterns.
        
        Uses direct DB queries instead of PositioningService because QwikShop's
        created_at uses SQLite CURRENT_TIMESTAMP format ('YYYY-MM-DD HH:MM:SS')
        and the output must match that exact format for correct string-based sorting.
        """

        positioning_templates = {
            "{{middle_timestamp}}": Position.middle,
            "{{beginning_timestamp}}": Position.beginning,
            "{{end_timestamp}}": Position.end,
        }
        address_template_names = {
            "{{current_user_address_full_name}}",
            "{{current_user_address_street}}",
            "{{current_user_address_city}}",
            "{{current_user_address_state}}",
            "{{current_user_address_pincode}}",
        }

        if template_str in address_template_names:
            address = self._get_current_user_address()
            address_templates = {
                "{{current_user_address_full_name}}": address.get("fullName", ""),
                "{{current_user_address_street}}": address.get("street", ""),
                "{{current_user_address_city}}": address.get("city", ""),
                "{{current_user_address_state}}": address.get("state", ""),
                "{{current_user_address_pincode}}": address.get("pincode", ""),
            }
            return address_templates[template_str]

        if template_str not in positioning_templates:
            return template_str

        position = positioning_templates[template_str]

        if not self.db_path:
            raise ValueError(f"Cannot resolve {template_str}: db_path is not set on the template resolver")

        user_id = self.user_context.get('current_user_id', '')
        if not user_id:
            raise ValueError(f"Cannot resolve {template_str}: current_user_id not available")

        return self._compute_positioned_timestamp(position, user_id)

    def _get_current_user_address(self) -> Dict[str, Any]:
        """Fetch the current user's default address, or the first available one."""
        if not self.db_path:
            raise ValueError("Cannot resolve current user address: db_path is not set")

        user_id = self.user_context.get('current_user_id', '')
        if not user_id:
            raise ValueError("Cannot resolve current user address: current_user_id not available")

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT full_name, street, city, state, pincode
            FROM addresses
            WHERE user_id = ?
            ORDER BY is_default DESC, id ASC
            LIMIT 1
            """,
            (user_id,),
        )
        row = cursor.fetchone()
        conn.close()

        if not row:
            raise ValueError(f"Cannot resolve current user address: no address found for user {user_id}")

        return {
            "fullName": row[0] or "",
            "street": row[1] or "",
            "city": row[2] or "",
            "state": row[3] or "",
            "pincode": row[4] or "",
        }

    def _compute_positioned_timestamp(self, position: Position, user_id) -> str:
        """
        Compute a positioned timestamp by querying existing order created_at values directly.
        
        Returns timestamp in SQLite CURRENT_TIMESTAMP format ('YYYY-MM-DD HH:MM:SS')
        to match existing data and ensure correct string-based sorting.
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            "SELECT created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,)
        )
        rows = [r[0] for r in cursor.fetchall() if r[0] and '{{' not in r[0]]
        conn.close()

        if len(rows) < 2:
            raise ValueError(
                f"Cannot position order for user {user_id}: need 2+ existing orders, found {len(rows)}"
            )
        return self._compute_from_timestamps(rows, position)

    def _compute_from_timestamps(self, ts_list_desc: list, position: Position) -> str:
        """Compute a positioned timestamp from a DESC-sorted list of timestamp strings."""

        def parse_ts(ts: str) -> datetime:
            ts = ts.replace('Z', '+00:00')
            if ' ' in ts and 'T' not in ts:
                ts = ts.replace(' ', 'T')
            return datetime.fromisoformat(ts)

        def format_like(dt: datetime, reference: str) -> str:
            """Format dt to match the format of the reference string."""
            uses_sqlite_fmt = ' ' in reference and 'T' not in reference
            if uses_sqlite_fmt:
                base = dt.strftime('%Y-%m-%d %H:%M:%S')
                if dt.microsecond > 0:
                    frac = f".{dt.microsecond:06d}".rstrip('0')
                    return base + frac
                return base
            else:
                iso = dt.isoformat()
                if dt.tzinfo:
                    return iso.replace('+00:00', 'Z')
                return iso + 'Z'

        target_idx = len(ts_list_desc) // 2

        if position == Position.middle:
            newer_val = ts_list_desc[target_idx - 1]
            older_val = ts_list_desc[target_idx]
            newer_dt = parse_ts(newer_val)
            older_dt = parse_ts(older_val)
            result_dt = older_dt + (newer_dt - older_dt) / 2
            result = format_like(result_dt, newer_val)
        elif position == Position.beginning:
            newest_val = ts_list_desc[0]
            newest_dt = parse_ts(newest_val)
            result_dt = newest_dt + timedelta(hours=1)
            result = format_like(result_dt, newest_val)
        elif position == Position.end:
            oldest_val = ts_list_desc[-1]
            oldest_dt = parse_ts(oldest_val)
            result_dt = oldest_dt - timedelta(hours=1)
            result = format_like(result_dt, oldest_val)
        else:
            raise ValueError(f"Unknown position: {position}")

        return result
