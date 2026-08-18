# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario

_TYPE_MAP = {
    "paypal": "digital_wallet",
    "credit/debit card": "credit_card",
}


class AddDefaultPaymentMethodScenario(RydeScenario, ComposableScenario):
    """Verify a new payment method was added and set as default."""

    def _get_checks(self, state_path):
        expected_type = _TYPE_MAP.get(self.payment_type.lower())
        if not expected_type:
            raise ValueError(f"Unknown payment_type: {self.payment_type}")

        initial_methods = self._execute_query_in_path(
            "SELECT id FROM user_payment_methods WHERE user_id = ?",
            (self.current_user_id,),
            self.initial_state_path,
        )
        final_methods = self._execute_query_in_path(
            "SELECT id, type, is_default FROM user_payment_methods WHERE user_id = ?",
            (self.current_user_id,),
            state_path,
        )

        initial_ids = {row[0] for row in initial_methods}
        new_methods = [row for row in final_methods if row[0] not in initial_ids]

        has_new = len(new_methods) > 0
        type_ok = any(m[1] == expected_type for m in new_methods)
        is_default = any(m[1] == expected_type and m[2] == 1 for m in new_methods)

        return {
            "payment_method_added": has_new,
            "correct_type": type_ok,
            "is_default": is_default,
        }
