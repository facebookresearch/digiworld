// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view'
import FastImage from 'react-native-fast-image'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useStores } from '@/models/helpers/useStores'

const { width, height } = Dimensions.get('window')

export default function ImagePreviewScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const {
    uri: uriParam,
    fileName: fileNameParam,
    sessionId,
  } = useLocalSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [uri, setUri] = useState(typeof uriParam === 'string' ? uriParam : '')
  const [fileName, setFileName] = useState(
    typeof fileNameParam === 'string' ? fileNameParam : '',
  )
  const [isSessionRestored, setIsSessionRestored] = useState(false)
  const [hasStartedLoading, setHasStartedLoading] = useState(false)

  const { sessionStore } = useStores()

  // Add interaction tracking
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('ImagePreview', '/screens/media-preview/image')

  // Track screen mount with initial state
  useEffect(() => {
    trackScreenMount({
      uri,
      fileName,
      error,
      zoomLevel,
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
        console.log('Restoring image preview session data:', formData)

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

        // Restore zoom level if available
        if (formData.zoomLevel && typeof formData.zoomLevel === 'number') {
          setZoomLevel(formData.zoomLevel)
        }

        // Don't restore loading state if the action indicates the image has loaded
        const isImageLoaded =
          formData.action === 'image_load_completed' ||
          formData.action === 'image_shared' ||
          formData.action === 'image_zoomed' ||
          formData.action === 'image_preview_closed'

        // Set loading to false if image was previously loaded or if we have a valid URI
        if (isImageLoaded) {
          console.log('Setting loading to false - image was previously loaded')
          setIsLoading(false)
          setError(false)
        } else if (uri && typeof uri === 'string') {
          console.log('Setting loading to false - valid URI available')
          setIsLoading(false)
          setError(false)
        } else {
          console.log(
            'Keeping loading state - no valid URI or previous load state',
          )
        }

        // Track the restoration
        trackContentChange({
          action: 'session_restored',
          restoredUri: formData.uri,
          restoredFileName: formData.fileName,
          restoredZoomLevel: formData.zoomLevel,
          currentZoomLevel: zoomLevel,
          restoredLoadingState: formData.isLoading,
          isImageLoaded,
          timestamp: Date.now(),
        })

        // Mark session as restored to prevent multiple restorations
        setIsSessionRestored(true)
      }
    }
  }, [sessionId, sessionStore, trackContentChange])

  // Reset loading state when URI changes
  useEffect(() => {
    if (uri && typeof uri === 'string') {
      setHasStartedLoading(false)
      setIsLoading(true)
      setError(false)
    }
  }, [uri])

  // Add a timeout to automatically set loading to false if it takes too long
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.log('Image loading timeout, setting loading to false')
        setIsLoading(false)
        trackContentChange({
          action: 'image_load_timeout',
          uri: typeof uri === 'string' ? uri : '',
          timestamp: Date.now(),
        })
      }, 10000) // 10 second timeout

      return () => clearTimeout(timeout)
    }
  }, [isLoading, uri, trackContentChange])

  // Remove the problematic useEffect that was causing infinite loops

  const handleClose = useCallback(() => {
    trackClick('closeButton')
    trackContentChange({
      action: 'image_preview_closed',
      finalZoomLevel: zoomLevel,
      totalViewTime: Date.now(), // You could track actual view time if needed
      timestamp: Date.now(),
    })
    router.back()
  }, [router, trackClick, trackContentChange, zoomLevel])

  const handleShare = useCallback(() => {
    trackClick('shareButton')
    trackContentChange({
      action: 'image_shared',
      uri: typeof uri === 'string' ? uri : '',
      fileName: typeof fileName === 'string' ? fileName : '',
      zoomLevel,
      timestamp: Date.now(),
    })
    // Implement share functionality
    console.log('Share image:', uri)
  }, [uri, fileName, zoomLevel, trackClick, trackContentChange])

  const handleZoomChange = useCallback(
    (event: any, gestureState: any, zoomableViewEventObject: any) => {
      const newZoomLevel = zoomableViewEventObject?.zoomLevel || 1
      setZoomLevel(newZoomLevel)
      trackContentChange({
        action: 'image_zoomed',
        previousZoomLevel: zoomLevel,
        newZoomLevel,
        timestamp: Date.now(),
      })
    },
    [zoomLevel, trackContentChange],
  )

  const handleImageLoadStart = useCallback(() => {
    // Only set loading if not already loading to prevent multiple loading states
    if (!hasStartedLoading) {
      console.log('Starting image load for URI:', uri)
      setHasStartedLoading(true)
      setIsLoading(true)
      setError(false)
      trackContentChange({
        action: 'image_load_started',
        uri: typeof uri === 'string' ? uri : '',
        timestamp: Date.now(),
      })
    }
  }, [uri, trackContentChange, hasStartedLoading])

  const handleImageLoadEnd = useCallback(() => {
    console.log('Image load completed for URI:', uri)
    setIsLoading(false)
    trackContentChange({
      action: 'image_load_completed',
      uri: typeof uri === 'string' ? uri : '',
      timestamp: Date.now(),
    })
  }, [uri, trackContentChange])

  const handleImageError = useCallback(() => {
    console.log('Image load error for URI:', uri)
    setIsLoading(false)
    setError(true)
    trackContentChange({
      action: 'image_load_error',
      uri: typeof uri === 'string' ? uri : '',
      timestamp: Date.now(),
    })
  }, [uri, trackContentChange])

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={['top', 'bottom']}
      style={styles.screen}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.transparent}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
          <Ionicons
            name="close"
            size={24}
            color={theme.colors.palette.neutral100}
          />
        </TouchableOpacity>

        <Text
          text={typeof fileName === 'string' ? fileName : 'Image Preview'}
          size="medium"
          weight="medium"
          style={styles.headerTitle}
        />

        <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
          <Ionicons
            name="share-outline"
            size={24}
            color={theme.colors.palette.neutral100}
          />
        </TouchableOpacity>
      </View>

      {/* Zoomable Image */}
      <View style={styles.imageContainer}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.palette.primary500}
            />
            <Text text="Loading image..." style={styles.loadingText} />
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={theme.colors.palette.angry500}
            />
            <Text text="Failed to load image" style={styles.errorText} />
          </View>
        )}

        <ReactNativeZoomableView
          maxZoom={10}
          minZoom={1}
          zoomStep={0.5}
          initialZoom={zoomLevel}
          bindToBorders
          style={styles.zoomableView}
          onZoomAfter={handleZoomChange}
        >
          <FastImage
            source={{ uri: typeof uri === 'string' ? uri : '' }}
            style={styles.image}
            resizeMode={FastImage.resizeMode.contain}
            onLoadStart={handleImageLoadStart}
            onLoadEnd={handleImageLoadEnd}
            onError={handleImageError}
          />
        </ReactNativeZoomableView>
      </View>
    </Screen>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.transparent,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      backgroundColor: theme.colors.palette.neutral900 + '90',
    },
    headerButton: {
      padding: 8,
    },
    headerTitle: {
      color: theme.colors.palette.neutral100,
      flex: 1,
      textAlign: 'center',
    },
    imageContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    zoomableView: {
      flex: 1,
      width,
      height: height - 100, // Adjust for header
    },
    image: {
      width,
      height: height - 100,
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
    },
  })
