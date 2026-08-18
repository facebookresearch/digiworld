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
    build_rootstore,
    create_state_dir,
    make_stub,
)
from .scenario import OpenMostRecentEmailFrom

ALICE_EMAILS = [
    {
        "id": 1,
        "sender": "alice.johnson@example.com",
        "receiver": ["liam.oconnor@gmail.co.uk"],
        "subject": "Hello",
        "body": "First email",
        "status": "received",
        "folder": "inbox",
        "thread_id": "thread_1",
        "timestamp": "2026-01-10T10:00:00.000Z",
    },
    {
        "id": 2,
        "sender": "alice.johnson@example.com",
        "receiver": ["liam.oconnor@gmail.co.uk"],
        "subject": "Follow Up",
        "body": "Second email",
        "status": "received",
        "folder": "inbox",
        "thread_id": "thread_2",
        "timestamp": "2026-01-15T10:00:00.000Z",
    },
]


class TestOpenMostRecentEmailFrom(unittest.TestCase):

    def test_pass_most_recent_opened(self):
        rootstore = build_rootstore(
            screen_name="details",
            route="/screens/mail/thread_2",
        )

        stub = make_stub(OpenMostRecentEmailFrom)
        stub.sender_name = "Alice Johnson"
        stub.initial_state_path = create_state_dir(ALICE_EMAILS)

        state_path = create_state_dir(ALICE_EMAILS, rootstore=rootstore)
        self.assertTrue(stub._check_task_completion(state_path))

    def test_fail_older_email_opened(self):
        rootstore = build_rootstore(
            screen_name="details",
            route="/screens/mail/thread_1",
        )

        stub = make_stub(OpenMostRecentEmailFrom)
        stub.sender_name = "Alice Johnson"
        stub.initial_state_path = create_state_dir(ALICE_EMAILS)

        state_path = create_state_dir(ALICE_EMAILS, rootstore=rootstore)
        self.assertFalse(stub._check_task_completion(state_path))

    def test_fail_not_on_details(self):
        rootstore = build_rootstore(
            screen_name="inbox",
            route="/(tabs)/inbox",
        )

        stub = make_stub(OpenMostRecentEmailFrom)
        stub.sender_name = "Alice Johnson"
        stub.initial_state_path = create_state_dir(ALICE_EMAILS)

        state_path = create_state_dir(ALICE_EMAILS, rootstore=rootstore)
        self.assertFalse(stub._check_task_completion(state_path))

    def test_fail_different_sender(self):
        emails = ALICE_EMAILS + [
            {
                "id": 3,
                "sender": "bob.smith@example.com",
                "receiver": ["liam.oconnor@gmail.co.uk"],
                "subject": "Hey",
                "body": "From Bob",
                "status": "received",
                "folder": "inbox",
                "thread_id": "thread_3",
                "timestamp": "2026-01-16T10:00:00.000Z",
            },
        ]
        rootstore = build_rootstore(
            screen_name="details",
            route="/screens/mail/thread_3",
        )

        stub = make_stub(OpenMostRecentEmailFrom)
        stub.sender_name = "Alice Johnson"
        stub.initial_state_path = create_state_dir(emails)

        state_path = create_state_dir(emails, rootstore=rootstore)
        self.assertFalse(stub._check_task_completion(state_path))


if __name__ == "__main__":
    unittest.main()
