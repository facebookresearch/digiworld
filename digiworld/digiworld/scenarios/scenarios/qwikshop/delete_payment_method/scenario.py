# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario


class DeletePaymentMethodScenario(QwikshopScenario, TargetStateScenario):
    """Scenario for deleting a payment method identified by its card number."""

    @staticmethod
    def _normalize_card(card_str):
        return card_str.replace(" ", "").replace("-", "")

    def _check_task_completion(self, state_path):
        query = "SELECT card_number FROM payment_methods WHERE user_id = ?"
        initial_records, current_records, _ = self.compare_database_records(
            self.initial_state_path, state_path, query, (self.current_user_id,)
        )

        target_card = self._normalize_card(str(self.cardNumber))

        found_in_initial = any(
            self._normalize_card(str(r[0])) == target_card for r in initial_records
        )
        if not found_in_initial:
            raise ValueError(
                f"No payment method with card number {self.cardNumber} found in initial state"
            )

        found_in_current = any(
            self._normalize_card(str(r[0])) == target_card for r in current_records
        )
        return not found_in_current
