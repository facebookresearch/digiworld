"""Composed scenario: book a ride, then report the distance between origin and destination."""

import json
import os

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario, _normalize_location
from digiworld.scenarios.verification import ComposableScenario

_VALID_STATUSES = {
    'booked', 'driver-assigned', 'started', 'ongoing',
    'confirmed', 'pending', 'accepted', 'arriving',
}


def _locations_match(expected: str, actual: str) -> bool:
    """Normalized case-insensitive containment check."""
    if not expected or not actual:
        return False
    e_norm = _normalize_location(expected).lower()
    a_norm = _normalize_location(actual).lower()
    return e_norm in a_norm or a_norm in e_norm


class BookRideAndCheckDistanceScenario(RydeScenario, ComposableScenario):
    """Verify that a ride was booked and the agent reports the route distance."""

    def _get_checks(self, state_path):
        # --- Ride booking checks (from book_ride) ---
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {rootstore_path}")

        with open(rootstore_path, 'r') as f:
            rootstore = json.load(f)

        ride_store = rootstore.get('rideStore', {})
        current_ride = ride_store.get('currentRide')

        ride_booked = (
            current_ride is not None
            and current_ride.get('status', '') in _VALID_STATUSES
        )

        source = current_ride.get('source', '') if current_ride else ''
        destination = current_ride.get('destination', '') if current_ride else ''
        origin_ok = _locations_match(self.origin, source)
        dest_ok = _locations_match(self.destination, destination)

        # --- Distance check (from distance_between_locations) ---
        route = self.get_route_between(self.origin, self.destination)
        if not route:
            raise ValueError(
                f"No route found between '{self.origin}' and '{self.destination}'"
            )

        expected_distance = route["distance_km"]

        return {
            "ride_booked": ride_booked,
            "origin_matches": origin_ok,
            "destination_matches": dest_ok,
            "answer_matches": float_match(
                self.agent_answer, expected_distance, tolerance=0.5
            ),
        }
