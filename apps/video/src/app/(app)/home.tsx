import { FlatList, View, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect } from 'react'
import LinearGradient from 'react-native-linear-gradient'

import { AppHeader, RecommendationFeed } from '@/components'
import { EmptyState } from '@/components/EmptyState'
import { useStores } from '@/models/helpers/useStores'
import { useFocusEffect, useRouter } from 'expo-router'
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'

export default observer(function HomeScreen() {
  const { theme } = useTheme()
  const { videoStore, uploadStore, playlistStore } = useStores()
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('home', '/home')

  useEffect(() => {
    const loadData = async () => {
      await videoStore.loadInitialData()
    }
    loadData()
    uploadStore.reset()
    playlistStore.loadUserPlaylists()
    playlistStore.loadAllPlaylists()
  }, [])

  useFocusEffect(
    useCallback(() => {
      // Track screen mount when focused
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'home',
        route: '/home',
      })
      return () => {
        const interaction = getLatestInteraction()
        console.log('From home', interaction)
      }
    }, []),
  )

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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

  const renderEmpty = () => (
    <EmptyState
      icon="videocam-outline"
      title="No Videos Found"
      description="There are no videos available at the moment. Check back later!"
    />
  )

  if (videoStore.isLoading && videoStore.videos.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader />
      </SafeAreaView>
    )
  }

  const recommendationFeeds = videoStore.recommendationFeeds

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
        <AppHeader />
        <FlatList
          data={recommendationFeeds}
          keyExtractor={feed => feed.id.toString()}
          renderItem={({ item }) => (
            <RecommendationFeed
              title={item.title}
              videos={item.videos.map((video: any) => ({
                id: video.id.toString(),
                title: video.title,
                channelName: video.channelName || 'Unknown Channel',
                channelId: video.channelId,
                views: formatViews(video.viewCount),
                uploadTime: formatUploadTime(video.createdAt),
                duration: formatDuration(video.duration),
                viewCount: video.viewCount,
                thumbnailUrl:
                  video.thumbnailUrl ||
                  `https://picsum.photos/400/225?random=${video.id}`,
                channelAvatar:
                  video.channelAvatar ||
                  `https://picsum.photos/40/40?random=${video.channelId || video.id}`,
              }))}
              onVideoPress={video => {
                router.push(`/video/${video.id}`)
              }}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.recommendationsContainer}
          ListEmptyComponent={() => renderEmpty()}
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
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  recommendationsContainer: {
    paddingBottom: 20,
  },
})
