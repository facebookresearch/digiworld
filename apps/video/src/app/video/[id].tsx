import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, useTheme, useToast } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useRef } from 'react'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'

import { EmptyState } from '@/components/EmptyState'
import { CommentSection } from '@/components/CommentSection'
import { VideoDescription } from '@/components/VideoDescription'
import { PlaylistSection } from '@/components/PlaylistSection'
import { VideoThumbnailImage } from '@/components/VideoImage'
import { useStores } from '@/models/helpers/useStores'
import Slider from '@react-native-community/slider'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

const { width, height } = Dimensions.get('window')
const getPlayerHeight = (isFullscreen: boolean) =>
  isFullscreen ? height : height * 0.32 // 32% of screen height or full screen

export default observer(function VideoPlayerScreen() {
  const { theme } = useTheme()
  const { videoStore, userStore, playlistStore } = useStores()
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('video', `/video/${id}`)
  const toast = useToast()

  // Refs
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  const urlVideoId = parseInt(id as string)

  // Derive state from store first
  const playbackState = videoStore.playbackState

  // Use computed properties from store
  const isPlaylistMode = videoStore.isInPlaylistMode
  const currentVideoId = playbackState.currentVideoId
  const canPlayNext = videoStore.canPlayNext
  const canPlayPrev = videoStore.canPlayPrev

  // Get video data - always search for the current video ID
  const video = videoStore.videos.find(
    v => v.id === (currentVideoId || urlVideoId),
  )

  const channel = video
    ? videoStore.channels.find(c => c.id === video.channelId)
    : null
  const isVideoOwner = Boolean(
    userStore.user && channel && channel.userId === userStore.user.id,
  )
  const {
    isPlaying,
    progress: currentTime,
    duration,
    isFullscreen,
    isLiked,
    likeCount,
  } = playbackState

  const PLAYER_HEIGHT = getPlayerHeight(isFullscreen)

  // Initialize video playback when component mounts or video changes
  useEffect(() => {
    const initializeVideoAsync = async () => {
      if (urlVideoId) {
        try {
          // Only initialize if we're not already playing this video
          if (currentVideoId !== urlVideoId) {
            await videoStore.initializeVideo(urlVideoId)
          } else {
            // If same video, just refresh the like state
            await videoStore.initializeVideoPlayerState(
              currentVideoId || urlVideoId,
            )
          }
        } catch (error) {
          console.log('Error initializing video:', error)
        }
      }
    }

    initializeVideoAsync()

    return () => {
      // Only reset if we're leaving the video entirely
      videoStore.pauseVideo()
    }
  }, [urlVideoId, userStore.isAuthenticated])

  // The VideoStore now handles progress timing automatically, so we don't need this manual timer

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      // Pause video and reset playback state when leaving screen
      videoStore.pauseVideo()
      videoStore.resetPlaybackState()
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      // Track screen mount when focused
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'video',
        route: `/video/${id}`,
      })
    }, []),
  )

  const handlePlayPause = () => {
    if (isPlaying) {
      videoStore.pauseVideo()
    } else {
      // Use togglePlayback for better state management
      videoStore.togglePlayback()
    }
    videoStore.setShowControls(true)
  }

  const handleSeek = (value: number) => {
    videoStore.setProgress(value)
    videoStore.setShowControls(true)
  }

  const handleSkipBack = async () => {
    if (isPlaylistMode) {
      // In playlist mode, go to previous video
      try {
        const result = await videoStore.playPrev()
        if (!result) {
          // If no previous video, seek back 10 seconds in current video
          const newTime = Math.max(0, currentTime - 10)
          videoStore.setProgress(newTime)
        }
      } catch (error) {
        console.log('Error playing previous video:', error)
        // Fallback to seeking
        const newTime = Math.max(0, currentTime - 10)
        videoStore.setProgress(newTime)
      }
    } else {
      // In single video mode, seek back 10 seconds
      const newTime = Math.max(0, currentTime - 10)
      videoStore.setProgress(newTime)
    }
    videoStore.setShowControls(true)
  }

  const handleSkipForward = async () => {
    if (isPlaylistMode) {
      // In playlist mode, go to next video
      try {
        const result = await videoStore.playNext()
        if (!result) {
          // If no next video, seek forward 10 seconds in current video
          const newTime = Math.min(duration, currentTime + 10)
          videoStore.setProgress(newTime)
        }
      } catch (error) {
        console.log('Error playing next video:', error)
        // Fallback to seeking
        const newTime = Math.min(duration, currentTime + 10)
        videoStore.setProgress(newTime)
      }
    } else {
      // In single video mode, seek forward 10 seconds
      const newTime = Math.min(duration, currentTime + 10)
      videoStore.setProgress(newTime)
    }
    videoStore.setShowControls(true)
  }

  const handlePlayerTap = () => {
    videoStore.toggleControls()
  }

  const handleMorePress = () => {
    if (!userStore.isAuthenticated) {
      toast.show({
        preset: 'error',
        title: 'You need to login before adding this to playlist',
        placement: 'top',
      })
      return
    }
    const targetVideoId = currentVideoId || urlVideoId
    playlistStore.showAddToPlaylistModal(targetVideoId)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleLikeVideo = async () => {
    if (!userStore.isAuthenticated) {
      toast.show({
        preset: 'error',
        title: 'You need to login to like this video',
        placement: 'top',
      })
      return
    }

    try {
      const targetVideoId = currentVideoId || urlVideoId
      await videoStore.toggleLike(targetVideoId)
    } catch (error) {
      console.log(error)
      toast.show({
        preset: 'error',
        title: 'Failed to update like status',
        placement: 'top',
      })
    }
  }

  const handleVideoChange = async (selectedVideoId: number) => {
    if (selectedVideoId) {
      try {
        await videoStore.switchToVideo(selectedVideoId, 'playlist')
      } catch (error) {
        console.log('Error switching to video:', error)
      }
    }
  }

  if (!video) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <SafeAreaView style={styles.safeArea}>
          <EmptyState
            icon="videocam-outline"
            title="Video Not Found"
            description="The video you're looking for doesn't exist or has been removed."
          />
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        isFullscreen && styles.fullscreenContainer,
      ]}
    >
      <StatusBar hidden={isFullscreen} />
      {/* Video Player */}
      <TouchableOpacity
        style={[
          styles.playerContainer,
          { height: PLAYER_HEIGHT },
          isFullscreen && styles.fullscreenPlayer,
        ]}
        onPress={handlePlayerTap}
        activeOpacity={1}
      >
        <VideoThumbnailImage
          entityId={currentVideoId || urlVideoId}
          style={{
            width: isFullscreen ? width : width,
            height: PLAYER_HEIGHT,
            borderRadius: 0,
          }}
          thumbnailUrl={video?.thumbnailUrl}
        />

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.controlsOverlay}
        >
          {/* Top controls */}
          <View style={styles.topControls}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.topRightControls}>
              <TouchableOpacity
                style={styles.moreButton}
                onPress={handleMorePress}
                activeOpacity={0.8}
              >
                <Ionicons name="ellipsis-vertical" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Center controls with prev/play/next */}
          <View style={styles.centerControls}>
            <View style={styles.playbackControls}>
              <TouchableOpacity
                style={[
                  styles.skipButton,
                  isPlaylistMode && !canPlayPrev && styles.disabledButton,
                ]}
                onPress={handleSkipBack}
                activeOpacity={0.8}
                disabled={isPlaylistMode && !canPlayPrev}
              >
                <Ionicons
                  name="play-skip-back"
                  size={32}
                  color={
                    isPlaylistMode && !canPlayPrev
                      ? 'rgba(255,255,255,0.3)'
                      : 'white'
                  }
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playButton}
                onPress={handlePlayPause}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={48}
                  color="white"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.skipButton,
                  isPlaylistMode && !canPlayNext && styles.disabledButton,
                ]}
                onPress={handleSkipForward}
                activeOpacity={0.8}
                disabled={isPlaylistMode && !canPlayNext}
              >
                <Ionicons
                  name="play-skip-forward"
                  size={32}
                  color={
                    isPlaylistMode && !canPlayNext
                      ? 'rgba(255,255,255,0.3)'
                      : 'white'
                  }
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom controls */}
          <View style={styles.bottomControls}>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText} text={formatTime(currentTime)} />
              <Text style={styles.timeText} text=" / " />
              <Text style={styles.timeText} text={formatTime(duration)} />
            </View>

            <Slider
              style={styles.seekBar}
              value={videoStore.playbackState.progress}
              minimumValue={0}
              step={1}
              maximumValue={duration}
              minimumTrackTintColor={theme.colors.palette.primary200}
              maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
              thumbTintColor={theme.colors.palette.primary200}
              onSlidingComplete={handleSeek}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {!isFullscreen && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
          >
            {/* Video Description */}
            <VideoDescription
              video={{
                id: video.id,
                title: video.title,
                description: video.description || undefined,
                viewCount: video.viewCount,
                createdAt: video.createdAt,
                likeCount: video.likeCount,
                channelId: video.channelId || 0,
              }}
              channel={
                channel
                  ? {
                      id: channel.id,
                      name: channel.name,
                      subscriberCount: channel.subscriberCount,
                      userId: channel.userId,
                    }
                  : null
              }
              isLiked={isLiked}
              likeCount={likeCount}
              onLikePress={handleLikeVideo}
            />

            {/* Playlist Section */}
            {isPlaylistMode &&
              (() => {
                const currentPlaylist = videoStore.playbackState.currentPlaylist

                if (currentPlaylist) {
                  return (
                    <PlaylistSection
                      playlist={currentPlaylist}
                      videos={videoStore.videos}
                      currentVideoId={currentVideoId || urlVideoId}
                      onVideoPress={handleVideoChange}
                      mode="playlist"
                    />
                  )
                }
                return null
              })()}

            {/* Recommended Feed Section */}
            {!isPlaylistMode && (
              <PlaylistSection
                videos={videoStore.videos}
                currentVideoId={currentVideoId || urlVideoId}
                onVideoPress={async (selectedVideoId: number) => {
                  try {
                    await videoStore.switchToVideo(selectedVideoId, 'single')
                  } catch (error) {
                    console.log('Error switching to recommended video:', error)
                  }
                }}
                mode="recommended"
                recommendedVideoIds={
                  videoStore.playbackState.recommendedVideoIds
                }
                onRecommendationsGenerated={videoIds => {
                  videoStore.setRecommendedVideoIds(videoIds)
                }}
              />
            )}

            {/* Comments Section */}
            <CommentSection
              videoId={currentVideoId || urlVideoId}
              isCommentsEnabled={video.isCommentsEnabled}
              isVideoOwner={isVideoOwner}
              isModerating={false}
              useTextActions
              renderAsScrollableContent={true}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
  },
  playerContainer: {
    width,
    position: 'relative',
  },
  fullscreenPlayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1001,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  backButton: {
    padding: 8,
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moreButton: {
    padding: 8,
  },
  centerControls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  bottomControls: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  seekBarContainer: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  seekBar: {
    // width: '100%',
    height: 10,
    // backgroundColor: 'rgba(255,255,255,0.3)',
    // borderRadius: 2,
    // position: 'relative',
    padding: 0,
    margin: 0,
  },
  scrollContainer: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
})
