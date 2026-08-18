# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict, Set
from digiworld.scenarios.template_resolver import TemplateResolver
from digiworld.scenarios.positioning_service import Position

logger = logging.getLogger(__name__)


class EmailTemplateResolver(TemplateResolver):
    """Email-specific template resolver using PositioningService for smart positioning"""
    
    # Email-specific templates that need context pre-extraction.
    # Positioning templates use current_user_email to filter emails.
    CONTEXT_DEPENDENCIES: Dict[str, Set[str]] = {
        **TemplateResolver.CONTEXT_DEPENDENCIES,
        'middle_timestamp': {'current_user_email'},
        'beginning_timestamp': {'current_user_email'},
        'end_timestamp': {'current_user_email'},
    }

    # Database configuration for emails
    DB_CONFIG = {
        'table_name': 'emails',
        'timestamp_column': 'timestamp',
        'filter_column': 'receiver',
        'filter_pattern': '%{user_email}%',
        'additional_filters': {'folder': 'inbox', 'status': 'received'}  # Only position relative to received inbox emails
    }

    # Template positioning mappings
    POSITIONING_TEMPLATES = {
        'middle_timestamp': 'middle',
        'beginning_timestamp': 'beginning',
        'end_timestamp': 'end'
    }

    def __init__(self, user_context, positioning_data=None, db_path=None):
        """
        Initialize email template resolver.

        Args:
            user_context: User context information
            positioning_data: Not used anymore (kept for compatibility)
            db_path: Database path for positioning queries
        """
        super().__init__(user_context)
        self.db_path = db_path
        self._positioning_service = None

    def _get_positioning_service(self):
        """Lazy initialization of positioning service"""
        if self._positioning_service is None:
            from digiworld.scenarios.positioning_service import PositioningService

            self._positioning_service = PositioningService(self.DB_CONFIG)
        return self._positioning_service

    def resolve(self, template_str: str) -> str:
        """Resolve email-specific templates"""

        # Try email-specific templates first
        # Normalize single-brace tokens first for compatibility
        if isinstance(template_str, str) and template_str.startswith('{') and template_str.endswith('}') and not template_str.startswith('{{'):
            template_str = '{{' + template_str[1:-1] + '}}'

        email_resolved = self._resolve_email_specific_template(template_str)
        if email_resolved != template_str:
            return email_resolved

        # Fall back to base resolver
        return super().resolve(template_str)

    def _resolve_email_specific_template(self, template_str: str) -> str:
        """Resolve email-specific template patterns"""

        # Positioning templates using PositioningService
        positioning_service = self._get_positioning_service()
        if positioning_service and self.db_path:
            user_email = self.user_context.get('current_user_email', '')

            if template_str == "{{middle_timestamp}}":
                return positioning_service.get_positioned_timestamp(Position.middle, self.db_path, user_email)
            elif template_str == "{{beginning_timestamp}}":
                return positioning_service.get_positioned_timestamp(Position.beginning, self.db_path, user_email)
            elif template_str == "{{end_timestamp}}":
                return positioning_service.get_positioned_timestamp(Position.end, self.db_path, user_email)

        # Context-based sender templates
        if template_str.startswith("{{context_sender:"):
            context = template_str.split(':')[1].rstrip('}}')
            return self._get_context_sender(context)

        if template_str.startswith("{{context_sender_first_name:"):
            context = template_str.split(':')[1].rstrip('}}')
            return self._get_context_sender_name(context)[0]

        if template_str.startswith("{{context_sender_last_name:"):
            context = template_str.split(':')[1].rstrip('}}')
            return self._get_context_sender_name(context)[1]

        if template_str.startswith("{{context_sender_display_name:"):
            context = template_str.split(':')[1].rstrip('}}')
            first, last = self._get_context_sender_name(context)
            return f"{first} {last}"

        if template_str.startswith("{{context_sender_signature:"):
            context = template_str.split(':')[1].rstrip('}}')
            first, last = self._get_context_sender_name(context)
            role = "Manager" if context == "work" else "Friend"
            return f"Best regards,\n{first} {last}\n{role}"

        # Return unchanged if not recognized
        return template_str

    def _get_context_sender(self, context: str) -> str:
        """Get sender email based on context"""
        if context == 'work':
            return "manager@example.com"
        else:  # personal
            return "friend@example.com"

    def _get_context_sender_name(self, context: str) -> tuple:
        """Get sender first and last name based on context"""
        if context == 'work':
            return ("John", "Manager")
        else:  # personal
            return ("Alex", "Friend")

