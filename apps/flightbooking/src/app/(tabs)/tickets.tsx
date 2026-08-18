// Copyright (c) Meta Platforms, Inc. and affiliates.
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

export default observer(function TicketsTab() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore, ticketsStore } = useStores()
  const { trackScreenMount, trackClick } = useInteractionTracking(
    'tickets',
    '/tickets',
  )
  const params = useLocalSearchParams()

  const currentUser = userStore?.user || null

  // Session restoration tracking
  const sessionRestoredRef = useRef(false)
  const lastSessionTimeStampRef = useRef<string | null>(null)
  const isLoadingRef = useRef(false)

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
      const rootStore = ticketsStore.getRootStore?.() as any
      const sessionData = rootStore?.sessionStore?.getSession(
        currentSessionTimeStamp,
      )

      if (sessionData?.data) {
        // Mark session as restored to prevent multiple restoration
        sessionRestoredRef.current = true
      } else {
        // Tickets session data not found
        sessionRestoredRef.current = true // Mark as restored even if no data found
      }
    } else if (currentSessionTimeStamp && sessionRestoredRef.current) {
      // Session already restored, skipping restoration
    } else {
      // No sessionTimeStamp parameter found
    }
  }, [params?.sessionTimeStamp, ticketsStore])

  const loadBookings = useCallback(async () => {
    if (!currentUser?.id) return

    // Prevent concurrent loads
    if (isLoadingRef.current) return
    isLoadingRef.current = true

    try {
      ticketsStore.setLoading(true)

      const bookingsData = await getAllBookings(currentUser.id)

      // Fetch passenger count for each booking
      const bookingsWithPassengerCount = await Promise.all(
        bookingsData.map(async (booking: any) => {
          const details = await getBookingWithDetails(booking.booking_id)
          return {
            ...booking,
            passengerCount: details?.passengers?.length || 0,
          }
        }),
      )

      ticketsStore.setBookings(bookingsWithPassengerCount)
    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      ticketsStore.setLoading(false)
      isLoadingRef.current = false
    }
  }, [currentUser?.id, ticketsStore])

  // Track screen focus and refresh bookings
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        sessionTimeStamp: params?.sessionTimeStamp,
      })

      // Only reload if not already loading (prevents blocking navigation)
      if (currentUser?.id && !isLoadingRef.current) {
        loadBookings()
      } else if (!currentUser?.id) {
        // No user logged in, clear bookings and reset loading
        ticketsStore.clearBookings()
        ticketsStore.setLoading(false)
      }

      return () => {
        getLatestInteraction()
      }
    }, [currentUser?.id, loadBookings, params?.sessionTimeStamp, ticketsStore]),
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return theme.colors.palette.success500
      case 'pending':
        return theme.colors.palette.secondary500
      case 'completed':
        return theme.colors.palette.neutral600
      case 'cancelled':
        return theme.colors.palette.angry500
      default:
        return theme.colors.palette.neutral500
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleBookingPress = useCallback(
    (bookingId: string) => {
      console.log('bookingId', bookingId)
      router.push({
        pathname: '/booking-details',
        params: { bookingId },
      })
    },
    [trackClick],
  )

  const renderBookingCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => handleBookingPress(item.booking_id)}
      activeOpacity={0.7}
    >
      {/* Diagonal Split Header */}
      <View style={styles.cardHeaderDiagonal}>
        <View style={styles.headerLeftSection}>
          <Text style={styles.headerPrice}>
            ${item.total_price?.toFixed(2)}
          </Text>
        </View>
        <View style={styles.diagonalCut} />
        <View style={styles.headerRightSection}>
          <Text style={styles.headerReference}>{item.booking_reference}</Text>
        </View>
      </View>

      {/* Card Body */}
      <View style={styles.cardBody}>
        {/* Left Column */}
        <View style={styles.leftColumn}>
          <View style={styles.timeSection}>
            <Text style={styles.label}>Booked</Text>
            <Text style={styles.value}>{formatDate(item.booking_date)}</Text>
          </View>
          <View style={styles.iconContainer}>
            <Ionicons
              name="airplane"
              size={20}
              color={theme.colors.palette.neutral700}
              style={{ transform: [{ rotate: '360deg' }] }}
            />
          </View>
          <View style={styles.timeSection}>
            <Text style={styles.label}>Trip Type</Text>
            <Text style={styles.value}>
              {item.trip_type === 'round_trip' ? 'Round Trip' : 'One Way'}
            </Text>
          </View>
        </View>

        {/* Vertical Divider */}
        <View style={styles.verticalDivider} />

        {/* Right Column */}
        <View style={styles.rightColumn}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            >
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.detailRowTop}>
            <View style={styles.detailItem}>
              <Text style={styles.label}>Payment</Text>
              <Text
                style={{
                  ...styles.value,
                  color:
                    item.payment_status === 'paid'
                      ? theme.colors.palette.success500
                      : theme.colors.palette.secondary500,
                }}
              >
                {item.payment_status === 'paid' ? 'Paid' : 'Refunded'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.label}>Booking ID</Text>
              <Text style={styles.valueSmall}>
                {item.booking_id.slice(0, 8)}
              </Text>
            </View>
          </View>
          <View style={styles.horizontalDivider} />
          <View style={styles.detailRowBottom}>
            <View style={styles.detailItem}>
              <Text style={styles.label}>Passengers</Text>
              <Text style={styles.value}>
                {item.passengerCount || 0}{' '}
                {item.passengerCount === 1 ? 'Member' : 'Members'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )

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
            name="calendar"
            size={28}
            color={theme.colors.palette.neutral100}
          />
          <Text style={styles.headerTitle}>My Trips</Text>
        </View>
      </View>

      {/* Bookings List */}
      {ticketsStore.loading ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="hourglass-outline"
            size={48}
            color={theme.colors.palette.neutral400}
          />
          <Text style={styles.emptyText}>Loading your trips...</Text>
        </View>
      ) : ticketsStore.hasBookings ? (
        <FlatList
          data={ticketsStore.bookings.slice()}
          renderItem={renderBookingCard}
          keyExtractor={item => item.booking_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons
            name="airplane-outline"
            size={64}
            color={theme.colors.palette.neutral400}
          />
          <Text style={styles.emptyText}>No Bookings Yet</Text>
          <Text style={styles.emptySubtext}>
            Start exploring and book your next adventure
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => {
              trackClick('explore_flights_button')
              router.push('/')
            }}
          >
            <Text style={styles.exploreButtonText}>Explore Flights</Text>
          </TouchableOpacity>
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
    exploreButton: {
      backgroundColor: theme.colors.palette.primary500,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 12,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    exploreButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    // Booking Card Styles
    bookingCard: {
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
      flex: 1,
      backgroundColor: theme.colors.palette.secondary500,
      justifyContent: 'center',
      paddingLeft: 20,
    },
    diagonalCut: {
      width: 50,
      backgroundColor: theme.colors.palette.secondary500,
      transform: [{ rotate: '45deg' }],
      position: 'absolute',
      left: '50%',
      marginLeft: -25,
      height: 100,
      top: -15,
      borderRightWidth: 50,
      borderRightColor: theme.colors.palette.primary400,
    },
    headerRightSection: {
      flex: 1,
      backgroundColor: theme.colors.palette.primary400,
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingRight: 20,
    },
    headerPrice: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.palette.neutral100,
    },
    headerReference: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      letterSpacing: 1.5,
    },
    cardBody: {
      flexDirection: 'row',
      padding: 20,
      backgroundColor: theme.colors.palette.neutral100,
    },
    leftColumn: {
      flex: 1,
      justifyContent: 'space-between',
      paddingRight: 16,
    },
    timeSection: {
      alignItems: 'center',
    },
    iconContainer: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    verticalDivider: {
      width: 1,
      borderLeftWidth: 1,
      borderLeftColor: theme.colors.palette.neutral300,
      borderStyle: 'dotted',
      marginHorizontal: 0,
    },
    rightColumn: {
      flex: 1.5,
      paddingLeft: 16,
    },
    statusRow: {
      marginBottom: 12,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    statusText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      letterSpacing: 0.5,
    },
    detailRowTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    horizontalDivider: {
      height: 1,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral300,
      borderStyle: 'dotted',
      marginVertical: 12,
    },
    detailRowBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
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
    valueSmall: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
  })
