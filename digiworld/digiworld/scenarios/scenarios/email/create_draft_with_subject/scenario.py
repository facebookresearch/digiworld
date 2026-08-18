# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario


class CreateDraftWithSubject(EmailScenario, TargetStateScenario):
    def _check_task_completion(self, state_path):
        # Query to get all draft emails with the specified subject that are NOT deleted/trashed
        query = """
        SELECT id, sender, receiver, subject, body, timestamp, status
        FROM emails
        WHERE status = 'draft' 
            AND subject LIKE ? 
            AND folder != 'trash' 
            AND status != 'deleted'
        ORDER BY timestamp DESC
        """
        
        # Execute queries and compare results
        _, _, new_drafts = self.compare_database_records(
            self.initial_state_path,
            state_path, 
            query, 
            (f'%{self.subject}%',)
        )
        
        # Task is completed if a new draft was created with the specified subject
        return len(new_drafts) > 0
