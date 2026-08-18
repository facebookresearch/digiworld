# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

FILTER_MAP = {
    "all transactions": "all",
    "transfer transactions": "transfer",
    "deposit transactions": "deposit",
    "withdrawal transactions": "withdrawal",
}


class CheckTransactionsByTypeScenario(PaymentScenario, ComposableScenario):
    """Verify the user navigated to transactions with the correct type filter."""

    def _get_checks(self, state_path):
        transaction_type = getattr(self, "transaction_type", None)
        if not transaction_type:
            raise ValueError("transaction_type parameter is required")

        expected_code = FILTER_MAP.get(transaction_type.lower())
        if expected_code is None:
            raise ValueError(
                f"Unknown transaction_type '{transaction_type}'. "
                f"Valid values: {list(FILTER_MAP.keys())}"
            )

        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            logger.warning("rootstore.json not found at %s", rootstore_path)
            return {"on_transactions_screen": False, "filter_applied": False}

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            return {"on_transactions_screen": False, "filter_applied": False}

        screen_name = current_session.get("data", {}).get("screenName", "")
        route = current_session.get("data", {}).get("route", "")

        on_transactions = (
            "transaction" in screen_name.lower()
            and "/(tabs)/transactions" in route
        )

        form_data = (
            current_session.get("data", {})
            .get("sessionData", {})
            .get("formData", {})
        )
        ui_store = rootstore.get("uiStore", {})

        active_filter = (
            form_data.get("selectedFilter", "")
            or form_data.get("filterType", "")
            or form_data.get("activeFilter", "")
        )

        if not active_filter:
            tx_filter = ui_store.get("transactionFilter", {})
            if isinstance(tx_filter, dict):
                active_filter = tx_filter.get("activeFilter", "")

        if not active_filter:
            active_filter = ui_store.get("activeTransactionFilter", "")

        if expected_code == "all":
            filter_matches = (
                not active_filter or active_filter.lower() == "all"
            )
        else:
            filter_matches = active_filter.lower() == expected_code

        logger.info(
            "on_transactions=%s, expected_code=%s, active_filter=%s, "
            "filter_matches=%s",
            on_transactions, expected_code, active_filter, filter_matches,
        )
        return {
            "on_transactions_screen": on_transactions,
            "filter_applied": filter_matches,
        }
