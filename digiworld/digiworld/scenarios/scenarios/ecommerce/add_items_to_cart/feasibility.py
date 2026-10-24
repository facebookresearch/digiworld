# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for adding three items to the cart.

The verifier needs a new cart row for each item; the app bumps the quantity of
an item that is already in the cart instead, so none of the items may be in the
user's cart at the start.
"""

import sqlite3
from typing import Any, Dict

from digiworld.scenarios.constraints import Constraint


class ItemsNotInCartConstraint(Constraint):
    def evaluate(self, conn: sqlite3.Connection, params: Dict[str, Any]) -> bool:
        names = [str(params[k]).strip().lower() for k in ("item_1", "item_2", "item_3") if params.get(k)]
        try:
            rows = conn.execute(
                "SELECT LOWER(p.name) FROM cart_items ci JOIN products p ON p.id = ci.product_id "
                "WHERE ci.user_id = 1"
            ).fetchall()
        except sqlite3.OperationalError:
            return False
        in_cart = {r[0] for r in rows}
        return not any(n in in_cart for n in names)

    def describe(self) -> str:
        return "ItemsNotInCart(item_1..item_3)"


CONSTRAINTS = [ItemsNotInCartConstraint()]
