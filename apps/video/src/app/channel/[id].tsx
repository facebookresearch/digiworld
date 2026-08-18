import React, { useEffect, useState, useCallback } from 'react'
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import LinearGradient from 'react-native-linear-gradient'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Text, useTheme, useToast } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import {
  AppHeader,
  EmptyState,
  VideoThumbnailImage,
  ImagePlaceholder,
} from '@/components'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
// import { queries } from '@/db/queries'

const ChannelProfileScreen = observer(() => {
  const { theme } = useTheme()
  const { videoStore, userStore } = useStores()
  const { id } = useLocalSearchParams()
  const toast = useToast()
  const { trackScreenMount } = useInteractionTracking(
    'channel',
    `/channel/${id}`,
  )

  const channelId = parseInt(id as string)
  const [channel, setChannel] = useState<any>(null)
  const [channelVideos, setChannelVideos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // const [isSubscribed, setIsSubscribed] = useState(false)

  const isOwnChannel =
    userStore.user && channel && channel.userId === userStore.user.id

  // useEffect(() => {
  //   if (!userStore.isAuthenticated || !channel || isOwnChannel) {
  //     setIsSubscribed(false)
  //     return
  //   }

  //   const subscriptions = videoStore.userSubscriptions || []

  //   // The query returns { channel: {...} } structure
  //   // Check if any subscription has a matching channel ID
  //   const subscribed = subscriptions.some((sub: any) => {
  //     // Handle both possible structures
  //     const subChannelId = sub.channel?.id ?? sub.channelId ?? sub.id
  //     // Ensure both are numbers for comparison
  //     return Number(subChannelId) === Number(channelId)
  //   })

  //   setIsSubscribed(subscribed)
  // }, [videoStore.userSubscriptions, channelId, userStore.isAuthenticated, channel, isOwnChannel])

  useEffect(() => {
    const loadChannelData = async () => {
      try {
        setIsLoading(true)
        // if (userStore.isAuthenticated && userStore.user) {
        //   await videoStore.loadInitialData({ skipRecommendationFeeds: true })
        // }

        // Fetch channel data
        const channelData = await videoStore.fetchChannelById(channelId)
        if (channelData) {
          setChannel(channelData)

          // Fetch videos for this channel
          const videos = await videoStore.fetchVideosByChannelId(channelId)
          setChannelVideos(videos)

          // if (userStore.isAuthenticated && userStore.user && channelData.userId !== userStore.user.id) {
          //   const subscribed = await queries.checkSubscriptionStatus(userStore.user.id, channelId)
          //   setIsSubscribed(subscribed)
          // }
        }
      } catch (error) {
        console.error('Error loading channel data:', error)
        toast.show({
          title: 'Failed to load channel',
          preset: 'error',
          placement: 'top',
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (channelId) {
      loadChannelData()
    }
  }, [channelId])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'channel',
        route: `/channel/${id}`,
      })
      // if (userStore.isAuthenticated && userStore.user && channelId) {
      //   videoStore.loadSubscriptions()
      // }
    }, [id]),
  )

  // const handleSubscribe = async () => {
  //   if (!userStore.isAuthenticated) {
  //     toast.show({
  //       title: 'Please sign in to subscribe',
  //       preset: 'error',
  //       placement: 'top',
  //     })
  //     return
  //   }

  //   const currentSubscriptionStatus = isSubscribed

  //   try {
  //     if (currentSubscriptionStatus) {
  //       await videoStore.unsubscribeChannel(channelId)
  //       toast.show({
  //         title: 'Unsubscribed',
  //         preset: 'success',
  //       })
  //     } else {
  //       await videoStore.subscribeChannel(channelId)
  //       toast.show({
  //         title: 'Subscribed',
  //         preset: 'success',
  //       })
  //     }
  //     // Refresh channel data to update subscriber count
  //     const channelData = await videoStore.fetchChannelById(channelId)
  //     if (channelData) {
  //       setChannel(channelData)
  //     }
  //   } catch (error) {
  //     console.error('Error toggling subscription:', error)
  //     toast.show({
  //       title: 'Failed to update subscription',
  //       preset: 'error',
  //       placement: 'top',
  //     })
  //   }
  // }

  const formatSubscriberCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
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

  const ChannelStatsCard = () => {
    if (!channel) return null

    return (
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
              text={channelVideos.length?.toString()}
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
                channelVideos.reduce((sum, video) => sum + video.viewCount, 0),
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
          <View style={styles.statItem}>
            <Text
              style={[styles.statNumber, { color: theme.colors.text }]}
              text={formatSubscriberCount(channel.subscriberCount || 0)}
            />
            <Text
              style={[
                styles.statLabel,
                { color: theme.colors.palette.neutral700 },
              ]}
              text="Subscribers"
            />
          </View>
        </View>
      </View>
    )
  }

  const VideoItem = ({ video }: { video: any }) => (
    <TouchableOpacity
      style={[
        styles.videoItem,
        { backgroundColor: theme.colors.palette.neutral300 },
      ]}
      activeOpacity={0.8}
      onPress={() => router.push(`/video/${video.id}`)}
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

      {isOwnChannel && (
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
      )}
    </TouchableOpacity>
  )

  const renderVideoItem = ({ item }: { item: any }) => (
    <VideoItem video={item} />
  )

  const renderHeader = () => {
    if (!channel) return null

    return (
      <View>
        {/* Channel Header Section */}
        <View style={styles.channelHeaderSection}>
          <View style={styles.avatarContainer}>
            <ImagePlaceholder
              width={80}
              height={80}
              borderRadius={40}
              type="avatar"
              fallbackText={channel.name}
              source={channel.avatar ? { uri: channel.avatar } : undefined}
            />
          </View>

          <View style={styles.channelDetails}>
            <Text
              style={[styles.channelName, { color: theme.colors.text }]}
              text={channel.name}
            />
            {channel.description && (
              <Text
                style={[
                  styles.channelDescription,
                  { color: theme.colors.palette.neutral700 },
                ]}
                text={channel.description}
                numberOfLines={2}
              />
            )}
          </View>
        </View>

        {/* Stats Card */}
        <ChannelStatsCard />

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {isOwnChannel && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.palette.primary200 },
              ]}
              onPress={() => router.push('/(app)/channels')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={theme.colors.text}
              />
              <Text
                style={[styles.actionButtonText, { color: theme.colors.text }]}
                text="Manage Channel"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text
            style={[styles.sectionTitle, { color: theme.colors.text }]}
            text={isOwnChannel ? 'Your Videos' : 'Videos'}
          />
        </View>
      </View>
    )
  }

  if (isLoading) {
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
          <AppHeader title="Channel" showBackButton />
          <EmptyState
            icon="tv-outline"
            title="Loading channel..."
            description="Please wait"
          />
        </SafeAreaView>
      </View>
    )
  }

  if (!channel) {
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
          <AppHeader title="Channel" showBackButton />
          <EmptyState
            icon="tv-outline"
            title="Channel not found"
            description="This channel does not exist or has been removed"
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
        <AppHeader title={channel.name} showBackButton />

        <FlatList
          data={channelVideos}
          renderItem={renderVideoItem}
          keyExtractor={item => item.id.toString()}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <EmptyState
              icon="videocam-off-outline"
              title="No videos yet"
              description={
                isOwnChannel
                  ? 'Start creating content by uploading your first video!'
                  : "This channel hasn't uploaded any videos"
              }
            />
          }
          contentContainerStyle={
            channelVideos.length === 0
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
  channelHeaderSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 16,
  },
  channelDetails: {
    flex: 1,
  },
  channelName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  channelDescription: {
    fontSize: 14,
    lineHeight: 20,
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
  actionSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
  videosContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 16,
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
  editButton: {
    padding: 8,
    marginLeft: 8,
  },
})

export default ChannelProfileScreen
