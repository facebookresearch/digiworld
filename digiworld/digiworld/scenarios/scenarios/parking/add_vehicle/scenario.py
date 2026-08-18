# Copyright (c) Meta Platforms, Inc. and affiliates.
from typing import Dict

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.parking.base_scenario import ParkingScenario


class AddVehicleScenario(ParkingScenario, ComposableScenario):
    """Scenario for adding a new vehicle to the user's account."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        query = """
            SELECT v.make, v.model, v.color, v.nickname, vt.name
            FROM vehicles v
            JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
            WHERE LOWER(v.plate_number) = LOWER(?) AND v.user_id = ?
        """
        results = self._execute_query_in_path(
            query, (self.license_plate, self.current_user_id), state_path
        )
        if not results:
            return {
                "vehicle_created": False,
                "correct_make": False,
                "correct_model": False,
                "correct_color": False,
                "correct_nickname": False,
                "correct_vehicle_type": False,
            }
        db_make, db_model, db_color, db_nickname, db_type_name = results[0]
        return {
            "vehicle_created": True,
            "correct_make": (db_make or "").lower() == self.make.lower(),
            "correct_model": (db_model or "").lower() == self.model.lower(),
            "correct_color": (db_color or "").lower() == self.color.lower(),
            "correct_nickname": (db_nickname or "").lower() == self.nickname.lower(),
            "correct_vehicle_type": (db_type_name or "").lower() == self.vehicle_type.lower(),
        }
