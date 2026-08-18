# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for TurnOnDeviceScenario."""

import unittest
import json
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.smarthome.turn_on_device.scenario import TurnOnDeviceScenario


class TestTurnOnDeviceScenario(unittest.TestCase):
    """Test cases for TurnOnDeviceScenario."""
    
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
        scenario = TurnOnDeviceScenario.__new__(TurnOnDeviceScenario)
        scenario.device_name = "Living Room Light"
        return scenario
    
    def _create_initial_state_json(self):
        """Create initial rootstore.json WITHOUT device turned on."""
        rootstore_path = os.path.join(self.initial_state_dir, "rootstore.json")
        
        rootstore_data = {
            "smartHomeStore": {
                "devices": [
                    {
                        "id": 1,
                        "name": "Living Room Light",
                        "is_on": False,
                        "status": "offline"
                    },
                    {
                        "id": 2,
                        "name": "Bedroom Light",
                        "is_on": False,
                        "status": "offline"
                    }
                ]
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def _create_final_state_json(self):
        """Create final rootstore.json WITH device turned on."""
        rootstore_path = os.path.join(self.final_state_dir, "rootstore.json")
        
        rootstore_data = {
            "smartHomeStore": {
                "devices": [
                    {
                        "id": 1,
                        "name": "Living Room Light",
                        "is_on": True,
                        "status": "online"
                    },
                    {
                        "id": 2,
                        "name": "Bedroom Light",
                        "is_on": False,
                        "status": "offline"
                    }
                ]
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task correctly."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when device is turned on")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete when device is off")
    
    def test_wrong_device_not_completed(self):
        """Test that turning on wrong device doesn't count as completion."""
        self.scenario.device_name = "Bedroom Light"
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertFalse(result, "Should not recognize task as completed with wrong device")
    
    def test_device_not_found(self):
        """Test that scenario returns False when device is not found."""
        self.scenario.device_name = "Nonexistent Device"
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertFalse(result, "Should return False when device is not found")


if __name__ == '__main__':
    unittest.main()

