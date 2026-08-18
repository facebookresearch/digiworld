# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario


class DeletePaymentMethodScenario(AuctionScenario, TargetStateScenario):
    """Scenario for deleting a payment method by its last 4 card digits."""

    def _check_task_completion(self, state_path):
        query = "SELECT card_number FROM user_payment_methods WHERE user_id = ?"
        initial_records, current_records, _ = self.compare_database_records(
            self.initial_state_path, state_path, query, (self.current_user_id,)
        )

        last4 = str(self.last4CardNum)

        found_in_initial = any(
            str(r[0]).endswith(last4) for r in initial_records
        )
        if not found_in_initial:
            raise ValueError(
                f"No payment method ending in {last4} found in initial state"
            )

        found_in_current = any(
            str(r[0]).endswith(last4) for r in current_records
        )
        return not found_in_current
