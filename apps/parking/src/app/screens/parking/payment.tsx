// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useCallback, useMemo, useEffect } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useStores } from '@/models/helpers/useStores'
import { useAppTheme, type Theme, Text } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import LinearGradient from 'react-native-linear-gradient'
import { FancyAlert, SuccessDialog } from '@/components'
import { debounce } from 'lodash'

const PaymentScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { parkingStore } = useStores()
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking(
    'ParkingPayment',
    '/screens/parking/payment',
  )

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        date: Date.now(),
        screenName: 'ParkingPayment',
        route: '/screens/parking/payment',
      })
    }, []),
  )

  const selectedZone = parkingStore.selectedParkingZone
  const { vehicleId, plannedDurationMinutes } = parkingStore.parkingBookingForm
  const paymentMethods = parkingStore.paymentMethods
  const { selectedPaymentMethodId, showPaymentDropdown, isProcessing } =
    parkingStore.paymentForm

  // Auto-select default payment method on mount
  useEffect(() => {
    parkingStore.initializePaymentForm()
  }, [])

  // Debounced navigation to prevent multiple rapid taps
  // Moved before early returns to comply with Rules of Hooks
  const handleBack = useCallback(
    debounce(() => {
      parkingStore.resetPaymentForm()
      // Explicitly navigate back to booking screen instead of router.back() to ensure proper navigation after rollback
      router.push('/screens/parking/book-parking' as any)
    }, 300),
    [router, parkingStore],
  )

  const handleNavigateToAddPaymentMethod = useCallback(
    debounce(() => {
      router.push({
        pathname: '/(tabs)/payment' as any,
        params: { openAddModal: 'true', returnTo: '/screens/parking/payment' },
      })
    }, 300),
    [router],
  )

  if (!selectedZone || !vehicleId || !plannedDurationMinutes) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <Text style={styles.errorText}>Missing booking information</Text>
        </SafeAreaView>
      </View>
    )
  }

  const selectedVehicle = parkingStore.getVehicleById(vehicleId)
  const selectedPaymentMethod = paymentMethods.find(
    (pm: any) => pm.id === selectedPaymentMethodId,
  )

  if (!selectedVehicle) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <Text style={styles.errorText}>Vehicle not found</Text>
        </SafeAreaView>
      </View>
    )
  }

  // Calculate cost
  const cost = parkingStore.calculateParkingCost(
    selectedVehicle.vehicleTypeId,
    selectedZone.id,
    plannedDurationMinutes,
  )

  const vehicleTypes = parkingStore.vehicleTypes
  const vehicleType = vehicleTypes.find(
    (vt: any) => vt.id === selectedVehicle.vehicleTypeId,
  )
  const makeModel =
    selectedVehicle.make && selectedVehicle.model
      ? `${selectedVehicle.make} ${selectedVehicle.model}`
      : selectedVehicle.plateNumber
  const nickname = selectedVehicle.nickname?.trim()
  const vehicleDisplayName = nickname ? `${makeModel} (${nickname})` : makeModel

  const handleConfirmPayment = async () => {
    if (!selectedPaymentMethodId) {
      // Check if user has any payment methods
      if (paymentMethods.length === 0) {
        parkingStore.showAlert({
          title: 'No Payment Method Found',
          message:
            'You need to add a payment method before confirming. Would you like to add one now?',
          preset: 'warning',
          onConfirm: () => {
            parkingStore.hideAlert()
            handleNavigateToAddPaymentMethod()
          },
        })
      } else {
        parkingStore.showAlert({
          title: 'Payment Method Required',
          message: 'Please select a payment method to continue',
          preset: 'warning',
        })
      }
      return
    }

    try {
      parkingStore.setPaymentProcessing(true)

      const extendingSessionId =
        parkingStore.parkingBookingForm.extendingSessionId

      if (extendingSessionId) {
        await parkingStore.checkAndExpireSessions()

        const refreshedSession = parkingStore.parkingHistory.find(
          h => h.id === extendingSessionId,
        )
        const refreshedEndTime = refreshedSession?.plannedEndTime
          ? new Date(refreshedSession.plannedEndTime)
          : null
        const hasExpired =
          !refreshedSession ||
          refreshedSession.status !== 'active' ||
          (refreshedEndTime !== null &&
            Date.now() >= refreshedEndTime.getTime())

        if (hasExpired) {
          parkingStore.setPaymentProcessing(false)
          parkingStore.setExtendingSession(null)
          parkingStore.showAlert({
            title: 'Session Expired',
            message:
              'This parking session has already ended and can no longer be extended.',
            preset: 'warning',
          })
          return
        }

        // Check if extending would exceed maximum duration
        const session = parkingStore.parkingHistory.find(
          h => h.id === extendingSessionId,
        )
        if (session) {
          const currentDuration = session.plannedDurationMinutes || 0
          const newTotalDuration = currentDuration + plannedDurationMinutes
          const maxDuration = 180 // 3 hours in minutes

          if (newTotalDuration > maxDuration) {
            parkingStore.setPaymentProcessing(false)
            const currentHours = Math.floor(currentDuration / 60)
            const currentMins = currentDuration % 60
            const maxHours = Math.floor(maxDuration / 60)

            parkingStore.showAlert({
              title: 'Maximum Duration Reached',
              message: `This parking session has already been active for ${currentHours}h ${currentMins}m. The maximum allowed duration per session is ${maxHours} hours. Please stop this session and create a new one if you need more time.`,
              preset: 'warning',
            })
            return
          }
        }

        // Extending existing session
        await parkingStore.extendParkingSession(
          extendingSessionId,
          plannedDurationMinutes,
          selectedPaymentMethodId,
        )

        console.log('=== SESSION EXTENDED ===')
        console.log('Session ID:', extendingSessionId)
        console.log('Additional Duration:', plannedDurationMinutes, 'minutes')
        console.log('Additional Cost:', cost.toFixed(2))
        console.log('Payment Method ID:', selectedPaymentMethodId)
        console.log('========================')

        // Show success dialog
        parkingStore.showDialog({
          isSuccess: true,
          message: 'Session Extended!',
          subMessage: `Your parking session has been extended by ${plannedDurationMinutes} minutes`,
        })
      } else {
        // Create new booking
        const bookingResult = await parkingStore.bookParking({
          vehicleId,
          parkingZoneId: selectedZone.id,
          plannedDurationMinutes,
          paymentMethodId: selectedPaymentMethodId,
        })

        console.log('=== BOOKING CREATED ===')
        console.log('Booking result:', JSON.stringify(bookingResult, null, 2))
        console.log('Vehicle ID:', vehicleId)
        console.log('Zone ID:', selectedZone.id)
        console.log('Duration:', plannedDurationMinutes, 'minutes')
        console.log('Cost:', cost.toFixed(2))
        console.log('Payment Method ID:', selectedPaymentMethodId)
        console.log('=======================')

        // Show success dialog
        parkingStore.showDialog({
          isSuccess: true,
          message: 'Parking Booked!',
          subMessage: `Your parking session has been confirmed for ${plannedDurationMinutes} minutes`,
        })
      }

      // Reset forms and navigate after dialog
      setTimeout(() => {
        parkingStore.hideDialog() // Hide dialog before navigating to prevent duplicate
        parkingStore.resetParkingBookingForm()
        parkingStore.resetPaymentForm()
        // Clear selected zone after successful booking (both normal and extend flow)
        parkingStore.setSelectedParkingZone(null)
        router.replace('/(tabs)/home')
      }, 2000)
    } catch (error) {
      console.error('Payment failed:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Unable to process payment.'
      parkingStore.showAlert({
        title: errorMessage.includes('expired')
          ? 'Session Expired'
          : 'Payment Failed',
        message: errorMessage.includes('expired')
          ? errorMessage
          : 'Unable to process payment. Please try again.',
        preset: errorMessage.includes('expired') ? 'warning' : 'error',
      })
    } finally {
      parkingStore.setPaymentProcessing(false)
    }
  }

  const formatCardNumber = (cardNumber: string) => {
    return `•••• ${cardNumber.slice(-4)}`
  }

  const getPaymentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'credit':
        return 'card'
      case 'debit':
        return 'card-outline'
      case 'paypal':
        return 'logo-paypal'
      case 'apple':
        return 'logo-apple'
      case 'google':
        return 'logo-google'
      default:
        return 'wallet'
    }
  }

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
            Confirm Payment
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Cost Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Total Amount</Text>
            <Text style={styles.summaryAmount}>${cost.toFixed(2)}</Text>
            <Text style={styles.summarySubtitle}>
              {plannedDurationMinutes} minutes parking
            </Text>
          </View>

          {/* Zone Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Parking Zone</Text>
            <View style={styles.detailsRow}>
              <Ionicons
                name="location"
                size={20}
                color={theme.colors.palette.primary500}
              />
              <View style={styles.detailsText}>
                <Text style={styles.detailsTitle}>{selectedZone.name}</Text>
                <Text style={styles.detailsSubtitle}>
                  Zone {selectedZone.zoneCode}
                </Text>
              </View>
            </View>
          </View>

          {/* Vehicle Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Vehicle</Text>
            <View style={styles.detailsRow}>
              <Ionicons
                name="car"
                size={20}
                color={theme.colors.palette.primary500}
              />
              <View style={styles.detailsText}>
                <Text style={styles.detailsTitle}>{vehicleDisplayName}</Text>
                <Text style={styles.detailsSubtitle}>
                  {selectedVehicle.plateNumber} •{' '}
                  {vehicleType?.name || 'Unknown'}
                </Text>
              </View>
            </View>
          </View>

          {/* Duration Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Duration</Text>
            <View style={styles.durationDetails}>
              <View style={styles.durationRow}>
                <Text style={styles.durationLabel}>Parking Time</Text>
                <Text style={styles.durationValue}>
                  {plannedDurationMinutes} minutes
                </Text>
              </View>
              <View style={styles.durationRow}>
                <Text style={styles.durationLabel}>Rate</Text>
                <Text style={styles.durationValue}>
                  ${(cost / (plannedDurationMinutes / 60)).toFixed(2)}/hour
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Method Selection */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Method</Text>

            {paymentMethods.length === 0 ? (
              <View style={styles.noPaymentMethods}>
                <Ionicons
                  name="card-outline"
                  size={48}
                  color={theme.colors.palette.neutral400}
                />
                <Text style={styles.noPaymentMethodsText}>
                  No payment methods added
                </Text>
                <TouchableOpacity
                  style={styles.addPaymentButton}
                  onPress={handleNavigateToAddPaymentMethod}
                >
                  <Text style={styles.addPaymentButtonText}>
                    Add Payment Method
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => parkingStore.togglePaymentDropdown()}
                >
                  <View style={styles.dropdownContent}>
                    {selectedPaymentMethod ? (
                      <>
                        <Ionicons
                          name={getPaymentIcon(selectedPaymentMethod.type)}
                          size={20}
                          color={theme.colors.palette.primary500}
                        />
                        <View style={styles.dropdownText}>
                          <Text style={styles.dropdownTitle}>
                            {selectedPaymentMethod.displayName ||
                              selectedPaymentMethod.type}
                          </Text>
                          <Text style={styles.dropdownSubtitle}>
                            {formatCardNumber(selectedPaymentMethod.cardNumber)}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <Text style={styles.dropdownPlaceholder}>
                        Select payment method
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name={showPaymentDropdown ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.colors.palette.neutral600}
                  />
                </TouchableOpacity>

                {/* Dropdown List */}
                {showPaymentDropdown && (
                  <ScrollView
                    style={styles.dropdownList}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                  >
                    {paymentMethods.map((method: any) => (
                      <TouchableOpacity
                        key={method.id}
                        style={[
                          styles.dropdownItem,
                          selectedPaymentMethodId === method.id &&
                            styles.dropdownItemSelected,
                        ]}
                        onPress={() => {
                          parkingStore.setPaymentMethodId(method.id)
                          parkingStore.togglePaymentDropdown()
                        }}
                      >
                        <Ionicons
                          name={getPaymentIcon(method.type)}
                          size={20}
                          color={
                            selectedPaymentMethodId === method.id
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
                                selectedPaymentMethodId === method.id
                                  ? theme.colors.palette.primary500
                                  : theme.colors.palette.neutral900,
                            }}
                          >
                            {method.displayName || method.type}
                          </Text>
                          <Text style={styles.dropdownSubtitle}>
                            {formatCardNumber(method.cardNumber)}
                          </Text>
                        </View>
                        {selectedPaymentMethodId === method.id && (
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

          {/* Confirm Button */}
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (isProcessing || !selectedPaymentMethodId) &&
                styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirmPayment}
            disabled={isProcessing || !selectedPaymentMethodId}
          >
            {isProcessing ? (
              <ActivityIndicator color={theme.colors.palette.neutral100} />
            ) : (
              <Text style={styles.confirmButtonText}>
                Confirm Payment ${cost.toFixed(2)}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
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

      {/* Success Dialog */}
      <SuccessDialog
        visible={parkingStore.dialogState.visible}
        onClose={() => parkingStore.hideDialog()}
        isSuccess={parkingStore.dialogState.isSuccess}
        message={parkingStore.dialogState.message}
        subMessage={parkingStore.dialogState.subMessage}
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
    summaryCard: {
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 16,
      padding: 24,
      marginBottom: 16,
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    summaryTitle: {
      fontSize: 14,
      color: theme.colors.palette.primary100,
      marginBottom: 8,
    },
    summaryAmount: {
      fontSize: 48,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      marginBottom: 4,
    },
    summarySubtitle: {
      fontSize: 16,
      color: theme.colors.palette.primary100,
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
    detailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    detailsText: {
      flex: 1,
    },
    detailsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
    detailsSubtitle: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      marginTop: 2,
    },
    durationDetails: {
      gap: 12,
    },
    durationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    durationLabel: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },
    durationValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
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
    noPaymentMethods: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    noPaymentMethodsText: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      marginTop: 12,
      marginBottom: 16,
    },
    addPaymentButton: {
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    addPaymentButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
    confirmButton: {
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    confirmButtonDisabled: {
      backgroundColor: theme.colors.palette.neutral400,
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
  })

export default PaymentScreen
