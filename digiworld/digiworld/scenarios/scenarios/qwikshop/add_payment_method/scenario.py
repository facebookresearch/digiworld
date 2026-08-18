# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario


class AddPaymentMethodScenario(QwikshopScenario, TargetStateScenario):
    """Scenario for adding a new payment method with credit card details."""

    def _check_task_completion(self, state_path):
        query = "SELECT name_on_card, card_number FROM payment_methods WHERE user_id = ?"
        initial_records, current_records, new_records = self.compare_database_records(
            self.initial_state_path, state_path, query, (self.current_user_id,)
        )

        card_number = str(self.cardNumber).replace(" ", "").replace("-", "")
        last4 = card_number[-4:]
        target_name = str(self.name).lower()

        for record in new_records:
            rec_name = str(record[0]).lower()
            rec_card = str(record[1]).replace(" ", "").replace("-", "")
            if rec_card.endswith(last4) and rec_name == target_name:
                return True

        return False
