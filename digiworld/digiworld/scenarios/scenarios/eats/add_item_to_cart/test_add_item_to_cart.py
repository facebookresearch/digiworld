# Copyright (c) Meta Platforms, Inc. and affiliates.
import digiworld.scenarios.scenarios.eats.test_helpers  # noqa: F401
"""Tests for AddItemToCartScenario."""

import json
import os
import tempfile
import unittest
from unittest.mock import patch

from .scenario import AddItemToCartScenario


class TestAddItemToCart(unittest.TestCase):

    def _make_scenario(self, **kwargs):
        with patch.object(AddItemToCartScenario, '__init__',
                          lambda self, *a, **kw: None):
            s = AddItemToCartScenario.__new__(AddItemToCartScenario)
        s.restaurant_item = kwargs.pop('restaurant_item', 'Pasta')
        for k, v in kwargs.items():
            setattr(s, k, v)
        return s

    def _write_rootstore(self, directory, data):
        path = os.path.join(directory, "rootstore.json")
        with open(path, "w") as f:
            json.dump(data, f)

    def _cart_rootstore(self, items):
        return {"cartStore": {"items": items}}

    def _cart_item(self, name, item_id=90001, price=12.99):
        return {
            "menuItem": {
                "id": item_id,
                "name": name,
                "price": price,
                "restaurantId": 90001,
                "image": "",
                "description": "",
                "calories": 0,
                "isPopular": False,
                "isActive": True,
                "categoryId": 90001,
            },
            "quantity": 1,
        }

    def test_item_in_cart(self):
        with tempfile.TemporaryDirectory() as d:
            self._write_rootstore(d, self._cart_rootstore(
                [self._cart_item("Pasta")]))
            s = self._make_scenario(restaurant_item='Pasta')
            checks = s._get_checks(d)
            self.assertTrue(checks["item_in_cart"])

    def test_empty_cart(self):
        with tempfile.TemporaryDirectory() as d:
            self._write_rootstore(d, self._cart_rootstore([]))
            s = self._make_scenario(restaurant_item='Pasta')
            checks = s._get_checks(d)
            self.assertFalse(checks["item_in_cart"])

    def test_different_item_in_cart(self):
        with tempfile.TemporaryDirectory() as d:
            self._write_rootstore(d, self._cart_rootstore(
                [self._cart_item("Burger")]))
            s = self._make_scenario(restaurant_item='Pasta')
            checks = s._get_checks(d)
            self.assertFalse(checks["item_in_cart"])

    def test_case_insensitive_match(self):
        with tempfile.TemporaryDirectory() as d:
            self._write_rootstore(d, self._cart_rootstore(
                [self._cart_item("pasta")]))
            s = self._make_scenario(restaurant_item='Pasta')
            checks = s._get_checks(d)
            self.assertTrue(checks["item_in_cart"])

    def test_missing_rootstore_raises(self):
        with tempfile.TemporaryDirectory() as d:
            s = self._make_scenario(restaurant_item='Pasta')
            with self.assertRaises(ValueError):
                s._get_checks(d)


if __name__ == "__main__":
    unittest.main()
