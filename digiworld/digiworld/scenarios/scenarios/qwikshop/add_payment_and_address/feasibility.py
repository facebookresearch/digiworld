"""Feasibility constraints for add_payment_and_address."""

from digiworld.scenarios.constraints import MaxCountConstraint

CONSTRAINTS = [
    MaxCountConstraint(table="payment_methods", max_count=1, user_filter=True),
    MaxCountConstraint(table="addresses", max_count=2, user_filter=True),
]
