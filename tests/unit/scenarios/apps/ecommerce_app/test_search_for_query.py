# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for SearchForQueryScenario (Ecommerce)."""

import unittest
import json
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.ecommerce.search_for_query.scenario import SearchForQueryScenario


class TestSearchForQueryScenario(unittest.TestCase):
    """Test cases for SearchForQueryScenario (Ecommerce)."""
    
    def setUp(self):
        """Set up test fixtures with temporary directories."""
        self.temp_dir = tempfile.mkdtemp()
        self.initial_state_dir = os.path.join(self.temp_dir, "initial_state")
        self.final_state_dir = os.path.join(self.temp_dir, "final_state")
        os.makedirs(self.initial_state_dir)
        os.makedirs(self.final_state_dir)
        
        self._create_initial_state_json()
        self._create_final_state_json()
        
        self.scenario = self._create_test_scenario()
    
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _create_test_scenario(self):
        """Create scenario instance with test configuration."""
        scenario = SearchForQueryScenario.__new__(SearchForQueryScenario)
        scenario.query = 'laptops'
        return scenario
    
    def _create_initial_state_json(self):
        """Create initial rootstore.json WITHOUT search query."""
        rootstore_path = os.path.join(self.initial_state_dir, "rootstore.json")
        
        rootstore_data = {
            "sessionStore": {
                "sessions": [
                    {
                        "data": {
                            "screenName": "home",
                            "route": "/(tabs)/home"
                        }
                    }
                ]
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def _create_final_state_json(self):
        """Create final rootstore.json WITH search query."""
        rootstore_path = os.path.join(self.final_state_dir, "rootstore.json")
        
        rootstore_data = {
            "sessionStore": {
                "sessions": [
                    {
                        "data": {
                            "screenName": "home",
                            "route": "/(tabs)/home"
                        }
                    },
                    {
                        "data": {
                            "screenName": "Search",
                            "route": "/search",
                            "sessionData": {
                                "formData": {
                                    "searchQuery": "laptops"
                                }
                            }
                        }
                    }
                ]
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task correctly."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when search query is entered")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete without search query")
    
    def test_wrong_query_not_completed(self):
        """Test that wrong query doesn't count as completion."""
        self.scenario.query = 'phones'
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertFalse(result, "Should not recognize task as completed with wrong query")


if __name__ == '__main__':
    unittest.main()

