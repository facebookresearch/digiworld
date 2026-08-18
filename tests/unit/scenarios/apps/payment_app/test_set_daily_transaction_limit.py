# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for SetDailyTransactionLimitScenario."""

import unittest
import sqlite3
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.payment.set_daily_transaction_limit.scenario import SetDailyTransactionLimitScenario
from digiworld.scenarios.tests.scenarios.test_helpers import (
    mock_compare_database_records,
    create_payment_schema
)


class TestSetDailyTransactionLimitScenario(unittest.TestCase):
    """Test cases for SetDailyTransactionLimitScenario."""
    
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
        scenario = SetDailyTransactionLimitScenario.__new__(SetDailyTransactionLimitScenario)
        
        # Set scenario attributes
        scenario.current_user_id = '1'
        scenario.amount = '$5000'
        scenario.initial_state_path = self.initial_state_dir
        
        # Mock the compare_database_records method
        scenario.compare_database_records = lambda initial, final, query, params: \
            mock_compare_database_records(initial, final, query, params)
        
        return scenario
    
    def _create_initial_state_database(self):
        """Create initial state WITH old daily limit."""
        conn = sqlite3.connect(self.initial_db)
        create_payment_schema(conn)
        cursor = conn.cursor()
        
        # Insert test user with old daily limit
        cursor.execute("""
            INSERT INTO users (id, email, password, pin, first_name, last_name, 
                              phone_number, created_at, updated_at, daily_limit)
            VALUES (1, 'test@example.com', 'hashed', '1234', 'Test', 'User', 
                    '+1234567890', datetime('now'), datetime('now'), 1000.0)
        """)
        
        conn.commit()
        conn.close()
    
    def _create_final_state_database(self):
        """Create final state WITH new daily limit."""
        conn = sqlite3.connect(self.final_db)
        create_payment_schema(conn)
        cursor = conn.cursor()
        
        # Insert test user with NEW daily limit
        cursor.execute("""
            INSERT INTO users (id, email, password, pin, first_name, last_name, 
                              phone_number, created_at, updated_at, daily_limit)
            VALUES (1, 'test@example.com', 'hashed', '1234', 'Test', 'User', 
                    '+1234567890', datetime('now'), datetime('now'), 5000.0)
        """)
        
        conn.commit()
        conn.close()
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task correctly."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when daily limit is set")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete with old limit")
    
    def test_wrong_amount_not_completed(self):
        """Test that wrong amount doesn't count as completion."""
        # Change scenario to look for different amount
        self.scenario.amount = '$10000'
        
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertFalse(result, "Should not recognize task as completed with wrong amount")


if __name__ == '__main__':
    unittest.main()

