# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for OpenTermsOfUseScenario."""

import unittest
import json
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.ryde.open_terms_of_use.scenario import OpenTermsOfUseScenario


class TestOpenTermsOfUseScenario(unittest.TestCase):
    """Test cases for OpenTermsOfUseScenario."""
    
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
        scenario = OpenTermsOfUseScenario.__new__(OpenTermsOfUseScenario)
        return scenario
    
    def _create_initial_state_json(self):
        """Create initial rootstore.json WITHOUT terms screen."""
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
        """Create final rootstore.json WITH terms screen."""
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
                            "screenName": "Terms of Use",
                            "route": "/(tabs)/terms"
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
        self.assertTrue(result, "Should recognize task as completed when on Terms of Use screen")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete when not on Terms of Use screen")


if __name__ == '__main__':
    unittest.main()

