# Copyright (c) Meta Platforms, Inc. and affiliates.
import sys
from unittest.mock import MagicMock

for _mod in [
    "packaging",
    "packaging.version",
    "adb_actions",
    "emulator_backends",
    "database_validator",
    "pydantic",
    "digiworld.app_registry",
    "digiworld.profile_variants",
    "digiworld.scenarios.config_loader",
    "digiworld.scenarios.context_extractor",
    "digiworld.scenarios.mockdata_handler",
]:
    if _mod not in sys.modules:
        sys.modules[_mod] = MagicMock()

import unittest

from digiworld.scenarios.scenarios.email.test_helpers import create_state_dir, make_stub

from .scenario import SendEmailWithDetails


class TestSendEmailWithDetails(unittest.TestCase):

    def test_pass_all_checks(self):
        initial_emails = []
        final_emails = [
            {
                "id": 1,
                "sender": "liam.oconnor@gmail.co.uk",
                "receiver": ["alice.johnson@example.com"],
                "subject": "Project Update",
                "body": "Here is the project update as discussed.",
                "status": "sent",
                "folder": "sent",
                "timestamp": "2026-01-15T10:00:00.000Z",
            }
        ]

        stub = make_stub(SendEmailWithDetails)
        stub.recipient_email = "alice.johnson@example.com"
        stub.email_subject = "Project Update"
        stub.email_body = "Here is the project update"
        stub.initial_state_path = create_state_dir(initial_emails)

        checks = stub._get_checks(create_state_dir(final_emails))

        self.assertTrue(checks["email_sent"])
        self.assertTrue(checks["subject_matches"])
        self.assertTrue(checks["recipient_matches"])

    def test_fail_no_sent_emails(self):
        stub = make_stub(SendEmailWithDetails)
        stub.recipient_email = "alice.johnson@example.com"
        stub.email_subject = "Project Update"
        stub.email_body = "Here is the project update"
        stub.initial_state_path = create_state_dir([])

        with self.assertRaises(ValueError):
            stub._get_checks(create_state_dir([]))

    def test_fail_wrong_subject(self):
        initial_emails = []
        final_emails = [
            {
                "id": 1,
                "sender": "liam.oconnor@gmail.co.uk",
                "receiver": ["alice.johnson@example.com"],
                "subject": "Wrong Subject",
                "body": "Here is the project update as discussed.",
                "status": "sent",
                "folder": "sent",
                "timestamp": "2026-01-15T10:00:00.000Z",
            }
        ]

        stub = make_stub(SendEmailWithDetails)
        stub.recipient_email = "alice.johnson@example.com"
        stub.email_subject = "Project Update"
        stub.email_body = "Here is the project update"
        stub.initial_state_path = create_state_dir(initial_emails)

        checks = stub._get_checks(create_state_dir(final_emails))

        self.assertTrue(checks["email_sent"])
        self.assertFalse(checks["subject_matches"])
        self.assertTrue(checks["recipient_matches"])

    def test_fail_wrong_recipient(self):
        initial_emails = []
        final_emails = [
            {
                "id": 1,
                "sender": "liam.oconnor@gmail.co.uk",
                "receiver": ["wrong.person@example.com"],
                "subject": "Project Update",
                "body": "Here is the project update as discussed.",
                "status": "sent",
                "folder": "sent",
                "timestamp": "2026-01-15T10:00:00.000Z",
            }
        ]

        stub = make_stub(SendEmailWithDetails)
        stub.recipient_email = "alice.johnson@example.com"
        stub.email_subject = "Project Update"
        stub.email_body = "Here is the project update"
        stub.initial_state_path = create_state_dir(initial_emails)

        checks = stub._get_checks(create_state_dir(final_emails))

        self.assertTrue(checks["email_sent"])
        self.assertTrue(checks["subject_matches"])
        self.assertFalse(checks["recipient_matches"])


if __name__ == "__main__":
    unittest.main()
