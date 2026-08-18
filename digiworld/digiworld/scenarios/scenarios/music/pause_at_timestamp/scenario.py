# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import math
import os
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.music.base_scenario import MusicScenario


class PauseAtTimestampScenario(MusicScenario, TargetStateScenario):
    """Scenario for opening a song and pausing it at a specified timestamp."""
    
    def _check_task_completion(self, state_path):
        """
        Check if a song is opened and paused at the specified timestamp.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if a song is paused at approximately the specified timestamp, False otherwise.
        """
        
        # Read the rootstore.json to check playback state
        json_path = os.path.join(state_path, "rootstore.json")
        
        if not os.path.exists(json_path):
            return False
        
        with open(json_path, 'r') as f:
            state = json.load(f)
        
        # Get the music store state
        music_store = state.get('musicStore', {})
        
        # Check if there's a current song playing
        current_song_id = music_store.get('currentSongId')
        if current_song_id is None:
            return False
        
        # Check playback state
        playback_state = music_store.get('playbackState', {})
        is_playing = playback_state.get('isPlaying', True)
        
        # The song should be paused (not playing)
        if is_playing:
            return False
        
        # Get the current progress (position in the song)
        progress = playback_state.get('progress', 0)
        
        # Check if the progress matches the target timestamp
        target_seconds = int(self.seconds)
        
        # Check if the floored progress matches the target
        # This handles floating-point values (e.g., 15.0-15.999 all display as "0:15" in UI)
        # but won't accept 16.0 for a 15-second target
        if math.floor(progress) == target_seconds:
            return True
        
        return False

