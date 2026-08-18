# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for the five information-retrieval flightbooking scenarios.

Covers scenario verification (_get_checks) for:
  - get_flight_status
  - get_flight_date
  - get_flight_number
  - get_flight_time
  - get_seat_numbers
"""

import json
import random
import sqlite3
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from digiworld.scenarios.scenarios.flightbooking.get_flight_status.scenario import (
    GetFlightStatusScenario,
)
from digiworld.scenarios.scenarios.flightbooking.get_flight_date.scenario import (
    GetFlightDateScenario,
)
from digiworld.scenarios.scenarios.flightbooking.get_flight_number.scenario import (
    GetFlightNumberScenario,
)
from digiworld.scenarios.scenarios.flightbooking.get_flight_time.scenario import (
    GetFlightTimeScenario,
)
from digiworld.scenarios.scenarios.flightbooking.get_seat_numbers.scenario import (
    GetSeatNumbersScenario,
)

# ---------------------------------------------------------------------------
# Schema & helpers
# ---------------------------------------------------------------------------

SCHEMA_SQL = """
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
"""


def create_test_db(tmp_path):
    """Create a SQLite database with the flightbooking schema."""
    db_path = str(tmp_path / "default.db")
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA_SQL)
    return conn, db_path


def insert_booking_with_flight(
    conn,
    user_id=1,
    booking_id="BK-TEST-ABC123",
    booking_ref="ABC123",
    origin="LAX",
    destination="JFK",
    flight_id="AA1234_2025-11-10",
    flight_number="AA1234",
    airline_code="AA",
    departure_time="2025-11-10T08:30:00Z",
    arrival_time="2025-11-10T16:45:00Z",
    duration_minutes=375,
    fare=500.0,
    booking_status="confirmed",
    flight_status="confirmed",
):
    """Insert a booking together with its booking_flight row."""
    conn.execute(
        "INSERT INTO bookings VALUES "
        "(?, ?, ?, 'one_way', '2025-11-01', ?, 'paid', ?, 0, ?, 'USD', "
        "'2025-01-01', '2025-01-01')",
        (booking_id, booking_ref, user_id, booking_status, fare, fare),
    )
    conn.execute(
        "INSERT INTO booking_flights "
        "(booking_id, flight_id, airline_code, flight_number, origin, "
        "destination, departure_time, arrival_time, duration_minutes, "
        "fare, segment, status) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'outbound', ?)",
        (
            booking_id, flight_id, airline_code, flight_number,
            origin, destination, departure_time, arrival_time,
            duration_minutes, fare, flight_status,
        ),
    )
    conn.commit()


def insert_passenger_with_seat(
    conn,
    booking_id="BK-TEST-ABC123",
    flight_id="AA1234_2025-11-10",
    passenger_id="P-TEST-001",
    first_name="John",
    last_name="Smith",
    seat_number="12A",
    ticket_number="TK-TEST-001",
):
    """Insert a passenger and the corresponding seat assignment."""
    conn.execute(
        "INSERT INTO passengers "
        "(passenger_id, booking_id, first_name, last_name, email, phone, "
        "date_of_birth, passport_number, ticket_number) "
        "VALUES (?, ?, ?, ?, ?, '+1-555-1234', '1990-01-01', 'X12345678', ?)",
        (
            passenger_id, booking_id, first_name, last_name,
            f"{first_name.lower()}@example.com", ticket_number,
        ),
    )
    conn.execute(
        "INSERT INTO seat_assignments "
        "(passenger_id, flight_id, seat_number) VALUES (?, ?, ?)",
        (passenger_id, flight_id, seat_number),
    )
    conn.commit()


def make_scenario(scenario_class, params, agent_answer="", user_id=1):
    """Instantiate a scenario class bypassing __init__."""
    scenario = object.__new__(scenario_class)
    scenario.current_user_id = user_id
    scenario.initial_state_path = "/tmp/test"
    scenario.agent_answer = agent_answer
    for k, v in params.items():
        setattr(scenario, k, v)
    return scenario


def wire_db(scenario, db_path, state_dir):
    """Patch ``_execute_query_in_path`` to use the test database."""
    def _execute(query, params, state_path):
        conn = sqlite3.connect(db_path)
        result = conn.execute(query, params).fetchall()
        conn.close()
        return result

    scenario._execute_query_in_path = _execute
    scenario.initial_state_path = str(state_dir)


def _mock_llm(origins, destinations, airline_codes):
    """Return a mock LLM that emits a deterministic route batch."""
    llm = MagicMock()
    llm.invoke_text.return_value = json.dumps({
        "origins": origins,
        "destinations": destinations,
        "airline_codes": airline_codes,
    })
    return llm


# ===================================================================
# GetFlightStatus – scenario verification
# ===================================================================


class TestGetFlightStatusScenario:

    def test_correct_status(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        insert_booking_with_flight(conn, flight_status="confirmed")
        conn.close()

        scenario = make_scenario(
            GetFlightStatusScenario,
            {"destination": "JFK"},
            agent_answer="Your flight status is confirmed.",
        )
        wire_db(scenario, db_path, tmp_path)

        checks = scenario._get_checks(str(tmp_path))
        assert checks["answer_matches"] is True

    def test_wrong_status(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        insert_booking_with_flight(conn, flight_status="confirmed")
        conn.close()

        scenario = make_scenario(
            GetFlightStatusScenario,
            {"destination": "JFK"},
            agent_answer="Your flight is pending.",
        )
        wire_db(scenario, db_path, tmp_path)

        checks = scenario._get_checks(str(tmp_path))
        assert checks["answer_matches"] is False

    def test_pending_flight_status(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        insert_booking_with_flight(conn, flight_status="pending")
        conn.close()

        scenario = make_scenario(
            GetFlightStatusScenario,
            {"destination": "JFK"},
            agent_answer="Your flight is currently pending.",
        )
        wire_db(scenario, db_path, tmp_path)

        checks = scenario._get_checks(str(tmp_path))
        assert checks["answer_matches"] is True

    def test_no_flight_raises(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        conn.close()

        scenario = make_scenario(
            GetFlightStatusScenario,
            {"destination": "JFK"},
            agent_answer="confirmed",
        )
        wire_db(scenario, db_path, tmp_path)

        with pytest.raises(ValueError, match="No active flight"):
            scenario._get_checks(str(tmp_path))

    def test_cancelled_booking_excluded(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        insert_booking_with_flight(conn, booking_status="cancelled")
        conn.close()

        scenario = make_scenario(
            GetFlightStatusScenario,
            {"destination": "JFK"},
            agent_answer="confirmed",
        )
        wire_db(scenario, db_path, tmp_path)

        with pytest.raises(ValueError, match="No active flight"):
            scenario._get_checks(str(tmp_path))

    def test_missing_destination_raises(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        conn.close()

        scenario = make_scenario(
            GetFlightStatusScenario, {}, agent_answer="confirmed",
        )
        wire_db(scenario, db_path, tmp_path)

        with pytest.raises(ValueError, match="destination parameter is required"):
            scenario._get_checks(str(tmp_path))


# ===================================================================
# GetFlightDate – scenario verification
# ===================================================================


class TestGetFlightDateScenario:

    def test_correct_date_long_format(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        insert_booking_with_flight(conn, departure_time="2025-11-10T08:30:00Z")
        conn.close()

        scenario = make_scenario(
            GetFlightDateScenario,
            {"origin": "LAX", "destination": "JFK"},
            agent_answer="Your flight is on November 10, 2025.",
        )
        wire_db(scenario, db_path, tmp_path)

        checks = scenario._get_checks(str(tmp_path))
        assert checks["answer_matches"] is True

    def test_correct_date_iso_format(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        insert_booking_with_flight(conn, departure_time="2025-11-10T08:30:00Z")
        conn.close()

        scenario = make_scenario(
            GetFlightDateScenario,
            {"origin": "LAX", "destination": "JFK"},
            agent_answer="Your flight departs on 2025-11-10.",
        )
        wire_db(scenario, db_path, tmp_path)

        checks = scenario._get_checks(str(tmp_path))
        assert checks["answer_matches"] is True

    def test_wrong_date(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        insert_booking_with_flight(conn, departure_time="2025-11-10T08:30:00Z")
        conn.close()

        scenario = make_scenario(
            GetFlightDateScenario,
            {"origin": "LAX", "destination": "JFK"},
            agent_answer="Your flight is on December 25, 2025.",
        )
        wire_db(scenario, db_path, tmp_path)

        checks = scenario._get_checks(str(tmp_path))
        assert checks["answer_matches"] is False

    def test_no_flight_raises(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        conn.close()

        scenario = make_scenario(
            GetFlightDateScenario,
            {"origin": "LAX", "destination": "JFK"},
            agent_answer="November 10, 2025",
        )
        wire_db(scenario, db_path, tmp_path)

        with pytest.raises(ValueError, match="No active flight"):
            scenario._get_checks(str(tmp_path))

    def test_missing_params_raises(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        conn.close()

        scenario = make_scenario(
            GetFlightDateScenario,
            {"origin": "LAX"},
            agent_answer="November 10, 2025",
        )
        wire_db(scenario, db_path, tmp_path)

        with pytest.raises(
            ValueError, match="origin and destination parameters are required"
        ):
            scenario._get_checks(str(tmp_path))


# ===================================================================
# GetFlightNumber – scenario verification
# ===================================================================


class TestGetFlightNumberScenario:

    def test_correct_flight_number(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        insert_booking_with_flight(conn, flight_number="AA1234")
        conn.close()

        scenario = make_scenario(
            GetFlightNumberScenario,
            {"origin": "LAX", "destination": "JFK"},
            agent_answer="Your flight number is AA1234.",
        )
        wire_db(scenario, db_path, tmp_path)

        checks = scenario._get_checks(str(tmp_path))
        assert checks["answer_matches"] is True

    def test_case_insensitive_match(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        insert_booking_with_flight(conn, flight_number="AA1234")
        conn.close()

        scenario = make_scenario(
            GetFlightNumberScenario,
            {"origin": "LAX", "destination": "JFK"},
            agent_answer="Your flight number is aa1234.",
        )
        wire_db(scenario, db_path, tmp_path)

        checks = scenario._get_checks(str(tmp_path))
        assert checks["answer_matches"] is True

    def test_wrong_flight_number(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        insert_booking_with_flight(conn, flight_number="AA1234")
        conn.close()

        scenario = make_scenario(
            GetFlightNumberScenario,
            {"origin": "LAX", "destination": "JFK"},
            agent_answer="Your flight number is UA5678.",
        )
        wire_db(scenario, db_path, tmp_path)

        checks = scenario._get_checks(str(tmp_path))
        assert checks["answer_matches"] is False

    def test_no_flight_raises(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        conn.close()

        scenario = make_scenario(
            GetFlightNumberScenario,
            {"origin": "LAX", "destination": "JFK"},
            agent_answer="AA1234",
        )
        wire_db(scenario, db_path, tmp_path)

        with pytest.raises(ValueError, match="No active flight"):
            scenario._get_checks(str(tmp_path))

    def test_missing_params_raises(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        conn.close()

        scenario = make_scenario(
            GetFlightNumberScenario, {}, agent_answer="AA1234",
        )
        wire_db(scenario, db_path, tmp_path)

        with pytest.raises(
            ValueError, match="origin and destination parameters are required"
        ):
            scenario._get_checks(str(tmp_path))


# ===================================================================
# GetFlightTime – scenario verification
# ===================================================================


class TestGetFlightTimeScenario:

    def test_correct_time_12h(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        insert_booking_with_flight(conn, departure_time="2025-11-10T08:30:00Z")
        conn.close()

        scenario = make_scenario(
            GetFlightTimeScenario,
            {"origin": "LAX", "destination": "JFK"},
            agent_answer="Your flight departs at 8:30 AM.",
        )
        wire_db(scenario, db_path, tmp_path)

        checks = scenario._get_checks(str(tmp_path))
        assert checks["answer_matches"] is True

    def test_correct_time_24h(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        insert_booking_with_flight(conn, departure_time="2025-11-10T14:45:00Z")
        conn.close()

        scenario = make_scenario(
            GetFlightTimeScenario,
            {"origin": "LAX", "destination": "JFK"},
            agent_answer="Departure is at 14:45.",
        )
        wire_db(scenario, db_path, tmp_path)

        checks = scenario._get_checks(str(tmp_path))
        assert checks["answer_matches"] is True

    def test_wrong_time(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        insert_booking_with_flight(conn, departure_time="2025-11-10T08:30:00Z")
        conn.close()

        scenario = make_scenario(
            GetFlightTimeScenario,
            {"origin": "LAX", "destination": "JFK"},
            agent_answer="Your flight departs at 3:15 PM.",
        )
        wire_db(scenario, db_path, tmp_path)

        checks = scenario._get_checks(str(tmp_path))
        assert checks["answer_matches"] is False

    def test_no_flight_raises(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        conn.close()

        scenario = make_scenario(
            GetFlightTimeScenario,
            {"origin": "LAX", "destination": "JFK"},
            agent_answer="8:30 AM",
        )
        wire_db(scenario, db_path, tmp_path)

        with pytest.raises(ValueError, match="No active flight"):
            scenario._get_checks(str(tmp_path))

    def test_missing_params_raises(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        conn.close()

        scenario = make_scenario(
            GetFlightTimeScenario, {}, agent_answer="8:30 AM",
        )
        wire_db(scenario, db_path, tmp_path)

        with pytest.raises(
            ValueError, match="origin and destination parameters are required"
        ):
            scenario._get_checks(str(tmp_path))


# ===================================================================
# GetSeatNumbers – scenario verification
# ===================================================================


class TestGetSeatNumbersScenario:

    def test_single_seat(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        insert_booking_with_flight(conn)
        insert_passenger_with_seat(conn, seat_number="12A")
        conn.close()

        scenario = make_scenario(
            GetSeatNumbersScenario,
            {"origin": "LAX", "destination": "JFK"},
            agent_answer="Your seat is 12A.",
        )
        wire_db(scenario, db_path, tmp_path)

        checks = scenario._get_checks(str(tmp_path))
        assert checks["answer_matches"] is True

    def test_multiple_seats(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        insert_booking_with_flight(conn)
        insert_passenger_with_seat(
            conn, passenger_id="P-TEST-001", seat_number="12A",
            ticket_number="TK-001",
        )
        insert_passenger_with_seat(
            conn, passenger_id="P-TEST-002", seat_number="14C",
            first_name="Jane", last_name="Doe", ticket_number="TK-002",
        )
        conn.close()

        scenario = make_scenario(
            GetSeatNumbersScenario,
            {"origin": "LAX", "destination": "JFK"},
            agent_answer="Your seats are 12A and 14C.",
        )
        wire_db(scenario, db_path, tmp_path)

        checks = scenario._get_checks(str(tmp_path))
        assert checks["answer_matches"] is True

    def test_missing_seat_in_answer(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        insert_booking_with_flight(conn)
        insert_passenger_with_seat(
            conn, passenger_id="P-TEST-001", seat_number="12A",
            ticket_number="TK-001",
        )
        insert_passenger_with_seat(
            conn, passenger_id="P-TEST-002", seat_number="14C",
            first_name="Jane", last_name="Doe", ticket_number="TK-002",
        )
        conn.close()

        scenario = make_scenario(
            GetSeatNumbersScenario,
            {"origin": "LAX", "destination": "JFK"},
            agent_answer="Your seat is 12A.",
        )
        wire_db(scenario, db_path, tmp_path)

        checks = scenario._get_checks(str(tmp_path))
        assert checks["answer_matches"] is False

    def test_no_seats_raises(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        insert_booking_with_flight(conn)
        conn.close()

        scenario = make_scenario(
            GetSeatNumbersScenario,
            {"origin": "LAX", "destination": "JFK"},
            agent_answer="12A",
        )
        wire_db(scenario, db_path, tmp_path)

        with pytest.raises(ValueError, match="No seat assignments"):
            scenario._get_checks(str(tmp_path))

    def test_missing_params_raises(self, tmp_path):
        conn, db_path = create_test_db(tmp_path)
        conn.close()

        scenario = make_scenario(
            GetSeatNumbersScenario,
            {"origin": "LAX"},
            agent_answer="12A",
        )
        wire_db(scenario, db_path, tmp_path)

        with pytest.raises(
            ValueError, match="origin and destination parameters are required"
        ):
            scenario._get_checks(str(tmp_path))
