# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for flightbooking template_resolver."""

import unittest
from datetime import datetime, timedelta
from digiworld.scenarios.scenarios.flightbooking.template_resolver import FlightBookingTemplateResolver


class TestFlightBookingTemplateResolver(unittest.TestCase):

    def setUp(self):
        self.user_context = {
            'current_user_email': 'test@example.com',
            'current_user_id': '1',
        }
        self.resolver = FlightBookingTemplateResolver(self.user_context)

    def test_tomorrow_date_is_actually_tomorrow(self):
        """{{tomorrow_date}} must resolve to tomorrow, not today."""
        result = self.resolver.resolve('{{tomorrow_date}}')
        today = datetime.utcnow().date()
        tomorrow = today + timedelta(days=1)
        self.assertEqual(result, tomorrow.strftime("%Y-%m-%d"))

    def test_tomorrow_date_plus1_is_day_after_tomorrow(self):
        result = self.resolver.resolve('{{tomorrow_date_plus1}}')
        today = datetime.utcnow().date()
        expected = today + timedelta(days=2)
        self.assertEqual(result, expected.strftime("%Y-%m-%d"))

    def test_tomorrow_date_plus7_is_8_days_from_now(self):
        result = self.resolver.resolve('{{tomorrow_date_plus7}}')
        today = datetime.utcnow().date()
        expected = today + timedelta(days=8)
        self.assertEqual(result, expected.strftime("%Y-%m-%d"))

    def test_tomorrow_date_in_longer_string(self):
        """Template tags embedded in a longer string should be replaced."""
        result = self.resolver.resolve('{{tomorrow_date}}T15:45:00Z')
        today = datetime.utcnow().date()
        tomorrow = today + timedelta(days=1)
        self.assertEqual(result, f"{tomorrow.strftime('%Y-%m-%d')}T15:45:00Z")

    def test_non_template_passthrough(self):
        """Non-template strings should pass through unchanged."""
        result = self.resolver.resolve('plain text')
        self.assertEqual(result, 'plain text')


if __name__ == '__main__':
    unittest.main()
