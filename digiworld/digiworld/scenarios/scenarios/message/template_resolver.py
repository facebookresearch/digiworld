# Copyright (c) Meta Platforms, Inc. and affiliates.
import random
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Set, Union

from digiworld.scenarios.template_resolver import TemplateResolver
from digiworld.scenarios.positioning_service import Position

logger = logging.getLogger(__name__)


class MessageTemplateResolver(TemplateResolver):
    """Message-specific template resolver using PositioningService for smart positioning"""

    # Context dependencies for message templates
    # Positioning templates filter by sender_id which uses current_user_id
    CONTEXT_DEPENDENCIES: Dict[str, Set[str]] = {
        **TemplateResolver.CONTEXT_DEPENDENCIES,
        'middle_message_time': {'current_user_id'},
        'recent_message_time': {'current_user_id'},
        'old_message_time': {'current_user_id'},
    }

    # Database configuration for messages (using snake_case column names)
    DB_CONFIG = {
        'table_name': 'messages',
        'timestamp_column': 'timestamp',
        'filter_column': 'sender_id',
        'filter_pattern': '{user_email}'
    }

    # Template positioning mappings
    POSITIONING_TEMPLATES = {
        'middle_message_time': 'middle',
        'recent_message_time': 'beginning',
        'old_message_time': 'end'
    }

    def __init__(self, user_context: Dict[str, Any], positioning_data: Optional[Dict[str, Any]] = None, db_path: Optional[str] = None):
        """
        Initialize message template resolver.

        Args:
            user_context: User context information
            positioning_data: Pre-computed message data (contacts, messages, etc.)
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
    
    def resolve(self, template_str: str) -> Union[str, int]:
        """Resolve message-specific templates.

        May return ``int`` for timestamp templates (the message app uses
        INTEGER columns for timestamps).
        """

        # Try message-specific templates first
        message_resolved = self._resolve_message_specific_template(template_str)
        if message_resolved != template_str:
            return message_resolved

        # Fall back to base resolver
        return super().resolve(template_str)
    
    @staticmethod
    def _iso_to_unix(iso_str: str) -> int:
        """Convert an ISO-8601 timestamp string to a Unix epoch integer (seconds).

        The message app stores all timestamps as INTEGER columns, so the
        positioning service's ISO output must be converted before insertion.
        """
        try:
            normalised = iso_str.replace("Z", "+00:00")
            dt = datetime.fromisoformat(normalised)
            return int(dt.timestamp())
        except (ValueError, TypeError):
            # Fallback: return the string unchanged (should not happen)
            return iso_str  # type: ignore[return-value]

    def _resolve_message_specific_template(self, template_str: str) -> Union[str, int]:
        """Resolve message-specific template patterns.

        Timestamp templates return an ``int`` (Unix epoch seconds) because the
        message app's DB schema uses INTEGER columns for all timestamp fields.
        """

        # Positioning templates using PositioningService
        positioning_service = self._get_positioning_service()
        if positioning_service and self.db_path:
            user_id = self.user_context.get('current_user_id', '')

            if template_str == "{{middle_message_time}}":
                return self._iso_to_unix(
                    positioning_service.get_positioned_timestamp(Position.middle, self.db_path, user_id)
                )
            elif template_str == "{{recent_message_time}}":
                return self._iso_to_unix(
                    positioning_service.get_positioned_timestamp(Position.beginning, self.db_path, user_id)
                )
            elif template_str == "{{old_message_time}}":
                return self._iso_to_unix(
                    positioning_service.get_positioned_timestamp(Position.end, self.db_path, user_id)
                )

        # Message content templates
        if template_str == "{{casual_message}}":
            return self._generate_casual_message()
        elif template_str == "{{work_message}}":
            return self._generate_work_message()
        elif template_str == "{{question_message}}":
            return self._generate_question_message()
        
        # Contact name templates
        if template_str.startswith("{{context_contact_name:"):
            context = template_str.split(':')[1].rstrip('}}')
            return self._get_context_contact_name(context)

        # User context templates (phone, otp, name)
        if template_str == "{{current_user_phone}}":
            return self.user_context.get('current_user_phone',
                                         self.user_context.get('current_user_email', ''))
        if template_str == "{{current_user_otp}}":
            return self.user_context.get('current_user_otp', '')
        if template_str == "{{current_user_name}}":
            name = self.user_context.get('current_user_name')
            if name:
                return name
            # Fall through to base resolver

        # Return unchanged if not recognized
        return template_str
    
    def _generate_casual_message(self) -> str:
        """Generate a casual message"""
        messages = [
            "Hey! How are you?",
            "What's up?",
            "Long time no see!",
            "Are you free later?",
            "Thanks for your help!",
            "See you soon!",
            "Have a great day!",
            "Let's catch up sometime",
            "Hope you're doing well",
            "Miss you!"
        ]
        return random.choice(messages)
    
    def _generate_work_message(self) -> str:
        """Generate a work-related message"""
        messages = [
            "Can we discuss the project?",
            "Meeting at 3 PM today",
            "Please review the document",
            "Thanks for the update",
            "Let's schedule a call",
            "I've sent you the files",
            "Could you help with this?",
            "Great work on the presentation",
            "Deadline is tomorrow",
            "Please confirm receipt"
        ]
        return random.choice(messages)
    
    def _generate_question_message(self) -> str:
        """Generate a question message"""
        messages = [
            "Did you get my last message?",
            "What time works for you?",
            "Can you send me the details?",
            "Are you available tomorrow?",
            "Where should we meet?",
            "Have you finished the task?",
            "Do you need any help?",
            "What do you think?",
            "When can we talk?",
            "Is everything okay?"
        ]
        return random.choice(messages)
    
    def _get_context_contact_name(self, context: str) -> str:
        """Get contact name based on context"""
        if context == 'family':
            family_names = ['Mom', 'Dad', 'Sister', 'Brother', 'Grandma', 'Aunt']
            return random.choice(family_names)
        elif context == 'work':
            work_names = ['Alex Chen', 'Sarah Johnson', 'Michael Brown', 'Emily Davis', 'John Wilson']
            return random.choice(work_names)
        else:  # friends or default
            friend_names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Emma', 'Frank']
            return random.choice(friend_names)

