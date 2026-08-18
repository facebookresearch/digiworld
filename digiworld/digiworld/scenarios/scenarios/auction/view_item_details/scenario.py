# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario
import json
import os


class ViewItemDetailsScenario(AuctionScenario, TargetStateScenario):
    """Scenario for viewing details of a specific auction item."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has navigated to the details page of the specified item.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if viewing the correct item details, False otherwise.
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
        
        # Check if we're on an item details screen
        if 'detail' not in screen_name and 'item' not in route:
            return False
        
        # Try to extract item ID from route and verify against database
        try:
            # Route might be like /item/1 or /items/1/details
            route_parts = route.split('/')
            item_id = None
            for i, part in enumerate(route_parts):
                if part in ('item', 'items') and i + 1 < len(route_parts):
                    item_id = route_parts[i + 1]
                    break
            
            if item_id:
                query = "SELECT title FROM items WHERE id = ?"
                results = self._execute_query_in_path(query, (item_id,), state_path)
                if results:
                    db_title = results[0][0].lower()
                    return self.item_title.lower() in db_title or db_title in self.item_title.lower()
        except Exception:
            pass
        
        return False
