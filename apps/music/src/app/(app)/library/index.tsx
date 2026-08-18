import React, { useMemo, useCallback } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  FlatList,
  ListRenderItem,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import LinearGradient from 'react-native-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { MusicImage } from '@/components/MusicImage'
import { router, useFocusEffect } from 'expo-router'
import { formatNumber } from '@/utils/numberformat'
import LibraryItemSkeleton from '@/components/Shimmer/LibraryItem'
import EmptyState from '@/components/Empty'
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'
import { Text as CustomText, useAppTheme, useToast } from '@andojo/shared-theme'
import { EntityType } from '@andojo/shared-asset-management'
import { translate } from '@/i18n/translate'

// Constants
const LIBRARY_FILTERS = [
  { id: 'playlists' as const, name: 'Playlists' },
  { id: 'artists' as const, name: 'Artists' },
  { id: 'albums' as const, name: 'Albums' },
  { id: 'songs' as const, name: 'Songs' },
  { id: 'history' as const, name: 'History' },
] as const

// Types
type Artist = {
  id: number
  name: string
  monthlyListeners: number
  artistId?: number
}

type Song = {
  id: number
  title: string
  artistId: number
  artistName: string
}

type FilterType = 'playlists' | 'artists' | 'albums' | 'songs' | 'history'

type EmptyMessages = {
  [K in FilterType]: {
    title: string
    subtitle: string
  }
}

