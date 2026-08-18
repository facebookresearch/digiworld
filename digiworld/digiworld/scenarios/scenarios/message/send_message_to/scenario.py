# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario


class SendMessageToScenario(MessageScenario, TargetStateScenario):
    """Scenario for sending a message to a contact."""
    
    def _check_task_completion(self, state_path: str) -> bool:
        """
        Internal helper to verify if a message has been sent to the recipient.
        Compares the state with the initial state to check for new messages.
        
        Args:
            state_path: The path to the state to verify.

        Returns:
            bool: True if a message was sent to the recipient, False otherwise.
        """
        # Query to get all messages sent from current user to the contact
        # We need to find the contact by name and then check for messages
        # Using snake_case column names to match the actual database schema
        query = """
        SELECT m.id, m.sender_id, m.receiver_id, m.content, m.timestamp
        FROM messages m
        JOIN users u ON u.id = m.receiver_id
        WHERE m.sender_id = ? AND u.name LIKE ?
        ORDER BY m.timestamp DESC
        """
        
        # Execute queries and compare results
        _, _, new_messages = self.compare_database_records(
            self.initial_state_path,
            state_path,
            query,
            (self.current_user_id, f'%{self.contact_name}%')
        )
        
        # Task is completed if a new message was sent to the recipient
        return len(new_messages) > 0

