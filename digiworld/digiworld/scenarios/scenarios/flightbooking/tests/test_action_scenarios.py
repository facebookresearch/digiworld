# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for the five flight-booking action scenarios."""

import json
import random
import sqlite3
from unittest.mock import MagicMock

import pytest

from digiworld.scenarios.scenarios.flightbooking.cancel_flight.scenario import (
    CancelFlightScenario,
)
from digiworld.scenarios.scenarios.flightbooking.check_in_flight.scenario import (
    CheckInFlightScenario,
)
from digiworld.scenarios.scenarios.flightbooking.book_round_trip.scenario import (
    BookRoundTripScenario,
)
from digiworld.scenarios.scenarios.flightbooking.book_one_way.scenario import (
    BookOneWayScenario,
)
from digiworld.scenarios.scenarios.flightbooking.get_flight_details.scenario import (
    GetFlightDetailsScenario,
)


# ═════════════════════════════════════════════════════════════════════════════
# Helpers
# ═════════════════════════════════════════════════════════════════════════════

SCHEMA = """\
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);
CREATE TABLE bookings (
    booking_id TEXT PRIMARY KEY,
    booking_reference TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    trip_type TEXT NOT NULL,
    booking_date TEXT NOT NULL,
    status TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    total_price REAL NOT NULL,
    refund_amount REAL DEFAULT 0,
    amount_paid REAL,
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE booking_flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id TEXT NOT NULL,
    flight_id TEXT NOT NULL,
    airline_code TEXT NOT NULL,
    flight_number TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    fare REAL NOT NULL,
    segment TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    cancellation_date TEXT,
    cancellation_reason TEXT,
    refund_amount REAL DEFAULT 0
);
CREATE TABLE passengers (
    passenger_id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    passport_number TEXT NOT NULL,
    ticket_number TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE seat_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    passenger_id TEXT NOT NULL,
    flight_id TEXT NOT NULL,
    seat_number TEXT NOT NULL,
    check_in_status TEXT DEFAULT 'not_checked_in',
    check_in_time TEXT
);
CREATE TABLE flights (
    flight_id TEXT PRIMARY KEY,
    airline_id TEXT NOT NULL,
    airline_code TEXT NOT NULL,
    flight_number TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    fare REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    seats_available INTEGER NOT NULL,
    aircraft_type TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ''
);
"""

_INITIAL = "/state/initial"
_FINAL = "/state/final"

_BOOKING_INS = (
    "INSERT INTO bookings "
    "(booking_id, booking_reference, user_id, trip_type, booking_date, "
    "status, payment_status, total_price, currency, created_at, updated_at) "
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
)
_BF_INS = (
    "INSERT INTO booking_flights "
    "(booking_id, flight_id, airline_code, flight_number, origin, destination, "
    "departure_time, arrival_time, duration_minutes, fare, segment, status) "
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
)
_PAX_INS = (
    "INSERT INTO passengers "
    "(passenger_id, booking_id, first_name, last_name, email, phone, "
    "date_of_birth, passport_number, ticket_number) "
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
)
_SEAT_INS = (
    "INSERT INTO seat_assignments "
    "(passenger_id, flight_id, seat_number, check_in_status) "
    "VALUES (?, ?, ?, ?)"
)


def _create_db(path):
    conn = sqlite3.connect(str(path))
    conn.executescript(SCHEMA)
    conn.close()


def _exec(path, sql, params=()):
    conn = sqlite3.connect(str(path))
    conn.execute(sql, params)
    conn.commit()
    conn.close()


def _dual_executor(initial_db, final_db, initial_path=_INITIAL, final_path=_FINAL):
    """Return a ``_execute_query_in_path`` that routes to different DBs
    depending on whether *state_path* matches the initial or final sentinel."""
    def execute(query, params, state_path):
        db = initial_db if state_path == initial_path else final_db
        conn = sqlite3.connect(str(db))
        result = conn.execute(query, params).fetchall()
        conn.close()
        return result
    return execute


def _scenario(cls, **attrs):
    """Instantiate *cls* without calling ``__init__``."""
    obj = cls.__new__(cls)
    for k, v in attrs.items():
        setattr(obj, k, v)
    return obj


# ═════════════════════════════════════════════════════════════════════════════
# Fixtures
# ═════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def rng():
    return random.Random(42)


@pytest.fixture
def mock_llm():
    llm = MagicMock()
    llm.invoke_text.return_value = json.dumps({
        "origins": ["LAX", "SFO", "ORD"],
        "destinations": ["JFK", "MIA", "DFW"],
        "airline_codes": ["AA", "UA", "DL"],
    })
    return llm


# ═════════════════════════════════════════════════════════════════════════════
# 1. CancelFlightScenario
# ═════════════════════════════════════════════════════════════════════════════

