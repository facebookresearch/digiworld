# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for verification module."""

import unittest
from unittest.mock import Mock, patch
from digiworld.scenarios.verification import TargetStateScenario


class ConcreteTargetStateScenario(TargetStateScenario):
    """Concrete implementation for testing."""
    
    def __init__(self):
        """Initialize without calling parent to avoid dependencies."""
        self.initial_state_path = "/fake/path"
        self.task_completed = False
    
    def _check_task_completion(self, state_path):
        """Mock implementation."""
        return self.task_completed
    
    def filter_db_write_actions(self, state_paths):
        """Mock implementation."""
        return state_paths


class TestTargetStateScenario(unittest.TestCase):
    """Test cases for TargetStateScenario."""
    
    def test_verify_trajectory_completed(self):
        """Test verification when task is completed."""
        scenario = ConcreteTargetStateScenario()
        scenario.task_completed = True
        
        metrics = scenario.verify_trajectory(["/path/to/state1", "/path/to/state2"])
        
        self.assertEqual(metrics['task_completed'], 1.0)
        self.assertNotIn('safety_score', metrics)
    
    def test_verify_trajectory_not_completed(self):
        """Test verification when task is not completed."""
        scenario = ConcreteTargetStateScenario()
        scenario.task_completed = False
        
        metrics = scenario.verify_trajectory(["/path/to/state1", "/path/to/state2"])
        
        self.assertEqual(metrics['task_completed'], 0.0)
        self.assertNotIn('safety_score', metrics)
    
    def test_verify_trajectory_empty_states(self):
        """Test verification with empty state list."""
        scenario = ConcreteTargetStateScenario()
        
        metrics = scenario.verify_trajectory([])
        
        self.assertEqual(metrics['task_completed'], 0.0)
        self.assertNotIn('safety_score', metrics)


if __name__ == '__main__':
    unittest.main()

