// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState, useRef, useMemo } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { debounce } from 'lodash'

import { AppHeader, SuccessDialog } from '@/components'
import { useStores } from '@/models/helpers/useStores'
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'
import { queries } from '@/db/queries'
import { getDefaultProperties } from '@/db/device-properties'

export default observer(function DeviceSetupScreen() {
  const { theme } = useAppTheme()
  const { smartHomeStore } = useStores()
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('device-setup', '/add-device/setup')
  const params = useLocalSearchParams()

  const [deviceName, setDeviceName] = useState('')
  const [deviceNameError, setDeviceNameError] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [deviceType, setDeviceType] = useState<{
    id: number
    name: string
    capabilities: string[]
  } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')
  const [dialogSubMessage, setDialogSubMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(true)
  const sessionRestoredRef = useRef(false)
  const lastSessionTimeStampRef = useRef<string | null>(null)
  const defaultNameKeyRef = useRef<string | null>(null)
  const styles = useMemo(() => createStyles(theme), [theme])

  // Get device info from navigation params with session fallback
  const [deviceTypeId, setDeviceTypeId] = useState<number>(
    params.deviceTypeId ? parseInt(params.deviceTypeId as string) : 0,
  )
  const [deviceTypeName, setDeviceTypeName] = useState<string>(
    (params.deviceTypeName as string) || '',
  )
  const [category, setCategory] = useState<string>(
    (params.category as string) || '',
  )
  const [subcategory, setSubcategory] = useState<string>(
    (params.subcategory as string) || '',
  )

  // Handle session restoration (following add-device screen pattern)
  useEffect(() => {
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

    if (currentSessionTimeStamp && !sessionRestoredRef.current) {
      const sessionData = smartHomeStore
        .getRootStore?.()
        ?.sessionStore?.getSession(currentSessionTimeStamp)

      if (sessionData?.data) {
        const formData = sessionData.data.sessionData?.formData

        if (formData) {
          // Restore device setup state from session
          if (formData.deviceTypeId !== undefined) {
            setDeviceTypeId(formData.deviceTypeId)
          }
          if (formData.deviceTypeName !== undefined) {
            setDeviceTypeName(formData.deviceTypeName)
          }
          if (formData.category !== undefined) {
            setCategory(formData.category)
          }
          if (formData.subcategory !== undefined) {
            setSubcategory(formData.subcategory)
          }
          if (
            formData.deviceName !== undefined &&
            formData.deviceName.length > 1
          ) {
            setDeviceName(formData.deviceName)
          }
          if (
            formData.selectedRoomId !== undefined &&
            formData.selectedRoomId !== ''
          ) {
            setSelectedRoomId(formData.selectedRoomId)
          }

          // Mark session as restored to prevent multiple restoration
          sessionRestoredRef.current = true

          // Track the restored state
          trackContentChange({
            action: 'session_restored',
            deviceTypeId: formData.deviceTypeId,
            deviceTypeName: formData.deviceTypeName,
            category: formData.category,
            subcategory: formData.subcategory,
            deviceName: formData.deviceName,
            selectedRoomId: formData.selectedRoomId,
          })
        }
      } else {
        console.log('🔧 Device Setup session data not found')
        sessionRestoredRef.current = true // Mark as restored even if no data found
      }
    } else if (currentSessionTimeStamp && sessionRestoredRef.current) {
      console.log('🔧 Session already restored, skipping restoration')
    } else {
      console.log('🔧 No sessionTimeStamp parameter found')
    }
  }, [params?.sessionTimeStamp, smartHomeStore, trackContentChange])

  // Track device setup state changes for comprehensive session data
  useEffect(() => {
    if (deviceName || selectedRoomId || deviceTypeId || deviceTypeName) {
      trackContentChange({
        action: 'device_setup_state_update',
        deviceTypeId,
        deviceTypeName,
        category,
        subcategory,
        deviceName,
        selectedRoomId,
        timestamp: Date.now(),
      })
    }
  }, [
    deviceTypeId,
    deviceTypeName,
    category,
    subcategory,
    deviceName,
    selectedRoomId,
    trackContentChange,
  ])

  useEffect(() => {
    const defaultNameKey = `${deviceTypeId}:${deviceTypeName}`

    // Only prefill once for a given device type so user-cleared input stays cleared.
    if (
      !sessionRestoredRef.current &&
      deviceTypeName &&
      !deviceName &&
      defaultNameKeyRef.current !== defaultNameKey
    ) {
      setDeviceName(`${deviceTypeName} ${smartHomeStore.devices.length + 1}`)
      defaultNameKeyRef.current = defaultNameKey
    }

    trackScreenMount({
      timestamp: Date.now(),
      screen: 'device_setup',
      route: '/add-device/setup',
      deviceTypeId,
      deviceTypeName,
      category,
      subcategory,
      deviceName,
      selectedRoomId,
    })
  }, [
    deviceTypeName,
    smartHomeStore.devices.length,
    trackScreenMount,
    deviceName,
    deviceTypeId,
    category,
    subcategory,
    selectedRoomId,
  ])

  useEffect(() => {
    // Load device type details
    const loadDeviceType = async () => {
      try {
        const deviceTypes = await queries.getAllDeviceTypes()
        const foundDeviceType = deviceTypes.find(
          (dt: { id: number; name: string; capabilities: string[] }) =>
            dt.id === deviceTypeId,
        )
        setDeviceType(foundDeviceType)
      } catch (error) {
        console.error('Error loading device type:', error)
      }
    }
    loadDeviceType()
  }, [deviceTypeId])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'device-setup',
        route: '/add-device/setup',
        deviceTypeId,
        deviceTypeName,
        category,
        subcategory,
        deviceName,
        selectedRoomId,
        sessionTimeStamp: params?.sessionTimeStamp,
      })
      return () => {
        getLatestInteraction()
      }
    }, [
      trackScreenMount,
      deviceTypeId,
      deviceTypeName,
      category,
      subcategory,
      deviceName,
      selectedRoomId,
      params?.sessionTimeStamp,
    ]),
  )

  const getDeviceIcon = (category: string) => {
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

  const showDialogMessage = (
    message: string,
    subMessage: string = '',
    success: boolean = true,
  ) => {
    setDialogMessage(message)
    setDialogSubMessage(subMessage)
    setIsSuccess(success)
    setShowDialog(true)
  }

  const handleDialogClose = () => {
    setShowDialog(false)
    if (isSuccess && dialogMessage === 'Device added successfully!') {
      router.replace('/(app)/devices')
    }
  }

  const handleAddDevice = debounce(async () => {
    trackClick('add_device_submit')
    trackContentChange({
      action: 'submit_device_creation',
      deviceName,
      selectedRoomId,
      deviceTypeId,
      deviceTypeName,
      category,
      subcategory,
    })

    if (!deviceName.trim()) {
      setDeviceNameError('Device name is required')
      return
    }

    setDeviceNameError('')

    if (!selectedRoomId) {
      showDialogMessage('Please select a room', '', false)
      return
    }

    try {
      setLoading(true)
      const rootStore = smartHomeStore.getRootStore?.()
      const currentUserId = rootStore?.userStore?.user?.id

      if (!currentUserId) {
        showDialogMessage('User not authenticated', '', false)
        return
      }

      // Get device type to determine capabilities
      if (!deviceType) {
        showDialogMessage('Device type not found', '', false)
        return
      }

      // Get default properties based on device capabilities
      const defaultProperties = getDefaultProperties(
        deviceType.capabilities || [],
      )

      // Create the device
      await queries.createDevice(currentUserId, {
        name: deviceName.trim(),
        deviceTypeId,
        roomId: parseInt(selectedRoomId),
        properties: JSON.stringify(defaultProperties),
      })

      // Refresh the smart home data
      await smartHomeStore.refreshData()

      trackContentChange({
        action: 'device_created_successfully',
        deviceName: deviceName.trim(),
        deviceTypeId,
        deviceTypeName,
        roomId: parseInt(selectedRoomId),
        category,
        subcategory,
      })

      showDialogMessage(
        'Device added successfully!',
        'Your new device is ready to use',
      )
    } catch (error) {
      console.error('Error adding device:', error)
      trackContentChange({
        action: 'device_creation_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        deviceName,
        deviceTypeId,
        selectedRoomId,
      })
      showDialogMessage('Failed to add device', 'Please try again', false)
    } finally {
      setLoading(false)
    }
  }, 300)

  const renderRoomOption = (room: {
    id: number
    name: string
    type: string
    floor?: number | null
  }) => {
    const isSelected = selectedRoomId === room.id.toString()
    const roomStyle = [
      styles.roomOption,
      {
        backgroundColor: theme.colors.palette.neutral200,
        borderColor: isSelected
          ? theme.colors.palette.primary500
          : 'transparent',
      },
    ]

    return (
      <TouchableOpacity
        key={room.id}
        style={roomStyle}
        onPress={debounce(() => {
          trackClick(`room_${room.id}`)
          trackContentChange({
            action: 'select_room_for_device',
            roomId: room.id,
            roomName: room.name,
            previousRoomId: selectedRoomId,
          })
          setSelectedRoomId(room.id.toString())
        }, 300)}
        activeOpacity={0.7}
      >
        <View style={styles.roomOptionContent}>
          <View style={styles.roomIcon}>
            <Ionicons
              name="home-outline"
              size={20}
              color={theme.colors.palette.primary500}
            />
          </View>
          <View style={styles.roomInfo}>
            <Text style={[styles.roomName, { color: theme.colors.text }]}>
              {room.name}
            </Text>
            <Text style={[styles.roomType, { color: theme.colors.textDim }]}>
              {room.type
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l: string) => l.toUpperCase())}
              {room.floor && ` • Floor ${room.floor}`}
            </Text>
          </View>
          {selectedRoomId === room.id.toString() && (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={theme.colors.palette.primary500}
            />
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const categoryColor = getCategoryColor(category)

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
        <AppHeader title="Setup Device" showSearch={false} />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Device Type Info */}
          <View
            style={[
              styles.deviceTypeCard,
              { backgroundColor: theme.colors.palette.neutral200 },
            ]}
          >
            <View style={styles.deviceTypeHeader}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: categoryColor + '20' },
                ]}
              >
                <Ionicons
                  name={
                    getDeviceIcon(category) as keyof typeof Ionicons.glyphMap
                  }
                  size={32}
                  color={categoryColor}
                />
              </View>
              <View style={styles.deviceTypeInfo}>
                <Text
                  style={[styles.deviceTypeName, { color: theme.colors.text }]}
                >
                  {deviceTypeName}
                </Text>
                <Text
                  style={[
                    styles.deviceTypeSubcategory,
                    { color: theme.colors.textDim },
                  ]}
                >
                  {subcategory
                    ?.replace(/_/g, ' ')
                    .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </Text>
                <Text
                  style={[styles.deviceTypeCategory, { color: categoryColor }]}
                >
                  {category
                    ? category.charAt(0).toUpperCase() + category.slice(1)
                    : 'Device'}
                </Text>
              </View>
            </View>
          </View>

          {/* Device Name Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Device Name
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.palette.neutral200,
                  color: theme.colors.text,
                  borderColor: deviceNameError
                    ? theme.colors.palette.angry500
                    : theme.colors.palette.neutral300,
                },
              ]}
              value={deviceName}
              onChangeText={text => {
                trackContentChange({
                  action: 'device_name_input',
                  field: 'deviceName',
                  value: text,
                  valueLength: text.length,
                })
                if (deviceNameError) {
                  setDeviceNameError(
                    text.trim() ? '' : 'Device name is required',
                  )
                }
                setDeviceName(text)
              }}
              placeholder="Enter device name"
              placeholderTextColor={theme.colors.textDim}
              autoCapitalize="words"
              autoCorrect={false}
              selectTextOnFocus={true}
              clearButtonMode="while-editing"
            />
            {deviceNameError ? (
              <Text
                style={[
                  styles.fieldErrorText,
                  { color: theme.colors.palette.angry500 },
                ]}
              >
                {deviceNameError}
              </Text>
            ) : null}
          </View>

          {/* Room Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Select Room
            </Text>
            <Text
              style={[
                styles.sectionDescription,
                { color: theme.colors.textDim },
              ]}
            >
              Choose which room this device will be placed in
            </Text>

            {smartHomeStore.rooms.length === 0 ? (
              <View style={styles.noRoomsContainer}>
                <Ionicons
                  name="home-outline"
                  size={32}
                  color={theme.colors.textDim}
                />
                <Text
                  style={[styles.noRoomsText, { color: theme.colors.textDim }]}
                >
                  No rooms available. Please add a room first.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.addRoomButton,
                    { backgroundColor: theme.colors.palette.primary500 },
                  ]}
                  onPress={debounce(() => {
                    trackClick('add_room_button')
                    trackContentChange({
                      action: 'navigate_to_add_room',
                      section: 'device_setup',
                    })
                    router.push('/add-room')
                  }, 300)}
                >
                  <Text
                    style={[
                      styles.addRoomButtonText,
                      { color: theme.colors.text },
                    ]}
                  >
                    Add Room
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.roomsList}>
                {smartHomeStore.rooms.map(renderRoomOption)}
              </View>
            )}
          </View>

          {/* Add Device Button */}
          <TouchableOpacity
            style={[
              styles.addButton,
              {
                backgroundColor: loading
                  ? theme.colors.palette.neutral300
                  : theme.colors.palette.primary500,
              },
            ]}
            onPress={handleAddDevice}
            disabled={loading || !selectedRoomId}
            activeOpacity={0.7}
          >
            <Text style={[styles.addButtonText, { color: theme.colors.text }]}>
              {loading ? 'Adding Device...' : 'Add Device'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <SuccessDialog
        visible={showDialog}
        onClose={handleDialogClose}
        isSuccess={isSuccess}
        message={dialogMessage}
        subMessage={dialogSubMessage}
      />
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
    },
    deviceTypeCard: {
      marginTop: 20,
      marginBottom: 24,
      padding: 20,
      borderRadius: 12,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    deviceTypeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    deviceTypeInfo: {
      flex: 1,
    },
    deviceTypeName: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 4,
    },
    deviceTypeSubcategory: {
      fontSize: 14,
      marginBottom: 2,
    },
    deviceTypeCategory: {
      fontSize: 12,
      fontWeight: '500',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    sectionDescription: {
      fontSize: 14,
      marginBottom: 12,
    },
    textInput: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      fontSize: 16,
    },
    fieldErrorText: {
      fontSize: 12,
      marginTop: 6,
      fontWeight: '500',
    },
    roomsList: {
      gap: 8,
    },
    roomOption: {
      borderRadius: 8,
      borderWidth: 2,
      padding: 12,
    },
    roomOptionContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    roomIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral400,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    roomInfo: {
      flex: 1,
    },
    roomName: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 2,
    },
    roomType: {
      fontSize: 12,
    },
    noRoomsContainer: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    noRoomsText: {
      fontSize: 14,
      textAlign: 'center',
      marginVertical: 12,
    },
    addRoomButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    addRoomButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
    addButton: {
      marginTop: 20,
      marginBottom: 32,
      paddingVertical: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    addButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  })
