# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Template resolver for banking app scenarios."""

import logging
from typing import Dict, Any, Optional, Set

from digiworld.scenarios.template_resolver import TemplateResolver
from digiworld.scenarios.positioning_service import Position

logger = logging.getLogger(__name__)


class BankingTemplateResolver(TemplateResolver):
    """Banking-specific template resolver using PositioningService for smart positioning."""

    # Banking-specific context dependencies for positioning templates.
    # Positioning uses current_user_id to filter transactions by user.
    CONTEXT_DEPENDENCIES: Dict[str, Set[str]] = {
        **TemplateResolver.CONTEXT_DEPENDENCIES,
        'middle_timestamp': {'current_user_id'},
        'beginning_timestamp': {'current_user_id'},
        'end_timestamp': {'current_user_id'},
    }

    # Database configuration for transactions positioning
    DB_CONFIG = {
        'table_name': 'transactions',
        'timestamp_column': 'transaction_date',
        'filter_column': 'user_id',
        'filter_pattern': '{user_email}',  # Will be replaced with user_id at resolve time
        'additional_filters': {'status': 'success'},
    }

    def __init__(self, user_context: Dict[str, Any], positioning_data: Optional[Dict[str, Any]] = None, db_path: Optional[str] = None):
        """
        Initialize banking template resolver.

        Args:
            user_context: User context information
            positioning_data: Pre-computed banking data (accounts, transactions, etc.)
            db_path: Database path for queries
        """
        super().__init__(user_context)
        self.positioning_data = positioning_data or {}
        self.db_path = db_path
        self._positioning_service = None
    
    def _get_positioning_service(self):
        """Lazy initialization of positioning service configured for banking transactions."""
        if self._positioning_service is None:
            from digiworld.scenarios.positioning_service import PositioningService, PositioningConfig

            # Banking filters by user_id (integer) not email, so we use
            # a custom config with exact match instead of LIKE pattern.
            user_id = self.user_context.get('current_user_id', '')
            config = PositioningConfig(
                table_name='transactions',
                timestamp_column='transaction_date',
                filter_column='user_id',
                filter_pattern=str(user_id),
                additional_filters={'status': 'success'},
            )
            self._positioning_service = PositioningService(config)
        return self._positioning_service

    def resolve(self, template_str: str) -> str:
        """Resolve banking-specific templates"""

        # Normalize single-brace tokens for compatibility
        if isinstance(template_str, str) and template_str.startswith('{') and template_str.endswith('}') and not template_str.startswith('{{'):
            template_str = '{{' + template_str[1:-1] + '}}'

        # Try banking-specific templates first
        banking_resolved = self._resolve_banking_specific_template(template_str)
        if banking_resolved != template_str:
            return banking_resolved

        # Fall back to base resolver
        return super().resolve(template_str)
    
    def _resolve_banking_specific_template(self, template_str: str) -> str:
        """Resolve banking-specific template patterns"""

        # Positioning templates using PositioningService
        positioning_service = self._get_positioning_service()
        if positioning_service and self.db_path:
            # For banking, we pass user_id as the "user_email" parameter
            # since the positioning service uses it for filter_pattern formatting
            user_id = str(self.user_context.get('current_user_id', ''))

            if template_str == "{{middle_timestamp}}":
                return positioning_service.get_positioned_timestamp(Position.middle, self.db_path, user_id)
            elif template_str == "{{beginning_timestamp}}":
                return positioning_service.get_positioned_timestamp(Position.beginning, self.db_path, user_id)
            elif template_str == "{{end_timestamp}}":
                return positioning_service.get_positioned_timestamp(Position.end, self.db_path, user_id)

        # Return unchanged if not recognized - the main resolve method will handle exceptions
        return template_str
