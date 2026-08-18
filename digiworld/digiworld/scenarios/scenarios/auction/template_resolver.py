# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Template resolver for auction app scenarios."""

import random
import time
from typing import Any, Dict, Optional

from digiworld.scenarios.template_resolver import TemplateResolver


class AuctionTemplateResolver(TemplateResolver):
    """Auction-specific template resolver."""

    def __init__(
        self,
        user_context: Dict[str, Any],
        positioning_data: Optional[Dict[str, Any]] = None,
        db_path: Optional[str] = None,
    ):
        super().__init__(user_context)
        self.positioning_data = positioning_data or {}
        self.db_path = db_path

    def resolve(self, template_str: str) -> str:
        auction_resolved = self._resolve_auction_specific_template(template_str)
        if auction_resolved != template_str:
            return auction_resolved
        return super().resolve(template_str)

    def _resolve_auction_specific_template(self, template_str: str) -> str:
        if template_str == "{{current_user_password}}":
            password = self.user_context.get("current_user_password")
            if password:
                return str(password)
            raise ValueError(
                "User password not found in context. "
                "Ensure 'current_user_password' is in context_fields."
            )
        if template_str == "{{future_end_time}}":
            days_ahead = random.randint(3, 14)
            return str(int(time.time()) + days_ahead * 86400)
        return template_str
