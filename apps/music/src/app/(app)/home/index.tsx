import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native'
import { Text, useAppTheme } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import LinearGradient from 'react-native-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useEffect } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { AlbumImage, ArtistImage, SongImage } from '@/components/MusicImage'
import { formatNumber } from '@/utils/numberformat'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { translate } from '@/i18n/translate'

export default observer(function HomeScreen() {
  const { userStore, musicStore } = useStores()
  const userId = userStore.user?.id
  const currentSong = musicStore.currentSong
  const isPlaying = musicStore.playbackState.isPlaying
  const { theme } = useAppTheme()
  const colors = theme.colors
  const styles = createStyles(theme)

  const { trackScreenMount } = useInteractionTracking('Home', '/home')

  useEffect(() => {
    if (!musicStore.songs.length || !musicStore.albums.length) {
      musicStore.loadInitialData()
    }
    if (userId) {
      musicStore.fetchUserPlaylists(userId)
    }
    musicStore.loadInitialData()
  }, [userId])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'home',
        route: '/home',
      })
    }, []),
  )

  const getGreeting = () => {
    const name = userStore.user?.username.split(' ')[0]
    const hour = new Date().getHours()
    if (hour < 12) return `Good morning, ${name}!`
    if (hour < 18) return `Good afternoon, ${name}!`
    return `Good evening, ${name}!`
  }

  const renderTopAlbums = () => {
    if (musicStore.isLoading) {
      return (
        <ActivityIndicator style={styles.loader} color={theme.colors.tint} />
      )
    }

    const topAlbums = [...musicStore.albums]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10)

    if (!topAlbums.length) return null

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{translate('home.topAlbums')}</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          data={topAlbums}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item: album }) => (
            <TouchableOpacity
              style={styles.albumItem}
              onPress={() => {
                router.push(`/(modals)/detail/album/${album.id}`)
              }}
            >
              <AlbumImage entityId={album.id} style={styles.albumImage} />
              <Text style={styles.albumTitle}>{album.title}</Text>
              <Text style={styles.albumInfo}>
                {
                  musicStore.artists.find((a: any) => a.id === album.artistId)
                    ?.name
                }{' '}
                • {new Date(album.releaseDate).getFullYear()}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    )
  }

  const renderNewReleases = () => {
    if (musicStore.isLoading) return null

    const newReleases = [...musicStore.albums]
      .sort(
        (a, b) =>
          new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(),
      )
      .slice(0, 10)

    if (!newReleases.length) return null

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{translate('home.newReleases')}</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          data={newReleases}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item: album }) => (
            <TouchableOpacity
              style={styles.albumItem}
              onPress={() => {
                router.push(`/(modals)/detail/album/${album.id}`)
              }}
            >
              <AlbumImage entityId={album.id} style={styles.albumImage} />
              <Text style={styles.albumTitle}>{album.title}</Text>
              <Text style={styles.albumInfo}>
                {
                  musicStore.artists.find((a: any) => a.id === album.artistId)
                    ?.name
                }
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    )
  }

  const renderTrendingArtists = () => {
    if (musicStore.isLoading) return null

    const trendingArtists = [...musicStore.artists]
      .sort((a, b) => b.monthlyListeners - a.monthlyListeners)
      .slice(0, 10)

    if (!trendingArtists.length) return null

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {translate('home.trendingArtists')}
        </Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          data={trendingArtists}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item: artist }) => (
            <TouchableOpacity
              style={styles.artistItem}
              onPress={() => {
                router.push(`/(modals)/detail/artist/${artist.id}`)
              }}
            >
              <ArtistImage entityId={artist.id} style={styles.artistImage} />
              <Text style={styles.artistName}>{artist.name}</Text>
              <Text style={styles.artistInfo}>
                {/* @ts-ignore */}
                {formatNumber(artist.monthlyListeners)}{' '}
                {translate('home.monthlyListeners')}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    )
  }

  const renderMoodBasedAlbums = () => {
    if (musicStore.isLoading) return null

    // Get a random mood from available categories
    const moods = Array.from(
      new Set(
        musicStore.albums.flatMap((album: any) =>
          typeof album.categories === 'string'
            ? JSON.parse(album.categories)
            : album.categories,
        ),
      ),
    )
    const randomMood = moods[Math.floor(Math.random() * moods.length)]

    if (!randomMood) return null

    const moodAlbums = musicStore.albums
      .filter((album: any) => {
        const categories =
          typeof album.categories === 'string'
            ? JSON.parse(album.categories)
            : album.categories
        return categories.includes(randomMood)
      })
      .slice(0, 10)

    if (!moodAlbums.length) return null

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {translate('home.moods.perfectFor', { mood: randomMood })}
        </Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          data={moodAlbums}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item: album }) => (
            <TouchableOpacity
              style={styles.albumItem}
              onPress={() => {
                router.push(`/(modals)/detail/album/${album.id}`)
              }}
            >
              <AlbumImage entityId={album.id} style={styles.albumImage} />
              <Text style={styles.albumTitle}>{album.title}</Text>
              <Text style={styles.albumInfo}>
                {
                  musicStore.artists.find((a: any) => a.id === album.artistId)
                    ?.name
                }
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    )
  }

  const renderRecentlyPlayed = () => {
    if (!userStore?.recentlyPlayed.length) return null

    const recentSongs = userStore.recentlyPlayed
      .map((entry: any) =>
        musicStore.songs.find((s: any) => s.id === entry.songId),
      )
      .filter(
        (song: any): song is NonNullable<(typeof musicStore.songs)[number]> =>
          !!song,
      )
    if (!recentSongs.length) return null

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {translate('home.recentlyPlayed')}
        </Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          data={recentSongs}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item: song }) => {
            const isCurrentSong = currentSong?.id === song.id
            const showPause = isCurrentSong && isPlaying

            return (
              <TouchableOpacity
                style={styles.songItem}
                onPress={() => {
                  router.push(`/(modals)/detail/song/${song.id}`)
                }}
              >
                <View style={styles.songImageContainer}>
                  <SongImage entityId={song.id} style={styles.songImage} />
                  <TouchableOpacity
                    style={styles.songPlayButton}
                    testID={`song-play-button-${song.id}`}
                    onPress={e => {
                      e?.stopPropagation?.()
                      if (isCurrentSong) {
                        // Toggle play/pause if it's the current song
                        if (isPlaying) {
                          musicStore.pause()
                        } else {
                          musicStore.togglePlayback()
                        }
                      } else {
                        // Play new song if it's different
                        musicStore.setCurrentSong(song.id, 'none')
                      }
                    }}
                  >
                    <Ionicons
                      name={showPause ? 'pause-circle' : 'play-circle'}
                      size={40}
                      color={colors.palette.primary200}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {song.title}
                </Text>
                <Text style={styles.songInfo} numberOfLines={1}>
                  {
                    musicStore.artists.find((a: any) => a.id === song.artistId)
                      ?.name
                  }
                </Text>
              </TouchableOpacity>
            )
          }}
        />
      </View>
    )
  }

  const renderPopularSongs = () => {
    if (musicStore.isLoading) return null

    const popularSongs = [...musicStore.songs]
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 10)

    if (!popularSongs.length) return null

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {translate('home.popularSongs')}
        </Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          data={popularSongs}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item: song }) => {
            const isCurrentSong = currentSong?.id === song.id
            const showPause = isCurrentSong && isPlaying

            return (
              <TouchableOpacity
                style={styles.songItem}
                onPress={() => {
                  router.push(`/(modals)/detail/song/${song.id}`)
                }}
              >
                <View style={styles.songImageContainer}>
                  <SongImage entityId={song.id} style={styles.songImage} />
                  <TouchableOpacity
                    style={styles.songPlayButton}
                    testID={`song-play-button-${song.id}`}
                    onPress={e => {
                      e?.stopPropagation?.()
                      if (isCurrentSong) {
                        // Toggle play/pause if it's the current song
                        if (isPlaying) {
                          musicStore.pause()
                        } else {
                          musicStore.togglePlayback()
                        }
                      } else {
                        // Play new song if it's different
                        musicStore.setCurrentSong(song.id, 'none')
                      }
                    }}
                  >
                    <Ionicons
                      name={showPause ? 'pause-circle' : 'play-circle'}
                      size={40}
                      color={colors.palette.primary200}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {song.title}
                </Text>
                <Text style={styles.songInfo} numberOfLines={1}>
                  {
                    musicStore.artists.find((a: any) => a.id === song.artistId)
                      ?.name
                  }{' '}
                  • {/* @ts-ignore */}
                  {translate('home.playCount', {
                    count: formatNumber(song.playCount),
                  })}
                </Text>
              </TouchableOpacity>
            )
          }}
        />
      </View>
    )
  }

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
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>{getGreeting()}</Text>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/(app)/profile')}
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        style={styles.content}
        showsVerticalScrollIndicator={false}
        data={[{ key: 'content' }]}
        renderItem={() => null}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <React.Fragment>
            {renderTrendingArtists()}
            {renderRecentlyPlayed()}
            {renderTopAlbums()}
            {renderNewReleases()}
            {renderMoodBasedAlbums()}
            {renderPopularSongs()}
          </React.Fragment>
        }
      />
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
      height: '40%',
    },
    content: {
      flex: 1,
    },
    header: {
      paddingHorizontal: 20,
    },
    greeting: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingTop: 20,
      paddingBottom: 20,
    },
    greetingText: {
      fontSize: 23,
      color: theme.colors.text,
      opacity: 0.9,
      marginBottom: 4,
      fontWeight: '500',
    },
    iconButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    section: {
      marginTop: 10,
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 16,
      letterSpacing: -0.5,
    },
    horizontalList: {
      gap: 16,
      paddingRight: 20,
    },
    loader: {
      marginVertical: 20,
    },
    albumItem: {
      width: 160,
    },
    albumImage: {
      width: 160,
      height: 160,
      borderRadius: 8,
      marginBottom: 12,
      backgroundColor: theme.colors.palette.neutral500,
    },
    albumTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    albumInfo: {
      fontSize: 13,
      color: theme.colors.textDim,
      lineHeight: 18,
    },
    songItem: {
      width: 140,
    },
    songImageContainer: {
      position: 'relative',
      marginBottom: 12,
    },
    songImage: {
      width: 140,
      height: 140,
      borderRadius: 8,
      backgroundColor: theme.colors.palette.neutral500,
    },
    songPlayButton: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: theme.colors.palette.overlay80,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    songTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    songInfo: {
      fontSize: 13,
      color: theme.colors.textDim,
      lineHeight: 18,
    },
    artistItem: {
      width: 100,
      alignItems: 'center',
    },
    artistImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: 12,
      backgroundColor: theme.colors.palette.neutral500,
    },
    artistName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
      textAlign: 'center',
    },
    artistInfo: {
      fontSize: 13,
      color: theme.colors.textDim,
      lineHeight: 18,
      textAlign: 'center',
    },
  })
