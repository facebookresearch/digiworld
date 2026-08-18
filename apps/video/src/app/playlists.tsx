import React, { useEffect } from 'react'
import { View, StyleSheet, FlatList, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import LinearGradient from 'react-native-linear-gradient'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { router, useFocusEffect } from 'expo-router'
import { Text, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { AppHeader, EmptyState, FancyAlert } from '@/components'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

const PlaylistsScreen = observer(() => {
  const { theme } = useTheme()
  const { playlistStore, userStore } = useStores()
  const { trackScreenMount } = useInteractionTracking('playlists', '/playlists')

  useEffect(() => {
    if (userStore.isAuthenticated) {
      playlistStore.loadUserPlaylists()
    }
  }, [userStore.isAuthenticated])

  // Reset UI state when screen goes out of focus
  useFocusEffect(
    React.useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'profile',
        route: '/profile',
      })
      return () => {
        playlistStore.resetPlaylistUI()
      }
    }, []),
  )

  const handleCreatePlaylist = async () => {
    const name = playlistStore.playlistUI.newPlaylistName.trim()
    const description = playlistStore.playlistUI.newPlaylistDescription.trim()

    if (!name) return

    try {
      await playlistStore.createPlaylist(name, description || undefined)
      playlistStore.hideCreatePlaylistModal()
    } catch (error) {
      console.error('Error creating playlist:', error)
    }
  }

  const handleDeletePlaylist = async () => {
    if (!playlistStore.playlistUI.selectedPlaylistId) return

    try {
      await playlistStore.deletePlaylist(
        playlistStore.playlistUI.selectedPlaylistId,
      )
      playlistStore.hideDeletePlaylistAlert()
    } catch (error) {
      console.error('Error deleting playlist:', error)
    }
  }

  const formatVideoCount = (count: number) => {
    return count === 1 ? '1 video' : `${count} videos`
  }

  const renderPlaylistItem = ({ item }: { item: any }) => (
    <Pressable
      style={[
        styles.playlistItem,
        { backgroundColor: theme.colors.palette.neutral400 },
      ]}
      onPress={() => router.push(`/playlist/${item.id}`)}
    >
      <View style={styles.playlistThumbnail}>
        <LinearGradient
          colors={['#1c62ff', '#5743ca', '#8d3ef6']}
          style={styles.playlistIcon}
        >
          <Ionicons name="list" size={24} color={theme.colors.text} />
        </LinearGradient>
      </View>

      <View style={styles.playlistInfo}>
        <Text
          style={[styles.playlistTitle, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>

        <View style={styles.playlistMeta}>
          <Text
            style={[
              styles.playlistStats,
              { color: theme.colors.palette.neutral700 },
            ]}
          >
            {formatVideoCount(item.videoIds?.length || 0)}
          </Text>
          {item.shuffle && (
            <View style={styles.shuffleBadge}>
              <Ionicons
                name="shuffle"
                size={12}
                color={theme.colors.palette.primary200}
              />
              <Text
                style={[
                  styles.shuffleText,
                  { color: theme.colors.palette.primary200 },
                ]}
              >
                Shuffle
              </Text>
            </View>
          )}
        </View>

        {item.description && (
          <Text
            style={[
              styles.playlistDescription,
              { color: theme.colors.palette.neutral600 },
            ]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}
      </View>

      <Pressable
        style={styles.moreButton}
        onPress={() => playlistStore.showDeletePlaylistAlert(item.id)}
      >
        <Ionicons
          name="trash-outline"
          size={18}
          color={theme.colors.palette.angry200}
        />
      </Pressable>
    </Pressable>
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
            title="Playlists"
            showBackButton={true}
            showSearch={false}
            showProfile={false}
          />
          <EmptyState
            icon="list-outline"
            title="Sign In Required"
            description="Sign in to create and manage your playlists."
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
          title="Playlists"
          showBackButton={true}
          showSearch={false}
          showProfile={false}
          rightComponent={
            <Pressable
              style={[
                styles.createButton,
                { backgroundColor: theme.colors.palette.primary200 },
              ]}
              onPress={() => playlistStore.showCreatePlaylistModal()}
            >
              <Ionicons name="add" size={20} color={theme.colors.text} />
            </Pressable>
          }
        />

        {playlistStore.playlists.length === 0 ? (
          <EmptyState
            icon="list-outline"
            title="No Playlists Yet"
            description="Create your first playlist to organize your favorite videos!"
            actionText="Create Playlist"
            onAction={() => playlistStore.showCreatePlaylistModal()}
          />
        ) : (
          <FlatList
            data={playlistStore.playlists}
            renderItem={renderPlaylistItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>

      {/* Create Playlist Modal */}
      <FancyAlert
        visible={playlistStore.playlistUI.showCreateModal}
        title="Create Playlist"
        message="Enter details for your new playlist"
        onClose={() => playlistStore.hideCreatePlaylistModal()}
        onConfirm={handleCreatePlaylist}
        confirmText="Create"
        cancelText="Cancel"
        focusedInputKey={playlistStore.playlistUI.currentFocusedTextField}
        inputs={[
          {
            key: 'name',
            placeholder: 'Playlist name',
            value: playlistStore.playlistUI.newPlaylistName,
            onChangeText: playlistStore.setNewPlaylistName,
            onFocus: () => playlistStore.setCurrentFocusedTextField('name'),
          },
          {
            key: 'description',
            placeholder: 'Description (optional)',
            value: playlistStore.playlistUI.newPlaylistDescription,
            onChangeText: playlistStore.setNewPlaylistDescription,
            onFocus: () =>
              playlistStore.setCurrentFocusedTextField('description'),
            multiline: true,
            numberOfLines: 3,
          },
        ]}
      />

      {/* Delete Confirmation Alert */}
      <FancyAlert
        visible={playlistStore.playlistUI.showDeleteAlert}
        preset="delete"
        title="Delete Playlist"
        message="Are you sure you want to delete this playlist? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeletePlaylist}
        onClose={() => playlistStore.hideDeletePlaylistAlert()}
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
  listContainer: {
    padding: 16,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1c62ff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  playlistItem: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
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
  playlistThumbnail: {
    marginRight: 16,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  playlistMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  playlistStats: {
    fontSize: 12,
    marginRight: 12,
  },
  shuffleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shuffleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  playlistDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  moreButton: {
    padding: 8,
  },
  modalContainer: {
    paddingHorizontal: 20,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
  },
})

export default PlaylistsScreen
