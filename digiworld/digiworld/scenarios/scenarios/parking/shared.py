# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared primitives for parking scenario instance generation."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from pydantic import BaseModel

from digiworld.scenarios.builders import write_mockdata
from digiworld.scenarios.constraints import EntityExistsConstraint


# ---------------------------------------------------------------------------
# Reusable feasibility constraints
# ---------------------------------------------------------------------------

USER_HAS_VEHICLES = EntityExistsConstraint(
    table="vehicles", min_count=1, user_filter=True,
)


# ---------------------------------------------------------------------------
# Pydantic models for LLM responses
# ---------------------------------------------------------------------------

class VehicleBatch(BaseModel):
    nicknames: List[str]
    makes: List[str]
    models: List[str]
    colors: List[str]
    plates: List[str]
    vehicle_types: List[str]


class ZoneNameBatch(BaseModel):
    names: List[str]
    zone_codes: List[str]


class PasswordBatch(BaseModel):
    passwords: List[str]


class NameBatch(BaseModel):
    names: List[str]


# ---------------------------------------------------------------------------
# LLM prompt helpers
# ---------------------------------------------------------------------------

_VALID_VEHICLE_TYPES = "Sedan, SUV, Truck, Van, Electric Vehicle, Motorcycle, Compact"


def vehicle_batch_prompt(count: int) -> str:
    return (
        f"Generate exactly {count} realistic vehicles for a parking app. "
        f"For each, provide a creative nickname (1-2 words, e.g., 'Thunderbolt'), "
        f"a car make (e.g., 'Porsche'), a model (e.g., '911 GT3'), "
        f"a color (e.g., 'Electric Blue'), a vanity license plate "
        f"(5-7 uppercase alphanumeric characters, e.g., 'THND3R'), "
        f"and the vehicle type that best matches the make/model from exactly "
        f"one of: {_VALID_VEHICLE_TYPES}. "
        f"Ensure variety in makes, colors, and vehicle types. "
        f"Return JSON with keys 'nicknames', 'makes', 'models', "
        f"'colors', 'plates', 'vehicle_types' as parallel arrays."
    )


def zone_name_batch_prompt(count: int) -> str:
    return (
        f"Generate exactly {count} realistic parking zone names for a city parking app. "
        f"For each, provide a short descriptive name (e.g., 'Riverside Garage', "
        f"'Downtown Lot 7') and a unique zone code (5-6 uppercase alphanumeric "
        f"characters, e.g., 'RVG001'). "
        f"Ensure variety in types (garage, lot, street, rooftop). "
        f"Return JSON with keys 'names' and 'zone_codes' as parallel arrays."
    )


# ---------------------------------------------------------------------------
# Record builders
# ---------------------------------------------------------------------------

VEHICLE_TYPES = ["sedan", "suv", "truck", "van", "ev", "motorcycle", "compact"]
VEHICLE_TYPE_IDS = {vt: i + 1 for i, vt in enumerate(VEHICLE_TYPES)}

VEHICLE_TYPE_NAME_TO_ID: Dict[str, int] = {
    "Sedan": 1, "SUV": 2, "Truck": 3, "Van": 4,
    "Electric Vehicle": 5, "Motorcycle": 6, "Compact": 7,
}


def resolve_vehicle_type_id(vehicle_type_name: str) -> int:
    """Map a display name like 'SUV' or 'Electric Vehicle' to its DB integer ID.

    Falls back to Sedan (1) if the name is not recognized, so mockdata
    always contains a valid FK -- but callers should supply a valid name.
    """
    normalized = {k.lower(): v for k, v in VEHICLE_TYPE_NAME_TO_ID.items()}
    return normalized.get(vehicle_type_name.strip().lower(), 1)


def _iso_z(dt: datetime) -> str:
    if dt.tzinfo is None:
        return dt.isoformat() + "Z"
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def vehicle_record(
    nickname: str,
    make: str,
    model: str,
    color: str,
    plate: str,
    rng: Any,
    vehicle_type_id: int = 1,
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": "{{auto_id}}",
        "userId": "{{current_user_id}}",
        "nickname": nickname,
        "make": make,
        "model": model,
        "color": color,
        "year": rng.randint(2018, 2026),
        "plateNumber": plate,
        "vehicleTypeId": vehicle_type_id,
        "isDefault": 0,
        "createdAt": "{{end_timestamp}}",
        "updatedAt": "{{end_timestamp}}",
        "metadata": None,
    }
    record.update(overrides)
    return record


def parking_zone_record(
    zone_code: str,
    name: str,
    rng: Any,
    **overrides: Any,
) -> Dict[str, Any]:
    zone_types = ["metered", "lot", "garage", "street", "rooftop", "underground"]
    record = {
        "id": "{{auto_id}}",
        "name": name,
        "description": f"Parking zone {zone_code}",
        "latitude": round(40.730 + rng.uniform(-0.01, 0.01), 6),
        "longitude": round(-73.983 + rng.uniform(-0.01, 0.01), 6),
        "zoneCode": zone_code,
        "operator": "City Parking Authority",
        "zoneType": rng.choice(zone_types),
        "capacity": rng.randint(50, 300),
        "rateCurrency": "USD",
        "rateMultiplier": round(rng.uniform(1.0, 2.0), 2),
        "isActive": 1,
        "createdAt": "{{recent_timestamp}}",
        "updatedAt": "{{recent_timestamp}}",
        "metadata": None,
    }
    record.update(overrides)
    return record


def parking_history_record(
    vehicle_id: Any,
    zone_id: Any,
    duration_minutes: int,
    rng: Any,
    status: str = "active",
    **overrides: Any,
) -> Dict[str, Any]:
    start = datetime.now(timezone.utc) - timedelta(minutes=rng.randint(10, 45))
    end = start + timedelta(minutes=duration_minutes)
    record = {
        "id": "{{auto_id}}",
        "userId": "{{current_user_id}}",
        "vehicleId": vehicle_id,
        "parkingZoneId": zone_id,
        "startTime": _iso_z(start),
        "plannedEndTime": _iso_z(end),
        "actualEndTime": None,
        "plannedDurationMinutes": duration_minutes,
        "actualDurationMinutes": None,
        "chargedAmount": round(rng.uniform(5.0, 30.0), 2),
        "currency": "USD",
        "status": status,
        "metadata": None,
        "createdAt": _iso_z(start),
        "updatedAt": _iso_z(start),
    }
    record.update(overrides)
    return record
