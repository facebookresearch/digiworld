# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for ShowLastOrderInfoScenario."""

import unittest
import json
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.eats.show_last_order_info.scenario import ShowLastOrderInfoScenario


class TestShowLastOrderInfoScenario(unittest.TestCase):
    """Test cases for ShowLastOrderInfoScenario."""
    
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
        scenario = ShowLastOrderInfoScenario.__new__(ShowLastOrderInfoScenario)
        scenario.current_user_id = '1'
        return scenario
    
    def _create_initial_state_json(self):
        """Create initial rootstore.json WITHOUT order details screen."""
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
            },
            "orderStore": {
                "orders": [
                    {"id": 100, "createdAt": "2024-01-01T10:00:00Z"},
                    {"id": 101, "createdAt": "2024-01-02T10:00:00Z"}
                ]
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def _create_final_state_json(self):
        """Create final rootstore.json WITH order details screen showing last order."""
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
                            "screenName": "OrderTracking",
                            "route": "/screens/order/order-tracking",
                            "sessionData": {
                                "formData": {
                                    "orderId": 101
                                }
                            }
                        }
                    }
                ]
            },
            "orderStore": {
                "orders": [
                    {"id": 100, "createdAt": "2024-01-01T10:00:00Z"},
                    {"id": 101, "createdAt": "2024-01-02T10:00:00Z"}
                ]
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task correctly."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when viewing last order")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete without order details")


if __name__ == '__main__':
    unittest.main()

