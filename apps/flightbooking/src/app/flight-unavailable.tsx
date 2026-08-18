// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Text, Screen, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, router } from 'expo-router'
import { useEffect, useRef, useMemo } from 'react'
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native'

import {
  formatTimeUntilDeparture,
  getValidationErrorMessage,
} from '@/utils/flightValidation'

type ReasonType = 'DEPARTED' | 'TOO_CLOSE_TO_DEPARTURE' | 'PAST_CHECK_IN'

export default function FlightUnavailableScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const params = useLocalSearchParams()
  const reason = params.reason as ReasonType
  const action = params.action as string // 'cancel', 'checkin', 'booking'
  const timeUntil = params.timeUntil
    ? parseFloat(params.timeUntil as string)
    : null
  const departureTime = params.departureTime as string

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const iconRotateAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Fade in and scale animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start()

    // Continuous icon rotation
    Animated.loop(
      Animated.timing(iconRotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
    ).start()
  }, [fadeAnim, scaleAnim, iconRotateAnim])

  const iconRotate = iconRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const getIcon = () => {
    if (reason === 'DEPARTED') {
      return 'airplane-outline'
    }
    if (reason === 'TOO_CLOSE_TO_DEPARTURE') {
      return 'time-outline'
    }
    if (reason === 'PAST_CHECK_IN') {
      return 'calendar-outline'
    }
    return 'alert-circle-outline'
  }

  const getTitle = () => {
    if (reason === 'DEPARTED') {
      return 'Flight Departed'
    }
    if (reason === 'TOO_CLOSE_TO_DEPARTURE' && action === 'cancel') {
      return 'Cancellation Not Available'
    }
    if (reason === 'TOO_CLOSE_TO_DEPARTURE') {
      return 'Too Close to Departure'
    }
    if (reason === 'PAST_CHECK_IN') {
      return 'Check-In Not Open Yet'
    }
    return 'Flight Unavailable'
  }

  const getMessage = () => {
    if (reason === 'DEPARTED') {
      return 'This flight has already departed. You can view your booking details, but no changes can be made.'
    }
    if (reason === 'TOO_CLOSE_TO_DEPARTURE' && action === 'cancel') {
      return `Cancellations must be made at least 3 hours before departure. This flight departs in ${timeUntil !== null ? formatTimeUntilDeparture(timeUntil) : 'less than 3 hours'}.`
    }
    if (reason === 'TOO_CLOSE_TO_DEPARTURE' && action === 'booking') {
      return 'New bookings must be made at least 2 hours before departure. Please select a different flight.'
    }
    if (reason === 'PAST_CHECK_IN') {
      return `Online check-in opens 24 hours before departure. Your flight departs in ${timeUntil !== null ? formatTimeUntilDeparture(timeUntil) : 'more than 24 hours'}.`
    }
    return getValidationErrorMessage({ isValid: false, reason })
  }

  const getActionButtons = () => {
    const buttons = []

    if (reason === 'DEPARTED' || reason === 'TOO_CLOSE_TO_DEPARTURE') {
      buttons.push(
        <TouchableOpacity
          key="contact"
          style={styles.secondaryButton}
          onPress={() => {
            // Navigate to support/help
            router.back()
          }}
        >
          <Ionicons
            name="headset-outline"
            size={20}
            color={theme.colors.palette.primary500}
          />
          <Text style={styles.secondaryButtonText}>Contact Support</Text>
        </TouchableOpacity>,
      )
    }

    buttons.push(
      <TouchableOpacity
        key="back"
        style={styles.primaryButton}
        onPress={() => router.back()}
      >
        <Text style={styles.primaryButtonText}>Go Back</Text>
        <Ionicons
          name="arrow-back"
          size={20}
          color={theme.colors.palette.neutral100}
        />
      </TouchableOpacity>,
    )

    return buttons
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
          onPress={() => router.back()}
        >
          <Ionicons
            name="close"
            size={24}
            color={theme.colors.palette.neutral100}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Flight Status</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Animated.View
            style={[
              styles.iconCircle,
              reason === 'DEPARTED' && styles.iconCircleDeparted,
              reason === 'TOO_CLOSE_TO_DEPARTURE' && styles.iconCircleWarning,
              reason === 'PAST_CHECK_IN' && styles.iconCircleInfo,
              {
                transform: [{ rotate: iconRotate }],
              },
            ]}
          >
            <View style={styles.iconInner}>
              <Ionicons
                name={getIcon()}
                size={64}
                color={
                  reason === 'DEPARTED'
                    ? theme.colors.palette.angry500
                    : reason === 'TOO_CLOSE_TO_DEPARTURE'
                      ? theme.colors.palette.secondary500
                      : theme.colors.palette.primary500
                }
              />
            </View>
          </Animated.View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{getTitle()}</Text>

        {/* Message */}
        <View style={styles.messageCard}>
          <Text style={styles.message}>{getMessage()}</Text>
        </View>

        {/* Departure Time Info */}
        {departureTime && (
          <View style={styles.timeCard}>
            <View style={styles.timeRow}>
              <Ionicons
                name="calendar"
                size={16}
                color={theme.colors.palette.neutral600}
              />
              <Text style={styles.timeLabel}>Departure Time</Text>
            </View>
            <Text style={styles.timeValue}>
              {new Date(departureTime).toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}

        {/* Policy Note */}
        {reason === 'TOO_CLOSE_TO_DEPARTURE' && action === 'cancel' && (
          <View style={styles.policyNote}>
            <Ionicons
              name="information-circle"
              size={20}
              color={theme.colors.palette.secondary500}
            />
            <Text style={styles.policyText}>
              Our cancellation policy requires a minimum of 3 hours notice
              before departure.
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>{getActionButtons()}</View>
      </Animated.View>
    </Screen>
  )
}

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
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 30,
    },
    iconContainer: {
      marginBottom: 32,
    },
    iconCircle: {
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: theme.colors.palette.primary100,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: theme.colors.palette.primary200,
    },
    iconCircleDeparted: {
      backgroundColor: theme.colors.palette.angry100,
      borderColor: theme.colors.palette.angry200,
    },
    iconCircleWarning: {
      backgroundColor: theme.colors.palette.secondary100,
      borderColor: theme.colors.palette.secondary200,
    },
    iconCircleInfo: {
      backgroundColor: theme.colors.palette.primary100,
      borderColor: theme.colors.palette.primary200,
    },
    iconInner: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: theme.colors.palette.neutral100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.colors.palette.neutral900,
      textAlign: 'center',
      marginBottom: 20,
      letterSpacing: -0.5,
    },
    messageCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: 24,
      marginBottom: 20,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
      width: '100%',
    },
    message: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.palette.neutral700,
      textAlign: 'center',
      lineHeight: 24,
    },
    timeCard: {
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      width: '100%',
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    timeLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.neutral600,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    timeValue: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    policyNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: theme.colors.palette.secondary100,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.palette.secondary200,
      width: '100%',
    },
    policyText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.palette.secondary500,
      lineHeight: 20,
    },
    actionsContainer: {
      width: '100%',
      gap: 12,
      marginTop: 12,
    },
    primaryButton: {
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
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: theme.colors.palette.neutral100,
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.palette.primary500,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
    },
  })
