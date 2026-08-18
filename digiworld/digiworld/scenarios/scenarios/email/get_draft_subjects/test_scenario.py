# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for GetDraftSubjects verification logic."""

import unittest

from digiworld.scenarios.scenarios.email.get_draft_subjects.scenario import (
    GetDraftSubjects,
)
from digiworld.scenarios.scenarios.email.test_helpers import (
    create_state_dir,
    make_stub,
)


class TestGetDraftSubjects(unittest.TestCase):
    def setUp(self):
        self.stub = make_stub(GetDraftSubjects)

    def test_pass_all_subjects_reported(self):
        emails = [
            {
                "id": 1,
                "sender": "liam.oconnor@gmail.co.uk",
                "subject": "Project Proposal",
                "folder": "draft",
                "status": "draft",
                "is_draft": 1,
            },
            {
                "id": 2,
                "sender": "liam.oconnor@gmail.co.uk",
                "subject": "Meeting Notes",
                "folder": "draft",
                "status": "draft",
                "is_draft": 1,
            },
        ]
        state_path = create_state_dir(emails)
        self.stub.initial_state_path = state_path
        self.stub.agent_answer = (
            "The subjects of your drafts are: Project Proposal, Meeting Notes"
        )
        checks = self.stub._get_checks(state_path)
        self.assertTrue(checks["answer_matches"])

    def test_fail_missing_subject(self):
        emails = [
            {
                "id": 1,
                "sender": "liam.oconnor@gmail.co.uk",
                "subject": "Project Proposal",
                "folder": "draft",
                "status": "draft",
                "is_draft": 1,
            },
            {
                "id": 2,
                "sender": "liam.oconnor@gmail.co.uk",
                "subject": "Meeting Notes",
                "folder": "draft",
                "status": "draft",
                "is_draft": 1,
            },
        ]
        state_path = create_state_dir(emails)
        self.stub.initial_state_path = state_path
        self.stub.agent_answer = "Your draft is about: Project Proposal"
        checks = self.stub._get_checks(state_path)
        self.assertFalse(checks["answer_matches"])

    def test_fail_no_drafts(self):
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
        self.stub.agent_answer = "No drafts"
        with self.assertRaises(ValueError):
            self.stub._get_checks(state_path)


if __name__ == "__main__":
    unittest.main()
