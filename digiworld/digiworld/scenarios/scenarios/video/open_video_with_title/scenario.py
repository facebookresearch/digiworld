# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario


class OpenVideoWithTitleScenario(VideoScenario, TargetStateScenario):
    """Scenario for opening a video with a specific title."""
    
    def _check_task_completion(self, state_path):
        """
        Check if a video with the specified title has been opened.
        
        This is verified by checking the playback state in rootstore.json
        to see if the user navigated to and opened a video with the matching title.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if the video was opened, False otherwise.
        """
        
        # Load the rootstore.json to check current playback state
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return False
            
        with open(rootstore_path, 'r') as f:
            rootstore = json.load(f)
        
        # Get the video store from rootstore
        video_store = rootstore.get('videoStore', {})
        if not video_store:
            return False
        
        # Get the playback state to find the current video ID
        playback_state = video_store.get('playbackState', {})
        current_video_id = playback_state.get('currentVideoId')
        
        # If no video is currently opened, task is not complete
        if current_video_id is None:
            return False
        
        # Query the database to get the video with this ID and check its title
        query = """
        SELECT title FROM videos WHERE id = ?
        """
        
        results = self._execute_query_in_path(query, (current_video_id,), state_path)
        if not results:
            return False
        
        video_title = results[0][0]
        
        # Check if the video title matches our target title (case-insensitive)
        return self.title.lower() == video_title.lower()