class TestCancelFlightScenario:

    @staticmethod
    def _seed(db, booking_status="confirmed", flight_status="confirmed"):
        _exec(db, _BOOKING_INS,
              ("BK-1", "REF001", 1, "one_way", "2025-01-01",
               booking_status, "paid", 500.0, "USD",
               "2025-01-01T00:00:00Z", "2025-01-01T00:00:00Z"))
        _exec(db, _BF_INS,
              ("BK-1", "AA1234_2025-11-10", "AA", "AA1234", "LAX", "JFK",
               "2025-11-10T10:00:00Z", "2025-11-10T15:00:00Z",
               300, 500.0, "outbound", flight_status))

    def test_booking_cancelled(self, tmp_path):
        idb, fdb = tmp_path / "i.db", tmp_path / "f.db"
        _create_db(idb)
        _create_db(fdb)
        self._seed(idb)
        self._seed(fdb, "cancelled", "cancelled")

        s = _scenario(
            CancelFlightScenario,
            current_user_id=1, destination="JFK",
            initial_state_path=_INITIAL,
            _execute_query_in_path=_dual_executor(idb, fdb),
        )
        assert s._get_checks(_FINAL) == {
            "booking_cancelled": True,
            "flight_cancelled": True,
        }

    def test_booking_not_cancelled(self, tmp_path):
        idb, fdb = tmp_path / "i.db", tmp_path / "f.db"
        _create_db(idb)
        _create_db(fdb)
        self._seed(idb)
        self._seed(fdb)

        s = _scenario(
            CancelFlightScenario,
            current_user_id=1, destination="JFK",
            initial_state_path=_INITIAL,
            _execute_query_in_path=_dual_executor(idb, fdb),
        )
        assert s._get_checks(_FINAL) == {
            "booking_cancelled": False,
            "flight_cancelled": False,
        }

    def test_no_confirmed_booking(self, tmp_path):
        idb, fdb = tmp_path / "i.db", tmp_path / "f.db"
        _create_db(idb)
        _create_db(fdb)

        s = _scenario(
            CancelFlightScenario,
            current_user_id=1, destination="JFK",
            initial_state_path=_INITIAL,
            _execute_query_in_path=_dual_executor(idb, fdb),
        )
        with pytest.raises(ValueError, match="No confirmed booking"):
            s._get_checks(_FINAL)


# ═════════════════════════════════════════════════════════════════════════════
# 2. CheckInFlightScenario
# ═════════════════════════════════════════════════════════════════════════════

class TestCheckInFlightScenario:

    @staticmethod
    def _seed(db, check_in_status="not_checked_in"):
        _exec(db, _BOOKING_INS,
              ("BK-1", "REF001", 1, "one_way", "2025-01-01",
               "confirmed", "paid", 500.0, "USD",
               "2025-01-01T00:00:00Z", "2025-01-01T00:00:00Z"))
        _exec(db, _BF_INS,
              ("BK-1", "AA1234_2025-11-10", "AA", "AA1234", "LAX", "JFK",
               "2025-11-10T10:00:00Z", "2025-11-10T15:00:00Z",
               300, 500.0, "outbound", "confirmed"))
        _exec(db, _PAX_INS,
              ("P-1", "BK-1", "John", "Doe", "john@example.com",
               "+1-555-1234", "1990-01-01", "X12345678", "TK-001"))
        _exec(db, _SEAT_INS,
              ("P-1", "AA1234_2025-11-10", "12A", check_in_status))

    def test_checked_in(self, tmp_path):
        idb, fdb = tmp_path / "i.db", tmp_path / "f.db"
        _create_db(idb)
        _create_db(fdb)
        self._seed(idb, "not_checked_in")
        self._seed(fdb, "checked_in")

        s = _scenario(
            CheckInFlightScenario,
            current_user_id=1, destination="JFK",
            initial_state_path=_INITIAL,
            _execute_query_in_path=_dual_executor(idb, fdb),
        )
        assert s._get_checks(_FINAL) == {"checked_in": True}

    def test_not_checked_in(self, tmp_path):
        idb, fdb = tmp_path / "i.db", tmp_path / "f.db"
        _create_db(idb)
        _create_db(fdb)
        self._seed(idb, "not_checked_in")
        self._seed(fdb, "not_checked_in")

        s = _scenario(
            CheckInFlightScenario,
            current_user_id=1, destination="JFK",
            initial_state_path=_INITIAL,
            _execute_query_in_path=_dual_executor(idb, fdb),
        )
        assert s._get_checks(_FINAL) == {"checked_in": False}

    def test_no_booking_found(self, tmp_path):
        idb, fdb = tmp_path / "i.db", tmp_path / "f.db"
        _create_db(idb)
        _create_db(fdb)

        s = _scenario(
            CheckInFlightScenario,
            current_user_id=1, destination="JFK",
            initial_state_path=_INITIAL,
            _execute_query_in_path=_dual_executor(idb, fdb),
        )
        with pytest.raises(ValueError, match="No confirmed booking"):
            s._get_checks(_FINAL)


