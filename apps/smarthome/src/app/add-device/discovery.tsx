// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { debounce } from 'lodash'

import { AppHeader } from '@/components'
import { queries } from '@/db/queries'
import { useStores } from '@/models/helpers/useStores'
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'

interface DeviceType {
  id: number
  name: string
  category: string
  subcategory: string
  capabilities: string
  icon: string
  brand: string
  model: string
  is_active: boolean
}

export default observer(function DeviceDiscoveryScreen() {
  const { theme } = useAppTheme()
  const { smartHomeStore } = useStores()
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('device_discovery', '/add-device/discovery')
  const params = useLocalSearchParams()
  const [discoveredDevices, setDiscoveredDevices] = useState<DeviceType[]>([])
  const [loading, setLoading] = useState(true)
  const [showDevices, setShowDevices] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const sessionRestoredRef = useRef(false)
  const lastSessionTimeStampRef = useRef<string | null>(null)
  const styles = useMemo(() => createStyles(theme), [theme])

  // Get device type info from navigation params with session fallback
  const [deviceTypeId, setDeviceTypeId] = useState<number | null>(
    params.deviceTypeId ? parseInt(params.deviceTypeId as string) : null,
  )
  const [deviceTypeName, setDeviceTypeName] = useState<string>(
    (params.deviceTypeName as string) || '',
  )

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const rotateAnim = useRef(new Animated.Value(0)).current
  const rippleAnim = useRef(new Animated.Value(0)).current

  // Handle session restoration (following add-device screen pattern)
  useEffect(() => {
    // Reset restoration flag when a new session is detected
    const currentSessionTimeStamp = Array.isArray(params?.sessionTimeStamp)
      ? params.sessionTimeStamp[0]
      : params?.sessionTimeStamp

    if (
      currentSessionTimeStamp &&
      currentSessionTimeStamp !== lastSessionTimeStampRef.current
    ) {
      sessionRestoredRef.current = false
      lastSessionTimeStampRef.current = currentSessionTimeStamp
    }

    // Also reset if we have sessionTimeStamp but no restoration has happened yet
    if (currentSessionTimeStamp && !sessionRestoredRef.current) {
      console.log('🔍 Session restoration needed')
    }

    if (currentSessionTimeStamp && !sessionRestoredRef.current) {
      const sessionData = smartHomeStore
        .getRootStore?.()
        ?.sessionStore?.getSession(currentSessionTimeStamp)

      if (sessionData?.data) {
        const formData = sessionData.data.sessionData?.formData

        if (formData) {
          // Restore device discovery state from session
          if (formData.deviceTypeId !== undefined) {
            setDeviceTypeId(formData.deviceTypeId)
          }
          if (formData.deviceTypeName !== undefined) {
            setDeviceTypeName(formData.deviceTypeName)
          }
          if (formData.currentStep !== undefined) {
            setCurrentStep(formData.currentStep)
          }
          if (formData.showDevices !== undefined) {
            setShowDevices(formData.showDevices)
          }
          if (formData.discoveredDevices !== undefined) {
            setDiscoveredDevices(formData.discoveredDevices)
          } else if (formData.deviceTypeId && formData.deviceTypeName) {
            // Scenario 1: Specific device type selected - create device from session data

            const deviceFromSession = {
              id: formData.deviceTypeId,
              name: formData.deviceTypeName,
              category: formData.category || 'other',
              subcategory: formData.subcategory || 'other',
              capabilities: '[]',
              icon: 'hardware-chip',
              brand: formData.brand || 'Unknown',
              model: formData.model || 'Unknown',
              is_active: true,
            }

            setDiscoveredDevices([deviceFromSession])
          } else if (
            formData.deviceTypeId === null ||
            formData.deviceTypeId === undefined
          ) {
            // Scenario 2: Scanner icon clicked - need to fetch random devices

            // Set deviceTypeId to null for random discovery
            setDeviceTypeId(null)
            setDeviceTypeName('')

            // Load random devices immediately for Scenario 2
            const loadRandomDevices = async () => {
              try {
                const allDevices = await queries.getAllDeviceTypes()
                const shuffled = allDevices.sort(() => 0.5 - Math.random())
                const randomDevices = shuffled.slice(0, 3)

                setDiscoveredDevices(randomDevices)
              } catch (error) {
                console.error('🔍 Error loading random devices:', error)
              }
            }
            loadRandomDevices()
          }

          // If we're restoring devices and they should be shown, trigger animations
          if (
            formData.showDevices &&
            (formData.discoveredDevices?.length > 0 ||
              (formData.deviceTypeId && formData.deviceTypeName) ||
              formData.deviceTypeId === null ||
              formData.deviceTypeId === undefined)
          ) {
            // Set loading to false so animations can start
            setLoading(false)
            // Set animation values to their final state immediately
            fadeAnim.setValue(1)
            scaleAnim.setValue(1)
            slideAnim.setValue(0)
            // Start animations immediately for restored state
            startAnimations()
            // Start ripple animation if devices should be visible
            startRippleAnimation()
          }

          // Mark session as restored to prevent multiple restoration
          sessionRestoredRef.current = true

          // Track the restored state
          trackContentChange({
            action: 'session_restored',
            deviceTypeId: formData.deviceTypeId,
            deviceTypeName: formData.deviceTypeName,
            currentStep: formData.currentStep,
            showDevices: formData.showDevices,
            discoveredDevicesCount: formData.discoveredDevices?.length || 0,
          })
        }
      } else {
        sessionRestoredRef.current = true // Mark as restored even if no data found
      }
    } else if (currentSessionTimeStamp && sessionRestoredRef.current) {
      console.log('🔍 Session already restored, skipping restoration')
    } else {
      console.log('🔍 No sessionTimeStamp parameter found')
    }
  }, [params?.sessionTimeStamp, smartHomeStore, trackContentChange])

  // Track discovery state changes for comprehensive session data (like add-device screen)
  useEffect(() => {
    if (
      deviceTypeId ||
      deviceTypeName ||
      currentStep > 0 ||
      showDevices ||
      discoveredDevices.length > 0
    ) {
      trackContentChange({
        action: 'discovery_state_update',
        deviceTypeId,
        deviceTypeName,
        currentStep,
        showDevices,
        discoveredDevicesCount: discoveredDevices.length,
        timestamp: Date.now(),
      })
    }
  }, [
    deviceTypeId,
    deviceTypeName,
    currentStep,
    showDevices,
    discoveredDevices.length,
    trackContentChange,
  ])

  const steps = deviceTypeId
    ? [
        // Scenario 1: Specific device type selected
        `Scanning for ${deviceTypeName}...`,
        'Analyzing compatibility...',
        'Checking network connection...',
        `${deviceTypeName} found!`,
        'Tap to continue setup',
      ]
    : [
        // Scenario 2: Scanner icon clicked - random discovery
        'Scanning for devices...',
        'Analyzing compatibility...',
        'Checking network connection...',
        'Devices found!',
        'Select a device to continue',
      ]

  const startRippleAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(rippleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(rippleAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [rippleAnim])

  const startAnimations = useCallback(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    )
    pulseAnimation.start()

    // Rotation animation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
    )
    rotateAnimation.start()
  }, [fadeAnim, scaleAnim, slideAnim, pulseAnim, rotateAnim])

  const startDiscoveryProcess = useCallback(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) {
          if (prev === 2) {
            // After step 3, show devices
            setShowDevices(true)
            startRippleAnimation()
          }
          return prev + 1
        } else {
          clearInterval(interval)
          return prev
        }
      })
    }, 2000)
  }, [steps.length, startRippleAnimation])

  useEffect(() => {
    if (sessionRestoredRef.current) {
      setLoading(false)
      return
    }

    const loadDeviceData = async () => {
      try {
        setLoading(true)
        const allDevices = await queries.getAllDeviceTypes()

        if (deviceTypeId) {
          // Scenario 1: Specific device type selected - show only that device
          console.log('🔍 Scenario 1: Specific device type selected')
          const selectedDevice = allDevices.find(
            (device: DeviceType) => device.id === deviceTypeId,
          )
          if (selectedDevice) {
            setDiscoveredDevices([selectedDevice])
          } else {
            // Fallback to random devices if specific device not found
            const shuffled = allDevices.sort(() => 0.5 - Math.random())
            setDiscoveredDevices(shuffled.slice(0, 3))
          }
        } else {
          // Scenario 2: Scanner icon clicked - show random devices
          console.log(
            '🔍 Scenario 2: Scanner icon clicked - showing random devices',
          )
          const shuffled = allDevices.sort(() => 0.5 - Math.random())
          setDiscoveredDevices(shuffled.slice(0, 3))
        }
      } catch (error) {
        console.error('Error loading device data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDeviceData()
    // trackScreenMount is now handled in useFocusEffect
  }, [deviceTypeId, deviceTypeName, params?.sessionTimeStamp])

  useEffect(() => {
    if (!loading) {
      startAnimations()
      startDiscoveryProcess()
    }
  }, [loading, startAnimations, startDiscoveryProcess])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'device_discovery',
        route: '/add-device/discovery',
        deviceTypeId,
        deviceTypeName,
        currentStep,
        showDevices,
        discoveredDevicesCount: discoveredDevices.length,
        sessionTimeStamp: params?.sessionTimeStamp,
      })
      return () => {
        getLatestInteraction()
      }
    }, [
      trackScreenMount,
      deviceTypeId,
      deviceTypeName,
      currentStep,
      showDevices,
      discoveredDevices.length,
      params?.sessionTimeStamp,
    ]),
  )

  const navigateToSetup = debounce((device: DeviceType) => {
    trackClick(`discovered_device_${device.id}`)
    trackContentChange({
      action: 'select_discovered_device',
      deviceId: device.id,
      deviceName: device.name,
      category: device.category,
      subcategory: device.subcategory,
      brand: device.brand,
      model: device.model,
    })
    router.push({
      pathname: '/add-device/setup',
      params: {
        deviceTypeId: device.id.toString(),
        deviceTypeName: device.name,
        category: device.category,
        subcategory: device.subcategory,
      },
    })
  }, 300)

  const getDeviceIcon = (iconName: string, category: string) => {
    if (iconName) {
      const iconMap: Record<string, string> = {
        bulb: 'bulb-outline',
        switch: 'toggle-outline',
        plug: 'flash-outline',
        camera: 'camera-outline',
        ac: 'snow-outline',
        fan: 'leaf-outline',
        speaker: 'volume-high-outline',
        strip: 'flash-outline',
        ceiling: 'home-outline',
        lamp: 'bulb-outline',
        night_light: 'moon-outline',
        flood_light: 'sunny-outline',
        chandelier: 'diamond-outline',
        pendant: 'radio-outline',
        sconce: 'flash-outline',
        outdoor_light: 'sunny-outline',
        ceiling_fan: 'leaf-outline',
        tower_fan: 'leaf-outline',
        table_fan: 'leaf-outline',
        soundbar: 'musical-notes-outline',
        microphone: 'mic-outline',
        subwoofer: 'volume-high-outline',
        indoor_camera: 'camera-outline',
        outdoor_camera: 'camera-outline',
        doorbell: 'call-outline',
        ptz_camera: 'camera-outline',
        wireless_camera: 'camera-outline',
        battery_camera: 'camera-outline',
      }
      return iconMap[iconName] || 'hardware-chip-outline'
    }

    switch (category) {
      case 'lighting':
        return 'bulb-outline'
      case 'temperature':
        return 'thermometer-outline'
      case 'security':
        return 'shield-outline'
      case 'audio':
        return 'volume-high-outline'
      default:
        return 'hardware-chip-outline'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'lighting':
        return theme.colors.palette.secondary500
      case 'temperature':
        return theme.colors.palette.primary500
      case 'security':
        return theme.colors.palette.angry500
      case 'audio':
        return theme.colors.palette.success500
      default:
        return theme.colors.palette.neutral500
    }
  }

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  if (loading) {
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
          <AppHeader
            title="Device Discovery"
            showBackButton={true}
            showSearch={false}
          />
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: theme.colors.textDim }]}>
              Initializing discovery...
            </Text>
          </View>
        </SafeAreaView>
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
        <AppHeader
          title="Device Discovery"
          showBackButton={true}
          showSearch={false}
        />

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            },
          ]}
        >
          {/* Ripple Animation */}
          <View style={styles.rippleContainer}>
            <Animated.View
              style={[
                styles.ripple,
                {
                  transform: [
                    {
                      scale: rippleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 2],
                      }),
                    },
                  ],
                  opacity: rippleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 0],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.scanningIcon,
                {
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <Ionicons
                name="scan-outline"
                size={60}
                color={theme.colors.palette.primary500}
              />
            </Animated.View>
          </View>

          {/* Discovered Devices */}
          {showDevices && discoveredDevices.length > 0 && (
            <Animated.View
              style={[
                styles.devicesContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={[styles.devicesTitle, { color: theme.colors.text }]}>
                {deviceTypeId ? `Found ${deviceTypeName}` : 'Select a Device'}
              </Text>
              {discoveredDevices.map((device, _index) => (
                <TouchableOpacity
                  key={device.id}
                  style={[
                    styles.deviceItem,
                    { backgroundColor: theme.colors.palette.neutral200 },
                  ]}
                  onPress={() => navigateToSetup(device)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.deviceIcon,
                      {
                        backgroundColor:
                          getCategoryColor(device.category) + '20',
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        getDeviceIcon(
                          device.icon,
                          device.category,
                        ) as keyof typeof Ionicons.glyphMap
                      }
                      size={32}
                      color={getCategoryColor(device.category)}
                    />
                  </View>
                  <View style={styles.deviceInfo}>
                    <Text
                      style={[styles.deviceName, { color: theme.colors.text }]}
                    >
                      {device.name}
                    </Text>
                    <Text
                      style={[
                        styles.deviceBrand,
                        { color: theme.colors.textDim },
                      ]}
                    >
                      {device.brand} • {device.model}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={20}
                    color={theme.colors.textDim}
                  />
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}

          {/* Discovery Progress */}
          <View style={styles.progressSection}>
            <Text style={[styles.currentStep, { color: theme.colors.text }]}>
              {steps[currentStep]}
            </Text>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: theme.colors.palette.neutral300 },
                ]}
              >
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: theme.colors.palette.primary500,
                      width: `${((currentStep + 1) / steps.length) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <Text
              style={[styles.progressText, { color: theme.colors.textDim }]}
            >
              Step {currentStep + 1} of {steps.length}
            </Text>
          </View>
        </Animated.View>
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      fontWeight: '500',
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 40,
    },
    deviceSection: {
      alignItems: 'center',
      marginBottom: 60,
    },
    selectedDeviceContainer: {
      alignItems: 'center',
    },
    deviceIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    deviceName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    deviceBrand: {
      fontSize: 12,
      opacity: 0.7,
    },
    randomDevicesContainer: {
      alignItems: 'center',
    },
    randomTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 30,
    },
    randomDeviceIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    randomDeviceName: {
      fontSize: 16,
      fontWeight: '500',
      flex: 1,
    },
    progressSection: {
      alignItems: 'center',
      marginBottom: 40,
    },
    scanningIcon: {
      marginBottom: 20,
    },
    currentStep: {
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 20,
    },
    progressBarContainer: {
      width: '100%',
      marginBottom: 12,
    },
    progressBar: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    progressText: {
      fontSize: 14,
      fontWeight: '500',
    },
    skipButton: {
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    skipButtonText: {
      fontSize: 16,
      fontWeight: '500',
    },
    rippleContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 200,
      marginBottom: 40,
    },
    ripple: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.colors.palette.primary300,
    },
    devicesContainer: {
      marginBottom: 40,
    },
    devicesTitle: {
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 16,
    },
    deviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      marginBottom: 10,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    deviceIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    deviceInfo: {
      flex: 1,
    },
  })
