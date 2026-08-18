# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario


class EditListingCategoryScenario(AuctionScenario, TargetStateScenario):
    """Scenario for editing an auction listing's category."""

    def _check_task_completion(self, state_path):
        id_query = "SELECT id FROM items WHERE LOWER(title) = LOWER(?) AND seller_id = ?"
        rows = self._execute_query_in_path(
            id_query, (self.title, self.current_user_id), self.initial_state_path
        )
        if not rows:
            raise ValueError(f"Item '{self.title}' not found in initial state")
        item_id = rows[0][0]

        cat_query = (
            "SELECT id FROM categories "
            "WHERE LOWER(name) LIKE LOWER(?) OR LOWER(code) = LOWER(?)"
        )
        target = self.category.strip()
        cat_rows = self._execute_query_in_path(
            cat_query, (f"%{target}%", target), state_path
        )
        if not cat_rows:
            raise ValueError(f"Category '{self.category}' not found")
        expected_category_id = cat_rows[0][0]

        check_query = "SELECT category_id FROM items WHERE id = ?"
        results = self._execute_query_in_path(check_query, (item_id,), state_path)
        if not results:
            raise ValueError(f"Item {item_id} not found in final state")

        return results[0][0] == expected_category_id
