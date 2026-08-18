# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for PauseAtTimestampScenario."""

import unittest
import json
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.music.pause_at_timestamp.scenario import PauseAtTimestampScenario


class TestPauseAtTimestampScenario(unittest.TestCase):
    """Test cases for PauseAtTimestampScenario."""
    
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
        scenario = PauseAtTimestampScenario.__new__(PauseAtTimestampScenario)
        scenario.seconds = 15
        return scenario
    
    def _create_initial_state_json(self):
        """Create initial rootstore.json WITH song playing."""
        rootstore_path = os.path.join(self.initial_state_dir, "rootstore.json")
        
        rootstore_data = {
            "musicStore": {
                "currentSongId": 42,
                "playbackState": {
                    "isPlaying": True,
                    "progress": 0
                }
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def _create_final_state_json(self):
        """Create final rootstore.json WITH song paused at target timestamp."""
        rootstore_path = os.path.join(self.final_state_dir, "rootstore.json")
        
        rootstore_data = {
            "musicStore": {
                "currentSongId": 42,
                "playbackState": {
                    "isPlaying": False,
                    "progress": 15.3
                }
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task correctly."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when paused at timestamp")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete when playing")
    
    def test_wrong_timestamp_not_completed(self):
        """Test that pausing at wrong timestamp doesn't count as completion."""
        self.scenario.seconds = 30
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertFalse(result, "Should not recognize task as completed with wrong timestamp")


if __name__ == '__main__':
    unittest.main()

