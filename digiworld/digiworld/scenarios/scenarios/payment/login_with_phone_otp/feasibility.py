# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for login_with_phone_otp.

The hardcoded phone number must match the profile's user data.
This restricts the scenario to profiles where the credentials are valid.
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="users",
        filter={
            "phone_number": lambda params: params["phone_number"],
        },
        min_count=1,
    ),
]
