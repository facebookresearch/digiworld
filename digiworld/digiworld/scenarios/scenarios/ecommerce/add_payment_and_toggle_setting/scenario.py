# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os
import re
from typing import Dict

from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

_SETTING_MAP = {
    "dark mode": "isDarkMode",
    "notifications": "notificationsEnabled",
}


class AddPaymentAndToggleSettingScenario(EcommerceScenario, ComposableScenario):
    """Composed scenario: add a new payment method, then toggle a user
    setting.

    Combines verification logic from ``add_payment_method`` (action) and
    ``toggle_setting`` (action).  Both steps leave persistent traces:
    the payment method exists in the database and the setting value is
    updated in the rootstore.
    """

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # -- Payment method verification (from add_payment_method) -------------

        pm_query = (
            "SELECT name_on_card, card_number, expiry_month, expiry_year "
            "FROM payment_methods WHERE user_id = ?"
        )
        initial, current, new_records = self.compare_database_records(
            self.initial_state_path, state_path, pm_query,
            (self.current_user_id,)
        )

        payment_added = False
        if new_records:
            target_name = self.name_on_card.lower()
            target_card = re.sub(r"\D", "", self.card_number)

            for rec in new_records:
                db_name = (rec[0] or "").lower()
                db_card = re.sub(r"\D", "", rec[1] or "")
                db_month = (rec[2] or "").strip()
                db_year = (rec[3] or "").strip()

                name_ok = target_name in db_name or db_name in target_name
                card_ok = target_card[-4:] == db_card[-4:]
                month_ok = (
                    db_month.lstrip("0")
                    == self.expiry_month.strip().lstrip("0")
                )
                year_ok = db_year[-2:] == self.expiry_year.strip()[-2:]

                if name_ok and card_ok and month_ok and year_ok:
                    payment_added = True
                    break

        # -- Setting toggle verification (from toggle_setting) -----------------

        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError("rootstore.json not found")

        with open(rootstore_path) as f:
            rootstore = json.load(f)

        session = self.get_current_session(rootstore)
        if not session:
            raise ValueError("No current session")

        form_data = (
            session.get("data", {})
            .get("sessionData", {})
            .get("formData", {})
        )

        setting_key = _SETTING_MAP.get(self.setting.lower())
        if not setting_key:
            raise ValueError(f"Unknown setting: {self.setting}")

        expected_value = self.action.lower() == "enable"
        actual_value = form_data.get(setting_key)

        setting_toggled = actual_value == expected_value

        logger.info(
            "Add payment & toggle setting: payment_added=%s, "
            "setting='%s', action='%s', expected=%s, actual=%s, "
            "setting_toggled=%s",
            payment_added, self.setting, self.action,
            expected_value, actual_value, setting_toggled,
        )

        return {
            "payment_added": payment_added,
            "setting_toggled": setting_toggled,
        }
