# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os

from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario
from digiworld.scenarios.verification import TargetStateScenario


class SearchEmailsBySubject(EmailScenario, TargetStateScenario):
    """Scenario for searching emails by a phrase in the subject line."""

    def _check_task_completion(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return False

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            return False

        screen_name = current_session.get("data", {}).get("screenName", "")
        if screen_name != "inbox":
            return False

        session_data = current_session.get("data", {}).get("sessionData", {})
        form_data = session_data.get("formData", {})
        search_query = form_data.get("searchQuery", "")

        return self.phrase.lower() in search_query.lower()
