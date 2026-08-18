# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.answer_matchers import substring_match, float_match

_SORT_MAP = {
    "popular": "popular",
    "price low to high": "price_asc",
    "price high to low": "price_desc",
}

_SORT_SQL = {
    "popular": "ORDER BY rating DESC, review_count DESC",
    "price_asc": "ORDER BY COALESCE(discounted_price, price) ASC",
    "price_desc": "ORDER BY COALESCE(discounted_price, price) DESC",
}


class SearchSortFindScenario(EcommerceScenario, ComposableScenario):
    def _get_checks(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError("rootstore.json not found")

        with open(rootstore_path) as f:
            rootstore = json.load(f)

        session = self.get_current_session(rootstore)
        if not session:
            raise ValueError("No current session found")

        form_data = session.get("data", {}).get("sessionData", {}).get("formData", {})
        expected_sort = _SORT_MAP.get(self.sort_option, self.sort_option)
        actual_sort = form_data.get("filters", {}).get("sortBy", "")

        answer_plausible = False
        if self.agent_answer.strip():
            search_term = self.search_term.lower()
            order_clause = _SORT_SQL.get(expected_sort, "ORDER BY rating DESC")
            rows = self._execute_query_in_path(
                f"SELECT name, COALESCE(discounted_price, price) "
                f"FROM products WHERE LOWER(name) LIKE ? {order_clause} LIMIT 5",
                (f"%{search_term}%",),
                state_path,
            )
            if rows:
                if self.result_field == "name":
                    answer_plausible = any(
                        substring_match(self.agent_answer, r[0]) for r in rows
                    )
                elif self.result_field == "price":
                    answer_plausible = any(
                        float_match(self.agent_answer, r[1], tolerance=1.0)
                        for r in rows
                    )
            if not answer_plausible:
                answer_plausible = bool(self.agent_answer.strip())

        return {
            "sort_applied": actual_sort == expected_sort,
            "answer_provided": bool(self.agent_answer.strip()),
            "answer_plausible": answer_plausible,
        }
