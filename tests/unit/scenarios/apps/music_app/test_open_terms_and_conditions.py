# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for OpenTermsAndConditionsScenario."""

import unittest
import json
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.music.open_terms_and_conditions.scenario import OpenTermsAndConditionsScenario


class TestOpenTermsAndConditionsScenario(unittest.TestCase):
    """Test cases for OpenTermsAndConditionsScenario."""
    
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
        scenario = OpenTermsAndConditionsScenario.__new__(OpenTermsAndConditionsScenario)
        
        # The _check_task_completion method doesn't need special attributes
        # It only checks the rootstore.json file
        
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
                    },
                    {
                        "data": {
                            "screenName": "library",
                            "route": "/(tabs)/library"
                        }
                    }
                ]
            },
            "userStore": {
                "currentUser": {
                    "id": "1",
                    "email": "test@example.com"
                }
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
                            "screenName": "library",
                            "route": "/(tabs)/library"
                        }
                    },
                    {
                        "data": {
                            "screenName": "Terms",
                            "route": "/terms"
                        }
                    }
                ]
            },
            "userStore": {
                "currentUser": {
                    "id": "1",
                    "email": "test@example.com"
                }
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task correctly."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when on Terms screen")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete when not on Terms screen")
    
    def test_missing_rootstore_file_returns_false(self):
        """Test that missing rootstore.json returns False."""
        empty_dir = os.path.join(self.temp_dir, "empty_state")
        os.makedirs(empty_dir)
        
        result = self.scenario._check_task_completion(empty_dir)
        self.assertFalse(result, "Should return False when rootstore.json doesn't exist")
    
    def test_empty_sessions_returns_false(self):
        """Test that empty sessions array returns False."""
        empty_sessions_dir = os.path.join(self.temp_dir, "empty_sessions")
        os.makedirs(empty_sessions_dir)
        
        rootstore_path = os.path.join(empty_sessions_dir, "rootstore.json")
        rootstore_data = {
            "sessionStore": {
                "sessions": []
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
        
        result = self.scenario._check_task_completion(empty_sessions_dir)
        self.assertFalse(result, "Should return False when sessions array is empty")
    
    def test_wrong_screen_name_returns_false(self):
        """Test that being on a different screen returns False."""
        wrong_screen_dir = os.path.join(self.temp_dir, "wrong_screen")
        os.makedirs(wrong_screen_dir)
        
        rootstore_path = os.path.join(wrong_screen_dir, "rootstore.json")
        rootstore_data = {
            "sessionStore": {
                "sessions": [
                    {
                        "data": {
                            "screenName": "Settings",
                            "route": "/settings"
                        }
                    }
                ]
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
        
        result = self.scenario._check_task_completion(wrong_screen_dir)
        self.assertFalse(result, "Should return False when on wrong screen")


if __name__ == '__main__':
    unittest.main()

