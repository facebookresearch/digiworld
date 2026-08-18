# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario


class DeleteEmailWithSubject(EmailScenario, TargetStateScenario):
    """Scenario for deleting an email with a specific subject."""
    
    def _check_task_completion(self, state_path):
        """Check if any email with the specified subject was moved to trash or completely deleted."""
        
        # Query to check if any emails with the subject are now in trash or deleted
        trash_query = """
        SELECT id FROM emails
        WHERE subject = ? AND (folder = 'trash' OR status = 'deleted')
        """
        
        # Check if any emails with the subject are now in trash
        _, _, new_trash_emails = self.compare_database_records(
            self.initial_state_path,
            state_path,
            trash_query,
            (self.subject,)
        )
        
        # Task completed if at least one email with the subject was moved to trash
        if len(new_trash_emails) > 0:
            return True
        
        # Also check if emails with the subject were completely deleted (removed from database)
        all_emails_query = """
        SELECT id FROM emails
        WHERE subject = ?
        """
        
        initial_emails, current_emails, _ = self.compare_database_records(
            self.initial_state_path,
            state_path,
            all_emails_query,
            (self.subject,)
        )
        
        # Task completed if emails existed initially but are now gone (completely deleted)
        return len(initial_emails) > 0 and len(current_emails) == 0