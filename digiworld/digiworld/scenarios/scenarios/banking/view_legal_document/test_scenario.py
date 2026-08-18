# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ViewLegalDocumentScenario verification logic."""

import json
import os
import tempfile
import unittest

from digiworld.scenarios.scenarios.banking.view_legal_document.scenario import (
    ViewLegalDocumentScenario,
)


def _write_rootstore(state_dir, screen_name, route):
    os.makedirs(state_dir, exist_ok=True)
    rootstore = {
        "sessionStore": {
            "session": {
                "data": {
                    "screenName": screen_name,
                    "route": route,
                }
            }
        },
    }
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(ViewLegalDocumentScenario):
    def __init__(self):
        pass


class TestViewLegalDocument(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()

    def test_terms_screen_passes(self):
        _write_rootstore(self.state_dir, "Terms", "/terms")
        self.scenario.document_type = "Terms & Conditions"
        self.assertTrue(self.scenario._check_task_completion(self.state_dir))

    def test_privacy_screen_passes(self):
        _write_rootstore(self.state_dir, "Privacy", "/privacy")
        self.scenario.document_type = "Privacy Policy"
        self.assertTrue(self.scenario._check_task_completion(self.state_dir))

    def test_wrong_screen_fails(self):
        _write_rootstore(self.state_dir, "home", "/home")
        self.scenario.document_type = "Terms & Conditions"
        self.assertFalse(self.scenario._check_task_completion(self.state_dir))

    def test_privacy_when_expecting_terms_fails(self):
        _write_rootstore(self.state_dir, "Privacy", "/privacy")
        self.scenario.document_type = "Terms & Conditions"
        self.assertFalse(self.scenario._check_task_completion(self.state_dir))

    def test_terms_when_expecting_privacy_fails(self):
        _write_rootstore(self.state_dir, "Terms", "/terms")
        self.scenario.document_type = "Privacy Policy"
        self.assertFalse(self.scenario._check_task_completion(self.state_dir))

    def test_route_only_match_passes(self):
        _write_rootstore(self.state_dir, "Legal Page", "/terms")
        self.scenario.document_type = "Terms & Conditions"
        self.assertTrue(self.scenario._check_task_completion(self.state_dir))

    def test_missing_rootstore_fails(self):
        os.makedirs(self.state_dir, exist_ok=True)
        self.scenario.document_type = "Privacy Policy"
        self.assertFalse(self.scenario._check_task_completion(self.state_dir))

    def test_missing_document_type_fails(self):
        _write_rootstore(self.state_dir, "Terms", "/terms")
        self.scenario.document_type = None
        self.assertFalse(self.scenario._check_task_completion(self.state_dir))


if __name__ == "__main__":
    unittest.main()
