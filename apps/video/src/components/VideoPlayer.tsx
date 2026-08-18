// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState, useRef, useEffect } from 'react'
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { Text } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { useRouter } from 'expo-router'

import { ImagePlaceholder } from './ImagePlaceholder'

const { width, height } = Dimensions.get('window')
const PLAYER_HEIGHT = height * 0.32

interface VideoPlayerProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlayPause: () => void
  onSeek: (position: number) => void
  onSkipBack: () => void
  onSkipForward: () => void
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onSkipBack,
  onSkipForward,
}) => {
  const router = useRouter()
  const [showControls, setShowControls] = useState(true)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 5000)
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [showControls])

  const handlePlayerTap = () => {
    setShowControls(!showControls)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const PlayerControls = () => (
    <LinearGradient
      colors={['transparent', 'rgba(0,0,0,0.8)']}
      style={styles.controlsOverlay}
    >
      {/* Top controls */}
      <View style={styles.topControls}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.moreButton} activeOpacity={0.8}>
          <Ionicons name="ellipsis-vertical" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Center controls */}
      <View style={styles.centerControls}>
        <View style={styles.playbackControls}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkipBack}
            activeOpacity={0.8}
          >
            <Ionicons name="play-skip-back" size={32} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playButton}
            onPress={onPlayPause}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={48}
              color="white"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkipForward}
            activeOpacity={0.8}
          >
            <Ionicons name="play-skip-forward" size={32} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText} text={formatTime(currentTime)} />
          <Text style={styles.timeText} text=" / " />
          <Text style={styles.timeText} text={formatTime(duration)} />
        </View>

        <TouchableOpacity
          style={styles.seekBarContainer}
          onPress={event => {
            const { locationX } = event.nativeEvent
            const containerWidth = width - 32
            const percentage = locationX / containerWidth
            onSeek(percentage * 100)
          }}
          activeOpacity={1}
        >
          <View style={styles.seekBar}>
            <View
              style={[
                styles.seekProgress,
                {
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                },
              ]}
            />
            <View
              style={[
                styles.seekThumb,
                {
                  left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                },
              ]}
            />
          </View>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )

  return (
    <TouchableOpacity
      style={styles.playerContainer}
      onPress={handlePlayerTap}
      activeOpacity={1}
    >
      <ImagePlaceholder
        width={width}
        height={PLAYER_HEIGHT}
        borderRadius={0}
        type="video"
      />

      {showControls && <PlayerControls />}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  playerContainer: {
    width,
    height: PLAYER_HEIGHT,
    position: 'relative',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  backButton: {
    padding: 8,
  },
  moreButton: {
    padding: 8,
  },
  centerControls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  seekBarContainer: {
    marginBottom: 12,
  },
  seekBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    position: 'relative',
  },
  seekProgress: {
    height: 4,
    backgroundColor: 'white',
    borderRadius: 2,
  },
  seekThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    marginLeft: -8,
  },
})
