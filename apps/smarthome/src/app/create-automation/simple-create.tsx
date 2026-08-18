// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  Input,
  Screen,
  Text,
  useAppTheme,
  type Theme,
} from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo } from 'react'
import {
  Dimensions,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AppHeader } from '@/components'
import { useStores } from '@/models/helpers/useStores'
import { SelectedDevice } from '@/models/AutomationCreationStore'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

const TRIGGER_TYPES = [
  {
    id: 'time',
    name: 'Time-based',
    description: 'Trigger at specific times',
    icon: 'time-outline',
    color: 'primary',
  },
  {
    id: 'geofence',
    name: 'Location-based',
    description: 'Trigger when arriving/leaving',
    icon: 'location-outline',
    color: 'secondary',
  },
]

export default observer(function SimpleCreateAutomationScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { smartHomeStore, userStore, automationCreationStore } = useStores()
  const { trackScreenMount } = useInteractionTracking(
    'simple-create-automation',
    '/create-automation/simple-create',
  )
  const { sessionId } = useLocalSearchParams()

  useEffect(() => {
    if (sessionId) {
      automationCreationStore.startSession(sessionId as string)
    }
  }, [trackScreenMount, sessionId])

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      automationCreationStore.clearForm()
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        platform: Platform.OS,
        screen: 'simpleCreateAutomation',
        route: '/create-automation/simple-create',
        screenDimensions: {
          width: Dimensions.get('window').width,
          height: Dimensions.get('window').height,
        },
        userId: userStore.user?.id,
        automationName: automationCreationStore.automationName,
        selectedTriggerType: automationCreationStore.selectedTriggerType,
      })

      // No cleanup for create mode - preserve user input
    }, [
      automationCreationStore.automationName,
      automationCreationStore.selectedTriggerType,
      userStore.user?.id,
      automationCreationStore,
    ]),
  )

  // Filter devices based on search query
  const filteredDevices = smartHomeStore.devices.filter(device => {
    const searchLower = automationCreationStore.deviceSearchQuery.toLowerCase()
    return (
      device.name.toLowerCase().includes(searchLower) ||
      device.deviceType?.name?.toLowerCase().includes(searchLower) ||
      device.room?.name?.toLowerCase().includes(searchLower)
    )
  })

  const handleDeviceToggle = (device: any) => {
    const isSelected = automationCreationStore.selectedDevices.some(
      d => d.id === device.id,
    )

    if (isSelected) {
      automationCreationStore.removeDevice(device.id)
    } else {
      const newDevice: SelectedDevice = {
        id: device.id,
        name: device.name,
        deviceType: device.deviceType?.name || 'Unknown Device',
        roomName: device.room?.name,
        order: automationCreationStore.selectedDevices.length + 1,
        actionType: 'turn_on',
      }
      automationCreationStore.addDevice(newDevice)
    }
  }

  const handleActionTypeChange = (
    deviceId: number,
    actionType: 'turn_on' | 'turn_off',
  ) => {
    automationCreationStore.updateDeviceAction(deviceId, actionType)
  }

  const handleDayToggle = (day: string) => {
    automationCreationStore.toggleDay(day)
  }

  const handleTimeConfirm = () => {
    automationCreationStore.confirmTime()
  }

  const handleTimeCancel = () => {
    automationCreationStore.setShowTimePicker(false)
  }

  const handleCreateAutomation = async () => {
    if (!automationCreationStore.isFormValid) {
      console.log('Form validation failed:', {
        selectedTriggerType: automationCreationStore.selectedTriggerType,
        selectedDevicesLength: automationCreationStore.selectedDevices.length,
      })
      return
    }

    try {
      console.log(
        'Creating automation with devices:',
        automationCreationStore.selectedDevices,
      )
      let triggerValue: any = {}

      if (automationCreationStore.selectedTriggerType === 'time') {
        if (automationCreationStore.repeatType === 'daily') {
          triggerValue = {
            time: automationCreationStore.selectedTime,
            days: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
          }
        } else if (automationCreationStore.repeatType === 'weekdays') {
          triggerValue = {
            time: automationCreationStore.selectedTime,
            days: ['mon', 'tue', 'wed', 'thu', 'fri'],
          }
        } else if (automationCreationStore.selectedDays.length > 0) {
          triggerValue = {
            time: automationCreationStore.selectedTime,
            days: automationCreationStore.selectedDays.slice(),
          }
        } else {
          triggerValue = {
            time: automationCreationStore.selectedTime,
            days: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
          }
        }
      } else if (automationCreationStore.selectedTriggerType === 'geofence') {
        triggerValue = {
          trigger: automationCreationStore.geofenceTrigger,
          radius: automationCreationStore.geofenceRadius,
        }
      }

      const automationData = {
        name: automationCreationStore.automationName,
        description: automationCreationStore.automationDescription,
        trigger_type: automationCreationStore.selectedTriggerType!,
        trigger_value: JSON.stringify(triggerValue),
        is_active: true,
      }

      console.log('Creating automation with data:', automationData)
      const newAutomation =
        await smartHomeStore.createAutomation(automationData)

      console.log('New automation created:', newAutomation)

      if (newAutomation) {
        // Create automation actions
        const sortedDevices = [...automationCreationStore.selectedDevices].sort(
          (a, b) => a.order - b.order,
        )

        console.log('Creating actions for devices:', sortedDevices)

        for (const device of sortedDevices) {
          let actionValue = '{}'
          if (device.actionType === 'turn_on') {
            actionValue = JSON.stringify({ is_on: true })
          } else if (device.actionType === 'turn_off') {
            actionValue = JSON.stringify({ is_on: false })
          }

          console.log(
            'Creating action for device:',
            device.name,
            'with value:',
            actionValue,
          )

          const actionResult = await smartHomeStore.createAutomationAction({
            automation_id: newAutomation.id,
            action_type: 'device_control',
            device_id: device.id,
            action_value: actionValue,
            order: device.order,
          })

          console.log('Action created:', actionResult)
        }

        // Clear form and end session
        automationCreationStore.clearForm()
        automationCreationStore.endSession()

        console.log('All actions created, navigating to automations')
        router.push('/(app)/automations')
      } else {
        console.log('Failed to create automation')
      }
    } catch (error) {
      console.error('Error creating automation:', error)
    }
  }

  const isFormValid = () => {
    return automationCreationStore.isFormValid
  }

  const renderTriggerType = (trigger: (typeof TRIGGER_TYPES)[0]) => (
    <TouchableOpacity
      key={trigger.id}
      style={[
        styles.triggerCard,
        {
          backgroundColor: theme.colors.palette.neutral200,
          borderColor:
            automationCreationStore.selectedTriggerType === trigger.id
              ? theme.colors.palette.primary500
              : theme.colors.palette.neutral300,
        },
      ]}
      onPress={() => automationCreationStore.setSelectedTriggerType(trigger.id)}
      activeOpacity={0.7}
    >
      <View style={styles.triggerContent}>
        <View
          style={[
            styles.triggerIcon,
            {
              backgroundColor:
                theme.colors.palette[
                  `${trigger.color}100` as keyof typeof theme.colors.palette
                ],
            },
          ]}
        >
          <Ionicons
            name={trigger.icon as any}
            size={24}
            color={
              theme.colors.palette[
                `${trigger.color}500` as keyof typeof theme.colors.palette
              ]
            }
          />
        </View>
        <View style={styles.triggerText}>
          <Text
            size="large"
            style={{
              color:
                automationCreationStore.selectedTriggerType === trigger.id
                  ? theme.colors.palette.primary500
                  : theme.colors.text,
            }}
          >
            {trigger.name}
          </Text>
          <Text size="small" style={{ color: theme.colors.textDim }}>
            {trigger.description}
          </Text>
        </View>
        <View style={styles.triggerSelector}>
          <View
            style={[
              styles.checkbox,
              {
                borderColor:
                  automationCreationStore.selectedTriggerType === trigger.id
                    ? theme.colors.palette.primary500
                    : theme.colors.palette.neutral400,
                backgroundColor:
                  automationCreationStore.selectedTriggerType === trigger.id
                    ? theme.colors.palette.primary500
                    : 'transparent',
              },
            ]}
          >
            {automationCreationStore.selectedTriggerType === trigger.id && (
              <Ionicons
                name="checkmark"
                size={12}
                color={theme.colors.palette.neutral100}
              />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderSelectedDevice = (device: SelectedDevice, index: number) => (
    <View key={device.id} style={styles.selectedDeviceItem}>
      <View style={styles.deviceOrder}>
        <Text size="small" style={{ color: theme.colors.text }}>
          {index + 1}
        </Text>
      </View>
      <View style={styles.deviceInfo}>
        <Text size="large" style={{ color: theme.colors.text }}>
          {device.name}
        </Text>
        <Text size="small" style={{ color: theme.colors.textDim }}>
          {device.deviceType}
        </Text>
      </View>
      <View style={styles.deviceActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor:
                device.actionType === 'turn_on'
                  ? theme.colors.palette.success500
                  : theme.colors.palette.neutral200,
            },
          ]}
          onPress={() => handleActionTypeChange(device.id, 'turn_on')}
        >
          <Ionicons
            name="power"
            size={14}
            color={
              device.actionType === 'turn_on'
                ? theme.colors.text
                : theme.colors.textDim
            }
          />
          <Text
            size="small"
            style={{
              color:
                device.actionType === 'turn_on'
                  ? theme.colors.text
                  : theme.colors.textDim,
            }}
          >
            On
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor:
                device.actionType === 'turn_off'
                  ? theme.colors.palette.angry500
                  : theme.colors.palette.neutral200,
            },
          ]}
          onPress={() => handleActionTypeChange(device.id, 'turn_off')}
        >
          <Ionicons
            name="power-outline"
            size={14}
            color={
              device.actionType === 'turn_off'
                ? theme.colors.text
                : theme.colors.textDim
            }
          />
          <Text
            size="small"
            style={{
              color:
                device.actionType === 'turn_off'
                  ? theme.colors.text
                  : theme.colors.textDim,
            }}
          >
            Off
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleDeviceToggle({ id: device.id })}
        >
          <Ionicons
            name="close"
            size={16}
            color={theme.colors.palette.angry500}
          />
        </TouchableOpacity>
      </View>
    </View>
  )

  const DAYS = [
    { id: 'sun', name: 'Sun' },
    { id: 'mon', name: 'Mon' },
    { id: 'tue', name: 'Tue' },
    { id: 'wed', name: 'Wed' },
    { id: 'thu', name: 'Thu' },
    { id: 'fri', name: 'Fri' },
    { id: 'sat', name: 'Sat' },
  ]

  return (
    <>
      <Screen preset="scroll" backgroundColor="transparent">
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
            title="Create Automation"
            showSearch={false}
            showProfile={false}
            showBack={true}
            rightComponent={
              <TouchableOpacity
                style={[
                  styles.doneButton,
                  {
                    backgroundColor: isFormValid()
                      ? theme.colors.palette.primary500
                      : theme.colors.palette.neutral400,
                  },
                ]}
                onPress={handleCreateAutomation}
                disabled={!isFormValid()}
                activeOpacity={0.7}
              >
                <Text
                  size="small"
                  style={{
                    color: isFormValid()
                      ? theme.colors.text
                      : theme.colors.textDim,
                    fontWeight: '600',
                  }}
                >
                  Create
                </Text>
              </TouchableOpacity>
            }
          />

          <View style={styles.scrollContent}>
            {/* Basic Info */}
            <View style={styles.section}>
              <Text
                size="large"
                style={{ color: theme.colors.text, paddingBottom: 8 }}
              >
                Basic Info
              </Text>
              <View style={styles.inputContainer}>
                <Text size="small" style={{ color: theme.colors.textDim }}>
                  Automation Name
                </Text>
                <Input
                  placeholder="Enter automation name"
                  value={automationCreationStore.automationName}
                  onChangeText={automationCreationStore.setAutomationName}
                  style={{
                    backgroundColor: theme.colors.palette.neutral200,
                    borderColor: theme.colors.palette.neutral300,
                    fontSize: 16,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                  }}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text size="small" style={{ color: theme.colors.textDim }}>
                  Description (Optional)
                </Text>
                <Input
                  placeholder="Enter description"
                  value={automationCreationStore.automationDescription}
                  onChangeText={
                    automationCreationStore.setAutomationDescription
                  }
                  multiline
                  numberOfLines={2}
                  style={{
                    backgroundColor: theme.colors.palette.neutral200,
                    borderColor: theme.colors.palette.neutral300,
                    fontSize: 16,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                />
              </View>
            </View>

            {/* Trigger Type Selection */}
            <View style={styles.section}>
              <Text size="large" style={{ color: theme.colors.text }}>
                Choose Trigger Type
              </Text>
              <Text size="small" style={{ color: theme.colors.textDim }}>
                Select how this automation should be triggered
              </Text>

              <View style={styles.triggerTypes}>
                {TRIGGER_TYPES.map(renderTriggerType)}
              </View>
            </View>

            {/* Trigger Settings */}
            {automationCreationStore.selectedTriggerType === 'time' && (
              <View style={styles.section}>
                <Text size="xl" style={{ color: theme.colors.text }}>
                  Time Settings
                </Text>

                <View style={styles.timeSettings}>
                  <View style={styles.inputContainer}>
                    <Text size="medium" style={{ color: theme.colors.textDim }}>
                      Time
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.timePickerButton,
                        {
                          backgroundColor: theme.colors.palette.neutral200,
                          borderColor: theme.colors.palette.neutral300,
                        },
                      ]}
                      onPress={() =>
                        automationCreationStore.setShowTimePicker(true)
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="time-outline"
                        size={20}
                        color={theme.colors.palette.primary500}
                      />
                      <Text size="large" style={{ color: theme.colors.text }}>
                        {automationCreationStore.selectedTime}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color={theme.colors.textDim}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.repeatOptions}>
                    <TouchableOpacity
                      style={[
                        styles.repeatButton,
                        {
                          backgroundColor:
                            automationCreationStore.repeatType === 'daily'
                              ? theme.colors.palette.primary500
                              : theme.colors.palette.neutral200,
                        },
                      ]}
                      onPress={() =>
                        automationCreationStore.setRepeatType('daily')
                      }
                    >
                      <Text
                        size="medium"
                        style={{
                          color:
                            automationCreationStore.repeatType === 'daily'
                              ? theme.colors.text
                              : theme.colors.textDim,
                        }}
                      >
                        Daily
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.repeatButton,
                        {
                          backgroundColor:
                            automationCreationStore.repeatType === 'weekdays'
                              ? theme.colors.palette.primary500
                              : theme.colors.palette.neutral200,
                        },
                      ]}
                      onPress={() =>
                        automationCreationStore.setRepeatType('weekdays')
                      }
                    >
                      <Text
                        preset="formLabel"
                        style={{
                          color:
                            automationCreationStore.repeatType === 'weekdays'
                              ? theme.colors.text
                              : theme.colors.textDim,
                        }}
                      >
                        Weekdays
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.repeatButton,
                        {
                          backgroundColor:
                            automationCreationStore.repeatType === 'custom'
                              ? theme.colors.palette.primary500
                              : theme.colors.palette.neutral200,
                        },
                      ]}
                      onPress={() =>
                        automationCreationStore.setRepeatType('custom')
                      }
                    >
                      <Text
                        preset="formLabel"
                        style={{
                          color:
                            automationCreationStore.repeatType === 'custom'
                              ? theme.colors.text
                              : theme.colors.textDim,
                        }}
                      >
                        Custom
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {automationCreationStore.repeatType === 'custom' && (
                    <View style={styles.customDaysContainer}>
                      <Text
                        size="small"
                        style={{ color: theme.colors.textDim }}
                      >
                        Select Days
                      </Text>
                      <View style={styles.daysGrid}>
                        {DAYS.map(day => (
                          <TouchableOpacity
                            key={day.id}
                            style={[
                              styles.dayButton,
                              {
                                backgroundColor:
                                  automationCreationStore.selectedDays.includes(
                                    day.id,
                                  )
                                    ? theme.colors.palette.primary500
                                    : theme.colors.palette.neutral200,
                              },
                            ]}
                            onPress={() => handleDayToggle(day.id)}
                          >
                            <Text
                              size="small"
                              style={{
                                color:
                                  automationCreationStore.selectedDays.includes(
                                    day.id,
                                  )
                                    ? theme.colors.text
                                    : theme.colors.textDim,
                              }}
                            >
                              {day.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {automationCreationStore.selectedTriggerType === 'geofence' && (
              <View style={styles.section}>
                <Text size="xl" style={{ color: theme.colors.text }}>
                  Location Settings
                </Text>

                <View style={styles.geofenceSettings}>
                  <View style={styles.geofenceOption}>
                    <TouchableOpacity
                      style={[
                        styles.geofenceButton,
                        {
                          backgroundColor:
                            automationCreationStore.geofenceTrigger === 'enter'
                              ? theme.colors.palette.success500
                              : theme.colors.palette.neutral200,
                        },
                      ]}
                      onPress={() =>
                        automationCreationStore.setGeofenceTrigger('enter')
                      }
                    >
                      <Ionicons
                        name="enter-outline"
                        size={20}
                        color={
                          automationCreationStore.geofenceTrigger === 'enter'
                            ? theme.colors.text
                            : theme.colors.textDim
                        }
                      />
                      <Text
                        size="small"
                        style={{
                          color:
                            automationCreationStore.geofenceTrigger === 'enter'
                              ? theme.colors.text
                              : theme.colors.textDim,
                        }}
                      >
                        When Arriving
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.geofenceButton,
                        {
                          backgroundColor:
                            automationCreationStore.geofenceTrigger === 'leave'
                              ? theme.colors.palette.angry500
                              : theme.colors.palette.neutral200,
                        },
                      ]}
                      onPress={() =>
                        automationCreationStore.setGeofenceTrigger('leave')
                      }
                    >
                      <Ionicons
                        name="exit-outline"
                        size={20}
                        color={
                          automationCreationStore.geofenceTrigger === 'leave'
                            ? theme.colors.text
                            : theme.colors.textDim
                        }
                      />
                      <Text
                        size="small"
                        style={{
                          color:
                            automationCreationStore.geofenceTrigger === 'leave'
                              ? theme.colors.text
                              : theme.colors.textDim,
                        }}
                      >
                        When Leaving
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.radiusOptions}>
                    <Text size="small" style={{ color: theme.colors.textDim }}>
                      Detection Radius
                    </Text>
                    <View style={styles.radiusButtons}>
                      {[50, 100, 200, 500].map(radius => (
                        <TouchableOpacity
                          key={radius}
                          style={[
                            styles.radiusButton,
                            {
                              backgroundColor:
                                automationCreationStore.geofenceRadius ===
                                radius
                                  ? theme.colors.palette.primary500
                                  : theme.colors.palette.neutral200,
                            },
                          ]}
                          onPress={() =>
                            automationCreationStore.setGeofenceRadius(radius)
                          }
                        >
                          <Text
                            size="small"
                            style={{
                              color:
                                automationCreationStore.geofenceRadius ===
                                radius
                                  ? theme.colors.text
                                  : theme.colors.textDim,
                            }}
                          >
                            {radius}m
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Device Selection */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text size="xl" style={{ color: theme.colors.text }}>
                  Select Devices
                </Text>
                <TouchableOpacity
                  style={styles.addDeviceButton}
                  onPress={() =>
                    automationCreationStore.setShowDevicePicker(true)
                  }
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={theme.colors.palette.primary500}
                  />
                  <Text
                    size="small"
                    style={{ color: theme.colors.palette.primary500 }}
                  >
                    Add Device
                  </Text>
                </TouchableOpacity>
              </View>

              {automationCreationStore.selectedDevices.length > 0 ? (
                <View style={styles.selectedDevicesContainer}>
                  {automationCreationStore.selectedDevices.map(
                    renderSelectedDevice,
                  )}
                </View>
              ) : (
                <View style={styles.emptyDevicesContainer}>
                  <Ionicons
                    name="hardware-chip-outline"
                    size={48}
                    color={theme.colors.textDim}
                  />
                  <Text size="large" style={{ color: theme.colors.textDim }}>
                    No devices selected
                  </Text>
                  <Text size="small" style={{ color: theme.colors.textDim }}>
                    Tap "Add Device" to select devices for this automation
                  </Text>
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Screen>

      {/* Device Picker Modal */}
      <Modal
        visible={automationCreationStore.showDevicePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() =>
          automationCreationStore.setShowDevicePicker(false)
        }
      >
        <TouchableOpacity
          style={styles.timePickerOverlay}
          activeOpacity={1}
          onPress={() => {
            automationCreationStore.setShowDevicePicker(false)
            automationCreationStore.setDeviceSearchQuery('')
          }}
        >
          <View
            style={[
              styles.devicePickerModal,
              { backgroundColor: theme.colors.palette.neutral100 },
            ]}
          >
            <View style={styles.timePickerHeader}>
              <TouchableOpacity
                onPress={() => {
                  automationCreationStore.setShowDevicePicker(false)
                  automationCreationStore.setDeviceSearchQuery('')
                }}
              >
                <Text size="small" style={{ color: theme.colors.textDim }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text size="large" style={{ color: theme.colors.text }}>
                Select Devices
              </Text>
              <TouchableOpacity
                onPress={() => {
                  automationCreationStore.setShowDevicePicker(false)
                  automationCreationStore.setDeviceSearchQuery('')
                }}
              >
                <Text
                  size="small"
                  style={{ color: theme.colors.palette.primary500 }}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Input
                placeholder="Search devices..."
                value={automationCreationStore.deviceSearchQuery}
                onChangeText={automationCreationStore.setDeviceSearchQuery}
                LeftAccessory={() => (
                  <Ionicons
                    name="search-outline"
                    size={20}
                    color={theme.colors.textDim}
                  />
                )}
                style={{
                  backgroundColor: theme.colors.palette.neutral200,
                  borderColor: theme.colors.palette.neutral300,
                  fontSize: 16,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                }}
              />
            </View>

            <FlatList
              data={filteredDevices}
              keyExtractor={device => device.id.toString()}
              renderItem={({ item }) => {
                const isSelected = automationCreationStore.selectedDevices.some(
                  d => d.id === item.id,
                )
                const selectedDevice =
                  automationCreationStore.selectedDevices.find(
                    d => d.id === item.id,
                  )
                return (
                  <View style={styles.devicePickerItem}>
                    <TouchableOpacity
                      style={styles.devicePickerContent}
                      onPress={() => handleDeviceToggle(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="hardware-chip-outline"
                        size={24}
                        color={
                          isSelected
                            ? theme.colors.palette.primary500
                            : theme.colors.palette.neutral600
                        }
                      />
                      <View style={styles.devicePickerText}>
                        <Text size="large" style={{ color: theme.colors.text }}>
                          {item.name}
                        </Text>
                        <Text
                          size="small"
                          style={{ color: theme.colors.textDim }}
                        >
                          {item.deviceType?.name || 'Unknown Device'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: isSelected
                              ? theme.colors.palette.primary500
                              : theme.colors.palette.neutral400,
                            backgroundColor: isSelected
                              ? theme.colors.palette.primary500
                              : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color={theme.colors.palette.neutral100}
                          />
                        )}
                      </View>
                    </TouchableOpacity>

                    {isSelected && selectedDevice && (
                      <View style={styles.deviceActionControls}>
                        <View style={styles.actionControlsButtons}>
                          <TouchableOpacity
                            style={[
                              styles.actionControlButton,
                              {
                                backgroundColor:
                                  selectedDevice.actionType === 'turn_on'
                                    ? theme.colors.palette.success500
                                    : theme.colors.palette.neutral200,
                              },
                            ]}
                            onPress={() =>
                              handleActionTypeChange(item.id, 'turn_on')
                            }
                          >
                            <Ionicons
                              name="power"
                              size={16}
                              color={
                                selectedDevice.actionType === 'turn_on'
                                  ? theme.colors.text
                                  : theme.colors.textDim
                              }
                            />
                            <Text
                              size="small"
                              style={{
                                color:
                                  selectedDevice.actionType === 'turn_on'
                                    ? theme.colors.text
                                    : theme.colors.textDim,
                              }}
                            >
                              On
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.actionControlButton,
                              {
                                backgroundColor:
                                  selectedDevice.actionType === 'turn_off'
                                    ? theme.colors.palette.angry500
                                    : theme.colors.palette.neutral200,
                              },
                            ]}
                            onPress={() =>
                              handleActionTypeChange(item.id, 'turn_off')
                            }
                          >
                            <Ionicons
                              name="power-outline"
                              size={16}
                              color={
                                selectedDevice.actionType === 'turn_off'
                                  ? theme.colors.text
                                  : theme.colors.textDim
                              }
                            />
                            <Text
                              size="small"
                              style={{
                                color:
                                  selectedDevice.actionType === 'turn_off'
                                    ? theme.colors.text
                                    : theme.colors.textDim,
                              }}
                            >
                              Off
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )
              }}
              contentContainerStyle={styles.devicePickerList}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Custom Time Picker Modal */}
      <Modal
        visible={automationCreationStore.showTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={handleTimeCancel}
      >
        <TouchableOpacity
          style={styles.timePickerOverlay}
          activeOpacity={1}
          onPress={handleTimeCancel}
        >
          <View
            style={[
              styles.timePickerModal,
              { backgroundColor: theme.colors.palette.neutral100 },
            ]}
          >
            <View style={styles.timePickerHeader}>
              <TouchableOpacity onPress={handleTimeCancel}>
                <Text size="small" style={{ color: theme.colors.textDim }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text size="large" style={{ color: theme.colors.text }}>
                Select Time
              </Text>
              <TouchableOpacity onPress={handleTimeConfirm}>
                <Text
                  size="small"
                  style={{ color: theme.colors.palette.primary500 }}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timePickerContent}>
              {/* Hour Picker */}
              <View style={styles.timePickerColumn}>
                <Text
                  size="small"
                  style={{
                    color: theme.colors.textDim,
                    textAlign: 'center',
                    marginBottom: 8,
                  }}
                >
                  Hour
                </Text>
                <ScrollView
                  style={styles.timePickerScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.timePickerItem,
                        {
                          backgroundColor:
                            automationCreationStore.selectedHour === i
                              ? theme.colors.palette.primary500
                              : 'transparent',
                        },
                      ]}
                      onPress={() => automationCreationStore.setSelectedHour(i)}
                    >
                      <Text
                        size="large"
                        style={{
                          color:
                            automationCreationStore.selectedHour === i
                              ? theme.colors.palette.neutral100
                              : theme.colors.text,
                        }}
                      >
                        {i.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Minute Picker */}
              <View style={styles.timePickerColumn}>
                <Text
                  size="small"
                  style={{
                    color: theme.colors.textDim,
                    textAlign: 'center',
                    marginBottom: 8,
                  }}
                >
                  Minute
                </Text>
                <ScrollView
                  style={styles.timePickerScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.timePickerItem,
                        {
                          backgroundColor:
                            automationCreationStore.selectedMinute === i
                              ? theme.colors.palette.primary500
                              : 'transparent',
                        },
                      ]}
                      onPress={() =>
                        automationCreationStore.setSelectedMinute(i)
                      }
                    >
                      <Text
                        size="large"
                        style={{
                          color:
                            automationCreationStore.selectedMinute === i
                              ? theme.colors.palette.neutral100
                              : theme.colors.text,
                        }}
                      >
                        {i.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 100,
    },
    section: {
      marginBottom: 32,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    inputContainer: {
      marginBottom: 16,
    },
    timePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      gap: 12,
    },
    timePickerOverlay: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral200,
      justifyContent: 'flex-end',
      alignItems: 'center',
      zIndex: 1000,
    },
    timePickerModal: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 20,
      maxHeight: '30%',
      width: '100%',
      marginHorizontal: 0,
      flex: 1,
    },
    devicePickerModal: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 20,
      maxHeight: '88%',
      width: '100%',
      marginHorizontal: 0,
      flex: 1,
    },
    timePickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral400,
    },
    timePickerContent: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingTop: 20,
      height: 200,
    },
    timePickerColumn: {
      flex: 1,
      marginHorizontal: 10,
    },
    timePickerScroll: {
      flex: 1,
    },
    timePickerItem: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginVertical: 2,
      alignItems: 'center',
    },
    triggerTypes: {
      gap: 12,
    },
    triggerCard: {
      borderRadius: 12,
      borderWidth: 2,
      padding: 16,
    },
    triggerContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    triggerIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    triggerText: {
      flex: 1,
    },
    triggerSelector: {
      marginLeft: 12,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeSettings: {
      gap: 16,
    },
    repeatOptions: {
      flexDirection: 'row',
      gap: 8,
    },
    repeatButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    customDaysContainer: {
      gap: 8,
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    dayButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignItems: 'center',
      minWidth: 40,
    },
    geofenceSettings: {
      gap: 16,
    },
    geofenceOption: {
      flexDirection: 'row',
      gap: 8,
    },
    geofenceButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      gap: 8,
    },
    radiusOptions: {
      gap: 8,
    },
    radiusButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    radiusButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    addDeviceButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.colors.palette.neutral200,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
      gap: 4,
    },
    selectedDevicesContainer: {
      gap: 8,
    },
    selectedDeviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
    },
    deviceOrder: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.palette.neutral400,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    deviceInfo: {
      flex: 1,
    },
    deviceActions: {
      flexDirection: 'row',
      gap: 4,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 6,
      gap: 4,
    },
    removeButton: {
      padding: 6,
      borderRadius: 6,
      backgroundColor: theme.colors.palette.angry100,
    },
    emptyDevicesContainer: {
      alignItems: 'center',
      padding: 32,
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral200,
      justifyContent: 'flex-end',
      alignItems: 'center',
      zIndex: 1000,
    },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 34,
      maxHeight: '85%',
      minHeight: '70%',
      width: '100%',
      marginHorizontal: 0,
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral800,
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral500,
    },
    devicePickerList: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      flexGrow: 1,
    },
    devicePickerItem: {
      borderRadius: 12,
      borderWidth: 2,
      padding: 16,
      marginBottom: 8,
    },
    devicePickerContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    devicePickerText: {
      flex: 1,
      marginLeft: 12,
    },
    deviceActionControls: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral400,
    },
    actionControlsButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    actionControlButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
    },
  })
