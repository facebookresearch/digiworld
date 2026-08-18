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
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AppHeader } from '@/components'
import { useStores } from '@/models/helpers/useStores'
import { SelectedDevice } from '@/models/SceneCreationStore'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

const SCENE_ICONS = [
  { id: 'home', name: 'Home', icon: 'home-outline', color: 'primary' },
  { id: 'bed', name: 'Sleep', icon: 'bed-outline', color: 'secondary' },
  { id: 'sunny', name: 'Bright', icon: 'sunny-outline', color: 'warning' },
  { id: 'moon', name: 'Dim', icon: 'moon-outline', color: 'neutral' },
  { id: 'tv', name: 'Movie', icon: 'tv-outline', color: 'success' },
  {
    id: 'musical-notes',
    name: 'Party',
    icon: 'musical-notes-outline',
    color: 'angry',
  },
  { id: 'leaf', name: 'Relax', icon: 'leaf-outline', color: 'success' },
  { id: 'flame', name: 'Warm', icon: 'flame-outline', color: 'angry' },
]

export default observer(function SimpleCreateSceneScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { smartHomeStore, userStore, sceneCreationStore } = useStores()
  const { trackScreenMount } = useInteractionTracking(
    'simple-create-scene',
    '/create-scene/simple-create',
  )
  const { sessionId } = useLocalSearchParams()
  useEffect(() => {
    if (sessionId) {
      sceneCreationStore.startSession(sessionId as string)
    }
  }, [sessionId])

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      sceneCreationStore.clearForm()
    }
  }, [sceneCreationStore])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        platform: Platform.OS,
        screenDimensions: {
          width: Dimensions.get('window').width,
          height: Dimensions.get('window').height,
        },
        userId: userStore.user?.id,
        sceneName: sceneCreationStore.sceneName,
        selectedIcon: sceneCreationStore.selectedIcon,
        screen: 'simpleCreateScene',
        route: '/create-scene/simple-create',
      })

      // No cleanup for create mode - preserve user input
    }, [
      sceneCreationStore.sceneName,
      sceneCreationStore.selectedIcon,
      userStore.user?.id,
    ]),
  )

  // Filter devices based on search query
  const filteredDevices = smartHomeStore.devices.filter(device => {
    const searchLower = sceneCreationStore.deviceSearchQuery.toLowerCase()
    return (
      device.name.toLowerCase().includes(searchLower) ||
      device.deviceType?.name?.toLowerCase().includes(searchLower) ||
      device.room?.name?.toLowerCase().includes(searchLower)
    )
  })

  const handleDeviceToggle = (device: any) => {
    const isSelected = sceneCreationStore.selectedDevices.some(
      d => d.id === device.id,
    )

    if (isSelected) {
      sceneCreationStore.removeDevice(device.id)
    } else {
      const newDevice: SelectedDevice = {
        id: device.id,
        name: device.name,
        deviceType: device.deviceType?.name || 'Unknown Device',
        roomName: device.room?.name,
        order: sceneCreationStore.selectedDevices.length + 1,
        actionType: 'turn_on',
      }
      sceneCreationStore.addDevice(newDevice)
    }
  }

  const handleActionTypeChange = (
    deviceId: number,
    actionType: 'turn_on' | 'turn_off',
  ) => {
    sceneCreationStore.updateDeviceAction(deviceId, actionType)
  }

  const handleCreateScene = async () => {
    if (
      !sceneCreationStore.selectedIcon ||
      sceneCreationStore.selectedDevices.length === 0
    ) {
      return
    }

    try {
      const sceneData = {
        name: sceneCreationStore.sceneName,
        description: sceneCreationStore.sceneDescription,
        icon: sceneCreationStore.selectedIcon,
      }

      const newScene = await smartHomeStore.createScene(sceneData)
      if (newScene) {
        // Create scene devices
        const sortedDevices = [...sceneCreationStore.selectedDevices].sort(
          (a, b) => a.order - b.order,
        )

        for (const device of sortedDevices) {
          let targetState = '{}'
          if (device.actionType === 'turn_on') {
            targetState = JSON.stringify({ is_on: true })
          } else if (device.actionType === 'turn_off') {
            targetState = JSON.stringify({ is_on: false })
          }

          await smartHomeStore.addDeviceToScene({
            scene_id: newScene.id,
            device_id: device.id,
            target_state: targetState,
            order: device.order,
          })
        }

        // Clear form and end session
        sceneCreationStore.clearForm()
        sceneCreationStore.endSession()

        router.push('/(app)/scenes')
      }
    } catch (error) {
      console.error('Error creating scene:', error)
    }
  }

  const isFormValid = () => {
    return sceneCreationStore.isFormValid
  }

  const renderSceneIcon = (icon: (typeof SCENE_ICONS)[0]) => (
    <TouchableOpacity
      key={icon.id}
      style={[
        styles.iconCard,
        {
          backgroundColor: theme.colors.palette.neutral200,
          borderColor:
            sceneCreationStore.selectedIcon === icon.id
              ? theme.colors.palette.secondary500
              : theme.colors.palette.neutral300,
        },
      ]}
      onPress={() => sceneCreationStore.setSelectedIcon(icon.id)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor:
              theme.colors.palette[
                `${icon.color}100` as keyof typeof theme.colors.palette
              ],
          },
        ]}
      >
        <Ionicons
          name={icon.icon as any}
          size={28}
          color={
            theme.colors.palette[
              `${icon.color}500` as keyof typeof theme.colors.palette
            ]
          }
        />
      </View>
      <Text
        size="small"
        style={{
          color:
            sceneCreationStore.selectedIcon === icon.id
              ? theme.colors.palette.secondary500
              : theme.colors.text,
          textAlign: 'center',
          marginTop: 8,
        }}
      >
        {icon.name}
      </Text>
    </TouchableOpacity>
  )

  const renderSelectedDevice = (device: SelectedDevice, index: number) => (
    <View key={device.id} style={styles.selectedDeviceItem}>
      {/* Remove button in top right */}
      <TouchableOpacity
        style={styles.removeButtonTopRight}
        onPress={() => handleDeviceToggle({ id: device.id })}
      >
        <Ionicons
          name="close"
          size={16}
          color={theme.colors.palette.angry500}
        />
      </TouchableOpacity>

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
      <View style={styles.deviceControls}>
        <View style={styles.actionButtons}>
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
        </View>
      </View>
    </View>
  )

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
            title="Create Scene"
            showSearch={false}
            showProfile={false}
            showBack={true}
            rightComponent={
              <TouchableOpacity
                style={[
                  styles.doneButton,
                  {
                    backgroundColor: isFormValid()
                      ? theme.colors.palette.secondary500
                      : theme.colors.palette.neutral400,
                  },
                ]}
                onPress={handleCreateScene}
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
                Scene Details
              </Text>
              <View style={styles.inputContainer}>
                <Text size="small" style={{ color: theme.colors.textDim }}>
                  Scene Name
                </Text>
                <Input
                  placeholder="Enter scene name"
                  value={sceneCreationStore.sceneName}
                  onChangeText={sceneCreationStore.setSceneName}
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
                  value={sceneCreationStore.sceneDescription}
                  onChangeText={sceneCreationStore.setSceneDescription}
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

            {/* Icon Selection */}
            <View style={styles.section}>
              <Text size="large" style={{ color: theme.colors.text }}>
                Choose Icon
              </Text>
              <Text size="small" style={{ color: theme.colors.textDim }}>
                Select an icon that represents this scene
              </Text>

              <View style={styles.iconsGrid}>
                {SCENE_ICONS.map(renderSceneIcon)}
              </View>
            </View>

            {/* Device Selection */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text size="large" style={{ color: theme.colors.text }}>
                  Select Devices
                </Text>
                <TouchableOpacity
                  style={styles.addDeviceButton}
                  onPress={() => sceneCreationStore.setShowDevicePicker(true)}
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={theme.colors.palette.secondary500}
                  />
                  <Text
                    size="small"
                    style={{ color: theme.colors.palette.secondary500 }}
                  >
                    Add Device
                  </Text>
                </TouchableOpacity>
              </View>

              {sceneCreationStore.selectedDevices.length > 0 ? (
                <View style={styles.selectedDevicesContainer}>
                  {sceneCreationStore.selectedDevices.map(renderSelectedDevice)}
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
                    Tap "Add Device" to select devices for this scene
                  </Text>
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Screen>

      {/* Device Picker Modal */}
      <Modal
        visible={sceneCreationStore.showDevicePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => sceneCreationStore.setShowDevicePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            sceneCreationStore.setShowDevicePicker(false)
          }}
        >
          <View
            style={[
              styles.devicePickerModal,
              { backgroundColor: theme.colors.palette.neutral100 },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  sceneCreationStore.setShowDevicePicker(false)
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
                  sceneCreationStore.setShowDevicePicker(false)
                }}
              >
                <Text
                  size="small"
                  style={{ color: theme.colors.palette.secondary500 }}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Input
                placeholder="Search devices..."
                value={sceneCreationStore.deviceSearchQuery}
                onChangeText={sceneCreationStore.setDeviceSearchQuery}
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
                const isSelected = sceneCreationStore.selectedDevices.some(
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
                            ? theme.colors.palette.secondary500
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
                              ? theme.colors.palette.secondary500
                              : theme.colors.palette.neutral400,
                            backgroundColor: isSelected
                              ? theme.colors.palette.secondary500
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
                  </View>
                )
              }}
              contentContainerStyle={styles.devicePickerList}
            />
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
    doneButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 16,
    },
    iconCard: {
      width: '22%',
      aspectRatio: 1,
      borderRadius: 16,
      borderWidth: 2,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
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
      gap: 12,
    },
    selectedDeviceItem: {
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 16,
      padding: 16,
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
      marginBottom: 12,
    },
    deviceInfo: {
      marginBottom: 12,
    },
    deviceControls: {
      gap: 12,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      gap: 6,
    },
    removeButtonTopRight: {
      position: 'absolute',
      top: 8,
      right: 8,
      padding: 6,
      borderRadius: 12,
      backgroundColor: theme.colors.palette.angry100,
      zIndex: 1,
    },
    emptyDevicesContainer: {
      alignItems: 'center',
      padding: 32,
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.palette.overlay50,
      justifyContent: 'flex-end',
      alignItems: 'center',
      zIndex: 1000,
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
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral400,
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral400,
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
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
