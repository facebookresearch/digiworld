# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for extreme transaction queries.

Requires at least 5 successful transactions to ensure a good chance of having
both incoming and outgoing transactions across different amounts/dates.
"""

from digiworld.scenarios.constraints import DataVolumeConstraint

CONSTRAINTS = [
    DataVolumeConstraint(
        table="transactions",
        user_filter=True,
        filter={"status": "success"},
        min_count=8,
    ),
]
