# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Base scenario class for banking app scenarios."""

import os
import sqlite3
import logging

from digiworld.scenarios.scenario_base import Scenario
from digiworld.scenarios.scenarios.banking.template_resolver import BankingTemplateResolver

logger = logging.getLogger(__name__)


class BankingScenario(Scenario):
    """Base class for banking scenarios."""
    
    def _get_positioning_data(self, db_path):
        """
        Get banking-specific data for template resolution.
        """
        if not hasattr(self, 'current_user_id') or self.current_user_id is None:
            logger.debug("current_user_id not available yet, returning empty positioning data")
            return {'account_count': 0, 'transaction_count': 0, 'beneficiary_count': 0}

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM accounts WHERE user_id = ?", (self.current_user_id,))
        account_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM transactions WHERE user_id = ?", (self.current_user_id,))
        transaction_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM beneficiaries WHERE user_id = ?", (self.current_user_id,))
        beneficiary_count = cursor.fetchone()[0]

        conn.close()

        logger.info(f"Found {account_count} accounts, {transaction_count} transactions, {beneficiary_count} beneficiaries")
        return {
            'account_count': account_count,
            'transaction_count': transaction_count,
            'beneficiary_count': beneficiary_count
        }
    
    def _create_template_resolver(self, user_context, positioning_data):
        """
        Create BankingTemplateResolver with positioning support.
        """
        return BankingTemplateResolver(
            user_context=user_context,
            positioning_data=positioning_data,
            db_path=getattr(self, '_current_db_path', None)
        )

    def _get_supported_context_fields(self):
        """
        Banking scenarios support basic user context fields.
        """
        base_fields = Scenario._get_supported_context_fields(self)
        return base_fields
