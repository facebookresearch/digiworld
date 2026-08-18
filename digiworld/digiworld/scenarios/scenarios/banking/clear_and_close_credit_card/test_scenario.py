# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ClearAndCloseCreditCardScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.banking.clear_and_close_credit_card.scenario import (
    ClearAndCloseCreditCardScenario,
)


def _create_state(tmpdir, credit_cards=None, transactions=None, user_id=1):
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

    cur.execute(
        "CREATE TABLE transactions ("
        "id INTEGER PRIMARY KEY, session_id INTEGER, transaction_type_id INTEGER, "
        "user_id INTEGER, from_account_id INTEGER, to_account_id INTEGER, "
        "biller_id INTEGER, bill_id INTEGER, beneficiary_id INTEGER, "
        "zelle_contact_id INTEGER, credit_card_id INTEGER, "
        "amount REAL, fee REAL, balance_before REAL, balance_after REAL, "
        "reference_id TEXT, confirmation_number TEXT, description TEXT, "
        "memo TEXT, day INTEGER, transaction_date TEXT, posted_date TEXT, "
        "pending_until TEXT, status TEXT, failure_reason TEXT, "
        "error_code TEXT, error_message TEXT, metadata TEXT, created_at TEXT)"
    )
    for t in (transactions or []):
        cur.execute(
            "INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            t,
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


def _card_tuple(card_id, balance, status="active", last4="5678"):
    return (
        card_id, 1, None, f"453201827600{last4}", last4, "Test User",
        12, 2028, "321", 10000.0, balance, 10000.0 - balance,
        19.99, 0.0, 5.0, 35.0, 15, 2.0, 1, 0, "minimum", status,
        "2026-01-01", None, None, "2026-01-01",
    )


class _Stub(ClearAndCloseCreditCardScenario):
    def __init__(self):
        pass


class TestClearAndCloseCreditCard(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.initial_dir = os.path.join(self.tmpdir, "initial")
        os.makedirs(self.initial_dir)
        _create_state(self.initial_dir, credit_cards=[_card_tuple(1, 250.0)])

        self.scenario = _Stub()
        self.scenario.current_user_id = 1
        self.scenario.last4 = "5678"
        self.scenario.initial_state_path = self.initial_dir
        from digiworld.scenarios.state_manager import StateManager
        self.scenario._state_manager = StateManager(self.scenario)

    def test_pass_cleared_and_closed(self):
        final_dir = os.path.join(self.tmpdir, "final")
        os.makedirs(final_dir)
        payment_tx = (
            1, 1, 8, 1, 1, None, None, None, None, None, 1,
            250.0, 0.0, 5000.0, 4750.0, "REF-1", "CONF-1",
            "CC Payment", "clear", 1, "2026-02-24", "2026-02-24",
            None, "success", None, None, None, None, "2026-02-24",
        )
        _create_state(
            final_dir,
            credit_cards=[_card_tuple(1, 0.0, status="closed")],
            transactions=[payment_tx],
        )
        checks = self.scenario._get_checks(final_dir)
        self.assertTrue(checks["balance_cleared"])
        self.assertTrue(checks["card_closed"])
        self.assertTrue(checks["payment_made"])

    def test_fail_not_closed(self):
        final_dir = os.path.join(self.tmpdir, "final_open")
        os.makedirs(final_dir)
        _create_state(
            final_dir,
            credit_cards=[_card_tuple(1, 0.0, status="active")],
        )
        checks = self.scenario._get_checks(final_dir)
        self.assertTrue(checks["balance_cleared"])
        self.assertFalse(checks["card_closed"])

    def test_fail_balance_not_cleared(self):
        final_dir = os.path.join(self.tmpdir, "final_balance")
        os.makedirs(final_dir)
        _create_state(
            final_dir,
            credit_cards=[_card_tuple(1, 100.0, status="closed")],
        )
        checks = self.scenario._get_checks(final_dir)
        self.assertFalse(checks["balance_cleared"])

    def test_missing_last4_raises(self):
        self.scenario.last4 = None
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.initial_dir)


if __name__ == "__main__":
    unittest.main()
