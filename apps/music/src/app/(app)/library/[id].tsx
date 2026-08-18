import React, { useCallback, useState } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  PlaylistImage,
  SongImage,
  AlbumImage,
  ArtistImage,
} from '@/components/MusicImage'
import EmptyState from '@/components/Empty'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Text, useToast, useAppTheme } from '@andojo/shared-theme'
import { queries } from '@/db/queries'
import { translate } from '@/i18n/translate'

const REPEAT_MODES = ['none', 'repeat-all', 'repeat-one'] as const
type EntityType = 'playlist' | 'album' | 'artist'

const EntityHeader = observer(
  ({ entity, type }: { entity: any; type: EntityType }) => {
    const { musicStore } = useStores()
    const toast = useToast()
    const { theme } = useAppTheme()
    const styles = createStyles(theme)
    const [playbackSettings, setPlaybackSettings] = useState<any>({
      shuffle: 0,
      repeatMode: 'none',
    })
    const { trackScreenMount } = useInteractionTracking(
      type.charAt(0).toUpperCase() + type.slice(1),
      `/library/${entity.id}?type=${type}`,
    )

    useFocusEffect(
      useCallback(() => {
        trackScreenMount({
          timestamp: Date.now(),
          screen: 'library',
          route: `/library/${entity.id}?type=${type}`,
        })
        fetchSettings()
      }, []),
    )

    const fetchSettings = async () => {
      const res = await queries.getPlaybackSettings(type, entity.id)
      console.log(res)
      setPlaybackSettings(res)
    }

    const handlePlayAll = async () => {
      switch (type) {
        case 'playlist':
          await musicStore.playPlaylist(entity.id).then((res: any) => {
            if (!res.success) {
              toast.show({
                title: translate('library.details.errors.playFailed', {
                  type: 'playlist',
                }),
                placement: 'top',
                duration: 3000,
              })
            }
          })
          break
        case 'album':
          await musicStore.playAlbum(entity.id).then((res: any) => {
            if (!res.success) {
              toast.show({
                title: translate('library.details.errors.playFailed', {
                  type: 'album',
                }),
                placement: 'top',
                duration: 3000,
              })
            }
          })
          break
        case 'artist':
          await musicStore.playArtist(entity.id).then((res: any) => {
            if (!res.success) {
              toast.show({
                title: translate('library.details.errors.playFailed', {
                  type: 'artist',
                }),
                placement: 'top',
                duration: 3000,
              })
            }
          })
          break
      }
    }

    const handleToggleShuffle = async () => {
      try {
        const currentMode = playbackSettings?.shuffle || 0
        const nextMode = currentMode === 1 ? 0 : 1
        await queries.updatePlaybackSettings(type, entity.id, {
          shuffle: nextMode === 1,
        })
        setPlaybackSettings({
          ...playbackSettings,
          shuffle: nextMode,
        })
      } catch (error) {
        console.error('Failed to toggle shuffle:', error)
      }
    }

    const handleToggleRepeat = async () => {
      try {
        const currentMode = playbackSettings?.repeatMode || 'none'
        const nextMode =
          REPEAT_MODES[
            (REPEAT_MODES.indexOf(currentMode) + 1) % REPEAT_MODES.length
          ]
        await queries.updatePlaybackSettings(type, entity.id, {
          repeatMode: nextMode,
        })
        setPlaybackSettings({
          ...playbackSettings,
          repeatMode: nextMode,
        })
      } catch (error) {
        console.error('Failed to toggle repeat:', error)
        toast.show({
          title: translate('library.details.errors.toggleRepeatFailed'),
          placement: 'top',
          duration: 3000,
        })
      }
    }

    const EntityImage = () => {
      switch (type) {
        case 'playlist':
          return (
            <PlaylistImage entityId={entity.id} style={styles.entityImage} />
          )
        case 'album':
          return <AlbumImage entityId={entity.id} style={styles.entityImage} />
        case 'artist':
          return <ArtistImage entityId={entity.id} style={styles.entityImage} />
      }
    }

    const getSongCount = () => {
      switch (type) {
        case 'playlist':
          return entity.songIds?.length || 0
        case 'album':
          return musicStore.songs.filter(
            (s: { albumId: number }) => s.albumId === entity.id,
          ).length
        case 'artist':
          return musicStore.songs.filter(
            (s: { artistId: number }) => s.artistId === entity.id,
          ).length
      }
    }

    return (
      <View style={styles.header}>
        <EntityImage />
        <View style={styles.headerContent}>
          <Text style={styles.entityName}>
            {type === 'playlist'
              ? entity.name
              : type === 'album'
                ? entity.title
                : entity.name}
          </Text>
          <Text style={styles.entityInfo}>
            {getSongCount() > 0
              ? getSongCount() === 1
                ? translate('common.songs_one', { count: getSongCount() })
                : translate('common.songs_other', { count: getSongCount() })
              : translate('common.songs_zero')}
            {type === 'album' &&
              entity.releaseDate &&
              ` • ${translate('library.details.releaseYear', {
                year: new Date(entity.releaseDate).getFullYear(),
              })}`}
          </Text>
          {type === 'artist' && (
            <Text style={styles.monthlyListeners}>
              {translate('library.details.monthlyListeners', {
                count: entity.monthlyListeners.toLocaleString(),
              })}
            </Text>
          )}
        </View>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.playButton} onPress={handlePlayAll}>
            <LinearGradient
              colors={[theme.colors.tint, theme.colors.palette.primary100]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Ionicons
              name="play"
              size={28}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
          <View style={styles.settingsControls}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                playbackSettings?.shuffle === 1 && styles.activeControl,
              ]}
              onPress={handleToggleShuffle}
            >
              <Ionicons
                name="shuffle"
                size={24}
                color={
                  playbackSettings?.shuffle === 1
                    ? theme.colors.tint
                    : theme.colors.text
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.controlButton,
                playbackSettings?.repeatMode !== 'none' && styles.activeControl,
              ]}
              onPress={handleToggleRepeat}
            >
              <Ionicons
                name={
                  playbackSettings?.repeatMode === 'repeat-one'
                    ? 'infinite'
                    : 'repeat'
                }
                size={24}
                color={
                  playbackSettings?.repeatMode !== 'none'
                    ? theme.colors.tint
                    : theme.colors.text
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  },
)

