# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared primitives for flightbooking scenario instance generation."""

import string
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from digiworld.scenarios.builders import write_mockdata
from digiworld.scenarios.constraints import EntityExistsConstraint

# Fixed future date used across all flightbooking scenarios.
# Action scenarios (cancel, check-in, booking) pair these with the
# scenario_config.json "time" field to control the device clock.
FLIGHT_DATE = "2026-08-15"
FLIGHT_DATE_RETURN = "2026-08-22"

DEVICE_TIME_DEFAULT = "2026-08-10T10:00:00Z"
DEVICE_TIME_CHECKIN = "2026-08-15T00:00:00Z"

USER_HAS_BOOKINGS = EntityExistsConstraint(
    table="bookings",
    user_filter=True,
    min_count=2,
)

USER_HAS_CONFIRMED_BOOKINGS = EntityExistsConstraint(
    table="bookings",
    user_filter=True,
    min_count=1,
    filter={"status": "confirmed"},
)


class BookingBatch(BaseModel):
    origins: List[str]
    destinations: List[str]
    airline_codes: List[str]


def booking_batch_prompt(count: int) -> str:
    return (
        f"Generate exactly {count} realistic flight route pairs for an "
        f"airline booking app. For each, provide an origin airport code "
        f"(3 letters, e.g., LAX), a destination airport code (e.g., JFK), "
        f"and an airline code (2 letters, e.g., AA). "
        f"Ensure variety in routes and airlines. "
        f"Return JSON with keys 'origins', 'destinations', 'airline_codes' "
        f"as parallel arrays."
    )


def generate_booking_reference(rng: Any) -> str:
    return "".join(rng.choices(string.ascii_uppercase + string.digits, k=6))


AIRLINE_ID_MAP = {
    "AA": "airline_aa", "UA": "airline_ua", "DL": "airline_dl",
    "SW": "airline_sw", "BA": "airline_ba", "LH": "airline_lh",
    "AF": "airline_af", "EK": "airline_ek", "JL": "airline_jl",
}

AIRLINE_NAME_MAP = {
    "AA": "American Airlines", "UA": "United Airlines", "DL": "Delta Air Lines",
    "SW": "Southwest Airlines", "BA": "British Airways", "LH": "Lufthansa",
    "AF": "Air France", "EK": "Emirates", "JL": "Japan Airlines",
    "QF": "Qantas Airways", "SQ": "Singapore Airlines", "CX": "Cathay Pacific",
    "NH": "All Nippon Airways", "TK": "Turkish Airlines", "LX": "Swiss International",
    "KL": "KLM Royal Dutch", "IB": "Iberia", "QR": "Qatar Airways",
    "EY": "Etihad Airways", "AC": "Air Canada", "NZ": "Air New Zealand",
}

AIRLINE_COUNTRY_MAP = {
    "AA": "USA", "UA": "USA", "DL": "USA", "SW": "USA",
    "BA": "United Kingdom", "LH": "Germany", "AF": "France",
    "EK": "United Arab Emirates", "JL": "Japan", "QF": "Australia",
    "SQ": "Singapore", "CX": "Hong Kong", "NH": "Japan",
    "TK": "Turkey", "LX": "Switzerland", "KL": "Netherlands",
    "IB": "Spain", "QR": "Qatar", "EY": "United Arab Emirates",
    "AC": "Canada", "NZ": "New Zealand",
}

SHORT_HAUL_AIRCRAFT = ["Boeing 737-800", "Airbus A320neo"]
LONG_HAUL_AIRCRAFT = ["Boeing 777-300ER", "Airbus A350-900", "Boeing 787-9 Dreamliner"]
AIRCRAFT_TYPES = SHORT_HAUL_AIRCRAFT + LONG_HAUL_AIRCRAFT


