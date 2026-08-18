# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
import sqlite3
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.eats.base_scenario import EatsScenario


class ShowLastOrderInfoScenario(EatsScenario, TargetStateScenario):
    """Scenario for viewing information about the last order."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has navigated to the OrderDetails screen showing the last order.
        
        This is verified by:
        1. Checking if the user is on the OrderDetails screen
        2. Verifying that the order being viewed is the most recent order for the user
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if viewing the last order details, False otherwise.
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
        
        # Check if we're on the OrderTracking screen
        screen_name = current_session.get('data', {}).get('screenName', '')
        route = current_session.get('data', {}).get('route', '')
        
        # The OrderTracking screen has screenName="OrderTracking" and route="/screens/order/order-tracking"
        if screen_name != 'OrderTracking':
            return False
        
        # Get the orderId from the session data
        session_data = current_session.get('data', {}).get('sessionData', {})
        form_data = session_data.get('formData', {})
        current_order_id = form_data.get('orderId') or form_data.get('order_id')
        
        if not current_order_id:
            return False
        
        # Convert current_order_id to string for comparison
        current_order_id_str = str(current_order_id)
        
        # Get the current user ID
        user_id = self.current_user_id
        if not user_id:
            return False
        
        # First, try to get orders from orderStore in rootstore
        order_store = rootstore.get('orderStore', {})
        order_history = order_store.get('orders', []) or order_store.get('orderHistory', [])
        
        if order_history:
            # Sort by createdAt to find the most recent order
            sorted_orders = sorted(
                order_history,
                key=lambda o: o.get('createdAt', '') or o.get('created_at', ''),
                reverse=True
            )
            
            if sorted_orders:
                last_order_id = str(sorted_orders[0].get('id', ''))
                
                # Check if the current order being viewed is the last order
                if current_order_id_str == last_order_id:
                    return True
        
        # If not found in orderStore, try querying the database
        # The database is named after the session ID (basename of the state_path)
        session_id = os.path.basename(state_path)
        db_path = os.path.join(state_path, f"{session_id}.db")
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Check if orders table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'")
            table_exists = cursor.fetchone()
            
            if table_exists:
                # Get the most recent order for the user
                # Order by created_at descending and then by id descending to get the latest
                cursor.execute("""
                    SELECT id FROM orders 
                    WHERE user_id = ?
                    ORDER BY created_at DESC, id DESC 
                    LIMIT 1
                """, (user_id,))
                
                result = cursor.fetchone()
                conn.close()
                
                if result:
                    last_order_id = result[0]
                    
                    # Try to convert current_order_id to integer for database comparison
                    try:
                        current_order_id_int = int(current_order_id)
                        if current_order_id_int == last_order_id:
                            return True
                    except (ValueError, TypeError):
                        pass
            else:
                conn.close()
        
        # If we couldn't find any orders, return False
        return False
