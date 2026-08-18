# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

TYPE_FILTER_MAP = {
    "all": "all",
    "transfer": "transfer",
    "deposit": "deposit",
    "withdrawal": "withdrawal",
}

DATE_RANGE_MAP = {
    "today": {"today"},
    "this week": {"this_week", "week"},
    "this month": {"this_month", "month"},
    "the last three months": {"last_3_months", "3months"},
    "the last 3 months": {"last_3_months", "3months"},
    "the last 6 months": {"last_6_months", "6months"},
    "this year": {"this_year", "year"},
    "all time": {"all_time", "all"},
}


def _extract_type_filter(form_data, ui_store):
    """Search multiple locations for the active type filter value."""
    active = (
        form_data.get("selectedFilter", "")
        or form_data.get("filterType", "")
        or form_data.get("activeFilter", "")
    )

    if not active:
        tx_filter = ui_store.get("transactionFilter", {})
        if isinstance(tx_filter, dict):
            active = tx_filter.get("activeFilter", "")

    if not active:
        active = ui_store.get("activeTransactionFilter", "")

    return active.lower() if active else ""


def _extract_date_filter(form_data, ui_store):
    """Search multiple locations for the active date range value."""
    active = (
        form_data.get("dateRange", "")
        or form_data.get("selectedDateRange", "")
        or form_data.get("activeDateRange", "")
    )

    if not active:
        active = ui_store.get("transactionDateFilter", "")

    if not active:
        date_filter = ui_store.get("transactionFilter", {})
        if isinstance(date_filter, dict):
            active = date_filter.get("dateRange", "")

    if not active:
        active = ui_store.get("activeDateFilter", "")

    return active.lower() if active else ""


class FilterTransactionsByTypeAndDateScenario(PaymentScenario, ComposableScenario):
    """Verify the user applied both type and date range filters on transactions."""

    def _get_checks(self, state_path):
        filter_type = getattr(self, "filter_type", None)
        date_range = getattr(self, "date_range", None)
        if not filter_type:
            raise ValueError("filter_type parameter is required")
        if not date_range:
            raise ValueError("date_range parameter is required")

        expected_type = TYPE_FILTER_MAP.get(filter_type.lower())
        if expected_type is None:
            raise ValueError(
                f"Unknown filter_type '{filter_type}'. "
                f"Valid values: {list(TYPE_FILTER_MAP.keys())}"
            )

        expected_dates = DATE_RANGE_MAP.get(date_range.lower())
        if expected_dates is None:
            raise ValueError(
                f"Unknown date_range '{date_range}'. "
                f"Valid values: {list(DATE_RANGE_MAP.keys())}"
            )

        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            logger.warning("rootstore.json not found at %s", rootstore_path)
            return {
                "on_transactions_screen": False,
                "type_filter_applied": False,
                "date_filter_applied": False,
            }

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            return {
                "on_transactions_screen": False,
                "type_filter_applied": False,
                "date_filter_applied": False,
            }

        screen_name = current_session.get("data", {}).get("screenName", "")
        route = current_session.get("data", {}).get("route", "")

        on_transactions = (
            "transaction" in screen_name.lower()
            or "transaction" in route.lower()
        )

        form_data = (
            current_session.get("data", {})
            .get("sessionData", {})
            .get("formData", {})
        )
        ui_store = rootstore.get("uiStore", {})

        actual_type = _extract_type_filter(form_data, ui_store)
        actual_date = _extract_date_filter(form_data, ui_store)

        if expected_type == "all":
            type_matches = not actual_type or actual_type == "all"
        else:
            type_matches = actual_type == expected_type

        date_matches = actual_date in expected_dates

        logger.info(
            "on_transactions=%s, type expected=%s actual=%s match=%s, "
            "date expected=%s actual=%s match=%s",
            on_transactions,
            expected_type, actual_type, type_matches,
            sorted(expected_dates), actual_date, date_matches,
        )
        return {
            "on_transactions_screen": on_transactions,
            "type_filter_applied": type_matches,
            "date_filter_applied": date_matches,
        }
