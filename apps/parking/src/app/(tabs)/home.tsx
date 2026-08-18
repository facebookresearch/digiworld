import { useCallback, useMemo, useState, useEffect } from 'react'
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { Text, useAppTheme, type Theme } from '@andojo/shared-theme'
import { useRouter, useFocusEffect } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models/helpers/useStores'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { FancyAlert, SuccessDialog } from '@/components'
import { debounce } from 'lodash'

const HomeScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { parkingStore, notificationStore } = useStores()
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState(new Date())
  const { trackScreenMount } = useInteractionTracking('home', '/home')

  // Load parking data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await parkingStore.initialize()
        console.log('Parking data loaded')
        console.log(
          'Active sessions:',
          parkingStore.activeParkingSessions.length,
        )
      } catch (error) {
        console.error('Failed to load parking data:', error)
      }
    }

    loadData()
  }, [])

  // Check for expired sessions and update current time when screen is focused
  useFocusEffect(
    useCallback(() => {
      const syncExpiredSessions = async () => {
        setCurrentTime(new Date())
        await parkingStore.checkAndExpireSessions()
      }

      void syncExpiredSessions()

      const clockInterval = setInterval(() => {
        setCurrentTime(new Date())
      }, 1000)

      const expiryInterval = setInterval(() => {
        void syncExpiredSessions()
      }, 15000)

      // Load notifications when home screen is focused (like banking app)
      notificationStore.getNotifications()

      return () => {
        clearInterval(clockInterval)
        clearInterval(expiryInterval)
      }
    }, [parkingStore, notificationStore]),
  )

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'home',
        route: '/home',
      })
      // Load notifications when home screen is focused
      return () => {
        // Home screen unfocused
      }
    }, [trackScreenMount]),
  )

  // Debounced navigation to prevent multiple rapid taps
  const handleSearchPress = useCallback(
    debounce(() => {
      router.push('/screens/parking/search' as any)
    }, 300),
    [router],
  )

  const handleNavigateToMap = useCallback(
    debounce(() => {
      router.push('/screens/parking/map' as any)
    }, 300),
    [router],
  )

  const handleNavigateToVehicles = useCallback(
    debounce(() => {
      router.push('/(tabs)/vehicles')
    }, 300),
    [router],
  )

  const handleNavigateToPayment = useCallback(
    debounce(() => {
      router.push('/(tabs)/payment')
    }, 300),
    [router],
  )

  const handleNavigateToHistory = useCallback(
    debounce(() => {
      router.push('/(tabs)/history' as any)
    }, 300),
    [router],
  )

  const handleNavigateToNotifications = useCallback(
    debounce(() => {
      router.push('/notifications/notifications' as any)
    }, 300),
    [router],
  )

  const handleNavigateToDetails = useCallback(
    debounce((sessionId: number) => {
      router.push(`/screens/parking/details/${sessionId}` as any)
    }, 300),
    [router],
  )

  const quickActions = useMemo(
    () => [
      {
        id: 1,
        icon: 'car',
        label: 'My Vehicles',
        color: theme.colors.palette.primary500,
        bgColor: theme.colors.palette.primary100,
        onPress: handleNavigateToVehicles,
      },
      {
        id: 2,
        icon: 'map',
        label: 'Find Parking',
        color: theme.colors.palette.secondary500,
        bgColor: theme.colors.palette.secondary100,
        onPress: handleNavigateToMap,
      },
      {
        id: 3,
        icon: 'card',
        label: 'Payments',
        color: theme.colors.palette.accent500,
        bgColor: theme.colors.palette.accent100,
        onPress: handleNavigateToPayment,
      },
    ],
    [
      theme,
      handleNavigateToVehicles,
      handleNavigateToMap,
      handleNavigateToPayment,
    ],
  )

  // Hide overdue sessions immediately in the UI while the store persists them.
  const activeSessions = parkingStore.activeParkingSessions.filter(session => {
    if (!session.plannedEndTime) return true
    return new Date(session.plannedEndTime).getTime() > currentTime.getTime()
  })

  // Get unread notifications count (like banking app)
  const unreadNotifications = notificationStore.notifications.filter(
    n => n.isRead === 0,
  )
  const unreadCount = unreadNotifications.length

  console.log('Rendering home with active sessions:', activeSessions.length)

  console.log(activeSessions, 'active')

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.neutral200,
          theme.colors.palette.neutral300,
          theme.colors.palette.neutral100,
        ]}
        locations={[0, 0.4, 1]}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header with Gradient + Search */}
        <LinearGradient
          colors={[
            theme.colors.palette.secondary500,
            theme.colors.palette.primary500,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          {/* Title and Notification */}
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle} preset="subheading">
              Andojo Park
            </Text>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={handleNavigateToNotifications}
            >
              <View style={styles.notificationIconContainer}>
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color={theme.colors.palette.neutral100}
                />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Search Bar in Gradient */}
          <TouchableOpacity
            style={styles.searchContainer}
            onPress={handleSearchPress}
          >
            <View style={styles.searchBar}>
              <Ionicons
                name="search"
                size={20}
                color={theme.colors.palette.neutral600}
              />
              <Text style={styles.searchPlaceholder}>
                Search by location number
              </Text>
            </View>
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Park at Nearest Location */}
          <TouchableOpacity
            style={styles.nearestLocationCard}
            onPress={handleNavigateToMap}
          >
            <View style={styles.nearestLocationIcon}>
              <Ionicons
                name="location"
                size={24}
                color={theme.colors.palette.primary400}
              />
            </View>
            <Text style={styles.nearestLocationText}>
              Park at nearest location
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.palette.neutral400}
            />
          </TouchableOpacity>

          {/* Activity Section - Show active sessions or recent history */}
          {activeSessions.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.activityTitle} preset="subheading">
                Activity
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.activityScrollContent}
              >
                {activeSessions.map(session => {
                  // Find the vehicle for this session
                  const vehicle = parkingStore.vehicles.find(
                    v => v.id === session.vehicleId,
                  )
                  // Find the zone for this session
                  const zone = parkingStore.parkingZones.find(
                    z => z.id === session.parkingZoneId,
                  )

                  // Calculate time remaining using current time state
                  const endTime = session.plannedEndTime
                    ? new Date(session.plannedEndTime)
                    : null
                  const timeRemaining = endTime
                    ? Math.max(0, endTime.getTime() - currentTime.getTime())
                    : 0
                  const minutesRemaining = Math.floor(timeRemaining / 60000)
                  const hoursRemaining = Math.floor(minutesRemaining / 60)
                  const minsRemaining = minutesRemaining % 60

                  const timeDisplay =
                    hoursRemaining > 0
                      ? `${hoursRemaining}h ${minsRemaining}m`
                      : `${minsRemaining}mins`

                  const expiryTime = endTime
                    ? endTime.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : 'N/A'
                  const isExpired = endTime
                    ? currentTime.getTime() >= endTime.getTime()
                    : false

                  const handleStopSession = debounce(() => {
                    parkingStore.showAlert({
                      title: 'Stop Parking Session',
                      message:
                        'Are you sure you want to stop this parking session?',
                      preset: 'error',
                      onConfirm: async () => {
                        try {
                          await parkingStore.endParkingSession(session.id)
                          parkingStore.hideAlert()
                          parkingStore.showDialog({
                            isSuccess: true,
                            message: 'Session Stopped',
                            subMessage:
                              'Your parking session has been ended successfully',
                          })
                        } catch (error) {
                          console.error('Failed to stop session:', error)
                          parkingStore.showAlert({
                            title: 'Error',
                            message:
                              'Failed to stop parking session. Please try again.',
                            preset: 'error',
                          })
                        }
                      },
                    })
                  }, 300)

                  const handleExtendSession = debounce(async () => {
                    const hasExpired =
                      endTime !== null && Date.now() >= endTime.getTime()

                    if (hasExpired) {
                      await parkingStore.checkAndExpireSessions()
                      parkingStore.showAlert({
                        title: 'Session Expired',
                        message:
                          'This parking session has already ended and can no longer be extended.',
                        preset: 'warning',
                      })
                      return
                    }

                    // Set the session for extension
                    parkingStore.setExtendingSession(session.id)
                    // Set the zone and vehicle for booking
                    const sessionZone = parkingStore.parkingZones.find(
                      z => z.id === session.parkingZoneId,
                    )
                    if (sessionZone) {
                      parkingStore.setSelectedParkingZone(sessionZone)
                    }
                    parkingStore.setBookingVehicle(session.vehicleId)
                    // Navigate to book-parking screen
                    router.push('/screens/parking/book-parking')
                  }, 300)

                  return (
                    <View key={session.id} style={styles.activityCard}>
                      <View style={styles.activityHeader}>
                        <View style={styles.activityIcon}>
                          <Ionicons
                            name="car"
                            size={24}
                            color={theme.colors.palette.primary500}
                          />
                        </View>
                        <Text style={styles.activityTime}>{timeDisplay}</Text>
                      </View>

                      <Text style={styles.activityExpiry}>
                        Expires today, {expiryTime}
                      </Text>

                      <View style={styles.activityDetails}>
                        {vehicle && (
                          <View style={styles.detailBadge}>
                            <Text style={styles.detailText}>
                              {vehicle.plateNumber}
                            </Text>
                          </View>
                        )}
                        {zone && (
                          <View style={styles.detailBadge}>
                            <Text style={styles.detailText}>
                              {zone.zoneCode || zone.name}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.activityActions}>
                        <TouchableOpacity
                          style={styles.extendButton}
                          onPress={handleExtendSession}
                          disabled={isExpired}
                        >
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color={theme.colors.palette.neutral200}
                          />
                          <Text style={styles.extendButtonText}>Extend</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.stopButton}
                          onPress={handleStopSession}
                        >
                          <Ionicons
                            name="stop-circle-outline"
                            size={16}
                            color={theme.colors.palette.neutral200}
                          />
                          <Text style={styles.stopButtonText}>Stop</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                })}
              </ScrollView>
            </View>
          ) : parkingStore.completedParkingSessions.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} preset="subheading">
                  Recent Activity
                </Text>
                <TouchableOpacity onPress={handleNavigateToHistory}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.activityScrollContent}
              >
                {parkingStore.completedParkingSessions
                  .slice(0, 5)
                  .map(session => {
                    const vehicle = parkingStore.vehicles.find(
                      v => v.id === session.vehicleId,
                    )
                    const zone = parkingStore.parkingZones.find(
                      z => z.id === session.parkingZoneId,
                    )

                    const formatDate = (dateStr: string) => {
                      const date = new Date(dateStr)
                      const today = new Date()
                      const diffDays = Math.floor(
                        (today.getTime() - date.getTime()) /
                          (1000 * 60 * 60 * 24),
                      )

                      if (diffDays === 0) return 'Today'
                      if (diffDays === 1) return 'Yesterday'
                      if (diffDays < 7) return `${diffDays} days ago`

                      return date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    }

                    const getStatusColor = (status: string) => {
                      return status === 'completed'
                        ? theme.colors.palette.success500
                        : theme.colors.palette.angry500
                    }

                    return (
                      <TouchableOpacity
                        key={session.id}
                        style={styles.activityCard}
                        onPress={() => handleNavigateToDetails(session.id)}
                      >
                        <View style={styles.activityHeader}>
                          <View style={styles.activityIcon}>
                            <Ionicons
                              name="location"
                              size={24}
                              color={theme.colors.palette.primary500}
                            />
                          </View>
                          <View
                            style={[
                              styles.historyStatusBadge,
                              {
                                backgroundColor: getStatusColor(session.status),
                              },
                            ]}
                          >
                            <Text style={styles.historyStatusText}>
                              {session.status}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.historyZoneName} numberOfLines={1}>
                          {zone?.name || 'Unknown Zone'}
                        </Text>

                        <Text
                          style={styles.historyVehicleName}
                          numberOfLines={1}
                        >
                          {vehicle
                            ? `${vehicle.make} ${vehicle.model}`
                            : 'Unknown Vehicle'}
                        </Text>

                        <View style={styles.activityDetails}>
                          <View style={styles.detailBadge}>
                            <Text style={styles.detailText}>
                              {session.startTime
                                ? formatDate(session.startTime)
                                : 'N/A'}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.historyAmount}>
                          ${session.chargedAmount.toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={[
                  theme.colors.palette.neutral200,
                  theme.colors.palette.neutral300,
                ]}
                style={styles.emptyIconGradient}
              >
                <Ionicons
                  name="time-outline"
                  size={64}
                  color={theme.colors.palette.neutral500}
                />
              </LinearGradient>
              <Text style={styles.emptyText}>No recent history</Text>
              <Text style={styles.emptySubtext}>
                Your parking sessions and activity will appear here
              </Text>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            {quickActions.map(action => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionCard}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: action.bgColor },
                  ]}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={28}
                    color={action.color}
                  />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

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
      </SafeAreaView>
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
    headerGradient: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 20,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerTitle: {
      color: theme.colors.palette.neutral100,
    },
    notificationButton: {
      padding: 8,
    },
    notificationIconContainer: {
      position: 'relative',
    },
    notificationBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      backgroundColor: theme.colors.palette.angry500,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    notificationBadgeText: {
      color: theme.colors.palette.neutral100,
      fontSize: 12,
      fontWeight: '600',
    },
    searchContainer: {
      marginTop: 4,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    searchPlaceholder: {
      flex: 1,
      marginLeft: 12,
      fontSize: 16,
      color: theme.colors.palette.neutral500,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 120,
    },
    nearestLocationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      marginHorizontal: 24,
      marginTop: 20,
      marginBottom: 24,
      padding: 12,
      borderRadius: 12,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    nearestLocationIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    nearestLocationText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      marginBottom: 16,
    },
    sectionTitle: {
      color: theme.colors.palette.neutral900,
    },
    activityTitle: {
      color: theme.colors.palette.neutral900,
      paddingHorizontal: 24,
      marginBottom: 16,
    },
    viewAllText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
    },
    activityScrollContent: {
      paddingHorizontal: 24,
      gap: 12,
    },
    activityCard: {
      width: 300,
      backgroundColor: theme.colors.palette.neutral100,
      padding: 20,
      borderRadius: 20,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 5,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
    },
    activityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    activityIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    activityTime: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.palette.primary500,
    },
    activityExpiry: {
      fontSize: 13,
      color: theme.colors.palette.neutral600,
      marginBottom: 16,
      fontWeight: '500',
    },
    activityDetails: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    detailBadge: {
      backgroundColor: theme.colors.palette.primary100,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary200,
    },
    detailText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
    },
    activityActions: {
      flexDirection: 'row',
      gap: 10,
    },
    extendButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.palette.primary500,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      gap: 6,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary200,
    },
    extendButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.neutral200,
    },
    stopButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.palette.angry500,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      gap: 6,
    },
    stopButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral200,
    },
    historyStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    historyStatusText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
      textTransform: 'capitalize',
    },
    historyZoneName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    historyVehicleName: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.palette.neutral700,
      marginBottom: 12,
    },
    historyAmount: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.palette.primary500,
      marginTop: 8,
    },
    quickActionsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      gap: 12,
    },
    quickActionCard: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
      padding: 16,
      borderRadius: 20,
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
    },
    quickActionIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    quickActionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      textAlign: 'center',
      lineHeight: 16,
    },
    emptyContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 24,
    },
    emptyIconGradient: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.palette.neutral600,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.palette.neutral400,
      textAlign: 'center',
    },
  })

export default HomeScreen
