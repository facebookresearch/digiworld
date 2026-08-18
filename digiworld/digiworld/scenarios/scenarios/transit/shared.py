# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared primitives for transit scenario instance generation."""

from typing import Any, Dict, List

from pydantic import BaseModel

from digiworld.scenarios.builders import write_mockdata
from digiworld.scenarios.constraints import EntityExistsConstraint


class RouteNameBatch(BaseModel):
    names: List[str]


def route_name_prompt(count: int) -> str:
    return (
        f"Generate exactly {count} creative, realistic names for saved "
        f"transit routes in a public transit app. Names should be memorable "
        f"and descriptive (e.g., 'Sunset Express', 'Downtown Commuter', "
        f"'Campus Shuttle'). Ensure variety. "
        f"Return JSON with key 'names' as a list of strings."
    )


TRANSPORT_MODES = ["bus", "subway", "train"]

STOP_NAMES = [
    "Harbor Exchange", "Civic Center Hub", "Market Street Gateway",
    "Skyline Commons", "Innovation Park", "University Square",
    "Aurora Heights", "Seaside Terrace", "Northgate Terminal",
    "Bayside Marina", "Tech Plaza", "Beachfront Pavilion",
]

CITY_CONNECTOR_STOP_NAMES = [
    "Harbor Exchange", "Civic Center Hub", "Market Street Gateway",
    "Skyline Commons", "Innovation Park", "University Square",
    "Aurora Heights", "Seaside Terrace", "Northgate Terminal",
]

LINE_NAMES = [
    "Regional Express", "City Connector", "Metro Line",
]

FAQ_TOPICS = [
    "plan a trip",
    "save my favorite routes",
    "find nearby stops",
    "service alerts",
    "set my home and work stops",
    "real-time arrival times",
]

FAQ_ANSWERS = {
    "plan a trip": (
        "Simply enter your starting point and destination in the Plan tab. "
        "The app will show you the best route options with estimated travel "
        "times and fares."
    ),
    "save my favorite routes": (
        "After planning a trip, you can save it by tapping the bookmark icon. "
        "Saved routes will appear in the Saved tab for quick access."
    ),
    "find nearby stops": (
        "The Nearby tab automatically shows stops close to your location. "
        "You can filter by transportation mode (bus, train, subway) to see "
        "specific options."
    ),
    "service alerts": (
        "Service alerts notify you about delays, route changes, or service "
        "disruptions. Check the Alerts tab regularly for the latest updates."
    ),
    "set my home and work stops": (
        'Go to your Profile tab, then tap on "Home Stop" or "Work Stop" to '
        "search and select your preferred stops. This makes trip planning faster."
    ),
    "real-time arrival times": (
        "Yes! When you view a stop, you'll see real-time arrival information "
        "for all vehicles serving that stop, including the next arrival times."
    ),
}


def saved_route_record(
    name: str,
    rng: Any,
    **overrides: Any,
) -> Dict[str, Any]:
    mode = rng.choice(TRANSPORT_MODES)
    origin_num = rng.randint(1, 12)
    dest_num = rng.randint(1, 12)
    while dest_num == origin_num:
        dest_num = rng.randint(1, 12)
    record = {
        "id": f"saved-{name.lower().replace(' ', '-')}",
        "userId": 1,
        "name": name,
        "originStopId": f"stop-{origin_num}",
        "destinationStopId": f"stop-{dest_num}",
        "preferredMode": mode,
        "remindersEnabled": rng.choice([True, False]),
        "departureReminderMinutes": rng.choice([10, 15, 20, 30]),
        "createdAt": "{{middle_timestamp}}",
        "updatedAt": "{{middle_timestamp}}",
    }
    record.update(overrides)
    return record


ALERT_TITLES = [
    "Nightly Maintenance on S1",
    "Skyline Loop Detour",
    "Aurora Line Delays",
]

