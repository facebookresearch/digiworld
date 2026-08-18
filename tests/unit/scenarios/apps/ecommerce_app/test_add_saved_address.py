# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for AddSavedAddressScenario."""

import unittest
import sqlite3
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.ecommerce.add_saved_address.scenario import AddSavedAddressScenario
from digiworld.scenarios.tests.scenarios.test_helpers import (
    mock_compare_database_records,
    create_ecommerce_schema,
    insert_test_ecommerce_user
)


class TestAddSavedAddressScenario(unittest.TestCase):
    """Test cases for AddSavedAddressScenario."""
    
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
        scenario = AddSavedAddressScenario.__new__(AddSavedAddressScenario)
        
        # Set scenario attributes
        scenario.current_user_id = '1'
        scenario.first_name = 'John'
        scenario.last_name = 'Doe'
        scenario.address_line_1 = '123 Main St'
        scenario.city = 'Springfield'
        scenario.state = 'IL'
        scenario.postal_code = '62701'
        scenario.country = 'USA'
        scenario.phone_number = '555-123-4567'
        scenario.initial_state_path = self.initial_state_dir
        
        # Mock the compare_database_records method
        scenario.compare_database_records = lambda initial, final, query, params: \
            mock_compare_database_records(initial, final, query, params)
        
        return scenario
    
    def _create_initial_state_database(self):
        """Create initial state WITHOUT the new address."""
        conn = sqlite3.connect(self.initial_db)
        create_ecommerce_schema(conn)
        cursor = conn.cursor()
        
        # Insert test user
        insert_test_ecommerce_user(cursor, 1, 'test@example.com')
        
        # Add one existing address
        cursor.execute("""
            INSERT INTO addresses (id, user_id, full_name, street, city, state, pincode, country, phone)
            VALUES (1, 1, 'Jane Doe', '456 Oak St', 'Chicago', 'IL', '60601', 'USA', '555-987-6543')
        """)
        
        conn.commit()
        conn.close()
    
    def _create_final_state_database(self):
        """Create final state WITH the new address."""
        conn = sqlite3.connect(self.final_db)
        create_ecommerce_schema(conn)
        cursor = conn.cursor()
        
        # Insert test user
        insert_test_ecommerce_user(cursor, 1, 'test@example.com')
        
        # Add existing address
        cursor.execute("""
            INSERT INTO addresses (id, user_id, full_name, street, city, state, pincode, country, phone)
            VALUES (1, 1, 'Jane Doe', '456 Oak St', 'Chicago', 'IL', '60601', 'USA', '555-987-6543')
        """)
        
        # Add the NEW address
        cursor.execute("""
            INSERT INTO addresses (id, user_id, full_name, street, city, state, pincode, country, phone)
            VALUES (2, 1, 'John Doe', '123 Main St', 'Springfield', 'IL', '62701', 'USA', '5551234567')
        """)
        
        conn.commit()
        conn.close()
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task correctly."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when address is added")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete without new address")


if __name__ == '__main__':
    unittest.main()

