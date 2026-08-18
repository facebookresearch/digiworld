# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Integration tests for scenario functionality."""

import unittest
import json
import tempfile
import os
import sqlite3
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from digiworld.scenarios.scenario_base import Scenario
from digiworld.scenarios.config_loader import ConfigLoader
from digiworld.scenarios.state_manager import StateManager
from digiworld.scenarios.context_extractor import ContextExtractor
from digiworld.scenarios.template_resolver import TemplateResolver


class IntegrationTestScenario(Scenario):
    """Concrete scenario implementation for integration testing."""
    
    def verify_trajectory(self, state_paths):
        """Simple verification that checks if state paths exist."""
        if not state_paths:
            return {'task_completed': 0.0}
        
        all_exist = all(os.path.exists(path) for path in state_paths)
        return {
            'task_completed': 1.0 if all_exist else 0.0,
        }


class TestScenarioIntegration(unittest.TestCase):
    """Integration tests for complete scenario workflows."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self._setup_test_environment()
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _setup_test_environment(self):
        """Create a complete test environment with configs and database."""
        # Create app directory structure
        app_dir = Path(self.temp_dir) / "scenarios" / "test_app"
        scenario_dir = app_dir / "test_scenario"
        scenario_dir.mkdir(parents=True, exist_ok=True)
        
        # Create app_config.json
        app_config = {
            "apk_name": "com.test.app",
            "bundle_id": "com.test.app",
            "compatible_profiles": ["test-profile-1", "test-profile-2"]
        }
        with open(app_dir / "app_config.json", 'w') as f:
            json.dump(app_config, f)
        
        # Create scenario_config.json
        scenario_config = {
            "task_name": "Test Task",
            "app_name": "test_app",
            "scenario_class": "IntegrationTestScenario",
            "context_fields": ["current_user_email", "current_user_id"]
        }
        with open(scenario_dir / "scenario_config.json", 'w') as f:
            json.dump(scenario_config, f)
        
        # Create scenario.py (dummy file)
        with open(scenario_dir / "scenario.py", 'w') as f:
            f.write("# Scenario implementation")
        
        # Store paths for later use
        self.app_dir = app_dir
        self.scenario_dir = scenario_dir
        self.scenario_file = scenario_dir / "scenario.py"
    
    def _create_test_database(self, db_path):
        """Create a test database with sample data."""
        conn = sqlite3.connect(db_path)
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
                user_id TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        cursor.execute("INSERT INTO users VALUES ('1', 'user1@test.com', 'User One')")
        cursor.execute("INSERT INTO users VALUES ('2', 'user2@test.com', 'User Two')")
        cursor.execute("INSERT INTO items VALUES (1, 'Item A', '1')")
        cursor.execute("INSERT INTO items VALUES (2, 'Item B', '1')")
        
        conn.commit()
        conn.close()
    
    def _create_rootstore_json(self, json_path, user_id='1', email='user1@test.com'):
        """Create a test rootstore.json file."""
        data = {
            'userStore': {
                'currentUser': {
                    'id': user_id,
                    'email': email
                }
            }
        }
        with open(json_path, 'w') as f:
            json.dump(data, f)
    
    def test_config_loading_workflow(self):
        """Test complete configuration loading workflow."""
        with patch('inspect.getfile', return_value=str(self.scenario_file)):
            scenario = IntegrationTestScenario(base_path=self.temp_dir)
            
            # Verify app config was loaded
            self.assertEqual(scenario.apk_name, "com.test.app")
            self.assertIn("test-profile-1", scenario.compatible_profiles)
            
            # Verify scenario config was loaded
            self.assertEqual(scenario.task_name, "Test Task")
            self.assertEqual(scenario.app_name, "test_app")
    
    def test_state_management_workflow(self):
        """Test state creation and management workflow."""
        # Create initial state
        state_id = "initial_state"
        state_path = os.path.join(self.temp_dir, state_id)
        os.makedirs(state_path, exist_ok=True)
        
        # Create database
        db_path = os.path.join(state_path, f"{state_id}.db")
        self._create_test_database(db_path)
        
        # Create rootstore
        json_path = os.path.join(state_path, "rootstore.json")
        self._create_rootstore_json(json_path)
        
        # Initialize scenario with mocked config loading
        with patch('inspect.getfile', return_value=str(self.scenario_file)):
            scenario = IntegrationTestScenario(base_path=self.temp_dir)
            scenario.apk_name = "com.test.app"
            scenario.profile_name = "test-profile-1"
        
        # Create new state from initial state
        new_state_id = scenario.create_new_state_from(state_id)
        
        # Verify new state exists
        new_state_path = os.path.join(self.temp_dir, new_state_id)
        self.assertTrue(os.path.exists(new_state_path))
        
        # Verify database was copied
        new_db_path = os.path.join(new_state_path, f"{new_state_id}.db")
        self.assertTrue(os.path.exists(new_db_path))
        
        # Verify data integrity
        conn = sqlite3.connect(new_db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        conn.close()
        
        self.assertEqual(user_count, 2)
    
    def test_context_extraction_workflow(self):
        """Test context extraction and template resolution workflow."""
        # Create test database and rootstore
        db_path = os.path.join(self.temp_dir, "test.db")
        self._create_test_database(db_path)
        
        json_dir = Path(db_path).parent
        json_path = json_dir / "rootstore.json"
        self._create_rootstore_json(json_path)
        
        # Initialize scenario
        with patch('inspect.getfile', return_value=str(self.scenario_file)):
            scenario = IntegrationTestScenario(base_path=self.temp_dir)
        
        # Extract context
        user_id, email = scenario._get_current_user_info(str(json_path))
        
        self.assertEqual(user_id, '1')
        self.assertEqual(email, 'user1@test.com')
        
        # Test template resolution with extracted context
        user_context = {
            'current_user_email': email,
            'current_user_id': user_id
        }
        
        resolver = TemplateResolver(user_context)
        
        # Test individual template resolution
        user_id_resolved = resolver.resolve("{{current_user_id}}")
        email_resolved = resolver.resolve("{{current_user_email}}")
        
        self.assertEqual(user_id_resolved, '1')
        self.assertEqual(email_resolved, 'user1@test.com')
        
        # Test object with templates
        template_obj = {
            "user_id": "{{current_user_id}}",
            "email": "{{current_user_email}}"
        }
        resolved_obj = resolver.resolve_object(template_obj)
        
        self.assertEqual(resolved_obj['user_id'], '1')
        self.assertEqual(resolved_obj['email'], 'user1@test.com')
    
    def test_database_comparison_workflow(self):
        """Test database comparison between states."""
        # Create two states with different data
        state1_path = os.path.join(self.temp_dir, "state1")
        state2_path = os.path.join(self.temp_dir, "state2")
        os.makedirs(state1_path, exist_ok=True)
        os.makedirs(state2_path, exist_ok=True)
        
        # Create state 1 database
        db1_path = os.path.join(state1_path, "state1.db")
        conn1 = sqlite3.connect(db1_path)
        cursor1 = conn1.cursor()
        cursor1.execute("CREATE TABLE items (id INTEGER, name TEXT)")
        cursor1.execute("INSERT INTO items VALUES (1, 'Item A')")
        cursor1.execute("INSERT INTO items VALUES (2, 'Item B')")
        conn1.commit()
        conn1.close()
        
        # Create state 2 database with additional item
        db2_path = os.path.join(state2_path, "state2.db")
        conn2 = sqlite3.connect(db2_path)
        cursor2 = conn2.cursor()
        cursor2.execute("CREATE TABLE items (id INTEGER, name TEXT)")
        cursor2.execute("INSERT INTO items VALUES (1, 'Item A')")
        cursor2.execute("INSERT INTO items VALUES (2, 'Item B')")
        cursor2.execute("INSERT INTO items VALUES (3, 'Item C')")
        conn2.commit()
        conn2.close()
        
        # Initialize scenario
        with patch('inspect.getfile', return_value=str(self.scenario_file)):
            scenario = IntegrationTestScenario(base_path=self.temp_dir)
            scenario.apk_name = "com.test.app"
            scenario.profile_name = "test-profile"
        
        # Compare databases
        initial, current, new = scenario.compare_database_records(
            db1_path, db2_path,
            "SELECT * FROM items", ()
        )
        
        self.assertEqual(len(initial), 2)
        self.assertEqual(len(current), 3)
        self.assertEqual(len(new), 1)
        
        # Verify new item is Item C
        new_item = list(new)[0]
        self.assertEqual(new_item[0], 3)
        self.assertEqual(new_item[1], 'Item C')
    
    def test_trajectory_filtering_workflow(self):
        """Test filtering trajectory to keep only write actions."""
        # Create a series of states with some identical
        states = []
        for i in range(5):
            state_id = f"state{i}"
            state_path = os.path.join(self.temp_dir, state_id)
            os.makedirs(state_path, exist_ok=True)
            
            db_path = os.path.join(state_path, f"{state_id}.db")
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("CREATE TABLE items (id INTEGER, name TEXT)")
            
            # States 0, 2, 4 have changes; 1, 3 are identical to previous
            if i == 0:
                cursor.execute("INSERT INTO items VALUES (1, 'Item A')")
            elif i == 1:
                # Same as state 0
                cursor.execute("INSERT INTO items VALUES (1, 'Item A')")
            elif i == 2:
                # Add new item
                cursor.execute("INSERT INTO items VALUES (1, 'Item A')")
                cursor.execute("INSERT INTO items VALUES (2, 'Item B')")
            elif i == 3:
                # Same as state 2
                cursor.execute("INSERT INTO items VALUES (1, 'Item A')")
                cursor.execute("INSERT INTO items VALUES (2, 'Item B')")
            else:  # i == 4
                # Add new item
                cursor.execute("INSERT INTO items VALUES (1, 'Item A')")
                cursor.execute("INSERT INTO items VALUES (2, 'Item B')")
                cursor.execute("INSERT INTO items VALUES (3, 'Item C')")
            
            conn.commit()
            conn.close()
            states.append(state_path)
        
        # Initialize scenario
        with patch('inspect.getfile', return_value=str(self.scenario_file)):
            scenario = IntegrationTestScenario(base_path=self.temp_dir)
            scenario.apk_name = "com.test.app"
            scenario.profile_name = "test-profile"
        
        # Filter trajectory
        filtered = scenario.filter_db_write_actions(states)
        
        # Should keep states 2 and 4 (states 1 and 3 are identical to previous)
        self.assertEqual(len(filtered), 2)
        self.assertIn("state2", filtered[0])
        self.assertIn("state4", filtered[1])
    
    def test_verification_workflow(self):
        """Test trajectory verification workflow."""
        # Create test states
        states = []
        for i in range(3):
            state_path = os.path.join(self.temp_dir, f"state{i}")
            os.makedirs(state_path, exist_ok=True)
            states.append(state_path)
        
        # Initialize scenario
        with patch('inspect.getfile', return_value=str(self.scenario_file)):
            scenario = IntegrationTestScenario(base_path=self.temp_dir)
        
        # Verify trajectory
        metrics = scenario.verify_trajectory(states)
        
        self.assertIn('task_completed', metrics)
        self.assertEqual(metrics['task_completed'], 1.0)
    
    def test_instance_config_integration(self):
        """Test loading and applying instance configurations."""
        # Create instance configuration
        instances_path = self.scenario_dir / "instances" / "test_instance"
        instances_path.mkdir(parents=True, exist_ok=True)
        
        instance_config = {
            "parameters": {
                "recipient": "test@example.com",
                "amount": "100"
            },
            "compatible_profiles": ["test-profile-1"],
            "target_trajectory_ids": ["state1", "state2"],
            "additional_mockdata": False
        }
        
        with open(instances_path / "instance_config.json", 'w') as f:
            json.dump(instance_config, f)
        
        # Initialize scenario with instance tag
        with patch('inspect.getfile', return_value=str(self.scenario_file)):
            scenario = IntegrationTestScenario(
                base_path=self.temp_dir,
                instance_tag="test_instance"
            )
        
        # Verify instance config was applied
        self.assertEqual(scenario.recipient, "test@example.com")
        self.assertEqual(scenario.amount, "100")
        self.assertEqual(scenario.target_trajectory_ids, ["state1", "state2"])
        self.assertEqual(scenario.compatible_profiles, ["test-profile-1"])


if __name__ == '__main__':
    unittest.main()

