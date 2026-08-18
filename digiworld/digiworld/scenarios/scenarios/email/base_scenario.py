# Copyright (c) Meta Platforms, Inc. and affiliates.
import os

from digiworld.scenarios.scenario_base import Scenario
from digiworld.scenarios.scenarios.email.template_resolver import EmailTemplateResolver


class EmailScenario(Scenario):
    """Base class for email scenarios."""
    
    def _get_positioning_data(self, db_path):
        """
        Email scenarios now use the unified PositioningService.
        This method is kept for backward compatibility but returns empty data.
        """
        # The new PositioningService handles all positioning logic
        return {}
    
    def _create_template_resolver(self, user_context, positioning_data):
        """
        Create EmailTemplateResolver with PositioningService support.
        """
        return EmailTemplateResolver(
            user_context=user_context,
            positioning_data=positioning_data,
            db_path=getattr(self, '_current_db_path', None)
        )
 