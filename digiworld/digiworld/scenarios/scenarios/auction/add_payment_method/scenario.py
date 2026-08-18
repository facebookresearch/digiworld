# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario


class AddPaymentMethodScenario(AuctionScenario, TargetStateScenario):
    """Scenario for adding a new payment method with credit card details."""

    def _check_task_completion(self, state_path):
        query = "SELECT card_number, card_holder_name FROM user_payment_methods WHERE user_id = ?"
        initial_records, current_records, new_records = self.compare_database_records(
            self.initial_state_path, state_path, query, (self.current_user_id,)
        )

        card_number = str(self.cardNumber).replace(" ", "")
        last4 = card_number[-4:]
        target_name = str(self.name).lower()

        for record in new_records:
            rec_card = str(record[0])
            rec_holder = str(record[1]).lower()
            if last4 in rec_card and rec_holder == target_name:
                return True

        return False
