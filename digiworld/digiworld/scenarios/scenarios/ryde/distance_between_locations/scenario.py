# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario
from digiworld.scenarios.answer_matchers import float_match


class DistanceBetweenLocationsScenario(RydeScenario, ComposableScenario):
    """Verify the agent correctly reports the distance between two locations."""

    def _get_checks(self, state_path):
        route = self.get_route_between(self.origin, self.destination)
        if not route:
            raise ValueError(f"No route found between '{self.origin}' and '{self.destination}'")

        expected_distance = route["distance_km"]
        return {"answer_matches": float_match(self.agent_answer, expected_distance, tolerance=0.5)}
