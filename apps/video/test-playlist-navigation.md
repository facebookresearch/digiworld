<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Playlist Navigation Test

## Summary of Changes Made

1. **Added playNext and playPrev methods to VideoStore**:
   - `playNext()`: Advances to the next video in playlist order
   - `playPrev()`: Goes to previous video in playlist order
   - `getCurrentVideo()`: Gets the current video from playback state

2. **Updated Video Player Screen**:
   - Now uses `playbackState.currentVideoId` when in playlist mode
   - Falls back to URL parameter when not in playlist mode
   - Skip buttons now navigate through playlist instead of seeking when in playlist mode
   - Skip buttons are disabled appropriately based on playlist position

3. **Added PlaylistSection Component**:
   - Shows current playlist videos in horizontal scrollable list
   - Highlights currently playing video
   - Allows clicking to jump to specific video in playlist

## Key Logic Changes

### Video ID Resolution
```typescript
// Determine if we're in playlist mode or single video mode
const isPlaylistMode = playbackState.playlistOrder.length > 0
const currentVideoId = isPlaylistMode ? playbackState.currentVideoId : urlVideoId

// Get video data - use current video from playback state if in playlist mode
const video = isPlaylistMode 
  ? videoStore.getCurrentVideo() || videoStore.videos.find(v => v.id === urlVideoId)
  : videoStore.videos.find(v => v.id === urlVideoId)
```

### Skip Button Logic
```typescript
const handleSkipBack = () => {
  if (isPlaylistMode) {
    // In playlist mode, go to previous video
    videoStore.playPrev()
  } else {
    // In single video mode, seek back 10 seconds
    const newTime = Math.max(0, currentTime - 10)
    videoStore.setPlaybackProgress(newTime)
  }
  videoStore.setShowControls(true)
}
```

## Expected Behavior

1. **Single Video Mode** (no playlist):
   - Skip buttons seek forward/backward 10 seconds
   - No playlist section shown
   - Uses URL parameter for video ID

2. **Playlist Mode** (playlist active):
   - Skip buttons navigate to next/previous video in playlist
   - Skip buttons disabled at playlist boundaries
   - Playlist section shows all videos with current highlighted
   - Uses playback state for current video ID
   - Video data updates automatically when navigating

## Testing Steps

1. Navigate to a single video - should work as before
2. Start a playlist from playlist detail page
3. Use skip buttons to navigate through playlist
4. Verify video data (title, description, etc.) updates
5. Verify playlist section shows and highlights current video
6. Click on different video in playlist section