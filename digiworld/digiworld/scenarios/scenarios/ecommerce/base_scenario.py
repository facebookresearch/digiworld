# Copyright (c) Meta Platforms, Inc. and affiliates.
import os

from digiworld.scenarios.scenario_base import Scenario
from digiworld.scenarios.scenarios.ecommerce.template_resolver import EcommerceTemplateResolver


class EcommerceScenario(Scenario):
    """Base class for ecommerce scenarios."""
    
    def _get_positioning_data(self, db_path):
        """
        Ecommerce scenarios use the unified PositioningService.
        This method is kept for backward compatibility but returns empty data.
        """
        return {}
    
    def _create_template_resolver(self, user_context, positioning_data):
        """
        Create EcommerceTemplateResolver with PositioningService support.
        """
        return EcommerceTemplateResolver(
            user_context=user_context,
            positioning_data=positioning_data,
            db_path=getattr(self, '_current_db_path', None)
        )
