# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
import json
import os
import logging

logger = logging.getLogger(__name__)


class ViewTransactionDetailsScenario(BankingScenario, TargetStateScenario):
    """Scenario for viewing details of a specific transaction."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user is viewing the correct transaction's details screen.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if viewing the correct transaction's details, False otherwise.
        """
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return False
            
        with open(rootstore_path, 'r') as f:
            rootstore = json.load(f)
            
        current_session = self.get_current_session(rootstore)
        if not current_session:
            return False
            
        screen_name = current_session.get('data', {}).get('screenName', '').lower()
        route = current_session.get('data', {}).get('route', '').lower()
        
        # Check if on transaction details screen
        is_transaction_details = (
            'transaction details' in screen_name or 
            'transaction-details' in route or
            'transactiondetails' in screen_name or
            '/transactions/' in route
        )
        
        if not is_transaction_details:
            return False
        
        # Get expected transaction description from scenario parameters
        expected_desc = getattr(self, 'transaction_description', None)
        if not expected_desc:
            logger.warning("No transaction_description parameter found in scenario")
            return False
        
        expected_desc = expected_desc.lower()
        
        # Method 1: Check session data for transaction info
        session_data = current_session.get('data', {}).get('sessionData', {})
        form_data = session_data.get('formData', {})
        if isinstance(form_data, dict):
            # Check nested formData
            nested_form = form_data.get('formData', {})
            if isinstance(nested_form, dict):
                tx_desc = nested_form.get('transactionDescription', '') or nested_form.get('description', '')
                if tx_desc and expected_desc in tx_desc.lower():
                    return True
            # Check top-level formData
            tx_desc = form_data.get('transactionDescription', '') or form_data.get('description', '')
            if tx_desc and expected_desc in tx_desc.lower():
                return True
        
        # Method 2: Try to extract transaction ID from route and query database
        try:
            route_parts = route.split('/')
            transaction_id = None
            for i, part in enumerate(route_parts):
                if part in ('transaction', 'transactions') and i + 1 < len(route_parts):
                    transaction_id = route_parts[i + 1]
                    break
            
            if transaction_id:
                # Query database for transaction description
                query = "SELECT description FROM transactions WHERE id = ?"
                results = self._execute_query_in_path(query, (transaction_id,), state_path)
                if results:
                    db_desc = results[0][0].lower() if results[0][0] else ''
                    if expected_desc in db_desc or db_desc in expected_desc:
                        return True
                
                # Also try with reference_id
                query = "SELECT description FROM transactions WHERE reference_id = ?"
                results = self._execute_query_in_path(query, (transaction_id,), state_path)
                if results:
                    db_desc = results[0][0].lower() if results[0][0] else ''
                    if expected_desc in db_desc or db_desc in expected_desc:
                        return True
        except Exception as e:
            logger.debug(f"Error extracting transaction from route: {e}")
        
        # Method 3: Check bankingStore for selected transaction
        banking_store = rootstore.get('bankingStore', {})
        selected_tx = banking_store.get('selectedTransaction') or banking_store.get('currentTransaction')
        if selected_tx and isinstance(selected_tx, dict):
            tx_desc = selected_tx.get('description', '').lower()
            if expected_desc in tx_desc or tx_desc in expected_desc:
                return True
        
        logger.info(f"Transaction verification failed: expected '{expected_desc}', on screen {screen_name}")
        return False
