// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { debounce } from 'lodash'

import { AppHeader, SuccessDialog } from '@/components'
import { useStores } from '@/models/helpers/useStores'
import { queries } from '@/db/queries'
import { RoomType } from '@/models/SmartHomeStore'
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'

export default observer(function AddRoomScreen() {
  const { theme } = useAppTheme()
  const rootStore = useStores()
  const router = useRouter()
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('add_room', '/add-room')
  const params = useLocalSearchParams()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: RoomType.OTHER,
    floor: 1,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const sessionRestoredRef = useRef(false)
  const lastSessionTimeStampRef = useRef<string | null>(null)

  useEffect(() => {
    trackScreenMount()
  }, [])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'add-room',
        route: '/add-room',
        formData,
        roomName: formData.name,
        roomType: formData.type,
        floor: formData.floor,
        hasFormData: !!(formData.name || formData.description),
        sessionTimeStamp: params?.sessionTimeStamp,
      })
      return () => {
        getLatestInteraction()
      }
    }, [trackScreenMount, formData, params?.sessionTimeStamp]),
  )

  const styles = useMemo(() => createStyles(theme), [theme])

  // Handle session restoration (following devices screen pattern)
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

    if (currentSessionTimeStamp && !sessionRestoredRef.current) {
      console.log(
        '🏠 Add Room screen received sessionTimeStamp:',
        currentSessionTimeStamp,
      )
      const sessionData = rootStore.smartHomeStore
        .getRootStore?.()
        ?.sessionStore?.getSession(currentSessionTimeStamp)

      if (sessionData?.data) {
        const formDataFromSession = sessionData.data.sessionData?.formData
        if (formDataFromSession) {
          // Check if form data is nested in formData property
          const actualFormData =
            formDataFromSession.formData || formDataFromSession

          // Restore form data from session
          if (actualFormData.name !== undefined) {
            setFormData(prev => ({ ...prev, name: actualFormData.name }))
          }
          if (actualFormData.description !== undefined) {
            setFormData(prev => ({
              ...prev,
              description: actualFormData.description,
            }))
          }
          if (actualFormData.type !== undefined) {
            setFormData(prev => ({ ...prev, type: actualFormData.type }))
          }
          if (actualFormData.floor !== undefined) {
            setFormData(prev => ({ ...prev, floor: actualFormData.floor }))
          }

          // Mark session as restored to prevent multiple restoration
          sessionRestoredRef.current = true

          // Track the restored state
          trackContentChange({
            action: 'session_restored',
            formData: actualFormData,
            roomName: actualFormData.name,
            roomType: actualFormData.type,
            floor: actualFormData.floor,
          })
        }
      } else {
        console.log('🏠 Add Room session data not found')
        sessionRestoredRef.current = true // Mark as restored even if no data found
      }
    } else if (currentSessionTimeStamp && sessionRestoredRef.current) {
      console.log('🏠 Session already restored, skipping restoration')
    } else {
      console.log('🏠 No sessionTimeStamp parameter found')
    }
  }, [params?.sessionTimeStamp, rootStore.smartHomeStore, trackContentChange])

  const roomTypeOptions = [
    { value: RoomType.LIVING_ROOM, label: 'Living Room', icon: 'home' },
    { value: RoomType.BEDROOM, label: 'Bedroom', icon: 'bed' },
    { value: RoomType.KITCHEN, label: 'Kitchen', icon: 'restaurant' },
    { value: RoomType.BATHROOM, label: 'Bathroom', icon: 'water' },
    { value: RoomType.OFFICE, label: 'Office', icon: 'business' },
    { value: RoomType.GARAGE, label: 'Garage', icon: 'car' },
    { value: RoomType.DINING_ROOM, label: 'Dining Room', icon: 'restaurant' },
    { value: RoomType.GUEST_ROOM, label: 'Guest Room', icon: 'bed' },
    { value: RoomType.LAUNDRY_ROOM, label: 'Laundry Room', icon: 'shirt' },
    { value: RoomType.BASEMENT, label: 'Basement', icon: 'layers' },
    { value: RoomType.ATTIC, label: 'Attic', icon: 'home' },
    { value: RoomType.BALCONY, label: 'Balcony', icon: 'leaf' },
    { value: RoomType.PATIO, label: 'Patio', icon: 'leaf' },
    { value: RoomType.GARDEN, label: 'Garden', icon: 'leaf' },
    { value: RoomType.OTHER, label: 'Other', icon: 'ellipsis-horizontal' },
  ]

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Room name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Room name must be at least 2 characters'
    }

    if (formData.floor < 1 || formData.floor > 10) {
      newErrors.floor = 'Floor must be between 1 and 10'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = debounce(async () => {
    trackClick('submit_room_form')
    trackContentChange({
      action: 'submit_room_creation',
      formData: {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        floor: formData.floor,
      },
      hasErrors: Object.keys(errors).length > 0,
    })

    if (!validateForm()) return

    setIsLoading(true)
    try {
      const currentUserId = rootStore.userStore?.user?.id

      if (!currentUserId) {
        Alert.alert('Error', 'User not authenticated')
        return
      }

      await queries.createRoom(currentUserId, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        floor: formData.floor,
      })

      // Refresh the store data
      await rootStore.smartHomeStore.refreshData()

      trackContentChange({
        action: 'room_created_successfully',
        roomName: formData.name,
        roomType: formData.type,
        floor: formData.floor,
      })

      setShowSuccessDialog(true)
    } catch (error) {
      console.error('Error creating room:', error)
      trackContentChange({
        action: 'room_creation_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      Alert.alert('Error', 'Failed to create room. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, 300)

  const handleSuccessDialogClose = () => {
    trackClick('success_dialog_close')
    trackContentChange({
      action: 'room_creation_completed',
      roomName: formData.name,
      section: 'add_room_success_dialog',
      timestamp: Date.now(),
    })
    setShowSuccessDialog(false)
    router.back()
  }

  const updateFormData = (field: string, value: any) => {
    trackContentChange({
      action: 'form_field_updated',
      field,
      value,
      formData: { ...formData, [field]: value },
    })
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const renderRoomTypeSelector = () => (
    <View style={styles.section}>
      <Text style={[styles.label, { color: theme.colors.text }]}>
        Room Type
      </Text>
      <View style={styles.typeGrid}>
        {roomTypeOptions.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.typeOption,
              {
                backgroundColor:
                  formData.type === option.value
                    ? theme.colors.palette.primary500
                    : theme.colors.palette.neutral200,
                borderColor:
                  formData.type === option.value
                    ? theme.colors.palette.primary500
                    : theme.colors.palette.neutral400,
              },
            ]}
            onPress={debounce(() => {
              trackClick(`room_type_${option.value}`)
              trackContentChange({
                action: 'room_type_selected',
                roomType: option.value,
                roomTypeLabel: option.label,
                previousType: formData.type,
              })
              updateFormData('type', option.value)
            }, 300)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={option.icon as any}
              size={20}
              color={
                formData.type === option.value
                  ? theme.colors.palette.neutral100
                  : theme.colors.palette.neutral600
              }
            />
            <Text
              style={[
                styles.typeOptionText,
                {
                  color:
                    formData.type === option.value
                      ? theme.colors.palette.neutral100
                      : theme.colors.palette.neutral600,
                },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

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
          title="Add Room"
          showBackButton={true}
          showSearch={false}
          showProfile={false}
        />

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Room Name */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Room Name *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.palette.neutral200,
                    color: theme.colors.text,
                    borderColor: errors.name
                      ? theme.colors.palette.angry500
                      : theme.colors.palette.neutral400,
                  },
                ]}
                placeholder="Enter room name"
                placeholderTextColor={theme.colors.palette.neutral600}
                value={formData.name}
                onChangeText={value => {
                  trackClick('room_name_input')
                  trackContentChange({
                    action: 'room_name_input',
                    field: 'name',
                    value,
                    valueLength: value.length,
                    section: 'add_room_form',
                    timestamp: Date.now(),
                  })
                  updateFormData('name', value)
                }}
                maxLength={50}
              />
              {errors.name && (
                <Text
                  style={[
                    styles.errorText,
                    { color: theme.colors.palette.angry500 },
                  ]}
                >
                  {errors.name}
                </Text>
              )}
            </View>

            {/* Room Description */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.multilineInput,
                  {
                    backgroundColor: theme.colors.palette.neutral200,
                    color: theme.colors.text,
                    borderColor: theme.colors.palette.neutral400,
                  },
                ]}
                placeholder="Enter room description (optional)"
                placeholderTextColor={theme.colors.palette.neutral600}
                value={formData.description}
                onChangeText={value => {
                  trackClick('room_description_input')
                  trackContentChange({
                    action: 'room_description_input',
                    field: 'description',
                    value,
                    valueLength: value.length,
                    section: 'add_room_form',
                    timestamp: Date.now(),
                  })
                  updateFormData('description', value)
                }}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            {/* Room Type */}
            {renderRoomTypeSelector()}

            {/* Floor */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Floor *
              </Text>
              <View style={styles.floorContainer}>
                <TouchableOpacity
                  style={[
                    styles.floorButton,
                    {
                      backgroundColor: theme.colors.palette.neutral200,
                      borderColor: theme.colors.palette.neutral400,
                    },
                  ]}
                  onPress={debounce(() => {
                    trackClick('floor_decrease_button')
                    trackContentChange({
                      action: 'floor_decreased',
                      previousFloor: formData.floor,
                      newFloor: Math.max(1, formData.floor - 1),
                      section: 'add_room_form',
                      timestamp: Date.now(),
                    })
                    updateFormData('floor', Math.max(1, formData.floor - 1))
                  }, 300)}
                  disabled={formData.floor <= 1}
                >
                  <Ionicons
                    name="remove"
                    size={20}
                    color={
                      formData.floor <= 1
                        ? theme.colors.palette.neutral500
                        : theme.colors.palette.neutral700
                    }
                  />
                </TouchableOpacity>

                <TextInput
                  style={[
                    styles.floorInput,
                    {
                      backgroundColor: theme.colors.palette.neutral200,
                      color: theme.colors.text,
                      borderColor: errors.floor
                        ? theme.colors.palette.angry500
                        : theme.colors.palette.neutral400,
                    },
                  ]}
                  value={formData.floor.toString()}
                  onChangeText={value => {
                    const numValue = parseInt(value) || 1
                    const clampedValue = Math.max(1, Math.min(10, numValue))
                    trackClick('floor_input_changed')
                    trackContentChange({
                      action: 'floor_input_changed',
                      field: 'floor',
                      inputValue: value,
                      parsedValue: numValue,
                      clampedValue,
                      section: 'add_room_form',
                      timestamp: Date.now(),
                    })
                    updateFormData('floor', clampedValue)
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />

                <TouchableOpacity
                  style={[
                    styles.floorButton,
                    {
                      backgroundColor: theme.colors.palette.neutral200,
                      borderColor: theme.colors.palette.neutral400,
                    },
                  ]}
                  onPress={debounce(() => {
                    trackClick('floor_increase_button')
                    trackContentChange({
                      action: 'floor_increased',
                      previousFloor: formData.floor,
                      newFloor: Math.min(10, formData.floor + 1),
                      section: 'add_room_form',
                      timestamp: Date.now(),
                    })
                    updateFormData('floor', Math.min(10, formData.floor + 1))
                  }, 300)}
                  disabled={formData.floor >= 10}
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={
                      formData.floor >= 10
                        ? theme.colors.palette.neutral500
                        : theme.colors.palette.neutral700
                    }
                  />
                </TouchableOpacity>
              </View>
              {errors.floor && (
                <Text
                  style={[
                    styles.errorText,
                    { color: theme.colors.palette.angry500 },
                  ]}
                >
                  {errors.floor}
                </Text>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: isLoading
                    ? theme.colors.palette.neutral400
                    : theme.colors.palette.primary500,
                },
              ]}
              onPress={() => {
                trackClick('submit_room_form')
                trackContentChange({
                  action: 'submit_room_form_clicked',
                  formData: {
                    name: formData.name,
                    description: formData.description,
                    type: formData.type,
                    floor: formData.floor,
                  },
                  hasErrors: Object.keys(errors).length > 0,
                  section: 'add_room_form',
                  timestamp: Date.now(),
                })
                handleSubmit()
              }}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.submitButtonText,
                  { color: theme.colors.palette.neutral100 },
                ]}
              >
                {isLoading ? 'Creating...' : 'Create Room'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <SuccessDialog
        visible={showSuccessDialog}
        onClose={handleSuccessDialogClose}
        isSuccess={true}
        message="Room Created Successfully!"
        subMessage="Your new room has been added to your smart home."
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
    keyboardAvoidingView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    section: {
      marginBottom: 24,
      paddingHorizontal: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      color: theme.colors.text,
    },
    textInput: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      width: '100%',
      backgroundColor: theme.colors.palette.neutral200,
      borderColor: theme.colors.palette.neutral400,
      color: theme.colors.text,
    },
    multilineInput: {
      minHeight: 80,
      paddingTop: 12,
      textAlignVertical: 'top',
    },
    errorText: {
      fontSize: 14,
      marginTop: 4,
      color: theme.colors.palette.angry500,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    typeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      marginBottom: 8,
      minWidth: '30%',
    },
    typeOptionText: {
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 6,
    },
    floorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    floorButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    floorInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      textAlign: 'center',
    },
    submitButton: {
      marginHorizontal: 20,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  })
