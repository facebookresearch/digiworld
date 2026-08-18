import { Text, Screen, useAppTheme, type Theme } from '@andojo/shared-theme'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import { router, useLocalSearchParams } from 'expo-router'
import { StyleSheet, TouchableOpacity, View, Animated } from 'react-native'
import { useEffect, useRef, useMemo } from 'react'

import { useStores } from '@/models'

export default observer(function BookingSuccessScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const params = useLocalSearchParams()
  const bookingReference = params.bookingReference as string
  const totalPaid = params.totalPaid as string
  const tripType = params.tripType as string
  const passengerCount = params.passengerCount as string

  const { bookingSuccessStore } = useStores()
  const { trackScreenMount, trackClick } = useInteractionTracking(
    'booking-success',
    '/booking-success',
  )

  // Session restoration tracking
  const sessionRestoredRef = useRef(false)
  const lastSessionTimeStampRef = useRef<string | null>(null)

  const scaleAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  // Track screen mount
  useEffect(() => {
    trackScreenMount()
  }, [])

  // Initialize store with booking details
  useEffect(() => {
    if (bookingReference) {
      // Reset store if booking reference changed
      if (bookingSuccessStore.lastBookingReference !== bookingReference) {
        bookingSuccessStore.resetBookingSuccess()
        bookingSuccessStore.setLastBookingReference(bookingReference)
      }

      // Store booking details
      bookingSuccessStore.setBookingDetails({
        bookingReference,
        totalPaid,
        tripType,
        passengerCount,
      })
    }
  }, [bookingReference, totalPaid, tripType, passengerCount])

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
      const rootStore = bookingSuccessStore.getRootStore?.() as any
      const sessionData = rootStore?.sessionStore?.getSession(
        currentSessionTimeStamp,
      )

      if (sessionData?.data) {
        sessionRestoredRef.current = true
      } else {
        sessionRestoredRef.current = true
      }
    }
  }, [params?.sessionTimeStamp, bookingSuccessStore])

  // Animation effect
  useEffect(() => {
    if (!bookingSuccessStore.animationCompleted) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        bookingSuccessStore.setAnimationCompleted(true)
      })
    } else {
      // If animation already completed (e.g., after restoration), set values immediately
      scaleAnim.setValue(1)
      fadeAnim.setValue(1)
    }
  }, [scaleAnim, fadeAnim, bookingSuccessStore])

  const handleViewTrips = () => {
    trackClick('view_trips_button')
    router.replace('/tickets')
  }

  const handleGoHome = () => {
    trackClick('go_home_button')
    router.replace('/')
  }

  return (
    <Screen
      preset="scroll"
      safeAreaEdges={['top']}
      contentContainerStyle={styles.container}
    >
      {/* Success Animation */}
      <View style={styles.successContainer}>
        <Animated.View
          style={[
            styles.successCircle,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Ionicons
            name="checkmark"
            size={50}
            color={theme.colors.palette.neutral100}
          />
        </Animated.View>

        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSubtitle}>
            Your trip is all set. Get ready for takeoff! ✈️
          </Text>

          {/* Booking Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons
                  name="document-text"
                  size={20}
                  color={theme.colors.palette.primary500}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Booking Reference</Text>
                <Text style={styles.detailValue}>
                  {bookingSuccessStore.bookingReference}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons
                  name="cash"
                  size={20}
                  color={theme.colors.palette.success500}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Total Paid</Text>
                <Text style={styles.detailValueAmount}>
                  ${bookingSuccessStore.totalPaid}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons
                  name={
                    bookingSuccessStore.tripType === 'round_trip'
                      ? 'swap-horizontal'
                      : 'arrow-forward'
                  }
                  size={20}
                  color={theme.colors.palette.secondary500}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Trip Type</Text>
                <Text style={styles.detailValue}>
                  {bookingSuccessStore.formattedTripType}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons
                  name="people"
                  size={20}
                  color={theme.colors.palette.neutral600}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Passengers</Text>
                <Text style={styles.detailValue}>
                  {bookingSuccessStore.passengerCountInt}{' '}
                  {bookingSuccessStore.passengerLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons
              name="information-circle"
              size={18}
              color={theme.colors.palette.primary500}
            />
            <Text style={styles.infoText}>
              Confirmation email sent to your registered address
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleViewTrips}
            >
              <Ionicons
                name="calendar"
                size={20}
                color={theme.colors.palette.neutral100}
              />
              <Text style={styles.primaryButtonText}>View My Trips</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleGoHome}
            >
              <Ionicons
                name="home"
                size={20}
                color={theme.colors.palette.primary500}
              />
              <Text style={styles.secondaryButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Screen>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    successContainer: {
      alignItems: 'center',
      paddingTop: 40,
    },
    successCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.colors.palette.success500,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      shadowColor: theme.colors.palette.success500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    contentContainer: {
      width: '100%',
      alignItems: 'center',
    },
    successTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.colors.palette.neutral900,
      marginBottom: 6,
      textAlign: 'center',
    },
    successSubtitle: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
      marginBottom: 24,
      textAlign: 'center',
      lineHeight: 22,
    },
    detailsCard: {
      width: '100%',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    detailIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.colors.palette.neutral100,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    detailContent: {
      flex: 1,
    },
    detailLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.neutral600,
      marginBottom: 3,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    detailValue: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    detailValueAmount: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.palette.success500,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.palette.neutral200,
      marginVertical: 6,
    },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.palette.primary100,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 10,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary200,
    },
    infoText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.primary600,
      lineHeight: 17,
    },
    actionButtons: {
      width: '100%',
      gap: 10,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.palette.primary500,
      paddingVertical: 14,
      borderRadius: 12,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    secondaryButton: {
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
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
    },
  })
