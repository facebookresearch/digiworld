# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os

from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario


class ShowItemInCategoryScenario(EcommerceScenario, TargetStateScenario):
    """Scenario for showing an item from a specific product category."""

    def _check_task_completion(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return False

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        session = self.get_current_session(rootstore)
        if not session:
            return False

        screen = session.get("data", {}).get("screenName", "")
        route = session.get("data", {}).get("route", "")
        target_category = self.category.lower()

        if "Product" in screen or "/product/" in route.lower():
            if "/product/" in route:
                parts = route.rstrip("/").split("/")
                try:
                    product_id = int(parts[-1])
                except (ValueError, IndexError):
                    return False
                rows = self._execute_query_in_path(
                    "SELECT category_name FROM products WHERE id = ?",
                    (product_id,),
                    state_path,
                )
                if rows and rows[0][0].lower() == target_category:
                    return True
            return False

        if "categor" in screen.lower() or "/category/" in route.lower():
            if "/category/" in route:
                parts = route.rstrip("/").split("/")
                try:
                    cat_id = int(parts[-1])
                except (ValueError, IndexError):
                    return False
                rows = self._execute_query_in_path(
                    "SELECT name FROM categories WHERE id = ?",
                    (cat_id,),
                    state_path,
                )
                if rows and rows[0][0].lower() == target_category:
                    return True
            return False

        return False
