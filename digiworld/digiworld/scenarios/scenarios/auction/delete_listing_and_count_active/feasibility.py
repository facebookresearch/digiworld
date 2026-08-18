"""Feasibility constraints for 'delete_listing_and_count_active'.

Requires that user has active items (to delete) and active auctions (to count).
"""

from digiworld.scenarios.scenarios.auction.shared import (
    USER_HAS_ACTIVE_ITEMS,
    USER_HAS_ACTIVE_AUCTIONS,
)

CONSTRAINTS = [USER_HAS_ACTIVE_ITEMS, USER_HAS_ACTIVE_AUCTIONS]
