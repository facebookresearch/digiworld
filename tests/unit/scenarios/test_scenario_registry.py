# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for scenario_registry module."""

import unittest
import json
import tempfile
import os
from pathlib import Path
from unittest.mock import Mock, patch
from digiworld.scenarios.scenario_base import Scenario
from digiworld.scenarios.scenario_registry import ScenarioRegistry


class MockScenario(Scenario):
    """Mock scenario class for testing."""
    
    def __init__(self, base_path, instance_tag=None):
        """Initialize without calling parent init to avoid dependencies."""
        self.base_path = base_path
        self.instance_tag = instance_tag
        self.app_config = {}
        self.scenario_config = {}
        self.instance_configs = {}
    
    def verify_trajectory(self, state_paths):
        """Mock implementation."""
        return {'task_completed': 1.0}


class TestScenarioRegistry(unittest.TestCase):
    """Test cases for ScenarioRegistry."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_register_scenario(self):
        """Test manual scenario registration."""
        registry = ScenarioRegistry.__new__(ScenarioRegistry)
        registry.registry = {}
        registry.instances = {}
        
        registry.register('test_app', 'Test Task', MockScenario)
        
        self.assertIn(('test_app', 'Test Task'), registry.registry)
        self.assertEqual(registry.registry[('test_app', 'Test Task')], MockScenario)
    
    def test_get_scenario_list(self):
        """Test getting list of registered scenarios."""
        registry = ScenarioRegistry.__new__(ScenarioRegistry)
        registry.registry = {
            ('app1', 'task1'): MockScenario,
            ('app2', 'task2'): MockScenario
        }
        registry.instances = {}
        
        scenarios = registry.get_scenario_list()
        
        self.assertEqual(len(scenarios), 2)
        self.assertIn(('app1', 'task1'), scenarios)
        self.assertIn(('app2', 'task2'), scenarios)
    
    def test_get_instance_list(self):
        """Test getting list of registered instances."""
        registry = ScenarioRegistry.__new__(ScenarioRegistry)
        registry.registry = {}
        registry.instances = {
            ('app1', 'task1', 'instance1'): {'parameters': {}},
            ('app1', 'task1', 'instance2'): {'parameters': {}}
        }
        
        instances = registry.get_instance_list()
        
        self.assertEqual(len(instances), 2)
        self.assertIn(('app1', 'task1', 'instance1'), instances)
    
    def test_register_instance(self):
        """Test manual instance registration."""
        registry = ScenarioRegistry.__new__(ScenarioRegistry)
        registry.registry = {}
        registry.instances = {}
        
        config = {'parameters': {'param1': 'value1'}}
        registry.register_instance('app1', 'task1', 'instance1', config)
        
        self.assertIn(('app1', 'task1', 'instance1'), registry.instances)
        self.assertEqual(registry.instances[('app1', 'task1', 'instance1')], config)
    
    def test_get_instance_config(self):
        """Test retrieving instance configuration."""
        registry = ScenarioRegistry.__new__(ScenarioRegistry)
        registry.registry = {}
        registry.instances = {
            ('app1', 'task1', 'instance1'): {'parameters': {'param1': 'value1'}}
        }
        
        config = registry.get_instance_config('app1', 'task1', 'instance1')
        
        self.assertEqual(config['parameters']['param1'], 'value1')
    
    def test_get_instance_config_not_found(self):
        """Test error when instance config not found."""
        registry = ScenarioRegistry.__new__(ScenarioRegistry)
        registry.registry = {}
        registry.instances = {}
        
        with self.assertRaises(ValueError) as cm:
            registry.get_instance_config('app1', 'task1', 'instance1')
        
        self.assertIn('Unknown instance', str(cm.exception))


if __name__ == '__main__':
    unittest.main()

