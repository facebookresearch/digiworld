# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

FILTER_CODE_MAP = {
    "all": "all",
    "account transfer": "transfer",
    "bill payment": "bill_payment",
}


class ViewTransactionsWithFilterScenario(BankingScenario, ComposableScenario):
    """Verify the user navigated to transactions and applied the correct filter."""

    def _get_checks(self, state_path):
        filter_type = getattr(self, "filter_type", None)
        if not filter_type:
            raise ValueError("filter_type parameter is required")

        expected_code = FILTER_CODE_MAP.get(filter_type.lower())
        if expected_code is None:
            raise ValueError(
                f"Unknown filter_type '{filter_type}'. "
                f"Valid values: {list(FILTER_CODE_MAP.keys())}"
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

        screen_name = current_session.get("data", {}).get("screenName", "").lower()
        route = current_session.get("data", {}).get("route", "").lower()

        on_transactions = (
            "transactions" in screen_name or "/transactions" in route
        )

        ui_store = rootstore.get("uiStore", {})
        banking_store = rootstore.get("bankingStore", {})

        active_filter = None
        tx_filter = ui_store.get("transactionFilter", {})
        if isinstance(tx_filter, dict):
            active_filter = tx_filter.get("activeFilter", "").lower()

        if active_filter is None:
            tx_filter = banking_store.get("transactionFilter", {})
            if isinstance(tx_filter, dict):
                active_filter = tx_filter.get("activeFilter", "").lower()

        if active_filter is None:
            active_filter = (
                ui_store.get("activeTransactionFilter", "")
                or banking_store.get("activeTransactionFilter", "")
            )
            if active_filter:
                active_filter = active_filter.lower()

        filter_matches = active_filter == expected_code

        logger.info(
            f"Transactions screen: {on_transactions}, "
            f"filter expected='{expected_code}', actual='{active_filter}', "
            f"matches={filter_matches}"
        )
        return {
            "on_transactions_screen": on_transactions,
            "filter_applied": filter_matches,
        }
