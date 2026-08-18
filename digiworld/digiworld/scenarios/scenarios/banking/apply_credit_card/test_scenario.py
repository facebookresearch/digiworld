# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ApplyCreditCardScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.banking.apply_credit_card.scenario import (
    ApplyCreditCardScenario,
)


def _create_state(tmpdir, credit_cards=None, user_id=1):
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
    }
    with open(os.path.join(tmpdir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)
    return tmpdir


_CARD = (
    1, 1, None, "4532018276001234", "1234", "Test User",
    12, 2028, "321", 15000.0, 0.0, 15000.0,
    19.99, 0.0, 5.0, 35.0, 15, 2.0, 1, 0, "minimum", "active",
    "2026-02-24", None, None, "2026-02-24",
)


class _Stub(ApplyCreditCardScenario):
    def __init__(self):
        pass


class TestApplyCreditCard(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.initial_dir = os.path.join(self.tmpdir, "initial")
        os.makedirs(self.initial_dir)
        _create_state(self.initial_dir)

        self.scenario = _Stub()
        self.scenario.current_user_id = 1
        self.scenario.initial_state_path = self.initial_dir
        from digiworld.scenarios.state_manager import StateManager
        self.scenario._state_manager = StateManager(self.scenario)

    def test_pass_last_four_digits(self):
        final_dir = os.path.join(self.tmpdir, "final")
        os.makedirs(final_dir)
        _create_state(final_dir, credit_cards=[_CARD])
        self.scenario.info_field = "last four digits"
        self.scenario.agent_answer = "The last four digits are 1234"
        checks = self.scenario._get_checks(final_dir)
        self.assertTrue(checks["card_created"])
        self.assertTrue(checks["answer_matches"])

    def test_pass_credit_limit(self):
        final_dir = os.path.join(self.tmpdir, "final_limit")
        os.makedirs(final_dir)
        _create_state(final_dir, credit_cards=[_CARD])
        self.scenario.info_field = "total credit limit"
        self.scenario.agent_answer = "Your credit limit is $15,000.00"
        checks = self.scenario._get_checks(final_dir)
        self.assertTrue(checks["card_created"])
        self.assertTrue(checks["answer_matches"])

    def test_fail_no_card_created(self):
        final_dir = os.path.join(self.tmpdir, "final_empty")
        os.makedirs(final_dir)
        _create_state(final_dir)
        self.scenario.info_field = "CVV"
        self.scenario.agent_answer = "321"
        checks = self.scenario._get_checks(final_dir)
        self.assertFalse(checks["card_created"])

    def test_fail_wrong_answer(self):
        final_dir = os.path.join(self.tmpdir, "final_wrong")
        os.makedirs(final_dir)
        _create_state(final_dir, credit_cards=[_CARD])
        self.scenario.info_field = "CVV"
        self.scenario.agent_answer = "The CVV is 999"
        checks = self.scenario._get_checks(final_dir)
        self.assertTrue(checks["card_created"])
        self.assertFalse(checks["answer_matches"])


if __name__ == "__main__":
    unittest.main()
