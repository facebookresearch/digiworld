# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for positioning_service module."""

import unittest
import sqlite3
import tempfile
import os
from datetime import datetime, timedelta
from digiworld.scenarios.positioning_service import PositioningService, PositioningConfig, Position


class TestPositioningService(unittest.TestCase):
    """Test cases for PositioningService."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test.db")
        
        # Create test database with emails
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE emails (
                id TEXT PRIMARY KEY,
                sender TEXT,
                receiver TEXT,
                subject TEXT,
                timestamp TEXT
            )
        """)
        
        # Insert emails with timestamps far in the past so positioning service has room
        base_time = datetime.now() - timedelta(days=30)  # Start 30 days ago
        for i in range(5):
            timestamp = (base_time - timedelta(days=i)).isoformat() + 'Z'
            cursor.execute(
                "INSERT INTO emails VALUES (?, ?, ?, ?, ?)",
                (f"email{i}", "sender@test.com", "user@test.com", f"Subject {i}", timestamp)
            )
        
        conn.commit()
        conn.close()
        
        # Create positioning config
        self.config = PositioningConfig(
            table_name='emails',
            timestamp_column='timestamp',
            filter_column='receiver',
            filter_pattern='%{user_email}%'
        )
        
        self.service = PositioningService(self.config)
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_get_positioned_timestamp_beginning(self):
        """Test generating timestamp at beginning (after latest)."""
        # Get all existing timestamps for comparison
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT timestamp FROM emails WHERE receiver LIKE ? ORDER BY timestamp DESC", 
                      ('%user@test.com%',))
        timestamps = [datetime.fromisoformat(row[0].replace('Z', '+00:00')) for row in cursor.fetchall()]
        conn.close()
        
        latest_timestamp = timestamps[0]  # Most recent
        
        # Generate positioned timestamp
        timestamp = self.service.get_positioned_timestamp(
            Position.beginning,
            self.db_path,
            'user@test.com'
        )
        
        # Should be a valid ISO timestamp
        self.assertTrue(timestamp.endswith('Z'))
        parsed = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        self.assertIsInstance(parsed, datetime)
        
        # Should be AFTER the latest (most recent) timestamp
        self.assertGreater(parsed, latest_timestamp,
                          f"Beginning timestamp {parsed} should be after latest {latest_timestamp}")
    
    def test_get_positioned_timestamp_middle(self):
        """Test generating timestamp in the middle."""
        # Get all existing timestamps for comparison
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT timestamp FROM emails WHERE receiver LIKE ? ORDER BY timestamp DESC", 
                      ('%user@test.com%',))
        timestamps = [datetime.fromisoformat(row[0].replace('Z', '+00:00')) for row in cursor.fetchall()]
        conn.close()
        
        latest_timestamp = timestamps[0]  # Most recent
        earliest_timestamp = timestamps[-1]  # Oldest
        
        # Generate positioned timestamp
        timestamp = self.service.get_positioned_timestamp(
            Position.middle,
            self.db_path,
            'user@test.com'
        )
        
        # Should be a valid ISO timestamp
        self.assertTrue(timestamp.endswith('Z'))
        parsed = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        self.assertIsInstance(parsed, datetime)
        
        # Should be BETWEEN earliest and latest
        self.assertGreater(parsed, earliest_timestamp,
                          f"Middle timestamp {parsed} should be after earliest {earliest_timestamp}")
        self.assertLess(parsed, latest_timestamp,
                       f"Middle timestamp {parsed} should be before latest {latest_timestamp}")
    
    def test_get_positioned_timestamp_end(self):
        """Test generating timestamp at end (before earliest)."""
        # Get all existing timestamps for comparison
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT timestamp FROM emails WHERE receiver LIKE ? ORDER BY timestamp DESC", 
                      ('%user@test.com%',))
        timestamps = [datetime.fromisoformat(row[0].replace('Z', '+00:00')) for row in cursor.fetchall()]
        conn.close()
        
        earliest_timestamp = timestamps[-1]  # Oldest
        
        # Generate positioned timestamp
        timestamp = self.service.get_positioned_timestamp(
            Position.end,
            self.db_path,
            'user@test.com'
        )
        
        # Should be a valid ISO timestamp
        self.assertTrue(timestamp.endswith('Z'))
        parsed = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        self.assertIsInstance(parsed, datetime)
        
        # Should be BEFORE the earliest (oldest) timestamp
        self.assertLess(parsed, earliest_timestamp,
                       f"End timestamp {parsed} should be before earliest {earliest_timestamp}")
    
    def test_insufficient_data(self):
        """Test behavior with insufficient data."""
        # Create database with only one email
        db_path = os.path.join(self.temp_dir, "sparse.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE emails (
                id TEXT PRIMARY KEY,
                sender TEXT,
                receiver TEXT,
                timestamp TEXT
            )
        """)
        
        cursor.execute(
            "INSERT INTO emails VALUES (?, ?, ?, ?)",
            ("email1", "sender@test.com", "user@test.com", datetime.now().isoformat() + 'Z')
        )
        
        conn.commit()
        conn.close()
        
        # Should handle gracefully or raise specific error
        # Implementation may vary - just check it doesn't crash
        try:
            timestamp = self.service.get_positioned_timestamp(
                Position.middle,
                db_path,
                'user@test.com'
            )
            # If it succeeds, timestamp should be valid
            self.assertTrue(timestamp.endswith('Z'))
        except ValueError:
            # Or it may raise an error, which is also acceptable
            pass
    
    def test_positioning_maintains_order(self):
        """Test that multiple positioned timestamps maintain correct order."""
        # Generate timestamps at all three positions
        beginning_ts = self.service.get_positioned_timestamp(
            Position.beginning, self.db_path, 'user@test.com'
        )
        middle_ts = self.service.get_positioned_timestamp(
            Position.middle, self.db_path, 'user@test.com'
        )
        end_ts = self.service.get_positioned_timestamp(
            Position.end, self.db_path, 'user@test.com'
        )
        
        # Parse timestamps
        beginning = datetime.fromisoformat(beginning_ts.replace('Z', '+00:00'))
        middle = datetime.fromisoformat(middle_ts.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_ts.replace('Z', '+00:00'))
        
        # Verify order: end < middle < beginning
        self.assertLess(end, middle, "End should be before middle")
        self.assertLess(middle, beginning, "Middle should be before beginning")
    
    def test_positioning_with_filter_pattern(self):
        """Test positioning with different filter patterns."""
        # Insert emails for a different user
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        base_time = datetime.now() - timedelta(days=20)
        for i in range(3):
            timestamp = (base_time - timedelta(days=i)).isoformat() + 'Z'
            cursor.execute(
                "INSERT INTO emails VALUES (?, ?, ?, ?, ?)",
                (f"email_other_{i}", "sender@test.com", "other@test.com", 
                 f"Subject Other {i}", timestamp)
            )
        
        conn.commit()
        conn.close()
        
        # Test positioning for the other user
        timestamp = self.service.get_positioned_timestamp(
            Position.middle,
            self.db_path,
            'other@test.com'
        )
        
        # Should be a valid timestamp
        self.assertTrue(timestamp.endswith('Z'))
        parsed = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        
        # Verify it's positioned relative to other user's emails
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT timestamp FROM emails WHERE receiver LIKE ? ORDER BY timestamp DESC",
                      ('%other@test.com%',))
        other_timestamps = [datetime.fromisoformat(row[0].replace('Z', '+00:00')) 
                           for row in cursor.fetchall()]
        conn.close()
        
        # Should be between first and last of other user's emails
        self.assertGreater(parsed, other_timestamps[-1])
        self.assertLess(parsed, other_timestamps[0])
    
    def test_positioning_with_no_matching_data(self):
        """Test positioning when no data matches the filter."""
        # Try to get positioned timestamp for user with no emails
        with self.assertRaises((ValueError, Exception)):
            self.service.get_positioned_timestamp(
                Position.middle,
                self.db_path,
                'nonexistent@test.com'
            )
    
    def test_timestamp_spacing(self):
        """Test that positioned timestamps are correctly placed between specific indices."""
        # Get existing timestamps in ascending order (as stored in DB)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT timestamp FROM emails WHERE receiver LIKE ? ORDER BY timestamp ASC",
                      ('%user@test.com%',))
        existing = [datetime.fromisoformat(row[0].replace('Z', '+00:00')) 
                   for row in cursor.fetchall()]
        conn.close()
        
        # Generate a middle timestamp
        middle_ts = self.service.get_positioned_timestamp(
            Position.middle, self.db_path, 'user@test.com'
        )
        middle = datetime.fromisoformat(middle_ts.replace('Z', '+00:00'))
        
        # Middle positioning places timestamp between timestamps[middle_idx-1] and timestamps[middle_idx]
        # For 5 timestamps, middle_idx = 2, so it positions between indices 1 and 2
        middle_idx = len(existing) // 2
        before_ts = existing[middle_idx - 1]
        after_ts = existing[middle_idx]
        
        # Verify the positioned timestamp is strictly between the two target timestamps
        self.assertGreater(middle, before_ts, 
                          f"Middle timestamp {middle} should be after {before_ts}")
        self.assertLess(middle, after_ts,
                       f"Middle timestamp {middle} should be before {after_ts}")


if __name__ == '__main__':
    unittest.main()