# ═════════════════════════════════════════════════════════════════════════════
# 3. BookRoundTripScenario
# ═════════════════════════════════════════════════════════════════════════════

class TestBookRoundTripScenario:

    @staticmethod
    def _seed_existing(db, user_id=1):
        _exec(db, _BOOKING_INS,
              ("BK-OLD", "REFOLD", user_id, "one_way", "2025-01-01",
               "confirmed", "paid", 300.0, "USD",
               "2025-01-01T00:00:00Z", "2025-01-01T00:00:00Z"))

    @staticmethod
    def _seed_round_trip(db, user_id=1, origin="LAX", destination="JFK"):
        _exec(db, _BOOKING_INS,
              ("BK-RT", "REFRT", user_id, "round_trip", "2025-02-01",
               "confirmed", "paid", 1000.0, "USD",
               "2025-02-01T00:00:00Z", "2025-02-01T00:00:00Z"))
        _exec(db, _BF_INS,
              ("BK-RT", "AA5678_out", "AA", "AA5678",
               origin, destination,
               "2025-12-15T08:00:00Z", "2025-12-15T13:00:00Z",
               300, 500.0, "outbound", "confirmed"))
        _exec(db, _BF_INS,
              ("BK-RT", "AA5679_ret", "AA", "AA5679",
               destination, origin,
               "2025-12-22T08:00:00Z", "2025-12-22T13:00:00Z",
               300, 500.0, "return", "confirmed"))
        _exec(db, _PAX_INS,
              ("P-RT", "BK-RT", "Jane", "Doe", "jane@example.com",
               "+1-555-5678", "1990-05-05", "X99999999", "TK-RT"))

    def test_round_trip_booked(self, tmp_path):
        idb, fdb = tmp_path / "i.db", tmp_path / "f.db"
        _create_db(idb)
        _create_db(fdb)
        self._seed_existing(idb)
        self._seed_existing(fdb)
        self._seed_round_trip(fdb)

        s = _scenario(
            BookRoundTripScenario,
            current_user_id=1, origin="LAX", destination="JFK",
            adults="1", children="0",
            initial_state_path=_INITIAL,
            _execute_query_in_path=_dual_executor(idb, fdb),
        )
        checks = s._get_checks(_FINAL)
        assert checks["new_booking_created"] is True
        assert checks["correct_trip_type"] is True
        assert checks["correct_route"] is True
        assert checks["correct_passenger_count"] is True

    def test_no_new_booking(self, tmp_path):
        idb, fdb = tmp_path / "i.db", tmp_path / "f.db"
        _create_db(idb)
        _create_db(fdb)
        self._seed_existing(idb)
        self._seed_existing(fdb)

        s = _scenario(
            BookRoundTripScenario,
            current_user_id=1, origin="LAX", destination="JFK",
            adults="1", children="0",
            initial_state_path=_INITIAL,
            _execute_query_in_path=_dual_executor(idb, fdb),
        )
        checks = s._get_checks(_FINAL)
        assert checks == {
            "new_booking_created": False,
            "correct_trip_type": False,
            "correct_route": False,
            "correct_passenger_count": False,
        }

    def test_wrong_route(self, tmp_path):
        idb, fdb = tmp_path / "i.db", tmp_path / "f.db"
        _create_db(idb)
        _create_db(fdb)
        self._seed_existing(idb)
        self._seed_existing(fdb)
        self._seed_round_trip(fdb, origin="SFO", destination="MIA")

        s = _scenario(
            BookRoundTripScenario,
            current_user_id=1, origin="LAX", destination="JFK",
            adults="1", children="0",
            initial_state_path=_INITIAL,
            _execute_query_in_path=_dual_executor(idb, fdb),
        )
        checks = s._get_checks(_FINAL)
        assert checks["new_booking_created"] is True
        assert checks["correct_route"] is False


# ═════════════════════════════════════════════════════════════════════════════
# 4. BookOneWayScenario
# ═════════════════════════════════════════════════════════════════════════════

