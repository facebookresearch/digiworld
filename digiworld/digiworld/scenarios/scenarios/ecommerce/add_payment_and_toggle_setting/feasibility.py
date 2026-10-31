# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for adding a payment method and toggling a setting.

The app enforces a limit of 2 payment methods per user.
The profile must have fewer than 2 existing methods.
"""

from digiworld.scenarios.constraints import MaxCountConstraint

CONSTRAINTS = [
    MaxCountConstraint(table="payment_methods", max_count=1, user_filter=True),
]
