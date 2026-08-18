# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario, _normalize_location


def _locations_match(expected: str, actual: str) -> bool:
    """Normalized case-insensitive containment check, guarding against empty strings."""
    if not expected or not actual:
        return False
    e_norm = _normalize_location(expected).lower()
    a_norm = _normalize_location(actual).lower()
    return e_norm in a_norm or a_norm in e_norm


class BookRideWithCarTypeAndPaymentScenario(RydeScenario, ComposableScenario):
    """Verify a ride was booked with the specified car type and payment method."""

    _VALID_STATUSES = {'booked', 'driver-assigned', 'started', 'ongoing',
                       'confirmed', 'pending', 'accepted', 'arriving'}

    def _get_checks(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {rootstore_path}")

        with open(rootstore_path, 'r') as f:
            rootstore = json.load(f)

        ride_store = rootstore.get('rideStore', {})
        current_ride = ride_store.get('currentRide')

        ride_booked = (
            current_ride is not None
            and current_ride.get('status', '') in self._VALID_STATUSES
        )

        source = current_ride.get('source', '') if current_ride else ''
        destination = current_ride.get('destination', '') if current_ride else ''
        origin_ok = _locations_match(self.origin, source)
        dest_ok = _locations_match(self.destination, destination)

        current_option = str(ride_store.get('currentRideOption', ''))
        car_type_ok = self.car_type.lower().replace(' ', '') == current_option.lower().replace(' ', '')

        current_payment = str(ride_store.get('currentPaymentMethod') or '')
        if self.payment_method.lower() == 'cash':
            payment_ok = current_payment.lower() == 'cash'
        else:
            if not current_payment or current_payment.lower() == 'cash':
                payment_ok = False
            else:
                payment_id = int(current_payment) if current_payment.isdigit() else -1
                rows = self._execute_query_in_path(
                    "SELECT provider FROM user_payment_methods WHERE id = ?",
                    (payment_id,),
                    state_path,
                )
                provider = (rows[0][0] if rows and rows[0][0] else '')
                payment_ok = provider.lower() == self.payment_method.lower()

        return {
            "ride_booked": ride_booked,
            "origin_matches": origin_ok,
            "destination_matches": dest_ok,
            "car_type_matches": car_type_ok,
            "payment_matches": payment_ok,
        }
