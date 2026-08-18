# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for state_manager module."""

import unittest
import sqlite3
import tempfile
import os
import json
from pathlib import Path
from unittest.mock import Mock
from digiworld.scenarios.state_manager import StateManager


class TestStateManager(unittest.TestCase):
    """Test cases for StateManager."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.scenario_mock = Mock()
        self.scenario_mock.base_path = self.temp_dir
        self.scenario_mock.apk_name = "com.test.app"
        self.scenario_mock.profile_name = "test-profile"
        self.scenario_mock.initial_state_id = "state1"
        
        self.manager = StateManager(self.scenario_mock)
        
        # Create test database
        self.db_path = os.path.join(self.temp_dir, "test.db")
        self._create_test_database()
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _create_test_database(self):
        """Create a test SQLite database with sample data."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                name TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE items (
                id INTEGER PRIMARY KEY,
                name TEXT,
                value INTEGER
            )
        """)
        
        cursor.execute("INSERT INTO users VALUES ('1', 'user1@test.com', 'User One')")
        cursor.execute("INSERT INTO users VALUES ('2', 'user2@test.com', 'User Two')")
        cursor.execute("INSERT INTO items VALUES (1, 'Item A', 100)")
        cursor.execute("INSERT INTO items VALUES (2, 'Item B', 200)")
        
        conn.commit()
        conn.close()
    
    def test_connect_to_db(self):
        """Test database connection."""
        conn = self.manager.connect_to_db(self.db_path)
        self.assertIsNotNone(conn)
        
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        count = cursor.fetchone()[0]
        self.assertEqual(count, 2)
        
        conn.close()
    
    def test_execute_query(self):
        """Test query execution."""
        self.scenario_mock.db_path = self.db_path
        
        results = self.manager.execute_query(self.db_path, "SELECT * FROM users WHERE id = ?", ('1',))
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0][0], '1')
        self.assertEqual(results[0][1], 'user1@test.com')
    
    def test_get_current_user_info(self):
        """Test extracting current user info from JSON store."""
        json_path = os.path.join(self.temp_dir, "rootstore.json")
        
        import json
        with open(json_path, 'w') as f:
            json.dump({
                'userStore': {
                    'currentUser': {
                        'id': '123',
                        'email': 'test@example.com'
                    }
                }
            }, f)
        
        user_id, email = self.manager.get_current_user_info(json_path)
        
        self.assertEqual(user_id, '123')
        self.assertEqual(email, 'test@example.com')
    
    def test_compare_database_records(self):
        """Test comparing database records between states."""
        # Create two database files directly (not in state directories)
        db1_path = os.path.join(self.temp_dir, "db1.db")
        db2_path = os.path.join(self.temp_dir, "db2.db")
        
        # State 1: 2 items
        conn1 = sqlite3.connect(db1_path)
        cursor1 = conn1.cursor()
        cursor1.execute("CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)")
        cursor1.execute("INSERT INTO items VALUES (1, 'Item A')")
        cursor1.execute("INSERT INTO items VALUES (2, 'Item B')")
        conn1.commit()
        conn1.close()
        
        # State 2: 3 items (one new)
        conn2 = sqlite3.connect(db2_path)
        cursor2 = conn2.cursor()
        cursor2.execute("CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)")
        cursor2.execute("INSERT INTO items VALUES (1, 'Item A')")
        cursor2.execute("INSERT INTO items VALUES (2, 'Item B')")
        cursor2.execute("INSERT INTO items VALUES (3, 'Item C')")
        conn2.commit()
        conn2.close()
        
        # compare_database_records expects database file paths
        # Returns (initial_records, current_records, new_records)
        initial_records, current_records, new_records = self.manager.compare_database_records(
            db1_path, db2_path, "SELECT * FROM items", ()
        )
        
        self.assertEqual(len(initial_records), 2)
        self.assertEqual(len(current_records), 3)
        self.assertEqual(len(new_records), 1)
        # The new record should be item 3
        new_record = list(new_records)[0]
        self.assertEqual(new_record[0], 3)
    
    def test_create_new_state_from(self):
        """Test creating a new state by duplicating an existing state."""
        # Create a source state
        source_state_id = "source_state"
        source_path = os.path.join(self.temp_dir, source_state_id)
        os.makedirs(source_path, exist_ok=True)
        
        # Create source database
        source_db = os.path.join(source_path, f"{source_state_id}.db")
        conn = sqlite3.connect(source_db)
        cursor = conn.cursor()
        cursor.execute("CREATE TABLE test (id INTEGER, value TEXT)")
        cursor.execute("INSERT INTO test VALUES (1, 'test_value')")
        conn.commit()
        conn.close()
        
        # Create source rootstore.json
        source_json = os.path.join(source_path, "rootstore.json")
        with open(source_json, 'w') as f:
            json.dump({"state_id": source_state_id, "userStore": {"currentUser": {"id": "123"}}}, f)
        
        # Create new state
        new_state_id = self.manager.create_new_state_from(source_state_id, self.temp_dir)
        
        # Verify new state was created
        new_path = os.path.join(self.temp_dir, new_state_id)
        self.assertTrue(os.path.exists(new_path))
        
        # Verify database was copied
        new_db = os.path.join(new_path, f"{new_state_id}.db")
        self.assertTrue(os.path.exists(new_db))
        
        # Verify database content
        conn = sqlite3.connect(new_db)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM test")
        results = cursor.fetchall()
        conn.close()
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0], (1, 'test_value'))
        
        # Verify rootstore.json was copied and updated
        new_json = os.path.join(new_path, "rootstore.json")
        self.assertTrue(os.path.exists(new_json))
        with open(new_json, 'r') as f:
            data = json.load(f)
        self.assertEqual(data['state_id'], new_state_id)
        self.assertEqual(data['userStore']['currentUser']['id'], '123')
    
    def test_filter_db_write_actions_no_changes(self):
        """Test filtering trajectory when there are no database changes."""
        # Create two identical states
        state1_path = os.path.join(self.temp_dir, "state1")
        state2_path = os.path.join(self.temp_dir, "state2")
        os.makedirs(state1_path, exist_ok=True)
        os.makedirs(state2_path, exist_ok=True)
        
        # Create identical databases
        for state_path, state_id in [(state1_path, "state1"), (state2_path, "state2")]:
            db_path = os.path.join(state_path, f"{state_id}.db")
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("CREATE TABLE items (id INTEGER, name TEXT)")
            cursor.execute("INSERT INTO items VALUES (1, 'Item A')")
            conn.commit()
            conn.close()
        
        # Filter trajectory
        filtered = self.manager.filter_db_write_actions([state1_path, state2_path])
        
        # Should be empty since no changes were made
        self.assertEqual(len(filtered), 0)
    
    def test_filter_db_write_actions_with_changes(self):
        """Test filtering trajectory when there are database changes."""
        # Create three states with different content
        states = []
        for i in range(3):
            state_id = f"state{i}"
            state_path = os.path.join(self.temp_dir, state_id)
            os.makedirs(state_path, exist_ok=True)
            
            db_path = os.path.join(state_path, f"{state_id}.db")
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("CREATE TABLE items (id INTEGER, name TEXT)")
            
            # Add increasing number of items
            for j in range(i + 1):
                cursor.execute(f"INSERT INTO items VALUES ({j}, 'Item {j}')")
            
            conn.commit()
            conn.close()
            states.append(state_path)
        
        # Filter trajectory
        filtered = self.manager.filter_db_write_actions(states)
        
        # Should keep state1 and state2 (changes from state0 and state1 respectively)
        self.assertEqual(len(filtered), 2)
        self.assertIn("state1", filtered[0])
        self.assertIn("state2", filtered[1])
    
    def test_filter_db_write_actions_table_changes(self):
        """Test filtering when table structure changes."""
        # Create two states with different tables
        state1_path = os.path.join(self.temp_dir, "state1")
        state2_path = os.path.join(self.temp_dir, "state2")
        os.makedirs(state1_path, exist_ok=True)
        os.makedirs(state2_path, exist_ok=True)
        
        # State 1: one table
        db1_path = os.path.join(state1_path, "state1.db")
        conn1 = sqlite3.connect(db1_path)
        cursor1 = conn1.cursor()
        cursor1.execute("CREATE TABLE items (id INTEGER)")
        conn1.commit()
        conn1.close()
        
        # State 2: two tables
        db2_path = os.path.join(state2_path, "state2.db")
        conn2 = sqlite3.connect(db2_path)
        cursor2 = conn2.cursor()
        cursor2.execute("CREATE TABLE items (id INTEGER)")
        cursor2.execute("CREATE TABLE users (id INTEGER)")
        conn2.commit()
        conn2.close()
        
        # Filter trajectory
        filtered = self.manager.filter_db_write_actions([state1_path, state2_path])
        
        # Should detect the table change
        self.assertEqual(len(filtered), 1)
        self.assertIn("state2", filtered[0])
    
    def test_state_ids_to_paths(self):
        """Test converting state IDs to full paths."""
        state_ids = ["session1", "session2", "session3"]
        
        paths = self.manager.state_ids_to_paths(state_ids)
        
        self.assertEqual(len(paths), 3)
        for i, path in enumerate(paths):
            expected_path = os.path.join(
                self.temp_dir,
                "com.test.app",
                "test-profile",
                "sessions",
                state_ids[i]
            )
            self.assertEqual(path, expected_path)
    
    def test_normalize_state_path_or_id_database_path(self):
        """Test normalizing when input is already a database path."""
        db_path = "/path/to/state.db"
        result = self.manager._normalize_state_path_or_id(db_path)
        self.assertEqual(result, db_path)
    
    def test_normalize_state_path_or_id_directory(self):
        """Test normalizing when input is a state directory."""
        state_dir = os.path.join(self.temp_dir, "state1")
        os.makedirs(state_dir, exist_ok=True)
        
        result = self.manager._normalize_state_path_or_id(state_dir)
        expected = os.path.join(state_dir, "state1.db")
        self.assertEqual(result, expected)
    
    def test_normalize_state_path_or_id_state_id(self):
        """Test normalizing when input is a state ID."""
        state_id = "session1"
        
        result = self.manager._normalize_state_path_or_id(state_id)
        
        expected = os.path.join(
            self.temp_dir,
            "com.test.app",
            "test-profile",
            "sessions",
            state_id,
            f"{state_id}.db"
        )
        self.assertEqual(result, expected)
    
    def test_filter_db_write_actions_empty_list(self):
        """Test filtering with empty state list."""
        filtered = self.manager.filter_db_write_actions([])
        self.assertEqual(len(filtered), 0)
    
    def test_filter_db_write_actions_single_state(self):
        """Test filtering with single state."""
        state_path = os.path.join(self.temp_dir, "state1")
        os.makedirs(state_path, exist_ok=True)
        
        db_path = os.path.join(state_path, "state1.db")
        conn = sqlite3.connect(db_path)
        conn.close()
        
        filtered = self.manager.filter_db_write_actions([state_path])
        self.assertEqual(len(filtered), 0)


if __name__ == '__main__':
    unittest.main()

