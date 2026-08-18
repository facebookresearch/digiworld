// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  ScrollView,
  Animated,
  Easing,
  Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import LinearGradient from 'react-native-linear-gradient'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { router, useFocusEffect } from 'expo-router'
import { Text, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { AppHeader } from '@/components/AppHeader'
import { HorizontalFlatList } from '@/components'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

// Simple Animated Upload Success Component
const AnimatedUploadSuccess = ({
  isUploading,
  showSuccess,
  onComplete,
  onShowSuccess,
}: {
  isUploading: boolean
  showSuccess: boolean
  onComplete: () => void
  onShowSuccess: () => void
}) => {
  const spinValue = useRef(new Animated.Value(0)).current
  const scaleValue = useRef(new Animated.Value(0)).current
  const fadeValue = useRef(new Animated.Value(0)).current
  const spinAnimationRef = useRef<Animated.CompositeAnimation | null>(null)
  const wasUploadingRef = useRef(false)

  useEffect(() => {
    if (isUploading && !wasUploadingRef.current) {
      // Upload just started - show spinner
      fadeValue.setValue(1)

      // Start spinning animation
      spinAnimationRef.current = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      )
      spinAnimationRef.current.start()
    } else if (!isUploading && !showSuccess) {
      // Upload just finished - transition to success
      if (spinAnimationRef.current) {
        spinAnimationRef.current.stop()
      }
      onShowSuccess()

      // Scale in the checkmark
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.2,
          duration: 300,
          easing: Easing.back(2),
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()

      // Complete after 2 seconds
      setTimeout(() => {
        onComplete()
      }, 2000)
    } else {
      console.log(
        "I'm printing because",
        isUploading,
        wasUploadingRef,
        showSuccess,
      )
    }

    wasUploadingRef.current = isUploading
  }, [isUploading, showSuccess, onComplete, onShowSuccess])

  // Reset animations when component unmounts or resets
  useEffect(() => {
    return () => {
      if (spinAnimationRef.current) {
        spinAnimationRef.current.stop()
      }
    }
  }, [])

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <View style={styles.animationContainer}>
      {!showSuccess ? (
        <Animated.View style={[styles.loaderContainer, { opacity: fadeValue }]}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <ActivityIndicator size="large" color="#6A11CB" />
          </Animated.View>
          <Text style={styles.uploadingText}>Uploading your video</Text>
        </Animated.View>
      ) : (
        <Animated.View
          style={[styles.successContainer, { opacity: fadeValue }]}
        >
          <Animated.View
            style={[
              styles.checkmarkContainer,
              { transform: [{ scale: scaleValue }] },
            ]}
          >
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          </Animated.View>
          <Text style={styles.successText}>Upload Complete!</Text>
        </Animated.View>
      )}
    </View>
  )
}

