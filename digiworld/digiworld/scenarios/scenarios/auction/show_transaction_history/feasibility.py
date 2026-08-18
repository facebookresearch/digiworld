# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Show me my transaction history for <transactionType>'.

Uses a dynamic filter so that each instance is only compatible with
profiles where user 1 actually has transactions of the requested type.
"""

from digiworld.scenarios.constraints import DataVolumeConstraint

CONSTRAINTS = [
    DataVolumeConstraint(
        table="transactions",
        min_count=1,
        user_filter=True,
        filter={
            "transaction_type": lambda params: params.get("transactionType", "purchase"),
        },
    ),
]
