# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Context extraction utilities for scenarios."""

import os
import logging
from typing import Dict, Optional, Any

logger = logging.getLogger(__name__)


class ContextExtractor:
    """Handles extraction of user and scenario context from databases and files."""
    
    def __init__(self, scenario_instance):
        """
        Initialize the context extractor.
        
        Args:
            scenario_instance: The scenario instance to extract context for
        """
        self.scenario = scenario_instance
    
    def extract_user_context(self, db_path: str) -> Dict[str, Any]:
        """
        Extract user context from rootstore.json and database based on scenario configuration.
        Extracts all fields specified in scenario_config['context_fields'].
        
        Note: Scenarios requiring multiple fields (e.g., PIN extraction also needs user_id)
        should explicitly list all required fields in their context_fields configuration.
        
        Args:
            db_path: Path to the database file
            
        Returns:
            Dict containing the extracted context fields
        """
        db_dir = os.path.dirname(db_path)
        # Check for both current.json (db-forge) and rootstore.json (sessions)
        rootstore_path = os.path.join(db_dir, "current.json")
        if not os.path.exists(rootstore_path):
            rootstore_path = os.path.join(db_dir, "rootstore.json")
            if not os.path.exists(rootstore_path):
                raise FileNotFoundError(
                    f"Neither current.json nor rootstore.json found in {db_dir}. "
                    f"This usually means the database files weren't pulled correctly from the device."
                )

        # Get the context fields that this scenario needs
        context_fields = self.scenario.scenario_config.get('context_fields', [])

        # If no context_fields specified, use default behavior for backward compatibility
        if not context_fields:
            context_fields = []

        logger.info(f"Extracting context fields: {context_fields}")

        user_context = {}

        # Extract basic user info if needed.
        # Some derived fields (for example current_user_password in parking)
        # depend on current_user_id even if the scenario does not request it explicitly.
        if any(
            field in context_fields
            for field in [
                'current_user_email',
                'current_user_id',
                'current_user_pin',
                'current_user_password',
            ]
        ):
            from digiworld.scenarios.state_manager import StateManager
            state_manager = StateManager(self.scenario)
            current_user_id, current_user_email = state_manager.get_current_user_info(rootstore_path)

            if not current_user_email:
                error_msg = (
                    f"Could not extract user info from {rootstore_path}. "
                    f"Ensure the rootstore.json file contains a valid 'userStore.currentUser' object "
                    f"with 'id' and either 'email' or 'phoneNumber' fields."
                )
                logger.error(error_msg)
                raise ValueError(error_msg)

            logger.info(f"Resolved current user: {current_user_email} (ID: {current_user_id})")

            user_context['current_user_email'] = current_user_email
            user_context['current_user_id'] = current_user_id

        # Extract remaining context fields using extensible approach
        for field in context_fields:
            if field not in user_context:
                field_value = self.scenario._extract_context_field(field, db_path, user_context)
                if field_value is not None:
                    user_context[field] = field_value
                else:
                    # Raise error if field extraction returns None
                    error_msg = (
                        f"Failed to extract required context field '{field}'. "
                        f"Ensure the scenario's _extract_context_field method handles this field "
                        f"and the necessary data exists in the database at {db_path}"
                    )
                    logger.error(error_msg)
                    raise ValueError(error_msg)

        # Add profile name if requested (this is always available)
        if 'profile_name' in context_fields:
            user_context['profile_name'] = getattr(self.scenario, 'profile_name', 'unknown')

        logger.info(f"Successfully extracted user context: {list(user_context.keys())}")
        return user_context

    def format_context_for_system_prompt(self, db_path: Optional[str] = None) -> str:
        """
        Format context information for inclusion in system prompts.
        This creates the context section that will be inserted into system prompts.

        Args:
            db_path: Optional path to database for context extraction

        Returns:
            Formatted string with context information ready for system prompts
        """
        # Get context fields for this scenario
        context_fields = self.scenario.scenario_config.get('context_fields', [])

        if not context_fields:
            return ""

        # Get supported field descriptions
        supported_fields = self.scenario._get_supported_context_fields()

        context_lines = []

        # If we have a database path, extract actual values
        if db_path:
            try:
                user_context = self.extract_user_context(db_path)

                for field in context_fields:
                    if field in supported_fields:
                        desc = supported_fields[field]
                        value = user_context.get(field, 'Not available')
                        context_lines.append(f"- {field}: {value} ({desc})")
                    else:
                        logger.warning(f"Unknown context field '{field}' has no description")
                        context_lines.append(f"- {field}: Not available (unknown field)")

            except Exception as e:
                logger.warning(
                    f"Failed to extract context values from {db_path}, "
                    f"falling back to descriptions only: {e}"
                )
                # Fallback to descriptions only if extraction fails
                for field in context_fields:
                    if field in supported_fields:
                        desc = supported_fields[field]
                        context_lines.append(f"- {field}: Will be available after scenario reset ({desc})")
                    else:
                        context_lines.append(f"- {field}: Unknown field")
        else:
            # No database path provided, just show field descriptions
            for field in context_fields:
                if field in supported_fields:
                    desc = supported_fields[field]
                    context_lines.append(f"- {field}: {desc}")
                else:
                    logger.warning(f"Unknown context field '{field}' has no description")
                    context_lines.append(f"- {field}: Unknown field")

        return "\n".join(context_lines) if context_lines else ""
