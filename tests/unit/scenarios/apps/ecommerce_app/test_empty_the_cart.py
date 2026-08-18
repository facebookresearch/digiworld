# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for EmptyTheCartScenario."""

import unittest
import sqlite3
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.ecommerce.empty_the_cart.scenario import EmptyTheCartScenario
from digiworld.scenarios.tests.scenarios.test_helpers import (
    mock_compare_database_records,
    create_ecommerce_schema,
    insert_test_ecommerce_user
)


class TestEmptyTheCartScenario(unittest.TestCase):
    """Test cases for EmptyTheCartScenario."""
    
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
        scenario = EmptyTheCartScenario.__new__(EmptyTheCartScenario)
        
        # Set scenario attributes
        scenario.current_user_id = '1'
        scenario.initial_state_path = self.initial_state_dir
        
        # Mock the compare_database_records method
        scenario.compare_database_records = lambda initial, final, query, params: \
            mock_compare_database_records(initial, final, query, params)
        
        return scenario
    
    def _create_initial_state_database(self):
        """Create initial state WITH cart items."""
        conn = sqlite3.connect(self.initial_db)
        create_ecommerce_schema(conn)
        cursor = conn.cursor()
        
        # Insert test user
        insert_test_ecommerce_user(cursor, 1, 'test@example.com')
        
        # Create a cart for the user
        cursor.execute("""
            INSERT INTO carts (id, user_id)
            VALUES (1, 1)
        """)
        
        # Add cart items
        cursor.execute("""
            INSERT INTO cart_items (id, cart_id, user_id, product_id, 
                                   product_name, product_image, short_description,
                                   seller, quantity, price, discounted_price, total)
            VALUES (1, 1, 1, 100, 'Product 1', 'img1.jpg', 'Description', 
                    'Seller 1', 2, 10.0, 8.0, 16.0)
        """)
        
        cursor.execute("""
            INSERT INTO cart_items (id, cart_id, user_id, product_id, 
                                   product_name, product_image, short_description,
                                   seller, quantity, price, discounted_price, total)
            VALUES (2, 1, 1, 101, 'Product 2', 'img2.jpg', 'Description', 
                    'Seller 2', 1, 20.0, 18.0, 18.0)
        """)
        
        conn.commit()
        conn.close()
    
    def _create_final_state_database(self):
        """Create final state WITHOUT cart items (empty cart)."""
        conn = sqlite3.connect(self.final_db)
        create_ecommerce_schema(conn)
        cursor = conn.cursor()
        
        # Insert test user
        insert_test_ecommerce_user(cursor, 1, 'test@example.com')
        
        # Create a cart for the user (but no items)
        cursor.execute("""
            INSERT INTO carts (id, user_id)
            VALUES (1, 1)
        """)
        
        # NO cart items - cart is empty
        
        conn.commit()
        conn.close()
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task correctly."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when cart is emptied")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete with items in cart")


if __name__ == '__main__':
    unittest.main()

