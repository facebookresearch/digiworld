# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for mockdata_handler module."""

import unittest
import json
import tempfile
import os
import sqlite3
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch, call
from digiworld.scenarios.mockdata_handler import MockdataHandler
from digiworld.scenarios.template_resolver import TemplateResolver


class TestMockdataHandler(unittest.TestCase):
    """Test cases for MockdataHandler."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.scenario_mock = Mock()
        self.scenario_mock.base_path = self.temp_dir
        self.scenario_mock.apk_name = "com.test.app"
        self.scenario_mock.profile_name = "test-profile"
        self.scenario_mock.initial_state_id = "state1"
        self.scenario_mock.instance_tag = "test_instance"
        self.scenario_mock.scenario_config = {}
        
        # Mock the template resolver creation
        mock_resolver = Mock()
        mock_resolver.resolve_object = lambda obj: obj
        self.scenario_mock._create_template_resolver = Mock(return_value=mock_resolver)
        self.scenario_mock._get_positioning_data = Mock(return_value={})
        
        self.handler = MockdataHandler(self.scenario_mock)
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_mockdata_handler_initialization(self):
        """Test that MockdataHandler initializes correctly."""
        self.assertIsNotNone(self.handler.scenario)
        self.assertEqual(self.handler.scenario, self.scenario_mock)
    
    def test_get_instance_mockdata_path_exists(self):
        """Test getting instance mockdata path when it exists."""
        # Create a mock scenario class file
        scenario_dir = Path(self.temp_dir) / "app" / "scenario"
        mockdata_dir = scenario_dir / "instances" / "test_instance" / "mockdata"
        mockdata_dir.mkdir(parents=True, exist_ok=True)
        
        # Create a dummy scenario.py file
        scenario_file = scenario_dir / "scenario.py"
        scenario_file.touch()
        
        with patch('inspect.getfile', return_value=str(scenario_file)):
            path = self.handler._get_instance_mockdata_path()
            self.assertEqual(path, str(mockdata_dir))
    
    def test_get_instance_mockdata_path_not_exists(self):
        """Test getting instance mockdata path when it doesn't exist."""
        scenario_dir = Path(self.temp_dir) / "app" / "scenario"
        scenario_dir.mkdir(parents=True, exist_ok=True)
        scenario_file = scenario_dir / "scenario.py"
        scenario_file.touch()
        
        with patch('inspect.getfile', return_value=str(scenario_file)):
            path = self.handler._get_instance_mockdata_path()
            self.assertIsNone(path)
    
    def test_collect_and_resolve_mockdata_single_file(self):
        """Test collecting and resolving mockdata from a single file."""
        # Create mockdata directory with a JSON file
        mockdata_dir = Path(self.temp_dir) / "mockdata"
        mockdata_dir.mkdir(parents=True)
        
        test_data = [
            {"id": "{{auto_id}}", "email": "{{current_user_email}}"},
            {"id": "{{auto_id}}", "email": "test2@example.com"}
        ]
        
        with open(mockdata_dir / "mock-emails.json", 'w') as f:
            json.dump(test_data, f)
        
        # Create a real template resolver for testing
        user_context = {'current_user_email': 'user@test.com', 'current_user_id': '123'}
        resolver = TemplateResolver(user_context)
        
        result = self.handler._collect_and_resolve_mockdata([str(mockdata_dir)], resolver)
        
        self.assertIn('mock-emails.json', result)
        self.assertEqual(len(result['mock-emails.json']), 2)
        # Check that templates were resolved
        self.assertEqual(result['mock-emails.json'][0]['email'], 'user@test.com')
        self.assertIsNotNone(result['mock-emails.json'][0]['id'])
    
    def test_collect_and_resolve_mockdata_multiple_files(self):
        """Test collecting and resolving mockdata from multiple files."""
        mockdata_dir = Path(self.temp_dir) / "mockdata"
        mockdata_dir.mkdir(parents=True)
        
        # Create multiple JSON files
        with open(mockdata_dir / "mock-emails.json", 'w') as f:
            json.dump([{"id": "1", "subject": "Test"}], f)
        
        with open(mockdata_dir / "mock-contacts.json", 'w') as f:
            json.dump([{"id": "1", "name": "Contact"}], f)
        
        user_context = {'current_user_email': 'user@test.com'}
        resolver = TemplateResolver(user_context)
        
        result = self.handler._collect_and_resolve_mockdata([str(mockdata_dir)], resolver)
        
        self.assertIn('mock-emails.json', result)
        self.assertIn('mock-contacts.json', result)
        self.assertEqual(len(result), 2)
    
    def test_collect_and_resolve_mockdata_merge_same_file(self):
        """Test merging mockdata from same filename in different directories."""
        dir1 = Path(self.temp_dir) / "mockdata1"
        dir2 = Path(self.temp_dir) / "mockdata2"
        dir1.mkdir(parents=True)
        dir2.mkdir(parents=True)
        
        # Create same filename in both directories
        with open(dir1 / "mock-data.json", 'w') as f:
            json.dump([{"id": "1"}], f)
        
        with open(dir2 / "mock-data.json", 'w') as f:
            json.dump([{"id": "2"}], f)
        
        user_context = {}
        resolver = TemplateResolver(user_context)
        
        result = self.handler._collect_and_resolve_mockdata(
            [str(dir1), str(dir2)], resolver
        )
        
        self.assertIn('mock-data.json', result)
        # Should be merged
        self.assertEqual(len(result['mock-data.json']), 2)
    
    def test_collect_and_resolve_mockdata_empty_directory(self):
        """Test collecting mockdata from empty directory."""
        mockdata_dir = Path(self.temp_dir) / "mockdata"
        mockdata_dir.mkdir(parents=True)
        
        user_context = {}
        resolver = TemplateResolver(user_context)
        
        result = self.handler._collect_and_resolve_mockdata([str(mockdata_dir)], resolver)
        
        self.assertEqual(result, {})
    
    def test_collect_and_resolve_mockdata_nonexistent_path(self):
        """Test collecting mockdata from non-existent path."""
        nonexistent_path = str(Path(self.temp_dir) / "nonexistent")
        
        user_context = {}
        resolver = TemplateResolver(user_context)
        
        result = self.handler._collect_and_resolve_mockdata([nonexistent_path], resolver)
        
        self.assertEqual(result, {})
    
    @patch('digiworld.scenarios.context_extractor.ContextExtractor')
    def test_resolve_templates_in_mockdata_with_mockdata(self, mock_context_extractor_class):
        """Test resolving templates in mockdata when mockdata exists."""
        # Setup mock ADB
        mock_adb = Mock()
        
        # Setup mock context extractor
        mock_extractor = Mock()
        mock_extractor.extract_user_context.return_value = {
            'current_user_email': 'user@test.com',
            'current_user_id': '123'
        }
        mock_context_extractor_class.return_value = mock_extractor
        
        # Create mockdata directory
        scenario_dir = Path(self.temp_dir) / "app" / "scenario"
        mockdata_dir = scenario_dir / "instances" / "test_instance" / "mockdata"
        mockdata_dir.mkdir(parents=True, exist_ok=True)
        
        test_data = [{"id": "{{auto_id}}", "email": "{{current_user_email}}"}]
        with open(mockdata_dir / "test.json", 'w') as f:
            json.dump(test_data, f)
        
        scenario_file = scenario_dir / "scenario.py"
        scenario_file.touch()
        
        # Create a database file
        db_path = Path(self.temp_dir) / "test.db"
        conn = sqlite3.connect(db_path)
        conn.close()
        
        with patch('inspect.getfile', return_value=str(scenario_file)):
            result = self.handler._resolve_templates_in_mockdata(mock_adb, str(db_path))
        
        self.assertIn('test.json', result)
        self.assertIsNotNone(result['test.json'])
    
    @patch('digiworld.scenarios.context_extractor.ContextExtractor')
    def test_resolve_templates_in_mockdata_no_mockdata(self, mock_context_extractor_class):
        """Test resolving templates when no mockdata exists."""
        mock_adb = Mock()
        
        mock_extractor = Mock()
        mock_extractor.extract_user_context.return_value = {
            'current_user_email': 'user@test.com'
        }
        mock_context_extractor_class.return_value = mock_extractor
        
        # Don't create any mockdata directory
        scenario_dir = Path(self.temp_dir) / "app" / "scenario"
        scenario_dir.mkdir(parents=True, exist_ok=True)
        scenario_file = scenario_dir / "scenario.py"
        scenario_file.touch()
        
        db_path = Path(self.temp_dir) / "test.db"
        conn = sqlite3.connect(db_path)
        conn.close()
        
        with patch('inspect.getfile', return_value=str(scenario_file)):
            result = self.handler._resolve_templates_in_mockdata(mock_adb, str(db_path))
        
        self.assertEqual(result, {})
    
    def test_handle_mockdata_requires_adb(self):
        """Test that handle_mockdata requires ADB parameter."""
        with self.assertRaises(Exception):
            self.handler.handle_mockdata(None)


if __name__ == '__main__':
    unittest.main()

