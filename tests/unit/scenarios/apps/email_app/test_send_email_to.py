# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for SendEmailScenario."""

import unittest
import sqlite3
import tempfile
import os
import shutil
from unittest.mock import Mock
from digiworld.scenarios.scenarios.email.send_email_to.scenario import SendEmailScenario
from digiworld.scenarios.tests.scenarios.test_helpers import (
    mock_compare_database_records,
    create_email_schema
)


class TestSendEmailScenario(unittest.TestCase):
    """Test cases for SendEmailScenario."""
    
    def setUp(self):
        """Set up test fixtures with temporary databases."""
        self.temp_dir = tempfile.mkdtemp()
        self.initial_state_dir = os.path.join(self.temp_dir, "initial_state")
        self.final_state_dir = os.path.join(self.temp_dir, "final_state")
        os.makedirs(self.initial_state_dir)
        os.makedirs(self.final_state_dir)
        
        self.initial_db = os.path.join(self.initial_state_dir, "default.db")
        self.final_db = os.path.join(self.final_state_dir, "default.db")
        
        self._create_initial_state_database()
        self._create_final_state_database()
        
        self.scenario = self._create_test_scenario()
    
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _create_test_scenario(self):
        """Create scenario instance with test configuration."""
        scenario = SendEmailScenario.__new__(SendEmailScenario)
        
        # Set scenario attributes that _check_task_completion needs
        scenario.current_user_email = 'sender@example.com'
        scenario.email = 'recipient@example.com'
        scenario.initial_state_path = self.initial_state_dir
        
        # Mock the compare_database_records method
        scenario.compare_database_records = lambda initial, final, query, params: \
            mock_compare_database_records(initial, final, query, params)
        
        return scenario
    
    def _create_initial_state_database(self):
        """Create initial state WITHOUT the target email."""
        conn = sqlite3.connect(self.initial_db)
        create_email_schema(conn)
        cursor = conn.cursor()
        
        # Insert test users
        cursor.execute("""
            INSERT INTO users (id, email, password, first_name, last_name, 
                              created_at, settings, email_settings)
            VALUES (1, 'sender@example.com', 'hashed', 'Sender', 'User', 
                    datetime('now'), '{}', '{}')
        """)
        
        cursor.execute("""
            INSERT INTO users (id, email, password, first_name, last_name, 
                              created_at, settings, email_settings)
            VALUES (2, 'recipient@example.com', 'hashed', 'Recipient', 'User', 
                    datetime('now'), '{}', '{}')
        """)
        
        # Add some existing emails (but not to the target recipient)
        cursor.execute("""
            INSERT INTO emails (id, sender, receiver, subject, body, timestamp)
            VALUES (1, 'sender@example.com', 'other@example.com', 
                    'Old Email', 'This is an old email', datetime('now', '-1 day'))
        """)
        
        conn.commit()
        conn.close()
    
    def _create_final_state_database(self):
        """Create final state WITH the target email."""
        conn = sqlite3.connect(self.final_db)
        create_email_schema(conn)
        cursor = conn.cursor()
        
        # Insert test users
        cursor.execute("""
            INSERT INTO users (id, email, password, first_name, last_name, 
                              created_at, settings, email_settings)
            VALUES (1, 'sender@example.com', 'hashed', 'Sender', 'User', 
                    datetime('now'), '{}', '{}')
        """)
        
        cursor.execute("""
            INSERT INTO users (id, email, password, first_name, last_name, 
                              created_at, settings, email_settings)
            VALUES (2, 'recipient@example.com', 'hashed', 'Recipient', 'User', 
                    datetime('now'), '{}', '{}')
        """)
        
        # Add existing emails
        cursor.execute("""
            INSERT INTO emails (id, sender, receiver, subject, body, timestamp)
            VALUES (1, 'sender@example.com', 'other@example.com', 
                    'Old Email', 'This is an old email', datetime('now', '-1 day'))
        """)
        
        # Add the NEW target email
        cursor.execute("""
            INSERT INTO emails (id, sender, receiver, subject, body, timestamp)
            VALUES (2, 'sender@example.com', 'recipient@example.com', 
                    'New Email', 'This is the new email', datetime('now'))
        """)
        
        conn.commit()
        conn.close()
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task correctly."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when target email exists")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete in initial state")
    
    def test_wrong_recipient_not_completed(self):
        """Test that email to wrong recipient doesn't count as completion."""
        # Change scenario to look for different recipient
        self.scenario.email = 'other@example.com'
        
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertFalse(result, "Should not recognize task as completed with wrong recipient")
    
    def test_partial_email_match_works(self):
        """Test that partial email matching works (uses LIKE)."""
        # The scenario uses LIKE with % wildcards
        self.scenario.email = 'recipient'
        
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should match email containing the search term")


if __name__ == '__main__':
    unittest.main()

