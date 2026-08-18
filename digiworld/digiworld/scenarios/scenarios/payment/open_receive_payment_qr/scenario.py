# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
import json
import os


class OpenReceivePaymentQRScenario(PaymentScenario, TargetStateScenario):
    """Scenario for opening the QR code to receive a payment."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has opened the QR code modal on the home screen.
        
        This is verified by checking the session data in rootstore.json
        to see if the user is currently on the home screen with the QR code modal open.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if the QR code modal is open on the home screen, False otherwise.
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
        
        # Check if we're on the home screen
        screen_name = current_session.get('data', {}).get('screenName', '')
        route = current_session.get('data', {}).get('route', '')
        
        # The home screen has screenName="Home" and route="/(tabs)/home"
        if not (screen_name == 'Home' and route == '/(tabs)/home'):
            return False
        
        # Check if the QR code modal is open
        session_data = current_session.get('data', {}).get('sessionData', {})
        form_data = session_data.get('formData', {})
        
        # The QR code modal is open when showQRCode is true in the form data
        if form_data.get('showQRCode', False):
            return True
        
        return False

