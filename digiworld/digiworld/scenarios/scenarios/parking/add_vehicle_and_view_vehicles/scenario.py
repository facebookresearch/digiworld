"""Composed scenario: add a vehicle then navigate to My Vehicles."""

import json
import logging
import os
from typing import Dict

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.parking.base_scenario import ParkingScenario

logger = logging.getLogger(__name__)


class AddVehicleAndViewVehiclesScenario(ParkingScenario, ComposableScenario):
    """Verify that the agent added a vehicle and navigated to the vehicles page.

    Combines add_vehicle (vehicle exists with correct plate in DB)
    + view_my_vehicles (current screen is the vehicles list).
    Both are verifiable in the final state.
    """

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # Check 1: vehicle was created
        vehicle_query = """
            SELECT v.make, v.model, v.color, v.nickname, vt.name
            FROM vehicles v
            JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
            WHERE LOWER(v.plate_number) = LOWER(?) AND v.user_id = ?
        """
        vehicle_results = self._execute_query_in_path(
            vehicle_query, (self.license_plate, self.current_user_id), state_path
        )

        if not vehicle_results:
            return {
                "vehicle_created": False,
                "correct_nickname": False,
                "on_vehicles_page": False,
            }

        db_make, db_model, db_color, db_nickname, db_type_name = vehicle_results[0]
        vehicle_created = True
        correct_nickname = (db_nickname or "").lower() == self.nickname.lower()

        # Check 2: on vehicles page
        rootstore_path = os.path.join(state_path, "rootstore.json")
        on_vehicles_page = False
        if os.path.exists(rootstore_path):
            with open(rootstore_path, "r") as f:
                rootstore = json.load(f)

            current_session = self.get_current_session(rootstore)
            if current_session:
                screen_name = current_session.get("data", {}).get("screenName", "").lower()
                route = current_session.get("data", {}).get("route", "").lower()

                if ("vehicle" in screen_name or "vehicle" in route
                        or "my cars" in screen_name or "/cars" in route
                        or "garage" in screen_name or "garage" in route):
                    on_vehicles_page = True

        logger.info(
            "Add vehicle + view: vehicle_created=%s, correct_nickname=%s, "
            "on_vehicles_page=%s",
            vehicle_created, correct_nickname, on_vehicles_page,
        )

        return {
            "vehicle_created": vehicle_created,
            "correct_nickname": correct_nickname,
            "on_vehicles_page": on_vehicles_page,
        }
