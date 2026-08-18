# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario
from digiworld.scenarios.verification import TargetStateScenario


class PurchaseFromWishlistScenario(QwikshopScenario, TargetStateScenario):

    def _check_task_completion(self, state_path):
        query = "SELECT product_name FROM order_items WHERE LOWER(product_name) = LOWER(?)"
        initial_records, current_records, new_records = self.compare_database_records(
            self.initial_state_path, state_path, query, (self.item,)
        )
        return len(new_records) > 0
