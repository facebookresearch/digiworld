# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SetAccountNumberVisibilityScenario(BankingScenario, ComposableScenario):
    """Verify that the account number visibility was toggled correctly."""

    def _get_checks(self, state_path):
        account_name = getattr(self, "account_name", None)
        visibility = getattr(self, "visibility", None)
        if not account_name:
            raise ValueError("account_name parameter is required")
        if not visibility:
            raise ValueError("visibility parameter is required")

        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            logger.warning("rootstore.json not found at %s", rootstore_path)
            return {"visibility_set": False}

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        expect_hidden = visibility.lower() == "hidden"

        banking_store = rootstore.get("bankingStore", {})
        ui_store = rootstore.get("uiStore", {})

        account_rows = self._execute_query_in_path(
            "SELECT id FROM accounts "
            "WHERE user_id = ? AND LOWER(account_name) = LOWER(?) "
            "ORDER BY id DESC LIMIT 1",
            (self.current_user_id, account_name),
            state_path,
        )
        account_id = account_rows[0][0] if account_rows else None

        visible_account_details = banking_store.get("visibleAccountDetails", {})
        if account_id is not None and isinstance(visible_account_details, dict):
            visible_value = visible_account_details.get(str(account_id))
            if visible_value is not None:
                is_hidden = not bool(visible_value)
                result = is_hidden == expect_hidden
                logger.info(
                    "Account '%s' visibleAccountDetails[%s]=%s, "
                    "expect_hidden=%s, result=%s",
                    account_name,
                    account_id,
                    visible_value,
                    expect_hidden,
                    result,
                )
                return {"visibility_set": result}

        # Try each known key in priority order, tracking whether the key
        # semantically means "hidden" (True = hidden) or "visible" (True = visible).
        candidates = [
            (banking_store, "accountNumberHidden", True),
            (ui_store, "accountNumberHidden", True),
            (banking_store, "isAccountDetailsVisible", False),
            (ui_store, "isAccountDetailsVisible", False),
        ]

        for store, key, true_means_hidden in candidates:
            value = store.get(key)
            if value is None:
                continue

            if isinstance(value, dict):
                acct_val = value.get(account_name)
                if acct_val is None:
                    continue
                is_hidden = bool(acct_val) if true_means_hidden else not bool(acct_val)
                result = is_hidden == expect_hidden
                logger.info(
                    f"Account '{account_name}' {key}={acct_val}, "
                    f"expect_hidden={expect_hidden}, result={result}"
                )
                return {"visibility_set": result}

            if isinstance(value, bool):
                is_hidden = value if true_means_hidden else not value
                result = is_hidden == expect_hidden
                logger.info(
                    f"Global {key}={value}, "
                    f"expect_hidden={expect_hidden}, result={result}"
                )
                return {"visibility_set": result}

        account_details = banking_store.get("accountDetails", {})
        if isinstance(account_details, dict):
            for _key, detail in account_details.items():
                if not isinstance(detail, dict):
                    continue
                detail_name = detail.get("accountName", "")
                if detail_name.lower() == account_name.lower():
                    hidden_flag = detail.get("numberHidden", detail.get("isNumberHidden"))
                    if hidden_flag is not None:
                        result = bool(hidden_flag) == expect_hidden
                        logger.info(
                            f"Account detail hidden flag: {hidden_flag}, "
                            f"expect_hidden={expect_hidden}, result={result}"
                        )
                        return {"visibility_set": result}

        logger.warning(
            "Could not find visibility state for account '%s' in rootstore",
            account_name,
        )
        return {"visibility_set": False}
