import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Switch,
  Dimensions,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppTheme, Text } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router'
import LinearGradient from 'react-native-linear-gradient'
import { useStores } from '@/models/helpers/useStores'
import { DeviceCapability } from '@/models/SmartHomeStore'
import CustomColorPicker from '@/components/CustomColorPicker'
import CircularSlider from '@/components/CircularProgress'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'

const { width: screenWidth } = Dimensions.get('window')
const CIRCLE_SIZE = screenWidth * 0.6

export default observer(function LightsControlScreen() {
  const { theme } = useAppTheme()
  const { smartHomeStore } = useStores()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { trackScreenMount } = useInteractionTracking(
    'device',
    `/device/lighting/${id}`,
  )

  const device = smartHomeStore.devices.find(d => d.id === parseInt(id))
  // console.log(device, 'device')

  // Get device capabilities
  const capabilities = device
    ? smartHomeStore.getDeviceCapabilities(device.device_type_id)
    : []

  // Check capabilities instead of subcategories
  const hasBrightness = capabilities.includes(DeviceCapability.BRIGHTNESS)
  const hasColorTemperature = capabilities.includes(
    DeviceCapability.COLOR_TEMPERATURE,
  )
  const hasRgbColors = capabilities.includes(DeviceCapability.RGB_COLORS)
  const hasEffects = capabilities.includes(DeviceCapability.EFFECTS)
  const hasMusicSync = capabilities.includes(DeviceCapability.MUSIC_SYNC)
  const hasEnergyMonitoring = capabilities.includes(
    DeviceCapability.ENERGY_MONITORING,
  )

  const hasMotionDetection = capabilities.includes(
    DeviceCapability.MOTION_DETECTION,
  )
  const hasScheduling = capabilities.includes(DeviceCapability.SCHEDULING)

  // Read device properties directly from store instead of local state
  const deviceProperties = device?.properties
    ? JSON.parse(device.properties)
    : {}

  console.log('deviceProperties', deviceProperties)
  // Extract properties with defaults
  const brightness = deviceProperties.brightness || 0
  const colorTemperature = deviceProperties.color_temperature || 4000
  const colorMode = deviceProperties.color_mode || 'white'
  const selectedColor =
    deviceProperties.color || theme.colors.palette.neutral100
  const effects =
    deviceProperties.effects === 1 || deviceProperties.effects === true
  const musicSync =
    deviceProperties.music_sync === 1 || deviceProperties.music_sync === true
  const energyMonitoring =
    deviceProperties.energy_monitoring === 1 ||
    deviceProperties.energy_monitoring === true
  const motionDetection =
    deviceProperties.motion_detection === 1 ||
    deviceProperties.motion_detection === true
  const scheduling =
    deviceProperties.scheduling === 1 || deviceProperties.scheduling === true

  const [displayBrightness, setDisplayBrightness] = useState(brightness)
  const [displayColorTemperature, setDisplayColorTemperature] =
    useState(colorTemperature)
  const [displayColor, setDisplayColor] = useState(selectedColor)

  const isSlidingRef = React.useRef(false)
  const isColorPickingRef = React.useRef(false)
  const lastSentRef = React.useRef<number | null>(null)
  const initialBrightnessRef = React.useRef<number | null>(null)

  const handleSlidingStart = () => {
    isSlidingRef.current = true
  }

  const handleSlidingComplete = async (val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val)))
    isSlidingRef.current = false
    setDisplayBrightness(clamped)

    if (device && lastSentRef.current !== clamped) {
      lastSentRef.current = clamped
      await smartHomeStore.setDeviceBrightness(device.id.toString(), clamped)
    }
  }

  const handleColorPickingStart = () => {
    isColorPickingRef.current = true
  }

  const handleColorPickingComplete = async (color: string) => {
    isColorPickingRef.current = false
    setDisplayColor(color)
    if (device) {
      await smartHomeStore.setDeviceColor(device.id.toString(), color)
    }
  }

  const handleEnergyMonitoringToggle = async () => {
    const enabled = !energyMonitoring
    if (device) {
      await smartHomeStore.toggleEnergyMonitoring(device.id.toString(), enabled)
    }
  }
  const handleMotionDetectionToggle = async () => {
    const newMotionDetection = !motionDetection
    if (device) {
      await smartHomeStore.setDeviceMotionDetection(
        device.id.toString(),
        newMotionDetection,
      )
    }
  }
  const handleSchedulingToggle = async () => {
    const newScheduling = !scheduling
    if (device) {
      await smartHomeStore.setDeviceScheduling(
        device.id.toString(),
        newScheduling,
      )
    }
  }
  const handleColorTemperatureChange = async (newTemp: number) => {
    const clampedTemp = Math.max(2200, Math.min(6500, newTemp))
    if (device) {
      await smartHomeStore.setDeviceColorTemperature(
        device.id.toString(),
        clampedTemp,
      )
    }
  }

  const handleColorModeChange = async (newMode: 'white' | 'color') => {
    // If white mode is selected, set color to white
    if (newMode === 'white' && device) {
      await smartHomeStore.setDeviceColor(
        device.id.toString(),
        theme.colors.palette.neutral100,
      )
    }

    if (device) {
      await smartHomeStore.setDeviceColorMode(device.id.toString(), newMode)
    }
  }

  const handleEffectsToggle = async () => {
    const newEffects = !effects
    if (device) {
      await smartHomeStore.setDeviceEffects(device.id.toString(), newEffects)
    }
  }

  const handleMusicSyncToggle = async () => {
    const newMusicSync = !musicSync
    if (device) {
      await smartHomeStore.setDeviceMusicSync(
        device.id.toString(),
        newMusicSync,
      )
    }
  }

  const toggleDevice = async () => {
    if (device) {
      await smartHomeStore.toggleDevice(device.id.toString())
    }
  }
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'LightingDeviceControl',
        route: `/device/lighting/${id}`,
      })
      return () => {
        console.log('Lighting device control screen unfocused')
      }
    }, []),
  )

  useEffect(() => {
    if (device?.properties) {
      try {
        const properties = JSON.parse(device.properties)
        const incoming =
          typeof properties.brightness === 'number'
            ? Math.max(0, Math.min(100, Math.round(properties.brightness)))
            : undefined

        if (
          typeof incoming === 'number' &&
          !isSlidingRef.current && // ← don't fight the user
          initialBrightnessRef.current !== incoming // ← only update if different from initial
        ) {
          setDisplayBrightness(incoming)
          initialBrightnessRef.current = incoming
        }

        const incomingColor = properties.color
        if (
          incomingColor &&
          !isColorPickingRef.current &&
          typeof incomingColor === 'string'
        ) {
          setDisplayColor(incomingColor)
        }
      } catch (e) {
        console.error('Error parsing device properties:', e)
      }
    }
  }, [device?.properties])

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        backgroundGradient: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        },
        safeArea: { flex: 1 },
        scrollView: { flex: 1 },
        scrollContent: { paddingBottom: 20 },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
        },
        backButton: { padding: 8 },
        headerTitle: { flex: 1, textAlign: 'center', color: theme.colors.text },
        historyButton: { padding: 8 },
        controlSection: { paddingHorizontal: 16, marginTop: 4 },
        controlTitle: {
          color: theme.colors.palette.neutral800,
          marginBottom: 8,
        },
        circleWrap: { alignItems: 'center' },
        rangeRow: {
          width: 100,
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 6,
        },
        rangeLabel: { fontSize: 10, color: theme.colors.palette.neutral700 },
        sliderContainer: { paddingHorizontal: 8, marginBottom: 16 },
        sliderHeader: {
          alignItems: 'center',
          marginBottom: 8,
        },
        sliderValue: {
          fontSize: 24,
          fontWeight: '700',
          color: theme.colors.palette.neutral900,
        },
        brightnessSlider: {
          width: '100%',
          height: 20,
        },
        sliderLabels: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 8,
          paddingHorizontal: 4,
        },
        sliderLabel: { fontSize: 10, color: theme.colors.palette.neutral700 },
        modeSection: { paddingHorizontal: 16, marginVertical: 12 },
        modeSectionTitle: {
          fontSize: 14,
          fontWeight: '600',
          color: theme.colors.palette.neutral800,
          marginBottom: 8,
        },
        modeItemsContainer: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 8,
        },
        modeItem: {
          flex: 1,
          paddingVertical: 12,
          paddingHorizontal: 8,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: theme.colors.palette.neutral900,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        },
        modeItemLabel: { fontSize: 10, fontWeight: '600', marginTop: 4 },
        colorPickerSection: { paddingHorizontal: 16, marginVertical: 12 },
        colorPickerTitle: {
          color: theme.colors.palette.neutral800,
          marginBottom: 12,
        },
        colorPickerWheel: { height: 100 },
        powerSection: {
          paddingHorizontal: 16,
          marginVertical: 12,
          backgroundColor: theme.colors.palette.neutral200,
          borderRadius: 12,
          padding: 12,
          margin: 16,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
        },
        powerSectionTitle: {
          fontSize: 14,
          fontWeight: '600',
          color: theme.colors.palette.neutral800,
          marginBottom: 8,
        },
        powerToggleContainer: { alignItems: 'center' },
        powerSwitch: {
          transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
        },
        powerLabels: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: 50,
          marginTop: 8,
        },
        powerLabel: { fontSize: 10, fontWeight: '600' },
        toggleSection: {
          paddingHorizontal: 16,
          marginVertical: 12,
          backgroundColor: theme.colors.palette.neutral200,
          borderRadius: 12,
          padding: 12,
          margin: 16,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
        },
        toggleSectionTitle: {
          fontSize: 14,
          fontWeight: '600',
          color: theme.colors.palette.neutral800,
        },
        toggleContainer: { alignItems: 'center' },
        toggleSwitch: {
          transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
        },
        toggleLabels: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: 50,
          marginTop: 8,
        },
        toggleLabel: { fontSize: 10, fontWeight: '600' },
        bottomNavigation: {
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingBottom: 20,
          gap: 12,
          margin: 16,
        },
        navButton: {
          flex: 1,
          alignItems: 'center',
          paddingVertical: 12,
          borderRadius: 25,
        },
        navLabel: { fontSize: 10, fontWeight: '600', marginTop: 4 },
        errorContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        errorText: { fontSize: 16 },
        volumeText: {
          fontSize: 24,
          fontWeight: '700',
          marginBottom: 4,
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
          elevation: 4,
          backgroundColor: theme.colors.palette.neutral200,
        },
      }),
    [theme],
  )

  // Brightness slider control (0-100%)
  const renderBrightnessControl = () => {
    return (
      <View style={styles.controlSection}>
        <Text preset="formLabel" style={styles.controlTitle}>
          Brightness
        </Text>

        <View style={styles.sliderContainer}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderValue}>
              {isSlidingRef.current ? displayBrightness : brightness}%
            </Text>
          </View>

          <Slider
            style={styles.brightnessSlider}
            minimumValue={0}
            maximumValue={100}
            step={5}
            value={isSlidingRef.current ? displayBrightness : brightness}
            onSlidingStart={handleSlidingStart}
            onValueChange={_v => {
              // Don't update state during sliding - let the slider handle its own value
            }}
            onSlidingComplete={handleSlidingComplete}
            minimumTrackTintColor={theme.colors.palette.primary500}
            maximumTrackTintColor={theme.colors.palette.neutral500}
            thumbTintColor={theme.colors.palette.neutral100}
            disabled={!device?.is_on}
          />

          <View style={styles.sliderLabels}>
            <Text preset="formHelper" style={styles.sliderLabel}>
              0%
            </Text>
            <Text preset="formHelper" style={styles.sliderLabel}>
              100%
            </Text>
          </View>
        </View>
      </View>
    )
  }

  // Color Temperature circular control (2200-6500K)
  const renderColorTemperatureControl = () => {
    return (
      <View style={styles.controlSection}>
        <Text preset="formLabel" style={styles.controlTitle}>
          Chromaticity
        </Text>

        <View style={styles.circleWrap}>
          <View style={styles.circularSliderWrapper}>
            <CircularSlider
              value={displayColorTemperature}
              onValueChange={setDisplayColorTemperature}
              min={2200}
              max={6500}
              activeColor={theme.colors.palette.primary500}
              inactiveColor={theme.colors.palette.neutral300}
              disabled={!device?.is_on}
              onSlidingEnd={() =>
                handleColorTemperatureChange(displayColorTemperature)
              }
            />
            <View style={styles.centerDisplay}>
              <Text style={{ ...styles.volumeText, color: theme.colors.text }}>
                {displayColorTemperature}K
              </Text>
              {/* Min/Max labels */}
              <View style={styles.rangeRow}>
                <Text preset="formHelper" style={styles.rangeLabel}>
                  2200K
                </Text>
                <Text preset="formHelper" style={styles.rangeLabel}>
                  6500K
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    )
  }

  const renderColorPicker = () => {
    return (
      <View style={styles.colorPickerSection}>
        <Text preset="formLabel" style={styles.colorPickerTitle}>
          Color
        </Text>

        <View style={styles.colorPickerWheel}>
          <CustomColorPicker
            color={isColorPickingRef.current ? displayColor : selectedColor}
            onTouchStart={handleColorPickingStart}
            onColorChange={color => {
              if (isColorPickingRef.current) {
                setDisplayColor(color)
              }
            }}
            onColorChangeComplete={handleColorPickingComplete}
            thumbSize={30}
            swatches={true}
            swatchesLast={true}
            disabled={!device?.is_on}
          />
        </View>
      </View>
    )
  }

  const renderColorModeSection = () => {
    const modeOptions = [
      { key: 'white', label: 'White', icon: 'sunny' as const },
      { key: 'color', label: 'Color', icon: 'color-palette' as const },
    ]

    return (
      <View style={styles.modeSection}>
        <Text preset="formLabel" style={styles.modeSectionTitle}>
          Color Mode
        </Text>
        <View style={styles.modeItemsContainer}>
          {modeOptions.map(modeOption => (
            <TouchableOpacity
              key={modeOption.key}
              style={[
                styles.modeItem,
                {
                  backgroundColor:
                    colorMode === modeOption.key
                      ? !device?.is_on
                        ? theme.colors.palette.neutral500
                        : theme.colors.palette.primary500
                      : theme.colors.palette.neutral200,
                },
              ]}
              onPress={() =>
                handleColorModeChange(modeOption.key as 'white' | 'color')
              }
              activeOpacity={0.7}
              disabled={!device?.is_on}
            >
              <Ionicons
                name={modeOption.icon}
                size={20}
                color={
                  colorMode === modeOption.key
                    ? !device?.is_on
                      ? theme.colors.palette.neutral300
                      : theme.colors.palette.neutral100
                    : theme.colors.palette.neutral600
                }
              />
              <Text
                preset="formHelper"
                style={{
                  ...styles.modeItemLabel,
                  color:
                    colorMode === modeOption.key
                      ? !device?.is_on
                        ? theme.colors.palette.neutral300
                        : theme.colors.palette.neutral100
                      : theme.colors.palette.neutral600,
                }}
              >
                {modeOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )
  }

  // Reusable toggle section component
  const renderToggleSection = (
    title: string,
    value: boolean,
    onValueChange: () => void,
    isPower = false,
  ) => {
    const sectionStyle = isPower ? styles.powerSection : styles.toggleSection
    const titleStyle = isPower
      ? styles.powerSectionTitle
      : styles.toggleSectionTitle
    const containerStyle = isPower
      ? styles.powerToggleContainer
      : styles.toggleContainer
    const switchStyle = isPower ? styles.powerSwitch : styles.toggleSwitch
    const labelsStyle = isPower ? styles.powerLabels : styles.toggleLabels
    const labelStyle = isPower ? styles.powerLabel : styles.toggleLabel

    return (
      <View style={sectionStyle}>
        <Text preset="formLabel" style={titleStyle}>
          {title}
        </Text>
        <View style={containerStyle}>
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{
              false: theme.colors.palette.neutral300,
              true:
                !device?.is_on && title !== 'Power'
                  ? theme.colors.palette.neutral400
                  : theme.colors.palette.primary500,
            }}
            thumbColor={
              value
                ? theme.colors.palette.neutral100
                : theme.colors.palette.neutral500
            }
            ios_backgroundColor={theme.colors.palette.neutral300}
            style={switchStyle}
            disabled={!device?.is_on && title !== 'Power'}
          />
          <View style={labelsStyle}>
            <Text
              preset="formHelper"
              style={{
                ...labelStyle,
                color: value
                  ? theme.colors.palette.neutral600
                  : theme.colors.palette.neutral400,
              }}
            >
              OFF
            </Text>
            <Text
              preset="formHelper"
              style={{
                ...labelStyle,
                color: value
                  ? !device?.is_on && title !== 'Power'
                    ? theme.colors.palette.neutral400
                    : theme.colors.palette.primary500
                  : theme.colors.palette.neutral400,
              }}
            >
              ON
            </Text>
          </View>
        </View>
      </View>
    )
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text preset="subheading" style={styles.errorText}>
            Device not found
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

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
        {/* Header */}
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
              () => router.push(`/device/history/${id}` as any),
              300,
            )}
            style={styles.historyButton}
          >
            <Ionicons name="time-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Power */}
          {renderToggleSection(
            'Power',
            device?.is_on || false,
            toggleDevice,
            true,
          )}
          {/* Brightness Control */}
          {hasBrightness && renderBrightnessControl()}
          {/* Color Temperature Control - Only show when device supports it */}
          {hasColorTemperature && renderColorTemperatureControl()}
          {/* Color Mode Selection - Only show when device supports RGB colors */}
          {hasRgbColors && renderColorModeSection()}
          {/* Color Picker - Only show when color mode is selected and device supports RGB */}
          {colorMode === 'color' && hasRgbColors && renderColorPicker()}
          {/* Effects control - Only show when device supports effects */}
          {hasEffects &&
            renderToggleSection('Effects', effects, handleEffectsToggle)}
          {/* Music Sync control - Only show when device supports music sync */}
          {hasMusicSync &&
            renderToggleSection('Music Sync', musicSync, handleMusicSyncToggle)}
          {/* Energy Monitoring - Only show when device supports it */}
          {hasEnergyMonitoring &&
            renderToggleSection(
              'Energy Monitoring',
              energyMonitoring,
              handleEnergyMonitoringToggle,
            )}
          {hasMotionDetection &&
            renderToggleSection(
              'Motion Detection',
              motionDetection,
              handleMotionDetectionToggle,
            )}
          {hasScheduling &&
            renderToggleSection(
              'Scheduling',
              scheduling,
              handleSchedulingToggle,
            )}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
})
