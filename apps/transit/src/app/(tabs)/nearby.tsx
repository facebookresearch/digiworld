import { useStores } from '@/models'
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'
import { Text, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'

interface NearbyStop {
  id: string
  name: string
  description?: string
  distance: number // in km
  latitude: number
  longitude: number
  modes: string[]
  lines: {
    id: string
    shortName: string
    name: string
    mode: string
    color: string
  }[]
  upcomingVehicles: {
    lineId: string
    vehicleNumber: string
    nextArrival: string
    direction: string
    lineColor?: string
    lineShortName?: string
    lineName?: string
  }[]
}

// Simple debounce using ref
const useDebounceRef = (delay: number = 300) => {
  const lastCallRef = useRef<number>(0)

  const canExecute = useCallback(() => {
    const now = Date.now()
    if (now - lastCallRef.current < delay) {
      return false
    }
    lastCallRef.current = now
    return true
  }, [delay])

  return canExecute
}

const NearbyScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { trackScreenMount } = useInteractionTracking('Nearby', '/nearby')
  const {
    userStore,
    nearbyStore: { nearbyState },
  } = useStores()
  const router = useRouter()
  const canExecute = useDebounceRef(300)

  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    trackScreenMount()

    // Fade in animation - faster to reduce lag
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()

    // Load data on initial mount if empty (e.g., after state restoration)
    if (
      !nearbyState.isLoading &&
      userStore.user?.id &&
      nearbyState.nearbyStops.length === 0
    ) {
      nearbyState.loadNearbyStops(userStore.user.id)
    }
  }, [])

  // Track screen focus with session data
  useFocusEffect(
    useCallback(() => {
      // Always load if:
      // 1. Not currently loading
      // 2. We have a user
      // 3. Data is empty (after state restoration or initial load)
      if (
        !nearbyState.isLoading &&
        userStore.user?.id &&
        nearbyState.nearbyStops.length === 0
      ) {
        nearbyState.loadNearbyStops(userStore.user.id)
      }

      trackScreenMount({
        timestamp: Date.now(),
        screen: 'Nearby',
        route: '/nearby',
      })
      return () => {
        getLatestInteraction()
      }
    }, [userStore.user?.id, nearbyState.nearbyStops.length]),
  )

  const modeFilters = [
    { id: 'all', name: 'All', icon: 'layers' },
    { id: 'bus', name: 'Bus', icon: 'bus' },
    { id: 'train', name: 'Train', icon: 'train' },
    { id: 'subway', name: 'Subway', icon: 'subway' },
  ]

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'bus':
        return 'bus'
      case 'train':
        return 'train'
      case 'subway':
        return 'subway'
      default:
        return 'location'
    }
  }

  const formatDistance = (distanceKm: number): string => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m`
    }
    return `${distanceKm.toFixed(1)} km`
  }

  const calculateMinutesUntilArrival = (arrivalTime: string): number => {
    const now = new Date()
    const [hours, minutes] = arrivalTime.split(':').map(Number)
    const arrival = new Date()
    arrival.setHours(hours, minutes, 0)

    // Handle next day if arrival time is before current time
    if (arrival.getTime() < now.getTime()) {
      arrival.setDate(arrival.getDate() + 1)
    }

    const diff = arrival.getTime() - now.getTime()
    return Math.max(0, Math.round(diff / 60000))
  }

  const getDirectionLabel = (direction: string): string => {
    return direction === 'out' ? 'Outbound' : 'Inbound'
  }

  const handleLinePress = useCallback(
    (lineId: string) => {
      if (!canExecute()) return
      router.push(`/lines/${lineId}`)
    },
    [canExecute, router],
  )

  const handleViewAllArrivals = useCallback(
    (stopId: string, stopName: string) => {
      if (!canExecute()) return
      // Navigate to stop schedule screen
      // We need to find the first line for this stop to get lineId
      const stop = nearbyState.nearbyStops.find(s => s.id === stopId)
      if (stop && stop.lines.length > 0) {
        const firstLine = stop.lines[0]
        router.push(
          `/lines/${firstLine.id}/stops/${stopId}?stopName=${encodeURIComponent(stopName)}&lineShortName=${encodeURIComponent(firstLine.shortName)}&lineColor=${encodeURIComponent(firstLine.color)}`,
        )
      }
    },
    [canExecute, router, nearbyState.nearbyStops],
  )

  const filteredStops = useMemo(
    () => nearbyState.filteredStops,
    [nearbyState.filteredStops],
  )

  const renderStopCard = useCallback(
    ({ item }: { item: NearbyStop }) => {
      const nextArrivals = item.upcomingVehicles.map(vehicle => {
        const line = item.lines.find(l => l.id === vehicle.lineId)
        const directionLabel = getDirectionLabel(vehicle.direction || 'out')
        const directionIcon = vehicle.direction === 'out' ? '→' : '←'

        return {
          lineId: vehicle.lineId,
          lineShortName: vehicle.lineShortName || line?.shortName || '',
          lineName: vehicle.lineName || line?.name || '',
          lineColor:
            vehicle.lineColor || line?.color || theme.colors.palette.primary400,
          direction: vehicle.direction || 'out',
          directionLabel,
          directionIcon,
          time: vehicle.nextArrival,
          minutes: calculateMinutesUntilArrival(vehicle.nextArrival),
          mode: line?.mode || 'bus',
          displayText: line
            ? `${line.shortName} ${directionIcon} ${line.name}`
            : vehicle.vehicleNumber,
        }
      })

      return (
        <Animated.View
          style={[
            styles.stopCard,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.stopCardContent}>
            {/* Stop Header */}
            <View style={styles.stopHeader}>
              <View style={styles.stopInfo}>
                <Text style={styles.stopName}>{item.name}</Text>
                <View style={styles.stopMeta}>
                  <Ionicons
                    name="walk"
                    size={14}
                    color={`${theme.colors.palette.neutral900}80`}
                  />
                  <Text style={styles.distance}>
                    {formatDistance(item.distance)}
                  </Text>
                </View>
              </View>
              <View style={styles.modesContainer}>
                {item.modes.map(mode => (
                  <View key={mode} style={styles.modeIcon}>
                    <Ionicons
                      name={
                        getModeIcon(mode) as
                          | 'bus'
                          | 'train'
                          | 'subway'
                          | 'location'
                      }
                      size={16}
                      color={theme.colors.palette.primary400}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Next Arrivals */}
            <View style={styles.arrivalsContainer}>
              {nextArrivals.length > 0 ? (
                nextArrivals.map((arrival, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.arrivalRow}
                    onPress={() => handleLinePress(arrival.lineId)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.arrivalLeft}>
                      <View
                        style={[
                          styles.lineBadge,
                          { backgroundColor: arrival.lineColor },
                        ]}
                      >
                        <Text style={styles.lineName}>
                          {arrival.lineShortName}
                        </Text>
                      </View>
                      <View style={styles.arrivalInfo}>
                        <Text style={styles.arrivalLineName}>
                          {arrival.lineName}
                        </Text>
                        <View style={styles.directionContainer}>
                          <View
                            style={[
                              styles.directionBadge,
                              arrival.direction === 'out'
                                ? styles.directionBadgeOut
                                : styles.directionBadgeIn,
                            ]}
                          >
                            <Text
                              style={StyleSheet.flatten([
                                styles.directionText,
                                arrival.direction === 'out'
                                  ? styles.directionTextOut
                                  : styles.directionTextIn,
                              ])}
                            >
                              {arrival.directionIcon} {arrival.directionLabel}
                            </Text>
                          </View>
                          <Text style={styles.arrivalTime}>{arrival.time}</Text>
                        </View>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.minutesBadge,
                        arrival.minutes <= 5 && styles.minutesBadgeUrgent,
                      ]}
                    >
                      <Text
                        style={
                          arrival.minutes <= 5
                            ? styles.minutesTextUrgent
                            : styles.minutesText
                        }
                      >
                        {arrival.minutes} min
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noArrivalsText}>No upcoming arrivals</Text>
              )}
            </View>

            {/* View Details */}
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() => handleViewAllArrivals(item.id, item.name)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewDetailsText}>View all arrivals</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.colors.palette.primary400}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )
    },
    [fadeAnim, handleLinePress, handleViewAllArrivals],
  )

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header with Gradient */}
        <LinearGradient
          colors={[
            theme.colors.palette.secondary500,
            theme.colors.palette.secondary500,
            theme.colors.palette.primary400,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Nearby Stops</Text>
              <Text style={styles.headerSubtitle}>
                {filteredStops.length} stops around you
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              activeOpacity={0.7}
              onPress={() =>
                nearbyState.loadNearbyStops(userStore.user?.id || 1)
              }
            >
              <Ionicons
                name="refresh"
                size={24}
                color={theme.colors.palette.neutral100}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Mode Filters */}
        <View style={styles.filtersContainer}>
          {modeFilters.map(mode => {
            const isSelected = nearbyState.selectedMode === mode.id
            return (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipActive,
                ]}
                onPress={() => nearbyState.setSelectedMode(mode.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={mode.icon as 'layers' | 'bus' | 'train' | 'subway'}
                  size={18}
                  color={
                    isSelected
                      ? theme.colors.palette.neutral100
                      : `${theme.colors.palette.neutral900}A6`
                  }
                />
                <Text
                  style={
                    isSelected
                      ? styles.filterChipTextActive
                      : styles.filterChipText
                  }
                >
                  {mode.name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Stops List */}
        {nearbyState.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.palette.primary400}
            />
            <Text style={styles.loadingText}>Finding nearby stops...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredStops}
            renderItem={renderStopCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            initialNumToRender={8}
            maxToRenderPerBatch={5}
            windowSize={5}
            updateCellsBatchingPeriod={100}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="location-outline"
                  size={64}
                  color={theme.colors.palette.neutral400}
                />
                <Text style={styles.emptyText}>No nearby stops found</Text>
                <Text style={styles.emptySubtext}>
                  Try adjusting your filters or location
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },
    safeArea: {
      flex: 1,
    },
    gradientHeader: {
      paddingTop: 30,
      paddingBottom: 24,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
      marginBottom: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      marginBottom: 6,
      textShadowColor: `${theme.colors.palette.neutral900}26`,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.palette.neutral100,
    },
    refreshButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: `${theme.colors.palette.neutral100}40`,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.palette.secondary500,
    },
    filtersContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingBottom: 16,
      gap: 10,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
      gap: 6,
    },
    filterChipActive: {
      backgroundColor: theme.colors.palette.primary400,
      borderColor: theme.colors.palette.primary400,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: `${theme.colors.palette.neutral900}A6`,
    },
    filterChipTextActive: {
      color: theme.colors.palette.neutral100,
      fontWeight: '600',
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    stopCard: {
      marginBottom: 16,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral100,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    stopCardContent: {
      padding: 18,
    },
    stopHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 14,
    },
    stopInfo: {
      flex: 1,
    },
    stopName: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 6,
    },
    stopMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    distance: {
      fontSize: 13,
      color: `${theme.colors.palette.neutral900}80`,
    },
    modesContainer: {
      flexDirection: 'row',
      gap: 6,
    },
    modeIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.palette.neutral100,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.colors.palette.primary400,
      shadowColor: theme.colors.palette.primary400,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 2,
    },
    arrivalsContainer: {
      gap: 10,
      marginBottom: 14,
    },
    arrivalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
    },
    arrivalLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    lineBadge: {
      backgroundColor: theme.colors.palette.primary400,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    lineName: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    arrivalTime: {
      fontSize: 13,
      fontWeight: '500',
      color: `${theme.colors.palette.neutral900}A6`,
    },
    arrivalInfo: {
      flex: 1,
      gap: 4,
    },
    arrivalLineName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
    directionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    directionBadge: {
      borderRadius: 6,
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    directionBadgeOut: {
      backgroundColor: `${theme.colors.palette.secondary100}E6`,
    },
    directionBadgeIn: {
      backgroundColor: `${theme.colors.palette.primary100}E6`,
    },
    directionText: {
      fontSize: 11,
      fontWeight: '600',
    },
    directionTextOut: {
      color: theme.colors.palette.secondary500,
    },
    directionTextIn: {
      color: theme.colors.palette.accent400,
    },
    minutesBadge: {
      backgroundColor: theme.colors.palette.neutral300,
      borderRadius: 12,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
    },
    minutesBadgeUrgent: {
      backgroundColor: `${theme.colors.palette.primary200}CC`,
      borderColor: theme.colors.palette.primary400,
    },
    minutesText: {
      fontSize: 13,
      fontWeight: '600',
      color: `${theme.colors.palette.neutral900}B3`,
    },
    minutesTextUrgent: {
      color: theme.colors.palette.primary400,
    },
    viewDetailsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral300,
      marginTop: 6,
    },
    viewDetailsText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.primary400,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 60,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: `${theme.colors.palette.neutral900}A6`,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 80,
      paddingHorizontal: 40,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: `${theme.colors.palette.neutral900}B3`,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: `${theme.colors.palette.neutral900}80`,
      marginTop: 8,
      textAlign: 'center',
    },
    noArrivalsText: {
      fontSize: 14,
      color: `${theme.colors.palette.neutral900}80`,
      fontStyle: 'italic',
      paddingVertical: 8,
    },
  })

export default NearbyScreen
