# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Template resolution for mockdata and scenario context."""

import re
import random
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Set


class TemplateResolver:
    """Base template resolver for common template patterns."""
    
    # Templates that need specific context fields to be pre-extracted.
    # Maps template name -> set of required context fields.
    # Subclasses should override/extend this for app-specific templates.
    CONTEXT_DEPENDENCIES: Dict[str, Set[str]] = {
        'current_user_email': {'current_user_email'},
        'current_user_id': {'current_user_id'},
        'current_user_pin': {'current_user_id', 'current_user_pin'},  # PIN needs user_id to query
        'current_user_name': {'current_user_email'},  # Derives name from email
    }
    
    # Templates that need database queries for extraction (beyond rootstore.json)
    # Maps template name -> extraction method name
    REQUIRES_DB_EXTRACTION: Dict[str, str] = {
        'current_user_pin': '_extract_user_pin',
    }

    def __init__(self, user_context: Dict[str, Any], scenario_context: Optional[Dict[str, Any]] = None):
        """
        Initialize template resolver with user and scenario context.

        Args:
            user_context: Dictionary containing user information like:
                - current_user_email: Email of the logged-in user
                - current_user_id: ID of the logged-in user
                - profile_name: Name of the current test profile
            scenario_context: Optional scenario-specific context
        """
        self.user_context = user_context
        self.scenario_context = scenario_context or {}
        self._is_subclass = self.__class__ != TemplateResolver
    
    @classmethod
    def get_required_context(cls, detected_templates: Set[str]) -> Set[str]:
        """
        Get the context fields required to resolve a set of detected templates.
        
        This method checks CONTEXT_DEPENDENCIES to determine what context
        needs to be extracted before template resolution can proceed.
        
        Args:
            detected_templates: Set of template names found in mockdata
            
        Returns:
            Set of context field names that need to be extracted
        """
        required = set()
        for template in detected_templates:
            if template in cls.CONTEXT_DEPENDENCIES:
                required.update(cls.CONTEXT_DEPENDENCIES[template])
        return required
    
    @classmethod
    def get_db_extraction_requirements(cls, detected_templates: Set[str]) -> Dict[str, str]:
        """
        Get templates that need database extraction and their extraction method names.
        
        Args:
            detected_templates: Set of template names found in mockdata
            
        Returns:
            Dict mapping template name to extraction method name
        """
        requirements = {}
        for template in detected_templates:
            if template in cls.REQUIRES_DB_EXTRACTION:
                requirements[template] = cls.REQUIRES_DB_EXTRACTION[template]
        return requirements
    
    def resolve(self, template_str: str) -> str:
        """
        Resolve common templates that work across all scenarios.
        
        Args:
            template_str: String that may contain template placeholders
            
        Returns:
            Resolved string or original string if no template found
        """
        if not isinstance(template_str, str):
            return template_str
        
        # Normalize single-brace templates like {middle_timestamp} to {{middle_timestamp}}
        template_str = self._normalize_template_braces(template_str)
        
        if '{{' not in template_str:
            return template_str
        
        # Auto ID generation
        if template_str == "{{auto_id}}":
            return str(self._get_next_auto_id())
        
        # Current user context
        if template_str == "{{current_user_email}}":
            return self.user_context.get('current_user_email', '')
        
        if template_str == "{{current_user_id}}":
            return str(self.user_context.get('current_user_id', ''))
        
        # Timestamp generation
        if template_str == "{{recent_timestamp}}":
            return self._generate_recent_timestamp()

        if template_str == "{{past_timestamp}}":
            return self._generate_past_timestamp()

        if template_str == "{{middle_timestamp}}":
            return self._generate_middle_timestamp()

        if template_str == "{{earliest_timestamp}}":
            return self._generate_earliest_timestamp()

        if template_str == "{{latest_timestamp}}":
            return self._generate_latest_timestamp()
        
        # Random data generation
        if template_str == "{{random_phone}}":
            return self._generate_random_phone()
        
        if template_str == "{{random_birth_date}}":
            return self._generate_random_birth_date()
        
        # Avatars
        if template_str == "{{context_sender_avatar}}":
            return "https://i.pravatar.cc/150?u=sender"
        
        # Context-specific templates for personalization
        if template_str == "{{current_user_pin}}":
            return self._get_current_user_pin()
        
        if template_str == "{{current_user_name}}":
            return self._get_current_user_name()
        
        # If this is the base resolver (not a subclass) and we have an unrecognized template, throw exception
        if not self._is_subclass and '{{' in template_str and '}}' in template_str:
            raise ValueError(f"Unrecognized template placeholder: {template_str}")
        
        # Return unchanged if no template found - let subclass resolvers handle exceptions
        return template_str

    def _normalize_template_braces(self, value: str) -> str:
        """
        Convert single-brace template strings like {token} into double-brace {{token}} format.
        Only converts when the entire string is a single-brace token whose content
        looks like a template identifier (word characters only, no spaces/quotes/colons).
        """
        try:
            if '{{' in value and '}}' in value:
                return value
            # Only wrap when the whole string is a single-brace token with a
            # template-like name (letters, digits, underscores).
            if re.fullmatch(r"\{(\w+)\}", value):
                inner = value[1:-1]
                return f"{{{{{inner}}}}}"
            return value
        except (KeyError, AttributeError, TypeError):
            # Return value unchanged if any operation fails
            return value
    
    def resolve_object(self, obj: Any) -> Any:
        """
        Recursively resolve templates in nested objects/arrays.
        
        Args:
            obj: Object that may contain template strings
            
        Returns:
            Object with resolved templates
        """
        if isinstance(obj, str):
            return self.resolve(obj)
        elif isinstance(obj, dict):
            return {key: self.resolve_object(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self.resolve_object(item) for item in obj]
        else:
            return obj
    
    def _generate_recent_timestamp(self) -> str:
        """Generate a timestamp within the last 1-48 hours."""
        hours_ago = random.randint(1, 48)
        recent_time = datetime.now() - timedelta(hours=hours_ago)
        return recent_time.isoformat()
    
    def _generate_random_phone(self) -> str:
        """Generate a random phone number."""
        prefix = random.randint(200, 999)
        line = random.randint(1000, 9999)
        return f"+1-555-{prefix}-{line}"
    
    def _generate_random_birth_date(self) -> str:
        """Generate a random birth date."""
        year = random.randint(1970, 2000)
        month = random.randint(1, 12)
        day = random.randint(1, 28)
        return f"{year}-{month:02d}-{day:02d}"
    
    def _generate_past_timestamp(self) -> str:
        """Generate a timestamp from 1-365 days ago."""
        days_ago = random.randint(1, 365)
        past_time = datetime.now() - timedelta(days=days_ago)
        return past_time.isoformat() + "Z"
    
    def _generate_middle_timestamp(self) -> str:
        """Generate a timestamp from 7-90 days ago."""
        days_ago = random.randint(7, 90)
        middle_time = datetime.now() - timedelta(days=days_ago)
        return middle_time.isoformat() + "Z"
    
    def _generate_earliest_timestamp(self) -> str:
        """Generate a timestamp from 180-365 days ago."""
        days_ago = random.randint(180, 365)
        earliest_time = datetime.now() - timedelta(days=days_ago)
        return earliest_time.isoformat() + "Z"
    
    def _generate_latest_timestamp(self) -> str:
        """Generate a timestamp from 1-7 days ago."""
        days_ago = random.randint(1, 7)
        latest_time = datetime.now() - timedelta(days=days_ago)
        return latest_time.isoformat() + "Z"
    
    def _get_next_auto_id(self) -> int:
        """Generate consistent auto IDs."""
        if not hasattr(self, '_auto_id_counter'):
            self._auto_id_counter = 20000 + random.randint(0, 10000)
        self._auto_id_counter += 1
        return self._auto_id_counter
    
    def _get_current_user_pin(self) -> str:
        """Get the current user's PIN from user context."""
        pin = self.user_context.get('current_user_pin')
        if pin:
            return str(pin)
        else:
            raise ValueError("User PIN not found in context. PIN should have been extracted from database.")
    
    def _get_current_user_name(self) -> str:
        """Get the current user's name from user context."""
        email = self.user_context.get('current_user_email', '')
        if email and '@' in email:
            username = email.split('@')[0]
            if '.' in username:
                parts = username.split('.')
                return ' '.join(part.capitalize() for part in parts)
            else:
                return username.capitalize()
        
        profile_name = self.user_context.get('profile_name', 'TestUser')
        return profile_name.replace('-', ' ').title()

