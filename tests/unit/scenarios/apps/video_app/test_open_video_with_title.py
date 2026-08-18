# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for OpenVideoWithTitleScenario."""

import unittest
import json
import tempfile
import os
import shutil
import sqlite3
from digiworld.scenarios.scenarios.video.open_video_with_title.scenario import OpenVideoWithTitleScenario


class TestOpenVideoWithTitleScenario(unittest.TestCase):
    """Test cases for OpenVideoWithTitleScenario."""
    
    def setUp(self):
        """Set up test fixtures with temporary directories."""
        self.temp_dir = tempfile.mkdtemp()
        self.initial_state_dir = os.path.join(self.temp_dir, "initial_state")
        self.final_state_dir = os.path.join(self.temp_dir, "final_state")
        os.makedirs(self.initial_state_dir)
        os.makedirs(self.final_state_dir)
        
        self._create_test_database()
        self._create_initial_state_json()
        self._create_final_state_json()
        
        self.scenario = self._create_test_scenario()
    
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _create_test_scenario(self):
        """Create scenario instance with test configuration."""
        scenario = OpenVideoWithTitleScenario.__new__(OpenVideoWithTitleScenario)
        scenario.title = "Amazing Nature Documentary"
        
        # Mock the _execute_query_in_path method
        def mock_execute_query_in_path(query, params, state_path):
            db_path = os.path.join(state_path, "andojovideo.db")
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute(query, params)
            results = cursor.fetchall()
            conn.close()
            return results
        
        scenario._execute_query_in_path = mock_execute_query_in_path
        return scenario
    
    def _create_test_database(self):
        """Create test database with videos."""
        db_path = os.path.join(self.final_state_dir, "andojovideo.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create videos table
        cursor.execute("""
            CREATE TABLE videos (
                id INTEGER PRIMARY KEY,
                channelId INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                videoUrl TEXT,
                categoryId INTEGER,
                thumbnailUrl TEXT,
                duration INTEGER,
                visibility TEXT DEFAULT 'public',
                status TEXT DEFAULT 'active',
                viewCount INTEGER DEFAULT 0,
                likeCount INTEGER DEFAULT 0,
                commentCount INTEGER DEFAULT 0,
                isCommentsEnabled INTEGER DEFAULT 1,
                createdAt TEXT,
                updatedAt TEXT,
                deletedAt TEXT
            )
        """)
        
        # Insert test videos
        cursor.execute("""
            INSERT INTO videos (id, channelId, title, description, videoUrl, categoryId, status, visibility)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (1, 1, "Amazing Nature Documentary", "A beautiful documentary about nature", 
              "https://example.com/video1.mp4", 1, "active", "public"))
        
        cursor.execute("""
            INSERT INTO videos (id, channelId, title, description, videoUrl, categoryId, status, visibility)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (2, 1, "Tech Review 2024", "Latest tech gadgets reviewed", 
              "https://example.com/video2.mp4", 2, "active", "public"))
        
        conn.commit()
        conn.close()
        
        # Copy database to initial state directory
        shutil.copy(db_path, os.path.join(self.initial_state_dir, "andojovideo.db"))
    
    def _create_initial_state_json(self):
        """Create initial rootstore.json WITHOUT any video opened."""
        rootstore_path = os.path.join(self.initial_state_dir, "rootstore.json")
        
        rootstore_data = {
            "videoStore": {
                "videos": [],
                "playbackState": {
                    "isPlaying": False,
                    "progress": 0,
                    "duration": 0,
                    "currentVideoId": None,
                    "playlistOrder": [],
                    "playlistIndex": 0
                }
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def _create_final_state_json(self):
        """Create final rootstore.json WITH target video opened."""
        rootstore_path = os.path.join(self.final_state_dir, "rootstore.json")
        
        rootstore_data = {
            "videoStore": {
                "videos": [
                    {
                        "id": 1,
                        "channelId": 1,
                        "title": "Amazing Nature Documentary",
                        "description": "A beautiful documentary about nature",
                        "videoUrl": "https://example.com/video1.mp4"
                    }
                ],
                "playbackState": {
                    "isPlaying": True,
                    "progress": 0,
                    "duration": 300,
                    "currentVideoId": 1,
                    "playlistOrder": [],
                    "playlistIndex": 0
                }
            }
        }
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
    
    def test_recognizes_completed_task(self):
        """Test scenario identifies completed task correctly."""
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should recognize task as completed when video is opened")
    
    def test_recognizes_incomplete_task(self):
        """Test scenario identifies incomplete task correctly."""
        result = self.scenario._check_task_completion(self.initial_state_dir)
        self.assertFalse(result, "Should recognize task as incomplete when no video is opened")
    
    def test_wrong_video_not_completed(self):
        """Test that opening wrong video doesn't count as completion."""
        # Modify final state to have wrong video ID
        rootstore_path = os.path.join(self.final_state_dir, "rootstore.json")
        with open(rootstore_path, 'r') as f:
            rootstore_data = json.load(f)
        
        rootstore_data['videoStore']['playbackState']['currentVideoId'] = 2
        
        with open(rootstore_path, 'w') as f:
            json.dump(rootstore_data, f)
        
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertFalse(result, "Should not recognize task as completed with wrong video")
    
    def test_case_insensitive_title_matching(self):
        """Test that title matching is case-insensitive."""
        self.scenario.title = "AMAZING NATURE DOCUMENTARY"
        result = self.scenario._check_task_completion(self.final_state_dir)
        self.assertTrue(result, "Should match titles case-insensitively")


if __name__ == '__main__':
    unittest.main()

