import { Text, Screen, useAppTheme, type Theme } from '@andojo/shared-theme'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useMemo } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { getBookingWithDetails } from '@/db/queries'
import { useStores } from '@/models'

export default observer(function BoardingPassScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const params = useLocalSearchParams()
  const bookingId = params.bookingId as string
  const flightId = params.flightId as string | undefined

  const { boardingPassScreenStore } = useStores()
  const { trackScreenMount, trackClick } = useInteractionTracking(
    'boarding-pass',
    '/boarding-pass',
  )

  // Session restoration tracking
  const sessionRestoredRef = useRef(false)
  const lastSessionTimeStampRef = useRef<string | null>(null)

  // Track screen mount
  useEffect(() => {
    trackScreenMount()
  }, [])

  // Handle session restoration
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
      const rootStore = boardingPassScreenStore.getRootStore?.() as any
      const sessionData = rootStore?.sessionStore?.getSession(
        currentSessionTimeStamp,
      )

      if (sessionData?.data) {
        sessionRestoredRef.current = true
      } else {
        sessionRestoredRef.current = true
      }
    }
  }, [params?.sessionTimeStamp, boardingPassScreenStore])

  const loadBookingData = async () => {
    try {
      boardingPassScreenStore.setLoading(true)
      const details = await getBookingWithDetails(bookingId)
      boardingPassScreenStore.setBookingData(details)

      // Use passengers from booking details (which includes seat assignments)
      const passengersWithSeats = details?.passengers || []
      boardingPassScreenStore.setPassengersData(passengersWithSeats)

      // Create boarding pass items (one per passenger per flight)
      // Only include if checked in for that specific flight

      const passes: any[] = []

      console.log('Passengers with seats:', passengersWithSeats.length)
      console.log('Booking flights:', details?.bookingFlights?.length)
      console.log('Requested flightId:', flightId)
      passengersWithSeats.forEach((passenger: any) => {
        console.log(
          `Passenger ${passenger.passenger_id} seat assignments:`,
          passenger.seatAssignments?.length,
        )
        details.bookingFlights?.forEach((bookingFlight: any) => {
          const currentFlightId =
            bookingFlight.flight?.flight_id || bookingFlight.flight_id

          // If flightId is specified, only process that specific flight
          if (flightId && currentFlightId !== flightId) {
            return
          }

          // Check if this passenger has checked in for this specific flight

          const seatAssignment = passenger.seatAssignments?.find((sa: any) => {
            console.log(
              `Comparing: sa.flight_id=${sa.flight_id} with currentFlightId=${currentFlightId}, check_in_status=${sa.check_in_status}`,
            )
            return sa.flight_id === currentFlightId
          })

          if (
            seatAssignment &&
            seatAssignment.check_in_status === 'checked_in'
          ) {
            console.log('Found checked-in boarding pass!')
            passes.push({
              passenger,
              bookingFlight,
              seatAssignment,
              id: `${passenger.passenger_id}_${currentFlightId}`,
            })
          }
        })
      })

      console.log('Total boarding passes found:', passes.length)
      boardingPassScreenStore.setBoardingPassesData(passes)
    } catch (error) {
      console.error('Error loading boarding pass data:', error)
    } finally {
      boardingPassScreenStore.setLoading(false)
    }
  }

  useEffect(() => {
    if (bookingId) {
      // Reset store if booking ID or flight ID changed
      if (
        boardingPassScreenStore.lastBookingId !== bookingId ||
        boardingPassScreenStore.lastFlightId !== flightId
      ) {
        boardingPassScreenStore.resetBoardingPass()
        boardingPassScreenStore.setLastBookingId(bookingId)
        boardingPassScreenStore.setLastFlightId(flightId || null)
      }
      loadBookingData()
    }
  }, [bookingId, flightId])

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
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  const renderBoardingPass = (passenger: any, bookingFlight: any) => {
    const seatAssignment = passenger.seatAssignments?.find(
      (sa: any) => sa.flight_id === bookingFlight.flight?.flight_id,
    )

    const qrData = JSON.stringify({
      bookingId: boardingPassScreenStore.booking?.booking_id,
      bookingReference: boardingPassScreenStore.booking?.booking_reference,
      passengerId: passenger.passenger_id,
      ticketNumber: passenger.ticket_number,
      flightId: bookingFlight.flight?.flight_id,
      flightNumber: bookingFlight.flight_number,
      origin: bookingFlight.origin,
      destination: bookingFlight.destination,
      departureTime: bookingFlight.departure_time,
      seatNumber: seatAssignment?.seat_number,
      checkInTime: passenger.check_in_time,
    })

    return (
      <View
        key={`${passenger.passenger_id}_${bookingFlight.flight?.flight_id}`}
        style={styles.boardingPass}
      >
        {/* Diagonal Split Header */}
        <View style={styles.passHeaderDiagonal}>
          <View style={styles.headerLeft}>
            <Ionicons
              name="airplane"
              size={24}
              color={theme.colors.palette.neutral100}
            />
            <Text style={styles.headerFlight}>
              {bookingFlight.flight_number}
            </Text>
          </View>
          <View style={styles.diagonalCut} />
          <View style={styles.headerRight}>
            <Text style={styles.headerBookingRef}>
              {boardingPassScreenStore.booking?.booking_reference}
            </Text>
          </View>
        </View>

        {/* Main Flight Route */}
        <View style={styles.routeSection}>
          <View style={styles.cityBlock}>
            <Text style={styles.cityLabel}>From</Text>
            <Text style={styles.cityCode}>{bookingFlight.origin}</Text>
            <Text style={styles.timeText}>
              {formatTime(bookingFlight.departure_time)}
            </Text>
          </View>

          <View style={styles.flightPath}>
            <View style={styles.pathLine} />
            <Ionicons
              name="airplane"
              size={20}
              color={theme.colors.palette.primary500}
              style={styles.pathIcon}
            />
          </View>

          <View style={styles.cityBlock}>
            <Text style={styles.cityLabel}>To</Text>
            <Text style={styles.cityCode}>{bookingFlight.destination}</Text>
            <Text style={styles.timeText}>
              {formatTime(bookingFlight.arrival_time)}
            </Text>
          </View>
        </View>

        {/* Flight Info */}
        <View style={styles.infoList}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Passenger</Text>
            <Text style={styles.infoValue}>
              {passenger.first_name} {passenger.last_name}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Seat</Text>
            <Text style={styles.infoValue}>
              {seatAssignment?.seat_number || 'N/A'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>
              {formatDate(bookingFlight.departure_time)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gate</Text>
            <Text style={styles.infoValue}>A12</Text>
          </View>
        </View>

        {/* QR Code */}
        <View style={styles.qrSection}>
          <QRCode value={qrData} size={120} />
        </View>

        {/* Barcode Simulation */}
        <View style={styles.barcodeSection}>
          <View style={styles.barcode}>
            {Array.from({ length: 40 }, (_, i) => {
              const width = i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1
              return <View key={i} style={[styles.barcodeLine, { width }]} />
            })}
          </View>
          <Text style={styles.barcodeText}>{passenger.ticket_number}</Text>
        </View>

        {/* Info Label at Bottom */}
        <View style={styles.bottomInfo}>
          <Ionicons
            name="information-circle"
            size={16}
            color={theme.colors.palette.secondary500}
          />
          <Text style={styles.bottomInfoText}>Show this at gate to board</Text>
        </View>
      </View>
    )
  }

  if (boardingPassScreenStore.loading) {
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
              router.back()
            }}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Boarding Pass</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.primary500}
          />
          <Text style={styles.loadingText}>Loading boarding pass...</Text>
        </View>
      </Screen>
    )
  }

  if (
    !boardingPassScreenStore.hasBooking ||
    boardingPassScreenStore.passengers.length === 0 ||
    !boardingPassScreenStore.hasBoardingPasses
  ) {
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
              router.back()
            }}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Boarding Pass</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={theme.colors.palette.angry500}
          />
          <Text style={styles.emptyText}>No Boarding Pass Available</Text>
          <Text style={styles.emptySubtext}>
            Please complete check-in first
          </Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={['top']}
      contentContainerStyle={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            trackClick('back_button')
            router.back()
          }}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.palette.neutral100}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Boarding Pass</Text>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => trackClick('share_button')}
        >
          <Ionicons
            name="share-outline"
            size={24}
            color={theme.colors.palette.neutral100}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Passenger Selector */}
        {boardingPassScreenStore.boardingPasses.length > 1 && (
          <View style={styles.passengerSelector}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.passengerChips}
            >
              {boardingPassScreenStore.boardingPasses.map(
                (pass: any, index: number) => (
                  <TouchableOpacity
                    key={pass.id}
                    style={[
                      styles.passengerChip,
                      boardingPassScreenStore.currentPassengerIndex === index &&
                        styles.activePassengerChip,
                    ]}
                    onPress={() => {
                      trackClick('select_passenger')
                      boardingPassScreenStore.setCurrentPassengerIndex(index)
                    }}
                  >
                    <View style={styles.passengerChipAvatar}>
                      <Text style={styles.passengerChipInitial}>
                        {pass.passenger.first_name.charAt(0)}
                      </Text>
                    </View>
                    <Text
                      style={
                        boardingPassScreenStore.currentPassengerIndex === index
                          ? styles.activePassengerChipText
                          : styles.passengerChipText
                      }
                    >
                      {pass.passenger.first_name}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </ScrollView>
          </View>
        )}

        {/* Boarding Pass */}
        <ScrollView
          style={styles.passContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {boardingPassScreenStore.currentBoardingPass &&
            renderBoardingPass(
              boardingPassScreenStore.currentBoardingPass.passenger,
              boardingPassScreenStore.currentBoardingPass.bookingFlight,
            )}
        </ScrollView>
      </View>
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
      paddingVertical: 16,
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
      color: theme.colors.palette.neutral100,
      flex: 1,
      textAlign: 'center',
    },
    headerPlaceholder: {
      width: 40,
    },
    shareButton: {
      padding: 8,
    },
    content: {
      flex: 1,
    },
    passengerSelector: {
      paddingVertical: 16,
      paddingLeft: 20,
      backgroundColor: theme.colors.palette.neutral100,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    passengerChips: {
      gap: 12,
      paddingRight: 20,
    },
    passengerChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.palette.neutral100,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral200,
    },
    activePassengerChip: {
      backgroundColor: theme.colors.palette.primary100,
      borderColor: theme.colors.palette.primary500,
    },
    passengerChipAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.palette.primary500,
      alignItems: 'center',
      justifyContent: 'center',
    },
    passengerChipInitial: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    passengerChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral700,
    },
    activePassengerChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
    },
    passContent: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingVertical: 20,
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
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      marginTop: 8,
      textAlign: 'center',
    },
    // Boarding Pass
    boardingPass: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 20,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
      marginHorizontal: 20,
      overflow: 'hidden',
    },
    passHeaderDiagonal: {
      flexDirection: 'row',
      height: 60,
      position: 'relative',
      overflow: 'hidden',
    },
    headerLeft: {
      flex: 1.5,
      backgroundColor: theme.colors.palette.secondary500,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingLeft: 20,
    },
    diagonalCut: {
      width: 50,
      backgroundColor: theme.colors.palette.secondary500,
      transform: [{ rotate: '45deg' }],
      position: 'absolute',
      left: '51%',

      height: 100,
      top: -15,
      borderRightWidth: 50,
      borderRightColor: theme.colors.palette.primary400,
    },
    headerRight: {
      flex: 1,
      backgroundColor: theme.colors.palette.primary400,
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingRight: 20,
    },
    headerFlight: {
      fontSize: 20,
      fontWeight: '900',
      color: theme.colors.palette.neutral100,
    },
    headerBookingRef: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.palette.neutral100,
      letterSpacing: 1.5,
    },
    // Route Section
    routeSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    cityBlock: {
      alignItems: 'center',
      flex: 1,
    },
    cityLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.palette.neutral500,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    cityCode: {
      fontSize: 28,
      fontWeight: '900',
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    timeText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral700,
    },
    flightPath: {
      flex: 1,
      alignItems: 'center',
      position: 'relative',
      marginHorizontal: 16,
    },
    pathLine: {
      width: '100%',
      height: 2,
      backgroundColor: theme.colors.palette.neutral300,
    },
    pathIcon: {
      position: 'absolute',
      backgroundColor: theme.colors.palette.neutral100,
      padding: 4,
      transform: [{ rotate: '45deg' }],
    },
    // Info List
    infoList: {
      paddingHorizontal: 20,
      marginBottom: 16,
      gap: 12,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
      borderStyle: 'dotted',
    },
    infoLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.neutral500,
      textTransform: 'uppercase',
    },
    infoValue: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    // QR Code
    qrSection: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    // Barcode
    barcodeSection: {
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 12,
      paddingHorizontal: 20,
      borderTopWidth: 2,
      borderTopColor: theme.colors.palette.neutral200,
      borderStyle: 'dashed',
    },
    barcode: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'center',
      height: 50,
      gap: 2,
      marginBottom: 8,
    },
    barcodeLine: {
      height: '100%',
      backgroundColor: theme.colors.palette.neutral900,
    },
    barcodeText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.palette.neutral600,
      letterSpacing: 2,
    },
    bottomInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingTop: 12,
      paddingBottom: 16,
      paddingHorizontal: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral200,
      marginTop: 12,
    },
    bottomInfoText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.palette.secondary500,
    },
  })
