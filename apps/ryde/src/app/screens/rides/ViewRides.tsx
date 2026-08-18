// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Text, Icon, Screen, useTheme, Theme } from '@andojo/shared-theme'
import { queries } from '@/db/queries'
import { useStores } from '@/models/helpers/useStores'
import Sedan from '../../../../assets/images/cabs/sedan.svg'
import Suv from '../../../../assets/images/cabs/suv.svg'
import Van from '../../../../assets/images/cabs/van.svg'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { IconTypes } from '@andojo/shared-theme/src/components/Icon'
import { Ionicons } from '@expo/vector-icons'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { isDatabaseReady } from '@/db'
import { getAppResetting } from '@/utils/deeplinkHandler'
import { observer } from 'mobx-react-lite'

// Manually defining types based on schema.ts for clarity
// In a larger app, these could be generated or inferred with Zod.
type Ride = NonNullable<Awaited<ReturnType<typeof queries.getRideById>>>
type Driver = NonNullable<Awaited<ReturnType<typeof queries.getDriverById>>>
type RideOption = NonNullable<
  Awaited<ReturnType<typeof queries.getRideOptionById>>
>

const RideTypeImages: Record<string, React.FC<any>> = {
  Sedan,
  SUV: Suv,
  'Mini Van': Van,
}

const getStatusColors = (colors: Theme['colors']): Record<string, string> => ({
  completed: colors.palette.primary400,
  ongoing: colors.palette.secondary400,
  'driver-assigned': colors.palette.accent400,
  booked: colors.palette.neutral500,
  cancelled: colors.palette.angry500,
})

const statusLabels: Record<string, string> = {
  completed: 'Completed',
  ongoing: 'Ongoing',
  'driver-assigned': 'Driver Assigned',
  booked: 'Booked',
  cancelled: 'Cancelled',
}

const parseLocation = (locationString: string | null | undefined) => {
  if (!locationString) return 'Unknown Location'
  try {
    const location = JSON.parse(locationString)
    return location.placename || locationString
  } catch (error) {
    return locationString
  }
}

