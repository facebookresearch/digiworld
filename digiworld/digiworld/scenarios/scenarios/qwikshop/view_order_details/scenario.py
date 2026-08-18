# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario
import json
import os


class ViewOrderDetailsScenario(QwikshopScenario, TargetStateScenario):
    """Scenario for viewing details of a specific order."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has navigated to the details page of the specified order.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if viewing the correct order details, False otherwise.
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
        
        # Check if we're on an order details screen
        if 'order' not in screen_name and 'order' not in route:
            return False
        
        # Try to extract order ID from route and verify against database
        try:
            route_parts = route.split('/')
            order_id = None
            for i, part in enumerate(route_parts):
                if part in ('order', 'orders') and i + 1 < len(route_parts):
                    order_id = route_parts[i + 1]
                    break
            
            if order_id:
                # Try by id first
                query = "SELECT order_number FROM orders WHERE id = ?"
                results = self._execute_query_in_path(query, (order_id,), state_path)
                if not results:
                    # Try by order_number
                    query = "SELECT order_number FROM orders WHERE order_number = ?"
                    results = self._execute_query_in_path(query, (order_id,), state_path)
                
                if results:
                    db_order = results[0][0].upper()
                    return self.order_number.upper() == db_order
        except Exception:
            pass
        
        return False
