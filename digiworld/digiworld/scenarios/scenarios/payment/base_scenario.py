# Copyright (c) Meta Platforms, Inc. and affiliates.
import os
import sqlite3
import logging
from typing import Dict, Any, Optional

from digiworld.scenarios.scenario_base import Scenario
from digiworld.scenarios.scenarios.payment.template_resolver import PaymentTemplateResolver

logger = logging.getLogger(__name__)


class PaymentScenario(Scenario):
    """Base class for payment scenarios."""
    
    def _get_positioning_data(self, db_path):
        """
        Get payment-specific data for template resolution.
        Note: Positioning timestamps now use PositioningService, this returns payment context data.
        """
        # If current_user_id not set yet (called during mockdata resolution), return empty data
        if not hasattr(self, 'current_user_id') or self.current_user_id is None:
            logger.debug("Note: current_user_id not available yet, returning empty positioning data")
            return {
                'wallet_balance': 0.0,
                'wallet_currency': 'USD',
                'wallet_id': None,
                'recent_transactions': [],
                'transaction_count': 0,
                'avg_transaction_amount': 0,
                'max_transaction_amount': 0,
                'min_transaction_amount': 0,
                'contact_count': 0
            }
        
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # Get current user's wallet information for payment templates
            cursor.execute("""
                SELECT id, balance, currency FROM wallets
                WHERE user_id = ? AND status = 'active'
            """, (self.current_user_id,))
            wallet_info = cursor.fetchone()

            # Get existing transaction amounts and patterns for context
            if wallet_info:
                wallet_id = wallet_info[0]
                cursor.execute("""
                    SELECT amount, created_at, type FROM transactions
                    WHERE sender_wallet_id = ? OR receiver_wallet_id = ?
                    ORDER BY created_at DESC LIMIT 20
                """, (wallet_id, wallet_id))
                recent_transactions = cursor.fetchall()
            else:
                recent_transactions = []

            # Get contact count for user
            cursor.execute("SELECT COUNT(*) FROM contacts WHERE user_id = ?", (self.current_user_id,))
            contact_count = cursor.fetchone()[0]

            # Get transaction amount statistics
            if recent_transactions:
                amounts = [float(t[0]) for t in recent_transactions]
                avg_amount = sum(amounts) / len(amounts)
                max_amount = max(amounts)
                min_amount = min(amounts)
            else:
                avg_amount = max_amount = min_amount = 0

            conn.close()

            logger.info(f"Found wallet with balance ${wallet_info[1] if wallet_info else 0}, {len(recent_transactions)} recent transactions")

            return {
                'wallet_balance': float(wallet_info[1]) if wallet_info else 0.0,
                'wallet_currency': wallet_info[2] if wallet_info else 'USD',
                'wallet_id': wallet_info[0] if wallet_info else None,
                'recent_transactions': recent_transactions,
                'transaction_count': len(recent_transactions),
                'avg_transaction_amount': avg_amount,
                'max_transaction_amount': max_amount,
                'min_transaction_amount': min_amount,
                'contact_count': contact_count
            }
        except Exception as e:
            raise RuntimeError(f"Failed to get payment positioning data: {e}") from e
    
    def _create_template_resolver(self, user_context, positioning_data):
        """
        Create PaymentTemplateResolver with positioning support.
        """
        return PaymentTemplateResolver(
            user_context=user_context,
            positioning_data=positioning_data,
            db_path=getattr(self, '_current_db_path', None)
        )
        
    def _verify_contact(self, contact_email) -> bool: 
        """
        Verify if the contact exists for the current user.
        
        Args:
            contact_email: The email of the contact to verify.
            
        Returns:
            bool: True if the contact exists, False otherwise.
        """
        query = """
            SELECT * FROM contacts
            WHERE user_id = ? AND contact_user_id IN (
                SELECT id FROM users WHERE email = ?
            )
        """
        params = (self.current_user_id, contact_email)
        results = self._execute_query(query, params)
        if not results:
            return False
        return True

    # Override context field support for payment scenarios
    def _get_supported_context_fields(self):
        """
        Payment scenarios support PIN extraction in addition to basic fields.
        """
        # Explicitly call Scenario._get_supported_context_fields to avoid MRO issues with multiple inheritance
        base_fields = Scenario._get_supported_context_fields(self)
        payment_fields = {
            'current_user_pin': 'The current user\'s transaction PIN for authentication'
        }
        return {**base_fields, **payment_fields}

    def _extract_context_field(self, field_name, db_path, user_context):
        """
        Extract payment-specific context fields, particularly PIN.
        """

        if field_name == 'current_user_pin':
            # Extract PIN for payment scenarios
            user_id = user_context.get('current_user_id')
            if not user_id:
                raise ValueError("Cannot extract PIN without current_user_id in context")

            pin = self._extract_user_pin(db_path, user_id)
            return pin

        # Fall back to base class for other fields - explicitly call Scenario to avoid MRO issues
        from digiworld.scenarios.scenario_base import Scenario
        return Scenario._extract_context_field(self, field_name, db_path, user_context)

    def _extract_user_pin(self, db_path, user_id):
        """Extract user PIN from database (payment-specific implementation)"""
        try:
            if not os.path.exists(db_path):
                raise FileNotFoundError(f"Database not found: {db_path}")

            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # Query user PIN from users table
            cursor.execute("SELECT pin FROM users WHERE id = ?", (user_id,))
            result = cursor.fetchone()

            conn.close()

            if result:
                pin = result[0]
                logger.info(f"Extracted user PIN for payment scenario: {pin}")
                return str(pin)
            else:
                raise ValueError(f"No user found with ID {user_id} in database")

        except Exception as e:
            logger.error(f"Error extracting user PIN in payment scenario: {e}")
            raise