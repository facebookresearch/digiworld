"""Composed scenario: add a payment method, then book a ride with that method."""

import json
import os

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario, _normalize_location

_TYPE_MAP = {
    "paypal": "digital_wallet",
    "credit/debit card": "credit_card",
}

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


class AddPaymentAndBookRideScenario(RydeScenario, ComposableScenario):
    """Verify that a payment method was added and a ride was booked with it."""

    def _get_checks(self, state_path):
        # --- Payment method checks (from add_payment_method) ---
        expected_type = _TYPE_MAP.get(self.payment_type.lower())
        if not expected_type:
            raise ValueError(f"Unknown payment_type: {self.payment_type}")

        initial_methods = self._execute_query_in_path(
            "SELECT id FROM user_payment_methods WHERE user_id = ?",
            (self.current_user_id,),
            self.initial_state_path,
        )
        final_methods = self._execute_query_in_path(
            "SELECT id, type FROM user_payment_methods WHERE user_id = ?",
            (self.current_user_id,),
            state_path,
        )

        initial_ids = {row[0] for row in initial_methods}
        new_methods = [row for row in final_methods if row[0] not in initial_ids]

        has_new_method = len(new_methods) > 0
        type_matches = any(m[1] == expected_type for m in new_methods)

        # --- Ride booking checks (from book_ride_with_car_type_and_payment) ---
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

        current_option = str(ride_store.get('currentRideOption', ''))
        car_type_ok = (
            self.car_type.lower().replace(' ', '')
            == current_option.lower().replace(' ', '')
        )

        # Map payment_type to the provider name used in book_ride verification
        payment_type_lower = self.payment_type.lower()
        if payment_type_lower == "credit/debit card":
            expected_provider = "visa"
        elif payment_type_lower == "paypal":
            expected_provider = "paypal"
        else:
            expected_provider = payment_type_lower

        current_payment = str(ride_store.get('currentPaymentMethod') or '')
        if expected_provider == 'cash':
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
                payment_ok = provider.lower() == expected_provider

        return {
            "payment_method_added": has_new_method,
            "correct_type": type_matches,
            "ride_booked": ride_booked,
            "origin_matches": origin_ok,
            "destination_matches": dest_ok,
            "car_type_matches": car_type_ok,
            "payment_matches": payment_ok,
        }