const SongItem = observer(
  ({ song, entity, type }: { song: any; entity: any; type: EntityType }) => {
    const { musicStore } = useStores()
    const toast = useToast()
    const { theme } = useAppTheme()
    const styles = createStyles(theme)

    const handleSongPress = () => {
      musicStore.setCurrentSong(song.id, type, entity.id)
    }

    const handleRemoveSong = async () => {
      if (type === 'playlist') {
        try {
          await musicStore.removeSongFromPlaylist(entity.id, song.id)
        } catch (error) {
          console.error('Failed to remove song:', error)
          toast.show({
            title: translate('library.details.errors.removeSongFailed'),
            placement: 'top',
            duration: 3000,
          })
        }
      }
    }

    return (
      <TouchableOpacity style={styles.songItem} onPress={handleSongPress}>
        <SongImage entityId={song.id} style={styles.songImage} />
        <View style={styles.songInfo}>
          <Text style={styles.songTitle}>{song.title}</Text>
          <Text style={styles.songArtist}>
            {musicStore.artists.find((a: any) => a.id === song.artistId)?.name}
          </Text>
        </View>
        <View style={styles.songActions}>
          <Text style={styles.duration}>
            {translate('library.details.duration', {
              minutes: Math.floor(song.duration / 60),
              seconds: (song.duration % 60).toString().padStart(2, '0'),
            })}
          </Text>
          {type === 'playlist' && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={handleRemoveSong}
            >
              <Ionicons
                name="remove-circle-outline"
                size={24}
                color={theme.colors.error}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    )
  },
)

export default observer(function EntityScreen() {
  const { id, type = 'playlist' } = useLocalSearchParams<{
    id: string
    type: EntityType
  }>()
  const { musicStore } = useStores()
  const { theme } = useAppTheme()
  const styles = createStyles(theme)

  const rawType = type.split('?')[0]
  console.log('rawType', rawType)

  const entity =
    rawType === 'playlist'
      ? musicStore.playlists.find((p: any) => p.id === Number(id))
      : rawType === 'album'
        ? musicStore.albums.find((a: any) => a.id === Number(id))
        : musicStore.artists.find((a: any) => a.id === Number(id))

  const songs =
    rawType === 'playlist'
      ? musicStore.songs.filter((s: any) => entity?.songIds?.includes(s.id))
      : rawType === 'album'
        ? musicStore.songs.filter((s: any) => s.albumId === Number(id))
        : musicStore.songs.filter((s: any) => s.artistId === Number(id))

  if (!entity) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.tint} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.palette.primary500, theme.colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
      />
      <View style={styles.songsList}>
        <FlatList
          data={songs}
          renderItem={({ item }) => (
            <SongItem
              song={item}
              entity={entity}
              type={rawType as EntityType}
            />
          )}
          keyExtractor={item => item.id.toString()}
          ListHeaderComponent={
            <EntityHeader entity={entity} type={rawType as EntityType} />
          }
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <EmptyState
              title={'No songs found'}
              subtitle={
                type === 'playlist'
                  ? 'Why not add some songs and make it playful?'
                  : 'No songs available at the moment.'
              }
            />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </View>
    </SafeAreaView>
  )
})

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: 20,
      alignItems: 'center',
    },
    entityImage: {
      width: 200,
      height: 200,
      borderRadius: 12,
      marginBottom: 20,
      backgroundColor: theme.colors.palette.neutral500,
    },
    headerContent: {
      alignItems: 'center',
      marginBottom: 20,
    },
    entityName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    entityInfo: {
      fontSize: 16,
      color: theme.colors.textDim,
    },
    monthlyListeners: {
      fontSize: 14,
      color: theme.colors.textDim,
      marginTop: 4,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
    },
    playButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    settingsControls: {
      flexDirection: 'row',
      gap: 16,
    },
    controlButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.overlay20,
    },
    activeControl: {
      backgroundColor: theme.colors.palette.primary500,
    },
    addSongsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
      marginHorizontal: 20,
      marginBottom: 20,
      backgroundColor: theme.colors.palette.overlay20,
      borderRadius: 8,
    },
    addSongsText: {
      color: theme.colors.tint,
      fontSize: 16,
      fontWeight: '500',
    },
    songsList: {
      paddingHorizontal: 20,
    },
    songItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 12,
    },
    songImage: {
      width: 48,
      height: 48,
      borderRadius: 4,
      backgroundColor: theme.colors.palette.neutral500,
    },
    songInfo: {
      flex: 1,
    },
    songTitle: {
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 4,
    },
    songArtist: {
      fontSize: 14,
      color: theme.colors.textDim,
    },
    songActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    duration: {
      fontSize: 14,
      color: theme.colors.textDim,
    },
    removeButton: {
      padding: 4,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 50,
    },
    emptyText: {
      color: theme.colors.textDim,
      fontSize: 16,
      marginTop: 16,
      textAlign: 'center',
    },
    emptyText2: {
      color: theme.colors.textDim,
      fontSize: 16,
      textAlign: 'center',
    },
  })
