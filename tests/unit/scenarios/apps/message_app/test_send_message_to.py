# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for SendMessageToScenario."""

import unittest
import sqlite3
import tempfile
import os
import shutil
from unittest.mock import Mock
from digiworld.scenarios.scenarios.message.send_message_to.scenario import SendMessageToScenario
from digiworld.scenarios.tests.scenarios.test_helpers import (
    mock_compare_database_records,
    create_message_schema
)


class TestSendMessageToScenario(unittest.TestCase):
    """Test cases for SendMessageToScenario."""
    
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
        scenario = SendMessageToScenario.__new__(SendMessageToScenario)
        
        # Set scenario attributes that _check_task_completion needs
        scenario.current_user_id = 'user_1'
        scenario.contact_name = 'Alice'
        scenario.initial_state_path = self.initial_state_dir
        
        # Mock the compare_database_records method
        scenario.compare_database_records = lambda initial, final, query, params: \
            mock_compare_database_records(initial, final, query, params)
        
        return scenario
    
    def _create_initial_state_database(self):
        """Create initial state WITHOUT the target message."""
        conn = sqlite3.connect(self.initial_db)
        create_message_schema(conn)
        cursor = conn.cursor()
        
        # Insert test users using snake_case column names
        cursor.execute("""
            INSERT INTO users (id, phone_number, name, avatar_url, last_logged_in)
            VALUES ('user_1', '+1234567890', 'John Doe', 
                    'https://i.pravatar.cc/150?u=john', 0)
        """)
        
        cursor.execute("""
            INSERT INTO users (id, phone_number, name, avatar_url, last_logged_in)
            VALUES ('user_2', '+1234567891', 'Alice', 
                    'https://i.pravatar.cc/150?u=alice', 0)
        """)
        
        cursor.execute("""
            INSERT INTO users (id, phone_number, name, avatar_url, last_logged_in)
            VALUES ('user_3', '+1234567892', 'Bob', 
                    'https://i.pravatar.cc/150?u=bob', 0)
        """)
        
        # Add some existing messages (but not to Alice) using snake_case column names
        cursor.execute("""
            INSERT INTO messages (id, sender_id, receiver_id, message_type, content, 
                                 timestamp, is_read, is_delivered)
            VALUES ('msg_1', 'user_1', 'user_3', 'text', 'Hey Bob!', 
                    strftime('%s','now', '-1 day'), 1, 1)
        """)
        
        conn.commit()
        conn.close()
    
    def _create_final_state_database(self):
        """Create final state WITH the target message."""
        conn = sqlite3.connect(self.final_db)
        create_message_schema(conn)
        cursor = conn.cursor()
        
        # Insert test users using snake_case column names
        cursor.execute("""
            INSERT INTO users (id, phone_number, name, avatar_url, last_logged_in)
            VALUES ('user_1', '+1234567890', 'John Doe', 
                    'https://i.pravatar.cc/150?u=john', 0)
        """)
        
        cursor.execute("""
            INSERT INTO users (id, phone_number, name, avatar_url, last_logged_in)
            VALUES ('user_2', '+1234567891', 'Alice', 
                    'https://i.pravatar.cc/150?u=alice', 0)
        """)
        
        cursor.execute("""
            INSERT INTO users (id, phone_number, name, avatar_url, last_logged_in)
            VALUES ('user_3', '+1234567892', 'Bob', 
                    'https://i.pravatar.cc/150?u=bob', 0)
        """)
        
        # Add existing messages using snake_case column names
        cursor.execute("""
            INSERT INTO messages (id, sender_id, receiver_id, message_type, content, 
                                 timestamp, is_read, is_delivered)
            VALUES ('msg_1', 'user_1', 'user_3', 'text', 'Hey Bob!', 
                    strftime('%s','now', '-1 day'), 1, 1)
        """)
        
        # Add the NEW target message to Alice using snake_case column names
        cursor.execute("""
            INSERT INTO messages (id, sender_id, receiver_id, message_type, content, 
                                 timestamp, is_read, is_delivered)
            VALUES ('msg_2', 'user_1', 'user_2', 'text', 'Hi Alice!', 
                    strftime('%s','now'), 0, 1)
        """)
        
        conn.commit()
        conn.close()
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task correctly."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when target message exists")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete in initial state")
    
    def test_wrong_recipient_not_completed(self):
        """Test that message to wrong recipient doesn't count as completion."""
        # Change scenario to look for different recipient
        self.scenario.contact_name = 'Bob'
        
        result = self.scenario._check_task_completion(self.final_state_dir)
        # Should be False because the new message in final state is to Alice, not Bob
        # Bob only has an old message from initial state
        self.assertFalse(result, "Should not recognize task as completed with wrong recipient")
    
    def test_partial_name_match_works(self):
        """Test that partial name matching works (uses LIKE)."""
        # The scenario uses LIKE with % wildcards
        self.scenario.contact_name = 'Ali'
        
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should match contact name containing the search term")


if __name__ == '__main__':
    unittest.main()

