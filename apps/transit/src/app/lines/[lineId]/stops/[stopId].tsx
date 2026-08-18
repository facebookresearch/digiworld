// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { typography, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import {
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import LinearGradient from 'react-native-linear-gradient'
import { queries } from '@/db/queries'
import { useStores } from '@/models'

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

const StopScheduleScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { trackScreenMount } = useInteractionTracking(
    'StopSchedule',
    '/lines/[lineId]/stops/[stopId]',
  )
  const router = useRouter()
  const params = useLocalSearchParams()
  const {
    stopScheduleStore: { stopScheduleState },
  } = useStores()
  const canExecute = useDebounceRef(300)

  const [stopVehicles, setStopVehicles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Get values from store (with fallback to params for initial render)
  const stopName = stopScheduleState.stopName || (params.stopName as string)

  // Initialize/store params in store (only if they're actual values, not template strings)
  useEffect(() => {
    const paramStopId = params.stopId as string | undefined
    const paramStopName = params.stopName as string | undefined
    const paramLineId = params.lineId as string | undefined

    // Only update if param is a real value (not a template string like "[stopId]")
    const isValidParam = (param: string | undefined) => {
      return param && !param.startsWith('[') && !param.endsWith(']')
    }

    if (
      paramStopId &&
      isValidParam(paramStopId) &&
      paramStopId !== stopScheduleState.stopId
    ) {
      stopScheduleState.setStopId(paramStopId)
    }
    if (
      paramStopName &&
      isValidParam(paramStopName) &&
      paramStopName !== stopScheduleState.stopName
    ) {
      stopScheduleState.setStopName(paramStopName)
    }
    if (
      paramLineId &&
      isValidParam(paramLineId) &&
      paramLineId !== stopScheduleState.lineId
    ) {
      stopScheduleState.setLineId(paramLineId)
    }
  }, [params.stopId, params.stopName, params.lineId, stopScheduleState])

  // Load schedule when stopId or showFullSchedule changes
  useEffect(() => {
    // Use store value first, fallback to params only if it's a valid value (not template string)
    const paramStopId = params.stopId as string | undefined
    const isValidParam = (param: string | undefined) => {
      return param && !param.startsWith('[') && !param.endsWith(']')
    }
    const currentStopId =
      stopScheduleState.stopId ||
      (isValidParam(paramStopId) ? paramStopId : undefined)

    if (!currentStopId) {
      return
    }

    const loadData = async () => {
      try {
        setIsLoading(true)
        const vehicles = await queries.getVehiclesByStop(
          currentStopId,
          stopScheduleState.showFullSchedule,
        )

        setStopVehicles(vehicles)
      } catch (error) {
        setStopVehicles([])
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [
    stopScheduleState.stopId,
    stopScheduleState.showFullSchedule,
    params.stopId,
  ])

  // Track screen mount
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'StopSchedule',
        route: '/lines/[lineId]/stops/[stopId]',
      })
    }, [trackScreenMount]),
  )

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()

    // Pulse animation for live indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [])

  const directionFilters = [
    { id: 'all', name: 'All', icon: 'swap-horizontal' },
    { id: 'out', name: 'Outbound', icon: 'arrow-forward' },
    { id: 'in', name: 'Inbound', icon: 'arrow-back' },
  ]

  // Get unique lines from vehicles (memoized)
  const uniqueLines = useMemo(() => {
    const lines = Array.from(new Set(stopVehicles.map(v => v.lineId))).map(
      lineId => {
        const vehicle = stopVehicles.find(v => v.lineId === lineId)
        return {
          id: lineId,
          shortName: vehicle?.lineShortName,
          color: vehicle?.lineColor,
        }
      },
    )
    return lines
  }, [stopVehicles])

  const isFullDayView = stopScheduleState.showFullSchedule
  // Filter by both direction and line (memoized to react to store changes)
  const filteredVehicles = useMemo(() => {
    const filtered = stopVehicles.filter(vehicle => {
      const directionMatch =
        stopScheduleState.selectedDirection === 'all' ||
        vehicle.direction === stopScheduleState.selectedDirection
      const lineMatch =
        stopScheduleState.selectedLine === 'all' ||
        vehicle.lineId === stopScheduleState.selectedLine
      return directionMatch && lineMatch
    })
    return filtered
  }, [
    stopVehicles,
    stopScheduleState.selectedDirection,
    stopScheduleState.selectedLine,
  ])

  // Debounced back handler
  const handleBack = useCallback(() => {
    if (!canExecute()) return

    // Check if we can go back in navigation stack
    if (router.canGoBack()) {
      router.back()
    } else {
      // If no back stack (e.g., deeplink cold start), go to lines tab
      router.replace('/(tabs)/lines')
    }
  }, [canExecute, router])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons
            name="arrow-back"
            size={28}
            color={theme.colors.palette.neutral900}
          />
        </TouchableOpacity>
        <View style={styles.stopHeaderInfo}>
          <Text style={styles.stopHeaderName}>{stopName}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Line Filters */}
      {uniqueLines.length > 1 && (
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            key="all-lines"
            style={[
              styles.lineFilterChip,
              stopScheduleState.selectedLine === 'all' &&
                styles.lineFilterChipActive,
            ]}
            onPress={() => stopScheduleState.setSelectedLine('all')}
            activeOpacity={0.7}
          >
            <Text
              style={
                stopScheduleState.selectedLine === 'all'
                  ? styles.lineFilterTextActive
                  : styles.lineFilterText
              }
            >
              All Lines
            </Text>
          </TouchableOpacity>
          {uniqueLines.map(line => {
            const isSelected = stopScheduleState.selectedLine === line.id
            return (
              <TouchableOpacity
                key={line.id}
                style={[
                  styles.lineFilterChip,
                  isSelected && styles.lineFilterChipActive,
                  isSelected && { backgroundColor: line.color },
                ]}
                onPress={() => stopScheduleState.setSelectedLine(line.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={
                    isSelected
                      ? styles.lineFilterTextActive
                      : styles.lineFilterText
                  }
                >
                  {line.shortName}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {/* Direction Filters */}
      <View style={styles.filtersContainer}>
        {directionFilters.map(filter => {
          const isSelected = stopScheduleState.selectedDirection === filter.id
          return (
            <TouchableOpacity
              key={filter.id}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() =>
                stopScheduleState.setSelectedDirection(
                  filter.id as 'all' | 'out' | 'in',
                )
              }
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  filter.icon as
                    | 'swap-horizontal'
                    | 'arrow-forward'
                    | 'arrow-back'
                }
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
                {filter.name}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={styles.scheduleHeader}>
        <View style={styles.scheduleHeaderLeft}>
          <Animated.View
            style={[
              styles.liveIndicator,
              { transform: [{ scale: pulseAnim }] },
            ]}
          />
          <Text style={styles.scheduleHeaderText}>
            {stopScheduleState.showFullSchedule
              ? 'Full Schedule'
              : 'Live Arrivals'}{' '}
            ({filteredVehicles.length})
          </Text>
        </View>
        <TouchableOpacity
          style={styles.scheduleToggle}
          onPress={() =>
            stopScheduleState.setShowFullSchedule(
              !stopScheduleState.showFullSchedule,
            )
          }
          activeOpacity={0.7}
        >
          <Ionicons
            name={isFullDayView ? 'time' : 'calendar'}
            size={18}
            color={theme.colors.palette.secondary500}
          />
          <Text style={styles.scheduleToggleText}>
            {isFullDayView ? 'Full Day' : 'Upcoming'}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.secondary500}
          />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredVehicles}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const isOutbound = item.direction === 'out'
            const isPast = item.isPast
            const getModeIcon = () => {
              if (item.mode === 'bus') return 'bus'
              if (item.mode === 'train') return 'train'
              if (item.mode === 'subway') return 'subway'
              return 'bus'
            }

            return (
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                }}
              >
                <View
                  style={[
                    styles.scheduleItem,
                    isPast && styles.scheduleItemPast,
                  ]}
                >
                  {/* Mode Icon */}
                  <LinearGradient
                    colors={
                      isOutbound
                        ? [
                            theme.colors.palette.primary500,
                            theme.colors.palette.primary600,
                          ]
                        : [
                            theme.colors.palette.secondary400,
                            theme.colors.palette.secondary500,
                          ]
                    }
                    style={styles.modeIconContainer}
                  >
                    <Ionicons
                      name={getModeIcon() as 'bus' | 'train' | 'subway'}
                      size={24}
                      color={theme.colors.palette.neutral100}
                    />
                  </LinearGradient>

                  {/* Schedule Info */}
                  <View style={styles.scheduleInfo}>
                    <View style={styles.scheduleTopRow}>
                      <View style={styles.timeContainer}>
                        <View style={styles.timeRow}>
                          <Text
                            style={[
                              styles.scheduleTime,
                              isPast && styles.scheduleTimePast,
                            ]}
                          >
                            {item.nextArrival}
                          </Text>
                          {isPast && (
                            <View style={styles.pastBadge}>
                              <Text style={styles.pastBadgeText}>Past</Text>
                            </View>
                          )}
                        </View>
                        <View
                          style={[
                            styles.directionBadge,
                            isOutbound
                              ? styles.directionBadgeOut
                              : styles.directionBadgeIn,
                          ]}
                        >
                          <Ionicons
                            name={isOutbound ? 'arrow-forward' : 'arrow-back'}
                            size={12}
                            color={
                              isOutbound
                                ? theme.colors.palette.primary600
                                : theme.colors.palette.secondary500
                            }
                          />
                          <Text
                            style={[
                              styles.directionText,
                              isOutbound
                                ? styles.directionTextOut
                                : styles.directionTextIn,
                            ]}
                          >
                            {isOutbound ? 'Outbound' : 'Inbound'}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.vehicleBadge,
                          {
                            backgroundColor:
                              item.lineColor || theme.colors.palette.primary400,
                          },
                        ]}
                      >
                        <Text style={styles.lineShortName}>
                          {item.lineShortName}
                        </Text>
                        <Text style={styles.vehicleNumber}>
                          {item.vehicleNumber}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        item.status === 'delayed'
                          ? styles.statusBadgeDelayed
                          : styles.statusBadgeOnTime,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          item.status === 'delayed'
                            ? styles.statusDotDelayed
                            : styles.statusDotOnTime,
                        ]}
                      />
                      <Text
                        style={[
                          styles.scheduleStatus,
                          item.status === 'delayed' &&
                            styles.scheduleStatusDelayed,
                        ]}
                      >
                        {item.status === 'delayed' ? 'Delayed' : 'On Time'}
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            )
          }}
          ListEmptyComponent={
            <View style={styles.emptySchedule}>
              <LinearGradient
                colors={[
                  theme.colors.palette.neutral300,
                  theme.colors.palette.neutral400,
                ]}
                style={styles.emptyIconContainer}
              >
                <Ionicons
                  name="time-outline"
                  size={48}
                  color={theme.colors.palette.neutral500}
                />
              </LinearGradient>
              <Text style={styles.emptyScheduleText}>No upcoming arrivals</Text>
              <Text style={styles.emptyScheduleSubtext}>
                Check back later for schedule updates
              </Text>
            </View>
          }
          contentContainerStyle={styles.scheduleListContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral200,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.colors.palette.neutral100,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerSpacer: {
      width: 40,
    },
    stopHeaderInfo: {
      flex: 1,
      alignItems: 'center',
    },
    stopHeaderName: {
      fontSize: 16,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
      textAlign: 'center',
    },
    scheduleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.colors.palette.neutral100,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    scheduleHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    scheduleToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.palette.primary100,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary200,
    },
    scheduleToggleText: {
      fontSize: 12,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.primary400,
    },
    liveIndicator: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.palette.primary500,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 4,
      elevation: 2,
    },
    scheduleHeaderText: {
      fontSize: 14,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral700,
      letterSpacing: 0.3,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 15,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
    },
    scheduleListContent: {
      padding: 20,
      paddingBottom: 24,
    },
    scheduleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingVertical: 18,
      paddingHorizontal: 18,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 20,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
      shadowColor: theme.colors.palette.primary400,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    scheduleItemPast: {
      opacity: 0.5,
      backgroundColor: theme.colors.palette.neutral200,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    modeIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    scheduleInfo: {
      flex: 1,
      gap: 10,
    },
    scheduleTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    timeContainer: {
      flex: 1,
      gap: 6,
    },
    scheduleTime: {
      fontSize: 24,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
      letterSpacing: -0.5,
    },
    scheduleTimePast: {
      color: theme.colors.palette.neutral500,
      textDecorationLine: 'line-through',
    },
    pastBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: theme.colors.palette.neutral300,
      borderRadius: 8,
    },
    pastBadgeText: {
      fontSize: 10,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral600,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    directionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    directionBadgeOut: {
      backgroundColor: `${theme.colors.palette.primary200}CC`,
    },
    directionBadgeIn: {
      backgroundColor: `${theme.colors.palette.secondary100}CC`,
    },
    directionText: {
      fontSize: 11,
      fontFamily: typography.primary.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    directionTextOut: {
      color: theme.colors.palette.primary600,
    },
    directionTextIn: {
      color: theme.colors.palette.secondary500,
    },
    vehicleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 14,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 3,
    },
    lineShortName: {
      fontSize: 14,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
      letterSpacing: 0.5,
    },
    vehicleNumber: {
      fontSize: 11,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral100,
      opacity: 0.9,
      letterSpacing: 0.3,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      alignSelf: 'flex-start',
    },
    statusBadgeOnTime: {
      backgroundColor: `${theme.colors.palette.primary200}CC`,
    },
    statusBadgeDelayed: {
      backgroundColor: `${theme.colors.palette.angry100}E6`,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusDotOnTime: {
      backgroundColor: theme.colors.palette.primary500,
    },
    statusDotDelayed: {
      backgroundColor: theme.colors.palette.angry500,
    },
    scheduleStatus: {
      fontSize: 11,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.primary500,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    scheduleStatusDelayed: {
      color: theme.colors.palette.angry500,
    },
    emptySchedule: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      gap: 16,
    },
    emptyIconContainer: {
      width: 96,
      height: 96,
      borderRadius: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyScheduleText: {
      fontSize: 18,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral600,
    },
    emptyScheduleSubtext: {
      fontSize: 14,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral500,
      textAlign: 'center',
      maxWidth: 250,
    },
    filtersContainer: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.colors.palette.neutral100,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral200,
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
    },
    filterChipActive: {
      backgroundColor: theme.colors.palette.primary400,
      borderColor: theme.colors.palette.primary400,
      shadowColor: theme.colors.palette.primary400,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    filterChipText: {
      fontSize: 14,
      fontFamily: typography.primary.semiBold,
      color: `${theme.colors.palette.neutral900}A6`,
    },
    filterChipTextActive: {
      fontSize: 14,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral100,
    },
    lineFilterChip: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: `${theme.colors.palette.neutral900}0D`,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
    },
    lineFilterChipActive: {
      borderColor: 'transparent',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    lineFilterText: {
      fontSize: 14,
      fontFamily: typography.primary.bold,
      color: `${theme.colors.palette.neutral900}A6`,
    },
    lineFilterTextActive: {
      fontSize: 14,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
    },
  })

export default StopScheduleScreen
