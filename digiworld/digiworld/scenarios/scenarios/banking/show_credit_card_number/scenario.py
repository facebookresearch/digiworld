# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class ShowCreditCardNumberScenario(BankingScenario, ComposableScenario):
    """Verify the agent navigated to the cards screen, revealed card details,
    and reported the full card number."""

    def _get_checks(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {state_path}")

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        on_cards_screen = False
        if current_session:
            screen_name = current_session.get("data", {}).get("screenName", "").lower()
            route = current_session.get("data", {}).get("route", "").lower()
            on_cards_screen = "cards" in screen_name or "/cards" in route

        banking_store = rootstore.get("bankingStore", {})
        visible_cards = banking_store.get("visibleCardDetails", {})
        card_visible = any(
            v is True or v == 1 for v in visible_cards.values()
        ) if isinstance(visible_cards, dict) else False

        query = (
            "SELECT card_number FROM credit_cards "
            "WHERE user_id = ? AND status = 'active' "
            "ORDER BY id ASC LIMIT 1"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id,), state_path
        )
        if not rows:
            raise ValueError("No active credit card found for user")

        full_card_number = rows[0][0]
        answer_ok = substring_match(self.agent_answer, full_card_number)

        logger.info(
            f"Show card number check: on_cards={on_cards_screen}, "
            f"visible={card_visible}, answer_ok={answer_ok}"
        )

        return {
            "on_cards_screen": on_cards_screen,
            "card_details_visible": card_visible,
            "answer_contains_card_number": answer_ok,
        }
