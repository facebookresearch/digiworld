# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for SchedulePaymentWithCreditCardScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.banking.schedule_payment_with_credit_card.scenario import (
    SchedulePaymentWithCreditCardScenario,
)


def _create_state(tmpdir, billers=None, bills=None,
                  scheduled_transactions=None, credit_cards=None, user_id=1):
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

    cur.execute(
        "CREATE TABLE scheduled_transactions ("
        "id INTEGER PRIMARY KEY, user_id INTEGER, transaction_type_id INTEGER, "
        "from_account_id INTEGER, to_account_id INTEGER, biller_id INTEGER, "
        "beneficiary_id INTEGER, amount REAL, scheduled_date TEXT, "
        "is_recurring INTEGER, recurrence_frequency TEXT, recurrence_end_date TEXT, "
        "description TEXT, memo TEXT, status TEXT, "
        "processed_transaction_id INTEGER, created_at TEXT, updated_at TEXT)"
    )
    for st in (scheduled_transactions or []):
        cur.execute(
            "INSERT INTO scheduled_transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            st,
        )

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
            "session": {"data": {"screenName": "home", "route": "/home"}}
        },
    }
    with open(os.path.join(tmpdir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)
    return tmpdir


_BILLER = (1, "city_power", "City Power Co", "utilities", None, None, None, None,
           None, None, 1, 1.0, 1, 1, 1, 1.0, 150.0, 1, 1, "2026-01-01")

_CREDIT_CARD = (
    1, 1, None, "4532018276001234", "1234", "Test User",
    12, 2028, "321", 10000.0, 500.0, 9500.0,
    19.99, 0.0, 5.0, 35.0, 15, 2.0, 1, 0, "minimum", "active",
    "2026-01-01", None, None, "2026-01-01",
)


class _Stub(SchedulePaymentWithCreditCardScenario):
    def __init__(self):
        pass


class TestSchedulePaymentWithCC(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.initial_dir = os.path.join(self.tmpdir, "initial")
        os.makedirs(self.initial_dir)
        bills = [
            (1, 1, 1, None, None, 100.0, "2026-03-01", None, 0, 30,
             None, 0, None, None, "pending", None, None, 0.0,
             "2026-02-24", "2026-02-24"),
            (2, 1, 1, None, None, 200.0, "2026-03-15", None, 0, 30,
             None, 0, None, None, "pending", None, None, 0.0,
             "2026-02-24", "2026-02-24"),
        ]
        _create_state(self.initial_dir, billers=[_BILLER], bills=bills)

        self.scenario = _Stub()
        self.scenario.current_user_id = 1
        self.scenario.note = "Scheduled via credit card"
        self.scenario.initial_state_path = self.initial_dir
        from digiworld.scenarios.state_manager import StateManager
        self.scenario._state_manager = StateManager(self.scenario)

    def test_pass_correct_average(self):
        final_dir = os.path.join(self.tmpdir, "final")
        os.makedirs(final_dir)
        _create_state(
            final_dir,
            billers=[_BILLER],
            credit_cards=[_CREDIT_CARD],
            scheduled_transactions=[
                (1, 1, 4, None, None, 1, None, 150.0, "2026-03-20", 0,
                 None, None, "Payment to City Power Co",
                 "Scheduled via credit card", "scheduled",
                 None, "2026-02-24", "2026-02-24"),
            ],
        )
        self.scenario.payee = "City Power Co"
        checks = self.scenario._get_checks(final_dir)
        self.assertTrue(checks["scheduled_payment_exists"])
        self.assertTrue(checks["average_amount_matches"])
        self.assertTrue(checks["credit_card_available"])
        self.assertTrue(checks["memo_matches"])

    def test_pass_with_amount_parameter(self):
        final_dir = os.path.join(self.tmpdir, "final_param_amount")
        os.makedirs(final_dir)
        _create_state(
            final_dir,
            billers=[_BILLER],
            credit_cards=[_CREDIT_CARD],
            scheduled_transactions=[
                (1, 1, 4, None, None, 1, None, 150.0, "2026-03-20", 0,
                 None, None, "Scheduled via credit card",
                 "Scheduled via credit card", "scheduled",
                 None, "2026-02-24", "2026-02-24"),
            ],
        )
        self.scenario.payee = "City Power Co"
        self.scenario.amount = "150.0"
        checks = self.scenario._get_checks(final_dir)
        self.assertTrue(checks["scheduled_payment_exists"])
        self.assertTrue(checks["average_amount_matches"])

    def test_pass_when_description_is_note_only_but_biller_id_matches(self):
        final_dir = os.path.join(self.tmpdir, "final_note_only_desc")
        os.makedirs(final_dir)
        _create_state(
            final_dir,
            billers=[_BILLER],
            credit_cards=[_CREDIT_CARD],
            scheduled_transactions=[
                (1, 1, 4, None, None, 1, None, 150.0, "2026-03-20", 0,
                 None, None, "Scheduled via credit card",
                 "Scheduled via credit card", "scheduled",
                 None, "2026-02-24", "2026-02-24"),
            ],
        )
        self.scenario.payee = "City Power Co"
        checks = self.scenario._get_checks(final_dir)
        self.assertTrue(checks["scheduled_payment_exists"])
        self.assertTrue(checks["average_amount_matches"])
        self.assertTrue(checks["memo_matches"])

    def test_fail_wrong_amount(self):
        final_dir = os.path.join(self.tmpdir, "final_wrong")
        os.makedirs(final_dir)
        _create_state(
            final_dir,
            billers=[_BILLER],
            credit_cards=[_CREDIT_CARD],
            scheduled_transactions=[
                (1, 1, 4, None, None, 1, None, 999.0, "2026-03-20", 0,
                 None, None, "Payment to City Power Co",
                 "Scheduled via credit card", "scheduled",
                 None, "2026-02-24", "2026-02-24"),
            ],
        )
        self.scenario.payee = "City Power Co"
        checks = self.scenario._get_checks(final_dir)
        self.assertTrue(checks["scheduled_payment_exists"])
        self.assertFalse(checks["average_amount_matches"])

    def test_fail_no_scheduled(self):
        final_dir = os.path.join(self.tmpdir, "final_empty")
        os.makedirs(final_dir)
        _create_state(final_dir, billers=[_BILLER], credit_cards=[_CREDIT_CARD])
        self.scenario.payee = "City Power Co"
        checks = self.scenario._get_checks(final_dir)
        self.assertFalse(checks["scheduled_payment_exists"])


if __name__ == "__main__":
    unittest.main()
