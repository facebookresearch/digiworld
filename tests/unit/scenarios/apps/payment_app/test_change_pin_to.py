# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for ChangePinToScenario."""

import unittest
import sqlite3
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.payment.change_pin_to.scenario import ChangePinToScenario
from digiworld.scenarios.tests.scenarios.test_helpers import (
    mock_compare_database_records,
    create_payment_schema,
    insert_test_user
)


class TestChangePinToScenario(unittest.TestCase):
    """Test cases for ChangePinToScenario."""
    
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
        scenario = ChangePinToScenario.__new__(ChangePinToScenario)
        
        # Set scenario attributes
        scenario.current_user_id = '1'
        scenario.pin = '9876'
        scenario.initial_state_path = self.initial_state_dir
        
        # Mock the compare_database_records method
        scenario.compare_database_records = lambda initial, final, query, params: \
            mock_compare_database_records(initial, final, query, params)
        
        return scenario
    
    def _create_initial_state_database(self):
        """Create initial state WITH old PIN."""
        conn = sqlite3.connect(self.initial_db)
        create_payment_schema(conn)
        cursor = conn.cursor()
        
        # Insert test user with old PIN
        cursor.execute("""
            INSERT INTO users (id, email, password, pin, first_name, last_name, 
                              phone_number, created_at, updated_at)
            VALUES (1, 'test@example.com', 'hashed', '1234', 'Test', 'User', 
                    '+1234567890', datetime('now'), datetime('now'))
        """)
        
        conn.commit()
        conn.close()
    
    def _create_final_state_database(self):
        """Create final state WITH new PIN."""
        conn = sqlite3.connect(self.final_db)
        create_payment_schema(conn)
        cursor = conn.cursor()
        
        # Insert test user with NEW PIN
        cursor.execute("""
            INSERT INTO users (id, email, password, pin, first_name, last_name, 
                              phone_number, created_at, updated_at)
            VALUES (1, 'test@example.com', 'hashed', '9876', 'Test', 'User', 
                    '+1234567890', datetime('now'), datetime('now'))
        """)
        
        conn.commit()
        conn.close()
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task correctly."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when PIN is changed")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete with old PIN")
    
    def test_wrong_pin_not_completed(self):
        """Test that wrong PIN doesn't count as completion."""
        # Change scenario to look for different PIN
        self.scenario.pin = '5555'
        
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertFalse(result, "Should not recognize task as completed with wrong PIN")


if __name__ == '__main__':
    unittest.main()

