// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useMemo, useCallback } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Text, useAppTheme, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models/helpers/useStores'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import LinearGradient from 'react-native-linear-gradient'

const ParkingDetailsScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { parkingStore } = useStores()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { trackScreenMount } = useInteractionTracking(
    'ParkingDetails',
    `/screens/parking/details/${id}`,
  )

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        date: Date.now(),
        screenName: 'ParkingDetails',
        route: `/screens/parking/details/${id}`,
      })
    }, [id]),
  )

  const sessionId = parseInt(id || '0')
  const session = parkingStore.parkingHistory.find(h => h.id === sessionId)

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral900}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle} preset="subheading">
            Session Details
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Session not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const vehicle = parkingStore.vehicles.find(v => v.id === session.vehicleId)
  const zone = parkingStore.parkingZones.find(
    z => z.id === session.parkingZoneId,
  )
  const vehicleType = parkingStore.vehicleTypes.find(
    vt => vt.id === vehicle?.vehicleTypeId,
  )

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins} minutes`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.colors.palette.success500
      case 'expired':
        return theme.colors.palette.angry500
      case 'active':
        return theme.colors.palette.primary500
      default:
        return theme.colors.palette.neutral500
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle'
      case 'expired':
        return 'time-outline'
      case 'active':
        return 'play-circle'
      default:
        return 'information-circle'
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.palette.neutral900}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} preset="subheading">
          Parking Details
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <LinearGradient
          colors={[
            getStatusColor(session.status),
            getStatusColor(session.status) + 'CC',
          ]}
          style={styles.statusCard}
        >
          <Ionicons
            name={getStatusIcon(session.status) as any}
            size={48}
            color={theme.colors.palette.neutral100}
          />
          <Text style={styles.statusText}>{session.status.toUpperCase()}</Text>
          <Text style={styles.statusAmount}>
            ${session.chargedAmount.toFixed(2)}
          </Text>
        </LinearGradient>

        {/* Vehicle Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle</Text>
          <View style={styles.infoCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Vehicle</Text>
                <Text style={styles.detailValue}>
                  {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown'}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Plate Number</Text>
                <Text style={styles.detailValue}>
                  {vehicle?.plateNumber || 'N/A'}
                </Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Vehicle Type</Text>
                <Text style={styles.detailValue}>
                  {vehicleType?.name || 'N/A'}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Color</Text>
                <Text style={styles.detailValue}>
                  {vehicle?.color || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Location Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.infoCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Zone</Text>
                <Text style={styles.detailValue}>
                  {zone?.name || 'Unknown'}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Zone Code</Text>
                <Text style={styles.detailValue}>
                  {zone?.zoneCode || 'N/A'}
                </Text>
              </View>
            </View>
            {zone?.operator && (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Operator</Text>
                    <Text style={styles.detailValue}>{zone.operator}</Text>
                  </View>
                  <View style={styles.detailItem} />
                </View>
              </>
            )}
          </View>
        </View>

        {/* Time Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Details</Text>
          <View style={styles.infoCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>
                  {session.startTime ? formatDate(session.startTime) : 'N/A'}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>
                  {session.actualDurationMinutes
                    ? formatDuration(session.actualDurationMinutes)
                    : session.plannedDurationMinutes
                      ? formatDuration(session.plannedDurationMinutes)
                      : 'N/A'}
                </Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Start Time</Text>
                <Text style={styles.detailValue}>
                  {session.startTime ? formatTime(session.startTime) : 'N/A'}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>End Time</Text>
                <Text style={styles.detailValue}>
                  {session.actualEndTime
                    ? formatTime(session.actualEndTime)
                    : session.plannedEndTime
                      ? formatTime(session.plannedEndTime)
                      : 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.infoCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Amount Charged</Text>
                <Text style={[styles.detailValue, styles.amountValue] as any}>
                  ${session.chargedAmount.toFixed(2)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Currency</Text>
                <Text style={styles.detailValue}>{session.currency}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral200,
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
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.palette.angry500,
    },
    statusCard: {
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      marginBottom: 24,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    statusText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      marginTop: 12,
      marginBottom: 8,
    },
    statusAmount: {
      fontSize: 32,
      fontWeight: '800',
      color: theme.colors.palette.neutral100,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginBottom: 12,
    },
    infoCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    detailItem: {
      flex: 1,
    },
    detailLabel: {
      fontSize: 13,
      color: theme.colors.palette.neutral600,
      marginBottom: 6,
    },
    detailValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
    amountValue: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.success500,
    },
    infoDivider: {
      height: 1,
      backgroundColor: theme.colors.palette.neutral200,
      marginVertical: 12,
    },
  })

export default ParkingDetailsScreen
