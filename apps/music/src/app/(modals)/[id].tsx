import React, { useCallback, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router'
import { useStores } from '@/models'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import Slider from '@react-native-community/slider'
import { SongImage } from '@/components/MusicImage'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import type { TxKeyPath } from '@/i18n'
import { translate } from '@/i18n/translate'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const ARTWORK_SIZE = SCREEN_WIDTH - 80

type RepeatMode = 'none' | 'repeat-all' | 'repeat-one'
type RepeatIcon = 'repeat-outline' | 'repeat' | 'infinite'
const REPEAT_MODES = ['none', 'repeat-all', 'repeat-one'] as const

const getRepeatTranslationKey = (mode: RepeatMode): TxKeyPath => {
  switch (mode) {
    case 'none':
      return 'player.playback.repeat.none'
    case 'repeat-all':
      return 'player.playback.repeat.all'
    case 'repeat-one':
      return 'player.playback.repeat.one'
    default:
      return 'player.playback.repeat.none'
  }
}

const getRepeatIcon = (mode: RepeatMode): RepeatIcon => {
  switch (mode) {
    case 'none':
      return 'repeat-outline'
    case 'repeat-all':
      return 'infinite'
    case 'repeat-one':
      return 'repeat'
    default:
      return 'repeat-outline'
  }
}

const PlayerScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { musicStore, userStore } = useStores()
  const router = useRouter()
  const progress = musicStore.progress
  const { sessionId, id } = useLocalSearchParams()
  const { trackScreenMount } = useInteractionTracking(
    'Player',
    `/(modals)/${id}`,
  )
  // const toast = useToast()
  const song = musicStore.currentSong
  const artist = musicStore.currentSongArtist
  const isPlaying = musicStore.playbackState.isPlaying

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return translate('common.duration', {
      minutes: mins,
      seconds: secs.toString().padStart(2, '0'),
    })
  }

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'player',
        route: `/(modals)/${id}`,
      })
    }, []),
  )

  useEffect(() => {
    if (sessionId) {
      console.log('sessionId', sessionId)
    }
  }, [sessionId])

  const togglePlay = () => {
    if (isPlaying) {
      musicStore.pause()
    } else {
      musicStore.togglePlayback()
    }
  }

  const handleToggleRepeat = () => {
    const currentMode = musicStore.playbackState.repeatMode
    const nextMode = REPEAT_MODES[
      (REPEAT_MODES.indexOf(currentMode as RepeatMode) + 1) %
        REPEAT_MODES.length
    ] as RepeatMode
    musicStore.setRepeatMode(nextMode)
  }

  // const toggleFavorite = async () => {
  //   try {
  //     await musicStore.toggleFavorite(userStore.user?.id || 1, song.id)
  //   } catch (error) {
  //     console.error('Failed to toggle favorite:', error)
  //     toast.show({
  //       title: translate('player.errors.toggleFavoriteFailed'),
  //       placement: 'top',
  //       duration: 3000,
  //     })
  //   }
  // }

  if (!song) return null

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.palette.primary500, theme.colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
      />
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: 'transparent' },
          headerTransparent: true,
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
          title: translate('player.nowPlaying'),
        }}
      />
      <SafeAreaView style={styles.content}>
        <View style={styles.artworkContainer}>
          <SongImage entityId={song.id} style={styles.artwork} />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.title}>{song.title}</Text>
          <Text style={styles.artist}>{artist?.name}</Text>
          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => {
              router.push(`/(modals)/detail/song/${song.id}`)
            }}
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={theme.colors.textDim}
            />
            <Text style={styles.detailButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressContainer}>
          <Slider
            style={styles.progressBar}
            value={progress}
            minimumValue={0}
            maximumValue={song.duration}
            minimumTrackTintColor={theme.colors.tint}
            maximumTrackTintColor={theme.colors.palette.neutral400}
            thumbTintColor={theme.colors.tint}
            onSlidingComplete={value => {
              musicStore.setProgress(value)
            }}
          />
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(progress)}</Text>
            <Text style={styles.timeText}>{formatTime(song.duration)}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => musicStore.toggleShuffle()}
            accessibilityLabel={translate('player.playback.shuffle')}
          >
            <Ionicons
              name={
                musicStore.playbackState.isShuffleEnabled
                  ? 'shuffle'
                  : 'shuffle-outline'
              }
              size={24}
              color={
                musicStore.playbackState.isShuffleEnabled
                  ? theme.colors.tint
                  : theme.colors.text
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => musicStore.playPrevious()}
            accessibilityLabel={translate('player.playback.previous')}
          >
            <Ionicons
              name="play-skip-back"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.playButton}
            onPress={togglePlay}
            accessibilityLabel={translate(
              isPlaying ? 'player.playback.pause' : 'player.playback.play',
            )}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => musicStore.playNext()}
            accessibilityLabel={translate('player.playback.next')}
          >
            <Ionicons
              name="play-skip-forward"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleToggleRepeat}
            accessibilityLabel={translate(
              getRepeatTranslationKey(
                musicStore.playbackState.repeatMode as RepeatMode,
              ),
            )}
          >
            <Ionicons
              name={getRepeatIcon(
                musicStore.playbackState.repeatMode as RepeatMode,
              )}
              size={24}
              color={
                musicStore.playbackState.repeatMode === 'none'
                  ? theme.colors.text
                  : theme.colors.tint
              }
            />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              userStore.setSelectedSongId(song.id)
              userStore.setAddToPlaylistModalVisible(true)
            }}
          >
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={theme.colors.text}
            />
            <Text style={styles.actionButtonText}>
              {translate('library.addToPlaylist')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      paddingTop: 60,
    },
    artworkContainer: {
      alignItems: 'center',
      marginTop: 40,
    },
    artwork: {
      width: ARTWORK_SIZE,
      height: ARTWORK_SIZE,
      borderRadius: 8,
      backgroundColor: theme.colors.palette.overlay20,
    },
    infoContainer: {
      alignItems: 'center',
      marginTop: 32,
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    artist: {
      fontSize: 16,
      color: theme.colors.textDim,
      textAlign: 'center',
    },
    detailButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    detailButtonText: {
      fontSize: 14,
      color: theme.colors.textDim,
      marginLeft: 6,
    },
    actionButtons: {
      paddingHorizontal: 40,
      marginTop: 24,
      alignItems: 'center',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 24,
      backgroundColor: theme.colors.palette.overlay20,
    },
    actionButtonText: {
      fontSize: 16,
      color: theme.colors.text,
      marginLeft: 8,
      fontWeight: '500',
    },
    progressContainer: {
      paddingHorizontal: 20,
      marginTop: 32,
      backgroundColor: theme.colors.background,
    },
    progressBar: {
      width: '100%',
      height: 40,
    },
    timeContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: -8,
    },
    timeText: {
      color: theme.colors.textDim,
      fontSize: 12,
    },
    controls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 40,
      marginTop: 16,
    },
    controlButton: {
      padding: 12,
    },
    playButton: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.tint,
      justifyContent: 'center',
      alignItems: 'center',
    },
    extraControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 100,
      marginTop: 32,
    },
  })

export default PlayerScreen
