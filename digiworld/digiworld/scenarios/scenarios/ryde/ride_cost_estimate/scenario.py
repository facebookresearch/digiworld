# Copyright (c) Meta Platforms, Inc. and affiliates.
import math

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario
from digiworld.scenarios.answer_matchers import float_match


def _js_math_round(value: float) -> int:
    """Match JavaScript Math.round() semantics (round half-up, not half-to-even)."""
    return math.floor(value + 0.5)


class RideCostEstimateScenario(RydeScenario, ComposableScenario):
    """Verify the agent correctly estimates the ride cost for a car type between two locations."""

    def _get_checks(self, state_path):
        route = self.get_route_between(self.origin, self.destination)
        if not route:
            raise ValueError(f"No route found between '{self.origin}' and '{self.destination}'")

        distance_km = route["distance_km"]

        results = self._execute_query_in_path(
            "SELECT rate_per_km FROM ride_options WHERE LOWER(name) = LOWER(?)",
            (self.car_type,),
            self.initial_state_path,
        )
        if not results:
            raise ValueError(f"No ride option found for car type: {self.car_type}")

        rate_per_km = results[0][0]
        expected_fare = _js_math_round(rate_per_km * distance_km)

        return {"answer_matches": float_match(self.agent_answer, expected_fare, tolerance=1.0)}