const UploadVideoScreen = () => {
  const { theme } = useTheme()
  const { uploadStore, videoStore, uiStore } = useStores()
  const wasUploading = useRef(false)
  const { trackScreenMount } = useInteractionTracking(
    'uploadVideo',
    '/UploadVideo',
  )

  // Refs for text inputs
  const titleInputRef = useRef<TextInput>(null)
  const descriptionInputRef = useRef<TextInput>(null)

  // Effect to handle upload state changes
  useEffect(() => {
    if (uploadStore.isUploading && !wasUploading.current) {
      // Upload just started
      uiStore.showUploadAnimationModal()
    } else if (wasUploading.current && !uploadStore.isUploading) {
      // Upload just finished - animation will handle navigation
    }
    wasUploading.current = uploadStore.isUploading

    // Reset UI state on unmount
    return () => {
      uiStore.hideUploadAnimationModal()
    }
  }, [uploadStore.isUploading])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timeStamp: Date.now(),
        screen: 'uploadVideo',
        route: '/UploadVideo',
      })
    }, []),
  )

  // Handle focus management based on currentFocusedField
  useEffect(() => {
    const { currentFocusedField } = uploadStore
    if (currentFocusedField === 'title' && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus()
        // Move cursor to end of text
        const titleLength = (uploadStore.title || '').length
        titleInputRef.current?.setSelection(titleLength, titleLength)
      }, 100)
    } else if (
      currentFocusedField === 'description' &&
      descriptionInputRef.current
    ) {
      setTimeout(() => {
        descriptionInputRef.current?.focus()
        // Move cursor to end of text
        const descLength = (uploadStore.description || '').length
        descriptionInputRef.current?.setSelection(descLength, descLength)
      }, 100)
    }
  }, [uploadStore.currentFocusedField])

  const handleAnimationComplete = () => {
    uiStore.hideUploadAnimationModal()
    router.back()
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '00:00'
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')
    const secs = (seconds % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.neutral200,
          theme.colors.palette.neutral300,
          theme.colors.palette.neutral100,
        ]}
        locations={[0, 0.4, 1]}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <AppHeader
          title="Upload Video"
          showBackButton
          showProfile={false}
          showSearch={false}
        />

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {uploadStore.base64Thumbnail && (
            <View
              style={[
                styles.videoPicker,
                { backgroundColor: theme.colors.palette.neutral300 },
              ]}
            >
              <Image
                source={{ uri: `${uploadStore.base64Thumbnail}` }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>
                  {formatDuration(uploadStore.duration as number)}
                </Text>
              </View>
            </View>
          )}

          <View
            style={[
              styles.inputContainer,
              { backgroundColor: theme.colors.palette.neutral300 },
            ]}
          >
            <TextInput
              ref={titleInputRef}
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="Video Name"
              placeholderTextColor={theme.colors.palette.neutral600}
              value={uploadStore.title as string}
              onChangeText={value => uploadStore.setField('title', value)}
              onFocus={() => uploadStore.setCurrentFocusedField('title')}
            />
          </View>

          <View
            style={[
              styles.inputContainer,
              styles.descriptionContainer,
              { backgroundColor: theme.colors.palette.neutral300 },
            ]}
          >
            <TextInput
              ref={descriptionInputRef}
              style={[
                styles.input,
                styles.descriptionInput,
                { color: theme.colors.text },
              ]}
              placeholder="Description"
              placeholderTextColor={theme.colors.palette.neutral600}
              value={uploadStore.description as string}
              onChangeText={value => uploadStore.setField('description', value)}
              onFocus={() => uploadStore.setCurrentFocusedField('description')}
              multiline
            />
          </View>

          <Text style={[styles.label, { color: theme.colors.text }]}>
            Category
          </Text>
          <View
            style={[
              styles.toggleContainer,
              { backgroundColor: theme.colors.palette.neutral300 },
            ]}
          >
            <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
              Comments enabled
            </Text>
            <Switch
              value={uploadStore.commentsEnabled}
              onValueChange={value =>
                uploadStore.setField('commentsEnabled', value)
              }
              trackColor={{
                false: theme.colors.palette.neutral600,
                true: theme.colors.palette.primary200,
              }}
              thumbColor={theme.colors.palette.neutral100}
            />
          </View>
          <HorizontalFlatList
            data={videoStore.categories}
            keyExtractor={item => `${item.id}`}
            numRows={3}
            renderItem={({ item }) => {
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.categoryItem,
                    { backgroundColor: theme.colors.palette.neutral300 },
                    uploadStore.categoryId === item.id && {
                      backgroundColor: theme.colors.palette.primary200,
                    },
                  ]}
                  onPress={() => {
                    uploadStore.setField('categoryId', item.id)
                  }}
                >
                  <Text
                    style={[styles.categoryText, { color: theme.colors.text }]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )
            }}
            extraData={uploadStore.categoryId}
          />

          <TouchableOpacity
            style={[
              styles.uploadButton,
              { backgroundColor: theme.colors.palette.primary200 },
            ]}
            onPress={() => uploadStore.startUpload()}
            disabled={uploadStore.isUploading}
          >
            <Text style={[styles.buttonText, { color: theme.colors.text }]}>
              Upload Video
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Animated Upload Modal */}
        <Modal
          transparent={true}
          animationType="fade"
          visible={uiStore.showUploadAnimation || uiStore.showUploadSuccess}
        >
          <View style={styles.modalOverlay}>
            <AnimatedUploadSuccess
              isUploading={uploadStore.isUploading}
              showSuccess={uiStore.showUploadSuccess}
              onComplete={handleAnimationComplete}
              onShowSuccess={() => uiStore.showUploadSuccessState()}
            />
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  )
}

// Wrap the component with observer to make it reactive to MobX changes
export default observer(UploadVideoScreen)

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  videoPicker: {
    height: 200,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#1c62ff',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#1c62ff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  descriptionContainer: {
    paddingVertical: 16,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  categoryGrid: {
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 8,
  },
  categoryItem: {
    paddingVertical: 12,
    borderRadius: 20,
    marginHorizontal: 5,
    marginVertical: 5,
    width: 120,
    alignItems: 'center',
    shadowColor: '#1c62ff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#1c62ff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },

  uploadButton: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#1c62ff',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    marginTop: 24,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkContainer: {
    marginBottom: 16,
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
})
