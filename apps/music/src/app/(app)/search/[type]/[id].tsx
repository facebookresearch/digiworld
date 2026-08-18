import React, { useCallback } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { Text, useAppTheme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ArtistImage,
  AlbumImage,
  CategoryImage,
  SongImage,
} from '@/components/MusicImage'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { translate } from '@/i18n'

type ResultType = 'category' | 'artist' | 'album' | 'song' | 'search'

const EmptyState = ({ type }: { type: ResultType }) => {
  const { theme } = useAppTheme()
  const styles = createStyles(theme)

  const getMessage = () => {
    switch (type) {
      case 'artist':
        return 'No songs found for this artist'
      case 'album':
        return 'This album is empty'
      case 'category':
        return 'No songs in this category'
      case 'search':
        return 'No results found'
      default:
        return 'No songs available'
    }
  }

  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="musical-notes" size={48} color={theme.colors.textDim} />
      <Text style={styles.emptyText}>{getMessage()}</Text>
    </View>
  )
}

const HeaderImage = ({
  type,
  image,
}: {
  type: ResultType
  image?: string | number
}) => {
  const { theme } = useAppTheme()
  const styles = createStyles(theme)
  const getImageComponent = () => {
    const imageProps = {
      entityId: image?.toString() || '',
      style:
        type === 'artist'
          ? [styles.headerImage, styles.artistImage]
          : styles.headerImage,
    }

    switch (type) {
      case 'artist':
        return <ArtistImage {...imageProps} />
      case 'album':
        return <AlbumImage {...imageProps} />
      case 'category':
        return <CategoryImage {...imageProps} />
      case 'song':
        return <SongImage {...imageProps} />
      case 'search':
        return <CategoryImage {...imageProps} />
      default:
        return <SongImage {...imageProps} />
    }
  }

  return getImageComponent()
}

const PlayButton = ({ onPress }: { onPress: () => void }) => {
  const { theme } = useAppTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.playButtonContainer}>
      <TouchableOpacity style={styles.playButton} onPress={onPress}>
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
      <Text style={styles.playButtonSubtext}>{translate('common.play')}</Text>
    </View>
  )
}

const SongItem = ({ item, onPress }: { item: any; onPress: () => void }) => {
  const { theme } = useAppTheme()
  const styles = createStyles(theme)

  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <SongImage entityId={item.id} style={styles.songCoverArt} />
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.itemSubtitle} numberOfLines={1}>
          {item.artist?.name}
        </Text>
      </View>
      <View style={styles.songDuration}>
        <Text style={styles.durationText}>
          {Math.floor(item.duration / 60)}:
          {(item.duration % 60).toString().padStart(2, '0')}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const ResultsScreen = observer(() => {
  const { type, id, query } = useLocalSearchParams<{
    type: ResultType
    id: string
    query?: string
  }>()
  const { musicStore } = useStores()
  const { songs, artists, albums, isLoading } = musicStore
  const router = useRouter()
  const { theme } = useAppTheme()
  const styles = createStyles(theme)
  const { trackScreenMount } = useInteractionTracking(
    'Search',
    `/search/${type}/${id}`,
  )

  // useEffect(() => {
  //   trackScreenMount()
  // }, [])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'search',
        route: `/search/${type}/${id}`,
      })
    }, []),
  )

  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()

  const getResults = () => {
    if (type === 'category') {
      const category = musicStore.categories.find(
        (c: any) => c.id === Number(id),
      )
      const title = capitalize(category?.name || '')
      return {
        songs: songs.filter((s: any) =>
          s.categories.includes(category?.categoryId || ''),
        ),
        title,
        image: category?.id,
      }
    }

    if (type === 'artist') {
      const artist = artists.find((a: any) => a.id === Number(id))
      return {
        songs: songs.filter((s: any) => s.artistId === Number(id)),
        title: artist?.name || 'Artist',
        image: artist?.id,
      }
    }

    if (type === 'album') {
      const album = albums.find((a: any) => a.id === Number(id))
      return {
        songs: songs.filter((s: any) => s.albumId === Number(id)),
        title: album?.title || 'Album',
        image: album?.id,
      }
    }

    if (type === 'search') {
      const title = query || 'Search Results'
      return {
        songs: musicStore.searchResultSongs,
        title,
        image: undefined,
      }
    }

    return { songs: [], title: '', image: undefined }
  }

  const results = getResults()

  const handleSongPress = (song: any) => {
    router.push(`/(modals)/${song.id}`)
  }

  const handlePlayAll = async () => {
    if (results.songs.length === 0) return
    const firstSong = results.songs[0]
    await musicStore.setCurrentSong(firstSong.id, 'category', Number(id))
    switch (type) {
      case 'album':
        await musicStore.playAlbum(Number(id))
        break
      case 'artist':
        await musicStore.playArtist(Number(id))
        break
      case 'category':
        break
    }
  }

  const renderSongItem = ({ item }: { item: any }) => (
    <SongItem item={item} onPress={() => handleSongPress(item)} />
  )

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.tint} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.palette.primary500, theme.colors.background]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.5 }}
        />

        <View style={styles.header}>
          <HeaderImage type={type} image={results.image} />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {results.title}
            </Text>
            <Text style={styles.songCount}>
              {results.songs.length === 1
                ? translate('common.songs.one')
                : translate('common.songs.other', {
                    count: results.songs.length,
                  })}
            </Text>
          </View>
          {results.songs.length > 0 && <PlayButton onPress={handlePlayAll} />}
        </View>

        {results.songs.length > 0 ? (
          <FlatList
            data={results.songs}
            renderItem={renderSongItem}
            keyExtractor={item => `song-${item.id}`}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <EmptyState type={type} />
        )}
      </View>
    </SafeAreaView>
  )
})

const IMAGE_SIZE = 160

const createStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
    },
    header: {
      marginTop: 20,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    headerImage: {
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
      borderRadius: 12,
      marginBottom: 16,
      backgroundColor: theme.colors.palette.neutral500,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    artistImage: {
      borderRadius: IMAGE_SIZE / 2,
    },
    imagePlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerContent: {
      alignItems: 'center',
      marginVertical: 16,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      paddingHorizontal: 12,
    },
    songCount: {
      fontSize: 14,
      color: theme.colors.textDim,
      marginTop: 4,
    },
    list: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    songCoverArt: {
      width: 48,
      height: 48,
      borderRadius: 4,
      backgroundColor: theme.colors.palette.neutral500,
    },
    itemContent: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
    },
    itemTitle: {
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 4,
      fontWeight: '500',
    },
    itemSubtitle: {
      fontSize: 14,
      color: theme.colors.textDim,
    },
    songDuration: {
      paddingLeft: 8,
      minWidth: 45,
      alignItems: 'flex-end',
    },
    durationText: {
      fontSize: 14,
      color: theme.colors.textDim,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 100,
    },
    emptyText: {
      color: theme.colors.textDim,
      fontSize: 16,
      marginTop: 16,
    },
    playButtonContainer: {
      alignItems: 'center',
      marginTop: 8,
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
  })

export default ResultsScreen
