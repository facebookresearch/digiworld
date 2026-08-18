# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.eats.base_scenario import EatsScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CheckCategoryNearMeScenario(EatsScenario, ComposableScenario):
    """Verify that the agent navigated to the correct category screen."""

    def _get_checks(self, state_path):
        category = getattr(self, "category", None)
        if not category:
            raise ValueError("category parameter is required")

        query = "SELECT id FROM categories WHERE LOWER(name) = LOWER(?)"
        rows = self._execute_query_in_path(
            query, (category,), self.initial_state_path
        )
        if not rows:
            raise ValueError(
                f"No category found with name {category!r} "
                f"in {self.initial_state_path}"
            )
        expected_category_id = rows[0][0]

        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            logger.warning("rootstore.json not found at %s", rootstore_path)
            return {"on_category_screen": False}

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            logger.info("No current session found")
            return {"on_category_screen": False}

        screen_name = current_session.get("data", {}).get("screenName", "")
        if screen_name != "CategoryScreen":
            logger.info("Not on CategoryScreen, got %s", screen_name)
            return {"on_category_screen": False}

        session_data = current_session.get("data", {}).get("sessionData", {})
        form_data = session_data.get("formData", {})

        category_id = form_data.get("categoryId")
        if category_id is not None:
            match = str(category_id) == str(expected_category_id)
            logger.info(
                "formData.categoryId=%s, expected=%s, match=%s",
                category_id, expected_category_id, match,
            )
            return {"on_category_screen": match}

        route = current_session.get("data", {}).get("route", "")
        match = str(expected_category_id) in route
        logger.info(
            "Falling back to route check: route=%s, expected_id=%s, match=%s",
            route, expected_category_id, match,
        )
        return {"on_category_screen": match}
