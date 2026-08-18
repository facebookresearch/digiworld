// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useRef, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router'
import { useStores } from '@/models/helpers/useStores'
import { useAppTheme, type Theme, Text } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import LinearGradient from 'react-native-linear-gradient'
import { FancyAlert } from '@/components'
import { debounce } from 'lodash'

const BookParkingScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { parkingStore } = useStores()
  const router = useRouter()
  const { sessionTimeStamp } = useLocalSearchParams()
  const durationRef = useRef<TextInput>(null)
  const { trackScreenMount } = useInteractionTracking(
    'BookParking',
    '/screens/parking/book-parking',
  )

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        date: Date.now(),
        screenName: 'BookParking',
        route: '/screens/parking/book-parking',
      })
    }, []),
  )

  const selectedZone = parkingStore.selectedParkingZone
  const userVehicles = parkingStore.vehicles
  const vehicleTypes = parkingStore.vehicleTypes

  // Use parking store booking form state
  const { vehicleId, plannedDurationMinutes, extendingSessionId } =
    parkingStore.parkingBookingForm
  const isExtending = extendingSessionId !== null

  useEffect(() => {
    // Auto-select default vehicle if not already selected
    if (!vehicleId) {
      const defaultVehicle = parkingStore.defaultVehicle
      if (defaultVehicle) {
        parkingStore.setBookingVehicle(defaultVehicle.id)
      }
    }
  }, [])

  // Focus restoration on session restore
  useEffect(() => {
    if (sessionTimeStamp) {
      const focusedElement = parkingStore.parkingBookingForm.currentFocused
      if (focusedElement === 'duration') {
        setTimeout(() => {
          durationRef.current?.focus()
          const durationValue = plannedDurationMinutes?.toString() || ''
          durationRef.current?.setSelection(
            durationValue.length,
            durationValue.length,
          )
        }, 300)
      }
    }
  }, [sessionTimeStamp])

  // Helper to get vehicle type name
  const getVehicleTypeName = (vehicleTypeId: number) => {
    const vehicleType = vehicleTypes.find((vt: any) => vt.id === vehicleTypeId)
    return vehicleType?.name || 'Unknown'
  }

  const getVehicleDisplayName = (vehicle: any) => {
    const makeModel =
      vehicle.make && vehicle.model
        ? `${vehicle.make} ${vehicle.model}`
        : vehicle.plateNumber
    const nickname = vehicle.nickname?.trim()

    return nickname ? `${makeModel} (${nickname})` : makeModel
  }

  // Debounced navigation to prevent multiple rapid taps
  // IMPORTANT: All hooks must be called before any early returns
  const handleBack = useCallback(
    debounce(() => {
      // Reset form on back
      parkingStore.resetParkingBookingForm()
      // Clear selected zone only if in extend mode
      if (isExtending) {
        parkingStore.setSelectedParkingZone(null)
        router.push('/(tabs)/home' as any)
      } else if (selectedZone) {
        // If there's a selected zone, navigate back to map screen explicitly
        // This ensures proper navigation after rollback
        router.push('/screens/parking/map' as any)
      } else {
        router.back()
      }
    }, 300),
    [router, parkingStore, isExtending, selectedZone],
  )

  // Debounced navigation to add vehicle screen
  const handleNavigateToAddVehicle = useCallback(
    debounce(() => {
      parkingStore.resetVehicleForm()
      parkingStore.hideDialog() // Clear any existing dialog state
      router.push('/screens/vehicles/add' as any)
    }, 300),
    [router, parkingStore],
  )

  const handleConfirm = useCallback(
    debounce(async () => {
      if (!vehicleId) {
        // Check if user has any vehicles
        if (userVehicles.length === 0) {
          parkingStore.showAlert({
            title: 'No Vehicle Found',
            message:
              'You need to add a vehicle before booking parking. Would you like to add one now?',
            preset: 'warning',
            onConfirm: () => {
              parkingStore.hideAlert()
              handleNavigateToAddVehicle()
            },
          })
        } else {
          parkingStore.showAlert({
            title: 'Vehicle Required',
            message: 'Please select a vehicle to continue',
            preset: 'warning',
          })
        }
        return
      }

      // Check if vehicle has active session (only in normal flow, not extend mode)
      if (!isExtending) {
        const activeSessions = parkingStore.activeParkingSessions
        const vehicleActiveSession = activeSessions.find(
          (session: any) => session.vehicleId === vehicleId,
        )

        if (vehicleActiveSession) {
          const vehicle = userVehicles.find((v: any) => v.id === vehicleId)
          const vehicleName = vehicle
            ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() ||
              vehicle.plateNumber
            : 'This vehicle'

          parkingStore.showAlert({
            title: 'Vehicle Already Parked',
            message: `${vehicleName} is already under active parking. Please extend the existing session or wait for it to complete before booking a new one.`,
            preset: 'warning',
          })
          return
        }
      }

      if (isExtending && extendingSessionId) {
        const session = parkingStore.parkingHistory.find(
          h => h.id === extendingSessionId,
        )
        const sessionEndTime = session?.plannedEndTime
          ? new Date(session.plannedEndTime)
          : null
        const hasExpired =
          !session ||
          session.status !== 'active' ||
          (sessionEndTime !== null && Date.now() >= sessionEndTime.getTime())

        if (hasExpired) {
          await parkingStore.checkAndExpireSessions()
          parkingStore.setExtendingSession(null)
          parkingStore.showAlert({
            title: 'Session Expired',
            message:
              'This parking session has already ended and can no longer be extended.',
            preset: 'warning',
          })
          return
        }
      }

      const durationValue = plannedDurationMinutes || 0

      if (!durationValue || durationValue <= 0) {
        parkingStore.showAlert({
          title: 'Duration Required',
          message: 'Please enter a valid parking duration',
          preset: 'warning',
        })
        return
      }

      if (durationValue < 15) {
        parkingStore.showAlert({
          title: 'Duration Too Short',
          message: 'Minimum parking duration is 15 minutes',
          preset: 'warning',
        })
        return
      }

      if (durationValue > 180) {
        parkingStore.showAlert({
          title: 'Duration Too Long',
          message: 'Maximum parking duration is 180 minutes (3 hours)',
          preset: 'warning',
        })
        return
      }

      // Navigate to payment screen
      router.push('/screens/parking/payment')
    }, 300),
    [
      router,
      parkingStore,
      vehicleId,
      isExtending,
      userVehicles,
      plannedDurationMinutes,
      extendingSessionId,
      handleNavigateToAddVehicle,
    ],
  )

  // Early return must come AFTER all hooks
  if (!selectedZone) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <Text style={styles.errorText}>No parking zone selected</Text>
        </SafeAreaView>
      </View>
    )
  }

  const selectedVehicle = userVehicles.find((v: any) => v.id === vehicleId)

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.neutral200,
          theme.colors.palette.neutral100,
        ]}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.colors.palette.neutral900}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle} preset="subheading">
              {isExtending ? 'Extend Parking' : 'Book Parking'}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Zone Details Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Parking Zone</Text>
              <View style={styles.zoneDetails}>
                <View style={styles.zoneRow}>
                  <Text style={styles.zoneLabel}>Zone Code</Text>
                  <Text style={styles.zoneValue}>{selectedZone.zoneCode}</Text>
                </View>
                <View style={styles.zoneRow}>
                  <Text style={styles.zoneLabel}>Location</Text>
                  <Text style={styles.zoneValue}>{selectedZone.name}</Text>
                </View>
                {selectedZone.operator && (
                  <View style={styles.zoneRow}>
                    <Text style={styles.zoneLabel}>Operator</Text>
                    <Text style={styles.zoneValue}>
                      {selectedZone.operator}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Vehicle Selection */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Select Vehicle</Text>

              {userVehicles.length === 0 ? (
                <View style={styles.noVehicles}>
                  <Ionicons
                    name="car-outline"
                    size={48}
                    color={theme.colors.palette.neutral400}
                  />
                  <Text style={styles.noVehiclesText}>No vehicles added</Text>
                  <TouchableOpacity
                    style={styles.addVehicleButton}
                    onPress={handleNavigateToAddVehicle}
                  >
                    <Text style={styles.addVehicleButtonText}>Add Vehicle</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.dropdown,
                      isExtending && styles.dropdownDisabled,
                    ]}
                    onPress={() => {
                      if (!isExtending) {
                        parkingStore.toggleVehicleDropdown()
                      }
                    }}
                    disabled={isExtending}
                  >
                    <View style={styles.dropdownContent}>
                      {selectedVehicle ? (
                        <>
                          <Ionicons
                            name="car"
                            size={20}
                            color={theme.colors.palette.primary500}
                          />
                          <View style={styles.dropdownText}>
                            <Text style={styles.dropdownTitle}>
                              {getVehicleDisplayName(selectedVehicle)}
                            </Text>
                            <Text style={styles.dropdownSubtitle}>
                              {selectedVehicle.plateNumber} •{' '}
                              {getVehicleTypeName(
                                selectedVehicle.vehicleTypeId,
                              )}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <Text style={styles.dropdownPlaceholder}>
                          Select a vehicle
                        </Text>
                      )}
                    </View>
                    {!isExtending && (
                      <Ionicons
                        name={
                          parkingStore.parkingBookingForm.showVehicleDropdown
                            ? 'chevron-up'
                            : 'chevron-down'
                        }
                        size={20}
                        color={theme.colors.palette.neutral600}
                      />
                    )}
                  </TouchableOpacity>

                  {/* Dropdown List */}
                  {parkingStore.parkingBookingForm.showVehicleDropdown &&
                    !isExtending && (
                      <ScrollView
                        style={styles.dropdownList}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {userVehicles.map((vehicle: any) => (
                          <TouchableOpacity
                            key={vehicle.id}
                            style={[
                              styles.dropdownItem,
                              vehicleId === vehicle.id &&
                                styles.dropdownItemSelected,
                            ]}
                            onPress={() => {
                              parkingStore.setBookingVehicle(vehicle.id)
                              parkingStore.toggleVehicleDropdown()
                            }}
                          >
                            <Ionicons
                              name="car"
                              size={20}
                              color={
                                vehicleId === vehicle.id
                                  ? theme.colors.palette.primary500
                                  : theme.colors.palette.neutral600
                              }
                            />
                            <View style={styles.dropdownText}>
                              <Text
                                style={{
                                  fontSize: 16,
                                  fontWeight: '600',
                                  color:
                                    vehicleId === vehicle.id
                                      ? theme.colors.palette.primary500
                                      : theme.colors.palette.neutral900,
                                }}
                              >
                                {getVehicleDisplayName(vehicle)}
                              </Text>
                              <Text style={styles.dropdownSubtitle}>
                                {vehicle.plateNumber} •{' '}
                                {getVehicleTypeName(vehicle.vehicleTypeId)}
                              </Text>
                            </View>
                            {vehicleId === vehicle.id && (
                              <Ionicons
                                name="checkmark"
                                size={20}
                                color={theme.colors.palette.primary500}
                              />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                </>
              )}
            </View>

            {/* Duration Input */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {isExtending ? 'Additional Duration' : 'Parking Duration'}
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  parkingStore.parkingBookingForm.currentFocused ===
                    'duration' && styles.inputFocused,
                ]}
              >
                <TextInput
                  ref={durationRef}
                  style={styles.input}
                  value={
                    plannedDurationMinutes
                      ? plannedDurationMinutes.toString()
                      : ''
                  }
                  onChangeText={text => {
                    // Remove non-numeric characters
                    const numericText = text.replace(/\D/g, '')
                    const value = numericText ? parseInt(numericText) : null
                    parkingStore.setBookingDuration(value)
                  }}
                  onFocus={() => parkingStore.setBookingFormFocused('duration')}
                  onBlur={() => parkingStore.setBookingFormFocused(null)}
                  placeholder={
                    isExtending ? 'Enter additional duration' : 'Enter duration'
                  }
                  placeholderTextColor={theme.colors.palette.neutral500}
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
                <Text style={styles.inputSuffix}>minutes</Text>
              </View>
              <Text style={styles.inputHint}>
                15 - 180 minutes (3 hours max)
              </Text>
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (userVehicles.length === 0 || !vehicleId) &&
                  styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={userVehicles.length === 0 || !vehicleId}
            >
              <Text
                style={
                  userVehicles.length === 0 || !vehicleId
                    ? styles.confirmButtonTextDisabled
                    : styles.confirmButtonText
                }
              >
                Continue to Payment
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Alert Dialog */}
      <FancyAlert
        visible={parkingStore.alertState.visible}
        title={parkingStore.alertState.title}
        message={parkingStore.alertState.message}
        preset={
          parkingStore.alertState.preset as
            | 'default'
            | 'success'
            | 'error'
            | 'warning'
            | 'delete'
        }
        onClose={() => parkingStore.hideAlert()}
        onConfirm={parkingStore.getAlertOnConfirm() || undefined}
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
    keyboardAvoid: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 16,
      justifyContent: 'space-between',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      color: theme.colors.palette.neutral900,
      flex: 1,
      textAlign: 'center',
    },
    headerSpacer: {
      width: 40,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 32,
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.palette.angry500,
      textAlign: 'center',
      marginTop: 32,
    },
    card: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginBottom: 12,
    },
    zoneDetails: {
      gap: 12,
    },
    zoneRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    zoneLabel: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },
    zoneValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      flex: 1,
      textAlign: 'right',
    },
    dropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
    },
    dropdownDisabled: {
      backgroundColor: theme.colors.palette.neutral100,
      opacity: 0.6,
    },
    dropdownContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    dropdownText: {
      flex: 1,
    },
    dropdownTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
    dropdownTitleSelected: {
      color: theme.colors.palette.primary500,
    },
    dropdownSubtitle: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      marginTop: 2,
    },
    dropdownPlaceholder: {
      fontSize: 16,
      color: theme.colors.palette.neutral500,
    },
    dropdownList: {
      marginTop: 8,
      maxHeight: 200,
      borderRadius: 12,
      backgroundColor: theme.colors.palette.neutral200,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    dropdownItemSelected: {
      backgroundColor: theme.colors.palette.primary100,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      paddingHorizontal: 16,
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral300,
    },
    inputFocused: {
      borderColor: theme.colors.palette.primary500,
      backgroundColor: theme.colors.palette.neutral100,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.palette.neutral900,
      paddingVertical: 16,
    },
    inputSuffix: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      marginLeft: 8,
    },
    inputHint: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
      marginTop: 8,
    },
    confirmButton: {
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    confirmButtonDisabled: {
      backgroundColor: theme.colors.palette.neutral300,
      opacity: 0.6,
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    confirmButtonTextDisabled: {
      color: theme.colors.palette.neutral600,
    },
    noVehicles: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    noVehiclesText: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      marginTop: 12,
      marginBottom: 16,
    },
    addVehicleButton: {
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    addVehicleButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
  })

export default BookParkingScreen
