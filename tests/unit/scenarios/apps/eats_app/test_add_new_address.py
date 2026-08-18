# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for AddNewAddressScenario."""

import unittest
import sqlite3
import tempfile
import os
import shutil
from digiworld.scenarios.scenarios.eats.add_new_address.scenario import AddNewAddressScenario
from digiworld.scenarios.tests.scenarios.test_helpers import (
    mock_compare_database_records,
    create_eats_schema,
    insert_test_eats_user
)


class TestAddNewAddressScenario(unittest.TestCase):
    """Test cases for AddNewAddressScenario."""
    
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
        scenario = AddNewAddressScenario.__new__(AddNewAddressScenario)
        
        # Set scenario attributes
        scenario.current_user_id = '1'
        scenario.label = 'Home'
        scenario.address_line1 = '789 Elm St'
        scenario.address_line2 = 'Apt 4B'
        scenario.city = 'Portland'
        scenario.state = 'OR'
        scenario.postcode = '97201'
        scenario.country = 'USA'
        scenario.initial_state_path = self.initial_state_dir
        
        # Mock the compare_database_records method
        scenario.compare_database_records = lambda initial, final, query, params: \
            mock_compare_database_records(initial, final, query, params)
        
        return scenario
    
    def _create_initial_state_database(self):
        """Create initial state WITHOUT the new address."""
        conn = sqlite3.connect(self.initial_db)
        create_eats_schema(conn)
        cursor = conn.cursor()
        
        # Insert test user
        insert_test_eats_user(cursor, 1, 'test@example.com')
        
        # Add one existing address
        cursor.execute("""
            INSERT INTO user_addresses (id, user_id, label, address_line_1, city, 
                                       state, postal_code, country, is_default, 
                                       created_at, updated_at)
            VALUES (1, 1, 'Work', '100 Business Blvd', 'Portland', 'OR', '97204', 
                    'USA', 0, datetime('now'), datetime('now'))
        """)
        
        conn.commit()
        conn.close()
    
    def _create_final_state_database(self):
        """Create final state WITH the new address."""
        conn = sqlite3.connect(self.final_db)
        create_eats_schema(conn)
        cursor = conn.cursor()
        
        # Insert test user
        insert_test_eats_user(cursor, 1, 'test@example.com')
        
        # Add existing address
        cursor.execute("""
            INSERT INTO user_addresses (id, user_id, label, address_line_1, city, 
                                       state, postal_code, country, is_default, 
                                       created_at, updated_at)
            VALUES (1, 1, 'Work', '100 Business Blvd', 'Portland', 'OR', '97204', 
                    'USA', 0, datetime('now'), datetime('now'))
        """)
        
        # Add the NEW address
        cursor.execute("""
            INSERT INTO user_addresses (id, user_id, label, address_line_1, address_line_2,
                                       city, state, postal_code, country, is_default, 
                                       created_at, updated_at)
            VALUES (2, 1, 'Home', '789 Elm St', 'Apt 4B', 'Portland', 'OR', '97201', 
                    'USA', 0, datetime('now'), datetime('now'))
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

