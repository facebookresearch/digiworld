# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for OpenEmailWithSubject scenario."""

import unittest
import sqlite3
import json
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.email.open_email_with_subject.scenario import OpenEmailWithSubject
from digiworld.scenarios.tests.scenarios.test_helpers import create_email_schema


def mock_execute_query_in_path(query, params, state_path):
    """Mock for _execute_query_in_path that queries the actual test database."""
    db_path = os.path.join(state_path, "default.db")
    if not os.path.exists(db_path):
        return []
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(query, params)
    results = cursor.fetchall()
    conn.close()
    return results


class TestOpenEmailWithSubject(unittest.TestCase):
    """Test cases for OpenEmailWithSubject scenario."""
    
    def setUp(self):
        """Set up test fixtures with temporary directories."""
        self.temp_dir = tempfile.mkdtemp()
        self.initial_state_dir = os.path.join(self.temp_dir, "initial_state")
        self.final_state_dir = os.path.join(self.temp_dir, "final_state")
        os.makedirs(self.initial_state_dir)
        os.makedirs(self.final_state_dir)
        
        self.initial_db = os.path.join(self.initial_state_dir, "default.db")
        self.final_db = os.path.join(self.final_state_dir, "default.db")
        
        self._create_database(self.initial_db)
        self._create_database(self.final_db)
        self._create_initial_rootstore()
        self._create_final_rootstore()
        
        self.scenario = self._create_test_scenario()
    
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _create_test_scenario(self):
        """Create scenario instance with test configuration."""
        scenario = OpenEmailWithSubject.__new__(OpenEmailWithSubject)
        scenario.subject = "Important Meeting"
        
        scenario._execute_query_in_path = mock_execute_query_in_path
        
        return scenario
    
    def _create_database(self, db_path):
        """Create database with test email."""
        conn = sqlite3.connect(db_path)
        create_email_schema(conn)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO users (id, email, password, first_name, last_name, 
                              created_at, settings, email_settings)
            VALUES (1, 'user@example.com', 'hashed', 'Test', 'User', 
                    datetime('now'), '{}', '{}')
        """)
        
        cursor.execute("""
            INSERT INTO emails (id, sender, receiver, subject, body, timestamp, thread_id)
            VALUES (42, 'sender@example.com', 'user@example.com', 
                    'Important Meeting', 'Meeting at 3pm', datetime('now'), '42')
        """)
        
        cursor.execute("""
            INSERT INTO emails (id, sender, receiver, subject, body, timestamp, thread_id)
            VALUES (43, 'other@example.com', 'user@example.com', 
                    'Other Subject', 'Different email', datetime('now'), '43')
        """)
        
        conn.commit()
        conn.close()
    
    def _create_initial_rootstore(self):
        """Create initial rootstore.json on home screen."""
        rootstore_path = os.path.join(self.initial_state_dir, "rootstore.json")
        
        rootstore_data = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "inbox",
                        "route": "/(tabs)/inbox"
                    }
                }
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def _create_final_rootstore(self):
        """Create final rootstore.json with email details screen open."""
        rootstore_path = os.path.join(self.final_state_dir, "rootstore.json")
        
        rootstore_data = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "details",
                        "route": "/screens/mail/42"
                    }
                }
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task when correct email is opened."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when target email is opened")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task when on inbox."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete when not viewing email")
    
    def test_wrong_email_not_completed(self):
        """Test that opening wrong email doesn't count as completion."""
        wrong_email_dir = os.path.join(self.temp_dir, "wrong_email")
        os.makedirs(wrong_email_dir)
        
        self._create_database(os.path.join(wrong_email_dir, "default.db"))
        
        rootstore_path = os.path.join(wrong_email_dir, "rootstore.json")
        rootstore_data = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "details",
                        "route": "/screens/mail/43"
                    }
                }
            }
        }
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
        
        result = self.scenario._check_task_completion(wrong_email_dir)
        self.assertFalse(result, "Should not recognize task as completed when wrong email opened")
    
    def test_missing_rootstore_returns_false(self):
        """Test that missing rootstore.json returns False."""
        empty_dir = os.path.join(self.temp_dir, "empty_state")
        os.makedirs(empty_dir)
        
        result = self.scenario._check_task_completion(empty_dir)
        self.assertFalse(result, "Should return False when rootstore.json doesn't exist")
    
    def test_case_insensitive_subject_match(self):
        """Test that subject matching is case-insensitive."""
        self.scenario.subject = "IMPORTANT MEETING"
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Subject matching should be case-insensitive")
    
    def test_thread_id_string_lookup(self):
        """Test that route with thread_id string (like real app navigation) works."""
        thread_id_dir = os.path.join(self.temp_dir, "thread_id_state")
        os.makedirs(thread_id_dir)
        
        # Create database with thread_id as a string (like mockdata uses)
        db_path = os.path.join(thread_id_dir, "default.db")
        conn = sqlite3.connect(db_path)
        create_email_schema(conn)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO users (id, email, password, first_name, last_name, 
                              created_at, settings, email_settings)
            VALUES (1, 'user@example.com', 'hashed', 'Test', 'User', 
                    datetime('now'), '{}', '{}')
        """)
        
        # Insert email with string thread_id (like "thread_target" in mockdata)
        cursor.execute("""
            INSERT INTO emails (id, sender, receiver, subject, body, timestamp, thread_id)
            VALUES (999, 'sender@example.com', 'user@example.com', 
                    'Important Meeting', 'Meeting at 3pm', datetime('now'), 'thread_target')
        """)
        
        conn.commit()
        conn.close()
        
        # Create rootstore with route using thread_id string (real app navigation)
        rootstore_path = os.path.join(thread_id_dir, "rootstore.json")
        rootstore_data = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "details",
                        "route": "/screens/mail/thread_target"
                    }
                }
            }
        }
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
        
        result = self.scenario._check_task_completion(thread_id_dir)
        self.assertTrue(result, "Should find email by thread_id string in route")
    
    def test_numeric_id_fallback(self):
        """Test that route with numeric ID falls back to id column lookup."""
        numeric_id_dir = os.path.join(self.temp_dir, "numeric_id_state")
        os.makedirs(numeric_id_dir)
        
        # Create database with thread_id that doesn't match the route
        db_path = os.path.join(numeric_id_dir, "default.db")
        conn = sqlite3.connect(db_path)
        create_email_schema(conn)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO users (id, email, password, first_name, last_name, 
                              created_at, settings, email_settings)
            VALUES (1, 'user@example.com', 'hashed', 'Test', 'User', 
                    datetime('now'), '{}', '{}')
        """)
        
        # Insert email where thread_id differs from id
        cursor.execute("""
            INSERT INTO emails (id, sender, receiver, subject, body, timestamp, thread_id)
            VALUES (100, 'sender@example.com', 'user@example.com', 
                    'Important Meeting', 'Meeting at 3pm', datetime('now'), 'different_thread')
        """)
        
        conn.commit()
        conn.close()
        
        # Create rootstore with numeric ID in route (pre-generated state style)
        rootstore_path = os.path.join(numeric_id_dir, "rootstore.json")
        rootstore_data = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "details",
                        "route": "/screens/mail/100"
                    }
                }
            }
        }
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
        
        result = self.scenario._check_task_completion(numeric_id_dir)
        self.assertTrue(result, "Should fall back to id column when thread_id doesn't match")


if __name__ == '__main__':
    unittest.main()