def flight_record(
    origin: str,
    destination: str,
    airline_code: str,
    rng: Any,
    *,
    date: str = FLIGHT_DATE,
    **overrides: Any,
) -> Dict[str, Any]:
    """Build a single flight dict.

    ``date`` controls the flight date AND is used to derive ``flight_id``,
    ``departure_time``, and ``arrival_time`` so they are always consistent.
    """
    flight_num = rng.randint(1000, 9999)
    flight_number = f"{airline_code}{flight_num}"

    duration_minutes = rng.randint(120, 600)
    dep_hour = rng.randint(5, 20)
    dep_minute = rng.choice([0, 15, 30, 45])
    departure = datetime.strptime(
        f"{date}T{dep_hour:02d}:{dep_minute:02d}:00Z", "%Y-%m-%dT%H:%M:%SZ"
    )
    arrival = departure + timedelta(minutes=duration_minutes)

    aircraft = rng.choice(
        LONG_HAUL_AIRCRAFT if duration_minutes >= 300 else SHORT_HAUL_AIRCRAFT
    )

    record: Dict[str, Any] = {
        "flight_id": f"{flight_number}_{date}",
        "airline_id": AIRLINE_ID_MAP.get(airline_code, f"airline_{airline_code.lower()}"),
        "airline_code": airline_code,
        "flight_number": flight_number,
        "origin": origin,
        "destination": destination,
        "departure_time": departure.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "arrival_time": arrival.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "duration_minutes": duration_minutes,
        "fare": round(rng.uniform(200, 1500), 2),
        "currency": "USD",
        "seats_available": rng.randint(10, 200),
        "aircraft_type": aircraft,
        "date": date,
        "created_at": "2026-01-01T00:00:00Z",
    }
    record.update(overrides)
    return record


def flightconfig_record(flight: Dict[str, Any]) -> Dict[str, Any]:
    """Build a flightsconfig entry from a flight record.

    The flightsconfig table stores route templates with HH:MM times.
    The app generates concrete flights from these configs when a user searches.
    """
    dep_dt = datetime.strptime(flight["departure_time"], "%Y-%m-%dT%H:%M:%SZ")
    arr_dt = datetime.strptime(flight["arrival_time"], "%Y-%m-%dT%H:%M:%SZ")
    return {
        "flight_id": f"FC_{flight['flight_number']}",
        "airline_id": flight["airline_id"],
        "airline_code": flight["airline_code"],
        "flight_number": flight["flight_number"],
        "origin": flight["origin"],
        "destination": flight["destination"],
        "departure_time": dep_dt.strftime("%H:%M"),
        "arrival_time": arr_dt.strftime("%H:%M"),
        "duration_minutes": flight["duration_minutes"],
        "fare": flight["fare"],
        "currency": flight.get("currency", "USD"),
        "seats_available": flight.get("seats_available", 150),
        "aircraft_type": flight["aircraft_type"],
        "created_at": "2026-01-01T00:00:00Z",
    }


def airline_record(airline_code: str) -> Dict[str, Any]:
    return {
        "id": AIRLINE_ID_MAP.get(airline_code, f"airline_{airline_code.lower()}"),
        "name": AIRLINE_NAME_MAP.get(airline_code, f"{airline_code} Airlines"),
        "iata_code": airline_code,
        "country": AIRLINE_COUNTRY_MAP.get(airline_code, "Unknown"),
        "created_at": "2026-01-01T00:00:00Z",
    }


def airport_record(code: str) -> Dict[str, Any]:
    return {
        "code": code,
        "name": f"{code} International Airport",
        "city": code,
        "country": "Unknown",
        "timezone": "UTC",
        "created_at": "2026-01-01T00:00:00Z",
    }


def _make_passenger(
    flight_ids: List[str],
    rng: Any,
    first_name: str = "Test",
    last_name: str = "Traveler",
    check_in_status: str = "not_checked_in",
    booking_ref: str = "",
) -> Dict[str, Any]:
    """Build a single passenger dict with seat assignments for all flights.

    When *booking_ref* is supplied the passenger and ticket IDs embed
    it so that IDs are unique per booking even when the RNG seed
    happens to be identical across different scenario runs.
    """
    uid = rng.randint(100000, 999999)
    tag = f"{booking_ref}-" if booking_ref else "TEST-"
    return {
        "passenger_id": f"P-{tag}{uid}",
        "first_name": first_name,
        "last_name": last_name,
        "email": f"{first_name.lower()}.{last_name.lower()}@example.com",
        "phone": f"+1-555-{rng.randint(1000, 9999):04d}",
        "date_of_birth": f"{rng.randint(1975, 2005)}-{rng.randint(1, 12):02d}-{rng.randint(1, 28):02d}",
        "passport_number": f"X{rng.randint(10000000, 99999999)}",
        "seat_assignments": [
            {
                "flight_id": fid,
                "seat_number": f"{rng.randint(1, 30)}{rng.choice('ABCDEF')}",
                "check_in_status": check_in_status,
                "check_in_time": None,
            }
            for fid in flight_ids
        ],
        "ticket_number": f"TK-{tag}{uid}",
        "created_at": "2026-01-01T00:00:00Z",
    }


