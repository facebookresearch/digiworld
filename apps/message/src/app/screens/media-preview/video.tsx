import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import { Screen, Text } from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av'
import Slider from '@react-native-community/slider'
import RNFS from 'react-native-fs'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useStores } from '@/models/helpers/useStores'

const { width, height } = Dimensions.get('window')

export default function VideoPreviewScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const {
    fileName: fileNameParam,
    uri: uriParam,
    sessionId,
  } = useLocalSearchParams()
  const videoRef = useRef<Video>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [status, setStatus] = useState<AVPlaybackStatus>({} as AVPlaybackStatus)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewStartTime, setViewStartTime] = useState(Date.now())
  const [uri, setUri] = useState(typeof uriParam === 'string' ? uriParam : '')
  const [fileName, setFileName] = useState(
    typeof fileNameParam === 'string' ? fileNameParam : '',
  )
  const [isSessionRestored, setIsSessionRestored] = useState(false)

  const { sessionStore } = useStores()

  // Add interaction tracking
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('VideoPreview', '/screens/media-preview/video')

  // Track screen mount with initial state
  useEffect(() => {
    setViewStartTime(Date.now())
    trackScreenMount({
      uri: typeof uri === 'string' ? uri : '',
      fileName: typeof fileName === 'string' ? fileName : '',
      isLoading,
      error,
      isFullscreen,
      showControls,
      timestamp: Date.now(),
      platform: Platform.OS,
      screenDimensions: {
        width,
        height,
      },
      sessionId,
    })
  }, [])

  // Load session data if exists
  useEffect(() => {
    if (sessionId && !isSessionRestored) {
      const session = sessionStore.getSession(sessionId as string)
      if (session?.data?.sessionData) {
        const formData = session.data.sessionData.formData as any
        console.log('Restoring video preview session data:', formData)

        // Restore URI and fileName from session if not available from params
        if (formData.uri && typeof formData.uri === 'string' && !uri) {
          console.log('Restoring URI from session:', formData.uri)
          setUri(formData.uri)
        }

        if (
          formData.fileName &&
          typeof formData.fileName === 'string' &&
          !fileName
        ) {
          console.log('Restoring fileName from session:', formData.fileName)
          setFileName(formData.fileName)
        }

        // Restore playback position if available
        if (
          formData.playbackPosition &&
          typeof formData.playbackPosition === 'number'
        ) {
          // We'll set this when the video loads
          setTimeout(() => {
            if (videoRef.current && formData.playbackPosition) {
              videoRef.current.setPositionAsync(formData.playbackPosition)
            }
          }, 1000)
        }

        // Restore fullscreen state if available
        if (
          formData.isFullscreen &&
          typeof formData.isFullscreen === 'boolean'
        ) {
          setIsFullscreen(formData.isFullscreen)
        }

        // Don't restore loading state if the action indicates the video has loaded
        const isVideoLoaded =
          formData.action === 'video_load_completed' ||
          formData.action === 'video_shared' ||
          formData.action === 'video_played' ||
          formData.action === 'video_paused' ||
          formData.action === 'video_preview_closed'

        // Always set loading to false if video was loaded or if we have a valid URI
        if (isVideoLoaded || (uri && typeof uri === 'string')) {
          console.log('Setting loading to false for restored video')
          setIsLoading(false)
          setError(false)
        }

        // Track the restoration
        trackContentChange({
          action: 'session_restored',
          restoredUri: formData.uri,
          restoredFileName: formData.fileName,
          restoredPlaybackPosition: formData.playbackPosition,
          restoredIsFullscreen: formData.isFullscreen,
          currentUri: uri,
          currentFileName: fileName,
          isVideoLoaded,
          timestamp: Date.now(),
        })

        setIsSessionRestored(true)
      }
    }
  }, [sessionId, sessionStore, trackContentChange, isSessionRestored])

  // Use the uri state variable, or fallback to hardcoded path
  const videoPath =
    (uri && typeof uri === 'string' ? uri : null) ||
    (Platform.OS === 'android'
      ? `file://${RNFS.ExternalDirectoryPath}/mockdata/assets/media/previews/video_preview.mp4`
      : `file://${RNFS.DocumentDirectoryPath}/mockdata/assets/media/previews/video_preview.mp4`)

  // Debug logging - only log when videoPath changes
  useEffect(() => {
    console.log('VideoPreviewScreen - videoPath:', videoPath)
    console.log('VideoPreviewScreen - uri state:', uri)
  }, [videoPath, uri])

  // Ensure the video path is properly formatted
  const getVideoSource = () => {
    if (!videoPath) {
      // Return a fallback video source
      return {
        uri:
          Platform.OS === 'android'
            ? `file://${RNFS.ExternalDirectoryPath}/mockdata/assets/media/previews/video_preview.mp4`
            : `file://${RNFS.DocumentDirectoryPath}/mockdata/assets/media/previews/video_preview.mp4`,
      }
    }

    // If it's already a file:// URL, use it as is
    if (videoPath.startsWith('file://')) {
      return { uri: videoPath }
    }

    // If it's a local path, add file:// prefix
    if (videoPath.startsWith('/')) {
      return { uri: `file://${videoPath}` }
    }

    // Otherwise, assume it's a remote URL
    return { uri: videoPath }
  }

  const videoSource = getVideoSource()

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check if video file exists
  useEffect(() => {
    const checkVideoFile = async () => {
      try {
        if (videoPath && videoPath.startsWith('file://')) {
          const filePath = videoPath.replace('file://', '')
          const exists = await RNFS.exists(filePath)
          console.log('Video file exists:', exists, 'at path:', filePath)
          if (!exists) {
            console.error('Video file does not exist at path:', filePath)
            setError(true)
          } else {
            // Check if file is readable
            try {
              const stats = await RNFS.stat(filePath)
              console.log('Video file stats:', stats)
            } catch (statError) {
              console.error('Error getting video file stats:', statError)
              setError(true)
            }
          }
        }
      } catch (error) {
        console.error('Error checking video file:', error)
      }
    }

    checkVideoFile()
  }, [videoPath])

  // Handle video error and provide fallback
  const handleVideoError = useCallback(
    (error: any) => {
      console.error('Video loading error:', error)
      setIsLoading(false)
      setError(true)

      trackContentChange({
        action: 'video_load_error',
        error: error?.message || 'Unknown error',
        uri: uri || '',
        timestamp: Date.now(),
      })

      // Try to provide a helpful error message
      if (videoPath && videoPath.startsWith('file://')) {
        console.error('Video file path that failed:', videoPath)
      }

      // If the video fails to load, we could try a fallback video
      // For now, just show the error state
    },
    [uri, videoPath, trackContentChange],
  )

  useEffect(() => {
    if (showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 5000)
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [showControls])

  const handleClose = useCallback(() => {
    const viewDuration = Date.now() - viewStartTime
    trackClick('closeButton')
    trackContentChange({
      action: 'video_preview_closed',
      viewDuration,
      finalPlaybackPosition: status.isLoaded ? status.positionMillis : 0,
      isFullscreen,
      timestamp: Date.now(),
    })
    router.back()
  }, [
    router,
    trackClick,
    trackContentChange,
    viewStartTime,
    status,
    isFullscreen,
  ])

  const handleShare = useCallback(() => {
    trackClick('shareButton')
    trackContentChange({
      action: 'video_shared',
      uri: uri || '',
      fileName: fileName || '',
      playbackPosition: status.isLoaded ? status.positionMillis : 0,
      isFullscreen,
      timestamp: Date.now(),
    })
    // Implement share functionality
    console.log('Share video:', videoPath)
  }, [
    uri,
    fileName,
    status,
    isFullscreen,
    videoPath,
    trackClick,
    trackContentChange,
  ])

  const handlePlayPause = useCallback(async () => {
    if (videoRef.current) {
      if (status.isLoaded && status.isPlaying) {
        await videoRef.current.pauseAsync()
        trackContentChange({
          action: 'video_paused',
          playbackPosition: status.positionMillis,
          timestamp: Date.now(),
        })
      } else if (status.isLoaded) {
        await videoRef.current.playAsync()
        trackContentChange({
          action: 'video_played',
          playbackPosition: status.positionMillis,
          timestamp: Date.now(),
        })
      }
    }
  }, [status, trackContentChange])

  const handlePlayerTap = useCallback(() => {
    setShowControls(!showControls)
    trackContentChange({
      action: 'controls_toggled',
      showControls: !showControls,
      timestamp: Date.now(),
    })
  }, [showControls, trackContentChange])

  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen(!isFullscreen)
    trackContentChange({
      action: 'fullscreen_toggled',
      isFullscreen: !isFullscreen,
      timestamp: Date.now(),
    })
  }, [isFullscreen, trackContentChange])

  const handleSeek = useCallback(
    (value: number): void => {
      if (videoRef.current && status.isLoaded && status.durationMillis) {
        const seekPosition = (value / 100) * status.durationMillis
        videoRef.current.setPositionAsync(seekPosition)
        trackContentChange({
          action: 'video_seeked',
          seekPosition,
          seekPercentage: value,
          timestamp: Date.now(),
        })
      }
    },
    [status, trackContentChange],
  )

  const formatTime = (milliseconds: number | undefined): string => {
    if (!milliseconds) return '0:00'
    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const PlayerControls = () => (
    <View style={styles.controlsOverlay}>
      {/* Top controls */}
      <View style={styles.topControls}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleClose}
          activeOpacity={0.8}
        >
          <Ionicons
            name="close"
            size={24}
            color={theme.colors.palette.neutral100}
          />
        </TouchableOpacity>

        <Text
          text={fileName || 'Video Preview'}
          size="medium"
          weight="medium"
          style={styles.headerTitle}
        />

        <View style={styles.topRightControls}>
          <TouchableOpacity
            style={styles.fullscreenButton}
            onPress={handleFullscreenToggle}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isFullscreen ? 'contract' : 'expand'}
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Ionicons
              name="share-outline"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Center controls */}
      <View style={styles.centerControls}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          activeOpacity={0.8}
        >
          <Ionicons
            name={status.isLoaded && status.isPlaying ? 'pause' : 'play'}
            size={48}
            color={theme.colors.palette.neutral100}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        <View style={styles.timeContainer}>
          <Text
            style={styles.timeText}
            text={formatTime(status.isLoaded ? status.positionMillis : 0)}
          />
          <Text style={styles.timeText} text=" / " />
          <Text
            style={styles.timeText}
            text={formatTime(status.isLoaded ? status.durationMillis : 0)}
          />
        </View>

        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          value={
            status.isLoaded && status.durationMillis
              ? (status.positionMillis / status.durationMillis) * 100
              : 0
          }
          onValueChange={handleSeek}
          minimumTrackTintColor={theme.colors.palette.primary500}
          maximumTrackTintColor={theme.colors.palette.neutral700}
          thumbTintColor={theme.colors.palette.primary500}
        />
      </View>
    </View>
  )

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={['top']}
      style={[styles.screen, isFullscreen && styles.fullscreenMode]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.palette.neutral900}
        hidden={isFullscreen}
      />

      <TouchableOpacity
        style={styles.videoContainer}
        onPress={handlePlayerTap}
        activeOpacity={1}
      >
        <Video
          ref={videoRef}
          style={styles.video}
          source={videoSource}
          useNativeControls={false}
          resizeMode={ResizeMode.CONTAIN}
          isLooping
          onPlaybackStatusUpdate={(newStatus: AVPlaybackStatus) =>
            setStatus(newStatus)
          }
          onLoadStart={() => {
            console.log('Video loading started')
            setIsLoading(true)
            setError(false)
            trackContentChange({
              action: 'video_load_started',
              uri: uri || '',
              timestamp: Date.now(),
            })
          }}
          onLoad={() => {
            console.log('Video loaded successfully')
            setIsLoading(false)
            setError(false)
            trackContentChange({
              action: 'video_load_completed',
              uri: uri || '',
              timestamp: Date.now(),
            })
          }}
          onError={handleVideoError}
        />

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.palette.primary500}
            />
            <Text text="Loading video..." style={styles.loadingText} />
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={theme.colors.palette.angry500}
            />
            <Text text="Failed to load video" style={styles.errorText} />
          </View>
        )}

        {showControls && <PlayerControls />}
      </TouchableOpacity>
    </Screen>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral900,
    },
    fullscreenMode: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
    },
    videoContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    video: {
      width,
      height,
      backgroundColor: theme.colors.palette.neutral900,
    },
    controlsOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'space-between',
      backgroundColor: theme.colors.palette.neutral900 + '40',
    },
    topControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      color: theme.colors.palette.neutral100,
      flex: 1,
      textAlign: 'center',
    },
    topRightControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    fullscreenButton: {
      padding: 8,
    },
    shareButton: {
      padding: 8,
    },
    centerControls: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.palette.neutral700,
      justifyContent: 'center',
      alignItems: 'center',
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
      color: theme.colors.palette.neutral100,
      fontSize: 14,
      fontWeight: '500',
    },
    slider: {
      width: '100%',
      height: 40,
    },
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    loadingText: {
      color: theme.colors.palette.neutral100,
      marginTop: 12,
    },
    errorContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    errorText: {
      color: theme.colors.palette.angry500,
      marginTop: 12,
    },
    debugText: {
      color: theme.colors.palette.neutral100,
      fontSize: 12,
      marginBottom: 2,
    },
  })
