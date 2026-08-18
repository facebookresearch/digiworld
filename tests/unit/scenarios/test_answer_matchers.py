# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for answer_matchers module."""

import unittest
from digiworld.scenarios.answer_matchers import (
    extract_numbers,
    float_match,
    boolean_match,
    extract_integers,
    numeric_match,
    substring_match,
    all_substrings_match,
    comma_separated_match,
)


class TestExtractNumbers(unittest.TestCase):
    """Tests for extract_numbers and the _NUMBER_RE regex fix."""

    def test_basic_numbers(self):
        self.assertEqual(extract_numbers("$12.99 and 4.5 stars"), [12.99, 4.5])

    def test_percentage(self):
        self.assertEqual(extract_numbers("15% off"), [15.0])

    def test_comma_formatted_number(self):
        self.assertEqual(extract_numbers("$1,234.56"), [1234.56])

    def test_punctuation_commas_between_numbers(self):
        """The core bug: commas as punctuation between numbers must not crash."""
        result = extract_numbers("The fare is $2.33, and other options are $3.00, $3.85")
        self.assertIn(2.33, result)
        self.assertIn(3.00, result)
        self.assertIn(3.85, result)

    def test_comma_only_does_not_match(self):
        """A standalone comma must not produce a match."""
        result = extract_numbers(", ,, ,")
        self.assertEqual(result, [])

    def test_empty_string(self):
        self.assertEqual(extract_numbers(""), [])

    def test_no_numbers(self):
        self.assertEqual(extract_numbers("no numbers here"), [])

    def test_mixed_commas_and_numbers(self):
        """Numbers with thousand separators alongside punctuation commas."""
        result = extract_numbers("$1,234, $5,678")
        self.assertIn(1234.0, result)
        self.assertIn(5678.0, result)


class TestFloatMatch(unittest.TestCase):

    def test_exact_match(self):
        self.assertTrue(float_match("The price is $2.33", 2.33))

    def test_within_tolerance(self):
        self.assertTrue(float_match("The price is $2.34", 2.33, tolerance=0.02))

    def test_no_match(self):
        self.assertFalse(float_match("The price is $5.00", 2.33))

    def test_comma_punctuation_does_not_crash(self):
        """Regression: answers with punctuation commas must not raise ValueError."""
        result = float_match("The fare is $2.33, and other options are $3.00, $3.85", 2.33)
        self.assertTrue(result)


class TestBooleanMatch(unittest.TestCase):

    def test_yes_keyword(self):
        self.assertTrue(boolean_match("Yes, there are pending bills", True))

    def test_there_are_keyword(self):
        self.assertTrue(boolean_match("There are 3 pending bills", True))

    def test_implicit_affirmative_with_count(self):
        """Agent says 'You have 3 pending bills' without explicit yes/there are."""
        self.assertTrue(boolean_match("You have 3 pending telecom bills", True))

    def test_implicit_affirmative_with_list(self):
        """Agent lists items implying existence."""
        self.assertTrue(boolean_match("The 2 pending bills are from AT&T and Verizon", True))

    def test_no_keyword(self):
        self.assertTrue(boolean_match("No, there are no pending bills", False))

    def test_none_keyword(self):
        self.assertTrue(boolean_match("None found", False))

    def test_negative_with_zero_count(self):
        """'0 pending bills' should NOT be treated as affirmative."""
        self.assertFalse(boolean_match("You have 0 pending bills", True))

    def test_negative_with_number_and_no_keyword(self):
        """NO keyword should override the integer fallback."""
        self.assertFalse(boolean_match("No, you have 0 pending bills", True))

    def test_no_match_for_true(self):
        self.assertFalse(boolean_match("I looked at the bills section", True))

    def test_no_match_for_false(self):
        self.assertFalse(boolean_match("I looked at the bills section", False))


class TestCommaSeparatedMatch(unittest.TestCase):

    def test_exact_order(self):
        self.assertTrue(comma_separated_match(
            "The connectivity is Wi-Fi 6, Bluetooth 5.1, GPS",
            "Wi-Fi 6, Bluetooth 5.1, GPS"
        ))

    def test_reordered(self):
        self.assertTrue(comma_separated_match(
            "It supports Bluetooth 5.1, GPS, and Wi-Fi 6",
            "Wi-Fi 6, Bluetooth 5.1, GPS"
        ))

    def test_extra_words_between(self):
        self.assertTrue(comma_separated_match(
            "The device has Wi-Fi 6 connectivity, Bluetooth 5.1 for peripherals, and GPS for navigation",
            "Wi-Fi 6, Bluetooth 5.1, GPS"
        ))

    def test_missing_part(self):
        self.assertFalse(comma_separated_match(
            "It supports Wi-Fi 6 and Bluetooth 5.1",
            "Wi-Fi 6, Bluetooth 5.1, GPS"
        ))

    def test_single_value(self):
        self.assertTrue(comma_separated_match(
            "The connectivity type is Wi-Fi 6",
            "Wi-Fi 6"
        ))

    def test_case_insensitive(self):
        self.assertTrue(comma_separated_match(
            "WI-FI 6, bluetooth 5.1, gps",
            "Wi-Fi 6, Bluetooth 5.1, GPS"
        ))


if __name__ == "__main__":
    unittest.main()
