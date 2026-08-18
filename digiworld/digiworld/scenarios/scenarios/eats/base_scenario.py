# Copyright (c) Meta Platforms, Inc. and affiliates.
import os

from digiworld.scenarios.scenario_base import Scenario
from digiworld.scenarios.scenarios.eats.template_resolver import EatsTemplateResolver


class EatsScenario(Scenario):
    """Base class for eats scenarios."""
    
    def _get_positioning_data(self, db_path):
        """
        Eats scenarios use the unified PositioningService.
        This method is kept for backward compatibility but returns empty data.
        """
        return {}
    
    def _create_template_resolver(self, user_context, positioning_data):
        """
        Create EatsTemplateResolver with PositioningService support.
        """
        return EatsTemplateResolver(
            user_context=user_context,
            positioning_data=positioning_data,
            db_path=getattr(self, '_current_db_path', None)
        )
