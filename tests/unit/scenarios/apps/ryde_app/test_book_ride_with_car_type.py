# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for BookRideWithCarTypeScenario."""

import unittest
import json
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.ryde.book_ride_with_car_type.scenario import BookRideWithCarTypeScenario


class TestBookRideWithCarTypeScenario(unittest.TestCase):
    """Test cases for BookRideWithCarTypeScenario."""
    
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
        scenario = BookRideWithCarTypeScenario.__new__(BookRideWithCarTypeScenario)
        scenario.origin = '789 Pine St, Portland'
        scenario.destination = '321 Birch Ln, Portland'
        scenario.car_type = 'SUV'
        return scenario
    
    def _create_initial_state_json(self):
        """Create initial rootstore.json WITHOUT ride booked."""
        rootstore_path = os.path.join(self.initial_state_dir, "rootstore.json")
        
        rootstore_data = {
            "rideStore": {
                "currentRide": None,
                "currentRideOption": None
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def _create_final_state_json(self):
        """Create final rootstore.json WITH ride booked with car type."""
        rootstore_path = os.path.join(self.final_state_dir, "rootstore.json")
        
        rootstore_data = {
            "rideStore": {
                "currentRide": {
                    "id": "ride456",
                    "source": "789 Pine St, Portland",
                    "destination": "321 Birch Ln, Portland",
                    "status": "booked",
                    "fare": 22.00
                },
                "currentRideOption": "suv"
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task correctly."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when ride is booked with car type")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete without booked ride")
    
    def test_wrong_car_type_not_completed(self):
        """Test that ride with wrong car type doesn't count as completion."""
        self.scenario.car_type = 'Sedan'
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertFalse(result, "Should not recognize task as completed with wrong car type")


if __name__ == '__main__':
    unittest.main()