class TestBookOneWayScenario:

    @staticmethod
    def _seed_existing(db, user_id=1):
        _exec(db, _BOOKING_INS,
              ("BK-OLD", "REFOLD", user_id, "one_way", "2025-01-01",
               "confirmed", "paid", 300.0, "USD",
               "2025-01-01T00:00:00Z", "2025-01-01T00:00:00Z"))

    @staticmethod
    def _seed_one_way(db, user_id=1, origin="LAX", destination="JFK"):
        _exec(db, _BOOKING_INS,
              ("BK-OW", "REFOW", user_id, "one_way", "2025-02-01",
               "confirmed", "paid", 500.0, "USD",
               "2025-02-01T00:00:00Z", "2025-02-01T00:00:00Z"))
        _exec(db, _BF_INS,
              ("BK-OW", "AA5678_ow", "AA", "AA5678",
               origin, destination,
               "2025-12-15T08:00:00Z", "2025-12-15T13:00:00Z",
               300, 500.0, "outbound", "confirmed"))
        _exec(db, _PAX_INS,
              ("P-OW", "BK-OW", "Jane", "Doe", "jane@example.com",
               "+1-555-5678", "1990-05-05", "X99999999", "TK-OW"))

    def test_one_way_booked(self, tmp_path):
        idb, fdb = tmp_path / "i.db", tmp_path / "f.db"
        _create_db(idb)
        _create_db(fdb)
        self._seed_existing(idb)
        self._seed_existing(fdb)
        self._seed_one_way(fdb)

        s = _scenario(
            BookOneWayScenario,
            current_user_id=1, origin="LAX", destination="JFK",
            adults="1", children="0",
            initial_state_path=_INITIAL,
            _execute_query_in_path=_dual_executor(idb, fdb),
        )
        checks = s._get_checks(_FINAL)
        assert checks["new_booking_created"] is True
        assert checks["correct_route"] is True
        assert checks["correct_passenger_count"] is True

    def test_no_new_booking(self, tmp_path):
        idb, fdb = tmp_path / "i.db", tmp_path / "f.db"
        _create_db(idb)
        _create_db(fdb)
        self._seed_existing(idb)
        self._seed_existing(fdb)

        s = _scenario(
            BookOneWayScenario,
            current_user_id=1, origin="LAX", destination="JFK",
            adults="1", children="0",
            initial_state_path=_INITIAL,
            _execute_query_in_path=_dual_executor(idb, fdb),
        )
        checks = s._get_checks(_FINAL)
        assert checks == {
            "new_booking_created": False,
            "correct_route": False,
            "correct_passenger_count": False,
        }


# ═════════════════════════════════════════════════════════════════════════════
# 5. GetFlightDetailsScenario
# ═════════════════════════════════════════════════════════════════════════════

class TestGetFlightDetailsScenario:

    @staticmethod
    def _seed(db):
        _exec(db, _BOOKING_INS,
              ("BK-1", "REF001", 1, "one_way", "2025-01-01",
               "confirmed", "paid", 500.0, "USD",
               "2025-01-01T00:00:00Z", "2025-01-01T00:00:00Z"))
        _exec(db, _BF_INS,
              ("BK-1", "AA1234_2025-11-10", "AA", "AA1234", "LAX", "JFK",
               "2025-11-10T10:00:00Z", "2025-11-10T15:00:00Z",
               300, 500.0, "outbound", "confirmed"))

    def test_correct_details(self, tmp_path):
        db = tmp_path / "test.db"
        _create_db(db)
        self._seed(db)

        s = _scenario(
            GetFlightDetailsScenario,
            current_user_id=1, origin="LAX", destination="JFK",
            date="2025-11-10",
            initial_state_path=_INITIAL,
            agent_answer="Your flight AA1234 from LAX to JFK departs at 10:00 AM.",
            _execute_query_in_path=_dual_executor(db, db),
        )
        checks = s._get_checks(_FINAL)
        assert checks == {"has_flight_number": True, "has_route_info": True}

    def test_missing_info(self, tmp_path):
        db = tmp_path / "test.db"
        _create_db(db)
        self._seed(db)

        s = _scenario(
            GetFlightDetailsScenario,
            current_user_id=1, origin="LAX", destination="JFK",
            date="2025-11-10",
            initial_state_path=_INITIAL,
            agent_answer="Your flight from LAX to JFK departs soon.",
            _execute_query_in_path=_dual_executor(db, db),
        )
        checks = s._get_checks(_FINAL)
        assert checks["has_flight_number"] is False
        assert checks["has_route_info"] is True

    def test_no_flight_found(self, tmp_path):
        db = tmp_path / "test.db"
        _create_db(db)

        s = _scenario(
            GetFlightDetailsScenario,
            current_user_id=1, origin="LAX", destination="JFK",
            date="2025-11-10",
            initial_state_path=_INITIAL,
            agent_answer="",
            _execute_query_in_path=_dual_executor(db, db),
        )
        with pytest.raises(ValueError, match="No flight found"):
            s._get_checks(_FINAL)
