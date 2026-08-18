# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for PayPendingBillScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.banking.pay_pending_bill.scenario import (
    PayPendingBillScenario,
)


def _create_state(tmpdir, bills=None, user_id=1):
    state_name = os.path.basename(tmpdir)
    db_path = os.path.join(tmpdir, f"{state_name}.db")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
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


def _bill(bill_id, amount, status="pending"):
    return (
        bill_id, 1, 1, None, None, amount, "2026-03-01", None, 0, 30,
        None, 0, None, None, status, None, None, 0.0,
        "2026-02-24", "2026-02-24",
    )


class _Stub(PayPendingBillScenario):
    def __init__(self):
        pass


class TestPayPendingBill(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.initial_dir = os.path.join(self.tmpdir, "initial")
        os.makedirs(self.initial_dir)
        _create_state(self.initial_dir, bills=[
            _bill(1, 50.0),
            _bill(2, 200.0),
            _bill(3, 350.0),
        ])

        self.scenario = _Stub()
        self.scenario.current_user_id = 1
        self.scenario.initial_state_path = self.initial_dir
        from digiworld.scenarios.state_manager import StateManager
        self.scenario._state_manager = StateManager(self.scenario)

    def test_pass_most_expensive(self):
        final_dir = os.path.join(self.tmpdir, "final_most")
        os.makedirs(final_dir)
        _create_state(final_dir, bills=[
            _bill(1, 50.0, "pending"),
            _bill(2, 200.0, "pending"),
            _bill(3, 350.0, "paid"),
        ])
        self.scenario.selection_criteria = "most expensive"
        checks = self.scenario._get_checks(final_dir)
        self.assertTrue(checks["correct_bill_paid"])

    def test_pass_least_expensive(self):
        final_dir = os.path.join(self.tmpdir, "final_least")
        os.makedirs(final_dir)
        _create_state(final_dir, bills=[
            _bill(1, 50.0, "paid"),
            _bill(2, 200.0, "pending"),
            _bill(3, 350.0, "pending"),
        ])
        self.scenario.selection_criteria = "least expensive"
        checks = self.scenario._get_checks(final_dir)
        self.assertTrue(checks["correct_bill_paid"])

    def test_fail_wrong_bill_paid(self):
        final_dir = os.path.join(self.tmpdir, "final_wrong")
        os.makedirs(final_dir)
        _create_state(final_dir, bills=[
            _bill(1, 50.0, "paid"),
            _bill(2, 200.0, "pending"),
            _bill(3, 350.0, "pending"),
        ])
        self.scenario.selection_criteria = "most expensive"
        checks = self.scenario._get_checks(final_dir)
        self.assertFalse(checks["correct_bill_paid"])

    def test_fail_nothing_paid(self):
        final_dir = os.path.join(self.tmpdir, "final_nopay")
        os.makedirs(final_dir)
        _create_state(final_dir, bills=[
            _bill(1, 50.0, "pending"),
            _bill(2, 200.0, "pending"),
            _bill(3, 350.0, "pending"),
        ])
        self.scenario.selection_criteria = "most expensive"
        checks = self.scenario._get_checks(final_dir)
        self.assertFalse(checks["correct_bill_paid"])

    def test_no_pending_bills_raises(self):
        empty_dir = os.path.join(self.tmpdir, "empty")
        os.makedirs(empty_dir)
        _create_state(empty_dir, bills=[])
        self.scenario.initial_state_path = empty_dir
        self.scenario.selection_criteria = "most expensive"
        with self.assertRaises(ValueError):
            self.scenario._get_checks(empty_dir)


if __name__ == "__main__":
    unittest.main()
