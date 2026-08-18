import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'
import { Screen, Text, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native'

import { getAllBookings, getBookingWithDetails } from '@/db/queries'
import { useStores } from '@/models'

export default observer(function BoardingPassTab() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore, boardingPassStore } = useStores()
  const { trackScreenMount, trackClick } = useInteractionTracking(
    'boardingpass',
    '/boardingpass',
  )
  const params = useLocalSearchParams()

  const currentUser = userStore?.user || null

  // Session restoration tracking
  const sessionRestoredRef = useRef(false)
  const lastSessionTimeStampRef = useRef<string | null>(null)
  const isLoadingRef = useRef(false)

  // Track screen mount on initial load
  useEffect(() => {
    trackScreenMount()
  }, [trackScreenMount])

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
      const rootStore = boardingPassStore.getRootStore?.() as any
      const sessionData = rootStore?.sessionStore?.getSession(
        currentSessionTimeStamp,
      )

      if (sessionData?.data) {
        // Mark session as restored to prevent multiple restoration
        sessionRestoredRef.current = true
      } else {
        // Boarding pass session data not found
        sessionRestoredRef.current = true // Mark as restored even if no data found
      }
    } else if (currentSessionTimeStamp && sessionRestoredRef.current) {
      // Session already restored, skipping restoration
    } else {
      // No sessionTimeStamp parameter found
    }
  }, [params?.sessionTimeStamp, boardingPassStore])

  const loadCheckedInFlights = useCallback(async () => {
    if (!currentUser?.id) return

    // Prevent concurrent loads
    if (isLoadingRef.current) return
    isLoadingRef.current = true

    try {
      boardingPassStore.setLoading(true)

      const bookings = await getAllBookings(currentUser.id)

      // Get all checked-in flights grouped by flight

      const flightMap = new Map<string, any>()

      for (const booking of bookings) {
        const details = await getBookingWithDetails(booking.booking_id)
        if (!details) continue

        const passengers = details.passengers || []
        const bookingFlights = details.bookingFlights || []
        passengers.forEach((passenger: any) => {
          passenger.seatAssignments?.forEach((seatAssignment: any) => {
            if (seatAssignment.check_in_status === 'checked_in') {
              const bookingFlight = bookingFlights.find(
                (bf: any) =>
                  bf.flight?.flight_id === seatAssignment.flight_id ||
                  bf.flight_id === seatAssignment.flight_id,
              )

              if (bookingFlight) {
                const flightKey = `${booking.booking_id}_${seatAssignment.flight_id}`

                if (!flightMap.has(flightKey)) {
                  flightMap.set(flightKey, {
                    booking,
                    bookingFlight,
                    flight: seatAssignment.flight,
                    flightId: seatAssignment.flight_id,
                    passengers: [],
                    id: flightKey,
                  })
                }

                flightMap.get(flightKey).passengers.push({
                  passenger,
                  seatAssignment,
                })
              }
            }
          })
        })
      }

      // Convert map to array and sort by departure time
      const checkedInList = Array.from(flightMap.values()).sort((a, b) => {
        const aTime = new Date(
          a.bookingFlight.departure_time || a.flight?.departure_time,
        ).getTime()
        const bTime = new Date(
          b.bookingFlight.departure_time || b.flight?.departure_time,
        ).getTime()
        return bTime - aTime
      })

      boardingPassStore.setCheckedInFlights(checkedInList)
    } catch (error) {
      console.error('Error loading checked-in flights:', error)
    } finally {
      boardingPassStore.setLoading(false)
      isLoadingRef.current = false
    }
  }, [currentUser?.id, boardingPassStore])

  // Track screen focus and refresh boarding passes
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'boardingpass',
        route: '/boardingpass',
        sessionTimeStamp: params?.sessionTimeStamp,
      })

      if (currentUser?.id) {
        loadCheckedInFlights()
      } else {
        // No user logged in, clear data and reset loading
        boardingPassStore.clearCheckedInFlights()
        boardingPassStore.setLoading(false)
      }

      return () => {
        getLatestInteraction()
      }
      // Intentionally omitting currentUser?.id and boardingPassStore to prevent infinite loop
      // They are captured via loadCheckedInFlights dependency
    }, [loadCheckedInFlights, params?.sessionTimeStamp]),
  )

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
    })
  }
  const renderFlightCard = ({ item }: { item: any }) => {
    const flightNumber =
      item.bookingFlight.flight_number || item.flight?.flight_number
    const origin = item.bookingFlight.origin || item.flight?.origin
    const destination =
      item.bookingFlight.destination || item.flight?.destination
    const departureTime =
      item.bookingFlight.departure_time || item.flight?.departure_time

    // Get all passenger names
    const allPassengers = item.passengers || []
    const passengerCount = allPassengers.length
    const displayPassengers = allPassengers.slice(0, 3)
    const hasMore = passengerCount > 3

    // Get all seat numbers
    const seatNumbers = allPassengers

      .map((p: any) => p.seatAssignment.seat_number)
      .join(', ')

    return (
      <TouchableOpacity
        style={styles.flightCard}
        onPress={() => {
          trackClick(`boarding_pass_${item.flightId}`)
          router.push({
            pathname: '/boarding-pass',
            params: {
              bookingId: item.booking.booking_id,
              flightId: item.flightId,
            },
          })
        }}
      >
        {/* Diagonal Split Header */}
        <View style={styles.cardHeaderDiagonal}>
          <View style={styles.headerLeftSection}>
            <View style={styles.headerIconRow}>
              <Ionicons
                name="airplane"
                size={18}
                color={theme.colors.palette.neutral100}
              />
              <Text style={styles.headerFlight}>{flightNumber}</Text>
            </View>
            <Text style={styles.headerSeat}>Seats: {seatNumbers}</Text>
          </View>
          <View style={styles.diagonalCut} />
          <View style={styles.headerRightSection}>
            <Text style={styles.headerReference}>
              {item.booking.booking_reference}
            </Text>
          </View>
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          {/* Left Column - Route & Passengers */}
          <View style={styles.leftColumn}>
            <View style={styles.routeInfo}>
              <Text style={styles.cityCode}>{origin}</Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={theme.colors.palette.neutral700}
              />
              <Text style={styles.cityCode}>{destination}</Text>
            </View>
            <View style={styles.passengersList}>
              <Text style={styles.passengersLabel}>Passengers:</Text>
              {displayPassengers.map((p: any, index: number) => (
                <Text key={index} style={styles.passengerName}>
                  {p.passenger.first_name} {p.passenger.last_name}
                </Text>
              ))}
              {hasMore && (
                <Text style={styles.morePassengers}>
                  +{passengerCount - 3} more
                </Text>
              )}
            </View>
          </View>

          {/* Vertical Divider */}
          <View style={styles.verticalDivider} />

          {/* Right Column - Details */}
          <View style={styles.rightColumn}>
            <View style={styles.detailItem}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>{formatDate(departureTime)}</Text>
            </View>
            <View style={styles.horizontalDivider} />
            <View style={styles.detailItem}>
              <Text style={styles.label}>Time</Text>
              <Text style={styles.value}>{formatTime(departureTime)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
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
        <View style={styles.headerContent}>
          <Ionicons
            name="qr-code"
            size={28}
            color={theme.colors.palette.neutral100}
          />
          <Text style={styles.headerTitle}>Boarding Pass</Text>
        </View>
      </View>

      {/* Flights List */}
      {boardingPassStore.loading ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="hourglass-outline"
            size={48}
            color={theme.colors.palette.neutral400}
          />
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : boardingPassStore.hasFlights ? (
        <FlatList
          data={boardingPassStore.checkedInFlights.slice()}
          renderItem={renderFlightCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons
            name="qr-code-outline"
            size={64}
            color={theme.colors.palette.neutral400}
          />
          <Text style={styles.emptyText}>No Boarding Passes</Text>
          <Text style={styles.emptySubtext}>
            Check in to your flights to view boarding passes here
          </Text>
        </View>
      )}
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
      justifyContent: 'space-between',
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 6,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerTitle: {
      fontSize: 24,
      color: theme.colors.palette.neutral100,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
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
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      marginBottom: 24,
    },
    // Flight Card Styles
    flightCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      marginBottom: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      overflow: 'hidden',
    },
    cardHeaderDiagonal: {
      flexDirection: 'row',
      height: 70,
      position: 'relative',
      overflow: 'hidden',
    },
    headerLeftSection: {
      flex: 1.5,
      backgroundColor: theme.colors.palette.secondary500,
      justifyContent: 'center',
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
    headerIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    headerFlight: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.palette.neutral100,
    },
    headerSeat: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      opacity: 0.9,
    },
    headerRightSection: {
      flex: 1,
      backgroundColor: theme.colors.palette.primary400,
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingRight: 20,
    },
    headerReference: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.palette.neutral100,
      letterSpacing: 1.5,
    },
    cardBody: {
      flexDirection: 'row',
      padding: 20,
      backgroundColor: theme.colors.palette.neutral100,
    },
    leftColumn: {
      flex: 2,
      justifyContent: 'space-between',
      paddingRight: 16,
    },
    routeInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      marginBottom: 12,
    },
    cityCode: {
      fontSize: 24,
      fontWeight: '900',
      color: theme.colors.palette.neutral900,
    },
    passengersList: {
      gap: 4,
    },
    passengersLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.palette.neutral500,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    passengerName: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
    morePassengers: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
      fontStyle: 'italic',
      marginTop: 2,
    },
    verticalDivider: {
      width: 1,
      borderLeftWidth: 1,
      borderLeftColor: theme.colors.palette.neutral300,
      borderStyle: 'dotted',
      marginHorizontal: 0,
    },
    rightColumn: {
      flex: 1,
      paddingLeft: 16,
      justifyContent: 'center',
    },
    detailItem: {
      flex: 1,
    },
    label: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.palette.neutral500,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    value: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    horizontalDivider: {
      height: 1,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral300,
      borderStyle: 'dotted',
      marginVertical: 12,
    },
  })
