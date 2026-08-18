# Copyright (c) Meta Platforms, Inc. and affiliates.
import os
import sqlite3
import logging
from typing import Dict, Any, Optional

from digiworld.scenarios.scenario_base import Scenario
from digiworld.scenarios.scenarios.message.template_resolver import MessageTemplateResolver

logger = logging.getLogger(__name__)


class MessageScenario(Scenario):
    """Base class for message scenarios."""

    def _get_supported_context_fields(self) -> Dict[str, str]:
        base_fields = super()._get_supported_context_fields()
        base_fields.update({
            'current_user_phone': "The phone number registered to the current user's Andojo Message account",
            'current_user_name': "The display name of the current user in the messaging app",
            'current_user_otp': "The OTP verification code for the current user (last 4 digits of phone number)",
        })
        return base_fields

    def _extract_context_field(self, field_name: str, db_path: str, user_context: Dict) -> Optional[Any]:
        if field_name == 'current_user_phone':
            phone = user_context.get('current_user_email', '')
            if not phone:
                raise ValueError("Cannot extract current_user_phone: current_user_email not available")
            return phone

        if field_name == 'current_user_name':
            user_id = user_context.get('current_user_id')
            if not user_id:
                raise ValueError("Cannot extract current_user_name: current_user_id not available")
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            conn.close()
            if not row or not row[0]:
                raise ValueError(f"No name found for user_id={user_id} in {db_path}")
            return row[0]

        if field_name == 'current_user_otp':
            phone = user_context.get('current_user_email', '')
            if not phone:
                raise ValueError("Cannot extract current_user_otp: current_user_email not available")
            digits = ''.join(c for c in phone if c.isdigit())
            if len(digits) < 4:
                raise ValueError(f"Phone number too short to derive OTP: {phone}")
            return digits[-4:]

        return super()._extract_context_field(field_name, db_path, user_context)

    def _resolve_scenario_context(self) -> None:
        """Resolve scenario context using the message-specific template resolver."""
        if not hasattr(self, 'raw_scenario_context') or not self.raw_scenario_context:
            self.resolved_scenario_context = {}
            logger.debug("No scenario context to resolve")
            return

        db_path = os.path.join(self.initial_state_path, f"{self.initial_state_id}.db")
        logger.info(f"Resolving scenario context using database: {db_path}")

        user_context = self._context_extractor.extract_user_context(db_path)
        positioning_data = self._get_positioning_data(db_path)
        self._current_db_path = db_path
        context_resolver = self._create_template_resolver(user_context, positioning_data)
        self.resolved_scenario_context = context_resolver.resolve_object(self.raw_scenario_context)

        logger.info(f"Successfully resolved scenario context: {self.resolved_scenario_context}")

    def _get_positioning_data(self, db_path):
        """
        Get message-specific data for template resolution.
        Note: Positioning timestamps now use PositioningService, this returns message context data.
        """
        if not hasattr(self, 'current_user_id') or self.current_user_id is None:
            logger.debug("Note: current_user_id not available yet, returning empty positioning data")
            return {
                'contact_count': 0,
                'message_count': 0,
                'group_count': 0,
                'recent_messages': []
            }
        
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # Get current user's phone number
            cursor.execute("""
                SELECT phone_number FROM users
                WHERE id = ?
            """, (self.current_user_id,))
            user_info = cursor.fetchone()
            user_phone = user_info[0] if user_info else None

            # Get contact count for user (users they have messaged with)
            cursor.execute("""
                SELECT COUNT(DISTINCT 
                    CASE 
                        WHEN sender_id = ? THEN receiver_id 
                        ELSE sender_id 
                    END
                ) 
                FROM messages 
                WHERE sender_id = ? OR receiver_id = ?
            """, (self.current_user_id, self.current_user_id, self.current_user_id))
            contact_count = cursor.fetchone()[0]

            # Get total message count
            cursor.execute("""
                SELECT COUNT(*) FROM messages
                WHERE sender_id = ? OR receiver_id = ?
            """, (self.current_user_id, self.current_user_id))
            message_count = cursor.fetchone()[0]

            # Get recent messages for context
            cursor.execute("""
                SELECT id, sender_id, receiver_id, content, timestamp
                FROM messages
                WHERE sender_id = ? OR receiver_id = ?
                ORDER BY timestamp DESC LIMIT 20
            """, (self.current_user_id, self.current_user_id))
            recent_messages = cursor.fetchall()

            # Get group count
            cursor.execute("""
                SELECT COUNT(*) FROM group_members
                WHERE user_id = ?
            """, (self.current_user_id,))
            group_count = cursor.fetchone()[0]

            conn.close()

            logger.info(f"Found {contact_count} contacts, {message_count} messages, {group_count} groups")

            return {
                'contact_count': contact_count,
                'message_count': message_count,
                'group_count': group_count,
                'recent_messages': recent_messages,
                'user_phone': user_phone
            }
        except Exception as e:
            raise RuntimeError(f"Failed to get message positioning data: {e}") from e
    
    def _create_template_resolver(self, user_context, positioning_data):
        """
        Create MessageTemplateResolver with positioning support.
        """
        return MessageTemplateResolver(
            user_context=user_context,
            positioning_data=positioning_data,
            db_path=getattr(self, '_current_db_path', None)
        )

