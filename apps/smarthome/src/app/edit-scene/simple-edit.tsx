// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Platform,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Text,
  Input,
  Screen,
  useAppTheme,
  type Theme,
} from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useCallback, useState, useMemo } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'

import { AppHeader } from '@/components'
import { useStores } from '@/models/helpers/useStores'
import { SelectedDevice } from '@/models/SceneEditStore'
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

export default observer(function SimpleEditSceneScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { smartHomeStore, userStore, sceneEditStore } = useStores()
  const { sceneId, sessionId } = useLocalSearchParams()
  const { trackScreenMount } = useInteractionTracking(
    'simple-edit-scene',
    '/edit-scene/simple-edit',
  )
  const [isSaving, setIsSaving] = useState(false)

  const loadSceneData = useCallback(async () => {
    const currentSceneId = sceneId?.toString()
    if (!currentSceneId || smartHomeStore.scenes.length === 0) {
      console.log('Cannot load scene data:', {
        currentSceneId,
        scenesLength: smartHomeStore.scenes.length,
      })
      return
    }

    console.log('Loading scene data from database for scene:', currentSceneId)
    console.log(
      'Available scenes:',
      smartHomeStore.scenes.map(s => ({ id: s.id, name: s.name })),
    )

    const scene = smartHomeStore.scenes.find(
      s => s.id.toString() === currentSceneId,
    )

    if (scene) {
      console.log(
        'Found scene:',
        scene.name,
        'Description:',
        scene.description,
        'Icon:',
        scene.icon,
      )

      // Load scene devices first
      try {
        const sceneDevices = await smartHomeStore.getSceneDevices(
          parseInt(sceneId.toString()),
        )
        console.log('Scene devices loaded:', sceneDevices)

        const selectedDevicesList: SelectedDevice[] = sceneDevices.map(
          (sceneDevice: any, index: number) => {
            // Parse the target state to determine action type
            let actionType: 'turn_on' | 'turn_off' = 'turn_on'
            try {
              const targetState = JSON.parse(sceneDevice.target_state || '{}')
              actionType = targetState.is_on ? 'turn_on' : 'turn_off'
            } catch (error) {
              console.error('Error parsing target state:', error)
            }

            return {
              id: sceneDevice.device_id,
              name: sceneDevice.deviceName || 'Unknown Device',
              deviceType: sceneDevice.deviceTypeName || 'Unknown Type',
              order: sceneDevice.order || index + 1,
              actionType,
            }
          },
        )

        console.log('Processed devices:', selectedDevicesList)

        try {
          // Set edit mode and load data into store
          sceneEditStore.setEditMode(currentSceneId, {
            id: scene.id,
            name: scene.name,
            description: scene.description,
            icon: scene.icon,
          })

          // Load data into store
          sceneEditStore.loadSceneForEdit({
            name: scene.name,
            description: scene.description || '',
            icon: scene.icon || '',
            devices: selectedDevicesList,
          })

          console.log('Scene data loaded successfully into store:', {
            name: scene.name,
            description: scene.description,
            icon: scene.icon,
            devicesCount: selectedDevicesList.length,
          })

          // Verify store was updated
          console.log('Store after loading:', {
            sceneName: sceneEditStore.sceneName,
            sceneDescription: sceneEditStore.sceneDescription,
            selectedIcon: sceneEditStore.selectedIcon,
            selectedDevices: sceneEditStore.selectedDevices.length,
          })
        } catch (storeError) {
          console.error('Error updating store:', storeError)
        }
      } catch (error) {
        console.error('Error loading scene devices:', error)
      }
    } else {
      console.log('Scene not found for ID:', currentSceneId)
      console.log(
        'Available scene IDs:',
        smartHomeStore.scenes.map(s => s.id.toString()),
      )
    }
  }, [sceneId, smartHomeStore.scenes, sceneEditStore, smartHomeStore])

  useEffect(() => {
    if (sessionId) {
      sceneEditStore.startSession(sessionId as string)
    }
  }, [sessionId, sceneEditStore])

  // Clear form when sceneId changes
  useEffect(() => {
    if (sceneId) {
      console.log('SceneId changed, clearing form:', sceneId)
      sceneEditStore.clearForm()
    }
  }, [sceneId, sceneEditStore])

  // Load scene data when scenes are available and sceneId changes
  useEffect(() => {
    if (smartHomeStore.scenes.length > 0 && sceneId) {
      console.log('useEffect triggered - loading scene data for:', sceneId)
      loadSceneData()
    }
  }, [smartHomeStore.scenes.length, sceneId, loadSceneData])

  // Debug store values
  useEffect(() => {
    console.log('Store values updated:', {
      sceneName: sceneEditStore.sceneName,
      sceneDescription: sceneEditStore.sceneDescription,
      selectedIcon: sceneEditStore.selectedIcon,
      selectedDevices: sceneEditStore.selectedDevices.length,
      isEditMode: sceneEditStore.isEditMode,
      sceneId: sceneEditStore.sceneId,
    })
  }, [
    sceneEditStore.sceneName,
    sceneEditStore.sceneDescription,
    sceneEditStore.selectedIcon,
    sceneEditStore.selectedDevices.length,
    sceneEditStore.isEditMode,
    sceneEditStore.sceneId,
  ])

  useFocusEffect(
    useCallback(() => {
      console.log('From simpleEditScene')
      trackScreenMount({
        timestamp: Date.now(),
        platform: Platform.OS,
        screen: 'simpleEditScene',
        route: '/edit-scene/simple-edit',
        screenDimensions: {
          width: Dimensions.get('window').width,
          height: Dimensions.get('window').height,
        },
        userId: userStore.user?.id,
        sceneName: sceneEditStore.sceneName,
        selectedIcon: sceneEditStore.selectedIcon,
      })
      // No cleanup for edit mode - preserve data
    }, [userStore.user?.id]),
  )

  // Filter devices based on search query
  const filteredDevices = smartHomeStore.devices.filter(device => {
    const searchLower = sceneEditStore.deviceSearchQuery.toLowerCase()
    return (
      device.name.toLowerCase().includes(searchLower) ||
      device.deviceType?.name?.toLowerCase().includes(searchLower) ||
      device.room?.name?.toLowerCase().includes(searchLower)
    )
  })

  const handleDeviceToggle = (device: any) => {
    const isSelected = sceneEditStore.selectedDevices.some(
      d => d.id === device.id,
    )

    if (isSelected) {
      sceneEditStore.removeDevice(device.id)
    } else {
      const newDevice: SelectedDevice = {
        id: device.id,
        name: device.name,
        deviceType: device.deviceType?.name || 'Unknown Device',
        roomName: device.room?.name,
        order: sceneEditStore.selectedDevices.length + 1,
        actionType: 'turn_on',
      }
      sceneEditStore.addDevice(newDevice)
    }
  }

  const handleActionTypeChange = (
    deviceId: number,
    actionType: 'turn_on' | 'turn_off',
  ) => {
    sceneEditStore.updateDeviceAction(deviceId, actionType)
  }

  const handleUpdateScene = async () => {
    if (
      !sceneEditStore.selectedIcon ||
      sceneEditStore.selectedDevices.length === 0 ||
      !sceneId
    ) {
      return
    }

    setIsSaving(true)
    try {
      const sceneData = {
        name: sceneEditStore.sceneName,
        description: sceneEditStore.sceneDescription,
        icon: sceneEditStore.selectedIcon,
      }

      const updatedScene = await smartHomeStore.updateScene(
        sceneId.toString(),
        sceneData,
      )

      if (updatedScene) {
        // Update scene devices
        const sortedDevices = [...sceneEditStore.selectedDevices].sort(
          (a, b) => a.order - b.order,
        )

        // Delete existing devices and add new ones
        await smartHomeStore.removeAllDevicesFromScene(sceneId.toString())

        for (const device of sortedDevices) {
          let targetState = '{}'
          if (device.actionType === 'turn_on') {
            targetState = JSON.stringify({ is_on: true })
          } else if (device.actionType === 'turn_off') {
            targetState = JSON.stringify({ is_on: false })
          }

          await smartHomeStore.addDeviceToScene({
            scene_id: parseInt(sceneId.toString()),
            device_id: device.id,
            target_state: targetState,
            order: device.order,
          })
        }

        // Clear form and end session
        sceneEditStore.clearForm()
        sceneEditStore.endSession()

        // Force refresh scenes data to ensure immediate update
        await smartHomeStore.refreshData()

        router.push('/(app)/scenes')
      }
    } catch (error) {
      console.error('Error updating scene:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const isFormValid = () => {
    return sceneEditStore.isFormValid
  }

  const renderSceneIcon = (icon: (typeof SCENE_ICONS)[0]) => (
    <TouchableOpacity
      key={icon.id}
      style={[
        styles.iconCard,
        {
          backgroundColor: theme.colors.palette.neutral200,
          borderColor:
            sceneEditStore.selectedIcon === icon.id
              ? theme.colors.palette.secondary500
              : theme.colors.palette.neutral300,
        },
      ]}
      onPress={() => sceneEditStore.setSelectedIcon(icon.id)}
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
            sceneEditStore.selectedIcon === icon.id
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
        onPress={() => handleDeviceToggle({ id: device.id } as any)}
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
            title="Edit Scene"
            showSearch={false}
            showProfile={false}
            showBack={true}
            rightComponent={
              <TouchableOpacity
                style={[
                  styles.doneButton,
                  {
                    backgroundColor:
                      isFormValid() && !isSaving
                        ? theme.colors.palette.secondary500
                        : theme.colors.palette.neutral400,
                  },
                ]}
                onPress={handleUpdateScene}
                disabled={!isFormValid() || isSaving}
                activeOpacity={0.7}
              >
                {isSaving ? (
                  <View style={styles.loadingContainer}>
                    <Ionicons
                      name="hourglass-outline"
                      size={16}
                      color={theme.colors.textDim}
                    />
                    <Text
                      size="small"
                      style={{
                        color: theme.colors.textDim,
                        fontWeight: '600',
                        marginLeft: 4,
                      }}
                    >
                      Saving...
                    </Text>
                  </View>
                ) : (
                  <Text
                    size="small"
                    style={{
                      color: isFormValid()
                        ? theme.colors.text
                        : theme.colors.textDim,
                      fontWeight: '600',
                    }}
                  >
                    Save
                  </Text>
                )}
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
                  value={sceneEditStore.sceneName}
                  onChangeText={sceneEditStore.setSceneName}
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
                  value={sceneEditStore.sceneDescription}
                  onChangeText={sceneEditStore.setSceneDescription}
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
                  onPress={() => sceneEditStore.setShowDevicePicker(true)}
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

              {sceneEditStore.selectedDevices.length > 0 ? (
                <View style={styles.selectedDevicesContainer}>
                  {sceneEditStore.selectedDevices.map(renderSelectedDevice)}
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
        visible={sceneEditStore.showDevicePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => sceneEditStore.setShowDevicePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            sceneEditStore.setShowDevicePicker(false)
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
                  sceneEditStore.setShowDevicePicker(false)
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
                  sceneEditStore.setShowDevicePicker(false)
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
                value={sceneEditStore.deviceSearchQuery}
                onChangeText={sceneEditStore.setDeviceSearchQuery}
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
                const isSelected = sceneEditStore.selectedDevices.some(
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
    removeButton: {
      alignSelf: 'flex-end',
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.palette.angry100,
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
      backgroundColor: theme.colors.palette.neutral200,
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
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  })
