# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Empty the cart'.

Note: the actual verification uses a JOIN (cart_items JOIN carts WHERE
carts.user_id = ?), but the constraint system does not support JOINs.
EntityExistsConstraint on cart_items is an approximation that catches the
main failure case (completely empty table).
"""

from digiworld.scenarios.scenarios.ecommerce.shared import CART_HAS_ITEMS

CONSTRAINTS = [CART_HAS_ITEMS]
