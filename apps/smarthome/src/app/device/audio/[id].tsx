// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useMemo, useState } from 'react'
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { type Theme, Text, colors, useAppTheme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'

import { AppHeader } from '@/components'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { DeviceCapability } from '@/models/SmartHomeStore'
import { getDeviceIconName } from '@/utils/deviceCapabilities'
import CircularSlider from '@/components/CircularProgress'
import { debounce } from 'lodash'

const { width: screenWidth } = Dimensions.get('window')
const CIRCLE_SIZE = screenWidth * 0.6

const AudioDeviceControlScreen = observer(() => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { smartHomeStore } = useStores()
  const { trackScreenMount } = useInteractionTracking(
    'device',
    '/device/audio/[id]',
  )
  const router = useRouter()

  const device = id ? smartHomeStore.getDeviceById(parseInt(id)) : null
  const deviceProperties = device?.properties
    ? JSON.parse(device.properties)
    : {}

  // Get device capabilities
  const capabilities = device
    ? smartHomeStore.getDeviceCapabilities(device.device_type_id)
    : []
  const isAudioDevice = capabilities.includes(DeviceCapability.VOLUME_CONTROL)

  // Audio-specific properties - read directly from store, this is bad and should be fixed
  const volume = deviceProperties.volume || 0
  const isPlaying = deviceProperties.is_playing || false
  const deviceAudioMode = deviceProperties.audio_mode || 'music'

  // Local state for slider interaction
  const [displayVolume, setDisplayVolume] = useState(volume)

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'AudioDeviceControl',
        route: `/device/audio/${id}`,
      })
      return () => {
        console.log('Audio device control screen unfocused')
      }
    }, []),
  )

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      if (device) {
        smartHomeStore.setDeviceVolume(device.id.toString(), newVolume)
      }
    },
    [device, smartHomeStore],
  )

  const handlePlayPause = useCallback(() => {
    if (device) {
      smartHomeStore.toggleDevicePlayback(device.id.toString())
    }
  }, [device, smartHomeStore])

  const handlePreviousTrack = useCallback(() => {
    if (device) {
      console.log('Previous track')
    }
  }, [device])

  const handleNextTrack = useCallback(() => {
    if (device) {
      console.log('Next track')
    }
  }, [device])

  const handleModeChange = useCallback(
    (mode: 'music' | 'voice' | 'bluetooth') => {
      if (device) {
        smartHomeStore.setDeviceAudioMode(device.id.toString(), mode)
      }
    },
    [device, smartHomeStore],
  )

  const handleDeviceToggle = useCallback(() => {
    if (device) {
      smartHomeStore.toggleDevice(device.id.toString())
    }
  }, [device, smartHomeStore])

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'music':
        return 'MUSIC'
      case 'voice':
        return 'VOICE'
      case 'bluetooth':
        return 'BLUETOOTH'
      default:
        return 'UNKNOWN'
    }
  }

  if (!device) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader title="Device Not Found" />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            Device not found
          </Text>
        </View>
      </View>
    )
  }

  if (!isAudioDevice) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader title="Invalid Device Type" />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            This device doesn't support audio controls
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.secondary100,
          theme.colors.palette.primary100,
          theme.colors.palette.neutral100,
        ]}
        locations={[0, 0.4, 1]}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text preset="subheading" style={styles.headerTitle}>
            {device?.name}
          </Text>
          <TouchableOpacity
            onPress={debounce(
              () => router.push(`/device/history/${device?.id}`),
              300,
            )}
            style={styles.historyButton}
          >
            <Ionicons name="time-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Device Status */}
          <View style={styles.deviceStatus}>
            <View style={styles.deviceInfo}>
              <Ionicons
                name={getDeviceIconName(device.deviceType) as any}
                size={32}
                color={theme.colors.palette.primary500}
              />
              <View style={styles.deviceDetails}>
                <Text style={[styles.deviceName, { color: theme.colors.text }]}>
                  {device.name}
                </Text>
                <Text
                  style={[styles.deviceType, { color: theme.colors.textDim }]}
                >
                  {device.deviceType?.name || 'Unknown Device'}
                </Text>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusIndicator,
                      {
                        backgroundColor:
                          device.status === 'online'
                            ? theme.colors.palette.success500
                            : theme.colors.palette.angry500,
                      },
                    ]}
                  />
                  <Text
                    style={[styles.statusText, { color: theme.colors.textDim }]}
                  >
                    {device.status}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                {
                  backgroundColor: device.is_on
                    ? theme.colors.palette.primary500
                    : theme.colors.palette.neutral300,
                },
              ]}
              onPress={handleDeviceToggle}
            >
              <Ionicons
                name="power"
                size={24}
                color={
                  device.is_on
                    ? theme.colors.palette.neutral100
                    : theme.colors.palette.neutral500
                }
              />
            </TouchableOpacity>
          </View>

          <View style={styles.sliderContainer}>
            <View style={styles.circularSliderWrapper}>
              <CircularSlider
                value={displayVolume}
                onValueChange={setDisplayVolume}
                min={0}
                max={100}
                activeColor={theme.colors.palette.primary500}
                inactiveColor={theme.colors.palette.neutral300}
                disabled={!device?.is_on}
                onSlidingEnd={() => handleVolumeChange(displayVolume)}
              />

              <View style={styles.centerDisplay}>
                <Text
                  style={[styles.modeText, { color: theme.colors.textDim }]}
                >
                  {getModeLabel(deviceAudioMode)}
                </Text>
                <Text style={[styles.volumeText, { color: theme.colors.text }]}>
                  {displayVolume}
                </Text>
                <Ionicons
                  name="volume-high"
                  size={24}
                  color={theme.colors.palette.primary500}
                />
              </View>
            </View>
          </View>

          <View style={styles.modeButtons}>
            {capabilities.includes(DeviceCapability.MUSIC_PLAYBACK) && (
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  deviceAudioMode === 'music' && styles.activeModeButton,
                  {
                    backgroundColor:
                      deviceAudioMode === 'music'
                        ? !device?.is_on
                          ? theme.colors.palette.neutral500
                          : theme.colors.palette.primary500
                        : theme.colors.palette.neutral200,
                  },
                ]}
                onPress={() => handleModeChange('music')}
                disabled={!device?.is_on}
              >
                <Ionicons
                  name="musical-notes"
                  size={20}
                  color={
                    deviceAudioMode === 'music'
                      ? !device?.is_on
                        ? theme.colors.palette.neutral300
                        : theme.colors.palette.neutral100
                      : theme.colors.palette.neutral500
                  }
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    {
                      color:
                        deviceAudioMode === 'music'
                          ? !device?.is_on
                            ? theme.colors.palette.neutral300
                            : theme.colors.palette.neutral100
                          : theme.colors.textDim,
                    },
                  ]}
                >
                  MUSIC
                </Text>
              </TouchableOpacity>
            )}

            {capabilities.includes(DeviceCapability.VOICE_ASSISTANT) && (
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  deviceAudioMode === 'voice' && styles.activeModeButton,
                  {
                    backgroundColor:
                      deviceAudioMode === 'voice'
                        ? !device?.is_on
                          ? theme.colors.palette.neutral500
                          : theme.colors.palette.primary500
                        : theme.colors.palette.neutral200,
                  },
                ]}
                onPress={() => handleModeChange('voice')}
                disabled={!device?.is_on}
              >
                <Ionicons
                  name="mic"
                  size={20}
                  color={
                    deviceAudioMode === 'voice'
                      ? !device?.is_on
                        ? theme.colors.palette.neutral300
                        : theme.colors.palette.neutral100
                      : theme.colors.palette.neutral500
                  }
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    {
                      color:
                        deviceAudioMode === 'voice'
                          ? !device?.is_on
                            ? theme.colors.palette.neutral300
                            : theme.colors.palette.neutral100
                          : theme.colors.textDim,
                    },
                  ]}
                >
                  VOICE
                </Text>
              </TouchableOpacity>
            )}

            {capabilities.includes(DeviceCapability.BLUETOOTH) && (
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  deviceAudioMode === 'bluetooth' && styles.activeModeButton,
                  {
                    backgroundColor:
                      deviceAudioMode === 'bluetooth'
                        ? !device?.is_on
                          ? theme.colors.palette.neutral500
                          : theme.colors.palette.primary500
                        : theme.colors.palette.neutral200,
                  },
                ]}
                onPress={() => handleModeChange('bluetooth')}
                disabled={!device?.is_on}
              >
                <Ionicons
                  name="bluetooth"
                  size={20}
                  color={
                    deviceAudioMode === 'bluetooth'
                      ? !device?.is_on
                        ? theme.colors.palette.neutral300
                        : theme.colors.palette.neutral100
                      : theme.colors.palette.neutral500
                  }
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    {
                      color:
                        deviceAudioMode === 'bluetooth'
                          ? !device?.is_on
                            ? theme.colors.palette.neutral300
                            : theme.colors.palette.neutral100
                          : theme.colors.textDim,
                    },
                  ]}
                >
                  BT
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {capabilities.includes(DeviceCapability.MUSIC_PLAYBACK) && (
            <View style={styles.playbackControls}>
              <TouchableOpacity
                style={[
                  styles.playbackButton,
                  {
                    backgroundColor: !device?.is_on
                      ? theme.colors.palette.neutral300
                      : theme.colors.palette.neutral200,
                  },
                ]}
                onPress={handlePreviousTrack}
                disabled={!device?.is_on}
              >
                <Ionicons
                  name="play-skip-back"
                  size={24}
                  color={
                    !device?.is_on
                      ? theme.colors.palette.neutral500
                      : theme.colors.palette.neutral500
                  }
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.playbackButton,
                  {
                    backgroundColor: !device?.is_on
                      ? theme.colors.palette.neutral500
                      : theme.colors.palette.primary500,
                  },
                ]}
                onPress={handlePlayPause}
                disabled={!device?.is_on}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={28}
                  color={
                    !device?.is_on
                      ? colors.palette.neutral300
                      : theme.colors.palette.neutral100
                  }
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.playbackButton,
                  {
                    backgroundColor: !device?.is_on
                      ? theme.colors.palette.neutral300
                      : theme.colors.palette.neutral200,
                  },
                ]}
                onPress={handleNextTrack}
                disabled={!device?.is_on}
              >
                <Ionicons
                  name="play-skip-forward"
                  size={24}
                  color={
                    !device?.is_on
                      ? theme.colors.palette.neutral500
                      : theme.colors.palette.neutral500
                  }
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    deviceStatus: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 30,
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    deviceInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    deviceDetails: {
      marginLeft: 16,
      flex: 1,
    },
    deviceName: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 4,
    },
    deviceType: {
      fontSize: 14,
      marginBottom: 8,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    statusText: {
      fontSize: 12,
      textTransform: 'uppercase',
      fontWeight: '500',
    },
    toggleButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    sliderContainer: {
      alignItems: 'center',
      marginVertical: 30,
    },

    circularSliderWrapper: {
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
    },

    centerDisplay: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
      width: CIRCLE_SIZE * 0.6,
      height: CIRCLE_SIZE * 0.6,
      borderRadius: (CIRCLE_SIZE * 0.6) / 2,
      backgroundColor: colors.palette.neutral200,
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },

    circleBackground: {
      position: 'absolute',
    },
    progressDot: {
      position: 'absolute',
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    handle: {
      position: 'absolute',
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 6,
    },
    touchableArea: {
      position: 'absolute',
    },
    modeText: {
      fontSize: 12,
      fontWeight: '500',
      marginBottom: 4,
    },
    volumeText: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 4,
    },
    modeButtons: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      marginBottom: 30,
    },
    modeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    activeModeButton: {
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    modeButtonText: {
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
    },
    playbackControls: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 20,
    },
    playbackButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    errorText: {
      fontSize: 16,
      textAlign: 'center',
    },
    circularSliderContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: { padding: 8 },
    headerTitle: { textAlign: 'center', flex: 1, color: theme.colors.text },
    historyButton: { padding: 8 },
  })

export default AudioDeviceControlScreen
