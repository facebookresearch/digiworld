# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Base scenario class for auction app scenarios."""

import json
import os
import sqlite3
import logging

from digiworld.scenarios.scenario_base import Scenario
from digiworld.scenarios.scenarios.auction.template_resolver import AuctionTemplateResolver

logger = logging.getLogger(__name__)


class AuctionScenario(Scenario):
    """Base class for auction scenarios."""

    def _get_positioning_data(self, db_path):
        if not hasattr(self, 'current_user_id') or self.current_user_id is None:
            logger.debug("current_user_id not available yet, returning empty positioning data")
            return {'item_count': 0, 'bid_count': 0, 'user_bid_count': 0}

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM items")
        item_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM bids")
        bid_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM bids WHERE user_id = ?", (self.current_user_id,))
        user_bid_count = cursor.fetchone()[0]

        conn.close()

        logger.info(f"Found {item_count} items, {bid_count} bids, {user_bid_count} user bids")
        return {
            'item_count': item_count,
            'bid_count': bid_count,
            'user_bid_count': user_bid_count,
        }

    def _create_template_resolver(self, user_context, positioning_data):
        return AuctionTemplateResolver(
            user_context=user_context,
            positioning_data=positioning_data,
            db_path=getattr(self, '_current_db_path', None),
        )

    def _get_supported_context_fields(self):
        base_fields = Scenario._get_supported_context_fields(self)
        auction_fields = {
            'current_user_password': "The current user's account password",
        }
        return {**base_fields, **auction_fields}

    def _extract_context_field(self, field_name, db_path, user_context):
        if field_name == 'current_user_password':
            return self._extract_user_password(db_path)

        from digiworld.scenarios.scenario_base import Scenario
        return Scenario._extract_context_field(self, field_name, db_path, user_context)

    def _extract_user_password(self, db_path):
        rootstore_path = os.path.join(os.path.dirname(db_path), "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise FileNotFoundError(f"rootstore.json not found at {rootstore_path}")

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        password = (
            rootstore.get("userStore", {})
            .get("user", {})
            .get("password")
        )
        if not password:
            raise ValueError("Could not extract user password from rootstore")

        logger.info("Extracted user password for auction scenario")
        return str(password)
