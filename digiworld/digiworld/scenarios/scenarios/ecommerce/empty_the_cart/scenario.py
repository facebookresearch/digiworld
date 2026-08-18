# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario


class EmptyTheCartScenario(EcommerceScenario, TargetStateScenario):
    """Scenario for emptying all items from the shopping cart."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has emptied their shopping cart.
        
        This is verified by checking the database to see if all cart items
        for the current user have been deleted.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if the cart has been emptied, False otherwise.
        """
        
        # Query to get all cart items for the current user
        # We join with carts table to get user-specific cart items
        query = """
        SELECT ci.id, ci.product_id, ci.quantity
        FROM cart_items ci
        JOIN carts c ON ci.cart_id = c.id
        WHERE c.user_id = ?
        """
        
        # Compare the cart items between initial and current state
        initial_cart_items, current_cart_items, _ = self.compare_database_records(
            self.initial_state_path,
            state_path,
            query,
            (self.current_user_id,)
        )
        
        # Check if cart had items initially and is now empty
        # Task is completed if there were items in the cart initially and now there are none
        if len(initial_cart_items) > 0 and len(current_cart_items) == 0:
            return True
        
        return False
