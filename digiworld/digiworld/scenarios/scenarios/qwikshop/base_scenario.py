# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Base scenario class for qwikshop app scenarios."""

import os
import sqlite3
import logging

from digiworld.scenarios.scenario_base import Scenario
from digiworld.scenarios.scenarios.qwikshop.template_resolver import QwikshopTemplateResolver

logger = logging.getLogger(__name__)


class QwikshopScenario(Scenario):
    """Base class for qwikshop scenarios."""
    
    def _get_positioning_data(self, db_path):
        """
        Get qwikshop-specific data for template resolution.
        """
        if not hasattr(self, 'current_user_id') or self.current_user_id is None:
            logger.debug("current_user_id not available yet, returning empty positioning data")
            return {'product_count': 0, 'order_count': 0, 'cart_item_count': 0}

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM products")
        product_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM orders WHERE user_id = ?", (self.current_user_id,))
        order_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM cart_items WHERE user_id = ?", (self.current_user_id,))
        cart_item_count = cursor.fetchone()[0]

        conn.close()

        logger.info(f"Found {product_count} products, {order_count} orders, {cart_item_count} cart items")
        return {
            'product_count': product_count,
            'order_count': order_count,
            'cart_item_count': cart_item_count
        }
    
    def _create_template_resolver(self, user_context, positioning_data):
        """
        Create QwikshopTemplateResolver with positioning support.
        """
        return QwikshopTemplateResolver(
            user_context=user_context,
            positioning_data=positioning_data,
            db_path=getattr(self, '_current_db_path', None)
        )

    def _get_supported_context_fields(self):
        """
        Qwikshop scenarios support basic user context fields.
        """
        base_fields = Scenario._get_supported_context_fields(self)
        return base_fields
