# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ShowCreditCardNumberScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.banking.show_credit_card_number.scenario import (
    ShowCreditCardNumberScenario,
)


def _create_state(tmpdir, credit_cards=None, rootstore_extra=None, user_id=1):
    state_name = os.path.basename(tmpdir)
    db_path = os.path.join(tmpdir, f"{state_name}.db")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        "CREATE TABLE credit_cards ("
        "id INTEGER PRIMARY KEY, user_id INTEGER, linked_checking_account_id INTEGER, "
        "card_number TEXT, last_four_digits TEXT, cardholder_name TEXT, "
        "expiry_month INTEGER, expiry_year INTEGER, cvv TEXT, "
        "credit_limit REAL, current_balance REAL, available_credit REAL, "
        "apr REAL, annual_fee REAL, cash_advance_fee_percent REAL, "
        "late_payment_fee REAL, payment_due_day INTEGER, "
        "minimum_payment_percent REAL, statement_closing_day INTEGER, "
        "autopay_enabled INTEGER, autopay_amount TEXT, status TEXT, "
        "opened_date TEXT, last_payment_date TEXT, last_statement_date TEXT, "
        "created_at TEXT)"
    )
    for cc in (credit_cards or []):
        cur.execute(
            "INSERT INTO credit_cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            cc,
        )
    conn.commit()
    conn.close()

    rootstore = {
        "userStore": {"currentUser": {"id": user_id}},
        "sessionStore": {
            "session": {"data": {"screenName": "cards", "route": "/cards"}}
        },
        "bankingStore": {"visibleCardDetails": {"1": True}},
    }
    if rootstore_extra:
        rootstore.update(rootstore_extra)

    with open(os.path.join(tmpdir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)
    return tmpdir


_CARD = (
    1, 1, None, "4532018276001234", "1234", "Test User",
    12, 2028, "321", 15000.0, 0.0, 15000.0,
    19.99, 0.0, 5.0, 35.0, 15, 2.0, 1, 0, "minimum", "active",
    "2026-02-24", None, None, "2026-02-24",
)


class _Stub(ShowCreditCardNumberScenario):
    def __init__(self):
        pass


class TestShowCreditCardNumber(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.scenario = _Stub()
        self.scenario.current_user_id = 1
        from digiworld.scenarios.state_manager import StateManager
        self.scenario._state_manager = StateManager(self.scenario)

    def test_pass_all_checks(self):
        state_dir = os.path.join(self.tmpdir, "state_pass")
        os.makedirs(state_dir)
        _create_state(state_dir, credit_cards=[_CARD])
        self.scenario.agent_answer = "The card number is 4532018276001234"
        checks = self.scenario._get_checks(state_dir)
        self.assertTrue(checks["on_cards_screen"])
        self.assertTrue(checks["card_details_visible"])
        self.assertTrue(checks["answer_contains_card_number"])

    def test_fail_wrong_screen(self):
        state_dir = os.path.join(self.tmpdir, "state_wrong_screen")
        os.makedirs(state_dir)
        _create_state(
            state_dir,
            credit_cards=[_CARD],
            rootstore_extra={
                "sessionStore": {
                    "session": {"data": {"screenName": "home", "route": "/home"}}
                },
            },
        )
        self.scenario.agent_answer = "4532018276001234"
        checks = self.scenario._get_checks(state_dir)
        self.assertFalse(checks["on_cards_screen"])

    def test_fail_card_not_visible(self):
        state_dir = os.path.join(self.tmpdir, "state_hidden")
        os.makedirs(state_dir)
        _create_state(
            state_dir,
            credit_cards=[_CARD],
            rootstore_extra={
                "bankingStore": {"visibleCardDetails": {}},
            },
        )
        self.scenario.agent_answer = "4532018276001234"
        checks = self.scenario._get_checks(state_dir)
        self.assertFalse(checks["card_details_visible"])

    def test_fail_wrong_answer(self):
        state_dir = os.path.join(self.tmpdir, "state_wrong_answer")
        os.makedirs(state_dir)
        _create_state(state_dir, credit_cards=[_CARD])
        self.scenario.agent_answer = "The card number is 9999888877776666"
        checks = self.scenario._get_checks(state_dir)
        self.assertFalse(checks["answer_contains_card_number"])


if __name__ == "__main__":
    unittest.main()
