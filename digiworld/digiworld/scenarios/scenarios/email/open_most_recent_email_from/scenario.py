# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os

from digiworld.scenarios.builders import derive_email_from_name
from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario
from digiworld.scenarios.verification import TargetStateScenario


class OpenMostRecentEmailFrom(EmailScenario, TargetStateScenario):
    """Scenario for opening the most recent email from a specific sender."""

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
        route = current_session.get("data", {}).get("route", "")
        if screen_name != "details" or not route.startswith("/screens/mail/"):
            return False

        route_id = route.split("/")[-1]

        query = "SELECT sender, timestamp FROM emails WHERE thread_id = ?"
        results = self._execute_query_in_path(query, (route_id,), state_path)
        if not results:
            query = "SELECT sender, timestamp FROM emails WHERE id = ?"
            results = self._execute_query_in_path(query, (route_id,), state_path)
        if not results:
            return False

        opened_sender = results[0][0]
        expected_sender = derive_email_from_name(self.sender_name)
        if opened_sender.lower() != expected_sender.lower():
            return False

        most_recent_query = """
        SELECT id, thread_id FROM emails
        WHERE sender = ? AND folder = 'inbox' AND status = 'received'
        ORDER BY timestamp DESC
        LIMIT 1
        """
        most_recent = self._execute_query_in_path(
            most_recent_query, (expected_sender,), self.initial_state_path
        )
        if not most_recent:
            raise ValueError(f"No emails found from {expected_sender}")

        expected_id = str(most_recent[0][0])
        expected_thread = most_recent[0][1] or ""
        return route_id == expected_id or route_id == expected_thread
