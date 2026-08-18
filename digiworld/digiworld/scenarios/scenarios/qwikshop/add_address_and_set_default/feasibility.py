"""Feasibility constraints for add_address_and_set_default."""

from digiworld.scenarios.constraints import MaxCountConstraint

CONSTRAINTS = [
    MaxCountConstraint(table="addresses", max_count=2, user_filter=True),
]
