# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for CreditCardInfoQueryScenario verification logic."""

import unittest
from unittest.mock import MagicMock, patch

from .scenario import CreditCardInfoQueryScenario


class TestCreditCardInfoQueryScenario(unittest.TestCase):
    def _make_scenario(self, **kwargs):
        with patch.object(CreditCardInfoQueryScenario, '__init__', lambda self, *a, **kw: None):
            scenario = CreditCardInfoQueryScenario.__new__(CreditCardInfoQueryScenario)
        scenario.current_user_id = kwargs.pop('current_user_id', 1)
        scenario.initial_state_path = kwargs.pop('initial_state_path', '/tmp/test')
        scenario._state_manager = MagicMock()
        scenario._execute_query_in_path = kwargs.pop(
            '_execute_query_in_path',
            MagicMock(return_value=[]),
        )
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def test_apr_correct(self):
        scenario = self._make_scenario(
            info_type="APR",
            agent_answer="The APR for your card is 18.99%",
            _execute_query_in_path=MagicMock(return_value=[(18.99, 95.0, 35.0, 5.0, 2.0)]),
        )
        checks = scenario._get_checks("/tmp/test")
        self.assertTrue(checks["answer_matches"])

    def test_apr_wrong(self):
        scenario = self._make_scenario(
            info_type="APR",
            agent_answer="The APR is 25.99%",
            _execute_query_in_path=MagicMock(return_value=[(18.99, 95.0, 35.0, 5.0, 2.0)]),
        )
        checks = scenario._get_checks("/tmp/test")
        self.assertFalse(checks["answer_matches"])

    def test_annual_fee_correct(self):
        scenario = self._make_scenario(
            info_type="annual fee",
            agent_answer="The annual fee is $0 for the first year and then $95.",
            _execute_query_in_path=MagicMock(return_value=[(18.99, 95.0, 35.0, 5.0, 2.0)]),
        )
        checks = scenario._get_checks("/tmp/test")
        self.assertTrue(checks["answer_matches"])

    def test_late_payment_fee_correct(self):
        scenario = self._make_scenario(
            info_type="late payment fee",
            agent_answer="The late payment fee is $35",
            _execute_query_in_path=MagicMock(return_value=[(18.99, 95.0, 35.0, 5.0, 2.0)]),
        )
        checks = scenario._get_checks("/tmp/test")
        self.assertTrue(checks["answer_matches"])

    def test_cash_advance_fee_correct(self):
        scenario = self._make_scenario(
            info_type="cash advance fee",
            agent_answer="The cash advance fee is 5% of the advance amount",
            _execute_query_in_path=MagicMock(return_value=[(18.99, 95.0, 35.0, 5.0, 2.0)]),
        )
        checks = scenario._get_checks("/tmp/test")
        self.assertTrue(checks["answer_matches"])

    def test_minimum_payment_correct(self):
        scenario = self._make_scenario(
            info_type="minimum payment",
            agent_answer="The minimum payment is 2% of your outstanding balance",
            _execute_query_in_path=MagicMock(return_value=[(18.99, 95.0, 35.0, 5.0, 2.0)]),
        )
        checks = scenario._get_checks("/tmp/test")
        self.assertTrue(checks["answer_matches"])

    def test_falls_back_to_latest_card_when_no_active_card(self):
        execute_query = MagicMock(
            side_effect=[[], [(24.99, 0.0, 35.0, 5.0, 2.0)]]
        )
        scenario = self._make_scenario(
            info_type="late payment fee",
            agent_answer="The late payment fee is $35",
            _execute_query_in_path=execute_query,
        )
        checks = scenario._get_checks("/tmp/test")
        self.assertTrue(checks["answer_matches"])
        self.assertEqual(execute_query.call_count, 2)

    def test_missing_credit_card_raises(self):
        scenario = self._make_scenario(
            info_type="annual fee",
            agent_answer="The annual fee is $95",
            _execute_query_in_path=MagicMock(side_effect=[[], []]),
        )
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")

    def test_unknown_info_type_raises(self):
        scenario = self._make_scenario(
            info_type="rewards rate",
            agent_answer="Some answer"
        )
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")

    def test_missing_info_type_raises(self):
        scenario = self._make_scenario(
            agent_answer="Some answer"
        )
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")


if __name__ == "__main__":
    unittest.main()
