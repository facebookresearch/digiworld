# Copyright (c) Meta Platforms, Inc. and affiliates.
import unicodedata

from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.answer_matchers import all_substrings_match


class ShowDealsInCategoryScenario(QwikshopScenario, ComposableScenario):

    @staticmethod
    def _normalize_visible_name(value: str) -> str:
        """Normalize product names to what users can reasonably type from the UI."""
        replacements = {
            "\u2019": "'",
            "\u2018": "'",
            "\u201c": '"',
            "\u201d": '"',
            "\u2011": "-",
            "\u2012": "-",
            "\u2013": "-",
            "\u2014": "-",
            "\u202f": " ",
            "\u00a0": " ",
            "\u00d7": "x",
        }
        for src, dst in replacements.items():
            value = value.replace(src, dst)
        value = unicodedata.normalize("NFKC", value)
        return " ".join(value.split())

    def _get_checks(self, state_path):
        threshold = int(self.percentage)
        query = """
            SELECT name FROM products
            WHERE LOWER(category_name) = LOWER(?)
            AND discount_percent >= ?
            AND in_stock = 1
        """
        rows = self._execute_query_in_path(query, (self.category, threshold), state_path)
        if not rows:
            raise ValueError(
                f"No products found in category '{self.category}' with discount >= {threshold}%"
            )
        expected_names = [self._normalize_visible_name(r[0]) for r in rows]
        print(
            f"ShowDealsInCategory expected answers for category='{self.category}' "
            f"threshold={threshold}: {expected_names}"
        )
        return {
            "deals_reported": all_substrings_match(self.agent_answer, expected_names)
        }