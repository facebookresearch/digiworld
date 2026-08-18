# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Composed scenario: add a new address, then place an order."""

import logging

from digiworld.scenarios.scenarios.eats.base_scenario import EatsScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AddAddressAndOrderScenario(EatsScenario, ComposableScenario):
    """Verify that a new address was added and an order was placed."""

    def _get_checks(self, state_path):
        # --- Address checks (from add_new_address) ---
        initial_addresses = self._execute_query_in_path(
            "SELECT id FROM user_addresses WHERE user_id = ?",
            (self.current_user_id,),
            self.initial_state_path,
        )
        final_addresses = self._execute_query_in_path(
            "SELECT id, label, address_line_1, city, state, postal_code, country "
            "FROM user_addresses WHERE user_id = ?",
            (self.current_user_id,),
            state_path,
        )

        initial_ids = {row[0] for row in initial_addresses}
        new_addresses = [row for row in final_addresses if row[0] not in initial_ids]

        address_added = len(new_addresses) > 0
        address_correct = False

        target_label = self.label
        target_line1 = self.address_line1.lower().strip()
        target_city = self.city.lower()
        target_state = self.state.lower()
        target_postcode = self.postcode.lower()
        target_country = self.country.lower()

        for addr in new_addresses:
            db_label = addr[1] or ""
            db_line1 = (addr[2] or "").lower().strip()
            db_city = (addr[3] or "").lower()
            db_state = (addr[4] or "").lower()
            db_postcode = (addr[5] or "").lower()
            db_country = (addr[6] or "").lower()

            if (
                target_label == db_label
                and (target_line1 in db_line1 or db_line1 in target_line1)
                and target_city == db_city
                and target_state == db_state
                and target_postcode == db_postcode
                and (target_country in db_country or db_country in target_country)
            ):
                address_correct = True
                break

        # --- Order checks (from order_item) ---
        restaurant_name = self.restaurant
        restaurant_item = self.restaurant_item
        requested_quantity = int(self.quantity)

        restaurant_rows = self._execute_query_in_path(
            "SELECT id FROM restaurants WHERE LOWER(name) = LOWER(?)",
            (restaurant_name,),
            self.initial_state_path,
        )
        if not restaurant_rows:
            raise ValueError(
                f"Restaurant '{restaurant_name}' not found in initial state"
            )
        restaurant_id = restaurant_rows[0][0]

        item_rows = self._execute_query_in_path(
            "SELECT id FROM menu_items "
            "WHERE LOWER(name) = LOWER(?) AND restaurant_id = ?",
            (restaurant_item, restaurant_id),
            self.initial_state_path,
        )
        if not item_rows:
            raise ValueError(
                f"Menu item '{restaurant_item}' not found at "
                f"restaurant '{restaurant_name}'"
            )
        menu_item_id = item_rows[0][0]

        _, _, new_orders = self.compare_database_records(
            self.initial_state_path,
            state_path,
            "SELECT id, user_id, restaurant_id, status, total "
            "FROM orders WHERE user_id = ? AND restaurant_id = ?",
            (self.current_user_id, restaurant_id),
        )

        order_placed = len(new_orders) > 0
        correct_item = False
        correct_quantity = False

        if order_placed:
            latest_order_rows = self._execute_query_in_path(
                "SELECT id FROM orders "
                "WHERE user_id = ? AND restaurant_id = ? "
                "ORDER BY created_at DESC, id DESC LIMIT 1",
                (self.current_user_id, restaurant_id),
                state_path,
            )
            if latest_order_rows:
                new_order_id = latest_order_rows[0][0]
                order_items = self._execute_query_in_path(
                    "SELECT menu_item_id, quantity FROM order_items "
                    "WHERE order_id = ?",
                    (new_order_id,),
                    state_path,
                )
                for row in order_items:
                    if row[0] == menu_item_id:
                        correct_item = True
                        if row[1] == requested_quantity:
                            correct_quantity = True
                        break

        return {
            "address_added": address_added,
            "address_correct": address_correct,
            "order_placed": order_placed,
            "correct_item": correct_item,
            "correct_quantity": correct_quantity,
        }
