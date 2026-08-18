// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useEffect, useState } from 'react'
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import LinearGradient from 'react-native-linear-gradient'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { Text, useTheme } from '@andojo/shared-theme'
import { AppHeader, EmptyState, HorizontalVideoCard } from '@/components'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

const WatchHistoryScreen = observer(() => {
  const { theme } = useTheme()
  const { videoStore, userStore } = useStores()
  const { trackScreenMount } = useInteractionTracking(
    'watchHistory',
    '/watch-history',
  )
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  useEffect(() => {
    if (userStore.isAuthenticated) {
      videoStore.loadInitialData()
    }
  }, [userStore.isAuthenticated])

  const getWatchedVideos = () => {
    const videos = videoStore.watchHistory
      .map(historyEntry => {
        const video = videoStore.videos.find(v => v.id === historyEntry.videoId)
        return video ? { ...video, watchedAt: historyEntry.watchedAt } : null
      })
      .filter(Boolean)
      .filter((video: any) => video.status === 'active') // Only show active videos in history

    // Sort based on selected order
    if (sortOrder === 'oldest') {
      return [...videos].reverse()
    }
    return videos
  }

  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'newest' ? 'oldest' : 'newest'))
  }

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timeStamp: Date.now(),
        screen: 'watchHistory',
        route: '/watch-history',
      })
      getWatchedVideos()
    }, []),
  )

  const watchedVideos = getWatchedVideos()

  const renderVideoItem = ({ item }: { item: any }) => (
    <HorizontalVideoCard video={item} showWatchTime={true} />
  )

  if (!userStore.isAuthenticated) {
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
            title="Watch History"
            showBackButton={true}
            showSearch={false}
            showProfile={false}
          />
          <EmptyState
            icon="time-outline"
            title="Sign In Required"
            description="Sign in to view your watch history and track the videos you've watched."
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
        <AppHeader
          title="Watch History"
          showBackButton={true}
          showSearch={false}
          showProfile={false}
        />

        {watchedVideos.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="No Watch History"
            description="Videos you watch will appear here. Start watching to build your history!"
          />
        ) : (
          <>
            <View
              style={[
                styles.sortContainer,
                { backgroundColor: theme.colors.palette.neutral200 },
              ]}
            >
              <View style={styles.sortHeader}>
                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    { backgroundColor: theme.colors.palette.neutral300 },
                  ]}
                  onPress={toggleSortOrder}
                >
                  <Ionicons
                    name={sortOrder === 'newest' ? 'arrow-down' : 'arrow-up'}
                    size={20}
                    color={theme.colors.text}
                  />
                  <Text
                    style={[styles.sortText, { color: theme.colors.text }]}
                    text={
                      sortOrder === 'newest' ? 'Newest First' : 'Oldest First'
                    }
                  />
                </TouchableOpacity>
                <View style={styles.historyInfo}>
                  <Text
                    style={[
                      styles.infoText,
                      { color: theme.colors.palette.neutral700 },
                    ]}
                  >
                    <Text style={{ fontWeight: '600' }}>Newest: </Text>
                    {watchedVideos[0]?.title}
                  </Text>
                  <Text
                    style={[
                      styles.infoText,
                      { color: theme.colors.palette.neutral700 },
                    ]}
                  >
                    <Text style={{ fontWeight: '600' }}>Oldest: </Text>
                    {watchedVideos[watchedVideos.length - 1]?.title}
                  </Text>
                </View>
              </View>
            </View>
            <FlatList
              data={watchedVideos}
              renderItem={renderVideoItem}
              keyExtractor={item => `${item.id}-${item.watchedAt}`}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
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
  sortContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortHeader: {
    gap: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sortText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  historyInfo: {
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  listContainer: {
    padding: 16,
  },
})

export default WatchHistoryScreen
