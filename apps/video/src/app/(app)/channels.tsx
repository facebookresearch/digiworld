// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  FlatList,
  View,
  StyleSheet,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, useTheme, useToast } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import LinearGradient from 'react-native-linear-gradient'

import { AppHeader } from '@/components/AppHeader'
import { VideoCardSkeleton } from '@/components/ShimmerPlaceholder'
import { EmptyState } from '@/components/EmptyState'
import { VideoThumbnailImage } from '@/components/VideoImage'
import { useStores } from '@/models/helpers/useStores'
import * as DocumentPicker from 'expo-document-picker'
import * as VideoThumbnails from 'expo-video-thumbnails'
import * as FileSystem from 'expo-file-system'
import getVideoInfo from 'react-native-video-info'
import { router, useFocusEffect } from 'expo-router'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

export default observer(function ChannelsScreen() {
  const { theme } = useTheme()
  const { videoStore, userStore, uploadStore } = useStores()
  const [userVideos, setUserVideos] = useState([])
  const { trackScreenMount } = useInteractionTracking('channels', '/channels')
  const toast = useToast()

  const getDuration = async (uri: string) => {
    try {
      const info = await getVideoInfo.get(uri)

      return info.duration // Already in seconds
    } catch (error) {
      console.error('Video info error:', error)
      throw error
    }
  }

  const fetchUserVideos = async () => {
    const userVideosRes = await videoStore.fetchUserVideos(
      userStore?.user?.id as number,
    )

    const sortedVideos = userVideosRes
      .map((item: any) => item.videos)
      .filter((video: any) => video.status === 'active')
      .sort((a: any, b: any) => {
        if (a.visibility === 'public' && b.visibility !== 'public') return -1
        if (b.visibility === 'public' && a.visibility !== 'public') return 1

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    setUserVideos(sortedVideos)
  }

  useEffect(() => {
    if (userStore.user) {
      fetchUserVideos()
    }
  }, [userStore.user])

  const handleUpload = () => {
    const currentUser = userStore.user
    if (!currentUser) {
      toast.show({
        title: 'Please login to upload video',
        preset: 'error',
        placement: 'top',
      })
    } else {
      handleFilePick()
    }
  }
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'channels',
        route: '/channels',
      })
      fetchUserVideos()
      uploadStore.reset()
      return () => {
        console.log('This route is now unfocused.')
      }
    }, []),
  )

  const handleFilePick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
      copyToCacheDirectory: true,
    })

    if (!result.canceled) {
      const file = result.assets[0]

      // Get thumbnail
      const thumbnailRes = await VideoThumbnails.getThumbnailAsync(file.uri, {
        time: 1000,
        quality: 0.5,
      })

      const base64 = await FileSystem.readAsStringAsync(thumbnailRes.uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      // Load video to get duration
      try {
        const duration = await getDuration(result.assets[0].uri)

        uploadStore.setField(
          'title',
          file.name.split('.').slice(0, -1).join('.'),
        )
        uploadStore.setField(
          'base64Thumbnail',
          `data:image/jpeg;base64,${base64}`,
        )
        uploadStore.setField('fileSize', file.size)
        uploadStore.setField('duration', duration)
        router.push('/UploadVideo')
      } catch (err) {
        console.warn('Error loading video:', err)
      }
    }
  }

  useEffect(() => {
    const loadData = async () => {
      if (userStore.isAuthenticated) {
        await videoStore.loadInitialData()
      }
    }
    loadData()
  }, [userStore.isAuthenticated])

  const formatViews = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  const formatUploadTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    )

    if (diffInHours < 24) {
      return `${diffInHours} hours ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays} days ago`
    }
  }

  const ChannelStatsCard = () => (
    <View
      style={[
        styles.statsCard,
        { backgroundColor: theme.colors.palette.neutral300 },
      ]}
    >
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text
            style={[styles.statNumber, { color: theme.colors.text }]}
            text={userVideos
              .filter((video: any) => video.status === 'active')
              .length?.toString()}
          />
          <Text
            style={[
              styles.statLabel,
              { color: theme.colors.palette.neutral700 },
            ]}
            text="Videos"
          />
        </View>
        <View style={styles.statItem}>
          <Text
            style={[styles.statNumber, { color: theme.colors.text }]}
            text={formatViews(
              userVideos
                .filter((video: any) => video.status === 'active')
                .reduce((sum, video) => sum + video.viewCount, 0),
            )}
          />
          <Text
            style={[
              styles.statLabel,
              { color: theme.colors.palette.neutral700 },
            ]}
            text="Total Views"
          />
        </View>
      </View>
    </View>
  )

  const VideoManagementItem = ({ video }: { video: any }) => (
    <TouchableOpacity
      style={[
        styles.videoItem,
        { backgroundColor: theme.colors.palette.neutral300 },
      ]}
      activeOpacity={0.8}
      onPress={() => router.push(`/video/${video.id}/edit` as any)}
    >
      <VideoThumbnailImage
        entityId={video.id}
        style={{ width: 120, height: 68, borderRadius: 8 }}
        thumbnailUrl={video.thumbnailUrl}
      />

      <View style={styles.videoInfo}>
        <Text
          style={[styles.videoTitle, { color: theme.colors.text }]}
          text={video.title}
          numberOfLines={2}
        />

        <View style={styles.videoMeta}>
          <Text
            style={[
              styles.videoStats,
              { color: theme.colors.palette.neutral700 },
            ]}
            text={`${formatViews(video.viewCount)} views • ${formatUploadTime(video.createdAt)}`}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => router.push(`/video/${video.id}/edit` as any)}
      >
        <Ionicons
          name="create-outline"
          size={20}
          color={theme.colors.palette.primary200}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  )

  const renderVideoItem: ListRenderItem<any> = ({ item }) => (
    <VideoManagementItem video={item} />
  )

  const renderSkeletonItem = ({ index }: { index: number }) => (
    <VideoCardSkeleton key={`skeleton-${index}`} />
  )

  const renderHeader = () => (
    <View>
      <ChannelStatsCard />

      <View style={styles.sectionHeader}>
        <Text
          style={[styles.sectionTitle, { color: theme.colors.text }]}
          text="Your Videos"
        />
        <TouchableOpacity
          style={[
            styles.uploadButton,
            { backgroundColor: theme.colors.palette.primary200 },
          ]}
          activeOpacity={0.8}
          onPress={handleUpload}
        >
          <Ionicons name="add" size={20} color={theme.colors.text} />
          <Text
            style={[styles.uploadButtonText, { color: theme.colors.text }]}
            text="Upload"
          />
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderEmpty = () => (
    <EmptyState
      icon="videocam-outline"
      title={userStore.isAuthenticated ? 'No Videos Yet' : 'Sign In Required'}
      description={
        userStore.isAuthenticated
          ? 'Start creating content by uploading your first video!'
          : 'Sign in to manage your channel and upload videos.'
      }
    />
  )

  if (videoStore.isLoading && userVideos.length === 0) {
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
          <AppHeader title="My Channel" />
          {renderHeader()}
          <FlatList
            data={Array(5).fill(null)}
            renderItem={renderSkeletonItem}
            keyExtractor={(_, index) => `skeleton-${index}`}
            contentContainerStyle={styles.videosContainer}
            ListEmptyComponent={<View />}
            showsVerticalScrollIndicator={false}
          />
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
        <AppHeader title="My Channel" />

        <FlatList
          data={userVideos}
          renderItem={renderVideoItem}
          keyExtractor={item => item?.id?.toString()}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            userVideos.length === 0
              ? styles.emptyContainer
              : styles.videosContainer
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={8}
          windowSize={8}
          initialNumToRender={5}
        />
      </SafeAreaView>
    </View>
  )
})

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
  videosContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statsCard: {
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 16,
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  videoItem: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  videoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 8,
  },
  videoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoStats: {
    fontSize: 13,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  editButton: {
    padding: 8,
    marginLeft: 8,
  },
})
