# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared primitives for ryde scenario instance generation.

Programmatic only -- reads routes from routes.json.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from digiworld.scenarios.constraints import EntityExistsConstraint
from digiworld.scenarios.scenarios.ryde.base_scenario import _normalize_location

COMPLETED_RIDES_EXIST = EntityExistsConstraint(
    table="rides", user_filter=True, filter={"status": "completed"}, min_count=1
)

COMPLETED_RIDES_WITHOUT_FEEDBACK = EntityExistsConstraint(
    table="rides",
    user_filter=True,
    filter={"status": "completed", "feedback_submitted": 0},
    min_count=1,
)

MULTIPLE_COMPLETED_RIDES = EntityExistsConstraint(
    table="rides", user_filter=True, filter={"status": "completed"}, min_count=2
)

_ROUTES_CACHE: Optional[List[Dict[str, Any]]] = None

_CANDIDATE_PATHS = [
    # Relative to this file: scenarios/scenarios/ryde/ -> up to digiworld
    lambda base: base.resolve().parents[5] / "apps" / "ryde" / "assets" / "maps" / "default" / "routes.json",
    # From state_data default profile
    lambda base: base.resolve().parents[3] / "state_data" / "com.andojoryde.sbx" / "default" / "mockdata" / "routes.json",
    # Directly in ryde scenario dir (fallback)
    lambda base: base.parent / "routes.json",
]


def load_routes() -> List[Dict[str, Any]]:
    """Load route origin/destination pairs from routes.json, cached after first call.

    The file is a GeoJSON FeatureCollection. Each feature's properties
    contain ``from`` and ``to`` addresses plus ``distance_km`` and ``time_min``.
    Returns a flat list of dicts with ``origin`` and ``destination`` keys.
    Location strings are normalized for consistent matching.
    """
    global _ROUTES_CACHE
    if _ROUTES_CACHE is not None:
        return _ROUTES_CACHE

    base = Path(__file__)
    routes_path: Optional[Path] = None
    for resolver in _CANDIDATE_PATHS:
        candidate = resolver(base)
        if candidate.exists():
            routes_path = candidate
            break

    if routes_path is None:
        _ROUTES_CACHE = []
        return _ROUTES_CACHE

    raw = json.loads(routes_path.read_text())
    features = raw.get("features", []) if isinstance(raw, dict) else raw

    routes: List[Dict[str, Any]] = []
    for feature in features:
        props = feature.get("properties", {}) if isinstance(feature, dict) else {}
        origin = props.get("from")
        destination = props.get("to")
        if origin and destination:
            routes.append({
                "origin": _normalize_location(origin),
                "destination": _normalize_location(destination),
                "distance_km": props.get("distance_km"),
                "time_min": props.get("time_min"),
            })

    _ROUTES_CACHE = routes
    return _ROUTES_CACHE


CAR_TYPES = ["Economy", "Comfort", "Premium"]

PAYMENT_METHODS = ["cash", "Visa", "Paypal"]

PAGE_MAP: Dict[str, Dict[str, str]] = {
    "past rides": {"screen_name": "History", "route": "/(tabs)/history"},
    "payment": {"screen_name": "Payment", "route": "/(tabs)/payment"},
    "help": {"screen_name": "Help", "route": "/(tabs)/help"},
    "terms of use": {"screen_name": "Terms of Use", "route": "/(tabs)/terms"},
}


def build_ride_record(
    driver_id: int,
    pickup_location: str,
    drop_location: str,
    distance_km: float,
    fare_amount: float,
    status: str = "completed",
    feedback_submitted: int = 0,
    payment_mode: str = "cash",
    start_time: str = "{{middle_ride_time}}",
    end_time: str = "{{recent_ride_time}}",
    **overrides: Any,
) -> Dict[str, Any]:
    """Build a ride mockdata record with template placeholders."""
    record: Dict[str, Any] = {
        "id": "{{auto_id}}",
        "userId": "{{current_user_id}}",
        "driverId": driver_id,
        "pickupLocation": pickup_location,
        "dropLocation": drop_location,
        "status": status,
        "startTime": start_time,
        "endTime": end_time,
        "distanceKm": distance_km,
        "fareAmount": fare_amount,
        "feedbackSubmitted": feedback_submitted,
        "paymentMode": payment_mode,
    }
    record.update(overrides)
    return record
