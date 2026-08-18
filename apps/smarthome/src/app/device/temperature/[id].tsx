// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useState, useMemo } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Switch,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, useAppTheme, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router'
import LinearGradient from 'react-native-linear-gradient'
import { useStores } from '@/models/helpers/useStores'
import { DeviceCapability } from '@/models'
import CircularSlider from '@/components/CircularProgress'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'

const { width: screenWidth } = Dimensions.get('window')
const CIRCLE_SIZE = screenWidth * 0.6

export default observer(function ThermostatControlScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { smartHomeStore } = useStores()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { trackScreenMount } = useInteractionTracking(
    'device',
    `/device/temperature/${id}`,
  )

  const device = smartHomeStore.devices.find((d: any) => d.id === parseInt(id))

  console.log('device', device)

  // device capabilities
  const capabilities = device
    ? smartHomeStore.getDeviceCapabilities(device.device_type_id)
    : []

  const hasTemperatureControl = capabilities.includes(
    DeviceCapability.TEMPERATURE_CONTROL,
  )
  const hasModeSelection = capabilities.includes(
    DeviceCapability.MODE_SELECTION,
  )
  const hasFanSpeed = capabilities.includes(DeviceCapability.FAN_SPEED)
  const hasOscillation = capabilities.includes(DeviceCapability.OSCILLATION)
  const hasEnergyMonitoring = capabilities.includes(
    DeviceCapability.ENERGY_MONITORING,
  )

  const hasScheduling = capabilities.includes(DeviceCapability.SCHEDULING)

  // Read device properties directly from store
  const deviceProperties = device?.properties
    ? JSON.parse(device.properties)
    : {}

  const fanSpeed = deviceProperties.fan_speed || 1
  const mode = deviceProperties.mode || 'auto'
  const oscillation =
    deviceProperties.oscillation === 1 || deviceProperties.oscillation === true
  const temperature = deviceProperties.temperature || 24
  const energyMonitoring =
    deviceProperties.energy_monitoring === 1 ||
    deviceProperties.energy_monitoring === true

  const scheduling =
    deviceProperties.scheduling === 1 || deviceProperties.scheduling === true

  const [displayTemperature, setDisplayTemperature] = useState(temperature)

  const handleFanSpeedChange = async (newSpeed: number) => {
    // Allow range 1-5
    const clampedSpeed = Math.max(1, Math.min(5, newSpeed))
    if (device) {
      await smartHomeStore.setDeviceFanSpeed(device.id.toString(), clampedSpeed)
    }
  }

  const decrementFanSpeed = () => handleFanSpeedChange(fanSpeed - 1)
  const incrementFanSpeed = () => handleFanSpeedChange(fanSpeed + 1)

  const handleModeChange = async (
    newMode: 'cool' | 'heat' | 'auto' | 'fan_only',
  ) => {
    if (device) {
      await smartHomeStore.setDeviceMode(device.id.toString(), newMode)
    }
  }

  const handleOscillationChange = async (newOscillation: boolean) => {
    if (device) {
      await smartHomeStore.setDeviceOscillation(
        device.id.toString(),
        newOscillation,
      )
    }
  }

  const toggleDevice = async () => {
    if (device) {
      await smartHomeStore.toggleDevice(device.id.toString())
    }
  }

  const handleTemperatureChange = async (newTemp: number) => {
    if (device) {
      await smartHomeStore.setDeviceTemperature(device.id.toString(), newTemp)
    }
  }
  const handleEnergyMonitoringToggle = async (enabled: boolean) => {
    if (device) {
      await smartHomeStore.toggleEnergyMonitoring(device.id.toString(), enabled)
    }
  }

  const handleSchedulingToggle = async (enabled: boolean) => {
    if (device) {
      await smartHomeStore.setDeviceScheduling(device.id.toString(), enabled)
    }
  }
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'TemperatureDeviceControl',
        route: `/device/temperature/${id}`,
      })
    }, []),
  )

  const renderInfoCards = () => {
    const properties = device?.properties ? JSON.parse(device.properties) : {}
    const humidity = properties.humidity

    return (
      <View style={styles.infoCardsContainer}>
        {humidity && (
          <View
            style={[
              styles.infoCard,
              { backgroundColor: theme.colors.palette.neutral200 },
            ]}
          >
            <View
              style={[
                styles.infoIcon,
                { backgroundColor: theme.colors.palette.angry500 },
              ]}
            >
              <Ionicons
                name="water"
                size={20}
                color={theme.colors.palette.neutral100}
              />
            </View>
            <Text preset="formHelper" style={styles.infoLabel}>
              Inside humidity
            </Text>
            <Text size="large">{humidity}%</Text>
          </View>
        )}

        <View
          style={[
            styles.infoCard,
            { backgroundColor: theme.colors.palette.neutral200 },
          ]}
        >
          <View
            style={[
              styles.infoIcon,
              { backgroundColor: theme.colors.palette.primary600 },
            ]}
          >
            <Ionicons
              name="flash"
              size={20}
              color={theme.colors.palette.neutral100}
            />
          </View>
          <Text preset="formHelper" style={styles.infoLabel}>
            Fan Speed
          </Text>
          <View style={styles.fanSpeedContainer}>
            <View style={styles.fanSpeedControls}>
              <TouchableOpacity
                style={[
                  styles.fanSpeedButton,
                  {
                    backgroundColor: !device?.is_on
                      ? theme.colors.palette.neutral300
                      : fanSpeed <= 1
                        ? theme.colors.palette.neutral300
                        : theme.colors.palette.primary500,
                  },
                ]}
                onPress={decrementFanSpeed}
                disabled={!device?.is_on || fanSpeed <= 1}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={
                    !device?.is_on || fanSpeed <= 1
                      ? theme.colors.palette.neutral500
                      : theme.colors.palette.neutral100
                  }
                />
              </TouchableOpacity>

              <View style={styles.fanSpeedDisplay}>
                <Text
                  preset="heading"
                  style={{
                    ...styles.fanSpeedNumber,
                    color: !device?.is_on
                      ? theme.colors.palette.neutral500
                      : theme.colors.palette.neutral800,
                  }}
                >
                  {fanSpeed}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.fanSpeedButton,
                  {
                    backgroundColor: !device?.is_on
                      ? theme.colors.palette.neutral300
                      : fanSpeed >= 5
                        ? theme.colors.palette.neutral300
                        : theme.colors.palette.primary500,
                  },
                ]}
                onPress={incrementFanSpeed}
                disabled={!device?.is_on || fanSpeed >= 5}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={
                    !device?.is_on || fanSpeed >= 5
                      ? theme.colors.palette.neutral500
                      : theme.colors.palette.neutral100
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    )
  }

  // NEW: Temperature circular control (± buttons + progress + labels)
  const renderTemperatureControl = () => {
    // map 10–100 °C to 0–100 % fill

    return (
      <View style={styles.tempSection}>
        <Text preset="formLabel" style={styles.tempTitle}>
          Temperature
        </Text>

        <View style={styles.tempCircleWrap}>
          <View style={styles.circularSliderWrapper}>
            <CircularSlider
              value={displayTemperature}
              onValueChange={setDisplayTemperature}
              min={10}
              max={100}
              activeColor={theme.colors.palette.primary500}
              inactiveColor={theme.colors.palette.neutral300}
              disabled={!device?.is_on}
              onSlidingEnd={() => handleTemperatureChange(displayTemperature)}
            />

            <View style={styles.centerDisplay}>
              <Text style={{ ...styles.modeText, color: theme.colors.textDim }}>
                Temperature
              </Text>
              <Text style={{ ...styles.volumeText, color: theme.colors.text }}>
                {temperature}°F
              </Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  const renderPowerSection = () => {
    const isOn = device?.is_on

    return (
      <View style={styles.powerSection}>
        <Text preset="formLabel" style={styles.powerSectionTitle}>
          Power
        </Text>
        <View style={styles.powerToggleContainer}>
          <Switch
            value={isOn}
            onValueChange={toggleDevice}
            trackColor={{
              false: theme.colors.palette.neutral300,
              true: theme.colors.palette.primary500,
            }}
            thumbColor={
              isOn
                ? theme.colors.palette.neutral100
                : theme.colors.palette.neutral500
            }
            ios_backgroundColor={theme.colors.palette.neutral300}
            style={styles.powerSwitch}
          />
          <View style={styles.powerLabels}>
            <Text
              preset="formHelper"
              style={{
                ...styles.powerLabel,
                color: isOn
                  ? theme.colors.palette.neutral600
                  : theme.colors.palette.neutral500,
              }}
            >
              OFF
            </Text>
            <Text
              preset="formHelper"
              style={{
                ...styles.powerLabel,
                color: isOn
                  ? theme.colors.palette.primary500
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

  const renderModeSection = () => {
    const modeOptions = [
      { key: 'auto', label: 'Auto', icon: 'options' as const },
      { key: 'cool', label: 'Cool', icon: 'snow' as const },
      { key: 'heat', label: 'Heat', icon: 'flame' as const },
    ]

    return (
      <View style={styles.modeSection}>
        <Text preset="formLabel" style={styles.modeSectionTitle}>
          Mode
        </Text>
        <View style={styles.modeItemsContainer}>
          {modeOptions.map(modeOption => (
            <TouchableOpacity
              key={modeOption.key}
              style={[
                styles.modeItem,
                {
                  backgroundColor:
                    mode === modeOption.key
                      ? !device?.is_on
                        ? theme.colors.palette.neutral500
                        : theme.colors.palette.primary500
                      : theme.colors.palette.neutral200,
                },
              ]}
              onPress={() =>
                handleModeChange(
                  modeOption.key as 'cool' | 'heat' | 'auto' | 'fan_only',
                )
              }
              activeOpacity={0.7}
              disabled={!device?.is_on}
            >
              <Ionicons
                name={modeOption.icon}
                size={24}
                color={
                  mode === modeOption.key
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
                    mode === modeOption.key
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

  const renderFanSpeedSection = () => {
    return (
      <View style={styles.powerSection}>
        <Text preset="formLabel" style={styles.powerSectionTitle}>
          Fan Speed
        </Text>
        <View style={styles.fanSpeedControlContainer}>
          <TouchableOpacity
            style={[
              styles.fanSpeedButton,
              {
                backgroundColor: !device?.is_on
                  ? theme.colors.palette.neutral300
                  : fanSpeed <= 1
                    ? theme.colors.palette.neutral300
                    : theme.colors.palette.primary500,
              },
            ]}
            onPress={decrementFanSpeed}
            disabled={!device?.is_on || fanSpeed <= 1}
            activeOpacity={0.7}
          >
            <Ionicons
              name="remove"
              size={24}
              color={
                !device?.is_on || fanSpeed <= 1
                  ? theme.colors.palette.neutral500
                  : theme.colors.palette.neutral100
              }
            />
          </TouchableOpacity>

          <View style={styles.fanSpeedDisplay}>
            <Text
              preset="heading"
              style={{
                ...styles.fanSpeedNumber,
                color: !device?.is_on
                  ? theme.colors.palette.neutral500
                  : theme.colors.palette.neutral800,
              }}
            >
              {fanSpeed}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.fanSpeedButton,
              {
                backgroundColor: !device?.is_on
                  ? theme.colors.palette.neutral300
                  : fanSpeed >= 5
                    ? theme.colors.palette.neutral300
                    : theme.colors.palette.primary500,
              },
            ]}
            onPress={incrementFanSpeed}
            disabled={!device?.is_on || fanSpeed >= 5}
            activeOpacity={0.7}
          >
            <Ionicons
              name="add"
              size={24}
              color={
                !device?.is_on || fanSpeed >= 5
                  ? theme.colors.palette.neutral500
                  : theme.colors.palette.neutral100
              }
            />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderOscillationSection = () => {
    return (
      <View style={styles.powerSection}>
        <Text preset="formLabel" style={styles.powerSectionTitle}>
          Oscillation
        </Text>
        <View style={styles.oscillationToggleContainer}>
          <Switch
            value={oscillation}
            onValueChange={handleOscillationChange}
            trackColor={{
              false: theme.colors.palette.neutral300,
              true: !device?.is_on
                ? theme.colors.palette.neutral500
                : theme.colors.palette.primary500,
            }}
            thumbColor={
              oscillation
                ? theme.colors.palette.neutral100
                : theme.colors.palette.neutral500
            }
            ios_backgroundColor={theme.colors.palette.neutral300}
            style={styles.oscillationSwitch}
            disabled={!device?.is_on}
          />
          <View style={styles.oscillationLabels}>
            <Text
              preset="formHelper"
              style={{
                ...styles.oscillationLabel,
                color: oscillation
                  ? theme.colors.palette.neutral600
                  : theme.colors.palette.neutral500,
              }}
            >
              OFF
            </Text>
            <Text
              preset="formHelper"
              style={{
                ...styles.oscillationLabel,
                color: oscillation
                  ? !device?.is_on
                    ? theme.colors.palette.neutral500
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

  const renderEnergyMonitoringSection = () => {
    return (
      <View style={styles.powerSection}>
        <Text preset="formLabel" style={styles.powerSectionTitle}>
          Energy Monitoring
        </Text>
        <View style={styles.oscillationToggleContainer}>
          <Switch
            value={energyMonitoring}
            onValueChange={handleEnergyMonitoringToggle}
            trackColor={{
              false: theme.colors.palette.neutral300,
              true: !device?.is_on
                ? theme.colors.palette.neutral500
                : theme.colors.palette.primary500,
            }}
            thumbColor={
              energyMonitoring
                ? theme.colors.palette.neutral100
                : theme.colors.palette.neutral500
            }
            disabled={!device?.is_on}
          />
          <View style={styles.powerLabels}>
            <Text
              preset="formHelper"
              style={{
                ...styles.powerLabel,
                color: energyMonitoring
                  ? theme.colors.palette.neutral600
                  : theme.colors.palette.neutral500,
              }}
            >
              OFF
            </Text>
            <Text
              preset="formHelper"
              style={{
                ...styles.powerLabel,
                color: energyMonitoring
                  ? theme.colors.palette.primary500
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

  const renderSchedulingSection = () => {
    return (
      <View style={styles.powerSection}>
        <Text preset="formLabel" style={styles.powerSectionTitle}>
          Scheduling
        </Text>
        <View style={styles.oscillationToggleContainer}>
          <Switch
            value={scheduling}
            onValueChange={handleSchedulingToggle}
            trackColor={{
              false: theme.colors.palette.neutral300,
              true: !device?.is_on
                ? theme.colors.palette.neutral500
                : theme.colors.palette.primary500,
            }}
            thumbColor={
              scheduling
                ? theme.colors.palette.neutral100
                : theme.colors.palette.neutral500
            }
            disabled={!device?.is_on}
          />
          <View style={styles.powerLabels}>
            <Text
              preset="formHelper"
              style={{
                ...styles.powerLabel,
                color: scheduling
                  ? theme.colors.palette.neutral600
                  : theme.colors.palette.neutral500,
              }}
            >
              OFF
            </Text>
            <Text
              preset="formHelper"
              style={{
                ...styles.powerLabel,
                color: scheduling
                  ? theme.colors.palette.primary500
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
          {renderPowerSection()}

          {/* Conditional rendering based on device capabilities */}
          {/* Temperature Control - Only show when device supports it */}
          {hasTemperatureControl && renderTemperatureControl()}

          {/* Info cards - Show when device has temperature control */}
          {hasTemperatureControl && renderInfoCards()}

          {/* Mode Selection - Only show when device supports it */}
          {hasModeSelection && renderModeSection()}

          {/* Fan Speed Control - Only show when device supports it */}
          {hasFanSpeed && !deviceProperties.humidity && renderFanSpeedSection()}

          {/* Oscillation Control - Only show when device supports it */}
          {hasOscillation && renderOscillationSection()}

          {/* Energy Monitoring - Only show when device supports it */}
          {hasEnergyMonitoring && renderEnergyMonitoringSection()}

          {hasScheduling && renderSchedulingSection()}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
})

const createStyles = (theme: Theme) =>
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

    circularSliderWrapper: {
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
    },

    // ----- Info cards (existing) -----
    infoCardsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 12,
      marginVertical: 20,
    },
    infoCard: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    infoIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    infoLabel: { fontSize: 12, textAlign: 'center', marginBottom: 4 },
    fanSpeedContainer: { alignItems: 'center', marginTop: 8, width: '100%' },
    fanSpeedControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fanSpeedButton: {
      width: 32,
      height: 32,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    fanSpeedDisplay: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 60,
    },
    fanSpeedNumber: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral800,
    },

    // ----- NEW: Temperature circular control -----
    tempSection: { paddingHorizontal: 16, marginTop: 6 },
    tempTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
      marginBottom: 12,
    },
    tempCircleWrap: { alignItems: 'center' },

    // ----- Mode (existing) -----
    modeSection: { paddingHorizontal: 16, marginVertical: 20 },
    modeSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
      marginBottom: 12,
    },
    modeItemsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    modeItem: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    modeItemLabel: { fontSize: 12, fontWeight: '600', marginTop: 8 },

    fanSpeedControlContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },

    oscillationToggleContainer: { alignItems: 'center' },
    oscillationSwitch: {
      transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
    },
    oscillationLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: 50,
      marginTop: 8,
    },
    oscillationLabel: { fontSize: 10, fontWeight: '600' },
    powerSection: {
      paddingHorizontal: 16,
      marginVertical: 20,
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      padding: 16,
      margin: 16,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    powerSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
      marginBottom: 12,
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

    // ----- Bottom nav (existing) -----
    bottomNavigation: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingBottom: 20,
      gap: 12,
    },
    navButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 25,
    },
    navLabel: { fontSize: 10, fontWeight: '600', marginTop: 4 },

    // ----- Errors -----
    errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorText: { fontSize: 16 },

    volumeText: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 4,
    },
    modeText: {
      fontSize: 12,
      fontWeight: '500',
      marginBottom: 4,
    },
    // ----- Energy Monitoring Styles -----
    energySection: {
      marginHorizontal: 16,
      marginVertical: 12,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.palette.neutral200,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    energyToggleContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    energyToggleInfo: {
      flex: 1,
    },
    energyToggleLabel: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 4,
    },
  })
