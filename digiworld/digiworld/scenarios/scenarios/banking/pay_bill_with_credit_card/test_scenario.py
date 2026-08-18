# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for PayBillWithCreditCardScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.banking.pay_bill_with_credit_card.scenario import (
    PayBillWithCreditCardScenario,
)


def _create_state(tmpdir, billers=None, transactions=None, bills=None, user_id=1):
    state_name = os.path.basename(tmpdir)
    db_path = os.path.join(tmpdir, f"{state_name}.db")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        "CREATE TABLE billers ("
        "id INTEGER PRIMARY KEY, code TEXT, name TEXT, category TEXT, "
        "subcategory TEXT, description TEXT, logo_url TEXT, website TEXT, "
        "phone TEXT, address TEXT, is_searchable INTEGER, "
        "search_success_rate REAL, requires_account_number INTEGER, "
        "accepts_credit_card INTEGER, accepts_bank_account INTEGER, "
        "min_payment_amount REAL, average_bill_amount REAL, "
        "payment_processing_days INTEGER, is_active INTEGER, created_at TEXT)"
    )
    for b in (billers or []):
        cur.execute("INSERT INTO billers VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", b)

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

    cur.execute(
        "CREATE TABLE bills ("
        "id INTEGER PRIMARY KEY, user_id INTEGER, biller_id INTEGER, "
        "account_id INTEGER, bill_number TEXT, amount REAL, due_date TEXT, "
        "due_day INTEGER, is_recurring INTEGER, recurrence_interval INTEGER, "
        "next_due_date TEXT, auto_pay_enabled INTEGER, auto_pay_account_id INTEGER, "
        "minimum_payment_amount REAL, status TEXT, paid_date TEXT, "
        "paid_amount REAL, late_fee REAL, created_at TEXT, updated_at TEXT)"
    )
    for bl in (bills or []):
        cur.execute(
            "INSERT INTO bills VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            bl,
        )
    conn.commit()
    conn.close()

    rootstore = {
        "userStore": {"currentUser": {"id": user_id}},
        "sessionStore": {
            "session": {"data": {"screenName": "home", "route": "/home"}}
        },
    }
    with open(os.path.join(tmpdir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)
    return tmpdir


_BILLER = (1, "city_power", "City Power Co", "utilities", None, None, None, None,
           None, None, 1, 1.0, 1, 1, 1, 1.0, 150.0, 1, 1, "2026-01-01")


class _Stub(PayBillWithCreditCardScenario):
    def __init__(self):
        pass


class TestPayBillWithCreditCard(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.scenario = _Stub()
        self.scenario.current_user_id = 1
        from digiworld.scenarios.state_manager import StateManager
        self.scenario._state_manager = StateManager(self.scenario)

    def test_pass_with_transaction(self):
        state_dir = os.path.join(self.tmpdir, "state_tx")
        os.makedirs(state_dir)
        tx = (1, 1, 4, 1, 1, None, 1, None, None, None, 1,
              150.0, 0.0, 5000.0, 4850.0, "REF-1", "CONF-1",
              "Bill payment", "pay", 1, "2026-02-24", "2026-02-24",
              None, "success", None, None, None, None, "2026-02-24")
        _create_state(state_dir, billers=[_BILLER], transactions=[tx])
        self.scenario.payee = "City Power Co"
        checks = self.scenario._get_checks(state_dir)
        self.assertTrue(checks["payment_executed"])

    def test_pass_with_bill_paid(self):
        state_dir = os.path.join(self.tmpdir, "state_bill")
        os.makedirs(state_dir)
        bill = (1, 1, 1, None, None, 150.0, "2026-03-01", None, 0, 30,
                None, 0, None, None, "paid", "2026-02-24", 150.0, 0.0,
                "2026-02-24", "2026-02-24")
        tx = (1, 1, 2, 1, 1, None, 1, 1, None, None, 1,
              150.0, 0.0, 5000.0, 4850.0, "REF-1", "CONF-1",
              "Bill payment", "pay", 1, "2026-02-24", "2026-02-24",
              None, "success", None, None, None, None, "2026-02-24")
        _create_state(state_dir, billers=[_BILLER], bills=[bill], transactions=[tx])
        self.scenario.payee = "City Power Co"
        checks = self.scenario._get_checks(state_dir)
        self.assertTrue(checks["payment_executed"])

    def test_fail_bill_paid_without_cc(self):
        state_dir = os.path.join(self.tmpdir, "state_no_cc")
        os.makedirs(state_dir)
        bill = (1, 1, 1, None, None, 150.0, "2026-03-01", None, 0, 30,
                None, 0, None, None, "paid", "2026-02-24", 150.0, 0.0,
                "2026-02-24", "2026-02-24")
        _create_state(state_dir, billers=[_BILLER], bills=[bill])
        self.scenario.payee = "City Power Co"
        checks = self.scenario._get_checks(state_dir)
        self.assertFalse(checks["payment_executed"])

    def test_fail_no_payment(self):
        state_dir = os.path.join(self.tmpdir, "state_empty")
        os.makedirs(state_dir)
        _create_state(state_dir, billers=[_BILLER])
        self.scenario.payee = "City Power Co"
        checks = self.scenario._get_checks(state_dir)
        self.assertFalse(checks["payment_executed"])


if __name__ == "__main__":
    unittest.main()
