import React, { useMemo } from 'react'
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import { Text, useAppTheme, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { SongImage } from './MusicImage'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const PLAYER_WIDTH = SCREEN_WIDTH * 0.95

export const MiniPlayer = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { musicStore } = useStores()
  const progress = musicStore.progress
  const song = musicStore.currentSong
  const duration = song?.duration || 1
  const artist = musicStore.currentSongArtist

  const isPlaying = musicStore.playbackState.isPlaying
  const progressPercent = Math.min(progress / duration, 1)
  const currentQueue = musicStore.queueSongs

  const handleOpenPlayer = () => {
    router.push(`/(modals)/${musicStore.currentSong?.id}`)
  }

  if (!song) return null

  const handlePlayPause = () => {
    if (isPlaying) {
      musicStore.pause()
    } else {
      musicStore.play()
    }
  }

  return (
    <TouchableOpacity onPress={handleOpenPlayer} style={styles.container}>
      {/* Progress bar at top */}
      <View
        style={[styles.progressBar, { width: `${progressPercent * 100}%` }]}
      />

      <View style={styles.innerContent}>
        <SongImage entityId={song.id} style={styles.artwork} />
        <View style={styles.textContainer}>
          <Text numberOfLines={1} style={styles.title}>
            {song.title}
          </Text>
          <Text numberOfLines={1} style={styles.artist}>
            {artist?.name}
          </Text>
          <Text numberOfLines={1} style={styles.artist}>
            {currentQueue.indexOf(song) + 1}/{currentQueue.length}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity onPress={() => musicStore.playPrevious()}>
            <Ionicons
              name="play-skip-back"
              size={20}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginHorizontal: 12 }}
            onPress={handlePlayPause}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => musicStore.playNext()}>
            <Ionicons
              name="play-skip-forward"
              size={20}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      height: 70,
      width: PLAYER_WIDTH,
      alignSelf: 'center',
      marginBottom: 5,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: theme.colors.backgroundElevated,
      elevation: 6,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    progressBar: {
      height: 3,
      backgroundColor: theme.colors.tint,
    },
    blurWrapper: {
      width: '100%',
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.overlay50,
    },
    innerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    artwork: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: theme.colors.palette.neutral500,
      marginRight: 14,
      resizeMode: 'cover',
    },
    textContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      color: theme.colors.text,
      fontWeight: '600',
      fontSize: 14,
    },
    artist: {
      color: theme.colors.textDim,
      fontSize: 12,
      marginTop: 2,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  })
