# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for BookRideScenario."""

import unittest
import json
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.ryde.book_ride.scenario import BookRideScenario


class TestBookRideScenario(unittest.TestCase):
    """Test cases for BookRideScenario."""
    
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
        scenario = BookRideScenario.__new__(BookRideScenario)
        scenario.origin = '123 Main St, Springfield'
        scenario.destination = '456 Oak Ave, Springfield'
        return scenario
    
    def _create_initial_state_json(self):
        """Create initial rootstore.json WITHOUT ride booked."""
        rootstore_path = os.path.join(self.initial_state_dir, "rootstore.json")
        
        rootstore_data = {
            "rideStore": {
                "currentRide": None
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def _create_final_state_json(self):
        """Create final rootstore.json WITH ride booked."""
        rootstore_path = os.path.join(self.final_state_dir, "rootstore.json")
        
        rootstore_data = {
            "rideStore": {
                "currentRide": {
                    "id": "ride123",
                    "source": "123 Main St, Springfield",
                    "destination": "456 Oak Ave, Springfield",
                    "status": "booked",
                    "fare": 15.50
                }
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task correctly."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when ride is booked")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete without booked ride")
    
    def test_wrong_destination_not_completed(self):
        """Test that ride to wrong destination doesn't count as completion."""
        self.scenario.destination = '789 Different St, Springfield'
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertFalse(result, "Should not recognize task as completed with wrong destination")


if __name__ == '__main__':
    unittest.main()

