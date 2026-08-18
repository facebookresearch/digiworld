"""Feasibility constraints for 'create_buynow_and_count_sold'.

Requires that user has at least one sold listing (to have a meaningful count).
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="items", min_count=1, filter={"seller_id": 1, "status": "sold"}
    ),
]
