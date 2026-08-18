// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  Switch,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import LinearGradient from 'react-native-linear-gradient'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Text, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import {
  AppHeader,
  EmptyState,
  FancyAlert,
  HorizontalVideoCard,
} from '@/components'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

const PlaylistDetailScreen = observer(() => {
  const { theme } = useTheme()
  const { videoStore, playlistStore, userStore } = useStores()
  const { id } = useLocalSearchParams()
  const { trackScreenMount } = useInteractionTracking(
    'playlist',
    `/playlist/${id}`,
  )

  const playlistId = parseInt(id as string)

  const playlist =
    playlistStore.playlists.find(p => p.id === playlistId) ||
    playlistStore.allPlaylists.find(p => p.id === playlistId)

  const isOwner = playlist?.userId === userStore.user?.id

  useEffect(() => {
    if (userStore.isAuthenticated && !playlist) {
      playlistStore.loadUserPlaylists()
    }
  }, [userStore.isAuthenticated, playlist])

  // Reset UI state when screen goes out of focus
  useFocusEffect(
    React.useCallback(() => {
      playlistStore.clearCurrentPlaylist()
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'profile',
        route: '/profile',
      })
      return () => {
        playlistStore.hideRemoveVideoAlert()
      }
    }, []),
  )

  const getPlaylistVideos = () => {
    if (!playlist?.videoIds) return []

    return playlist.videoIds
      .map(videoId => videoStore.videos.find(v => v.id === videoId))
      .filter(Boolean)
  }

  const playlistVideos = getPlaylistVideos()

  const handlePlayAll = async () => {
    if (playlist && playlistVideos.length > 0) {
      await videoStore.playPlaylist(playlist.id)
      router.push(`/video/${playlistVideos[0].id}`)
    }
  }

  const handleRemoveVideo = async () => {
    if (!playlistStore.playlistUI.selectedVideoId || !playlist) return

    try {
      await playlistStore.removeVideoFromPlaylist(
        playlist.id,
        playlistStore.playlistUI.selectedVideoId,
      )
      playlistStore.hideRemoveVideoAlert()
    } catch (error) {
      console.error('Error removing video from playlist:', error)
    }
  }

  const handleToggleShuffle = async (enabled: boolean) => {
    if (!playlist) return

    try {
      await playlistStore.updatePlaylist(playlist.id, { shuffle: enabled })
    } catch (error) {
      console.error('Error updating playlist shuffle:', error)
    }
  }

  const renderVideoItem = ({ item }: { item: any }) => (
    <View style={styles.videoItemContainer}>
      {/* <View style={styles.indexContainer}>
        <Text
          style={[styles.indexText, { color: theme.colors.palette.neutral600 }]}
        >
          {index + 1}
        </Text>
      </View> */}

      <View style={styles.cardContainer}>
        <HorizontalVideoCard
          video={item}
          onPress={async () => {
            await videoStore.playPlaylist(playlist!.id, item.id)
            router.push(`/video/${item.id}`)
          }}
          onMorePress={() => {
            if (isOwner) {
              playlistStore.showRemoveVideoAlert(item.id)
            }
          }}
          hidePlaylistMenu={false}
        />
      </View>
    </View>
  )

  if (!playlist) {
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
            title="Playlist"
            showBackButton={true}
            showSearch={false}
            showProfile={false}
          />
          <EmptyState
            icon="list-outline"
            title="Playlist Not Found"
            description="The playlist you're looking for doesn't exist or has been deleted."
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
          title={playlist.name}
          showBackButton={true}
          showSearch={false}
          showProfile={false}
        />

        <View style={styles.content}>
          {/* Playlist Header */}
          <View
            style={[
              styles.playlistHeader,
              { backgroundColor: theme.colors.palette.neutral300 },
            ]}
          >
            <View style={styles.playlistIcon}>
              <LinearGradient
                colors={['#1c62ff', '#5743ca', '#8d3ef6']}
                style={styles.iconGradient}
              >
                <Ionicons name="list" size={32} color={theme.colors.text} />
              </LinearGradient>
            </View>

            <View style={styles.playlistMeta}>
              <Text
                style={[styles.playlistTitle, { color: theme.colors.text }]}
              >
                {playlist.name}
              </Text>
              <Text
                style={[
                  styles.playlistStats,
                  { color: theme.colors.palette.neutral700 },
                ]}
              >
                {playlistVideos.length}{' '}
                {playlistVideos.length === 1 ? 'video' : 'videos'}
              </Text>
              {playlist.description && (
                <Text
                  style={[
                    styles.playlistDescription,
                    { color: theme.colors.palette.neutral600 },
                  ]}
                >
                  {playlist.description}
                </Text>
              )}
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={[
                styles.playAllButton,
                { backgroundColor: theme.colors.palette.primary200 },
                playlistVideos.length === 0 && styles.disabledButton,
              ]}
              onPress={handlePlayAll}
              disabled={playlistVideos.length === 0}
            >
              <Ionicons name="play" size={20} color={theme.colors.text} />
              <Text style={[styles.playAllText, { color: theme.colors.text }]}>
                Play All
              </Text>
            </TouchableOpacity>

            <View style={styles.shuffleContainer}>
              <Text style={[styles.shuffleLabel, { color: theme.colors.text }]}>
                Shuffle
              </Text>
              <Switch
                value={playlist.shuffle}
                onValueChange={handleToggleShuffle}
                trackColor={{
                  false: theme.colors.palette.neutral600,
                  true: theme.colors.palette.primary200,
                }}
                thumbColor={theme.colors.palette.neutral100}
                disabled={!isOwner}
              />
            </View>
          </View>

          {/* Video List */}
          {playlistVideos.length === 0 ? (
            <EmptyState
              icon="videocam-outline"
              title="No Videos in Playlist"
              description="Add videos to this playlist to start building your collection!"
            />
          ) : (
            <FlatList
              data={playlistVideos}
              renderItem={renderVideoItem}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </SafeAreaView>

      {/* Remove Video Alert */}
      <FancyAlert
        visible={playlistStore.playlistUI.showRemoveVideoAlert}
        preset="warning"
        title="Remove Video"
        message="Are you sure you want to remove this video from the playlist?"
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleRemoveVideo}
        onClose={() => playlistStore.hideRemoveVideoAlert()}
      />
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
  content: {
    flex: 1,
  },
  playlistHeader: {
    flexDirection: 'row',
    padding: 20,
    margin: 16,
    borderRadius: 16,
    shadowColor: '#1c62ff',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  playlistIcon: {
    marginRight: 16,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  playlistTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  playlistStats: {
    fontSize: 14,
    marginBottom: 4,
  },
  playlistDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
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
    opacity: 0.5,
  },
  playAllText: {
    fontSize: 16,
    fontWeight: '600',
  },
  shuffleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shuffleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  videoItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  indexContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 8,
  },
  indexText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardContainer: {
    flex: 1,
  },
})

export default PlaylistDetailScreen
