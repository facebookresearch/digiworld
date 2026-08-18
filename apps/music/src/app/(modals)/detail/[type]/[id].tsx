// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SongImage, AlbumImage, ArtistImage } from '@/components/MusicImage'
import EmptyState from '@/components/Empty'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Text, useAppTheme, useToast } from '@andojo/shared-theme'
import { translate } from '@/i18n/translate'

type EntityType = 'song' | 'album' | 'artist'

const SongItem = observer(
  ({ song, onPress }: { song: any; onPress: () => void }) => {
    const { musicStore } = useStores()
    const artist = musicStore.artists.find((a: any) => a.id === song.artistId)
    const { theme } = useAppTheme()
    const styles = createStyles(theme)

    return (
      <TouchableOpacity style={styles.songItem} onPress={onPress}>
        <SongImage entityId={song.id} style={styles.songImage} />
        <View style={styles.songInfo}>
          <Text style={styles.songTitle}>{song.title}</Text>
          <Text style={styles.songArtist}>{artist?.name}</Text>
        </View>
        <Text style={styles.duration}>
          {Math.floor(song.duration / 60)}:
          {(song.duration % 60).toString().padStart(2, '0')}
        </Text>
      </TouchableOpacity>
    )
  },
)

const DetailScreen = observer(() => {
  const { type, id } = useLocalSearchParams<{
    type: EntityType
    id: string
  }>()
  const { musicStore } = useStores()
  const router = useRouter()
  const toast = useToast()
  const { theme } = useAppTheme()
  const styles = createStyles(theme)
  const { trackScreenMount } = useInteractionTracking(
    'Detail',
    `/(modals)/detail/${type}/${id}`,
  )

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'detail',
        route: `/(modals)/detail/${type}/${id}`,
      })
    }, [type, id]),
  )

  const getEntity = () => {
    switch (type) {
      case 'song':
        return musicStore.songs.find((s: any) => s.id === Number(id))
      case 'album':
        return musicStore.albums.find((a: any) => a.id === Number(id))
      case 'artist':
        return musicStore.artists.find((a: any) => a.id === Number(id))
      default:
        return null
    }
  }

  const getSongs = () => {
    switch (type) {
      case 'song':
        return [getEntity()].filter(Boolean)
      case 'album':
        return musicStore.songs.filter((s: any) => s.albumId === Number(id))
      case 'artist':
        return musicStore.songs.filter((s: any) => s.artistId === Number(id))
      default:
        return []
    }
  }

  const getTitle = () => {
    const entity = getEntity()
    if (!entity) return ''
    if (type === 'song') return entity.title
    if (type === 'album') return entity.title
    if (type === 'artist') return entity.name
    return ''
  }

  const getSubtitle = () => {
    const entity = getEntity()
    if (!entity) return ''
    if (type === 'song') {
      const artist = musicStore.artists.find(
        (a: any) => a.id === entity.artistId,
      )
      return artist?.name || ''
    }
    if (type === 'album') {
      const artist = musicStore.artists.find(
        (a: any) => a.id === entity.artistId,
      )
      return artist?.name || ''
    }
    if (type === 'artist') {
      return `${formatNumber(entity.monthlyListeners)} ${translate('home.monthlyListeners')}`
    }
    return ''
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const handlePlay = async () => {
    const entity = getEntity()
    if (!entity) return

    switch (type) {
      case 'song':
        await musicStore.setCurrentSong(Number(id), 'none')
        break
      case 'album':
        await musicStore.playAlbum(Number(id)).then((res: any) => {
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
        await musicStore.playArtist(Number(id)).then((res: any) => {
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

  const handleSongPress = (song: any) => {
    // router.push(`/(modals)/${song.id}`)
    musicStore.setCurrentSong(song.id, 'none')
  }

  const entity = getEntity()
  const songs = getSongs()

  if (!entity) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.tint} />
      </View>
    )
  }

  const ImageComponent =
    type === 'song' ? SongImage : type === 'album' ? AlbumImage : ArtistImage
  const imageStyle =
    type === 'artist'
      ? [styles.headerImage, styles.artistImage]
      : styles.headerImage

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.palette.primary500, theme.colors.background]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.5 }}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Entity Image */}
        <View style={styles.imageContainer}>
          <ImageComponent entityId={entity.id} style={imageStyle} />
        </View>

        {/* Entity Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.subtitle}>{getSubtitle()}</Text>
        </View>

        {/* Play Button */}
        {songs.length > 0 && (
          <View style={styles.playButtonContainer}>
            <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
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
            <Text style={styles.playButtonSubtext}>
              {translate('common.play')}
            </Text>
          </View>
        )}

        {/* Songs List */}
        {songs.length > 0 ? (
          <ScrollView
            style={styles.songsList}
            contentContainerStyle={styles.songsListContent}
            showsVerticalScrollIndicator={false}
          >
            {songs.map((song: any) => (
              <SongItem
                key={song.id}
                song={song}
                onPress={() => handleSongPress(song)}
              />
            ))}
          </ScrollView>
        ) : (
          <EmptyState
            title={
              type === 'song'
                ? 'No song found'
                : type === 'album'
                  ? 'This album is empty'
                  : 'No songs found for this artist'
            }
          />
        )}
      </View>
    </SafeAreaView>
  )
})

const createStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    closeButton: {
      padding: 8,
    },
    imageContainer: {
      alignItems: 'center',
      marginTop: 20,
    },
    headerImage: {
      width: 200,
      height: 200,
      borderRadius: 12,
      backgroundColor: theme.colors.palette.neutral500,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    artistImage: {
      borderRadius: 100,
    },
    infoContainer: {
      alignItems: 'center',
      marginVertical: 16,
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textDim,
      textAlign: 'center',
    },
    playButtonContainer: {
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 20,
    },
    playButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    playButtonSubtext: {
      color: theme.colors.tint,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 8,
      letterSpacing: 1,
    },
    songsList: {
      flex: 1,
    },
    songsListContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    songItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    songImage: {
      width: 48,
      height: 48,
      borderRadius: 4,
      backgroundColor: theme.colors.palette.neutral500,
    },
    songInfo: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
    },
    songTitle: {
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 4,
      fontWeight: '500',
    },
    songArtist: {
      fontSize: 14,
      color: theme.colors.textDim,
    },
    duration: {
      fontSize: 14,
      color: theme.colors.textDim,
      minWidth: 45,
      textAlign: 'right',
    },
  })

export default DetailScreen
