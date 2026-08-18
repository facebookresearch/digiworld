# Copyright (c) Meta Platforms, Inc. and affiliates.
import unittest

from digiworld.scenarios.scenarios.email.test_helpers import (
    build_rootstore,
    create_state_dir,
    DEFAULT_USER,
    make_stub,
)

from .scenario import ChangeProfileField


def _rootstore_with(**user_overrides):
    """Build a rootstore with user field overrides."""
    base = {
        "id": 1,
        "email": "liam.oconnor@gmail.co.uk",
        "firstName": "Liam",
        "lastName": "O'Connor",
        "displayName": "Liam O'Connor",
    }
    base.update(user_overrides)
    rs = build_rootstore()
    rs["userStore"]["currentUser"] = base
    return rs


class TestChangeProfileField(unittest.TestCase):

    def test_pass_first_name_changed(self):
        stub = make_stub(ChangeProfileField)
        stub.field_type = "first name"
        stub.value = "James"
        rs = _rootstore_with(firstName="James")
        final_state = create_state_dir([], rootstore=rs)
        self.assertTrue(stub._check_task_completion(final_state))

    def test_pass_last_name_changed(self):
        stub = make_stub(ChangeProfileField)
        stub.field_type = "last name"
        stub.value = "Smith"
        rs = _rootstore_with(lastName="Smith")
        final_state = create_state_dir([], rootstore=rs)
        self.assertTrue(stub._check_task_completion(final_state))

    def test_pass_email_changed(self):
        stub = make_stub(ChangeProfileField)
        stub.field_type = "email address"
        stub.value = "new@example.com"
        rs = _rootstore_with(email="new@example.com")
        final_state = create_state_dir([], rootstore=rs)
        self.assertTrue(stub._check_task_completion(final_state))

    def test_fail_field_not_changed(self):
        stub = make_stub(ChangeProfileField)
        stub.field_type = "first name"
        stub.value = "James"
        final_state = create_state_dir([])
        self.assertFalse(stub._check_task_completion(final_state))

    def test_fail_unknown_field(self):
        stub = make_stub(ChangeProfileField)
        stub.field_type = "nickname"
        stub.value = "Jim"
        final_state = create_state_dir([])
        with self.assertRaises(ValueError):
            stub._check_task_completion(final_state)

    def test_pass_birthday_iso_format(self):
        stub = make_stub(ChangeProfileField)
        stub.field_type = "birthday"
        stub.value = "1992-11-03"
        rs = _rootstore_with(dateOfBirth="1992-11-03")
        final_state = create_state_dir([], rootstore=rs)
        self.assertTrue(stub._check_task_completion(final_state))

    def test_pass_birthday_different_formats(self):
        stub = make_stub(ChangeProfileField)
        stub.field_type = "birthday"
        stub.value = "1992-11-03"
        rs = _rootstore_with(dateOfBirth="November 3, 1992")
        final_state = create_state_dir([], rootstore=rs)
        self.assertTrue(stub._check_task_completion(final_state))

    def test_fail_birthday_wrong_date(self):
        stub = make_stub(ChangeProfileField)
        stub.field_type = "birthday"
        stub.value = "1992-11-03"
        final_state = create_state_dir([])
        self.assertFalse(stub._check_task_completion(final_state))


if __name__ == "__main__":
    unittest.main()
