# Copyright (c) Meta Platforms, Inc. and affiliates.
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import TotalInOutForPeriodScenario

TABLES_SQL = [
    (
        "CREATE TABLE wallets ("
        "id INTEGER PRIMARY KEY, user_id INTEGER, balance REAL, "
        "currency TEXT, type TEXT, status TEXT, "
        "created_at TEXT, updated_at TEXT)"
    ),
    (
        "CREATE TABLE transactions ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "sender_wallet_id INTEGER, receiver_wallet_id INTEGER, "
        "amount REAL, currency TEXT, status TEXT, type TEXT, "
        "pin_verified INTEGER, pin_verified_at TEXT, "
        "reference TEXT, description TEXT, created_at TEXT, updated_at TEXT)"
    ),
]

INSERT_WALLET = "INSERT INTO wallets VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
INSERT_TX = (
    "INSERT INTO transactions "
    "(sender_wallet_id, receiver_wallet_id, amount, currency, status, type, "
    "pin_verified, pin_verified_at, reference, description, created_at, updated_at) "
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
)


def _make_db(tmp_dir, wallet_rows, tx_rows, db_name="default.db"):
    db_path = os.path.join(tmp_dir, db_name)
    conn = sqlite3.connect(db_path)
    for sql in TABLES_SQL:
        conn.execute(sql)
    for row in wallet_rows:
        conn.execute(INSERT_WALLET, row)
    for row in tx_rows:
        conn.execute(INSERT_TX, row)
    conn.commit()
    conn.close()
    return db_path


def _make_scenario(**kwargs):
    with patch.object(TotalInOutForPeriodScenario, "__init__", lambda self, *a, **kw: None):
        scenario = TotalInOutForPeriodScenario.__new__(TotalInOutForPeriodScenario)
    scenario.current_user_id = kwargs.pop("current_user_id", 1)
    scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp/test")
    scenario._state_manager = MagicMock()
    scenario.scenario_config = kwargs.pop("scenario_config", {"time": "2026-02-24T12:00:00Z"})
    for key, value in kwargs.items():
        setattr(scenario, key, value)
    return scenario


def _setup_state_manager(scenario, state_dir):
    def execute_query_in_path(query, params, state_path):
        db_path = os.path.join(state_path, "default.db")
        conn = sqlite3.connect(db_path)
        result = conn.execute(query, params).fetchall()
        conn.close()
        return result
    scenario._execute_query_in_path = execute_query_in_path
    scenario.initial_state_path = state_dir


WALLETS = [
    (1, 1, 5000.0, "USD", "personal", "active", "2025-01-01T00:00:00", "2025-01-01T00:00:00"),
    (2, 2, 3000.0, "USD", "personal", "active", "2025-01-01T00:00:00", "2025-01-01T00:00:00"),
]


def _tx(sender_w, receiver_w, amount, status, tx_type, created_at):
    return (
        sender_w, receiver_w, amount, "USD", status, tx_type,
        1, None, None, "test", created_at, created_at,
    )


class TestTotalInOutForPeriodScenario(unittest.TestCase):

    def test_total_in_this_month(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            _make_db(tmp_dir, WALLETS, [
                _tx(2, 1, 100.0, "completed", "deposit", "2026-02-10T09:00:00"),
                _tx(2, 1, 250.0, "completed", "transfer", "2026-02-15T14:00:00"),
                _tx(2, 1, 50.0, "completed", "deposit", "2025-12-01T10:00:00"),
            ])
            scenario = _make_scenario(
                direction="total in", period="this month",
                agent_answer="$350.00",
            )
            _setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["total_matches"])

    def test_total_out_this_month(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            _make_db(tmp_dir, WALLETS, [
                _tx(1, 2, 75.0, "completed", "withdrawal", "2026-02-05T10:00:00"),
                _tx(1, 2, 200.0, "completed", "transfer", "2026-02-20T16:00:00"),
                _tx(1, 2, 999.0, "completed", "withdrawal", "2025-11-01T10:00:00"),
            ])
            scenario = _make_scenario(
                direction="total out", period="this month",
                agent_answer="Your total out is $275.00",
            )
            _setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["total_matches"])

    def test_zero_transactions(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            _make_db(tmp_dir, WALLETS, [])
            scenario = _make_scenario(
                direction="total in", period="this month",
                agent_answer="$0",
            )
            _setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["total_matches"])

    def test_zero_with_dollar_zero_double_zero(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            _make_db(tmp_dir, WALLETS, [])
            scenario = _make_scenario(
                direction="total out", period="today",
                agent_answer="$0.00",
            )
            _setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["total_matches"])

    def test_wrong_answer_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            _make_db(tmp_dir, WALLETS, [
                _tx(2, 1, 100.0, "completed", "deposit", "2026-02-10T09:00:00"),
            ])
            scenario = _make_scenario(
                direction="total in", period="this month",
                agent_answer="$999.99",
            )
            _setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["total_matches"])

    def test_unknown_direction_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            _make_db(tmp_dir, WALLETS, [])
            scenario = _make_scenario(
                direction="total sideways", period="this month",
                agent_answer="$0",
            )
            _setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_pending_transactions_excluded(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            _make_db(tmp_dir, WALLETS, [
                _tx(2, 1, 500.0, "pending", "deposit", "2026-02-10T09:00:00"),
                _tx(2, 1, 100.0, "completed", "deposit", "2026-02-12T09:00:00"),
            ])
            scenario = _make_scenario(
                direction="total in", period="this month",
                agent_answer="$100.00",
            )
            _setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["total_matches"])

    def test_last_month_boundary(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            _make_db(tmp_dir, WALLETS, [
                _tx(1, 2, 300.0, "completed", "withdrawal", "2026-01-15T10:00:00"),
                _tx(1, 2, 50.0, "completed", "withdrawal", "2026-02-01T00:00:00"),
            ])
            scenario = _make_scenario(
                direction="total out", period="last month",
                agent_answer="$300.00",
            )
            _setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["total_matches"])


if __name__ == "__main__":
    unittest.main()
