# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict, Any, Optional, Set

from digiworld.scenarios.template_resolver import TemplateResolver

logger = logging.getLogger(__name__)


class RydeTemplateResolver(TemplateResolver):
    """Ryde-specific template resolver with location and route support"""

    # Context dependencies for ryde templates
    # Positioning templates filter by user_id which uses current_user_email
    CONTEXT_DEPENDENCIES: Dict[str, Set[str]] = {
        **TemplateResolver.CONTEXT_DEPENDENCIES,
        'middle_ride_time': {'current_user_email'},
        'recent_ride_time': {'current_user_email'},
        'old_ride_time': {'current_user_email'},
    }

    # Database configuration for ryde
    DB_CONFIG = {
        'table_name': 'rides',
        'timestamp_column': 'start_time',
        'filter_column': 'user_id',
        'filter_pattern': '{user_email}'
    }

    # Template positioning mappings
    POSITIONING_TEMPLATES = {
        'middle_ride_time': 'middle',
        'recent_ride_time': 'beginning',
        'old_ride_time': 'end'
    }

    def __init__(self, user_context: Dict[str, Any], positioning_data: Optional[Dict[str, Any]] = None, db_path: Optional[str] = None):
        """
        Initialize ryde template resolver.

        Args:
            user_context: User context information
            positioning_data: Pre-computed ryde data (rides, addresses, etc.)
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
        """Resolve ryde-specific templates"""
        result = super().resolve(template_str)
        
        # Add ryde-specific template resolution here if needed
        # e.g., {pickup_location}, {drop_location}, {ride_distance}
        
        return result

