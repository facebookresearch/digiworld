# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for SendPaymentToNicknameScenario."""

import unittest
import sqlite3
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.payment.send_payment_to_nickname.scenario import SendPaymentToNicknameScenario
from digiworld.scenarios.tests.scenarios.test_helpers import (
    mock_compare_database_records,
    create_payment_schema
)


class TestSendPaymentToNicknameScenario(unittest.TestCase):
    """Test cases for SendPaymentToNicknameScenario."""
    
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
        scenario = SendPaymentToNicknameScenario.__new__(SendPaymentToNicknameScenario)
        
        # Set scenario attributes
        scenario.current_user_id = '1'
        scenario.nickname = 'BestFriend'
        scenario.amount = '50.00'
        scenario.initial_state_path = self.initial_state_dir
        
        # Mock the compare_database_records method
        scenario.compare_database_records = lambda initial, final, query, params: \
            mock_compare_database_records(initial, final, query, params)
        
        return scenario
    
    def _create_initial_state_database(self):
        """Create initial state WITHOUT the target transaction."""
        conn = sqlite3.connect(self.initial_db)
        create_payment_schema(conn)
        cursor = conn.cursor()
        
        # Insert users
        cursor.execute("""
            INSERT INTO users (id, email, password, pin, first_name, last_name, 
                              phone_number, created_at, updated_at)
            VALUES (1, 'user1@test.com', 'hashed', '1234', 'User', 'One', 
                    '+1111111111', datetime('now'), datetime('now'))
        """)
        
        cursor.execute("""
            INSERT INTO users (id, email, password, pin, first_name, last_name, 
                              phone_number, created_at, updated_at)
            VALUES (2, 'user2@test.com', 'hashed', '1234', 'User', 'Two', 
                    '+2222222222', datetime('now'), datetime('now'))
        """)
        
        # Create wallets
        cursor.execute("""
            INSERT INTO wallets (id, user_id, balance, created_at, updated_at)
            VALUES (1, 1, 1000.0, datetime('now'), datetime('now'))
        """)
        
        cursor.execute("""
            INSERT INTO wallets (id, user_id, balance, created_at, updated_at)
            VALUES (2, 2, 500.0, datetime('now'), datetime('now'))
        """)
        
        # Create contact relationship
        cursor.execute("""
            INSERT INTO contacts (id, user_id, contact_user_id, nickname, created_at, updated_at)
            VALUES (1, 1, 2, 'BestFriend', datetime('now'), datetime('now'))
        """)
        
        # Add some existing transactions (not the target one)
        cursor.execute("""
            INSERT INTO transactions (id, sender_wallet_id, receiver_wallet_id, amount, 
                                     status, type, created_at, updated_at)
            VALUES (1, 1, 2, 25.00, 'completed', 'transfer', 
                    datetime('now', '-1 day'), datetime('now', '-1 day'))
        """)
        
        conn.commit()
        conn.close()
    
    def _create_final_state_database(self):
        """Create final state WITH the target transaction."""
        conn = sqlite3.connect(self.final_db)
        create_payment_schema(conn)
        cursor = conn.cursor()
        
        # Insert users
        cursor.execute("""
            INSERT INTO users (id, email, password, pin, first_name, last_name, 
                              phone_number, created_at, updated_at)
            VALUES (1, 'user1@test.com', 'hashed', '1234', 'User', 'One', 
                    '+1111111111', datetime('now'), datetime('now'))
        """)
        
        cursor.execute("""
            INSERT INTO users (id, email, password, pin, first_name, last_name, 
                              phone_number, created_at, updated_at)
            VALUES (2, 'user2@test.com', 'hashed', '1234', 'User', 'Two', 
                    '+2222222222', datetime('now'), datetime('now'))
        """)
        
        # Create wallets
        cursor.execute("""
            INSERT INTO wallets (id, user_id, balance, created_at, updated_at)
            VALUES (1, 1, 1000.0, datetime('now'), datetime('now'))
        """)
        
        cursor.execute("""
            INSERT INTO wallets (id, user_id, balance, created_at, updated_at)
            VALUES (2, 2, 500.0, datetime('now'), datetime('now'))
        """)
        
        # Create contact relationship
        cursor.execute("""
            INSERT INTO contacts (id, user_id, contact_user_id, nickname, created_at, updated_at)
            VALUES (1, 1, 2, 'BestFriend', datetime('now'), datetime('now'))
        """)
        
        # Add existing transactions
        cursor.execute("""
            INSERT INTO transactions (id, sender_wallet_id, receiver_wallet_id, amount, 
                                     status, type, created_at, updated_at)
            VALUES (1, 1, 2, 25.00, 'completed', 'transfer', 
                    datetime('now', '-1 day'), datetime('now', '-1 day'))
        """)
        
        # Add the NEW target transaction
        cursor.execute("""
            INSERT INTO transactions (id, sender_wallet_id, receiver_wallet_id, amount, 
                                     status, type, created_at, updated_at)
            VALUES (2, 1, 2, 50.00, 'completed', 'transfer', 
                    datetime('now'), datetime('now'))
        """)
        
        conn.commit()
        conn.close()
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task correctly."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when payment sent")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete without target transaction")
    
    def test_wrong_amount_not_completed(self):
        """Test that payment with wrong amount doesn't count as completion."""
        self.scenario.amount = '100.00'
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertFalse(result, "Should not recognize task as completed with wrong amount")
    
    def test_wrong_nickname_not_completed(self):
        """Test that payment to wrong contact doesn't count as completion."""
        self.scenario.nickname = 'OtherFriend'
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertFalse(result, "Should not recognize task as completed with wrong nickname")


if __name__ == '__main__':
    unittest.main()

