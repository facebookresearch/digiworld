# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario
from digiworld.scenarios.verification import TargetStateScenario


class PurchaseFromWishlistIfOnSaleScenario(QwikshopScenario, TargetStateScenario):

    def _check_task_completion(self, state_path):
        threshold = int(self.percentage)

        product_query = "SELECT discount_percent FROM products WHERE LOWER(name) = LOWER(?)"
        product_rows = self._execute_query_in_path(
            product_query, (self.item,), self.initial_state_path
        )
        if not product_rows:
            raise ValueError(f"Product '{self.item}' not found in initial state")
        actual_discount = product_rows[0][0] or 0

        order_query = "SELECT product_name FROM order_items WHERE LOWER(product_name) = LOWER(?)"
        initial_records, current_records, new_records = self.compare_database_records(
            self.initial_state_path, state_path, order_query, (self.item,)
        )
        purchased = len(new_records) > 0

        should_purchase = actual_discount >= threshold
        if should_purchase:
            return purchased
        else:
            return not purchased
