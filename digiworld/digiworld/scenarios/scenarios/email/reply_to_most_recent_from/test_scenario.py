# Copyright (c) Meta Platforms, Inc. and affiliates.
import sys
from unittest.mock import MagicMock

for _mod in [
    "packaging", "packaging.version",
    "adb_actions", "emulator_backends",
    "database_validator", "pydantic",
    "digiworld.app_registry", "digiworld.profile_variants",
    "digiworld.scenarios.config_loader",
    "digiworld.scenarios.context_extractor",
    "digiworld.scenarios.mockdata_handler",
]:
    if _mod not in sys.modules:
        sys.modules[_mod] = MagicMock()

import unittest

from digiworld.scenarios.scenarios.email.test_helpers import (
    create_state_dir,
    make_stub,
)
from .scenario import ReplyToMostRecentFrom

INCOMING_EMAIL = {
    "id": 1,
    "sender": "alice.johnson@example.com",
    "receiver": ["liam.oconnor@gmail.co.uk"],
    "subject": "Hello",
    "body": "Hi Liam, just checking in.",
    "status": "received",
    "folder": "inbox",
    "thread_id": "thread_1",
    "timestamp": "2026-01-10T10:00:00.000Z",
}


class TestReplyToMostRecentFrom(unittest.TestCase):

    def test_pass_reply_sent_with_body(self):
        initial_emails = [INCOMING_EMAIL]
        final_emails = [
            INCOMING_EMAIL,
            {
                "id": 2,
                "sender": "liam.oconnor@gmail.co.uk",
                "receiver": ["alice.johnson@example.com"],
                "subject": "Re: Hello",
                "body": "Thanks for the update, I'll review it.",
                "status": "sent",
                "folder": "sent",
                "thread_id": "thread_1",
                "timestamp": "2026-01-10T12:00:00.000Z",
            },
        ]

        stub = make_stub(ReplyToMostRecentFrom)
        stub.sender_name = "Alice Johnson"
        stub.email_body = "Thanks for the update"
        stub.initial_state_path = create_state_dir(initial_emails)

        checks = stub._get_checks(create_state_dir(final_emails))

        self.assertTrue(checks["reply_sent"])
        self.assertTrue(checks["reply_body_matches"])

    def test_fail_no_reply(self):
        emails = [INCOMING_EMAIL]

        stub = make_stub(ReplyToMostRecentFrom)
        stub.sender_name = "Alice Johnson"
        stub.email_body = "Thanks for the update"
        stub.initial_state_path = create_state_dir(emails)

        checks = stub._get_checks(create_state_dir(emails))

        self.assertFalse(checks["reply_sent"])
        self.assertFalse(checks["reply_body_matches"])

    def test_fail_wrong_body(self):
        initial_emails = [INCOMING_EMAIL]
        final_emails = [
            INCOMING_EMAIL,
            {
                "id": 2,
                "sender": "liam.oconnor@gmail.co.uk",
                "receiver": ["alice.johnson@example.com"],
                "subject": "Re: Hello",
                "body": "Completely unrelated content.",
                "status": "sent",
                "folder": "sent",
                "thread_id": "thread_1",
                "timestamp": "2026-01-10T12:00:00.000Z",
            },
        ]

        stub = make_stub(ReplyToMostRecentFrom)
        stub.sender_name = "Alice Johnson"
        stub.email_body = "Thanks for the update"
        stub.initial_state_path = create_state_dir(initial_emails)

        checks = stub._get_checks(create_state_dir(final_emails))

        self.assertTrue(checks["reply_sent"])
        self.assertFalse(checks["reply_body_matches"])


if __name__ == "__main__":
    unittest.main()
