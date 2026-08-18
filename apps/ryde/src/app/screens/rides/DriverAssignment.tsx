// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native'
import { colors } from '@andojo/shared-theme'
import { Text } from '@andojo/shared-theme/src/components'
import SedanSvg from '../../../../assets/images/cabs/sedan.svg'
import SuvSvg from '../../../../assets/images/cabs/suv.svg'
import VanSvg from '../../../../assets/images/cabs/van.svg'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useStores } from '@/models/helpers/useStores'
import { queries } from '@/db/queries'

// Helper to get initials from name
function getInitials(name: string) {
  const parts = name.split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const RideIcon = ({ name }: { name: string }) => {
  try {
    switch (name.toLowerCase()) {
      case 'sedan':
        return <SedanSvg width={48} height={48} />
      case 'suv':
        return <SuvSvg width={48} height={48} />
      case 'mini van':
      case 'van':
        return <VanSvg width={48} height={48} />
      default:
        return <SedanSvg width={48} height={48} />
    }
  } catch (error) {
    return null
  }
}

interface DriverInfoProps {
  rideId?: number | string
  rideOptionId?: number
  onCancel?: () => void
  onRefresh?: () => void
  carReachedDestination?: boolean
}

const AnimatedDot = () => {
  const scale = React.useRef(new Animated.Value(1)).current
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.5,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
    ).start()
  }, [scale])
  return (
    <View style={styles.dotWrapper}>
      <Animated.View
        style={[
          styles.animatedDot,
          styles.animatedDotShadow,
          {
            transform: [{ scale }],
          },
        ]}
      />
    </View>
  )
}

