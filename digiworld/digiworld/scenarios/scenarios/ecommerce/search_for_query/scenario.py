# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario


class SearchForQueryScenario(EcommerceScenario, TargetStateScenario):
    """Scenario for searching for products using a search query."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has searched for the target query.
        
        Two checks are performed:
        1. Agent is on the Search screen with the matching query in formData.
        2. Agent navigated to a ProductDetails screen for a product whose name
           contains all words in the target query (i.e. found a result and
           opened it — still counts as having completed the search task).
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if the search was performed, False otherwise.
        """
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return False
            
        with open(rootstore_path, 'r') as f:
            rootstore = json.load(f)
        
        current_session = self.get_current_session(rootstore)
        if not current_session:
            return False
        
        screen_name = current_session.get('data', {}).get('screenName', '')
        route = current_session.get('data', {}).get('route', '')
        target_query = self.query.lower().strip()

        # --- Check 1: agent is on the Search screen with a matching query ---
        # Accept a partial query (e.g. "silk wrap" for target "silk wrap dress")
        # as long as the typed text is a substring of the target or vice-versa.
        if screen_name == 'Search' and route == '/search':
            session_data = current_session.get('data', {}).get('sessionData', {})
            form_data = session_data.get('formData', {})
            current_search_query = (form_data.get('searchQuery') or '').lower().strip()
            if current_search_query and (
                current_search_query in target_query
                or target_query in current_search_query
            ):
                return True

        # --- Check 2: agent opened a product page that matches the query ---
        # The agent searched, found a result, and navigated into it.
        if screen_name == 'ProductDetails' and '/screens/product/' in route:
            product_id_str = route.split('/screens/product/')[-1].strip('/')
            if product_id_str.isdigit():
                try:
                    rows = self._execute_query_in_path(
                        "SELECT name FROM products WHERE id = ?",
                        (int(product_id_str),),
                        state_path,
                    )
                    if rows:
                        product_name = rows[0][0].lower()
                        query_words = target_query.split()
                        if all(word in product_name for word in query_words):
                            return True
                except Exception:
                    pass

        return False
