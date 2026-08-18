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
from .scenario import SearchEmailsBySubject


class TestSearchEmailsBySubject(unittest.TestCase):

    def test_pass_search_active(self):
        rootstore = build_rootstore(
            screen_name="inbox",
            route="/(tabs)/inbox",
            form_data={"searchQuery": "quarterly review"},
        )
        state_path = create_state_dir([], rootstore=rootstore)

        stub = make_stub(SearchEmailsBySubject)
        stub.phrase = "quarterly review"

        self.assertTrue(stub._check_task_completion(state_path))

    def test_fail_wrong_screen(self):
        rootstore = build_rootstore(
            screen_name="details",
            route="/screens/mail/thread_1",
            form_data={"searchQuery": "quarterly review"},
        )
        state_path = create_state_dir([], rootstore=rootstore)

        stub = make_stub(SearchEmailsBySubject)
        stub.phrase = "quarterly review"

        self.assertFalse(stub._check_task_completion(state_path))

    def test_fail_wrong_query(self):
        rootstore = build_rootstore(
            screen_name="inbox",
            route="/(tabs)/inbox",
            form_data={"searchQuery": "something else"},
        )
        state_path = create_state_dir([], rootstore=rootstore)

        stub = make_stub(SearchEmailsBySubject)
        stub.phrase = "quarterly review"

        self.assertFalse(stub._check_task_completion(state_path))

    def test_pass_partial_match(self):
        rootstore = build_rootstore(
            screen_name="inbox",
            route="/(tabs)/inbox",
            form_data={"searchQuery": "quarterly review meeting notes"},
        )
        state_path = create_state_dir([], rootstore=rootstore)

        stub = make_stub(SearchEmailsBySubject)
        stub.phrase = "quarterly review"

        self.assertTrue(stub._check_task_completion(state_path))


if __name__ == "__main__":
    unittest.main()
