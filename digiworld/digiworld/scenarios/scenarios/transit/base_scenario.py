# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Base scenario class for transit app scenarios."""

import json
import os
import sqlite3
import logging
import re

from digiworld.scenarios.scenario_base import Scenario
from digiworld.scenarios.scenarios.transit.template_resolver import TransitTemplateResolver

logger = logging.getLogger(__name__)


class TransitScenario(Scenario):
    """Base class for transit scenarios."""

    OPTIMIZATION_TO_FILTER = {
        "fastest": "fastest",
        "cheapest": "cheapest",
        "most direct": "fewest-transfers",
        "least connections": "fewest-transfers",
    }
    
    def _get_positioning_data(self, db_path):
        """
        Get transit-specific data for template resolution.
        """
        if not hasattr(self, 'current_user_id') or self.current_user_id is None:
            logger.debug("current_user_id not available yet, returning empty positioning data")
            return {'route_count': 0, 'stop_count': 0, 'trip_count': 0}

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM saved_routes WHERE user_id = ?", (self.current_user_id,))
        route_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM stops")
        stop_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM trip_options")
        trip_count = cursor.fetchone()[0]

        conn.close()

        logger.info(f"Found {route_count} saved routes, {stop_count} stops, {trip_count} trip options")
        return {
            'route_count': route_count,
            'stop_count': stop_count,
            'trip_count': trip_count
        }
    
    def _create_template_resolver(self, user_context, positioning_data):
        """
        Create TransitTemplateResolver with positioning support.
        """
        return TransitTemplateResolver(
            user_context=user_context,
            positioning_data=positioning_data,
            db_path=getattr(self, '_current_db_path', None)
        )

    def _load_rootstore(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return {}

        try:
            with open(rootstore_path, "r", encoding="utf-8") as file:
                return json.load(file)
        except (OSError, json.JSONDecodeError) as exc:
            logger.debug("Failed to load rootstore from %s: %s", rootstore_path, exc)
            return {}

    def _get_generated_routes(self, state_path):
        rootstore = self._load_rootstore(state_path)
        trip_state = rootstore.get("tripPlannerStore", {}).get("tripState", {})
        generated_routes = trip_state.get("generatedRoutes", [])
        return generated_routes if isinstance(generated_routes, list) else []

    def _time_to_minutes(self, time_str):
        trimmed = str(time_str).strip().upper()
        is_pm = "PM" in trimmed
        is_am = "AM" in trimmed
        clean_time = re.sub(r"\s*(AM|PM)\s*", "", trimmed).strip()

        if ":" not in clean_time:
            return 0

        hours_str, minutes_str = clean_time.split(":", 1)
        hours = int(hours_str)
        minutes_match = re.match(r"(\d+)", minutes_str)
        minutes = int(minutes_match.group(1)) if minutes_match else 0

        if is_pm and hours != 12:
            hours += 12
        elif is_am and hours == 12:
            hours = 0

        return hours * 60 + minutes

    def _sort_generated_routes(self, routes, filter_type):
        if filter_type == "fastest":
            return sorted(routes, key=lambda route: route.get("totalDuration", float("inf")))
        if filter_type == "cheapest":
            return sorted(routes, key=lambda route: route.get("totalFare", float("inf")))
        if filter_type == "fewest-transfers":
            return sorted(
                routes,
                key=lambda route: (
                    route.get("transferCount", float("inf")),
                    route.get("totalDuration", float("inf")),
                ),
            )
        if filter_type == "direct":
            direct_routes = [route for route in routes if route.get("transferCount", 0) == 0]
            return sorted(direct_routes, key=lambda route: route.get("totalDuration", float("inf")))
        return list(routes)

    def _get_generated_route_for_optimization(self, state_path, optimization=None):
        routes = self._get_generated_routes(state_path)
        if not routes:
            return None

        filter_type = (
            self.OPTIMIZATION_TO_FILTER.get(optimization, "fastest")
            if optimization
            else "fastest"
        )
        sorted_routes = self._sort_generated_routes(routes, filter_type)
        return sorted_routes[0] if sorted_routes else None

    def _get_supported_context_fields(self):
        """
        Transit scenarios support basic user context fields.
        """
        base_fields = Scenario._get_supported_context_fields(self)
        return base_fields
