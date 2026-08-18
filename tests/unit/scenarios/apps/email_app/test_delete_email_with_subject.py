# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for DeleteEmailWithSubject scenario."""

import unittest
import sqlite3
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.email.delete_email_with_subject.scenario import DeleteEmailWithSubject
from digiworld.scenarios.tests.scenarios.test_helpers import (
    mock_compare_database_records,
    create_email_schema
)


class TestDeleteEmailWithSubject(unittest.TestCase):
    """Test cases for DeleteEmailWithSubject scenario."""
    
    def setUp(self):
        """Set up test fixtures with temporary directories."""
        self.temp_dir = tempfile.mkdtemp()
        self.initial_state_dir = os.path.join(self.temp_dir, "initial_state")
        self.final_state_dir = os.path.join(self.temp_dir, "final_state")
        os.makedirs(self.initial_state_dir)
        os.makedirs(self.final_state_dir)
        
        self.initial_db = os.path.join(self.initial_state_dir, "default.db")
        self.final_db = os.path.join(self.final_state_dir, "default.db")
        
        self._create_initial_state_database()
        self._create_final_state_database_with_trash()
        
        self.scenario = self._create_test_scenario()
    
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _create_test_scenario(self):
        """Create scenario instance with test configuration."""
        scenario = DeleteEmailWithSubject.__new__(DeleteEmailWithSubject)
        scenario.subject = "Spam Email"
        scenario.initial_state_path = self.initial_state_dir
        
        scenario.compare_database_records = lambda initial, final, query, params: \
            mock_compare_database_records(initial, final, query, params)
        
        return scenario
    
    def _create_initial_state_database(self):
        """Create initial state with email in inbox."""
        conn = sqlite3.connect(self.initial_db)
        create_email_schema(conn)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO users (id, email, password, first_name, last_name, 
                              created_at, settings, email_settings)
            VALUES (1, 'user@example.com', 'hashed', 'Test', 'User', 
                    datetime('now'), '{}', '{}')
        """)
        
        cursor.execute("""
            INSERT INTO emails (id, sender, receiver, subject, body, timestamp, folder, status)
            VALUES (1, 'spammer@example.com', 'user@example.com', 
                    'Spam Email', 'You won a prize!', datetime('now'), 'inbox', 'received')
        """)
        
        cursor.execute("""
            INSERT INTO emails (id, sender, receiver, subject, body, timestamp, folder, status)
            VALUES (2, 'friend@example.com', 'user@example.com', 
                    'Hello Friend', 'How are you?', datetime('now'), 'inbox', 'received')
        """)
        
        conn.commit()
        conn.close()
    
    def _create_final_state_database_with_trash(self):
        """Create final state with email moved to trash."""
        conn = sqlite3.connect(self.final_db)
        create_email_schema(conn)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO users (id, email, password, first_name, last_name, 
                              created_at, settings, email_settings)
            VALUES (1, 'user@example.com', 'hashed', 'Test', 'User', 
                    datetime('now'), '{}', '{}')
        """)
        
        cursor.execute("""
            INSERT INTO emails (id, sender, receiver, subject, body, timestamp, folder, status)
            VALUES (1, 'spammer@example.com', 'user@example.com', 
                    'Spam Email', 'You won a prize!', datetime('now'), 'trash', 'received')
        """)
        
        cursor.execute("""
            INSERT INTO emails (id, sender, receiver, subject, body, timestamp, folder, status)
            VALUES (2, 'friend@example.com', 'user@example.com', 
                    'Hello Friend', 'How are you?', datetime('now'), 'inbox', 'received')
        """)
        
        conn.commit()
        conn.close()
    
    def test_recognizes_completed_task_moved_to_trash(self):
        """Test scenario identifies completed task when email moved to trash."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when email moved to trash")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task when email still in inbox."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete when email still in inbox")
    
    def test_completed_when_email_deleted(self):
        """Test scenario identifies completed task when email completely deleted."""
        deleted_dir = os.path.join(self.temp_dir, "deleted_state")
        os.makedirs(deleted_dir)
        deleted_db = os.path.join(deleted_dir, "default.db")
        
        conn = sqlite3.connect(deleted_db)
        create_email_schema(conn)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO users (id, email, password, first_name, last_name, 
                              created_at, settings, email_settings)
            VALUES (1, 'user@example.com', 'hashed', 'Test', 'User', 
                    datetime('now'), '{}', '{}')
        """)
        
        cursor.execute("""
            INSERT INTO emails (id, sender, receiver, subject, body, timestamp, folder, status)
            VALUES (2, 'friend@example.com', 'user@example.com', 
                    'Hello Friend', 'How are you?', datetime('now'), 'inbox', 'received')
        """)
        
        conn.commit()
        conn.close()
        
        result = self.scenario._check_task_completion(deleted_dir)
        self.assertTrue(result, "Should recognize task as completed when email completely deleted")
    
    def test_wrong_subject_not_completed(self):
        """Test that deleting wrong email doesn't count as completion."""
        self.scenario.subject = "Important Email"
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertFalse(result, "Should not recognize task as completed when wrong email deleted")


if __name__ == '__main__':
    unittest.main()

