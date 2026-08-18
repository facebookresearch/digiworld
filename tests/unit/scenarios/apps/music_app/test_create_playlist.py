# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for CreatePlaylistScenario."""

import unittest
import sqlite3
import tempfile
import os
import shutil
from unittest.mock import Mock
from digiworld.scenarios.scenarios.music.create_playlist.scenario import CreatePlaylistScenario
from digiworld.scenarios.tests.scenarios.test_helpers import (
    mock_compare_database_records,
    create_music_schema,
    insert_test_music_user
)


class TestCreatePlaylistScenario(unittest.TestCase):
    """Test cases for CreatePlaylistScenario."""
    
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
        scenario = CreatePlaylistScenario.__new__(CreatePlaylistScenario)
        
        # Set scenario attributes that _check_task_completion needs
        scenario.current_user_id = '1'
        scenario.name = 'My Awesome Playlist'
        scenario.initial_state_path = self.initial_state_dir
        
        # Mock the compare_database_records method
        scenario.compare_database_records = lambda initial, final, query, params: \
            mock_compare_database_records(initial, final, query, params)
        
        return scenario
    
    def _create_initial_state_database(self):
        """Create initial state WITHOUT the target playlist."""
        conn = sqlite3.connect(self.initial_db)
        create_music_schema(conn)
        cursor = conn.cursor()
        
        # Insert test user
        insert_test_music_user(cursor, 1, 'test@example.com', 'testuser')
        
        # Add some existing playlists (but not the target one)
        cursor.execute("""
            INSERT INTO playlists (id, name, user_id, categories, song_ids)
            VALUES (1, 'Old Playlist', 1, '["rock"]', '[]')
        """)
        
        conn.commit()
        conn.close()
    
    def _create_final_state_database(self):
        """Create final state WITH the target playlist."""
        conn = sqlite3.connect(self.final_db)
        create_music_schema(conn)
        cursor = conn.cursor()
        
        # Insert test user
        insert_test_music_user(cursor, 1, 'test@example.com', 'testuser')
        
        # Add existing playlists
        cursor.execute("""
            INSERT INTO playlists (id, name, user_id, categories, song_ids)
            VALUES (1, 'Old Playlist', 1, '["rock"]', '[]')
        """)
        
        # Add the NEW target playlist
        cursor.execute("""
            INSERT INTO playlists (id, name, user_id, categories, song_ids, created_at)
            VALUES (2, 'My Awesome Playlist', 1, '[]', '[]', datetime('now'))
        """)
        
        conn.commit()
        conn.close()
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task correctly."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when target playlist exists")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete in initial state")
    
    def test_wrong_playlist_name_not_completed(self):
        """Test that playlist with wrong name doesn't count as completion."""
        # Change scenario to look for different playlist name
        self.scenario.name = 'Different Playlist'
        
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertFalse(result, "Should not recognize task as completed with wrong playlist name")
    
    def test_partial_name_match_works(self):
        """Test that partial name matching works (uses LIKE)."""
        # The scenario uses LIKE with % wildcards
        self.scenario.name = 'Awesome'
        
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should match playlist containing the search term")


if __name__ == '__main__':
    unittest.main()