const DriverAssignment: React.FC<DriverInfoProps> = ({
  onCancel,
  onRefresh,
  carReachedDestination,
}) => {
  const { rideStore } = useStores()
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)
  const currentRide = rideStore.currentRide
  const status = currentRide?.status
  const [hasArrived, setHasArrived] = React.useState(false)
  const [driver, setDriver] = React.useState<any>(null)

  // Fetch driver details when driverId changes
  React.useEffect(() => {
    const fetchDriver = async () => {
      if (!currentRide?.driverId) return
      try {
        rideStore.setLoadingDriver(true)
        const driverData = await queries.getDriverById(currentRide.driverId)
        setDriver(driverData)
      } catch (error) {
        console.error('Error fetching driver:', error)
      } finally {
        rideStore.setLoadingDriver(false)
      }
    }
    fetchDriver()
  }, [currentRide?.driverId])

  React.useEffect(() => {
    if (!currentRide) return
    const timer = setInterval(() => {
      const shouldArrive = Math.random() > 0.5
      if (shouldArrive) {
        rideStore.setDriverArrived(true)
        clearInterval(timer)
      }
    }, 5000)

    return () => {
      clearInterval(timer)
      rideStore.setDriverArrived(false)
    }
  }, [currentRide])

  // Timer effect for assigning driver after 15 seconds
  React.useEffect(() => {
    if (status === 'booked') {
      timerRef.current = setTimeout(() => {
        // Only assign driver if not already assigned
        if (!currentRide?.driverId) {
          rideStore.assignDriver()
        }
      }, 15000)
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [status, rideStore, currentRide])

  // Check if driver has arrived (when bike animation completes)
  useEffect(() => {
    if (status === 'driver-assigned') {
      // Set a timeout to simulate arrival after bike animation (30 seconds)
      const arrivalTimer = setTimeout(() => {
        setHasArrived(true)
      }, 30000)
      return () => clearTimeout(arrivalTimer)
    } else {
      setHasArrived(false)
    }
  }, [status])

  // If no current ride, don't render anything
  if (!currentRide) {
    return null
  }

  // On refresh, immediately assign driver and clear timer
  const handleRefresh = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (status === 'booked') {
      // Only assign driver if not already assigned
      if (!currentRide?.driverId) {
        rideStore.assignDriver()
      }
    } else if (status === 'driver-assigned') {
      rideStore.startRide()
    } else if (status === 'ongoing') {
      rideStore.completeRide()
    }

    if (onRefresh) onRefresh()
  }

  if (status === 'booked') {
    return (
      <LinearGradient
        colors={[colors.palette.neutral700, colors.palette.neutral800]}
        style={styles.sheet}
      >
        <View style={styles.refreshRow}>
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshButton}
          >
            <Ionicons
              name="refresh"
              size={22}
              color={colors.palette.primary400}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.findingTitle}>Finding you a nearby driver...</Text>
        <Text style={styles.findingSubtitle}>
          The driver will pick you up as soon as possible at your location.
        </Text>
        <AnimatedDot />
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            try {
              if (status === 'booked') {
                // For booked rides, just clear the current ride without storing in history
                rideStore.clearCurrentRide()
              } else {
                // For rides with driver assigned, cancel properly and store in history
                const rideId = currentRide?.id
                if (rideId) {
                  rideStore.cancelRide(rideId, 'User cancelled')
                }
              }
              // Always call onCancel for UI cleanup
              if (onCancel) onCancel()
            } catch (error) {
              console.error('Error cancelling ride:', error)
              if (onCancel) onCancel()
            }
          }}
        >
          <Ionicons
            name="close-circle-outline"
            size={20}
            color={colors.palette.neutral200}
          />
          <Text style={styles.cancelButtonText}>Cancel Ride</Text>
        </TouchableOpacity>
      </LinearGradient>
    )
  }

  if (status === 'driver-assigned' && driver) {
    return (
      <LinearGradient
        colors={[colors.palette.neutral700, colors.palette.neutral800]}
        style={styles.sheet}
      >
        {/* Driver on the way section */}
        <View style={styles.onTheWaySection}>
          <Text style={styles.onTheWayTitle}>
            {hasArrived ? 'Arrived at your location' : 'Driver is on the way'}
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshButton}
          >
            <Ionicons
              name="refresh"
              size={22}
              color={colors.palette.primary400}
            />
          </TouchableOpacity>
        </View>

        {rideStore.isLoadingDriver ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading driver details...</Text>
          </View>
        ) : (
          <>
            <View style={styles.row}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {getInitials(driver.name)}
                </Text>
              </View>
              <View style={styles.infoCol}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{driver.name}</Text>
                  {typeof driver.rating === 'number' && (
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingText}>
                        {driver.rating.toFixed(1)}
                      </Text>
                      <Ionicons
                        name="star"
                        size={16}
                        color={colors.palette.primary400}
                      />
                    </View>
                  )}
                </View>
                <Text style={styles.vehicleName}>{driver.vehicleName}</Text>
                <Text style={styles.vehicleNumber}>{driver.vehicleNumber}</Text>
              </View>
              <View style={styles.iconCol}>
                <RideIcon name={driver.vehicleType} />
              </View>
            </View>
            {/* Fare and Route Info */}
            <View style={styles.fareSection}>
              <View style={styles.fareColumn}>
                <Text style={styles.fareLabel}>Total Fare</Text>
                <Text style={styles.fareValue}>
                  ${currentRide?.fare ?? '--'}
                </Text>
              </View>
              <View style={styles.distanceColumn}>
                <Text style={styles.fareLabel}>Distance</Text>
                <Text style={styles.distanceValue}>
                  {currentRide?.distance
                    ? `${currentRide?.distance.toFixed(1)} km`
                    : '--'}
                </Text>
              </View>
            </View>
            <View style={styles.routeSection}>
              <View style={styles.routeRow}>
                <Ionicons
                  name="ellipse"
                  size={14}
                  color={colors.palette.neutral200}
                  style={styles.originIcon}
                />
                <Text style={styles.routeText}>{currentRide?.source}</Text>
              </View>
              <View style={styles.routeRow}>
                <Ionicons
                  name="location"
                  size={20}
                  color={colors.palette.neutral200}
                />
                <Text style={styles.routeText}>{currentRide?.destination}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                try {
                  // For rides with driver assigned, cancel properly and store in history
                  const rideId = currentRide?.id
                  if (rideId) {
                    rideStore.cancelRide(rideId, 'User cancelled')
                  }
                  // Always call onCancel for UI cleanup
                  if (onCancel) onCancel()
                } catch (error) {
                  console.error('Error cancelling ride:', error)
                  if (onCancel) onCancel()
                }
              }}
            >
              <Ionicons
                name="close-circle-outline"
                size={20}
                color={colors.palette.neutral200}
              />
              <Text style={styles.cancelButtonText}>Cancel Ride</Text>
            </TouchableOpacity>
          </>
        )}
      </LinearGradient>
    )
  }

  if (status === 'ongoing' && driver) {
    return (
      <LinearGradient
        colors={[colors.palette.neutral700, colors.palette.neutral800]}
        style={styles.sheet}
      >
        {/* Trip in progress section */}
        <View style={styles.onTheWaySection}>
          <Text style={styles.onTheWayTitle}>
            {carReachedDestination
              ? 'Reached your destination'
              : `Reaching in ${(currentRide?.distance ? currentRide?.distance * 2 : 0).toFixed(1)} Minutes`}
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshButton}
          >
            <Ionicons
              name="refresh"
              size={22}
              color={colors.palette.primary400}
            />
          </TouchableOpacity>
        </View>

        {rideStore.isLoadingDriver ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading driver details...</Text>
          </View>
        ) : (
          <>
            <View style={styles.row}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {getInitials(driver.name)}
                </Text>
              </View>
              <View style={styles.infoCol}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{driver.name}</Text>
                  {typeof driver.rating === 'number' && (
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingText}>
                        {driver.rating.toFixed(1)}
                      </Text>
                      <Ionicons
                        name="star"
                        size={16}
                        color={colors.palette.primary400}
                      />
                    </View>
                  )}
                </View>
                <Text style={styles.vehicleName}>{driver.vehicleName}</Text>
                <Text style={styles.vehicleNumber}>{driver.vehicleNumber}</Text>
              </View>
              <View style={styles.iconCol}>
                <RideIcon name={driver.vehicleType} />
              </View>
            </View>
            {/* Fare and Route Info */}
            <View style={styles.fareSection}>
              <View style={styles.fareColumn}>
                <Text style={styles.fareLabel}>Total Fare</Text>
                <Text style={styles.fareValue}>
                  ${currentRide?.fare ?? '--'}
                </Text>
              </View>
              <View style={styles.distanceColumn}>
                <Text style={styles.fareLabel}>Distance</Text>
                <Text style={styles.distanceValue}>
                  {currentRide?.distance
                    ? `${currentRide?.distance.toFixed(1)} km`
                    : '--'}
                </Text>
              </View>
            </View>
            <View style={styles.routeSection}>
              <View style={styles.routeRow}>
                <Ionicons
                  name="ellipse"
                  size={14}
                  color={colors.palette.neutral200}
                  style={styles.originIcon}
                />
                <Text style={styles.routeText}>{currentRide?.source}</Text>
              </View>
              <View style={styles.routeRow}>
                <Ionicons
                  name="location"
                  size={20}
                  color={colors.palette.neutral200}
                />
                <Text style={styles.routeText}>{currentRide?.destination}</Text>
              </View>
            </View>
          </>
        )}
      </LinearGradient>
    )
  }

  return null
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 32,
    shadowColor: colors.palette.neutral900,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
    zIndex: 100,
    borderTopWidth: 1,
    borderTopColor: colors.palette.overlay20,
  },
  findingTitle: {
    color: colors.palette.neutral200,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  findingSubtitle: {
    color: colors.palette.neutral200,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  dotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  animatedDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.palette.primary500,
    borderWidth: 4,
    borderColor: colors.palette.primary400,
  },
  animatedDotShadow: {
    shadowColor: colors.palette.primary400,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  refreshRow: {
    alignItems: 'flex-end',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.palette.overlay20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.palette.primary400,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: colors.palette.neutral200,
    fontSize: 24,
    fontWeight: 'bold',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    color: colors.palette.neutral200,
    fontSize: 18,
  },
  vehicleName: {
    color: colors.palette.neutral100,
    fontSize: 16,
    marginBottom: 2,
  },
  vehicleNumber: {
    color: colors.palette.neutral200,
    fontSize: 15,
  },
  iconCol: {
    marginLeft: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fareSection: {
    marginTop: 24,
    flexDirection: 'row',
    marginLeft: 12,
  },
  fareLabel: {
    color: colors.palette.neutral200,
    fontSize: 14,
    marginBottom: 2,
  },
  fareValue: {
    color: colors.palette.primary400,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  distanceValue: {
    color: colors.palette.neutral200,
    fontSize: 14,
    marginLeft: 8,
  },
  routeSection: {
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeText: {
    color: colors.palette.neutral200,
    fontSize: 16,
    marginLeft: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.palette.primary400,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  cancelButtonText: {
    color: colors.palette.neutral200,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  ratingText: {
    color: colors.palette.primary400,
    fontSize: 16,
    marginRight: 2,
  },
  originIcon: {
    marginRight: 8,
    borderColor: colors.palette.primary400,
    borderWidth: 2,
    borderRadius: 100,
  },
  onTheWaySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginLeft: 12,
  },
  onTheWayTitle: {
    color: colors.palette.neutral200,
    fontSize: 18,
  },
  fareColumn: {
    flex: 1,
    flexDirection: 'row',
  },
  distanceColumn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: colors.palette.neutral200,
    fontSize: 16,
    fontWeight: 'bold',
  },
})

export default DriverAssignment
