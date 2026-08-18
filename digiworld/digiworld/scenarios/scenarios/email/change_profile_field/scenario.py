# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
from datetime import datetime

from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario
from digiworld.scenarios.verification import TargetStateScenario


FIELD_MAP = {
    "first name": "firstName",
    "last name": "lastName",
    "birthday": "dateOfBirth",
    "email address": "email",
}

_DATE_FORMATS = [
    "%Y-%m-%d",
    "%B %d, %Y",
    "%b %d, %Y",
    "%m/%d/%Y",
    "%d %B %Y",
    "%d %b %Y",
    "%d/%m/%Y",
]


def _parse_date(text: str):
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text.strip(), fmt).date()
        except ValueError:
            continue
    return None


class ChangeProfileField(EmailScenario, TargetStateScenario):
    """Verify that a user profile field was changed to the expected value."""

    def _check_task_completion(self, state_path: str) -> bool:
        field_key = FIELD_MAP.get(self.field_type.lower())
        if not field_key:
            raise ValueError(f"Unknown field type: {self.field_type}")

        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found in {state_path}")

        with open(rootstore_path, "r") as f:
            data = json.load(f)

        current_user = data.get("userStore", {}).get("currentUser", {})
        if not current_user:
            raise ValueError("No currentUser found in rootstore")

        actual = str(current_user.get(field_key, ""))

        if field_key == "dateOfBirth":
            actual_date = _parse_date(actual)
            expected_date = _parse_date(self.value)
            if actual_date and expected_date:
                return actual_date == expected_date

        return actual.lower().strip() == self.value.lower().strip()
