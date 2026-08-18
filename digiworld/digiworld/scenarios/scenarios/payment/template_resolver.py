# Copyright (c) Meta Platforms, Inc. and affiliates.
import random
import logging
from typing import Dict, Any, Optional, Set

from digiworld.scenarios.template_resolver import TemplateResolver
from digiworld.scenarios.positioning_service import Position

logger = logging.getLogger(__name__)


class PaymentTemplateResolver(TemplateResolver):
    """Payment-specific template resolver using PositioningService for smart positioning"""

    # Context dependencies for payment templates
    # Positioning templates filter by user_id which uses current_user_email
    CONTEXT_DEPENDENCIES: Dict[str, Set[str]] = {
        **TemplateResolver.CONTEXT_DEPENDENCIES,
        'middle_transaction_time': {'current_user_email'},
        'recent_transaction_time': {'current_user_email'},
        'old_transaction_time': {'current_user_email'},
    }

    # Database configuration for payments.
    # The transactions table has no user_id column (only sender_wallet_id /
    # receiver_wallet_id), so user-level filtering is omitted.  All profile
    # transactions are used for positioning, which is correct for the
    # single-user sandbox environment.
    DB_CONFIG = {
        'table_name': 'transactions',
        'timestamp_column': 'created_at',
        'filter_column': None,
        'filter_pattern': None,
    }

    # Template positioning mappings
    POSITIONING_TEMPLATES = {
        'middle_transaction_time': 'middle',
        'recent_transaction_time': 'beginning',
        'old_transaction_time': 'end'
    }

    def __init__(self, user_context: Dict[str, Any], positioning_data: Optional[Dict[str, Any]] = None, db_path: Optional[str] = None):
        """
        Initialize payment template resolver.

        Args:
            user_context: User context information
            positioning_data: Pre-computed payment data (wallet, transactions, etc.)
            db_path: Database path for positioning queries
        """
        super().__init__(user_context)
        self.positioning_data = positioning_data or {}
        self.db_path = db_path
        self._positioning_service = None

    def _get_positioning_service(self):
        """Lazy initialization of positioning service"""
        if self._positioning_service is None:
            from digiworld.scenarios.positioning_service import PositioningService

            self._positioning_service = PositioningService(self.DB_CONFIG, debug=False)
        return self._positioning_service
    
    def resolve(self, template_str: str) -> str:
        """Resolve payment-specific templates"""

        # Try payment-specific templates first
        payment_resolved = self._resolve_payment_specific_template(template_str)
        if payment_resolved != template_str:
            return payment_resolved

        # Fall back to base resolver
        return super().resolve(template_str)
    
    def _resolve_payment_specific_template(self, template_str: str) -> str:
        """Resolve payment-specific template patterns"""

        # Positioning templates using PositioningService
        positioning_service = self._get_positioning_service()
        if positioning_service and self.db_path:
            user_email = self.user_context.get('current_user_email', '')

            if template_str == "{{middle_transaction_time}}":
                return positioning_service.get_positioned_timestamp(Position.middle, self.db_path, user_email)
            elif template_str == "{{recent_transaction_time}}":
                return positioning_service.get_positioned_timestamp(Position.beginning, self.db_path, user_email)
            elif template_str == "{{old_transaction_time}}":
                return positioning_service.get_positioned_timestamp(Position.end, self.db_path, user_email)

        # Amount templates
        if template_str == "{{small_amount}}":
            return self._generate_small_amount()
        elif template_str == "{{medium_amount}}":
            return self._generate_medium_amount()
        elif template_str == "{{large_amount}}":
            return self._generate_large_amount()
        elif template_str == "{{contextual_amount}}":
            return self._generate_contextual_amount()
        
        # Balance and wallet templates
        if template_str == "{{current_balance}}":
            return str(self.positioning_data.get('wallet_balance', 1000.0))
        
        if template_str == "{{safe_amount}}":
            balance = self.positioning_data.get('wallet_balance', 1000.0)
            # Return an amount that's 10-50% of current balance, minimum $5
            safe_amount = max(5.0, balance * random.uniform(0.1, 0.5))
            return f"{safe_amount:.2f}"
        
        # Contact templates based on context
        if template_str.startswith("{{context_contact_email:"):
            context = template_str.split(':')[1].rstrip('}}')
            return self._get_context_contact_email(context)
        
        if template_str.startswith("{{context_contact_name:"):
            context = template_str.split(':')[1].rstrip('}}')
            return self._get_context_contact_name(context)
        
        if template_str.startswith("{{context_contact_first_name:"):
            context = template_str.split(':')[1].rstrip('}}')
            return self._get_context_contact_name(context).split()[0]
        
        if template_str.startswith("{{context_contact_last_name:"):
            context = template_str.split(':')[1].rstrip('}}')
            name_parts = self._get_context_contact_name(context).split()
            return name_parts[-1] if len(name_parts) > 1 else 'Smith'
        
        # Payment description templates
        if template_str.startswith("{{payment_description:"):
            context = template_str.split(':')[1].rstrip('}}')
            return self._get_payment_description(context)
        
        # Return unchanged if not recognized - the main resolve method will handle exceptions
        return template_str
    
    def _generate_small_amount(self) -> str:
        """Generate a small payment amount ($5-50)"""
        return f"{random.uniform(5.0, 50.0):.2f}"
    
    def _generate_medium_amount(self) -> str:
        """Generate a medium payment amount ($50-500)"""
        return f"{random.uniform(50.0, 500.0):.2f}"
    
    def _generate_large_amount(self) -> str:
        """Generate a large payment amount ($500-2000)"""
        return f"{random.uniform(500.0, 2000.0):.2f}"
    
    def _generate_contextual_amount(self) -> str:
        """Generate amount based on transaction history context"""
        avg_amount = self.positioning_data.get('avg_transaction_amount', 100.0)
        if avg_amount > 0:
            # Generate amount within 50% to 150% of average
            contextual_amount = avg_amount * random.uniform(0.5, 1.5)
        else:
            # Fallback to medium amount if no history
            contextual_amount = random.uniform(50.0, 500.0)
        
        return f"{contextual_amount:.2f}"
    
    def _get_context_contact_email(self, context: str) -> str:
        """Get contact email based on context"""
        if context == 'family':
            family_contacts = ['mom@example.com', 'dad@example.com', 'sister@example.com', 'brother@example.com']
            return random.choice(family_contacts)
        elif context == 'work':
            work_contacts = ['colleague@company.com', 'manager@company.com', 'contractor@freelance.com']
            return random.choice(work_contacts)
        else:  # friends or default
            friend_contacts = ['friend@example.com', 'buddy@example.com', 'pal@example.com', 'mate@example.com']
            return random.choice(friend_contacts)
    
    def _get_context_contact_name(self, context: str) -> str:
        """Get contact display name based on context"""
        if context == 'family':
            family_names = ['Mom Johnson', 'Dad Johnson', 'Sarah Johnson', 'Mike Johnson']
            return random.choice(family_names)
        elif context == 'work':
            work_names = ['Alex Smith', 'Manager Brown', 'Sarah Wilson', 'John Contractor']
            return random.choice(work_names)
        else:  # friends or default
            friend_names = ['Best Friend', 'College Buddy', 'Old Pal', 'Good Friend']
            return random.choice(friend_names)
    
    def _get_payment_description(self, context: str) -> str:
        """Get payment description based on context"""
        if context == 'family':
            descriptions = ['Monthly allowance', 'Birthday gift', 'Emergency help', 'Shared expenses']
            return random.choice(descriptions)
        elif context == 'work':
            descriptions = ['Freelance payment', 'Expense reimbursement', 'Project bonus', 'Lunch money']
            return random.choice(descriptions)
        else:  # friends or casual
            descriptions = ['Dinner split', 'Movie tickets', 'Gas money', 'Coffee payment', 'Shared Uber']
            return random.choice(descriptions)

