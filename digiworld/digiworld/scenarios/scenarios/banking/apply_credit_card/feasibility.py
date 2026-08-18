# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for credit card application.

The app enforces a per-user credit card limit.  Profiles that already
have the maximum number of cards cannot create a new one, so they must
be excluded.
"""

from digiworld.scenarios.constraints import MaxCountConstraint

CONSTRAINTS = [
    MaxCountConstraint(table="credit_cards", max_count=0, user_filter=True),
]
