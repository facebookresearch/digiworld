# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for GetMostRecentSentInfo verification logic."""

import unittest

from digiworld.scenarios.scenarios.email.get_most_recent_sent_info.scenario import (
    GetMostRecentSentInfo,
)
from digiworld.scenarios.scenarios.email.test_helpers import (
    create_state_dir,
    make_stub,
)


class TestGetMostRecentSentInfo(unittest.TestCase):
    def setUp(self):
        self.stub = make_stub(GetMostRecentSentInfo)

    def test_pass_both_match(self):
        emails = [
            {
                "id": 1,
                "sender": "liam.oconnor@gmail.co.uk",
                "receiver": ["bob.smith@example.com"],
                "subject": "Budget Report",
                "folder": "sent",
                "status": "sent",
                "timestamp": "2026-01-10T10:00:00.000Z",
            },
            {
                "id": 2,
                "sender": "liam.oconnor@gmail.co.uk",
                "receiver": ["alice.jones@example.com"],
                "subject": "Quarterly Review",
                "folder": "sent",
                "status": "sent",
                "timestamp": "2026-01-15T10:00:00.000Z",
            },
        ]
        state_path = create_state_dir(emails)
        self.stub.initial_state_path = state_path
        self.stub.agent_answer = (
            "Your most recent sent email has subject 'Quarterly Review' "
            "and was sent to alice.jones@example.com"
        )
        checks = self.stub._get_checks(state_path)
        self.assertTrue(checks["subject_matches"])
        self.assertTrue(checks["recipient_matches"])

    def test_fail_wrong_subject(self):
        emails = [
            {
                "id": 1,
                "sender": "liam.oconnor@gmail.co.uk",
                "receiver": ["bob.smith@example.com"],
                "subject": "Budget Report",
                "folder": "sent",
                "status": "sent",
                "timestamp": "2026-01-10T10:00:00.000Z",
            },
            {
                "id": 2,
                "sender": "liam.oconnor@gmail.co.uk",
                "receiver": ["alice.jones@example.com"],
                "subject": "Quarterly Review",
                "folder": "sent",
                "status": "sent",
                "timestamp": "2026-01-15T10:00:00.000Z",
            },
        ]
        state_path = create_state_dir(emails)
        self.stub.initial_state_path = state_path
        self.stub.agent_answer = (
            "Subject is 'Budget Report' to alice.jones@example.com"
        )
        checks = self.stub._get_checks(state_path)
        self.assertFalse(checks["subject_matches"])

    def test_fail_no_sent_emails(self):
        emails = [
            {
                "id": 1,
                "sender": "liam.oconnor@gmail.co.uk",
                "receiver": ["bob@example.com"],
                "subject": "Hello",
                "folder": "inbox",
                "status": "received",
                "is_draft": 0,
            },
        ]
        state_path = create_state_dir(emails)
        self.stub.initial_state_path = state_path
        self.stub.agent_answer = "No sent emails"
        with self.assertRaises(ValueError):
            self.stub._get_checks(state_path)


if __name__ == "__main__":
    unittest.main()
