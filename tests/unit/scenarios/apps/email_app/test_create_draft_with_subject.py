# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for CreateDraftWithSubject scenario."""

import unittest
import sqlite3
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.email.create_draft_with_subject.scenario import CreateDraftWithSubject
from digiworld.scenarios.tests.scenarios.test_helpers import (
    mock_compare_database_records,
    create_email_schema
)


class TestCreateDraftWithSubject(unittest.TestCase):
    """Test cases for CreateDraftWithSubject scenario."""
    
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
        self._create_final_state_database()
        
        self.scenario = self._create_test_scenario()
    
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _create_test_scenario(self):
        """Create scenario instance with test configuration."""
        scenario = CreateDraftWithSubject.__new__(CreateDraftWithSubject)
        scenario.subject = "Project Proposal"
        scenario.initial_state_path = self.initial_state_dir
        
        scenario.compare_database_records = lambda initial, final, query, params: \
            mock_compare_database_records(initial, final, query, params)
        
        return scenario
    
    def _create_initial_state_database(self):
        """Create initial state WITHOUT the draft."""
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
            INSERT INTO emails (id, sender, receiver, subject, body, timestamp, status, folder)
            VALUES (1, 'user@example.com', 'other@example.com', 
                    'Old Draft', 'This is an old draft', datetime('now', '-1 day'), 'draft', 'drafts')
        """)
        
        conn.commit()
        conn.close()
    
    def _create_final_state_database(self):
        """Create final state WITH the new draft."""
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
            INSERT INTO emails (id, sender, receiver, subject, body, timestamp, status, folder)
            VALUES (1, 'user@example.com', 'other@example.com', 
                    'Old Draft', 'This is an old draft', datetime('now', '-1 day'), 'draft', 'drafts')
        """)
        
        cursor.execute("""
            INSERT INTO emails (id, sender, receiver, subject, body, timestamp, status, folder)
            VALUES (2, 'user@example.com', 'boss@example.com', 
                    'Project Proposal', 'Here is my proposal...', datetime('now'), 'draft', 'drafts')
        """)
        
        conn.commit()
        conn.close()
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task when draft is created."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when draft is created")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task when draft doesn't exist."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete without draft")
    
    def test_wrong_subject_not_completed(self):
        """Test that draft with wrong subject doesn't count as completion."""
        self.scenario.subject = "Different Subject"
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertFalse(result, "Should not recognize task as completed with wrong subject")
    
    def test_partial_subject_match(self):
        """Test that partial subject matching works (uses LIKE with wildcards)."""
        self.scenario.subject = "Proposal"
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should match draft containing the search term")
    
    def test_trashed_draft_not_counted(self):
        """Test that draft in trash doesn't count as completion."""
        trashed_dir = os.path.join(self.temp_dir, "trashed_state")
        os.makedirs(trashed_dir)
        trashed_db = os.path.join(trashed_dir, "default.db")
        
        conn = sqlite3.connect(trashed_db)
        create_email_schema(conn)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO users (id, email, password, first_name, last_name, 
                              created_at, settings, email_settings)
            VALUES (1, 'user@example.com', 'hashed', 'Test', 'User', 
                    datetime('now'), '{}', '{}')
        """)
        
        cursor.execute("""
            INSERT INTO emails (id, sender, receiver, subject, body, timestamp, status, folder)
            VALUES (2, 'user@example.com', 'boss@example.com', 
                    'Project Proposal', 'Here is my proposal...', datetime('now'), 'draft', 'trash')
        """)
        
        conn.commit()
        conn.close()
        
        result = self.scenario._check_task_completion(trashed_dir)
        self.assertFalse(result, "Should not count trashed draft as completion")


if __name__ == '__main__':
    unittest.main()

