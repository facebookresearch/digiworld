# Copyright (c) Meta Platforms, Inc. and affiliates.
import re

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario


class AddPaymentMethodScenario(EcommerceScenario, ComposableScenario):
    """Scenario for adding a new payment method to the user's account."""

    def _get_checks(self, state_path):
        query = (
            "SELECT name_on_card, card_number, expiry_month, expiry_year "
            "FROM payment_methods WHERE user_id = ?"
        )
        initial, current, new_records = self.compare_database_records(
            self.initial_state_path, state_path, query, (self.current_user_id,)
        )

        if not new_records:
            return {"payment_added": False}

        target_name = self.name_on_card.lower()
        target_card = re.sub(r"\D", "", self.card_number)

        for rec in new_records:
            db_name = (rec[0] or "").lower()
            db_card = re.sub(r"\D", "", rec[1] or "")
            db_month = (rec[2] or "").strip()
            db_year = (rec[3] or "").strip()

            name_ok = target_name in db_name or db_name in target_name
            card_ok = target_card[-4:] == db_card[-4:]
            month_ok = db_month.lstrip("0") == self.expiry_month.strip().lstrip("0")
            year_ok = db_year[-2:] == self.expiry_year.strip()[-2:]

            if name_ok and card_ok and month_ok and year_ok:
                return {"payment_added": True}

        return {"payment_added": False}
