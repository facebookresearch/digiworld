# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

PERIOD_MAP = {
    "today": "today",
    "this week": "this_week",
    "this month": "this_month",
    "last month": "last_month",
    "last 3 months": "last_3_months",
}


def _extract_period(form_data, ui_store):
    """Search multiple locations for the active summary period value."""
    active = (
        form_data.get("transactionSummaryPeriod", "")
        or form_data.get("selectedPeriod", "")
        or form_data.get("summaryPeriod", "")
    )

    if not active:
        active = ui_store.get("transactionSummaryPeriod", "")

    if not active:
        active = ui_store.get("homeSummaryPeriod", "")

    return active.lower() if active else ""


class ChangeHomeTransactionSummaryScenario(PaymentScenario, ComposableScenario):
    """Verify the user changed the transaction summary period on the home screen."""

    def _get_checks(self, state_path):
        period = getattr(self, "period", None)
        if not period:
            raise ValueError("period parameter is required")

        expected_code = PERIOD_MAP.get(period.lower())
        if expected_code is None:
            raise ValueError(
                f"Unknown period '{period}'. "
                f"Valid values: {list(PERIOD_MAP.keys())}"
            )

        # Precondition: verify the period was different in the initial state
        initial_rootstore_path = os.path.join(
            self.initial_state_path, "rootstore.json"
        )
        period_was_different = True
        if os.path.exists(initial_rootstore_path):
            with open(initial_rootstore_path, "r") as f:
                initial_rootstore = json.load(f)
            initial_session = self.get_current_session(initial_rootstore)
            if initial_session:
                initial_form_data = (
                    initial_session.get("data", {})
                    .get("sessionData", {})
                    .get("formData", {})
                )
                initial_ui_store = initial_rootstore.get("uiStore", {})
                initial_period = _extract_period(
                    initial_form_data, initial_ui_store
                )
                period_was_different = initial_period != expected_code
                if not period_was_different:
                    logger.warning(
                        "Period was already '%s' in initial state "
                        "— vacuous truth",
                        expected_code,
                    )

        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            logger.warning("rootstore.json not found at %s", rootstore_path)
            return {
                "period_was_different": period_was_different,
                "on_home_screen": False,
                "period_applied": False,
            }

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            return {
                "period_was_different": period_was_different,
                "on_home_screen": False,
                "period_applied": False,
            }

        screen_name = current_session.get("data", {}).get("screenName", "")
        route = current_session.get("data", {}).get("route", "")

        on_home = (
            screen_name.lower() == "home"
            and "/(tabs)/home" in route
        )

        form_data = (
            current_session.get("data", {})
            .get("sessionData", {})
            .get("formData", {})
        )
        ui_store = rootstore.get("uiStore", {})

        actual_period = _extract_period(form_data, ui_store)
        period_matches = actual_period == expected_code

        logger.info(
            "on_home=%s, period expected=%s actual=%s match=%s",
            on_home, expected_code, actual_period, period_matches,
        )
        return {
            "period_was_different": period_was_different,
            "on_home_screen": on_home,
            "period_applied": period_matches,
        }
