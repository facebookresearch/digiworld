# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for SchedulePaymentScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.banking.schedule_payment.scenario import (
    SchedulePaymentScenario,
)


def _create_state(
    tmpdir, billers=None, scheduled_transactions=None, user_id=1
):
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
        "payment_processing_days INTEGER, is_active INTEGER, "
        "created_at TEXT)"
    )
    cur.execute(
        "CREATE TABLE scheduled_transactions ("
        "id INTEGER PRIMARY KEY, user_id INTEGER, transaction_type_id INTEGER, "
        "from_account_id INTEGER, to_account_id INTEGER, biller_id INTEGER, "
        "beneficiary_id INTEGER, amount REAL, scheduled_date TEXT, "
        "is_recurring INTEGER, recurrence_frequency TEXT, recurrence_end_date TEXT, "
        "description TEXT, memo TEXT, status TEXT, "
        "processed_transaction_id INTEGER, created_at TEXT, updated_at TEXT)"
    )
    for b in billers or []:
        cur.execute(
            "INSERT INTO billers (id, code, name, category) VALUES (?,?,?,?)",
            b,
        )
    for st in scheduled_transactions or []:
        cur.execute(
            "INSERT INTO scheduled_transactions VALUES "
            "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            st,
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


class _Stub(SchedulePaymentScenario):
    def __init__(self):
        pass


class TestSchedulePayment(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.initial_dir = os.path.join(self.tmpdir, "initial")
        os.makedirs(self.initial_dir)
        _create_state(self.initial_dir, billers=[(100, "CPCO", "City Power Co", "utilities")])

        self.scenario = _Stub()
        self.scenario.current_user_id = 1
        self.scenario.initial_state_path = self.initial_dir
        from digiworld.scenarios.state_manager import StateManager
        self.scenario._state_manager = StateManager(self.scenario)

    def test_pass_when_scheduled(self):
        final_dir = os.path.join(self.tmpdir, "final")
        os.makedirs(final_dir)
        _create_state(
            final_dir,
            billers=[(100, "CPCO", "City Power Co", "utilities")],
            scheduled_transactions=[
                (1, 1, 4, 1, None, 100, None, 150.00, "2026-03-15", 0,
                 None, None, "Scheduled bill payment", "Monthly bill",
                 "scheduled", None, "2026-02-24", "2026-02-24"),
            ],
        )
        self.scenario.payee = "City Power Co"
        self.scenario.amount = "150.00"
        self.scenario.date = "2026-03-15"
        self.scenario.note = "Monthly bill"
        checks = self.scenario._get_checks(final_dir)
        self.assertTrue(checks["scheduled_transaction_exists"])
        self.assertTrue(checks["amount_matches"])
        self.assertTrue(checks["date_matches"])
        self.assertTrue(checks["memo_matches"])

    def test_fail_when_no_scheduled(self):
        final_dir = os.path.join(self.tmpdir, "final_empty")
        os.makedirs(final_dir)
        _create_state(
            final_dir,
            billers=[(100, "CPCO", "City Power Co", "utilities")],
        )
        self.scenario.payee = "City Power Co"
        self.scenario.amount = "150.00"
        self.scenario.date = None
        self.scenario.note = None
        checks = self.scenario._get_checks(final_dir)
        self.assertFalse(checks["scheduled_transaction_exists"])
        self.assertFalse(checks["amount_matches"])

    def test_fail_when_no_biller(self):
        final_dir = os.path.join(self.tmpdir, "final_no_biller")
        os.makedirs(final_dir)
        _create_state(final_dir)
        self.scenario.payee = "Nonexistent Corp"
        self.scenario.amount = "100.00"
        self.scenario.date = None
        self.scenario.note = None
        checks = self.scenario._get_checks(final_dir)
        self.assertFalse(checks["scheduled_transaction_exists"])
        self.assertFalse(checks["amount_matches"])

    def test_fail_when_wrong_amount(self):
        final_dir = os.path.join(self.tmpdir, "final_wrong")
        os.makedirs(final_dir)
        _create_state(
            final_dir,
            billers=[(100, "CPCO", "City Power Co", "utilities")],
            scheduled_transactions=[
                (1, 1, 4, 1, None, 100, None, 999.99, "2026-03-15", 0,
                 None, None, "Scheduled bill payment", "Monthly bill",
                 "scheduled", None, "2026-02-24", "2026-02-24"),
            ],
        )
        self.scenario.payee = "City Power Co"
        self.scenario.amount = "150.00"
        self.scenario.date = None
        self.scenario.note = None
        checks = self.scenario._get_checks(final_dir)
        self.assertTrue(checks["scheduled_transaction_exists"])
        self.assertFalse(checks["amount_matches"])

    def test_fail_when_wrong_date(self):
        final_dir = os.path.join(self.tmpdir, "final_date")
        os.makedirs(final_dir)
        _create_state(
            final_dir,
            billers=[(100, "CPCO", "City Power Co", "utilities")],
            scheduled_transactions=[
                (1, 1, 4, 1, None, 100, None, 150.00, "2026-03-15", 0,
                 None, None, "Scheduled bill payment", "Monthly bill",
                 "scheduled", None, "2026-02-24", "2026-02-24"),
            ],
        )
        self.scenario.payee = "City Power Co"
        self.scenario.amount = "150.00"
        self.scenario.date = "2026-04-01"
        self.scenario.note = "Monthly bill"
        checks = self.scenario._get_checks(final_dir)
        self.assertTrue(checks["scheduled_transaction_exists"])
        self.assertTrue(checks["amount_matches"])
        self.assertFalse(checks["date_matches"])
        self.assertTrue(checks["memo_matches"])

    def test_fail_when_wrong_memo(self):
        final_dir = os.path.join(self.tmpdir, "final_memo")
        os.makedirs(final_dir)
        _create_state(
            final_dir,
            billers=[(100, "CPCO", "City Power Co", "utilities")],
            scheduled_transactions=[
                (1, 1, 4, 1, None, 100, None, 150.00, "2026-03-15", 0,
                 None, None, "Scheduled bill payment", "",
                 "scheduled", None, "2026-02-24", "2026-02-24"),
            ],
        )
        self.scenario.payee = "City Power Co"
        self.scenario.amount = "150.00"
        self.scenario.date = "2026-03-15"
        self.scenario.note = "Monthly bill"
        checks = self.scenario._get_checks(final_dir)
        self.assertTrue(checks["scheduled_transaction_exists"])
        self.assertTrue(checks["amount_matches"])
        self.assertTrue(checks["date_matches"])
        self.assertFalse(checks["memo_matches"])

    def test_missing_payee_raises(self):
        self.scenario.payee = None
        self.scenario.amount = "100"
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.initial_dir)

    def test_partial_name_match(self):
        final_dir = os.path.join(self.tmpdir, "final_partial")
        os.makedirs(final_dir)
        _create_state(
            final_dir,
            billers=[(200, "SWG", "Southwest Gas Corporation", "utilities")],
            scheduled_transactions=[
                (1, 1, 4, 1, None, 200, None, 85.00, "2026-03-20", 0,
                 None, None, "Gas payment", "March gas bill",
                 "scheduled", None, "2026-02-24", "2026-02-24"),
            ],
        )
        self.scenario.payee = "Southwest Gas"
        self.scenario.amount = "85.00"
        self.scenario.date = "2026-03-20"
        self.scenario.note = "March gas bill"
        checks = self.scenario._get_checks(final_dir)
        self.assertTrue(checks["scheduled_transaction_exists"])
        self.assertTrue(checks["amount_matches"])
        self.assertTrue(checks["date_matches"])
        self.assertTrue(checks["memo_matches"])


if __name__ == "__main__":
    unittest.main()
