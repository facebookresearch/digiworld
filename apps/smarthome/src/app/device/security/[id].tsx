// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useState, useEffect, useMemo } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Image,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'

import { AppHeader } from '@/components'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { DeviceCategory } from '@/models/SmartHomeStore'
import { getDeviceIconName } from '@/utils/deviceCapabilities'
import { debounce } from 'lodash'

const { width: screenWidth } = Dimensions.get('window')

const SurveillanceDeviceControlScreen = observer(() => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { smartHomeStore } = useStores()
  const { trackScreenMount } = useInteractionTracking(
    'device',
    `/device/camera/${id}`,
  )
  const router = useRouter()
  const [cameraPan, setCameraPan] = useState({ x: 0, y: 0 })
  const [liveIndicatorOpacity] = useState(new Animated.Value(1))

  // Get device data
  const device = id ? smartHomeStore.getDeviceById(parseInt(id)) : null
  const deviceProperties = device?.properties
    ? JSON.parse(device.properties)
    : {}
  const isSurveillanceDevice =
    device?.deviceType?.category === DeviceCategory.SECURITY

  console.log(device?.device_type_id, 'device?.device_type_id')

  const motionDetection = deviceProperties.motion_detection || false
  const nightVision = deviceProperties.night_vision || false
  const twoWayAudio = deviceProperties.two_way_audio || false
  const recording = deviceProperties.recording || false
  const cloudStorage = deviceProperties.cloud_storage || false

  // Live indicator blinking animation
  useEffect(() => {
    if (device?.is_on) {
      const blinkAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(liveIndicatorOpacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(liveIndicatorOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      )
      blinkAnimation.start()
      return () => blinkAnimation.stop()
    }
    return undefined
  }, [device?.is_on, liveIndicatorOpacity])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'SurveillanceDeviceControl',
        route: `/device/security/${id}`,
      })
      return () => {
        console.log('Surveillance device control screen unfocused')
      }
    }, []),
  )

  const handleDeviceToggle = useCallback(() => {
    if (device) {
      smartHomeStore.toggleDevice(device.id.toString())
    }
  }, [device, smartHomeStore])

  // Surveillance-specific handlers
  const handleSurveillanceCapabilityToggle = useCallback(
    (
      capability:
        | 'motion_detection'
        | 'night_vision'
        | 'two_way_audio'
        | 'recording'
        | 'cloud_storage',
    ) => {
      if (device) {
        smartHomeStore.toggleSurveillanceCapability(
          device.id.toString(),
          capability,
        )
      }
    },
    [device, smartHomeStore],
  )

  // Camera pan handler
  const handleCameraPan = useCallback((gestureState: any) => {
    setCameraPan((prev: { x: number; y: number }) => ({
      x: prev.x + gestureState.dx * 0.1,
      y: prev.y + gestureState.dy * 0.1,
    }))
  }, [])

  // Camera pan responder
  const cameraPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      // Reset pan when starting new gesture
    },
    onPanResponderMove: (evt, gestureState) => {
      handleCameraPan(gestureState)
    },
    onPanResponderRelease: () => {
      // Optional: Add any cleanup or snap-back logic here
    },
  })

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

  if (!isSurveillanceDevice) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader title="Invalid Device Type" />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            This device doesn't support surveillance controls
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
                      styles.statusDot,
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

          {/* Camera View */}
          <View style={styles.cameraContainer}>
            <View
              style={[
                styles.cameraView,
                { backgroundColor: theme.colors.palette.neutral200 },
              ]}
            >
              {device.is_on ? (
                <>
                  <View
                    {...cameraPanResponder.panHandlers}
                    style={styles.cameraImageContainer}
                  >
                    <Image
                      source={require('../../../../assets/images/album_placeholder.jpg')}
                      style={[
                        styles.cameraImage,
                        {
                          transform: [
                            { translateX: cameraPan.x },
                            { translateY: cameraPan.y },
                          ],
                        },
                      ]}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.cameraOverlay}>
                    <Animated.View
                      style={[
                        styles.liveIndicator,
                        { opacity: liveIndicatorOpacity },
                      ]}
                    >
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </Animated.View>

                    <View style={styles.bottomStatusContainer}>
                      <View style={styles.statusIndicators}>
                        <View
                          style={[
                            styles.statusChip,
                            {
                              backgroundColor: motionDetection
                                ? theme.colors.palette.success500
                                : theme.colors.palette.angry500,
                            },
                          ]}
                        >
                          <Text style={styles.statusChipText}>
                            Motion {motionDetection ? 'ON' : 'OFF'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusChip,
                            {
                              backgroundColor: nightVision
                                ? theme.colors.palette.success500
                                : theme.colors.palette.angry500,
                            },
                          ]}
                        >
                          <Text style={styles.statusChipText}>
                            Night {nightVision ? 'ON' : 'OFF'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusChip,
                            {
                              backgroundColor: twoWayAudio
                                ? theme.colors.palette.success500
                                : theme.colors.palette.angry500,
                            },
                          ]}
                        >
                          <Text style={styles.statusChipText}>
                            Audio {twoWayAudio ? 'ON' : 'OFF'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusChip,
                            {
                              backgroundColor: recording
                                ? theme.colors.palette.success500
                                : theme.colors.palette.angry500,
                            },
                          ]}
                        >
                          <Text style={styles.statusChipText}>
                            Record {recording ? 'ON' : 'OFF'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusChip,
                            {
                              backgroundColor: cloudStorage
                                ? theme.colors.palette.success500
                                : theme.colors.palette.angry500,
                            },
                          ]}
                        >
                          <Text style={styles.statusChipText}>
                            Cloud {cloudStorage ? 'ON' : 'OFF'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.cameraOffContainer}>
                  <Ionicons
                    name="camera-outline"
                    size={64}
                    color={theme.colors.palette.neutral400}
                  />
                  <Text
                    style={[
                      styles.cameraOffText,
                      { color: theme.colors.textDim },
                    ]}
                  >
                    Turn on camera to start live feed
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Surveillance Capabilities */}
          <View style={styles.capabilitiesContainer}>
            <Text
              style={[styles.capabilitiesLabel, { color: theme.colors.text }]}
            >
              CAPABILITIES
            </Text>
            <View style={styles.capabilitiesGrid}>
              {[
                {
                  key: 'motion_detection',
                  label: 'Motion Detection',
                  icon: 'eye',
                },
                { key: 'night_vision', label: 'Night Vision', icon: 'moon' },
                { key: 'two_way_audio', label: 'Two-Way Audio', icon: 'mic' },
                { key: 'recording', label: 'Recording', icon: 'videocam' },
                { key: 'cloud_storage', label: 'Cloud Storage', icon: 'cloud' },
              ].map(capability => {
                const isEnabled = deviceProperties[capability.key] || false
                return (
                  <TouchableOpacity
                    key={capability.key}
                    style={[
                      styles.capabilityButton,
                      {
                        backgroundColor: isEnabled
                          ? !device?.is_on
                            ? theme.colors.palette.neutral500
                            : theme.colors.palette.primary500
                          : theme.colors.palette.neutral200,
                        borderColor: theme.colors.palette.neutral300,
                      },
                    ]}
                    onPress={() =>
                      handleSurveillanceCapabilityToggle(capability.key as any)
                    }
                    disabled={!device?.is_on}
                  >
                    <Ionicons
                      name={capability.icon as any}
                      size={24}
                      color={
                        isEnabled
                          ? !device?.is_on
                            ? theme.colors.palette.neutral300
                            : theme.colors.palette.neutral100
                          : theme.colors.palette.neutral500
                      }
                    />
                    <Text
                      style={[
                        styles.capabilityButtonText,
                        {
                          color: isEnabled
                            ? !device?.is_on
                              ? theme.colors.palette.neutral300
                              : theme.colors.palette.neutral100
                            : theme.colors.textDim,
                        },
                      ]}
                    >
                      {capability.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
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
    statusDot: {
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
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    // Surveillance styles
    cameraContainer: {
      marginVertical: 20,
      alignItems: 'center',
    },
    cameraView: {
      width: screenWidth - 40,
      height: 300,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
    },
    cameraImageContainer: {
      width: '100%',
      height: '100%',
    },
    cameraImage: {
      width: '100%',
      height: '100%',
    },
    cameraOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'space-between',
      alignItems: 'stretch',
      padding: 12,
    },
    liveIndicator: {
      position: 'absolute',
      top: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral900,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.palette.angry500,
      marginRight: 6,
    },
    liveText: {
      color: theme.colors.palette.neutral100,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    bottomStatusContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingBottom: 8,
    },
    statusIndicators: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      justifyContent: 'center',
      alignItems: 'center',
      maxWidth: '100%',
    },
    statusChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginVertical: 1,
      minWidth: 60,
    },
    statusChipText: {
      color: theme.colors.palette.neutral100,
      fontSize: 10,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 0.3,
    },
    cameraOffContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    cameraOffText: {
      fontSize: 16,
      fontWeight: '500',
      textAlign: 'center',
      marginTop: 16,
      lineHeight: 22,
    },
    capabilitiesContainer: {
      marginVertical: 20,
    },
    capabilitiesLabel: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 16,
    },
    capabilitiesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    capabilityButton: {
      width: 100,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
    },
    capabilityButtonText: {
      fontSize: 12,
      fontWeight: '500',
      marginTop: 8,
      textAlign: 'center',
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

export default SurveillanceDeviceControlScreen
