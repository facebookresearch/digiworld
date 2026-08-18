# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario
import json
import os


class OpenEmailWithSubject(EmailScenario, TargetStateScenario):
    """Scenario for opening an email with a certain subject."""
    
    def _check_task_completion(self, state_path):
        """
        Check if an email with the specified subject has been opened.
        
        This is verified by checking the session data in rootstore.json
        to see if the user navigated to a details screen for an email
        with the matching subject.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if the email was opened, False otherwise.
        """
        
        # Load the rootstore.json to check current session
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return False
            
        with open(rootstore_path, 'r') as f:
            rootstore = json.load(f)
        
        current_session = self.get_current_session(rootstore)
        if not current_session:
            return False
        
        
        # Check if we're on a details screen (email opened)
        screen_name = current_session.get('data', {}).get('screenName', '')
        route = current_session.get('data', {}).get('route', '')

        if screen_name != 'details' or not route.startswith('/screens/mail/'):
            return False
        
        # Extract the identifier from route (e.g., "/screens/mail/488" or "/screens/mail/thread_target")
        try:
            route_id = route.split('/')[-1]
        except:
            return False
        
        # The route may contain either:
        # - A numeric row id (from pre-generated states)
        # - A thread_id string (from real app navigation)
        # Try querying by thread_id first (most common in real usage), then fall back to id
        
        query_by_thread = """
        SELECT subject FROM emails WHERE thread_id = ?
        """
        results = self._execute_query_in_path(query_by_thread, (route_id,), state_path)
        
        if not results:
            # Fall back to querying by row id (for pre-generated states)
            query_by_id = """
            SELECT subject FROM emails WHERE id = ?
            """
            results = self._execute_query_in_path(query_by_id, (route_id,), state_path)
        
        if not results:
            return False
        
        email_subject = results[0][0]
        
        # Check if the email subject matches our target subject
        return self.subject.lower() == email_subject.lower()
