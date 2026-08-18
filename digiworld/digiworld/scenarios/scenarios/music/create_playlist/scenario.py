# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.music.base_scenario import MusicScenario


class CreatePlaylistScenario(MusicScenario, TargetStateScenario):
    """Scenario for creating a new playlist with a specified name."""
    
    def _check_task_completion(self, state_path):
        """
        Check if a new playlist with the specified name was created.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if a new playlist with the specified name exists, False otherwise.
        """
        
        # Query to get all playlists with the specified name created by the current user
        query = """
        SELECT id, name, user_id, description, categories, cover_art, song_ids, created_at
        FROM playlists
        WHERE name = ? 
            AND user_id = ?
        ORDER BY created_at DESC
        """
        
        # Execute queries and compare results to find new playlists
        _, _, new_playlists = self.compare_database_records(
            self.initial_state_path,
            state_path, 
            query, 
            (self.name, self.current_user_id)
        )
        
        # Task is completed if a new playlist was created with the specified name
        return len(new_playlists) > 0
