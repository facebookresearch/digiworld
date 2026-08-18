# Copyright (c) Meta Platforms, Inc. and affiliates.
import unittest

from digiworld.scenarios.scenarios.email.test_helpers import (
    build_rootstore,
    create_state_dir,
    make_stub,
)

from .scenario import ComposeNewEmail


class TestComposeNewEmail(unittest.TestCase):

    def test_pass_on_compose_screen(self):
        stub = make_stub(ComposeNewEmail)
        rootstore = build_rootstore(
            screen_name="compose",
            route="/screens/compose/mailcompose",
        )
        state_path = create_state_dir([], rootstore=rootstore)
        self.assertTrue(stub._check_task_completion(state_path))

    def test_fail_on_inbox_screen(self):
        stub = make_stub(ComposeNewEmail)
        rootstore = build_rootstore(screen_name="inbox")
        state_path = create_state_dir([], rootstore=rootstore)
        self.assertFalse(stub._check_task_completion(state_path))

    def test_fail_on_details_screen(self):
        stub = make_stub(ComposeNewEmail)
        rootstore = build_rootstore(
            screen_name="details",
            route="/screens/mail/123",
        )
        state_path = create_state_dir([], rootstore=rootstore)
        self.assertFalse(stub._check_task_completion(state_path))


if __name__ == "__main__":
    unittest.main()