def _flight_segment(
    flight: Dict[str, Any],
    segment: str = "outbound",
    status: str = "confirmed",
) -> Dict[str, Any]:
    return {
        "flight_id": flight["flight_id"],
        "airline_code": flight["airline_code"],
        "flight_number": flight["flight_number"],
        "origin": flight["origin"],
        "destination": flight["destination"],
        "departure_time": flight["departure_time"],
        "arrival_time": flight["arrival_time"],
        "duration_minutes": flight["duration_minutes"],
        "fare": flight["fare"],
        "segment": segment,
        "status": status,
    }


PASSENGER_NAMES = [
    ("John", "Smith"), ("Emma", "Johnson"), ("Carlos", "Garcia"),
    ("Aisha", "Patel"), ("Yuki", "Tanaka"), ("Sophie", "Martin"),
]


def booking_record(
    booking_ref: str,
    flight: Dict[str, Any],
    rng: Any,
    *,
    flight_status: str = "confirmed",
    **overrides: Any,
) -> Dict[str, Any]:
    record: Dict[str, Any] = {
        "booking_id": f"BK-TEST-{booking_ref}",
        "booking_reference": booking_ref,
        "user_id": "{{current_user_id}}",
        "trip_type": "one_way",
        "booking_date": "{{end_timestamp}}",
        "status": "confirmed",
        "payment_status": "paid",
        "total_price": flight["fare"],
        "refund_amount": 0,
        "amount_paid": flight["fare"],
        "currency": "USD",
        "flights": [_flight_segment(flight, "outbound", status=flight_status)],
        "passengers": [
            _make_passenger([flight["flight_id"]], rng, booking_ref=booking_ref),
        ],
        "created_at": "{{end_timestamp}}",
        "updated_at": "{{end_timestamp}}",
    }
    record.update(overrides)
    return record


def booking_record_multi(
    booking_ref: str,
    outbound_flight: Dict[str, Any],
    rng: Any,
    return_flight: Optional[Dict[str, Any]] = None,
    num_passengers: int = 1,
    status: str = "confirmed",
    check_in_status: str = "not_checked_in",
    **overrides: Any,
) -> Dict[str, Any]:
    """Build a booking with optional return flight and multiple passengers."""
    flights_list = [_flight_segment(outbound_flight, "outbound")]
    flight_ids = [outbound_flight["flight_id"]]
    total_fare = outbound_flight["fare"]
    trip_type = "one_way"

    if return_flight is not None:
        flights_list.append(_flight_segment(return_flight, "return"))
        flight_ids.append(return_flight["flight_id"])
        total_fare += return_flight["fare"]
        trip_type = "round_trip"

    passengers = []
    for i in range(num_passengers):
        fname, lname = PASSENGER_NAMES[i % len(PASSENGER_NAMES)]
        passengers.append(
            _make_passenger(
                flight_ids, rng,
                first_name=fname, last_name=lname,
                check_in_status=check_in_status,
                booking_ref=booking_ref,
            )
        )

    record: Dict[str, Any] = {
        "booking_id": f"BK-TEST-{booking_ref}",
        "booking_reference": booking_ref,
        "user_id": "{{current_user_id}}",
        "trip_type": trip_type,
        "booking_date": "{{end_timestamp}}",
        "status": status,
        "payment_status": "paid",
        "total_price": round(total_fare, 2),
        "refund_amount": 0,
        "amount_paid": round(total_fare, 2),
        "currency": "USD",
        "flights": flights_list,
        "passengers": passengers,
        "created_at": "{{end_timestamp}}",
        "updated_at": "{{end_timestamp}}",
    }
    record.update(overrides)
    return record
