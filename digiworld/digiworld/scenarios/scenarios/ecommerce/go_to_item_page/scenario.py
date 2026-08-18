# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario


class GoToItemPageScenario(EcommerceScenario, TargetStateScenario):
    """Scenario for navigating to the product detail page of a specific item."""

    def _check_task_completion(self, state_path):
        import json
        import os

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

        if "Product" not in screen and "/product/" not in route.lower():
            return False

        # Route format: /screens/product/<id>
        if "/product/" in route:
            parts = route.rstrip("/").split("/")
            try:
                product_id = int(parts[-1])
            except (ValueError, IndexError):
                return False
            rows = self._execute_query_in_path(
                "SELECT name FROM products WHERE id = ?",
                (product_id,),
                state_path,
            )
            if rows and rows[0][0].lower() == self.item.lower():
                return True

        return False