_ALERT_DETAILS: Dict[str, Dict[str, Any]] = {
    "Nightly Maintenance on S1": {
        "severity": "high",
        "description": (
            "Nightly track maintenance on Subway Line S1 between "
            "Civic Center Hub and Innovation Park. Expect delays of "
            "15-20 minutes during late-night service."
        ),
        "recommendedAlternatives": (
            "Use B1 to Civic Center Hub and transfer to S1. "
            "Bus routes B2 and B3 also serve this corridor."
        ),
    },
    "Skyline Loop Detour": {
        "severity": "medium",
        "description": (
            "Due to road construction, the Skyline Loop bus route is "
            "temporarily detoured via Harbor Exchange. All scheduled stops "
            "remain served but travel time is increased by 5-10 minutes."
        ),
        "recommendedAlternatives": (
            "Consider the Regional Express or Metro Line for faster "
            "connections between affected stops."
        ),
    },
    "Aurora Line Delays": {
        "severity": "high",
        "description": (
            "Signal equipment failure on the Aurora Line is causing delays "
            "of up to 25 minutes during peak hours. Crews are on site "
            "and repairs are expected to complete by end of day."
        ),
        "recommendedAlternatives": (
            "Use the City Connector bus service for parallel routes. "
            "Subway Line S1 also connects major stops."
        ),
    },
    "Morning Fog Advisory": {
        "severity": "low",
        "description": (
            "Dense fog conditions may cause minor delays on surface-level "
            "transit routes, particularly bus lines in the harbor area."
        ),
        "recommendedAlternatives": (
            "Subway and underground services are unaffected. "
            "Allow extra travel time for bus routes."
        ),
    },
    "Weekend Schedule Change": {
        "severity": "low",
        "description": (
            "Weekend service schedule is in effect. Frequency is reduced "
            "on all lines. Last trains depart 1 hour earlier than weekday "
            "schedule."
        ),
        "recommendedAlternatives": (
            "Check the updated timetable in the app. Night bus service "
            "runs hourly after last train departure."
        ),
    },
}


def stop_record(
    name: str,
    stop_id: str = "{{auto_id}}",
    area_id: int = 1,
    **overrides: Any,
) -> Dict[str, Any]:
    """Build a stops mockdata record for injection."""
    record = {
        "id": stop_id,
        "name": name,
        "areaId": area_id,
        "description": f"Stop: {name}",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "modesServed": "bus,subway",
        "facilities": "bench,shelter",
        "amenities": "wifi",
        "accessibility": "wheelchair_accessible",
    }
    record.update(overrides)
    return record


def line_record(
    name: str,
    mode: str = "bus",
    **overrides: Any,
) -> Dict[str, Any]:
    """Build a lines mockdata record for injection."""
    record = {
        "id": f"line-{name.lower().replace(' ', '-')}",
        "name": name,
        "shortName": name[:3].upper(),
        "mode": mode,
        "color": "#0066CC",
        "operatingHoursStart": "05:00",
        "operatingHoursEnd": "23:30",
        "frequencyMinutes": 15,
        "status": "on-time",
    }
    record.update(overrides)
    return record


def service_alert_record(
    title: str,
    severity: str = "medium",
    **overrides: Any,
) -> Dict[str, Any]:
    """Build a service_alerts mockdata record for injection.

    Uses enriched per-title details when available so the alert
    has realistic description and alternatives text.
    """
    details = _ALERT_DETAILS.get(title, {})
    record = {
        "id": f"alert-{title.lower().replace(' ', '-')[:30]}",
        "severity": details.get("severity", severity),
        "title": title,
        "description": details.get(
            "description", f"Service alert: {title}"
        ),
        "icon": "warning",
        "recommendedAlternatives": details.get(
            "recommendedAlternatives", "Use alternative routes"
        ),
        "createdAt": "{{past_timestamp}}",
        "expiresAt": None,
        "isActive": 1,
    }
    record.update(overrides)
    return record


STOPS_EXIST = EntityExistsConstraint(table="stops", min_count=2)

SAVED_ROUTES_EXIST = EntityExistsConstraint(
    table="saved_routes", user_filter=True, min_count=1
)

LINES_EXIST = EntityExistsConstraint(table="lines", min_count=1)

SERVICE_ALERTS_EXIST = EntityExistsConstraint(
    table="service_alerts", min_count=1
)

TRIP_OPTIONS_EXIST = EntityExistsConstraint(table="trip_options", min_count=1)

USER_PREFERENCES_EXIST = EntityExistsConstraint(
    table="user_preferences", user_filter=True, min_count=1
)

VEHICLES_EXIST = EntityExistsConstraint(table="vehicles", min_count=1)
