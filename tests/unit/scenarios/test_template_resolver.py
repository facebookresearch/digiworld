# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for template_resolver module."""

import unittest
from datetime import datetime, timedelta
from digiworld.scenarios.template_resolver import TemplateResolver


class TestTemplateResolver(unittest.TestCase):
    """Test cases for TemplateResolver."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.user_context = {
            'current_user_email': 'test@example.com',
            'current_user_id': '123',
            'current_user_name': 'Test User'
        }
        # Note: positioning_data is not passed to base TemplateResolver
        # It's only used in app-specific resolvers
        self.resolver = TemplateResolver(self.user_context)
    
    def test_resolve_user_context(self):
        """Test resolving user context templates."""
        result = self.resolver.resolve('{{current_user_email}}')
        self.assertEqual(result, 'test@example.com')
        
        result = self.resolver.resolve('{{current_user_id}}')
        self.assertEqual(result, '123')
    
    def test_resolve_user_id(self):
        """Test resolving user ID templates."""
        result = self.resolver.resolve('{{current_user_id}}')
        self.assertEqual(result, '123')
    
    def test_resolve_auto_id(self):
        """Test auto_id generation."""
        result1 = self.resolver.resolve('{{auto_id}}')
        result2 = self.resolver.resolve('{{auto_id}}')
        
        # Should generate different IDs each time
        self.assertNotEqual(result1, result2)
        self.assertTrue(len(result1) > 0)
    
    def test_resolve_timestamps(self):
        """Test timestamp generation."""
        # Test recent_timestamp (doesn't end with Z)
        result = self.resolver.resolve('{{recent_timestamp}}')
        self.assertIsInstance(result, str)
        timestamp = datetime.fromisoformat(result)
        now = datetime.now()
        self.assertTrue(timedelta(hours=-48) <= (timestamp - now) <= timedelta(hours=0))
        
        # Test past_timestamp (ends with Z)
        result = self.resolver.resolve('{{past_timestamp}}')
        self.assertTrue(result.endswith('Z'))
    
    def test_resolve_random_phone(self):
        """Test random phone number generation."""
        result = self.resolver.resolve('{{random_phone}}')
        self.assertTrue(result.startswith('+1-555-'))
        # Format is +1-555-XXXX (11 characters)
        self.assertEqual(len(result), 11)
    
    def test_resolve_random_birth_date(self):
        """Test random birth date generation."""
        result = self.resolver.resolve('{{random_birth_date}}')
        # Should be in YYYY-MM-DD format
        parts = result.split('-')
        self.assertEqual(len(parts), 3)
        year = int(parts[0])
        self.assertTrue(1950 <= year <= 2005)
    
    def test_resolve_object(self):
        """Test resolving templates in nested objects."""
        obj = {
            'user': '{{current_user_email}}',
            'id': '{{current_user_id}}',
            'nested': {
                'email': '{{current_user_email}}',
                'auto_id': '{{auto_id}}'
            }
        }
        
        result = self.resolver.resolve_object(obj)
        
        self.assertEqual(result['user'], 'test@example.com')
        self.assertEqual(result['id'], '123')
        self.assertEqual(result['nested']['email'], 'test@example.com')
        # auto_id should be a generated integer
        self.assertTrue(isinstance(int(result['nested']['auto_id']), int))
    
    def test_resolve_array(self):
        """Test resolving templates in arrays."""
        arr = [
            '{{current_user_email}}',
            {'id': '{{current_user_id}}'},
            '{{random_birth_date}}'
        ]
        
        result = self.resolver.resolve_object(arr)
        
        self.assertEqual(result[0], 'test@example.com')
        self.assertEqual(result[1]['id'], '123')
        # Birth date should be in YYYY-MM-DD format
        self.assertRegex(result[2], r'\d{4}-\d{2}-\d{2}')
    
    def test_no_template(self):
        """Test that non-template strings are returned unchanged."""
        result = self.resolver.resolve('plain text')
        self.assertEqual(result, 'plain text')
        
        result = self.resolver.resolve('email@example.com')
        self.assertEqual(result, 'email@example.com')
    
    def test_unknown_template(self):
        """Test that unknown templates raise an error in base resolver."""
        # Base TemplateResolver throws exception for unknown templates
        # This is by design to catch errors early
        with self.assertRaises(ValueError) as cm:
            self.resolver.resolve('{{unknown_field}}')
        self.assertIn('Unrecognized template placeholder', str(cm.exception))


if __name__ == '__main__':
    unittest.main()

