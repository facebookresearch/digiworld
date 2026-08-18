// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  Text,
  Screen,
  ToastContext,
  useAppTheme,
  type Theme,
} from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import { useEffect, useCallback, useRef, useContext, useMemo } from 'react'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'

import { getBookingWithDetails, checkIfBookingCheckedIn } from '@/db/queries'
import { mutations } from '@/db/mutations'
import { canCancelFlight, hasFlightDeparted } from '@/utils/flightValidation'
import { useStores } from '@/models'

export default observer(function BookingDetailsScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const params = useLocalSearchParams()
  const bookingId = params.bookingId as string

  const { bookingDetailsStore } = useStores()
  const { trackScreenMount, trackClick } = useInteractionTracking(
    'booking-details',
    '/booking-details',
  )
  const toast = useContext(ToastContext)

  // Session restoration tracking
  const sessionRestoredRef = useRef(false)
  const lastSessionTimeStampRef = useRef<string | null>(null)

  useEffect(() => {
    if (bookingId) {
      // Reset store if booking ID changed
      if (bookingDetailsStore.lastBookingId !== bookingId) {
        bookingDetailsStore.resetBookingDetails()
        bookingDetailsStore.setLastBookingId(bookingId)
      }
      loadBookingDetails()
    }
  }, [])

  // Track screen mount
  useEffect(() => {
    trackScreenMount()
  }, [trackScreenMount])

  // Clear store when unmounting
  useEffect(() => {
    return () => {
      bookingDetailsStore.resetBookingDetails()
    }
  }, [])

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
      const rootStore = bookingDetailsStore.getRootStore?.() as any
      const sessionData = rootStore?.sessionStore?.getSession(
        currentSessionTimeStamp,
      )

      if (sessionData?.data) {
        // Mark session as restored to prevent multiple restoration
        sessionRestoredRef.current = true
      } else {
        // Booking details session data not found
        sessionRestoredRef.current = true // Mark as restored even if no data found
      }
    } else if (currentSessionTimeStamp && sessionRestoredRef.current) {
      // Session already restored, skipping restoration
    } else {
      // No sessionTimeStamp parameter found
    }
  }, [params?.sessionTimeStamp, bookingDetailsStore])

  const loadBookingDetails = useCallback(async () => {
    try {
      bookingDetailsStore.setLoading(true)
      const details = await getBookingWithDetails(bookingId)
      bookingDetailsStore.setBookingData(details)

      // Check check-in status
      const checkInInfo = await checkIfBookingCheckedIn(bookingId)
      bookingDetailsStore.setCheckInStatus(checkInInfo)
    } catch (error) {
      console.error('Error loading booking details:', error)
      Alert.alert('Error', 'Failed to load booking details')
    } finally {
      bookingDetailsStore.setLoading(false)
    }
  }, [bookingId, bookingDetailsStore])

  // Refresh data when screen comes into focus (e.g., returning from check-in)
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'booking-details',
        route: '/booking-details',
        sessionTimeStamp: params?.sessionTimeStamp,
      })

      if (bookingId) {
        loadBookingDetails()
      }

      return () => {
        getLatestInteraction()
      }
    }, [bookingId, loadBookingDetails, params?.sessionTimeStamp]),
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
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

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

  const handleConfirmCancellation = async () => {
    trackClick('confirm_cancellation')

    try {
      bookingDetailsStore.setCancelling(true)

      const booking = bookingDetailsStore.booking as any
      const cancelType = bookingDetailsStore.cancelType
      const selectedFlightToCancel =
        bookingDetailsStore.selectedFlightToCancel as any

      // Validate cancellation timing
      if (cancelType === 'full' && booking?.bookingFlights) {
        // Check all flights in booking
        for (const flight of booking.bookingFlights) {
          const validation = canCancelFlight(flight.departure_time)
          if (!validation.isValid) {
            bookingDetailsStore.setCancelling(false)
            bookingDetailsStore.setShowCancelModal(false)
            router.push({
              pathname: '/flight-unavailable',
              params: {
                reason: validation.reason,
                action: 'cancel',
                timeUntil: validation.timeUntilDeparture?.toString(),
                departureTime: validation.departureTime,
              },
            })
            return
          }
        }
      } else if (cancelType === 'partial' && selectedFlightToCancel) {
        // Check selected flight
        const validation = canCancelFlight(
          selectedFlightToCancel.departure_time,
        )
        if (!validation.isValid) {
          bookingDetailsStore.setCancelling(false)
          bookingDetailsStore.setShowCancelModal(false)
          router.push({
            pathname: '/flight-unavailable',
            params: {
              reason: validation.reason,
              action: 'cancel',
              timeUntil: validation.timeUntilDeparture?.toString(),
              departureTime: validation.departureTime,
            },
          })
          return
        }
      }

      if (cancelType === 'full') {
        await mutations.cancelBooking(
          bookingId,
          bookingDetailsStore.cancelReason || 'Customer request',
        )
        Alert.alert(
          'Booking Cancelled',
          'Your booking has been cancelled. Full refund will be processed.',
          [
            {
              text: 'OK',
              onPress: () => {
                bookingDetailsStore.setShowCancelModal(false)
                router.back()
              },
            },
          ],
        )
      } else {
        await mutations.cancelFlight(
          selectedFlightToCancel.id,
          bookingDetailsStore.cancelReason || 'Customer request',
        )
        Alert.alert(
          'Flight Cancelled',
          'Flight cancelled successfully. Partial refund will be processed.',
          [
            {
              text: 'OK',
              onPress: () => {
                bookingDetailsStore.setShowCancelModal(false)
                bookingDetailsStore.setSelectedFlightToCancel(null)
                loadBookingDetails()
              },
            },
          ],
        )
      }
    } catch (error) {
      console.error('Error cancelling:', error)
      Alert.alert('Error', 'Failed to cancel. Please try again.')
    } finally {
      bookingDetailsStore.setCancelling(false)
    }
  }

  if (bookingDetailsStore.loading) {
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
              bookingDetailsStore.resetBookingDetails()
              router.back()
            }}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons
            name="hourglass-outline"
            size={48}
            color={theme.colors.palette.neutral400}
          />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </Screen>
    )
  }

  if (!bookingDetailsStore.hasBooking) {
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
              bookingDetailsStore.resetBookingDetails()
              router.back()
            }}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
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

  const booking = bookingDetailsStore.booking as any
  const checkInStatus = bookingDetailsStore.checkInStatus

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
            bookingDetailsStore.resetBookingDetails()
            router.back()
          }}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.palette.neutral100}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => {
            trackClick('share_button')
            toast?.show?.({
              title: 'Link copied – share it with your crew!',
              preset: 'success',
              placement: 'top',
              textColor: theme.colors.palette.neutral100,
            })
          }}
        >
          <Ionicons
            name="share-outline"
            size={24}
            color={theme.colors.palette.neutral100}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Booking Reference Card */}
        <View style={styles.referenceCard}>
          <View style={styles.referenceHeader}>
            <Text style={styles.referenceLabel}>Booking Reference</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(booking.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {booking.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.referenceNumber}>
            {booking.booking_reference}
          </Text>
          <Text style={styles.tripType}>
            {booking.trip_type === 'round_trip' ? 'Round Trip' : 'One Way'}
          </Text>
        </View>

        {/* Flight Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flight Information</Text>
          {booking.bookingFlights?.map((bookingFlight: any, _index: number) => {
            // Check if all passengers are checked in for this specific flight
            // by checking seat assignments for this flight
            const flightCheckedIn = booking.passengers?.every((p: any) =>
              p.seatAssignments?.some(
                (sa: any) =>
                  sa.flight_id === bookingFlight.flight?.flight_id &&
                  sa.check_in_status === 'checked_in',
              ),
            )

            return (
              <View key={bookingFlight.id} style={styles.flightCard}>
                {/* Segment Badge */}
                <View style={styles.segmentBadge}>
                  <Ionicons
                    name={
                      bookingFlight.segment === 'outbound'
                        ? 'airplane'
                        : 'return-down-back'
                    }
                    size={16}
                    color={theme.colors.palette.primary500}
                  />
                  <Text style={styles.segmentText}>
                    {bookingFlight.segment === 'outbound'
                      ? 'Departure'
                      : 'Return'}
                  </Text>
                </View>

                {/* Route */}
                <View style={styles.route}>
                  <View style={styles.cityInfo}>
                    <Text style={styles.cityCode}>{bookingFlight.origin}</Text>
                    <Text style={styles.timeText}>
                      {formatTime(bookingFlight.departure_time)}
                    </Text>
                  </View>

                  <View style={styles.flightPath}>
                    <View style={styles.pathLine} />
                    <Ionicons
                      name="airplane"
                      size={16}
                      color={theme.colors.palette.primary500}
                      style={styles.pathIcon}
                    />
                    <Text style={styles.durationText}>
                      {bookingFlight.duration_minutes}min
                    </Text>
                  </View>

                  <View style={styles.cityInfo}>
                    <Text style={styles.cityCode}>
                      {bookingFlight.destination}
                    </Text>
                    <Text style={styles.timeText}>
                      {formatTime(bookingFlight.arrival_time)}
                    </Text>
                  </View>
                </View>

                {/* Flight Details */}
                <View style={styles.flightDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Flight Number</Text>
                    <Text style={styles.detailValue}>
                      {bookingFlight.flight_number}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Airline</Text>
                    <Text style={styles.detailValue}>
                      {bookingFlight.airline_code}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(bookingFlight.departure_time)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text
                      style={{
                        ...styles.detailValue,
                        color: getStatusColor(bookingFlight.status),
                      }}
                    >
                      {bookingFlight.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Check-In Button for this flight */}
                {booking.status === 'confirmed' &&
                  !flightCheckedIn &&
                  bookingFlight.status === 'confirmed' &&
                  !hasFlightDeparted(bookingFlight.departure_time) && (
                    <TouchableOpacity
                      style={styles.flightCheckInButton}
                      onPress={() => {
                        trackClick(
                          `check_in_flight_${bookingFlight.flight?.flight_id}`,
                        )
                        router.push({
                          pathname: '/check-in',
                          params: {
                            bookingId: booking.booking_id,
                            flightId: bookingFlight.flight?.flight_id,
                          },
                        })
                      }}
                    >
                      <Ionicons
                        name="checkmark-done"
                        size={18}
                        color={theme.colors.palette.neutral100}
                      />
                      <Text style={styles.flightCheckInText}>
                        Check In for this Flight
                      </Text>
                    </TouchableOpacity>
                  )}

                {/* Cancel Individual Flight Button (when some are checked in) */}
                {booking.status === 'confirmed' &&
                  !flightCheckedIn &&
                  checkInStatus.someCheckedIn &&
                  bookingFlight.status === 'confirmed' &&
                  canCancelFlight(bookingFlight.departure_time).isValid && (
                    <TouchableOpacity
                      style={styles.cancelFlightButton}
                      onPress={() => {
                        trackClick(
                          `cancel_flight_${bookingFlight.flight?.flight_id}`,
                        )
                        bookingDetailsStore.setSelectedFlightToCancel(
                          bookingFlight,
                        )
                        bookingDetailsStore.setCancelType('partial')
                        bookingDetailsStore.setShowCancelModal(true)
                      }}
                    >
                      <Ionicons
                        name="close"
                        size={16}
                        color={theme.colors.palette.neutral100}
                      />
                      <Text style={styles.cancelFlightText}>
                        Cancel This Flight
                      </Text>
                    </TouchableOpacity>
                  )}

                {/* Checked In Badge with Boarding Pass Button */}
                {flightCheckedIn && (
                  <>
                    <View style={styles.checkedInBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={theme.colors.palette.success500}
                      />
                      <Text style={styles.checkedInText}>Checked In ✓</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.boardingPassButton}
                      onPress={() => {
                        trackClick(
                          `view_boarding_pass_${bookingFlight.flight?.flight_id}`,
                        )
                        router.push({
                          pathname: '/boarding-pass',
                          params: {
                            bookingId: booking.booking_id,
                            flightId: bookingFlight.flight?.flight_id,
                          },
                        })
                      }}
                    >
                      <Ionicons
                        name="qr-code"
                        size={16}
                        color={theme.colors.palette.neutral100}
                      />
                      <Text style={styles.boardingPassText}>
                        View Boarding Pass
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )
          })}
        </View>

        {/* Passengers */}
        {booking.passengers && booking.passengers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Passengers ({booking.passengers.length})
            </Text>
            {booking.passengers.map((passenger: any, _index: number) => (
              <View key={passenger.passenger_id} style={styles.passengerCard}>
                <View style={styles.passengerHeader}>
                  <View style={styles.passengerAvatar}>
                    <Text style={styles.passengerInitial}>
                      {passenger.first_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.passengerInfo}>
                    <Text style={styles.passengerName}>
                      {passenger.first_name} {passenger.last_name}
                    </Text>
                    <Text style={styles.passengerEmail}>{passenger.email}</Text>
                  </View>
                </View>
                <View style={styles.passengerDetails}>
                  <View style={styles.passengerDetailRow}>
                    <Text style={styles.passengerDetailLabel}>Ticket</Text>
                    <Text style={styles.passengerDetailValue}>
                      {passenger.ticket_number}
                    </Text>
                  </View>
                  <View style={styles.passengerDetailRow}>
                    <Text style={styles.passengerDetailLabel}>Passport</Text>
                    <Text style={styles.passengerDetailValue}>
                      {passenger.passport_number}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Payment Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Total Amount</Text>
              <Text style={styles.paymentAmount}>
                ${booking.total_price?.toFixed(2)}
              </Text>
            </View>
            {booking.refund_amount > 0 && (
              <>
                <View style={styles.paymentRow}>
                  <View style={styles.refundLabelContainer}>
                    <Text style={styles.paymentLabel}>
                      {booking.refund_amount >= booking.total_price
                        ? 'Full Refund'
                        : 'Partial Refund'}
                    </Text>
                    {booking.refund_amount < booking.total_price && (
                      <View style={styles.partialBadge}>
                        <Text style={styles.partialBadgeText}>PARTIAL</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={{
                      ...styles.paymentAmount,
                      color: theme.colors.palette.angry500,
                    }}
                  >
                    -${booking.refund_amount?.toFixed(2)}
                  </Text>
                </View>
              </>
            )}
            <View style={styles.paymentDivider} />
            <View style={styles.paymentRow}>
              <Text style={styles.paymentTotal}>Amount Paid</Text>
              <Text style={styles.paymentTotalValue}>
                $
                {(booking.total_price - (booking.refund_amount || 0)).toFixed(
                  2,
                )}
              </Text>
            </View>
            <View
              style={[
                styles.paymentStatusBadge,
                {
                  backgroundColor:
                    booking.payment_status === 'paid'
                      ? theme.colors.palette.success100
                      : theme.colors.palette.secondary100,
                },
              ]}
            >
              <Text
                style={{
                  ...styles.paymentStatusText,
                  color:
                    booking.payment_status === 'paid'
                      ? theme.colors.palette.success500
                      : theme.colors.palette.secondary500,
                }}
              >
                {booking.payment_status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {booking.status === 'confirmed' &&
            !checkInStatus.someCheckedIn &&
            booking.bookingFlights?.every(
              (flight: any) => canCancelFlight(flight.departure_time).isValid,
            ) && (
              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={() => {
                  trackClick('cancel_booking_button')
                  bookingDetailsStore.setCancelType('full')
                  bookingDetailsStore.setSelectedFlightToCancel(null)
                  bookingDetailsStore.setShowCancelModal(true)
                }}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={theme.colors.palette.angry500}
                />
                <Text style={styles.secondaryActionText}>Cancel Booking</Text>
              </TouchableOpacity>
            )}
          {booking.status === 'confirmed' &&
            checkInStatus.someCheckedIn &&
            !checkInStatus.allCheckedIn && (
              <View style={styles.infoCard}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={theme.colors.palette.secondary500}
                />
                <Text style={styles.infoCardText}>
                  Some flights are checked in. Cannot cancel entire booking.
                </Text>
              </View>
            )}
        </View>
      </ScrollView>

      {/* Cancellation Modal */}
      <Modal
        visible={bookingDetailsStore.showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => bookingDetailsStore.setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <Ionicons
                    name="alert-circle"
                    size={40}
                    color={theme.colors.palette.angry500}
                  />
                </View>
                <Text style={styles.modalTitle}>
                  {bookingDetailsStore.cancelType === 'full'
                    ? 'Cancel Booking?'
                    : 'Cancel Flight?'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {bookingDetailsStore.cancelType === 'full'
                    ? 'Full refund will be processed to your payment method.'
                    : `Partial refund for flight ${(bookingDetailsStore.selectedFlightToCancel as any)?.flight_number || ''} will be processed.`}
                </Text>
              </View>

              {/* Flight Details (for partial cancellation) */}
              {bookingDetailsStore.cancelType === 'partial' &&
                bookingDetailsStore.selectedFlightToCancel && (
                  <View style={styles.flightInfoModal}>
                    <View style={styles.routeModal}>
                      <Text style={styles.cityCodeModal}>
                        {
                          (bookingDetailsStore.selectedFlightToCancel as any)
                            .origin
                        }
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color={theme.colors.palette.primary500}
                      />
                      <Text style={styles.cityCodeModal}>
                        {
                          (bookingDetailsStore.selectedFlightToCancel as any)
                            .destination
                        }
                      </Text>
                    </View>
                    <Text style={styles.flightNumberModal}>
                      {
                        (bookingDetailsStore.selectedFlightToCancel as any)
                          .airline_code
                      }{' '}
                      {
                        (bookingDetailsStore.selectedFlightToCancel as any)
                          .flight_number
                      }
                    </Text>
                  </View>
                )}

              {/* Refund Amount */}
              <View style={styles.refundCard}>
                <Text style={styles.refundLabel}>Refund Amount</Text>
                <Text style={styles.refundAmount}>
                  $
                  {bookingDetailsStore.cancelType === 'full'
                    ? booking?.total_price?.toFixed(2)
                    : (
                        bookingDetailsStore.selectedFlightToCancel as any
                      )?.fare?.toFixed(2)}
                </Text>
                {bookingDetailsStore.cancelType === 'partial' &&
                  booking.bookingFlights?.length > 1 && (
                    <Text style={styles.refundNote}>
                      Remaining: $
                      {(
                        booking.total_price -
                        ((bookingDetailsStore.selectedFlightToCancel as any)
                          ?.fare || 0)
                      ).toFixed(2)}
                    </Text>
                  )}
              </View>

              {/* Cancellation Policy */}
              <View style={styles.policyCard}>
                <View style={styles.policyItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={theme.colors.palette.success500}
                  />
                  <Text style={styles.policyText}>
                    {bookingDetailsStore.cancelType === 'full'
                      ? '100%'
                      : 'Partial'}{' '}
                    refund
                  </Text>
                </View>
                <View style={styles.policyItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={theme.colors.palette.success500}
                  />
                  <Text style={styles.policyText}>Processed in 5-7 days</Text>
                </View>
              </View>

              {/* Reason Input */}
              <View style={styles.reasonContainer}>
                <Text style={styles.reasonLabel}>Reason (optional)</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Why are you cancelling?"
                  placeholderTextColor={theme.colors.palette.neutral400}
                  value={bookingDetailsStore.cancelReason}
                  onChangeText={text =>
                    bookingDetailsStore.setCancelReason(text)
                  }
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  maxLength={200}
                />
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  trackClick('cancel_modal_keep_booking')
                  bookingDetailsStore.resetCancelState()
                }}
                disabled={bookingDetailsStore.cancelling}
              >
                <Text style={styles.cancelButtonText}>
                  {bookingDetailsStore.cancelType === 'full'
                    ? 'Keep Booking'
                    : 'Keep Flight'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  bookingDetailsStore.cancelling && styles.buttonDisabled,
                ]}
                onPress={handleConfirmCancellation}
                disabled={bookingDetailsStore.cancelling}
              >
                {bookingDetailsStore.cancelling ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.palette.neutral100}
                  />
                ) : (
                  <>
                    <Ionicons
                      name="trash"
                      size={16}
                      color={theme.colors.palette.neutral100}
                    />
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
    // Reference Card
    referenceCard: {
      backgroundColor: theme.colors.palette.neutral100,
      marginHorizontal: 20,
      marginTop: 20,
      padding: 24,
      borderRadius: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    referenceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    referenceLabel: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
      textTransform: 'uppercase',
    },
    referenceNumber: {
      fontSize: 32,
      color: theme.colors.palette.primary500,
      marginBottom: 8,
      letterSpacing: 2,
    },
    tripType: {
      fontSize: 14,
      color: theme.colors.palette.neutral700,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      letterSpacing: 0.5,
    },
    // Section
    section: {
      marginTop: 20,
      marginHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 16,
      color: theme.colors.palette.neutral900,
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    // Flight Card
    flightCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: 20,
      marginBottom: 12,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    segmentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.palette.primary100,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginBottom: 16,
    },
    segmentText: {
      fontSize: 12,
      color: theme.colors.palette.primary500,
      textTransform: 'uppercase',
    },
    route: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    cityInfo: {
      alignItems: 'center',
      flex: 1,
    },
    cityCode: {
      fontSize: 28,
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    timeText: {
      fontSize: 14,
      color: theme.colors.palette.neutral700,
    },
    flightPath: {
      flex: 2,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      marginHorizontal: 8,
    },
    pathLine: {
      position: 'absolute',
      width: '100%',
      height: 2,
      backgroundColor: theme.colors.palette.neutral300,
    },
    pathIcon: {
      backgroundColor: theme.colors.palette.neutral100,
      padding: 4,
      zIndex: 1,
    },
    durationText: {
      fontSize: 11,
      color: theme.colors.palette.neutral600,
      marginTop: 8,
    },
    flightDetails: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    detailLabel: {
      fontSize: 13,
      color: theme.colors.palette.neutral600,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    // Passenger Card
    passengerCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: 20,
      marginBottom: 12,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    passengerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
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
      color: theme.colors.palette.neutral100,
    },
    passengerInfo: {
      flex: 1,
    },
    passengerName: {
      fontSize: 16,
      color: theme.colors.palette.neutral900,
      marginBottom: 2,
    },
    passengerEmail: {
      fontSize: 13,
      color: theme.colors.palette.neutral600,
    },
    passengerDetails: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 12,
    },
    passengerDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    passengerDetailLabel: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
    },
    passengerDetailValue: {
      fontSize: 13,
      color: theme.colors.palette.neutral900,
    },
    // Payment Card
    paymentCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: 20,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    paymentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    paymentLabel: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },
    refundLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    partialBadge: {
      backgroundColor: theme.colors.palette.secondary100,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.colors.palette.secondary300,
    },
    partialBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.colors.palette.secondary500,
      letterSpacing: 0.5,
    },
    paymentAmount: {
      fontSize: 16,
      color: theme.colors.palette.neutral900,
    },
    paymentDivider: {
      height: 1,
      backgroundColor: theme.colors.palette.neutral200,
      marginVertical: 12,
    },
    paymentTotal: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    paymentTotalValue: {
      fontSize: 24,
      fontWeight: '900',
      color: theme.colors.palette.primary500,
    },
    paymentStatusBadge: {
      alignSelf: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      marginTop: 12,
    },
    paymentStatusText: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    // Actions
    actionsSection: {
      marginHorizontal: 20,
      marginTop: 24,
      marginBottom: 40,
      gap: 12,
    },
    primaryActionButton: {
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
    primaryActionText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    secondaryActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: theme.colors.palette.neutral100,
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.palette.angry500,
    },
    secondaryActionText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.angry500,
    },
    flightCheckInButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: theme.colors.palette.primary500,
      paddingVertical: 14,
      borderRadius: 10,
      marginTop: 16,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    flightCheckInText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    checkedInBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.palette.success100,
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 16,
      borderWidth: 1,
      borderColor: theme.colors.palette.success300,
    },
    checkedInText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.palette.success500,
    },
    boardingPassButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.palette.secondary500,
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 10,
      shadowColor: theme.colors.palette.secondary500,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    boardingPassText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    cancelFlightButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.palette.angry500,
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 10,
      shadowColor: theme.colors.palette.angry500,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    cancelFlightText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.colors.palette.secondary100,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.palette.secondary300,
    },
    infoCardText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.palette.secondary500,
      lineHeight: 18,
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.palette.overlay50,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 20,
      width: '100%',
      maxWidth: 400,
      maxHeight: '85%',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 10,
    },
    modalHeader: {
      alignItems: 'center',
      padding: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    modalIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.palette.angry100,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.palette.neutral900,
      marginBottom: 6,
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      lineHeight: 18,
    },
    policyCard: {
      padding: 14,
      backgroundColor: theme.colors.palette.neutral100,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 10,
      gap: 8,
    },
    policyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    policyText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.palette.neutral700,
      flex: 1,
    },
    refundCard: {
      backgroundColor: theme.colors.palette.success100,
      marginHorizontal: 16,
      marginTop: 16,
      padding: 14,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.palette.success300,
    },
    refundLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.palette.success500,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    refundAmount: {
      fontSize: 28,
      fontWeight: '900',
      color: theme.colors.palette.success500,
    },
    refundNote: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.palette.neutral600,
      marginTop: 6,
    },
    flightInfoModal: {
      backgroundColor: theme.colors.palette.primary100,
      marginHorizontal: 16,
      marginTop: 16,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary300,
    },
    routeModal: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginBottom: 6,
    },
    cityCodeModal: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.palette.neutral900,
    },
    flightNumberModal: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.palette.neutral700,
      textAlign: 'center',
    },
    reasonContainer: {
      padding: 16,
      paddingBottom: 20,
    },
    reasonLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.neutral700,
      marginBottom: 8,
    },
    reasonInput: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 10,
      padding: 10,
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.palette.neutral900,
      minHeight: 60,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
    },
    modalActions: {
      flexDirection: 'row',
      padding: 16,
      paddingTop: 0,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral200,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral200,
      paddingVertical: 13,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.neutral700,
    },
    confirmButton: {
      flex: 1,
      backgroundColor: theme.colors.palette.angry500,
      paddingVertical: 13,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    confirmButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  })
