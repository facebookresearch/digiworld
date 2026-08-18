// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Text, Screen, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native'
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'

import { getFlightById, getAllBookings } from '@/db/queries'
import { useStores } from '@/models'
import { db } from '@/db'
import { passengers as passengersTable } from '@/db/schema'
import { mutations } from '@/db/mutations'
import { canProceedWithBooking } from '@/utils/flightValidation'

interface Passenger {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  passportNumber: string
}

interface SavedPassenger {
  passenger_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  date_of_birth: string
  passport_number: string
}

export default observer(function BookingFlowScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const params = useLocalSearchParams()
  const { userStore, bookingFlowStore } = useStores()
  const { trackScreenMount, trackClick } = useInteractionTracking(
    'booking-flow',
    '/booking-flow',
  )

  // Session restoration tracking
  const sessionRestoredRef = useRef(false)
  const lastSessionTimeStampRef = useRef<string | null>(null)

  const departureFlightId = params.departureFlightId as string
  const returnFlightId = params.returnFlightId as string
  const tripType = params.tripType as 'oneWay' | 'roundTrip'
  const passengersCount = parseInt(params.passengers as string) || 1

  const [departureFlight, setDepartureFlight] = useState<any>(null)
  const [returnFlight, setReturnFlight] = useState<any>(null)
  const [savedPassengers, setSavedPassengers] = useState<SavedPassenger[]>([])

  useEffect(() => {
    loadFlightDetails()
    loadSavedPassengers()
  }, [])

  // Track screen mount
  useEffect(() => {
    trackScreenMount()
  }, [trackScreenMount])

  // Track screen focus
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'booking-flow',
        route: '/booking-flow',
        currentStep: bookingFlowStore.currentStep,
        passengersCount: bookingFlowStore.passengersCount,
        sessionTimeStamp: params?.sessionTimeStamp,
      })

      return () => {
        getLatestInteraction()
      }
    }, [
      trackScreenMount,
      bookingFlowStore.currentStep,
      bookingFlowStore.passengersCount,
      params?.sessionTimeStamp,
    ]),
  )

  // Handle session restoration (following devices.tsx pattern)
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
      const rootStore = bookingFlowStore.getRootStore?.() as any
      const sessionData = rootStore?.sessionStore?.getSession(
        currentSessionTimeStamp,
      )

      if (sessionData?.data) {
        // Mark session as restored to prevent multiple restoration
        sessionRestoredRef.current = true
      } else {
        // Booking flow session data not found
        sessionRestoredRef.current = true // Mark as restored even if no data found
      }
    } else if (currentSessionTimeStamp && sessionRestoredRef.current) {
      // Session already restored, skipping restoration
    } else {
      // No sessionTimeStamp parameter found
    }
  }, [params?.sessionTimeStamp, bookingFlowStore])

  const loadFlightDetails = async () => {
    try {
      bookingFlowStore.setLoading(true)
      const departure = await getFlightById(departureFlightId)

      // Validate departure flight timing
      if (departure) {
        const validation = canProceedWithBooking(departure.departure_time)
        if (!validation.isValid) {
          router.replace({
            pathname: '/flight-unavailable',
            params: {
              reason: validation.reason,
              action: 'booking',
              timeUntil: validation.timeUntilDeparture?.toString(),
              departureTime: validation.departureTime,
            },
          })
          return
        }
      }

      setDepartureFlight(departure)

      if (returnFlightId && tripType === 'roundTrip') {
        const returnF = await getFlightById(returnFlightId)

        // Validate return flight timing
        if (returnF) {
          const returnValidation = canProceedWithBooking(returnF.departure_time)
          if (!returnValidation.isValid) {
            router.replace({
              pathname: '/flight-unavailable',
              params: {
                reason: returnValidation.reason,
                action: 'booking',
                timeUntil: returnValidation.timeUntilDeparture?.toString(),
                departureTime: returnValidation.departureTime,
              },
            })
            return
          }
        }

        setReturnFlight(returnF)
      }
    } catch (error) {
      console.error('Error loading flight details:', error)
      Alert.alert('Error', 'Failed to load flight details')
    } finally {
      bookingFlowStore.setLoading(false)
    }
  }

  const loadSavedPassengers = async () => {
    if (!userStore?.user?.id) return

    try {
      // Get all passengers from user's previous bookings
      const userBookings = await getAllBookings(userStore.user.id)
      const bookingIds = userBookings.map((b: any) => b.booking_id)

      if (bookingIds.length === 0) return

      // Get unique passengers from all bookings
      const allPassengers = await db.select().from(passengersTable).execute()

      // Filter passengers from user's bookings and remove duplicates
      const uniquePassengers = new Map<string, SavedPassenger>()
      allPassengers.forEach((p: SavedPassenger) => {
        const key = `${p.email}-${p.passport_number}`
        if (!uniquePassengers.has(key)) {
          uniquePassengers.set(key, p)
        }
      })

      setSavedPassengers(Array.from(uniquePassengers.values()))
    } catch (error) {
      console.error('Error loading saved passengers:', error)
    }
  }

  const addPassengerFromCurrentUser = () => {
    trackClick('use_my_info_button')

    if (!userStore?.user) {
      Alert.alert('Error', 'Please log in to use your information')
      return
    }
    const user = userStore.user
    const passenger: Passenger = {
      id: Date.now().toString(),
      firstName: user.username?.split(' ')[0] || '',
      lastName: user.username?.split(' ')[1] || '',
      email: user.email || '',
      phone: '',
      dateOfBirth: '',
      passportNumber: '',
    }

    if (bookingFlowStore.editingPassenger) {
      bookingFlowStore.updatePassenger(
        bookingFlowStore.editingPassenger.id,
        passenger,
      )
    } else {
      bookingFlowStore.addPassenger(passenger)
    }

    bookingFlowStore.setShowAddPassengerModal(false)
  }

  const handleSelectSavedPassenger = (savedPassenger: SavedPassenger) => {
    trackClick(`select_saved_passenger_${savedPassenger.passenger_id}`)

    const passenger: Passenger = {
      id: Date.now().toString(),
      firstName: savedPassenger.first_name,
      lastName: savedPassenger.last_name,
      email: savedPassenger.email,
      phone: savedPassenger.phone,
      dateOfBirth: savedPassenger.date_of_birth,
      passportNumber: savedPassenger.passport_number,
    }

    // Check if already added
    const alreadyAdded = bookingFlowStore.passengers.some(
      p =>
        p.email === passenger.email &&
        p.passportNumber === passenger.passportNumber,
    )

    if (alreadyAdded) {
      Alert.alert('Already Added', 'This passenger is already in your booking')
      return
    }

    bookingFlowStore.addPassenger(passenger)
    bookingFlowStore.setShowPassengerPickerModal(false)
  }

  const handleAddPassenger = () => {
    trackClick(
      bookingFlowStore.editingPassenger
        ? 'update_passenger'
        : 'add_new_passenger',
    )

    if (
      !bookingFlowStore.newPassenger.firstName ||
      !bookingFlowStore.newPassenger.lastName ||
      !bookingFlowStore.newPassenger.email ||
      !bookingFlowStore.newPassenger.phone
    ) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }

    const passenger = {
      ...bookingFlowStore.newPassenger,
      id: bookingFlowStore.editingPassenger?.id || Date.now().toString(),
    }

    if (bookingFlowStore.editingPassenger) {
      bookingFlowStore.updatePassenger(passenger.id, passenger)
    } else {
      bookingFlowStore.addPassenger(passenger)
    }

    resetPassengerForm()
    bookingFlowStore.setShowAddPassengerModal(false)
  }

  const resetPassengerForm = () => {
    bookingFlowStore.resetNewPassenger()
    bookingFlowStore.setEditingPassengerId(null)
  }

  const handleEditPassenger = (passenger: Passenger) => {
    trackClick(`edit_passenger_${passenger.id}`)
    bookingFlowStore.setEditingPassengerId(passenger.id)
    bookingFlowStore.setNewPassenger(passenger)
    bookingFlowStore.setShowAddPassengerModal(true)
  }

  const handleRemovePassenger = (passengerId: string) => {
    trackClick(`remove_passenger_${passengerId}`)
    Alert.alert(
      'Remove Passenger',
      'Are you sure you want to remove this passenger?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            trackClick('remove_passenger_confirmed')
            bookingFlowStore.removePassenger(passengerId)
          },
        },
      ],
    )
  }

  const calculateTotal = () => {
    const departureFare = departureFlight?.fare || 0
    const returnFare = returnFlight?.fare || 0
    const baseTotal = departureFare + returnFare
    return baseTotal * bookingFlowStore.passengersCount
  }

  const formatTime = (timeString: string) => {
    const date = new Date(timeString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleProceedToPayment = () => {
    trackClick('proceed_to_review')

    if (bookingFlowStore.passengersCount === 0) {
      Alert.alert('No Passengers', 'Please add at least one passenger')
      return
    }

    if (bookingFlowStore.passengersCount < passengersCount) {
      Alert.alert(
        'Incomplete',
        `Please add ${passengersCount - bookingFlowStore.passengersCount} more passenger(s)`,
      )
      return
    }

    bookingFlowStore.setCurrentStep(2)
  }

  const handleProceedToPaymentEntry = () => {
    trackClick('proceed_to_payment')
    bookingFlowStore.setCurrentStep(3)
  }

  const formatCardNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '')
    // Limit to 16 digits
    const limited = cleaned.substring(0, 16)
    // Add spaces every 4 digits
    const formatted = limited.match(/.{1,4}/g)?.join(' ') || limited
    return formatted
  }

  const validateCardDetails = () => {
    // Validate card number
    if (
      !bookingFlowStore.cardDetails.cardNumber ||
      bookingFlowStore.cardDetails.cardNumber.replace(/\s/g, '').length < 13
    ) {
      Alert.alert(
        'Invalid Card',
        'Please enter a valid card number (13-16 digits)',
      )
      return false
    }

    // Validate cardholder name
    if (
      !bookingFlowStore.cardDetails.cardHolderName ||
      bookingFlowStore.cardDetails.cardHolderName.trim().length < 3
    ) {
      Alert.alert('Invalid Name', 'Please enter the cardholder name')
      return false
    }

    // Validate expiry date
    if (
      !bookingFlowStore.cardDetails.expiryMonth ||
      !bookingFlowStore.cardDetails.expiryYear
    ) {
      Alert.alert('Invalid Expiry', 'Please enter card expiry date (MM/YY)')
      return false
    }

    // Check if expiry date is in the past
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear() % 100 // Get last 2 digits
    const currentMonth = currentDate.getMonth() + 1
    const expiryYear = parseInt(bookingFlowStore.cardDetails.expiryYear)
    const expiryMonth = parseInt(bookingFlowStore.cardDetails.expiryMonth)

    if (
      expiryYear < currentYear ||
      (expiryYear === currentYear && expiryMonth < currentMonth)
    ) {
      Alert.alert(
        'Expired Card',
        'This card has expired. Please use a valid card.',
      )
      return false
    }

    // Validate CVV
    if (
      !bookingFlowStore.cardDetails.cvv ||
      bookingFlowStore.cardDetails.cvv.length < 3
    ) {
      Alert.alert(
        'Invalid CVV',
        'Please enter a valid CVV (3-4 digits on back of card)',
      )
      return false
    }

    return true
  }

  const generateBookingReference = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let ref = ''
    for (let i = 0; i < 6; i++) {
      ref += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return ref
  }

  const handleConfirmBooking = async () => {
    if (!validateCardDetails()) return

    trackClick('confirm_booking')

    try {
      bookingFlowStore.setProcessingPayment(true)

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      const now = new Date().toISOString()
      const bookingId = `BK${Date.now().toString().slice(-6)}`
      const bookingReference = generateBookingReference()
      const totalPrice = calculateTotal()

      // Create booking
      await mutations.createBooking({
        booking_id: bookingId,
        booking_reference: bookingReference,
        user_id: userStore?.user?.id || 1,
        trip_type: tripType === 'roundTrip' ? 'round_trip' : 'one_way',
        booking_date: now,
        status: 'confirmed',
        payment_status: 'paid',
        total_price: totalPrice,
        refund_amount: 0,
        amount_paid: totalPrice,
        currency: 'USD',
      })

      // Create booking flights
      if (departureFlight) {
        await mutations.createBookingFlight({
          booking_id: bookingId,
          flight_id: departureFlight.flight_id,
          airline_code: departureFlight.airline_code,
          flight_number: departureFlight.flight_number,
          origin: departureFlight.origin,
          destination: departureFlight.destination,
          departure_time: departureFlight.departure_time,
          arrival_time: departureFlight.arrival_time,
          duration_minutes: departureFlight.duration_minutes,
          fare: departureFlight.fare,
          segment: 'outbound',
          status: 'confirmed',
        })
      }

      if (returnFlight) {
        await mutations.createBookingFlight({
          booking_id: bookingId,
          flight_id: returnFlight.flight_id,
          airline_code: returnFlight.airline_code,
          flight_number: returnFlight.flight_number,
          origin: returnFlight.origin,
          destination: returnFlight.destination,
          departure_time: returnFlight.departure_time,
          arrival_time: returnFlight.arrival_time,
          duration_minutes: returnFlight.duration_minutes,
          fare: returnFlight.fare,
          segment: 'return',
          status: 'confirmed',
        })
      }

      // Create passengers and seat assignments
      for (let i = 0; i < bookingFlowStore.passengers.length; i++) {
        const passenger = bookingFlowStore.passengers[i]
        const passengerId = `P${Date.now().toString().slice(-6)}_${i}`
        const ticketNumber = `TK${Date.now().toString().slice(-6)}-${i}`

        await mutations.createPassenger({
          passenger_id: passengerId,
          booking_id: bookingId,
          first_name: passenger.firstName,
          last_name: passenger.lastName,
          email: passenger.email,
          phone: passenger.phone,
          date_of_birth: passenger.dateOfBirth || '1990-01-01',
          passport_number: passenger.passportNumber || 'NA',
          ticket_number: ticketNumber,
        })

        // Assign seats
        if (departureFlight) {
          const seatNumber = `${Math.floor(Math.random() * 30) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 6))}`
          await mutations.createSeatAssignment({
            passenger_id: passengerId,
            flight_id: departureFlight.flight_id,
            seat_number: seatNumber,
          })
        }

        if (returnFlight) {
          const seatNumber = `${Math.floor(Math.random() * 30) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 6))}`
          await mutations.createSeatAssignment({
            passenger_id: passengerId,
            flight_id: returnFlight.flight_id,
            seat_number: seatNumber,
          })
        }
      }

      bookingFlowStore.setProcessingPayment(false)

      // Capture values before resetting store
      const finalPassengerCount = bookingFlowStore.passengersCount

      // Reset booking flow for next booking
      bookingFlowStore.resetBookingFlow()

      // Navigate to fancy success screen
      router.replace({
        pathname: '/booking-success',
        params: {
          bookingReference,
          totalPaid: totalPrice.toFixed(2),
          tripType: tripType === 'roundTrip' ? 'round_trip' : 'one_way',
          passengerCount: finalPassengerCount.toString(),
        },
      })
    } catch (error) {
      bookingFlowStore.setProcessingPayment(false)
      console.error('Booking error:', error)
      Alert.alert(
        'Booking Failed',
        'An error occurred while creating your booking. Please try again.',
      )
    }
  }

  if (bookingFlowStore.loading) {
    return (
      <Screen
        preset="fixed"
        safeAreaEdges={['top']}
        contentContainerStyle={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Ionicons
            name="hourglass-outline"
            size={48}
            color={theme.colors.palette.neutral400}
          />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen
      preset="scroll"
      safeAreaEdges={['top']}
      contentContainerStyle={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            trackClick('back_button')
            bookingFlowStore.resetBookingFlow()
            router.back()
          }}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.palette.neutral100}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Booking</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressStep}>
          <View
            style={
              bookingFlowStore.currentStep >= 1
                ? [styles.stepCircle, styles.stepCircleActive]
                : styles.stepCircle
            }
          >
            <Text
              style={
                bookingFlowStore.currentStep >= 1
                  ? [styles.stepNumber, styles.stepNumberActive]
                  : styles.stepNumber
              }
            >
              1
            </Text>
          </View>
          <Text style={styles.stepLabel}>Passengers</Text>
        </View>
        <View
          style={
            bookingFlowStore.currentStep >= 2
              ? [styles.progressLine, styles.progressLineActive]
              : styles.progressLine
          }
        />
        <View style={styles.progressStep}>
          <View
            style={
              bookingFlowStore.currentStep >= 2
                ? [styles.stepCircle, styles.stepCircleActive]
                : styles.stepCircle
            }
          >
            <Text
              style={
                bookingFlowStore.currentStep >= 2
                  ? [styles.stepNumber, styles.stepNumberActive]
                  : styles.stepNumber
              }
            >
              2
            </Text>
          </View>
          <Text style={styles.stepLabel}>Review</Text>
        </View>
        <View
          style={
            bookingFlowStore.currentStep >= 3
              ? [styles.progressLine, styles.progressLineActive]
              : styles.progressLine
          }
        />
        <View style={styles.progressStep}>
          <View
            style={
              bookingFlowStore.currentStep >= 3
                ? [styles.stepCircle, styles.stepCircleActive]
                : styles.stepCircle
            }
          >
            <Text
              style={
                bookingFlowStore.currentStep >= 3
                  ? [styles.stepNumber, styles.stepNumberActive]
                  : styles.stepNumber
              }
            >
              3
            </Text>
          </View>
          <Text style={styles.stepLabel}>Payment</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {bookingFlowStore.currentStep === 1 ? (
          <>
            {/* Step 1: Passenger Details */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Passenger Details</Text>
                <Text style={styles.passengerCount}>
                  {bookingFlowStore.passengersCount} / {passengersCount}
                </Text>
              </View>

              {/* Passenger List */}
              {bookingFlowStore.passengers.map((passenger, _index) => (
                <View key={passenger.id} style={styles.passengerCard}>
                  <View style={styles.passengerHeader}>
                    <View style={styles.passengerAvatar}>
                      <Text style={styles.passengerInitial}>
                        {passenger.firstName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.passengerInfo}>
                      <Text style={styles.passengerName}>
                        {passenger.firstName} {passenger.lastName}
                      </Text>
                      <Text style={styles.passengerEmail}>
                        {passenger.email}
                      </Text>
                    </View>
                    <View style={styles.passengerActions}>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleEditPassenger(passenger)}
                      >
                        <Ionicons
                          name="create-outline"
                          size={20}
                          color={theme.colors.palette.primary500}
                        />
                      </TouchableOpacity>
                      {bookingFlowStore.passengersCount > 1 && (
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleRemovePassenger(passenger.id)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={20}
                            color={theme.colors.palette.angry500}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}

              {/* Add Passenger Options */}
              {bookingFlowStore.passengersCount < passengersCount && (
                <View style={styles.addPassengerOptions}>
                  {savedPassengers.length > 0 && (
                    <TouchableOpacity
                      style={styles.addPassengerButton}
                      onPress={() => {
                        trackClick('open_saved_passengers_modal')
                        bookingFlowStore.setShowPassengerPickerModal(true)
                      }}
                    >
                      <Ionicons
                        name="people"
                        size={24}
                        color={theme.colors.palette.primary500}
                      />
                      <Text style={styles.addPassengerText}>
                        Select from Saved ({savedPassengers.length})
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.addPassengerButton}
                    onPress={() => {
                      trackClick('open_add_passenger_modal')
                      resetPassengerForm()
                      bookingFlowStore.setShowAddPassengerModal(true)
                    }}
                  >
                    <Ionicons
                      name="add-circle"
                      size={24}
                      color={theme.colors.palette.secondary500}
                    />
                    <Text style={styles.addPassengerTextSecondary}>
                      Add New Passenger
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Flight Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Flight Summary</Text>

              {/* Departure Flight */}
              {departureFlight && (
                <View style={styles.flightSummaryCard}>
                  <View style={styles.flightSummaryHeader}>
                    <Ionicons
                      name="airplane"
                      size={20}
                      color={theme.colors.palette.primary500}
                    />
                    <Text style={styles.flightSummaryLabel}>Departure</Text>
                  </View>
                  <View style={styles.flightSummaryRoute}>
                    <Text style={styles.flightSummaryCity}>
                      {departureFlight.origin}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={theme.colors.palette.neutral600}
                    />
                    <Text style={styles.flightSummaryCity}>
                      {departureFlight.destination}
                    </Text>
                  </View>
                  <Text style={styles.flightSummaryDetails}>
                    {departureFlight.flight_number} •{' '}
                    {formatDate(departureFlight.departure_time)}
                  </Text>
                  <Text style={styles.flightSummaryPrice}>
                    ${departureFlight.fare}
                  </Text>
                </View>
              )}

              {/* Return Flight */}
              {returnFlight && (
                <View style={styles.flightSummaryCard}>
                  <View style={styles.flightSummaryHeader}>
                    <Ionicons
                      name="return-down-back"
                      size={20}
                      color={theme.colors.palette.primary500}
                    />
                    <Text style={styles.flightSummaryLabel}>Return</Text>
                  </View>
                  <View style={styles.flightSummaryRoute}>
                    <Text style={styles.flightSummaryCity}>
                      {returnFlight.origin}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={theme.colors.palette.neutral600}
                    />
                    <Text style={styles.flightSummaryCity}>
                      {returnFlight.destination}
                    </Text>
                  </View>
                  <Text style={styles.flightSummaryDetails}>
                    {returnFlight.flight_number} •{' '}
                    {formatDate(returnFlight.departure_time)}
                  </Text>
                  <Text style={styles.flightSummaryPrice}>
                    ${returnFlight.fare}
                  </Text>
                </View>
              )}
            </View>

            {/* Continue Button */}
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  bookingFlowStore.passengersCount < passengersCount &&
                    styles.continueButtonDisabled,
                ]}
                onPress={handleProceedToPayment}
                disabled={bookingFlowStore.passengersCount < passengersCount}
              >
                <Text style={styles.continueButtonText}>Review & Pay</Text>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={theme.colors.palette.neutral100}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : bookingFlowStore.currentStep === 2 ? (
          <>
            {/* Step 2: Review & Fare Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fare Breakdown</Text>
              <View style={styles.fareCard}>
                {/* Flight Fares */}
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Departure Flight</Text>
                  <Text style={styles.fareValue}>
                    ${departureFlight?.fare} ×{' '}
                    {bookingFlowStore.passengersCount}
                  </Text>
                  <Text style={styles.fareAmount}>
                    $
                    {(
                      departureFlight?.fare * bookingFlowStore.passengersCount
                    ).toFixed(2)}
                  </Text>
                </View>

                {returnFlight && (
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>Return Flight</Text>
                    <Text style={styles.fareValue}>
                      ${returnFlight.fare} × {bookingFlowStore.passengersCount}
                    </Text>
                    <Text style={styles.fareAmount}>
                      $
                      {(
                        returnFlight.fare * bookingFlowStore.passengersCount
                      ).toFixed(2)}
                    </Text>
                  </View>
                )}

                {/* Taxes & Fees */}
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Taxes & Fees</Text>
                  <Text style={styles.fareValue}>-</Text>
                  <Text style={styles.fareAmount}>$0.00</Text>
                </View>

                <View style={styles.fareDivider} />

                {/* Total */}
                <View style={styles.fareTotalRow}>
                  <Text style={styles.fareTotalLabel}>Total Amount</Text>
                  <Text style={styles.fareTotalValue}>
                    ${calculateTotal().toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Passengers Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Passengers ({bookingFlowStore.passengersCount})
              </Text>
              {bookingFlowStore.passengers.map((passenger, index) => (
                <View key={passenger.id} style={styles.passengerSummaryCard}>
                  <Text style={styles.passengerSummaryName}>
                    {index + 1}. {passenger.firstName} {passenger.lastName}
                  </Text>
                  <Text style={styles.passengerSummaryEmail}>
                    {passenger.email}
                  </Text>
                </View>
              ))}
            </View>

            {/* Flight Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Flight Details</Text>

              {departureFlight && (
                <View style={styles.reviewFlightCard}>
                  <View style={styles.reviewFlightHeader}>
                    <Ionicons
                      name="airplane"
                      size={18}
                      color={theme.colors.palette.primary500}
                    />
                    <Text style={styles.reviewFlightLabel}>Departure</Text>
                  </View>
                  <View style={styles.reviewFlightRoute}>
                    <View style={styles.reviewCity}>
                      <Text style={styles.reviewCityCode}>
                        {departureFlight.origin}
                      </Text>
                      <Text style={styles.reviewTime}>
                        {formatTime(departureFlight.departure_time)}
                      </Text>
                    </View>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={theme.colors.palette.neutral400}
                    />
                    <View style={styles.reviewCity}>
                      <Text style={styles.reviewCityCode}>
                        {departureFlight.destination}
                      </Text>
                      <Text style={styles.reviewTime}>
                        {formatTime(departureFlight.arrival_time)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reviewFlightInfo}>
                    {departureFlight.airline_code}{' '}
                    {departureFlight.flight_number} •{' '}
                    {formatDate(departureFlight.departure_time)}
                  </Text>
                </View>
              )}

              {returnFlight && (
                <View style={styles.reviewFlightCard}>
                  <View style={styles.reviewFlightHeader}>
                    <Ionicons
                      name="return-down-back"
                      size={18}
                      color={theme.colors.palette.primary500}
                    />
                    <Text style={styles.reviewFlightLabel}>Return</Text>
                  </View>
                  <View style={styles.reviewFlightRoute}>
                    <View style={styles.reviewCity}>
                      <Text style={styles.reviewCityCode}>
                        {returnFlight.origin}
                      </Text>
                      <Text style={styles.reviewTime}>
                        {formatTime(returnFlight.departure_time)}
                      </Text>
                    </View>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={theme.colors.palette.neutral400}
                    />
                    <View style={styles.reviewCity}>
                      <Text style={styles.reviewCityCode}>
                        {returnFlight.destination}
                      </Text>
                      <Text style={styles.reviewTime}>
                        {formatTime(returnFlight.arrival_time)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reviewFlightInfo}>
                    {returnFlight.airline_code} {returnFlight.flight_number} •{' '}
                    {formatDate(returnFlight.departure_time)}
                  </Text>
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={styles.backStepButton}
                onPress={() => {
                  trackClick('back_to_passengers')
                  bookingFlowStore.setCurrentStep(1)
                }}
              >
                <Ionicons
                  name="arrow-back"
                  size={20}
                  color={theme.colors.palette.primary500}
                />
                <Text style={styles.backStepText}>Back to Passengers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleProceedToPaymentEntry}
              >
                <Text style={styles.confirmButtonText}>Proceed to Payment</Text>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={theme.colors.palette.neutral100}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Step 3: Payment */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Details</Text>

              {/* Payment Summary */}
              <View style={styles.paymentSummaryCard}>
                <View style={styles.paymentSummaryRow}>
                  <Text style={styles.paymentSummaryLabel}>Total Amount</Text>
                  <Text style={styles.paymentSummaryAmount}>
                    ${calculateTotal().toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.paymentSummarySubtext}>
                  {bookingFlowStore.passengersCount} passenger(s) •{' '}
                  {tripType === 'roundTrip' ? 'Round Trip' : 'One Way'}
                </Text>
              </View>

              {/* Card Details Form */}
              <View style={styles.cardForm}>
                {/* Card Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Card Number *</Text>
                  <View style={styles.cardInputContainer}>
                    <Ionicons
                      name="card-outline"
                      size={20}
                      color={theme.colors.palette.neutral500}
                      style={styles.cardIcon}
                    />
                    <TextInput
                      style={styles.cardInput}
                      value={bookingFlowStore.cardDetails.cardNumber}
                      onChangeText={text =>
                        bookingFlowStore.updateCardField(
                          'cardNumber',
                          formatCardNumber(text),
                        )
                      }
                      placeholder="Enter card number"
                      keyboardType="number-pad"
                      maxLength={19}
                    />
                  </View>
                </View>

                {/* Card Holder Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Cardholder Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={bookingFlowStore.cardDetails.cardHolderName}
                    onChangeText={text =>
                      bookingFlowStore.updateCardField(
                        'cardHolderName',
                        text.toUpperCase(),
                      )
                    }
                    placeholder="Enter name on card"
                    autoCapitalize="characters"
                  />
                </View>

                {/* Expiry and CVV Row */}
                <View style={styles.cardRowInputs}>
                  <View
                    style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}
                  >
                    <Text style={styles.inputLabel}>Expiry Date *</Text>
                    <View style={styles.expiryRow}>
                      <TextInput
                        style={styles.expiryInput}
                        value={bookingFlowStore.cardDetails.expiryMonth}
                        onChangeText={text => {
                          const cleaned = text
                            .replace(/\D/g, '')
                            .substring(0, 2)
                          if (
                            cleaned === '' ||
                            (parseInt(cleaned) >= 1 && parseInt(cleaned) <= 12)
                          ) {
                            bookingFlowStore.updateCardField(
                              'expiryMonth',
                              cleaned,
                            )
                          }
                        }}
                        placeholder="MM"
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                      <Text style={styles.expirySeparator}>/</Text>
                      <TextInput
                        style={styles.expiryInput}
                        value={bookingFlowStore.cardDetails.expiryYear}
                        onChangeText={text => {
                          const cleaned = text
                            .replace(/\D/g, '')
                            .substring(0, 2)
                          bookingFlowStore.updateCardField(
                            'expiryYear',
                            cleaned,
                          )
                        }}
                        placeholder="YY"
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <View style={styles.cvvLabelRow}>
                      <Text style={styles.inputLabel}>CVV *</Text>
                      <Ionicons
                        name="card-outline"
                        size={14}
                        color={theme.colors.palette.neutral500}
                      />
                    </View>
                    <TextInput
                      style={styles.input}
                      value={bookingFlowStore.cardDetails.cvv}
                      onChangeText={text =>
                        bookingFlowStore.updateCardField(
                          'cvv',
                          text.replace(/\D/g, '').substring(0, 4),
                        )
                      }
                      placeholder="3-4 digits"
                      keyboardType="number-pad"
                      maxLength={4}
                      secureTextEntry
                    />
                  </View>
                </View>

                {/* Security Note */}
                <View style={styles.securityNote}>
                  <Ionicons
                    name="shield-checkmark"
                    size={16}
                    color={theme.colors.palette.success500}
                  />
                  <Text style={styles.securityNoteText}>
                    Your payment is secure and encrypted
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={styles.backStepButton}
                onPress={() => {
                  trackClick('back_to_review')
                  bookingFlowStore.setCurrentStep(2)
                }}
              >
                <Ionicons
                  name="arrow-back"
                  size={20}
                  color={theme.colors.palette.primary500}
                />
                <Text style={styles.backStepText}>Back to Review</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  bookingFlowStore.processingPayment &&
                    styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirmBooking}
                disabled={bookingFlowStore.processingPayment}
              >
                {bookingFlowStore.processingPayment ? (
                  <>
                    <Text style={styles.confirmButtonText}>Processing...</Text>
                    <Ionicons
                      name="hourglass-outline"
                      size={20}
                      color={theme.colors.palette.neutral100}
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.confirmButtonText}>
                      Pay ${calculateTotal().toFixed(2)}
                    </Text>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={theme.colors.palette.neutral100}
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Add/Edit Passenger Modal */}
      <Modal
        visible={bookingFlowStore.showAddPassengerModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          resetPassengerForm()
          bookingFlowStore.setShowAddPassengerModal(false)
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {bookingFlowStore.editingPassenger
                  ? 'Edit Passenger'
                  : 'Add Passenger'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  resetPassengerForm()
                  bookingFlowStore.setShowAddPassengerModal(false)
                }}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.palette.neutral600}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Use My Info Button */}
              {userStore?.user && !bookingFlowStore.editingPassenger && (
                <>
                  <TouchableOpacity
                    style={styles.useMyInfoButton}
                    onPress={addPassengerFromCurrentUser}
                  >
                    <Ionicons
                      name="flash"
                      size={20}
                      color={theme.colors.palette.primary500}
                    />
                    <Text style={styles.useMyInfoText}>
                      Quick Fill - Use My Info
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.orDivider}>
                    <View style={styles.orLine} />
                    <Text style={styles.orText}>OR ENTER MANUALLY</Text>
                    <View style={styles.orLine} />
                  </View>
                </>
              )}

              {/* First Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={bookingFlowStore.newPassenger.firstName}
                  onChangeText={text =>
                    bookingFlowStore.setNewPassenger({
                      ...bookingFlowStore.newPassenger,
                      firstName: text,
                    })
                  }
                />
              </View>

              {/* Last Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={bookingFlowStore.newPassenger.lastName}
                  onChangeText={text =>
                    bookingFlowStore.setNewPassenger({
                      ...bookingFlowStore.newPassenger,
                      lastName: text,
                    })
                  }
                />
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={bookingFlowStore.newPassenger.email}
                  onChangeText={text =>
                    bookingFlowStore.setNewPassenger({
                      ...bookingFlowStore.newPassenger,
                      email: text,
                    })
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone *</Text>
                <TextInput
                  style={styles.input}
                  value={bookingFlowStore.newPassenger.phone}
                  onChangeText={text =>
                    bookingFlowStore.setNewPassenger({
                      ...bookingFlowStore.newPassenger,
                      phone: text,
                    })
                  }
                  keyboardType="phone-pad"
                />
              </View>

              {/* Date of Birth */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date of Birth</Text>
                <TextInput
                  style={styles.input}
                  value={bookingFlowStore.newPassenger.dateOfBirth}
                  onChangeText={text =>
                    bookingFlowStore.setNewPassenger({
                      ...bookingFlowStore.newPassenger,
                      dateOfBirth: text,
                    })
                  }
                  placeholder="YYYY-MM-DD"
                />
              </View>

              {/* Passport Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Passport Number</Text>
                <TextInput
                  style={styles.input}
                  value={bookingFlowStore.newPassenger.passportNumber}
                  onChangeText={text =>
                    bookingFlowStore.setNewPassenger({
                      ...bookingFlowStore.newPassenger,
                      passportNumber: text,
                    })
                  }
                  autoCapitalize="characters"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.savePassengerButton}
                onPress={handleAddPassenger}
              >
                <Text style={styles.savePassengerText}>
                  {bookingFlowStore.editingPassenger
                    ? 'Update Passenger'
                    : 'Add Passenger'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Passenger Picker Modal */}
      <Modal
        visible={bookingFlowStore.showPassengerPickerModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          bookingFlowStore.setShowPassengerPickerModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Passenger</Text>
              <TouchableOpacity
                onPress={() =>
                  bookingFlowStore.setShowPassengerPickerModal(false)
                }
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.palette.neutral600}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {savedPassengers.length === 0 ? (
                <View style={styles.noSavedPassengers}>
                  <Ionicons
                    name="people-outline"
                    size={48}
                    color={theme.colors.palette.neutral400}
                  />
                  <Text style={styles.noSavedText}>No Saved Passengers</Text>
                  <Text style={styles.noSavedSubtext}>
                    Previous passengers will appear here
                  </Text>
                </View>
              ) : (
                savedPassengers.map(savedPassenger => (
                  <TouchableOpacity
                    key={savedPassenger.passenger_id}
                    style={styles.savedPassengerCard}
                    onPress={() => handleSelectSavedPassenger(savedPassenger)}
                  >
                    <View style={styles.savedPassengerAvatar}>
                      <Text style={styles.savedPassengerInitial}>
                        {savedPassenger.first_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.savedPassengerInfo}>
                      <Text style={styles.savedPassengerName}>
                        {savedPassenger.first_name} {savedPassenger.last_name}
                      </Text>
                      <Text style={styles.savedPassengerEmail}>
                        {savedPassenger.email}
                      </Text>
                      {savedPassenger.passport_number && (
                        <Text style={styles.savedPassengerPassport}>
                          Passport: {savedPassenger.passport_number}
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={theme.colors.palette.neutral400}
                    />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },
    header: {
      backgroundColor: theme.colors.palette.primary500,
      paddingVertical: 20,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 6,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      flex: 1,
      textAlign: 'center',
    },
    headerPlaceholder: {
      width: 40,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      marginTop: 16,
    },
    // Progress Indicator
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
      paddingHorizontal: 40,
      backgroundColor: theme.colors.palette.neutral100,
    },
    progressStep: {
      alignItems: 'center',
    },
    stepCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral200,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    stepCircleActive: {
      backgroundColor: theme.colors.palette.primary500,
    },
    stepNumber: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral600,
    },
    stepNumberActive: {
      color: theme.colors.palette.neutral100,
    },
    stepLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.neutral600,
    },
    progressLine: {
      flex: 1,
      height: 2,
      backgroundColor: theme.colors.palette.neutral200,
      marginHorizontal: 16,
    },
    progressLineActive: {
      backgroundColor: theme.colors.palette.primary500,
    },
    content: {
      flex: 1,
    },
    section: {
      marginHorizontal: 20,
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    passengerCount: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
    },
    // Passenger Card
    passengerCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    passengerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    passengerAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.palette.primary500,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    passengerInitial: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    passengerInfo: {
      flex: 1,
    },
    passengerName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 2,
    },
    passengerEmail: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
    },
    passengerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    iconButton: {
      padding: 8,
    },
    addPassengerOptions: {
      gap: 12,
    },
    addPassengerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 16,
      borderWidth: 2,
      borderColor: theme.colors.palette.primary500,
      borderStyle: 'dashed',
    },
    addPassengerText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
    },
    addPassengerTextSecondary: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.secondary500,
    },
    // Saved Passenger Picker
    savedPassengerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
    },
    savedPassengerAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.palette.primary500,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    savedPassengerInitial: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    savedPassengerInfo: {
      flex: 1,
    },
    savedPassengerName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 2,
    },
    savedPassengerEmail: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
      marginBottom: 2,
    },
    savedPassengerPassport: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.palette.neutral500,
    },
    noSavedPassengers: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    noSavedText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.palette.neutral700,
      marginTop: 16,
      marginBottom: 8,
    },
    noSavedSubtext: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
    },
    // Flight Summary Card
    flightSummaryCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
    },
    flightSummaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    flightSummaryLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      textTransform: 'uppercase',
    },
    flightSummaryRoute: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    flightSummaryCity: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.palette.neutral900,
    },
    flightSummaryDetails: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
      marginBottom: 8,
    },
    flightSummaryPrice: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
    },
    // Bottom Actions
    bottomActions: {
      marginHorizontal: 20,
      marginVertical: 24,
      gap: 12,
    },
    continueButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: theme.colors.palette.primary500,
      paddingVertical: 16,
      borderRadius: 12,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    continueButtonDisabled: {
      backgroundColor: theme.colors.palette.neutral400,
      shadowOpacity: 0,
    },
    continueButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    backStepButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.palette.neutral100,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.palette.primary500,
    },
    backStepText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
    },
    confirmButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: theme.colors.palette.success500,
      paddingVertical: 16,
      borderRadius: 12,
      shadowColor: theme.colors.palette.success500,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    confirmButtonDisabled: {
      backgroundColor: theme.colors.palette.neutral400,
      shadowOpacity: 0,
    },
    // Payment Styles
    paymentSummaryCard: {
      backgroundColor: theme.colors.palette.primary100,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      borderWidth: 2,
      borderColor: theme.colors.palette.primary200,
    },
    paymentSummaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    paymentSummaryLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral700,
    },
    paymentSummaryAmount: {
      fontSize: 28,
      fontWeight: '900',
      color: theme.colors.palette.primary500,
    },
    paymentSummarySubtext: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
    },
    cardForm: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: 20,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    cardInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      paddingHorizontal: 14,
    },
    cardIcon: {
      marginRight: 10,
    },
    cardInput: {
      flex: 1,
      padding: 14,
      fontSize: 15,
      color: theme.colors.palette.neutral900,
      fontWeight: '600',
      letterSpacing: 1,
    },
    cardRowInputs: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    expiryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      paddingHorizontal: 14,
    },
    expiryInput: {
      flex: 1,
      minWidth: 45,
      paddingVertical: 14,
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      textAlign: 'center',
    },
    expirySeparator: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral500,
      paddingHorizontal: 8,
    },
    securityNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 16,
      padding: 12,
      backgroundColor: theme.colors.palette.success100,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.palette.success200,
    },
    securityNoteText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.success500,
    },
    cvvLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    cvvHint: {
      fontSize: 10,
      fontWeight: '500',
      color: theme.colors.palette.neutral500,
    },
    // Fare Card
    fareCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: 20,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    fareRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
    },
    fareLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.palette.neutral700,
      flex: 1,
    },
    fareValue: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
      marginRight: 12,
    },
    fareAmount: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      minWidth: 80,
      textAlign: 'right',
    },
    fareDivider: {
      height: 1,
      backgroundColor: theme.colors.palette.neutral200,
      marginVertical: 12,
    },
    fareTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
    },
    fareTotalLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    fareTotalValue: {
      fontSize: 24,
      fontWeight: '900',
      color: theme.colors.palette.primary500,
    },
    // Passenger Summary
    passengerSummaryCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
    },
    passengerSummaryName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    passengerSummaryEmail: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
    },
    // Review Flight Card
    reviewFlightCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary200,
    },
    reviewFlightHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    reviewFlightLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      textTransform: 'uppercase',
    },
    reviewFlightRoute: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    reviewCity: {
      alignItems: 'center',
    },
    reviewCityCode: {
      fontSize: 24,
      fontWeight: '900',
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    reviewTime: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.palette.neutral600,
    },
    reviewFlightInfo: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.palette.overlay50,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.palette.neutral100,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 20,
      paddingHorizontal: 20,
      paddingBottom: 40,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    modalScroll: {
      maxHeight: 500,
    },
    useMyInfoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.palette.primary100,
      paddingVertical: 14,
      borderRadius: 12,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary200,
    },
    useMyInfoText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
    },
    orDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    orLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.palette.neutral300,
    },
    orText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.palette.neutral500,
      paddingHorizontal: 12,
      letterSpacing: 0.5,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.palette.neutral700,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: theme.colors.palette.neutral900,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
    },
    savePassengerButton: {
      backgroundColor: theme.colors.palette.primary500,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    savePassengerText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
  })
