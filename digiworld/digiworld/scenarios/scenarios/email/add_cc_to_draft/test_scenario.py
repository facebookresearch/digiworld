# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for AddCcToDraft verification logic."""

import unittest

from digiworld.scenarios.scenarios.email.add_cc_to_draft.scenario import (
    AddCcToDraft,
)
from digiworld.scenarios.scenarios.email.test_helpers import (
    create_state_dir,
    make_stub,
)


class TestAddCcToDraft(unittest.TestCase):
    def setUp(self):
        self.stub = make_stub(AddCcToDraft)

    def test_pass_single_cc_added(self):
        emails = [
            {
                "id": 1,
                "sender": "liam.oconnor@gmail.co.uk",
                "subject": "Budget Report",
                "folder": "draft",
                "status": "draft",
                "is_draft": 1,
                "cc": ["alice.johnson@example.com"],
            },
        ]
        state_path = create_state_dir(emails)
        self.stub.recipient_emails = "alice.johnson@example.com"
        self.stub.email_subject = "Budget Report"
        checks = self.stub._get_checks(state_path)
        self.assertTrue(checks["cc_updated"])
        self.assertTrue(checks["all_recipients_added"])

    def test_pass_multiple_cc_added(self):
        emails = [
            {
                "id": 1,
                "sender": "liam.oconnor@gmail.co.uk",
                "subject": "Budget Report",
                "folder": "draft",
                "status": "draft",
                "is_draft": 1,
                "cc": ["alice.johnson@example.com", "bob.smith@example.com"],
            },
        ]
        state_path = create_state_dir(emails)
        self.stub.recipient_emails = "alice.johnson@example.com, bob.smith@example.com"
        self.stub.email_subject = "Budget Report"
        checks = self.stub._get_checks(state_path)
        self.assertTrue(checks["cc_updated"])
        self.assertTrue(checks["all_recipients_added"])

    def test_fail_cc_not_updated(self):
        emails = [
            {
                "id": 1,
                "sender": "liam.oconnor@gmail.co.uk",
                "subject": "Budget Report",
                "folder": "draft",
                "status": "draft",
                "is_draft": 1,
                "cc": [],
            },
        ]
        state_path = create_state_dir(emails)
        self.stub.recipient_emails = "alice.johnson@example.com"
        self.stub.email_subject = "Budget Report"
        checks = self.stub._get_checks(state_path)
        self.assertFalse(checks["cc_updated"])
        self.assertFalse(checks["all_recipients_added"])

    def test_fail_missing_recipient(self):
        emails = [
            {
                "id": 1,
                "sender": "liam.oconnor@gmail.co.uk",
                "subject": "Budget Report",
                "folder": "draft",
                "status": "draft",
                "is_draft": 1,
                "cc": ["alice.johnson@example.com"],
            },
        ]
        state_path = create_state_dir(emails)
        self.stub.recipient_emails = "alice.johnson@example.com, bob.smith@example.com"
        self.stub.email_subject = "Budget Report"
        checks = self.stub._get_checks(state_path)
        self.assertTrue(checks["cc_updated"])
        self.assertFalse(checks["all_recipients_added"])

    def test_fail_no_draft(self):
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
        self.stub.recipient_emails = "alice.johnson@example.com"
        self.stub.email_subject = "Budget Report"
        with self.assertRaises(ValueError):
            self.stub._get_checks(state_path)


if __name__ == "__main__":
    unittest.main()
