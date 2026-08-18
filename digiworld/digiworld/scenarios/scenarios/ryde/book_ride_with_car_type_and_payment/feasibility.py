# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for booking a ride with a specific payment method.

Non-cash payment methods must exist in the profile's user_payment_methods table
for the current user. Cash is always available and requires no DB check.
"""

from digiworld.scenarios.constraints import DataVolumeConstraint

CONSTRAINTS = [
    DataVolumeConstraint(
        table="user_payment_methods",
        user_filter=True,
        filter={"provider": lambda params: params.get("payment_method", "cash")},
        min_count=lambda params: 0 if params.get("payment_method", "").lower() == "cash" else 1,
    ),
]