function ViewRides() {
  const { theme } = useTheme()
  const colors = theme.colors
  const styles = createStyles(colors)
  const statusColors = getStatusColors(colors)

  // Inner components that use styles
  const LocationRow = ({
    icon,
    location,
    color,
  }: {
    icon: IconTypes
    location: string
    color?: string
  }) => (
    <View style={styles.locationRow}>
      <Icon
        icon={icon}
        size={20}
        style={[styles.locationIcon, color ? { tintColor: color } : {}]}
      />
      <Text style={styles.locationText} numberOfLines={1}>
        {location}
      </Text>
    </View>
  )

  const DetailItem = ({ icon, text }: { icon: IconTypes; text: string }) => (
    <View style={styles.detailItem}>
      <Icon icon={icon} size={16} style={styles.detailIcon} />
      <Text size="small" style={styles.detailText}>
        {text}
      </Text>
    </View>
  )

  const { userStore, sessionStore, uiStore } = useStores()
  const userId = userStore.currentUser?.id
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [rideOptions, setRideOptions] = useState<Record<number, RideOption>>({})
  const [drivers, setDrivers] = useState<Record<number, Driver>>({})
  const router = useRouter()
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('History', '/(tabs)/history')

  // Load session data from interaction tracking
  useEffect(() => {
    if (sessionTimeStamp) {
      try {
        const session = sessionStore.getSession()
        const sessionInfo = session?.data as any

        if (sessionInfo?.sessionData?.formData) {
          const formData = sessionInfo.sessionData.formData
          // Restore rides data if available
          if (formData.rides && Array.isArray(formData.rides)) {
            setRides(formData.rides)
          }

          // Restore ride options if available
          if (
            formData.rideOptions &&
            typeof formData.rideOptions === 'object'
          ) {
            setRideOptions(formData.rideOptions)
          }

          // Restore drivers if available
          if (formData.drivers && typeof formData.drivers === 'object') {
            setDrivers(formData.drivers)
          }

          // Restore loading states
          if (typeof formData.loading === 'boolean') {
            setLoading(formData.loading)
          }

          if (typeof formData.refreshing === 'boolean') {
            setRefreshing(formData.refreshing)
          }

          // Navigate to selected ride if specified
          if (formData.selectedRideId) {
            setTimeout(() => {
              router.push(
                `/screens/rides/RideDetails?rideId=${formData.selectedRideId}`,
              )
            }, 1000)
          }

          // Track restoration
          trackContentChange({
            event: 'session_restored',
            sessionId,
            ridesCount: formData.rides?.length || 0,
            timestamp: Date.now(),
          })
        }
      } catch (error) {
        console.error('Error loading ViewRides session data:', error)
      }
    }
  }, [sessionTimeStamp, sessionStore, sessionId])

  // Track state changes and save to session AFTER data is loaded
  useEffect(() => {
    if (sessionId && rides.length > 0 && !sessionTimeStamp) {
      console.log('Saving rides data to session:', {
        ridesCount: rides.length,
        rideOptionsCount: Object.keys(rideOptions).length,
        driversCount: Object.keys(drivers).length,
      })

      trackContentChange({
        rides, // Save the actual rides array like orders.tsx does
        rideOptions,
        drivers,
        loading,
        refreshing,
        lastUpdated: Date.now(),
        screen: 'ViewRides',
        route: '/(tabs)/history',
        ridesCount: rides.length,
        rideOptionsCount: Object.keys(rideOptions).length,
        driversCount: Object.keys(drivers).length,
      })
    }
  }, [
    rides,
    rideOptions,
    drivers,
    loading,
    refreshing,
    sessionId,
    sessionTimeStamp,
    trackContentChange,
  ])

  // Track ride selection
  const handleRidePress = useCallback(
    (rideId: number) => {
      trackClick('rideCard')

      // Track ride selection
      trackContentChange({
        selectedRideId: rideId,
        action: 'ride_selected',
        timestamp: Date.now(),
      })

      router.push(`/screens/rides/RideDetails?rideId=${rideId}`)
    },
    [trackClick, trackContentChange, router],
  )

  // Helper function to retry database operations
  const retryDatabaseOperation = async (
    operation: () => Promise<any>,
    maxRetries = 5,
  ) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Check if app is being reset before attempting operation
        if (getAppResetting()) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          continue
        }

        // Check if database is ready
        if (!isDatabaseReady()) {
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }

        return await operation()
      } catch (error: any) {
        const errorMessage = error?.message || ''

        // Check if it's a database connection/reset related error
        const isDatabaseError =
          errorMessage.includes('Access to closed resource') ||
          errorMessage.includes('Database not ready') ||
          errorMessage.includes('database is locked') ||
          errorMessage.includes('no such table') ||
          errorMessage.includes('database connection') ||
          errorMessage.includes('NativeDatabase.prepareSync') ||
          errorMessage.includes('Database not available')

        if (isDatabaseError && i < maxRetries - 1) {
          // Exponential backoff for database errors
          const delay = Math.min(1000 * Math.pow(2, i), 5000)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        // For other errors, use linear backoff
        if (i < maxRetries - 1) {
          const delay = 500 * (i + 1)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        throw error
      }
    }
  }

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      // Check if app is being reset
      if (getAppResetting()) {
        return
      }

      const ridesData = await retryDatabaseOperation(() =>
        queries.getRidesForUser(userId),
      )

      const driverIds = [
        ...new Set(ridesData.map((r: Ride) => r.driverId).filter(Boolean)),
      ] as number[]

      const driversData = await Promise.all(
        driverIds.map(id =>
          retryDatabaseOperation(() => queries.getDriverById(id)),
        ),
      )
      const validDrivers = driversData.filter((d): d is Driver => !!d)

      const rideOptionIds = [
        ...new Set(validDrivers.map(d => d.rideOptionId).filter(Boolean)),
      ] as number[]

      const rideOptionsData = await Promise.all(
        rideOptionIds.map(id =>
          retryDatabaseOperation(() => queries.getRideOptionById(id)),
        ),
      )
      const validRideOptions = rideOptionsData.filter(
        (o): o is RideOption => !!o,
      )

      const driversMap = validDrivers.reduce(
        (acc, driver) => {
          acc[driver.id] = driver
          return acc
        },
        {} as Record<number, Driver>,
      )

      const rideOptionsMap = validRideOptions.reduce(
        (acc, option) => {
          acc[option.id] = option
          return acc
        },
        {} as Record<number, RideOption>,
      )

      setRideOptions(rideOptionsMap)
      setDrivers(driversMap)
      setRides(ridesData)

      // Save rides data to session like orders.tsx does
      trackContentChange({
        action: 'fetch_rides_success',
        ridesCount: ridesData.length,
        rides: ridesData, // Save the actual rides array
        rideOptions: rideOptionsMap,
        drivers: driversMap,
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error('Failed to fetch ride data:', error)
      setRides([])

      trackContentChange({
        action: 'fetch_rides_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId])

  // Fetch data when component mounts or userId changes
  useEffect(() => {
    fetchData()
  }, [uiStore.mockDataAppendTime])

  // Refresh data when screen comes into focus (e.g., after creating a new ride)
  useFocusEffect(
    useCallback(() => {
      // Always fetch data like orders.tsx does
      fetchData()

      // Track screen mount when focused
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'History',
        route: '/(tabs)/history',
      })
    }, [fetchData]),
  )

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchData()
  }, [fetchData])

  useEffect(() => {
    trackScreenMount({
      userId,
      timestamp: Date.now(),
      ridesCount: rides.length,
    })
  }, [])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.palette.primary400} />
      </View>
    )
  }

  if (!userId) {
    trackContentChange({
      state: 'no_user',
      timestamp: Date.now(),
    })
    return (
      <View style={styles.centered}>
        <Text preset="heading">Please log in to view your rides.</Text>
      </View>
    )
  }

  if (!rides.length) {
    trackContentChange({
      state: 'no_rides',
      timestamp: Date.now(),
    })
    return (
      <View style={styles.centered}>
        <Text preset="subheading">You have no past rides.</Text>
      </View>
    )
  }

  return (
    <Screen>
      <LinearGradient
        colors={[colors.palette.neutral700, colors.palette.neutral800]}
        style={styles.bg}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              trackClick('backButton')
              router.back()
            }}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={colors.palette.neutral100}
            />
          </Pressable>
          <Text preset="heading" style={styles.title}>
            Your Rides
          </Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.palette.primary400}
              colors={[colors.palette.primary400]}
            />
          }
        >
          {rides.map(ride => {
            const driver = ride.driverId ? drivers[ride.driverId] : undefined
            const rideOption = driver?.rideOptionId
              ? rideOptions[driver.rideOptionId]
              : undefined
            const statusColor =
              statusColors[ride.status] || colors.palette.neutral500
            const statusLabel = statusLabels[ride.status] || ride.status
            const date = ride.startTime ? new Date(ride.startTime) : null
            const RideImage = rideOption?.name
              ? RideTypeImages[rideOption.name]
              : null

            return (
              <Pressable
                key={ride.id}
                style={styles.card}
                onPress={() => handleRidePress(ride.id)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.rideInfo}>
                    {RideImage ? (
                      <RideImage
                        width={40}
                        height={40}
                        style={styles.carIcon}
                      />
                    ) : (
                      <Icon icon={'view'} size={28} style={styles.carIcon} />
                    )}
                    <View>
                      <Text preset="subheading" style={styles.rideType}>
                        {rideOption?.name || 'Ride'}
                      </Text>
                      <Text size="tiny" style={styles.rideDate}>
                        {date ? date.toLocaleDateString() : '—'}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: statusColor },
                    ]}
                  >
                    <Text size="tiny" weight="bold" style={styles.statusText}>
                      {statusLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.locationContainer}>
                  <LocationRow
                    icon="menu"
                    location={parseLocation(ride.pickupLocation)}
                  />
                  <View style={styles.dots} />
                  <LocationRow
                    icon="check"
                    location={parseLocation(ride.dropLocation)}
                    color={colors.palette.primary400}
                  />
                </View>

                <View style={styles.detailsRow}>
                  <DetailItem
                    icon="settings"
                    text={driver?.name || 'No Driver'}
                  />
                  <DetailItem
                    icon="caretRight"
                    text={
                      ride.distanceKm ? `${ride.distanceKm.toFixed(1)} km` : '—'
                    }
                  />
                  <DetailItem
                    icon="lock"
                    text={
                      ride.fareAmount ? `$${ride.fareAmount.toFixed(2)}` : '—'
                    }
                  />
                </View>
              </Pressable>
            )
          })}
        </ScrollView>
      </LinearGradient>
    </Screen>
  )
}

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    bg: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    title: {
      color: colors.palette.neutral100,
      fontSize: 22,
      textAlign: 'center',
      fontWeight: 'bold',
      marginLeft: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginTop: 30,
    },
    backButton: {
      position: 'relative',
      top: 0,
      left: 0,
      zIndex: 10,
      backgroundColor: colors.palette.overlay20,
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      backgroundColor: colors.palette.neutral800,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.palette.neutral700,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    rideInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    carIcon: {
      marginRight: 12,
      color: colors.palette.primary400,
    },
    rideType: {
      color: colors.palette.neutral100,
      fontWeight: 'bold',
    },
    rideDate: {
      color: colors.palette.neutral400,
      marginTop: 2,
    },
    statusPill: {
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    statusText: {
      color: colors.palette.neutral100,
      textTransform: 'uppercase',
      fontSize: 10,
    },
    locationContainer: {
      paddingHorizontal: 8,
      marginBottom: 16,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    locationIcon: {
      marginRight: 12,
      tintColor: colors.palette.neutral300,
    },
    locationText: {
      color: colors.palette.neutral100,
      flex: 1,
    },
    dots: {
      height: 12,
      width: 2,
      backgroundColor: colors.palette.neutral600,
      marginLeft: 9,
      marginVertical: 4,
    },
    detailsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: 12,
      borderTopWidth: 1,
      borderColor: colors.palette.neutral600,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detailIcon: {
      marginRight: 6,
      tintColor: colors.palette.neutral400,
    },
    detailText: {
      color: colors.palette.neutral200,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.palette.neutral800,
    },
  })

export default observer(ViewRides)
