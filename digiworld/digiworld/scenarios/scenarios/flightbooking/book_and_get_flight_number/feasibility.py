"""Feasibility constraints for 'book_and_get_flight_number'.

Requires airports to exist (for booking).
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(table="airports", min_count=1),
]
