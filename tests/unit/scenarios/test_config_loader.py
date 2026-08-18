# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for config_loader module."""

import unittest
import json
import tempfile
import os
from pathlib import Path
from unittest.mock import Mock, patch
from digiworld.scenarios.config_loader import ConfigLoader


class TestConfigLoader(unittest.TestCase):
    """Test cases for ConfigLoader."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.scenario_mock = Mock()
        self.scenario_mock.instance_tag = None
        
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _create_config_files(self, scenario_dir, app_config=None, scenario_config=None):
        """Helper to create config files in temp directory."""
        scenario_path = Path(self.temp_dir) / scenario_dir
        scenario_path.mkdir(parents=True, exist_ok=True)
        
        app_path = scenario_path.parent
        
        if app_config:
            with open(app_path / "app_config.json", 'w') as f:
                json.dump(app_config, f)
        
        if scenario_config:
            with open(scenario_path / "scenario_config.json", 'w') as f:
                json.dump(scenario_config, f)
        
        return scenario_path
    
    def test_load_app_config(self):
        """Test loading app configuration."""
        app_config = {
            "apk_name": "com.example.app",
            "compatible_profiles": ["profile1", "profile2"]
        }
        
        scenario_path = self._create_config_files("app/scenario", app_config=app_config)
        
        with patch('inspect.getfile', return_value=str(scenario_path / "scenario.py")):
            loader = ConfigLoader(self.scenario_mock)
            loader.load_all_configs()
        
        self.assertEqual(self.scenario_mock.app_config, app_config)
        self.assertEqual(self.scenario_mock.apk_name, "com.example.app")
    
    def test_load_scenario_config(self):
        """Test loading scenario configuration."""
        scenario_config = {
            "task_name": "Test Task",
            "app_name": "test_app",
            "scenario_class": "TestScenario",
            "parameters": ["param1", "param2"]
        }
        
        scenario_path = self._create_config_files("app/scenario", scenario_config=scenario_config)
        
        with patch('inspect.getfile', return_value=str(scenario_path / "scenario.py")):
            loader = ConfigLoader(self.scenario_mock)
            loader.load_all_configs()
        
        self.assertEqual(self.scenario_mock.scenario_config, scenario_config)
        self.assertEqual(self.scenario_mock.task_name, "Test Task")
        self.assertEqual(self.scenario_mock.app_name, "test_app")
    
    def test_missing_configs(self):
        """Test behavior when config files are missing."""
        scenario_path = Path(self.temp_dir) / "app" / "scenario"
        scenario_path.mkdir(parents=True, exist_ok=True)
        
        with patch('inspect.getfile', return_value=str(scenario_path / "scenario.py")):
            loader = ConfigLoader(self.scenario_mock)
            loader.load_all_configs()
        
        self.assertEqual(self.scenario_mock.app_config, {})
        self.assertEqual(self.scenario_mock.scenario_config, {})
    
    def test_load_instance_config(self):
        """Test loading instance configuration."""
        scenario_config = {
            "task_name": "Send email to <recipient>",
            "parameters": ["recipient"]
        }
        
        instance_config = {
            "parameters": {"recipient": "test@example.com"},
            "compatible_profiles": ["profile1"]
        }
        
        scenario_path = self._create_config_files("app/scenario", scenario_config=scenario_config)
        instances_path = scenario_path / "instances" / "test_instance"
        instances_path.mkdir(parents=True, exist_ok=True)
        
        with open(instances_path / "instance_config.json", 'w') as f:
            json.dump(instance_config, f)
        
        self.scenario_mock.instance_tag = "test_instance"
        
        with patch('inspect.getfile', return_value=str(scenario_path / "scenario.py")):
            loader = ConfigLoader(self.scenario_mock)
            loader.load_all_configs()
        
        self.assertIn("test_instance", self.scenario_mock.instance_configs)
        self.assertEqual(self.scenario_mock.recipient, "test@example.com")
    
    def test_resolve_task_description(self):
        """Test task description resolution with parameters."""
        scenario_config = {
            "task_name": "Send $<amount> to <recipient>",
            "parameters": ["amount", "recipient"]
        }
        
        instance_config = {
            "parameters": {"amount": "50", "recipient": "Alice"}
        }
        
        scenario_path = self._create_config_files("app/scenario", scenario_config=scenario_config)
        instances_path = scenario_path / "instances" / "test_instance"
        instances_path.mkdir(parents=True, exist_ok=True)
        
        with open(instances_path / "instance_config.json", 'w') as f:
            json.dump(instance_config, f)
        
        self.scenario_mock.instance_tag = "test_instance"
        
        with patch('inspect.getfile', return_value=str(scenario_path / "scenario.py")):
            loader = ConfigLoader(self.scenario_mock)
            loader.load_all_configs()
        
        # Check that task_description was resolved with parameters
        self.assertEqual(self.scenario_mock.task_description, "Send $50 to Alice")
        self.assertEqual(self.scenario_mock.amount, "50")
        self.assertEqual(self.scenario_mock.recipient, "Alice")
    
    def test_validate_context_fields_valid(self):
        """Test validation with valid context fields."""
        scenario_config = {
            "context_fields": ["current_user_email", "current_user_id"]
        }
        
        scenario_path = self._create_config_files("app/scenario", scenario_config=scenario_config)
        
        # Mock the supported fields method
        self.scenario_mock._get_supported_context_fields = Mock(return_value={
            'current_user_email': 'Email',
            'current_user_id': 'ID',
            'profile_name': 'Profile'
        })
        
        with patch('inspect.getfile', return_value=str(scenario_path / "scenario.py")):
            loader = ConfigLoader(self.scenario_mock)
            loader.load_all_configs()
        
        # Should complete without error
        self.assertEqual(self.scenario_mock.scenario_config['context_fields'], 
                        ["current_user_email", "current_user_id"])
    
    def test_validate_context_fields_invalid(self):
        """Test validation with invalid context fields."""
        scenario_config = {
            "context_fields": ["invalid_field", "current_user_email"]
        }
        
        scenario_path = self._create_config_files("app/scenario", scenario_config=scenario_config)
        
        self.scenario_mock._get_supported_context_fields = Mock(return_value={
            'current_user_email': 'Email',
            'current_user_id': 'ID'
        })
        
        with patch('inspect.getfile', return_value=str(scenario_path / "scenario.py")):
            loader = ConfigLoader(self.scenario_mock)
            with self.assertRaises(ValueError) as cm:
                loader.load_all_configs()
        
        self.assertIn("Unsupported context fields", str(cm.exception))
        self.assertIn("invalid_field", str(cm.exception))
    
    def test_validate_context_fields_not_list(self):
        """Test validation when context_fields is not a list."""
        scenario_config = {
            "context_fields": "not_a_list"
        }
        
        scenario_path = self._create_config_files("app/scenario", scenario_config=scenario_config)
        
        self.scenario_mock._get_supported_context_fields = Mock(return_value={})
        
        with patch('inspect.getfile', return_value=str(scenario_path / "scenario.py")):
            loader = ConfigLoader(self.scenario_mock)
            with self.assertRaises(ValueError) as cm:
                loader.load_all_configs()
        
        self.assertIn("must be a list", str(cm.exception))
    
    def test_extract_template_placeholders_simple(self):
        """Test extracting template placeholders from simple strings."""
        loader = ConfigLoader(self.scenario_mock)
        
        placeholders = loader._extract_template_placeholders("{{user_email}} and {{user_id}}")
        
        self.assertEqual(placeholders, {'user_email', 'user_id'})
    
    def test_extract_template_placeholders_nested_object(self):
        """Test extracting template placeholders from nested objects."""
        loader = ConfigLoader(self.scenario_mock)
        
        obj = {
            "email": "{{current_user_email}}",
            "nested": {
                "id": "{{current_user_id}}",
                "data": ["{{field1}}", "{{field2}}"]
            }
        }
        
        placeholders = loader._extract_template_placeholders(obj)
        
        self.assertEqual(placeholders, {'current_user_email', 'current_user_id', 'field1', 'field2'})
    
    def test_extract_template_placeholders_empty(self):
        """Test extracting template placeholders from strings with no templates."""
        loader = ConfigLoader(self.scenario_mock)
        
        placeholders = loader._extract_template_placeholders("plain text with no templates")
        
        self.assertEqual(placeholders, set())
    
    def test_validate_context_template_requirements_valid(self):
        """Test validation when templates match declared context fields."""
        scenario_config = {
            "context_fields": ["current_user_email", "current_user_id"]
        }
        
        instance_config = {
            "scenario_context": {
                "email": "{{current_user_email}}",
                "id": "{{current_user_id}}"
            }
        }
        
        scenario_path = self._create_config_files("app/scenario", scenario_config=scenario_config)
        instances_path = scenario_path / "instances" / "test_instance"
        instances_path.mkdir(parents=True, exist_ok=True)
        
        with open(instances_path / "instance_config.json", 'w') as f:
            json.dump(instance_config, f)
        
        self.scenario_mock.instance_tag = "test_instance"
        self.scenario_mock._get_supported_context_fields = Mock(return_value={
            'current_user_email': 'Email',
            'current_user_id': 'ID'
        })
        
        with patch('inspect.getfile', return_value=str(scenario_path / "scenario.py")):
            loader = ConfigLoader(self.scenario_mock)
            loader.load_all_configs()
        
        # Should complete without error
        self.assertIsNotNone(self.scenario_mock.raw_scenario_context)
    
    def test_validate_context_template_requirements_missing_fields(self):
        """Test validation when templates use undeclared context fields."""
        scenario_config = {
            "context_fields": ["current_user_email"]  # Missing current_user_id
        }
        
        instance_config = {
            "scenario_context": {
                "email": "{{current_user_email}}",
                "id": "{{current_user_id}}"  # This field is not declared
            }
        }
        
        scenario_path = self._create_config_files("app/scenario", scenario_config=scenario_config)
        instances_path = scenario_path / "instances" / "test_instance"
        instances_path.mkdir(parents=True, exist_ok=True)
        
        with open(instances_path / "instance_config.json", 'w') as f:
            json.dump(instance_config, f)
        
        self.scenario_mock.instance_tag = "test_instance"
        self.scenario_mock._get_supported_context_fields = Mock(return_value={
            'current_user_email': 'Email',
            'current_user_id': 'ID'
        })
        
        with patch('inspect.getfile', return_value=str(scenario_path / "scenario.py")):
            loader = ConfigLoader(self.scenario_mock)
            with self.assertRaises(ValueError) as cm:
                loader.load_all_configs()
        
        self.assertIn("Missing context_fields", str(cm.exception))
        self.assertIn("current_user_id", str(cm.exception))
    
    def test_load_config_invalid_json(self):
        """Test loading configs with invalid JSON."""
        scenario_path = Path(self.temp_dir) / "app" / "scenario"
        scenario_path.mkdir(parents=True, exist_ok=True)
        
        # Write invalid JSON
        with open(scenario_path / "scenario_config.json", 'w') as f:
            f.write("{invalid json}")
        
        with patch('inspect.getfile', return_value=str(scenario_path / "scenario.py")):
            loader = ConfigLoader(self.scenario_mock)
            with self.assertRaises(json.JSONDecodeError):
                loader.load_all_configs()
    
    def test_load_instance_no_instances_dir_with_tag(self):
        """Test error when instance_tag provided but no instances directory."""
        scenario_path = self._create_config_files("app/scenario")
        self.scenario_mock.instance_tag = "test_instance"
        
        with patch('inspect.getfile', return_value=str(scenario_path / "scenario.py")):
            loader = ConfigLoader(self.scenario_mock)
            with self.assertRaises(ValueError) as cm:
                loader.load_all_configs()
        
        self.assertIn("does not support instances", str(cm.exception))
    
    def test_load_instance_instances_exist_no_tag(self):
        """Test error when instances directory exists but no tag provided."""
        scenario_path = self._create_config_files("app/scenario")
        instances_path = scenario_path / "instances" / "test_instance"
        instances_path.mkdir(parents=True, exist_ok=True)
        
        # Create an instance config
        with open(instances_path / "instance_config.json", 'w') as f:
            json.dump({"parameters": {}}, f)
        
        self.scenario_mock.instance_tag = None
        
        with patch('inspect.getfile', return_value=str(scenario_path / "scenario.py")):
            loader = ConfigLoader(self.scenario_mock)
            with self.assertRaises(ValueError) as cm:
                loader.load_all_configs()
        
        self.assertIn("Scenario has instances but none was specified", str(cm.exception))
    
    def test_load_instance_tag_not_found(self):
        """Test error when specified instance tag doesn't exist."""
        scenario_path = self._create_config_files("app/scenario")
        instances_path = scenario_path / "instances" / "real_instance"
        instances_path.mkdir(parents=True, exist_ok=True)
        
        with open(instances_path / "instance_config.json", 'w') as f:
            json.dump({"parameters": {}}, f)
        
        self.scenario_mock.instance_tag = "nonexistent_instance"
        
        with patch('inspect.getfile', return_value=str(scenario_path / "scenario.py")):
            loader = ConfigLoader(self.scenario_mock)
            with self.assertRaises(ValueError) as cm:
                loader.load_all_configs()
        
        self.assertIn("Instance 'nonexistent_instance' not found", str(cm.exception))
    
    def test_set_default_config(self):
        """Test setting default configuration when no instances exist."""
        scenario_path = self._create_config_files("app/scenario")
        
        with patch('inspect.getfile', return_value=str(scenario_path / "scenario.py")):
            loader = ConfigLoader(self.scenario_mock)
            loader.load_all_configs()
        
        # Check default values were set
        self.assertEqual(self.scenario_mock.target_trajectory_ids, [])
        self.assertEqual(self.scenario_mock.metadata, {})
        self.assertEqual(self.scenario_mock.additional_mockdata, False)
        self.assertEqual(self.scenario_mock.parameters, {})


if __name__ == '__main__':
    unittest.main()

