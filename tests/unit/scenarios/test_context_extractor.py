# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for context_extractor module."""

import unittest
import json
import tempfile
import os
from unittest.mock import Mock
from digiworld.scenarios.context_extractor import ContextExtractor


class TestContextExtractor(unittest.TestCase):
    """Test cases for ContextExtractor."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.scenario_mock = Mock()
        self.scenario_mock.scenario_config = {
            'context_fields': ['current_user_email', 'current_user_id']
        }
        
        # Mock the _get_supported_context_fields method
        def mock_supported_fields():
            return {
                'current_user_email': 'User email address',
                'current_user_id': 'User ID',
                'profile_name': 'Profile name'
            }
        
        self.scenario_mock._get_supported_context_fields = mock_supported_fields
        
        # Mock _extract_context_field
        def mock_extract_field(field_name, db_path, user_context):
            if field_name == 'profile_name':
                return 'test-profile'
            return None
        
        self.scenario_mock._extract_context_field = mock_extract_field
        
        self.extractor = ContextExtractor(self.scenario_mock)
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _create_rootstore_json(self, user_id='123', email='test@example.com'):
        """Helper to create a test rootstore.json file."""
        json_path = os.path.join(self.temp_dir, "rootstore.json")
        
        with open(json_path, 'w') as f:
            json.dump({
                'userStore': {
                    'currentUser': {
                        'id': user_id,
                        'email': email
                    }
                }
            }, f)
        
        return json_path
    
    def test_extract_user_context_basic(self):
        """Test basic user context extraction."""
        db_path = os.path.join(self.temp_dir, "test.db")
        self._create_rootstore_json()
        
        # Create empty DB file
        open(db_path, 'a').close()
        
        context = self.extractor.extract_user_context(db_path)
        
        self.assertIn('current_user_email', context)
        self.assertIn('current_user_id', context)
        self.assertEqual(context['current_user_email'], 'test@example.com')
        self.assertEqual(context['current_user_id'], '123')
    
    def test_extract_user_context_no_fields(self):
        """Test extraction with no context fields specified."""
        self.scenario_mock.scenario_config = {'context_fields': []}
        
        db_path = os.path.join(self.temp_dir, "test.db")
        self._create_rootstore_json()
        open(db_path, 'a').close()
        
        context = self.extractor.extract_user_context(db_path)
        
        # Should still have basic fields
        self.assertIsInstance(context, dict)
    
    def test_missing_rootstore_json(self):
        """Test error when rootstore.json is missing."""
        db_path = os.path.join(self.temp_dir, "test.db")
        open(db_path, 'a').close()
        
        with self.assertRaises(FileNotFoundError) as cm:
            self.extractor.extract_user_context(db_path)
        
        self.assertIn('rootstore.json', str(cm.exception))
    
    def test_format_context_for_system_prompt(self):
        """Test formatting context for system prompts."""
        db_path = os.path.join(self.temp_dir, "test.db")
        self._create_rootstore_json()
        open(db_path, 'a').close()
        
        formatted = self.extractor.format_context_for_system_prompt(db_path)
        
        self.assertIsInstance(formatted, str)
        self.assertIn('current_user_email', formatted)
        self.assertIn('test@example.com', formatted)


if __name__ == '__main__':
    unittest.main()

