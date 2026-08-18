// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import LinearGradient from 'react-native-linear-gradient'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Text, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import {
  AppHeader,
  CommentSection,
  FancyAlert,
  HorizontalFlatList,
  VideoThumbnailImage,
} from '@/components'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

const VideoEditScreen = () => {
  const { theme } = useTheme()
  const { videoStore, uiStore } = useStores()
  const { id } = useLocalSearchParams()
  const { trackScreenMount } = useInteractionTracking(
    'editVideo',
    `/video/${id}/edit`,
  )

  // Refs for text inputs
  const titleInputRef = useRef<TextInput>(null)
  const descriptionInputRef = useRef<TextInput>(null)

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'editVideo',
        route: `/video/${id}/edit`,
      })
    }, []),
  )

  // Get form state from store
  const { videoEditForm } = videoStore

  // Get video from store
  const video = videoStore.videos.find(v => v.id === parseInt(id as string))

  // Initialize form with video data
  useEffect(() => {
    if (video) {
      if (!videoStore.videoEditForm.hasInitialised) {
        videoStore.initializeVideoEditForm(video)
      }
    }
    // Reset form and dialogs on unmount
    return () => {
      videoStore.resetVideoEditForm()
      uiStore.resetDialogs()
    }
  }, [video])

  // Handle focus management based on currentFocused field
  useEffect(() => {
    const { currentFocused } = videoStore.videoEditForm
    if (currentFocused === 'title' && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus()
        // Move cursor to end of text
        const titleLength = videoStore.videoEditForm.title.length
        titleInputRef.current?.setSelection(titleLength, titleLength)
      }, 100)
    } else if (
      currentFocused === 'description' &&
      descriptionInputRef.current
    ) {
      setTimeout(() => {
        descriptionInputRef.current?.focus()
        // Move cursor to end of text
        const descLength = videoStore.videoEditForm.description.length
        descriptionInputRef.current?.setSelection(descLength, descLength)
      }, 100)
    }
  }, [videoStore.videoEditForm.currentFocused])

  const handleSave = async () => {
    if (!video) return

    try {
      await videoStore.updateVideo(video.id, {
        title: videoEditForm.title,
        description: videoEditForm.description,
        categoryId: videoEditForm.categoryId,
        isCommentsEnabled: videoEditForm.commentsEnabled,
      })

      uiStore.showSaveVideoAlert()
    } catch (error) {
      console.error('Error saving video:', error)
      videoStore.error = 'Failed to save video details'
    }
  }

  const handleDelete = async () => {
    if (!video) return

    try {
      await videoStore.deleteVideo(video.id)
      router.back()
    } catch (error) {
      console.error('Error deleting video:', error)
      videoStore.error = 'Failed to delete video'
    }
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '00:00'
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')
    const secs = (seconds % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }

  const formatViews = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  if (videoStore.isLoading) {
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
            title="Edit Video"
            showBackButton={true}
            showSearch={false}
            showProfile={false}
          />
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Loading video details...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  if (!video) {
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
            title="Edit Video"
            showBackButton={true}
            showSearch={false}
            showProfile={false}
          />
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Video not found
            </Text>
          </View>
        </SafeAreaView>
      </View>
    )
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
          title="Edit Video"
          showBackButton={true}
          showSearch={false}
          showProfile={false}
          rightComponent={
            <Pressable
              style={[
                styles.deleteButton,
                { backgroundColor: theme.colors.palette.angry200 },
              ]}
              onPress={() => uiStore.showDeleteVideoAlert()}
            >
              <Ionicons name="trash" size={20} color={theme.colors.text} />
            </Pressable>
          }
        />

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Video Preview */}
          <View
            style={[
              styles.videoPreview,
              { backgroundColor: theme.colors.palette.neutral300 },
            ]}
          >
            <VideoThumbnailImage
              entityId={video.id}
              defaultSource={video.thumbnailUrl}
              style={styles.videoPreview}
              // @ts-ignore
              thumbnailUrl={video.thumbnailUrl}
            />
            <View style={styles.videoPlaceholder}>
              <Ionicons
                name="play-circle"
                size={60}
                color={theme.colors.palette.neutral600}
              />
            </View>
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {formatDuration(video.duration)}
              </Text>
            </View>
            <View style={styles.videoStats}>
              <Text
                style={[styles.statsTextNormal, { color: theme.colors.text }]}
              >
                {formatViews(video.viewCount)} views
              </Text>
            </View>
          </View>

          {/* Video Details Form */}
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: theme.colors.palette.neutral300 },
            ]}
          >
            <TextInput
              ref={titleInputRef}
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="Video Title"
              placeholderTextColor={theme.colors.palette.neutral600}
              value={videoEditForm.title}
              onChangeText={videoStore.setVideoEditTitle}
              onFocus={() => videoStore.setCurrentFocusedField('title')}
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
              value={videoEditForm.description}
              onChangeText={videoStore.setVideoEditDescription}
              onFocus={() => videoStore.setCurrentFocusedField('description')}
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
              value={videoEditForm.commentsEnabled}
              onValueChange={videoStore.setVideoEditCommentsEnabled}
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
            style={{ marginBottom: 20 }}
            renderItem={({ item }) => {
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.categoryItem,
                    { backgroundColor: theme.colors.palette.neutral300 },
                    videoEditForm.categoryId === item.id && {
                      backgroundColor: theme.colors.palette.primary200,
                    },
                  ]}
                  onPress={() => {
                    // uploadStore.setField('categoryId', item.id)
                    videoStore.setVideoEditCategoryId(item.id)
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
            extraData={videoEditForm.categoryId}
          />

          <CommentSection
            videoId={Number(id)}
            isCommentsEnabled={video.isCommentsEnabled}
            isVideoOwner
            isModerating
            useTextActions={false}
            renderAsScrollableContent={true}
          />
          {/* Save Button */}
          <Pressable
            style={[
              styles.saveButton,
              { backgroundColor: theme.colors.palette.primary200 },
              videoStore.isLoading && styles.disabledButton,
            ]}
            onPress={handleSave}
            disabled={videoStore.isLoading}
          >
            <Text style={[styles.buttonText, { color: theme.colors.text }]}>
              {videoStore.isLoading ? 'Saving...' : 'Save Changes'}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      {/* Delete Confirmation Alert */}
      <FancyAlert
        visible={uiStore.deleteVideoAlertVisible}
        preset="delete"
        title="Delete Video"
        message="Are you sure you want to delete this video? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onClose={() => uiStore.hideDeleteVideoAlert()}
      />

      {/* Save Success Alert */}
      <FancyAlert
        visible={uiStore.saveVideoAlertVisible}
        preset="success"
        title="Success"
        message="Video details updated successfully!"
        confirmText="OK"
        onConfirm={() => {
          uiStore.hideSaveVideoAlert()
          router.back()
        }}
        onClose={() => uiStore.hideSaveVideoAlert()}
      />
    </View>
  )
}

export default observer(VideoEditScreen)
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  videoPreview: {
    height: 200,
    borderRadius: 16,
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
    position: 'relative',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  videoStats: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  statsTextNormal: {
    fontSize: 12,
    fontWeight: '500',
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
  categoryContainer: {
    marginBottom: 24,
  },
  categoryRow: {
    paddingHorizontal: 8,
    gap: 8,
    marginBottom: 8,
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
  saveButton: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1c62ff',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF4444',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
})
