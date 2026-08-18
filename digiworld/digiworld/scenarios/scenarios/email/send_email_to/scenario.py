# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario


class SendEmailScenario(EmailScenario, TargetStateScenario):
    def _check_task_completion(self, state_path: str) -> bool:
        """
        Internal helper to verify if an email has been sent to the recipient.
        Compares the state with the initial state to check for new emails.
        
        Args:
            state_path: The path to the state to verify.

        Returns:
            bool: True if an email was sent to the recipient, False otherwise.
        """
        # Query to get all emails with specific sender and recipient
        query = """
        SELECT id, sender, receiver, subject, body, timestamp, status
        FROM emails
        WHERE sender = ? AND receiver LIKE ?
        ORDER BY timestamp DESC
        """
        
        # Execute queries and compare results
        _, _, new_emails = self.compare_database_records(
            self.initial_state_path,
            state_path,
            query,
            (self.current_user_email, f'%{self.email}%')
        )
        
        # Task is completed if a new email was sent to the recipient
        return len(new_emails) > 0