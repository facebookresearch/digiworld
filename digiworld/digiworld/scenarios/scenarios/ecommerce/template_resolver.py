# Copyright (c) Meta Platforms, Inc. and affiliates.
import sqlite3
from typing import Dict, Set

from digiworld.scenarios.template_resolver import TemplateResolver


class EcommerceTemplateResolver(TemplateResolver):
    """Template resolver for ecommerce scenarios."""

    CONTEXT_DEPENDENCIES: Dict[str, Set[str]] = {
        **TemplateResolver.CONTEXT_DEPENDENCIES,
        "current_user_cart_id": {"current_user_id"},
    }

    def __init__(self, user_context, positioning_data, db_path=None):
        super().__init__(user_context, positioning_data)
        self.db_path = db_path

    def resolve(self, template):
        """Resolve ecommerce-specific templates."""
        if not isinstance(template, str):
            return template

        normalized = self._normalize_template_braces(template)

        if normalized == "{{current_user_cart_id}}":
            return self._resolve_cart_id()

        return super().resolve(template)

    def _resolve_cart_id(self) -> str:
        user_id = self.user_context.get("current_user_id")
        if not user_id or not self.db_path:
            raise ValueError(
                "Cannot resolve current_user_cart_id: "
                "current_user_id or db_path unavailable"
            )
        conn = sqlite3.connect(self.db_path)
        row = conn.execute(
            "SELECT id FROM carts WHERE user_id = ?", (user_id,)
        ).fetchone()
        conn.close()
        if not row:
            raise ValueError(f"No cart found for user_id={user_id}")
        return str(row[0])
