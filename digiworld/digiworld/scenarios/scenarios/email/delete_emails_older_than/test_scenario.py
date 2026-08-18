# Copyright (c) Meta Platforms, Inc. and affiliates.
import unittest

from digiworld.scenarios.scenarios.email.test_helpers import (
    create_state_dir,
    make_stub,
)

from .scenario import DeleteEmailsOlderThan

BASE_EMAILS = [
    {
        "id": 1,
        "sender": "someone@example.com",
        "receiver": ["liam.oconnor@gmail.co.uk"],
        "subject": "Old email 1",
        "body": "Old body 1",
        "timestamp": "2026-01-05T10:00:00.000Z",
        "status": "received",
        "folder": "inbox",
    },
    {
        "id": 2,
        "sender": "someone@example.com",
        "receiver": ["liam.oconnor@gmail.co.uk"],
        "subject": "Old email 2",
        "body": "Old body 2",
        "timestamp": "2026-01-08T10:00:00.000Z",
        "status": "received",
        "folder": "inbox",
    },
    {
        "id": 3,
        "sender": "someone@example.com",
        "receiver": ["liam.oconnor@gmail.co.uk"],
        "subject": "Recent email 1",
        "body": "Recent body 1",
        "timestamp": "2026-01-20T10:00:00.000Z",
        "status": "received",
        "folder": "inbox",
    },
    {
        "id": 4,
        "sender": "someone@example.com",
        "receiver": ["liam.oconnor@gmail.co.uk"],
        "subject": "Recent email 2",
        "body": "Recent body 2",
        "timestamp": "2026-01-25T10:00:00.000Z",
        "status": "received",
        "folder": "inbox",
    },
]


def _with_folder_overrides(overrides):
    """Return a copy of BASE_EMAILS with folder overrides by id."""
    emails = []
    for em in BASE_EMAILS:
        copy = dict(em)
        if copy["id"] in overrides:
            copy["folder"] = overrides[copy["id"]]
        emails.append(copy)
    return emails


class TestDeleteEmailsOlderThan(unittest.TestCase):

    def test_pass_old_deleted_recent_preserved(self):
        stub = make_stub(DeleteEmailsOlderThan)
        stub.date = "January 15, 2026"
        stub.initial_state_path = create_state_dir(BASE_EMAILS)
        final_emails = _with_folder_overrides({1: "trash", 2: "trash"})
        final_state = create_state_dir(final_emails)
        checks = stub._get_checks(final_state)
        self.assertTrue(checks["old_emails_deleted"])
        self.assertTrue(checks["recent_emails_preserved"])

    def test_fail_old_still_in_inbox(self):
        stub = make_stub(DeleteEmailsOlderThan)
        stub.date = "January 15, 2026"
        stub.initial_state_path = create_state_dir(BASE_EMAILS)
        final_state = create_state_dir(BASE_EMAILS)
        checks = stub._get_checks(final_state)
        self.assertFalse(checks["old_emails_deleted"])
        self.assertTrue(checks["recent_emails_preserved"])

    def test_fail_recent_emails_removed(self):
        stub = make_stub(DeleteEmailsOlderThan)
        stub.date = "January 15, 2026"
        stub.initial_state_path = create_state_dir(BASE_EMAILS)
        final_emails = _with_folder_overrides({1: "trash", 2: "trash", 3: "trash"})
        final_state = create_state_dir(final_emails)
        checks = stub._get_checks(final_state)
        self.assertTrue(checks["old_emails_deleted"])
        self.assertFalse(checks["recent_emails_preserved"])


if __name__ == "__main__":
    unittest.main()
