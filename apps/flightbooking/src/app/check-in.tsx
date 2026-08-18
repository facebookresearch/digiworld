import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'
import { Screen, Text, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useRef, useMemo } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  View,
} from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

import { mutations } from '@/db/mutations'
import {
  getBookingWithDetails,
  getPassengersByBooking,
  getFlightById,
} from '@/db/queries'
import { useStores } from '@/models'
import { canCheckInFlight } from '@/utils/flightValidation'

// Aircraft seating layout (simplified)
const AIRCRAFT_LAYOUT = {
  businessRows: 5,
  economyRows: 10,
  seatsPerRow: ['A', 'B', 'C', 'D'],
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const LEFT_PANEL_LOCATIONS = [0, 1]

export default observer(function CheckInScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  // Enhanced gradient color schemes (using theme)
  const HEADER_GRADIENT = [
    theme.colors.palette.secondary500,
    theme.colors.palette.secondary500,
  ]
  const LEFT_PANEL_GRADIENT = [
    theme.colors.palette.secondary100,
    theme.colors.palette.primary100,
  ]
  const PASSENGER_BAR_GRADIENT = LEFT_PANEL_GRADIENT
  const RIGHT_PANEL_GRADIENT = [
    theme.colors.palette.neutral100,
    theme.colors.palette.primary100,
  ]
  const CARD_GRADIENT = [
    theme.colors.palette.secondary500,
    theme.colors.palette.primary500,
  ]
  const BUTTON_GRADIENT = [
    theme.colors.palette.secondary500,
    theme.colors.palette.primary500,
  ]
  const params = useLocalSearchParams()
  const bookingId = params.bookingId as string
  const flightIdParam = params.flightId as string | undefined

  const { checkInStore } = useStores()
  const { trackScreenMount, trackClick } = useInteractionTracking(
    'check-in',
    '/check-in',
  )

  // Session restoration tracking
  const sessionRestoredRef = useRef(false)
  const lastSessionTimeStampRef = useRef<string | null>(null)

  // Track screen mount
  useEffect(() => {
    trackScreenMount()
  }, [trackScreenMount])

  // Track screen focus
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'check-in',
        route: '/check-in',
        bookingId,
        currentPassengerIndex: checkInStore.currentPassengerIndex,
        currentFlightIndex: checkInStore.currentFlightIndex,
        sessionTimeStamp: params?.sessionTimeStamp,
      })

      return () => {
        getLatestInteraction()
      }
    }, [
      trackScreenMount,
      bookingId,
      checkInStore.currentPassengerIndex,
      checkInStore.currentFlightIndex,
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
      const rootStore = checkInStore.getRootStore?.() as any
      const sessionData = rootStore?.sessionStore?.getSession(
        currentSessionTimeStamp,
      )

      if (sessionData?.data) {
        // Mark session as restored to prevent multiple restoration
        sessionRestoredRef.current = true
      } else {
        // Check-in session data not found
        sessionRestoredRef.current = true // Mark as restored even if no data found
      }
    } else if (currentSessionTimeStamp && sessionRestoredRef.current) {
      // Session already restored, skipping restoration
    } else {
      // No sessionTimeStamp parameter found
    }
  }, [params?.sessionTimeStamp, checkInStore])

  useEffect(() => {
    if (bookingId) {
      // Reset store if booking ID changed
      if (checkInStore.lastBookingId !== bookingId) {
        checkInStore.resetCheckIn()
        checkInStore.setLastBookingId(bookingId)
      }
      loadBookingData()
    }
  }, [bookingId])

  const loadBookingData = async () => {
    try {
      checkInStore.setLoading(true)
      const details = await getBookingWithDetails(bookingId)
      const passengersData = await getPassengersByBooking(bookingId)

      // Validate check-in eligibility for current flight
      if (details?.bookingFlights && details.bookingFlights.length > 0) {
        const currentFlightData =
          details.bookingFlights[
            flightIdParam
              ? details.bookingFlights.findIndex(
                  (bf: any) => bf.flight?.flight_id === flightIdParam,
                )
              : 0
          ]

        if (currentFlightData?.departure_time) {
          const validation = canCheckInFlight(currentFlightData.departure_time)
          if (!validation.isValid) {
            router.replace({
              pathname: '/flight-unavailable',
              params: {
                reason: validation.reason,
                action: 'checkin',
                timeUntil: validation.timeUntilDeparture?.toString(),
                departureTime: validation.departureTime,
              },
            })
            return
          }
        }
      }

      // Enhance booking flights with airline names
      if (details?.bookingFlights) {
        for (const bookingFlight of details.bookingFlights) {
          if (bookingFlight.flight?.flight_id) {
            try {
              const flightData = await getFlightById(
                bookingFlight.flight.flight_id,
              )
              if (flightData?.airline?.name) {
                ;(bookingFlight as any).airlineName = flightData.airline.name
              }
            } catch (error) {
              console.error('Error fetching airline name:', error)
            }
          }
        }
      }

      checkInStore.setBookingData(details)
      checkInStore.setPassengersData(passengersData)

      // If flightId is provided, set the current flight index
      if (flightIdParam && details?.bookingFlights) {
        const flightIndex = details.bookingFlights.findIndex(
          (bf: any) => bf.flight?.flight_id === flightIdParam,
        )
        if (flightIndex !== -1) {
          checkInStore.setCurrentFlightIndex(flightIndex)
        }
      }

      // Load occupied seats for each flight
      const occupied: Record<string, string[]> = {}
      if (details?.bookingFlights) {
        for (const bookingFlight of details.bookingFlights) {
          if (bookingFlight.flight?.flight_id) {
            const flightId = bookingFlight.flight.flight_id
            // Get all passengers' seat assignments for this flight
            const allPassengers = await getPassengersByBooking(bookingId)
            const flightSeats = allPassengers
              .flatMap((p: any) => p.seatAssignments || [])
              .filter((sa: any) => sa.flight_id === flightId)
              .map((sa: any) => sa.seat_number)

            // Add random occupied seats (30% of total seats)
            const totalSeats =
              (AIRCRAFT_LAYOUT.businessRows + AIRCRAFT_LAYOUT.economyRows) *
              AIRCRAFT_LAYOUT.seatsPerRow.length
            const randomSeatsCount = Math.floor(totalSeats * 0.3)
            const randomSeats = new Set<string>(flightSeats)

            while (randomSeats.size < flightSeats.length + randomSeatsCount) {
              const randomRow =
                Math.floor(
                  Math.random() *
                    (AIRCRAFT_LAYOUT.businessRows +
                      AIRCRAFT_LAYOUT.economyRows),
                ) + 1
              const randomSeat =
                AIRCRAFT_LAYOUT.seatsPerRow[
                  Math.floor(Math.random() * AIRCRAFT_LAYOUT.seatsPerRow.length)
                ]
              randomSeats.add(`${randomRow}${randomSeat}`)
            }

            occupied[flightId] = Array.from(randomSeats)
          }
        }
      }
      checkInStore.setOccupiedSeats(occupied)

      // Pre-fill selected seats if already assigned
      const preSelected: Record<string, string> = {}
      passengersData.forEach((passenger: any) => {
        if (passenger.seatAssignments && passenger.seatAssignments.length > 0) {
          passenger.seatAssignments.forEach((sa: any) => {
            const key = `${passenger.passenger_id}_${sa.flight_id}`
            preSelected[key] = sa.seat_number
          })
        }
      })
      checkInStore.setSelectedSeats(preSelected)
    } catch (error) {
      console.error('Error loading booking data:', error)
      Alert.alert('Error', 'Failed to load booking details')
    } finally {
      checkInStore.setLoading(false)
    }
  }

  const handleSeatSelect = (seatNumber: string, flightId: string) => {
    trackClick(`select_seat_${seatNumber}`)

    const currentPassenger = checkInStore.passengers[
      checkInStore.currentPassengerIndex
    ] as any
    if (!currentPassenger) return

    const key = `${currentPassenger.passenger_id}_${flightId}`
    const selectedSeats = checkInStore.selectedSeats as Record<string, string>

    // Check if another passenger in this booking has selected this seat
    const seatTakenByOtherPassenger = Object.keys(selectedSeats).find(
      k => selectedSeats[k] === seatNumber && k.includes(flightId) && k !== key,
    )

    if (seatTakenByOtherPassenger) {
      // Find which passenger has this seat
      const otherPassengerId = seatTakenByOtherPassenger.split('_')[0]
      const otherPassenger = (checkInStore.passengers as any[]).find(
        p => p.passenger_id === otherPassengerId,
      )
      const passengerName = otherPassenger
        ? `${otherPassenger.first_name}`
        : 'another passenger'

      Alert.alert(
        'Seat Already Selected',
        `This seat has been selected by ${passengerName}.`,
      )
      return
    }

    // Check if seat is already occupied in the database
    const occupiedSeats = checkInStore.occupiedSeats as Record<string, string[]>
    const currentlyOccupied = occupiedSeats[flightId] || []
    if (currentlyOccupied.includes(seatNumber)) {
      Alert.alert('Seat Unavailable', 'This seat is already taken.')
      return
    }

    checkInStore.updateSelectedSeat(key, seatNumber)

    // Auto-advance to next passenger without a seat
    const passengers = checkInStore.passengers as any[]
    const nextPassengerIndex = passengers.findIndex((p: any, index: number) => {
      if (index <= checkInStore.currentPassengerIndex) return false
      const passengerKey = `${p.passenger_id}_${flightId}`
      return !selectedSeats[passengerKey]
    })

    if (nextPassengerIndex !== -1) {
      checkInStore.setCurrentPassengerIndex(nextPassengerIndex)
    }
  }

  const handleCompleteCheckIn = async () => {
    trackClick('complete_check_in')

    try {
      const currentFlightId = checkInStore.currentFlight?.flight?.flight_id
      if (!currentFlightId) return

      const passengers = checkInStore.passengers as any[]
      const selectedSeats = checkInStore.selectedSeats as Record<string, string>

      // Validate all passengers have seats for the current flight
      const requiredSeats = passengers.length
      const assignedSeats = passengers.filter(
        p => selectedSeats[`${p.passenger_id}_${currentFlightId}`],
      ).length

      if (assignedSeats < requiredSeats) {
        Alert.alert(
          'Incomplete Selection',
          'Please select seats for all passengers on this flight.',
        )
        return
      }

      checkInStore.setProcessing(true)

      // Assign seats and check in for current flight only
      for (const passenger of passengers) {
        const key = `${passenger.passenger_id}_${currentFlightId}`
        const seatNumber = selectedSeats[key]

        if (seatNumber) {
          await mutations.checkInPassengerForFlight(
            passenger.passenger_id,
            currentFlightId,
            seatNumber,
          )
        }
      }

      // Check if all flights are checked in now
      const booking = checkInStore.booking as any
      const allFlightsCheckedIn = booking.bookingFlights?.every((bf: any) =>
        passengers.every(
          p => selectedSeats[`${p.passenger_id}_${bf.flight?.flight_id}`],
        ),
      )

      if (allFlightsCheckedIn) {
        Alert.alert(
          'Check-In Complete! ✈️',
          'All passengers have been checked in for all flights.',
          [
            {
              text: 'View Boarding Pass',
              onPress: () => {
                checkInStore.resetCheckIn()
                router.replace({
                  pathname: '/boarding-pass',
                  params: { bookingId },
                })
              },
            },
          ],
        )
      } else {
        Alert.alert(
          'Flight Check-In Complete! ✈️',
          'Check-in successful for this flight. You can check in for other flights from booking details.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.back()
              },
            },
          ],
        )
      }
    } catch (error) {
      console.error('Error completing check-in:', error)
      Alert.alert('Error', 'Failed to complete check-in. Please try again.')
    } finally {
      checkInStore.setProcessing(false)
    }
  }

  const renderSeatMap = (flightId: string) => {
    const currentPassenger = checkInStore.currentPassenger as any
    if (!currentPassenger) return null

    const occupiedSeats = checkInStore.occupiedSeats as Record<string, string[]>
    const selectedSeats = checkInStore.selectedSeats as Record<string, string>
    const currentlyOccupied = occupiedSeats[flightId] || []

    const renderSeatRow = (
      rowNumber: number,
      _seatClass: 'business' | 'economy',
    ) => {
      return (
        <View key={rowNumber} style={styles.seatRow}>
          {/* Left side seats (A, B) */}
          <View style={styles.seatGroup}>
            {AIRCRAFT_LAYOUT.seatsPerRow.slice(0, 2).map(letter => {
              const seatNumber = `${rowNumber}${letter}`
              const key = `${currentPassenger.passenger_id}_${flightId}`
              const isSelected = selectedSeats[key] === seatNumber
              const isOccupied = currentlyOccupied.includes(seatNumber)

              const selectedByOther = !!Object.keys(selectedSeats).find(
                k =>
                  selectedSeats[k] === seatNumber &&
                  k.includes(flightId) &&
                  k !== key,
              )

              return (
                <TouchableOpacity
                  key={seatNumber}
                  style={[
                    styles.seat,
                    isSelected && styles.selectedSeat,
                    selectedByOther && styles.selectedByOtherSeat,
                    isOccupied &&
                      !isSelected &&
                      !selectedByOther &&
                      styles.occupiedSeat,
                  ]}
                  onPress={() => handleSeatSelect(seatNumber, flightId)}
                  disabled={isOccupied || selectedByOther}
                >
                  <Text
                    style={
                      (isSelected || isOccupied || selectedByOther
                        ? [styles.seatText, styles.seatTextOccupied]
                        : styles.seatText) as TextStyle
                    }
                  >
                    {letter}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Row Number in Middle */}
          <Text style={styles.rowNumber}>{rowNumber}</Text>

          {/* Right side seats (C, D) */}
          <View style={styles.seatGroup}>
            {AIRCRAFT_LAYOUT.seatsPerRow.slice(2, 4).map(letter => {
              const seatNumber = `${rowNumber}${letter}`
              const key = `${currentPassenger.passenger_id}_${flightId}`
              const isSelected = selectedSeats[key] === seatNumber
              const isOccupied = currentlyOccupied.includes(seatNumber)

              const selectedByOther = !!Object.keys(selectedSeats).find(
                k =>
                  selectedSeats[k] === seatNumber &&
                  k.includes(flightId) &&
                  k !== key,
              )

              return (
                <TouchableOpacity
                  key={seatNumber}
                  style={[
                    styles.seat,
                    isSelected && styles.selectedSeat,
                    selectedByOther && styles.selectedByOtherSeat,
                    isOccupied &&
                      !isSelected &&
                      !selectedByOther &&
                      styles.occupiedSeat,
                  ]}
                  onPress={() => handleSeatSelect(seatNumber, flightId)}
                  disabled={isOccupied || selectedByOther}
                >
                  <Text
                    style={
                      (isSelected || isOccupied || selectedByOther
                        ? [styles.seatText, styles.seatTextOccupied]
                        : styles.seatText) as TextStyle
                    }
                  >
                    {letter}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )
    }

    return (
      <View style={styles.seatMapContainer}>
        {/* Airplane Cabin */}
        <View style={styles.airplaneCabin}>
          {/* Front of plane indicator */}
          <View style={styles.planeFront}>
            {[...Array(5)].map((_, i) => (
              <View key={i} style={styles.planeFrontSegment} />
            ))}
          </View>

          <ScrollView
            style={styles.seatMapScroll}
            contentContainerStyle={styles.seatMapScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Business Class */}
            <Text style={styles.classLabel}>BUSINESS CLASS</Text>
            {Array.from({ length: AIRCRAFT_LAYOUT.businessRows }, (_, i) =>
              renderSeatRow(i + 1, 'business'),
            )}

            {/* Economy Class */}
            <Text style={styles.economyClassLabel}>ECONOMY CLASS</Text>
            {Array.from({ length: AIRCRAFT_LAYOUT.economyRows }, (_, i) =>
              renderSeatRow(i + 6, 'economy'),
            )}

            {/* Tail Section */}
            <View style={styles.planeTail}>
              <View style={styles.planeTailWing} />
            </View>
          </ScrollView>
        </View>
      </View>
    )
  }

  if (checkInStore.loading) {
    return (
      <Screen
        preset="fixed"
        safeAreaEdges={['top']}
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              trackClick('back_button_loading')
              checkInStore.resetCheckIn()
              router.back()
            }}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Check-In</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.primary500}
          />
          <Text style={styles.loadingText}>Loading check-in...</Text>
        </View>
      </Screen>
    )
  }

  if (!checkInStore.hasBooking || !checkInStore.hasPassengers) {
    return (
      <Screen
        preset="fixed"
        safeAreaEdges={['top']}
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              trackClick('back_button_empty')
              checkInStore.resetCheckIn()
              router.back()
            }}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Check-In</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={theme.colors.palette.angry500}
          />
          <Text style={styles.emptyText}>Booking Not Found</Text>
        </View>
      </Screen>
    )
  }

  const passengers = checkInStore.passengers as any[]
  const currentFlight = checkInStore.currentFlight as any
  const selectedSeats = checkInStore.selectedSeats as Record<string, string>
  const booking = checkInStore.booking as any

  // Calculate selected seats for display
  const getSelectedSeatsForFlight = () => {
    if (!currentFlight) return []
    return passengers
      .map(
        (p: any) =>
          selectedSeats[`${p.passenger_id}_${currentFlight.flight?.flight_id}`],
      )
      .filter(Boolean)
  }

  // Check if all passengers have selected seats
  const allSeatsSelected = () => {
    if (!currentFlight || passengers.length === 0) return false
    return passengers.every(
      (p: any) =>
        selectedSeats[`${p.passenger_id}_${currentFlight.flight?.flight_id}`],
    )
  }

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={['top']}
      contentContainerStyle={styles.container}
    >
      {/* Header */}
      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            trackClick('back_button')
            checkInStore.resetCheckIn()
            router.back()
          }}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.palette.neutral100}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SELECT SEATS</Text>
        <View style={styles.headerPlaceholder} />
      </LinearGradient>

      {/* Passenger Selection - Full Width */}
      <LinearGradient
        colors={PASSENGER_BAR_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fullWidthPassengerSection}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.fullWidthPassengerCards}
        >
          {passengers.map((passenger: any, index: number) => {
            const hasSelectedSeat = currentFlight?.flight?.flight_id
              ? !!selectedSeats[
                  `${passenger.passenger_id}_${currentFlight.flight.flight_id}`
                ]
              : false

            return (
              <TouchableOpacity
                key={passenger.passenger_id}
                style={[
                  styles.fullWidthPassengerCard,
                  checkInStore.currentPassengerIndex === index &&
                    styles.activeFullWidthPassengerCard,
                ]}
                onPress={() => {
                  trackClick(`select_passenger_${index}`)
                  checkInStore.setCurrentPassengerIndex(index)
                }}
              >
                <Text style={styles.fullWidthPassengerName}>
                  {passenger.first_name} {passenger.last_name}
                </Text>
                {hasSelectedSeat && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={theme.colors.palette.primary500}
                  />
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </LinearGradient>

      {/* Main Content - Split Layout */}
      <View style={styles.splitContainer}>
        {/* Left Panel - Flight Details & Summary */}
        <LinearGradient
          colors={LEFT_PANEL_GRADIENT}
          locations={LEFT_PANEL_LOCATIONS}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.leftPanel}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.leftPanelContent}
          >
            {/* Flight Details */}
            {currentFlight && (
              <LinearGradient
                colors={CARD_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.flightDetailsSection}
              >
                <Text style={styles.airlineName}>
                  {(currentFlight as any).airlineName ||
                    (currentFlight as any).flight?.airline?.name ||
                    currentFlight.airline_code ||
                    'MAGNUM AIR'}
                </Text>
                <Text style={styles.flightNumber}>
                  {currentFlight.flight_number || currentFlight.airline_code}
                </Text>

                {/* Route */}
                <View style={styles.routeContainer}>
                  <View style={styles.citySection}>
                    {currentFlight.origin
                      .split('')
                      .map((letter: string, index: number) => (
                        <Text key={index} style={styles.cityCodeWhite}>
                          {letter}
                        </Text>
                      ))}
                  </View>

                  <Ionicons
                    name="airplane"
                    size={16}
                    color={theme.colors.palette.primary500}
                  />

                  <View style={styles.citySection}>
                    {currentFlight.destination
                      .split('')
                      .map((letter: string, index: number) => (
                        <Text key={index} style={styles.cityCodeWhite}>
                          {letter}
                        </Text>
                      ))}
                  </View>
                </View>
              </LinearGradient>
            )}

            {/* Departure & Arrival Times */}
            {currentFlight && (
              <LinearGradient
                colors={CARD_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.flightTimeCard}
              >
                <Text style={styles.flightTimeValue}>
                  {currentFlight.departure_time
                    ? new Date(currentFlight.departure_time).toLocaleTimeString(
                        'en-US',
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        },
                      )
                    : '--:--'}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={theme.colors.palette.primary500}
                />
                <Text style={styles.flightTimeValue}>
                  {currentFlight.arrival_time
                    ? new Date(currentFlight.arrival_time).toLocaleTimeString(
                        'en-US',
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        },
                      )
                    : '--:--'}
                </Text>
              </LinearGradient>
            )}

            {/* Summary Section */}
            <LinearGradient
              colors={CARD_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summarySection}
            >
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Selected Seats</Text>
                <Text style={styles.summaryValue}>
                  {getSelectedSeatsForFlight().join(', ') || 'None'}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Price</Text>
                <Text style={styles.summaryValue}>
                  ${booking?.total_price?.toFixed(2) || '0.00'}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Class</Text>
                <Text style={styles.summaryValue}>Economy</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Passengers</Text>
                <Text style={styles.summaryValue}>{passengers.length}</Text>
              </View>
            </LinearGradient>
          </ScrollView>
        </LinearGradient>

        {/* Right Panel - Seat Map */}
        <LinearGradient
          colors={RIGHT_PANEL_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.rightPanel}
        >
          {currentFlight && renderSeatMap(currentFlight.flight?.flight_id)}
        </LinearGradient>
      </View>

      {/* Bottom Button - Show only when all seats selected */}
      {allSeatsSelected() && (
        <LinearGradient
          colors={BUTTON_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.completeButton,
            checkInStore.processing && styles.disabledButton,
          ]}
        >
          <TouchableOpacity
            style={styles.completeButtonInner}
            onPress={handleCompleteCheckIn}
            disabled={checkInStore.processing}
            activeOpacity={0.8}
          >
            {checkInStore.processing ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.palette.neutral100}
              />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={theme.colors.palette.neutral100}
                />
                <Text style={styles.completeButtonText}>Complete Check-In</Text>
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>
      )}
    </Screen>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.palette.primary100,
    },
    header: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      padding: 8,
      width: 40,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      color: theme.colors.palette.neutral100,
      letterSpacing: 2,
      flex: 1,
      textAlign: 'center',
    },
    headerPlaceholder: {
      width: 40,
    },
    // Full Width Passenger Section
    fullWidthPassengerSection: {
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    fullWidthSectionLabel: {
      fontSize: 11,
      color: theme.colors.palette.primary600,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontFamily: 'Poppins',
    },
    fullWidthPassengerCards: {
      gap: 10,
    },
    fullWidthPassengerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.colors.palette.neutral100,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary200,
      minWidth: 150,
      shadowColor: theme.colors.palette.primary600,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    activeFullWidthPassengerCard: {
      backgroundColor: theme.colors.palette.primary100,
      borderColor: theme.colors.palette.primary500,
      borderWidth: 1.5,
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 5,
    },
    fullWidthPassengerName: {
      fontSize: 13,
      color: theme.colors.palette.primary600,
      fontFamily: 'Poppins',
    },
    splitContainer: {
      flex: 1,
      backgroundColor: theme.colors.palette.primary100,
      flexDirection: 'row',
    },
    leftPanel: {
      width: SCREEN_WIDTH * 0.35,
      paddingTop: 20,

      overflow: 'hidden',
    },
    leftPanelContent: {
      paddingBottom: 20,
    },
    rightPanel: {
      flex: 1,
      paddingVertical: 15,
      paddingHorizontal: 15,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.palette.neutral700,
      marginTop: 16,
    },
    // Flight Details Section
    flightDetailsSection: {
      marginHorizontal: 8,
      marginBottom: 15,
      paddingHorizontal: 18,
      paddingVertical: 18,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.primary600,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    airlineName: {
      fontSize: 13,
      color: theme.colors.palette.neutral100,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    flightNumber: {
      fontSize: 12,
      color: theme.colors.palette.neutral100,
      marginBottom: 10,
      fontFamily: 'Poppins',
    },
    routeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    citySection: {
      flex: 1,
      alignItems: 'center',
    },
    cityCodeWhite: {
      fontSize: 20,
      color: theme.colors.palette.neutral100,
      marginBottom: 4,
      fontFamily: 'Poppins',
    },
    // Flight Time Card
    flightTimeCard: {
      marginHorizontal: 8,
      marginBottom: 15,
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderRadius: 16,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      shadowColor: theme.colors.palette.primary600,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    flightTimeValue: {
      fontSize: 16,
      color: theme.colors.palette.neutral100,
      fontFamily: 'Poppins',
    },
    // Summary Section
    summarySection: {
      marginHorizontal: 8,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    summaryRow: {
      marginBottom: 10,
    },
    summaryLabel: {
      fontSize: 11,
      color: theme.colors.palette.neutral100,
      marginBottom: 3,
      fontFamily: 'Poppins',
    },
    summaryValue: {
      fontSize: 13,
      color: theme.colors.palette.neutral100,
      fontFamily: 'Poppins',
    },
    // Seat Map
    seatMapContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
    },
    airplaneCabin: {
      backgroundColor: theme.colors.palette.neutral100,
      borderTopLeftRadius: 100,
      borderTopRightRadius: 100,
      borderBottomLeftRadius: 40,
      borderBottomRightRadius: 40,
      paddingTop: 35,
      paddingBottom: 20,
      paddingHorizontal: 18,
      width: '96%',
      height: '96%',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 8,
    },
    planeFront: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 3,
      marginBottom: 25,
    },
    planeFrontSegment: {
      width: 18,
      height: 10,
      backgroundColor: theme.colors.palette.neutral400,
      borderRadius: 5,
    },
    seatMapScroll: {
      flex: 1,
      paddingHorizontal: 5,
    },
    seatMapScrollContent: {
      paddingBottom: 16,
    },
    planeTail: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 30,
      marginBottom: 20,
    },
    planeTailWing: {
      width: 60,
      height: 30,
      backgroundColor: theme.colors.palette.primary200,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
    },
    classLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      textAlign: 'center',
      marginBottom: 16,
      marginTop: 5,
      letterSpacing: 1.5,
      fontFamily: 'Poppins',
    },
    economyClassLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      textAlign: 'center',
      marginBottom: 16,
      marginTop: 24,
      letterSpacing: 1.5,
      fontFamily: 'Poppins',
    },
    seatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    seatGroup: {
      flexDirection: 'row',
    },
    rowNumber: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.palette.neutral500,
      minWidth: 20,
      textAlign: 'center',
      fontFamily: 'Poppins',
    },
    seat: {
      width: 36,
      height: 36,
      borderRadius: 7,
      backgroundColor: theme.colors.palette.neutral100,
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral400,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 2,
    },
    selectedSeat: {
      backgroundColor: theme.colors.palette.secondary500,
      borderColor: theme.colors.palette.secondary500,
      borderWidth: 3,
      shadowColor: theme.colors.palette.secondary500,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 8,
      elevation: 8,
      transform: [{ scale: 1.1 }],
    },
    selectedByOtherSeat: {
      backgroundColor: theme.colors.palette.primary500,
      borderColor: theme.colors.palette.primary500,
      borderWidth: 2,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
      elevation: 6,
    },
    occupiedSeat: {
      backgroundColor: theme.colors.palette.neutral600,
      borderColor: theme.colors.palette.neutral600,
    },
    seatText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.palette.neutral600,
      fontFamily: 'Poppins',
    },
    seatTextOccupied: {
      color: theme.colors.palette.neutral100,
    },
    // Complete Check-In Button
    completeButton: {
      marginHorizontal: 20,
      marginVertical: 20,
      borderRadius: 25,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    completeButtonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
    },
    disabledButton: {
      opacity: 0.6,
    },
    completeButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      fontFamily: 'Poppins',
      letterSpacing: 0.5,
    },
  })
