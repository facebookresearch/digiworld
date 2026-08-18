"""Feasibility constraints for schedule-payment-and-report-amount.

Same as schedule_payment: requires billers and at least 1 user account.
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="billers",
        min_count=3,
    ),
    EntityExistsConstraint(
        table="accounts",
        user_filter=True,
        min_count=1,
    ),
]