const LibraryScreen = observer(() => {
  const { userStore, musicStore } = useStores()
  const { libraryFilter } = userStore
  const { playlists, artists, albums, songs, isLoading } = musicStore
  const toast = useToast()
  const recentlyPlayed = userStore.recentlyPlayed || []
  const { theme } = useAppTheme()
  const styles = createStyles(theme)

  const { trackScreenMount } = useInteractionTracking('Library', '/library')

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'library',
        route: '/library',
      })
      setTimeout(() => {
        // setLibraryFilter('playlists')
        const interaction = getLatestInteraction()
        console.log('interaction', interaction)
      }, 1000)
    }, []),
  )

  // Handlers for modals
  const handleCreatePlaylist = useCallback(async () => {
    if (!userStore.newPlaylistName.trim()) return
    try {
      await musicStore.createPlaylist({
        name: userStore.newPlaylistName,
        userId: userStore.user?.id || 1,
      })
      userStore.setCreatePlaylistModalVisible(false)
    } catch (error) {
      console.error('Failed to create playlist:', error)
    }
  }, [userStore.newPlaylistName, musicStore, userStore])

  const handleDeletePlaylist = useCallback(async () => {
    if (!userStore.selectedPlaylistId) return
    try {
      await musicStore.deletePlaylist(userStore.selectedPlaylistId)
      userStore.setDeletePlaylistModalVisible(false)
      userStore.setSelectedPlaylistId(null)
    } catch (error) {
      console.error('Failed to delete playlist:', error)
    }
  }, [userStore.selectedPlaylistId, musicStore, userStore])

  const showContextMenu = useCallback(
    (type: 'playlist' | 'song', id: number) => {
      if (type === 'playlist') {
        userStore.setSelectedPlaylistId(id)
        userStore.setDeletePlaylistModalVisible(true)
      } else {
        userStore.setSelectedSongId(id)
        userStore.setAddToPlaylistModalVisible(true)
      }
    },
    [musicStore, userStore],
  )

  // Memoize filtered data based on current filter
  const filteredData = useMemo(() => {
    switch (libraryFilter) {
      case 'playlists':
        return playlists
      case 'artists':
        return artists
      case 'albums':
        return albums
      case 'songs':
        return songs
      case 'history':
        return recentlyPlayed
      default:
        return []
    }
  }, [libraryFilter, playlists, artists, albums, songs, recentlyPlayed])

  // Memoize empty state messages
  const emptyMessages = useMemo(
    () =>
      ({
        playlists: {
          title: translate('library.emptyMessages.playlists.title'),
          subtitle: translate('library.emptyMessages.playlists.subtitle'),
        },
        artists: {
          title: translate('library.emptyMessages.artists.title'),
          subtitle: translate('library.emptyMessages.artists.subtitle'),
        },
        albums: {
          title: translate('library.emptyMessages.albums.title'),
          subtitle: translate('library.emptyMessages.albums.subtitle'),
        },
        songs: {
          title: translate('library.emptyMessages.songs.title'),
          subtitle: translate('library.emptyMessages.songs.subtitle'),
        },
        history: {
          title: translate('library.emptyMessages.history.title'),
          subtitle: translate('library.emptyMessages.history.subtitle'),
        },
      }) as EmptyMessages,
    [],
  )

  const handlePlay = (entityType: Omit<FilterType, 'history'>, entity: any) => {
    switch (entityType) {
      case 'playlists':
        musicStore.playPlaylist(entity.id).then((result: any) => {
          if (!result.success) {
            toast.show({
              title: 'No playable songs for this playlist',
              placement: 'top',
              duration: 3000,
            })
          }
        })
        break
      case 'songs':
        musicStore.setCurrentSong(entity.id, 'search')
        break
      case 'artists':
        musicStore.playArtist(entity.id).then((result: any) => {
          if (!result.success) {
            toast.show({
              title: 'No playable songs for this artist',
              placement: 'top',
              duration: 3000,
            })
          }
        })
        break
      case 'albums':
        musicStore.playAlbum(entity.id).then((result: any) => {
          if (!result.success) {
            toast.show({
              title: 'No playable songs for this album',
              placement: 'top',
              duration: 3000,
            })
          }
        })
        break
    }
  }

  const controlButton = (
    entityType: Omit<FilterType, 'history'>,
    entity: any,
  ) => (
    <TouchableOpacity
      style={styles.playButton}
      onPress={() => handlePlay(entityType, entity)}
    >
      <Ionicons name="play-circle" size={36} color={theme.colors.tint} />
    </TouchableOpacity>
  )

  // Memoize render item function
  const renderItem: ListRenderItem<any> = useCallback(
    ({ item }) => {
      const artist = musicStore.artists.find(
        (a: Artist) => a.id === item.artistId,
      )
      // @ts-ignore
      const albumSongs = musicStore.songs.filter(
        (s: Song) => s.albumId === item.id,
      )
      const song = musicStore.songs.find((s: Song) => s.id === item.songId)

      switch (libraryFilter) {
        case 'playlists':
          return (
            <TouchableOpacity
              style={styles.item}
              onPress={() => router.push(`/library/${item.id}?type=playlist`)}
            >
              <MusicImage
                style={styles.image}
                entityType={EntityType.PLAYLISTS}
                entityId={item.id}
              />
              <View style={styles.itemContent}>
                <CustomText style={styles.title} numberOfLines={2}>
                  {item.name}
                </CustomText>
                <CustomText style={styles.subtitle} numberOfLines={2}>
                  {item.songIds?.length || 0} {translate('library.songs')}
                </CustomText>
              </View>
              <View style={styles.itemActions}>
                {controlButton('playlists', item)}
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => showContextMenu('playlist', item.id)}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={24}
                    color={theme.colors.text}
                    testID="playlist-menu-button"
                  />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )
        case 'artists':
          return (
            <TouchableOpacity
              style={styles.item}
              onPress={() => router.push(`/library/${item.id}?type=artist`)}
            >
              <MusicImage
                style={styles.image}
                entityType={EntityType.ARTISTS}
                entityId={item.id}
              />
              <View style={styles.itemContent}>
                <CustomText style={styles.title} numberOfLines={2}>
                  {item.name}
                </CustomText>
                <CustomText style={styles.subtitle} numberOfLines={2}>
                  {translate('library.details.monthlyListeners', {
                    count: formatNumber(Number(item.monthlyListeners || 0)),
                  })}
                </CustomText>
              </View>
              <View style={styles.itemActions}>
                {controlButton('artists', item)}
              </View>
            </TouchableOpacity>
          )
        case 'albums':
          return (
            <TouchableOpacity
              style={styles.item}
              onPress={() => router.push(`/library/${item.id}?type=album`)}
            >
              <MusicImage
                style={styles.image}
                entityType={EntityType.ALBUMS}
                entityId={item.id}
              />
              <View style={styles.itemContent}>
                <CustomText style={styles.title} numberOfLines={2}>
                  {item.title}
                </CustomText>
                <CustomText style={styles.subtitle} numberOfLines={2}>
                  {translate('common.songs', {
                    count: albumSongs?.length || 0,
                  })}
                </CustomText>
              </View>
              <View style={styles.itemActions}>
                {controlButton('albums', item)}
              </View>
            </TouchableOpacity>
          )
        case 'songs':
          return (
            <TouchableOpacity
              style={styles.item}
              onPress={() => musicStore.setCurrentSong(item.id, 'none')}
            >
              <MusicImage
                style={styles.image}
                entityType={EntityType.SONGS}
                entityId={item.id}
              />
              <View style={styles.itemContent}>
                <CustomText style={styles.title} numberOfLines={2}>
                  {item.title}
                </CustomText>
                <CustomText style={styles.subtitle} numberOfLines={2}>
                  {artist?.name}
                </CustomText>
              </View>
              <View style={styles.itemActions}>
                {controlButton('songs', item)}
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => showContextMenu('song', item.id)}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={24}
                    color={theme.colors.text}
                    testID="song-menu-button"
                  />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )
        case 'history':
          if (!song) return null
          return (
            <TouchableOpacity
              style={styles.item}
              onPress={() => {
                console.log('song', song)
                musicStore.setCurrentSong(song.id, 'search')
              }}
            >
              <MusicImage
                style={styles.image}
                entityType={EntityType.SONGS}
                entityId={song.id}
              />
              <View style={styles.itemContent}>
                <CustomText style={styles.title} numberOfLines={2}>
                  {song.title}
                </CustomText>
                <CustomText style={styles.subtitle} numberOfLines={2}>
                  {song.artistName}
                </CustomText>
              </View>
              <View style={styles.itemActions}>
                {controlButton('songs', song)}
              </View>
            </TouchableOpacity>
          )
        default:
          return null
      }
    },
    [libraryFilter, musicStore, showContextMenu, styles],
  )

  // Memoize key extractor
  const keyExtractor = useCallback(
    (item: any) => {
      if (libraryFilter === 'history') {
        return `${item.songId}-${item.playedAt}`
      }
      return item.id.toString()
    },
    [libraryFilter],
  )

  useFocusEffect(
    useCallback(() => {
      return () => {
        userStore.clearPlaylistInfo()
      }
    }, []),
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <LinearGradient
        colors={[theme.colors.palette.primary500, theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.headerGradient}
      />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.profileButton}>
            <Image
              source={
                userStore.user?.profilePicture
                  ? { uri: userStore.user.profilePicture }
                  : require('../../../../assets/images/app-icon-all.png')
              }
              style={styles.profileImage}
            />
          </TouchableOpacity>
          <CustomText style={styles.headerTitle}>
            {translate('library.title')}
          </CustomText>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => router.push('/search')}
          >
            <Ionicons name="search" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.filters}>
        <FlatList
          data={LIBRARY_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                libraryFilter === item.id && styles.filterButtonActive,
              ]}
              onPress={() => userStore.setLibraryFilter(item.id)}
            >
              <CustomText
                style={styles.filterText}
                {...(libraryFilter === item.id && {
                  style: styles.filterTextActive,
                })}
              >
                {item.name}
              </CustomText>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
        />
      </View>

      {libraryFilter === 'playlists' && (
        <TouchableOpacity
          style={styles.createPlaylistButton}
          onPress={() => userStore.setCreatePlaylistModalVisible(true)}
        >
          <Ionicons
            name="add-circle-outline"
            size={24}
            color={theme.colors.tint}
          />
          <CustomText style={styles.createPlaylistText}>
            {translate('library.createPlaylist')}
          </CustomText>
        </TouchableOpacity>
      )}

      {isLoading ? (
        <View style={styles.content} testID="library-loading-indicator">
          {Array.from({ length: 10 }).map((_, index) => (
            <LibraryItemSkeleton key={index} />
          ))}
        </View>
      ) : filteredData && filteredData?.length === 0 ? (
        <EmptyState
          title={emptyMessages[libraryFilter as FilterType].title}
          subtitle={emptyMessages[libraryFilter as FilterType].subtitle}
        />
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          key={`${libraryFilter}-${filteredData?.length || 0}`}
        />
      )}

      {/* Create Playlist Modal */}
      <Modal
        visible={userStore.isCreatePlaylistModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => userStore.setCreatePlaylistModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <CustomText style={styles.modalTitle}>
              {translate('library.createNewPlaylist')}
            </CustomText>
            <TextInput
              style={styles.input}
              placeholder={translate('library.playlistName')}
              placeholderTextColor={theme.colors.textDim}
              value={userStore.newPlaylistName}
              onChangeText={text => userStore.setNewPlaylistName(text)}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => userStore.setCreatePlaylistModalVisible(false)}
              >
                <CustomText style={styles.buttonTextLight}>
                  {translate('common.cancel')}
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreatePlaylist}
              >
                <CustomText
                  style={styles.buttonTextDark}
                  testID="create-playlist-modal-button"
                >
                  {translate('library.createPlaylist')}
                </CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Playlist Modal */}
      <Modal
        visible={userStore.isDeletePlaylistModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => userStore.setDeletePlaylistModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <CustomText style={styles.modalTitle}>
              {translate('library.deletePlaylist')}
            </CustomText>
            <CustomText style={styles.modalText}>
              {translate('library.confirmDelete')}
            </CustomText>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => userStore.setDeletePlaylistModalVisible(false)}
              >
                <CustomText style={styles.buttonTextLight}>
                  {translate('common.cancel')}
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeletePlaylist}
              >
                <CustomText style={styles.buttonTextDark}>
                  {translate('common.delete')}
                </CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
})

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    headerGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 200,
      zIndex: 0,
    },
    header: {
      paddingHorizontal: 20,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 20,
      marginBottom: 24,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    profileButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
    },
    profileImage: {
      width: '100%',
      height: '100%',
    },
    searchButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filters: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    filterButton: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 10,
      backgroundColor: theme.colors.palette.overlay20,
    },
    filterButtonActive: {
      backgroundColor: theme.colors.tint,
    },
    filterText: {
      color: theme.colors.text,
      fontSize: 16,
    },
    filterTextActive: {
      color: theme.colors.palette.neutral100,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 100,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    image: {
      width: 64,
      height: 64,
      borderRadius: 8,
    },
    itemContent: {
      marginLeft: 15,
      flex: 1,
    },
    itemActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    playButton: {
      marginRight: 10,
    },
    menuButton: {
      padding: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
      width: '70%',
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textDim,
      width: '70%',
    },
    createPlaylistButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      marginBottom: 20,
    },
    createPlaylistText: {
      color: theme.colors.tint,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.palette.overlay50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.palette.neutral300,
      borderRadius: 16,
      padding: 20,
      width: '90%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    modalText: {
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    input: {
      backgroundColor: theme.colors.palette.neutral600,
      borderRadius: 8,
      padding: 12,
      color: theme.colors.text,
      fontSize: 16,
      marginBottom: 20,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    modalButton: {
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 8,
      marginHorizontal: 8,
    },
    cancelButton: {
      backgroundColor: theme.colors.tint,
    },
    createButton: {
      backgroundColor: theme.colors.tint,
    },
    deleteButton: {
      backgroundColor: theme.colors.error,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    buttonTextLight: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    buttonTextDark: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      color: theme.colors.palette.neutral100,
    },
    playlistList: {
      maxHeight: 300,
      marginBottom: 20,
    },
    playlistItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral600,
    },
    playlistItemText: {
      color: theme.colors.text,
      fontSize: 16,
    },
  })

export default LibraryScreen
