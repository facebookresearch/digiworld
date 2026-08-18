// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect } from 'react'
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { useTheme, Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@andojo/shared-theme/src/components'
import SedanSvg from '../../../../assets/images/cabs/sedan.svg'
import SuvSvg from '../../../../assets/images/cabs/suv.svg'
import VanSvg from '../../../../assets/images/cabs/van.svg'
import { LinearGradient } from 'expo-linear-gradient'
import { useStores } from '@/models/helpers/useStores'
import { observer } from 'mobx-react-lite'

type RideOptionsProps = {
  origin: string
  destination: string
  distance?: number | null
  onClose?: () => void
  onBookRide?: (optionId: number, fare: number, paymentMode: string) => void
}

const RideIcon = ({
  name,
  fallbackColor,
}: {
  name: string
  fallbackColor?: string
}) => {
  try {
    switch (name.toLowerCase()) {
      case 'sedan':
        return <SedanSvg width={56} height={56} />
      case 'suv':
        return <SuvSvg width={56} height={56} />
      case 'mini van':
        return <VanSvg width={56} height={56} />
      default:
        return <SedanSvg width={56} height={56} />
    }
  } catch (error) {
    console.error('Error rendering SVG:', error)
    return <Ionicons name="car-outline" size={56} color={fallbackColor} />
  }
}

const RideOptions: React.FC<RideOptionsProps> = observer(
  ({ origin, destination, distance, onBookRide }) => {
    const { theme } = useTheme()
    const colors = theme.colors
    const styles = createStyles(colors)
    // const [rideOptions, setRideOptions] = useState<RideOption[]>([])
    // const [userPaymentMethods, setUserPaymentMethods] = useState<any[]>([])
    const { rideStore, userStore } = useStores()
    const { rideOptions, userPaymentMethods } = rideStore
    const userId = userStore?.currentUser?.id

    useEffect(() => {
      rideStore.getRideOptions()
      rideStore.getPaymentMethods(userId as number)
    }, [rideStore])

    // // Helper function to retry database operations
    // const retryDatabaseOperation = async (
    //   operation: () => Promise<any>,
    //   maxRetries = 5,
    // ) => {
    //   for (let i = 0; i < maxRetries; i++) {
    //     try {
    //       // Check if app is being reset before attempting operation
    //       if (getAppResetting()) {
    //         await new Promise(resolve => setTimeout(resolve, 1000))
    //         continue
    //       }

    //       // Check if database is ready
    //       if (!isDatabaseReady()) {
    //         await new Promise(resolve => setTimeout(resolve, 500))
    //         continue
    //       }

    //       return await operation()
    //     } catch (error: any) {
    //       const errorMessage = error?.message || ''

    //       // Check if it's a database connection/reset related error
    //       const isDatabaseError =
    //         errorMessage.includes('Access to closed resource') ||
    //         errorMessage.includes('Database not ready') ||
    //         errorMessage.includes('database is locked') ||
    //         errorMessage.includes('no such table') ||
    //         errorMessage.includes('database connection') ||
    //         errorMessage.includes('NativeDatabase.prepareSync') ||
    //         errorMessage.includes('Database not available')

    //       if (isDatabaseError && i < maxRetries - 1) {
    //         // Exponential backoff for database errors
    //         const delay = Math.min(1000 * Math.pow(2, i), 5000)
    //         await new Promise(resolve => setTimeout(resolve, delay))
    //         continue
    //       }

    //       // For other errors, use linear backoff
    //       if (i < maxRetries - 1) {
    //         const delay = 500 * (i + 1)
    //         await new Promise(resolve => setTimeout(resolve, delay))
    //         continue
    //       }

    //       throw error
    //     }
    //   }
    // }

    // useEffect(() => {
    //   let isMounted = true

    //   const fetchRideOptions = async () => {
    //     try {
    //       // Check if app is being reset
    //       if (getAppResetting()) {
    //         return
    //       }

    //       const options = await retryDatabaseOperation(() =>
    //         queries.getAllRideOptions(),
    //       )
    //       if (isMounted) {
    //         setRideOptions(options)
    //       }
    //     } catch (error) {
    //       if (isMounted) {
    //         console.error('Error fetching ride options:', error)
    //       }
    //     }
    //   }

    //   const fetchUserPaymentMethods = async () => {
    //     if (!userId) {
    //       return
    //     }

    //     try {
    //       // Check if app is being reset
    //       if (getAppResetting()) {
    //         return
    //       }

    //       const methods = await retryDatabaseOperation(() =>
    //         queries.getPaymentMethodsForUser(userId),
    //       )
    //       if (isMounted) {
    //         setUserPaymentMethods(methods)
    //       }
    //     } catch (error) {
    //       if (isMounted) {
    //         console.error('Error fetching user payment methods:', error)
    //       }
    //     }
    //   }

    //   fetchRideOptions()
    //   fetchUserPaymentMethods()

    //   // Cleanup function to prevent memory leaks
    //   return () => {
    //     isMounted = false
    //   }
    // }, [])

    return (
      <LinearGradient
        colors={[colors.palette.neutral700, colors.palette.neutral800]}
        style={styles.sheet}
      >
        <View style={styles.contentContainer}>
          {/* Origin Section */}
          <View style={styles.locationSection}>
            <View style={styles.iconBar}>
              <View style={styles.originDot} />
            </View>
            <Text style={styles.value}>{origin}</Text>
          </View>

          {/* Connecting Line */}
          <View style={styles.verticalLine} />

          {/* Destination Section */}
          <View style={styles.locationSection}>
            <View style={styles.iconBar}>
              <Ionicons
                name="location-outline"
                size={24}
                color={colors.palette.primary400}
                style={styles.destinationIcon}
              />
            </View>
            <Text style={styles.value}>{destination}</Text>
          </View>

          {/* Distance Section */}
          {distance != null && (
            <View style={styles.distanceSection}>
              <View style={styles.iconBar}>
                <Ionicons
                  name="speedometer-outline"
                  size={24}
                  color={colors.palette.primary400}
                  style={styles.distanceIcon}
                />
              </View>
              <Text style={styles.distanceText}>Distance:</Text>
              <Text style={styles.distanceText}>{distance.toFixed(1)} km</Text>
            </View>
          )}

          {/* Ride Options Section */}
          <View style={styles.rideOptionsContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rideOptionsScroll}
              data={rideOptions}
              extraData={rideOptions.length}
              keyExtractor={item => String(item.id)}
              renderItem={({ item: option }) => {
                const isSelected =
                  option.name.toLowerCase() ===
                  rideStore.currentRideOption.toLowerCase()
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.rideOptionCard,
                      ...(isSelected ? [styles.selectedCard] : []),
                    ]}
                    onPress={() => rideStore.setCurrentRideOption(option.name)}
                    activeOpacity={0.8}
                  >
                    <RideIcon name={option.name} />
                    <View style={styles.rideDetailsContainer}>
                      <Text
                        style={StyleSheet.flatten([
                          styles.rideName,
                          isSelected && styles.selectedText,
                        ])}
                      >
                        {option.name}
                      </Text>
                      <Text
                        style={StyleSheet.flatten([
                          styles.ridePrice,
                          isSelected && styles.selectedText,
                        ])}
                      >
                        $
                        {distance != null
                          ? Math.round(option.rate_per_km * distance)
                          : option.base_fare}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              }}
            />
          </View>

          {/* Payment Options Section */}
          <View style={styles.paymentContainer}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.paymentOptionsScroll}
              data={userPaymentMethods}
              extraData={userPaymentMethods.length}
              keyExtractor={item => String(item.id)}
              ListHeaderComponent={() => (
                <TouchableOpacity
                  style={[
                    styles.paymentOptionCard,
                    ...(rideStore.currentPaymentMethod === 'cash'
                      ? [styles.selectedCard]
                      : []),
                  ]}
                  onPress={() => rideStore.setCurrentPaymentMethod('cash')}
                >
                  <Ionicons
                    name="cash-outline"
                    size={32}
                    color={
                      rideStore.currentPaymentMethod === 'cash'
                        ? colors.palette.neutral100
                        : colors.palette.primary400
                    }
                  />
                  <View style={styles.paymentDetailsContainer}>
                    <Text
                      style={StyleSheet.flatten([
                        styles.paymentName,
                        rideStore.currentPaymentMethod === 'cash' &&
                          styles.selectedText,
                      ])}
                    >
                      Cash
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              renderItem={({ item: method }) => (
                <TouchableOpacity
                  style={[
                    styles.paymentOptionCard,
                    ...(rideStore.currentPaymentMethod === method.id.toString()
                      ? [styles.selectedCard]
                      : []),
                  ]}
                  onPress={() =>
                    rideStore.setCurrentPaymentMethod(method.id.toString())
                  }
                >
                  <Ionicons
                    name={
                      method.type === 'credit_card'
                        ? 'card-outline'
                        : 'wallet-outline'
                    }
                    size={32}
                    color={
                      rideStore.currentPaymentMethod === method.id.toString()
                        ? colors.palette.neutral100
                        : colors.palette.primary400
                    }
                  />
                  <View style={styles.paymentDetailsContainer}>
                    <Text
                      style={StyleSheet.flatten([
                        styles.paymentName,
                        rideStore.currentPaymentMethod ===
                          method.id.toString() && styles.selectedText,
                      ])}
                    >
                      {method.provider}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Book Button */}
          {rideStore.currentRideOption && (
            <TouchableOpacity
              style={styles.bookButton}
              disabled={rideStore.isLoading}
              onPress={async () => {
                try {
                  const option = rideOptions.find(
                    opt =>
                      opt.name.toLowerCase() ===
                      rideStore.currentRideOption.toLowerCase(),
                  )
                  if (!option || !distance) return

                  const fare = Math.round(option.rate_per_km * distance)
                  if (onBookRide) {
                    onBookRide(option.id, fare, rideStore.currentPaymentMethod)
                  }
                } catch (e) {
                  console.error('Booking failed', e)
                }
              }}
            >
              <Text style={styles.bookButtonText}>
                {rideStore.isLoading
                  ? 'Booking...'
                  : `Book ${rideStore.currentRideOption}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    )
  },
)

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 16,
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 16,
      zIndex: 100,
      borderTopWidth: 1,
      borderTopColor: colors.palette.overlay20,
    },
    contentContainer: {
      flexDirection: 'column',
    },
    locationSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 4,
      backgroundColor: colors.palette.neutral700,
      padding: 12,
      borderRadius: 12,
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.palette.neutral300,
    },
    iconBar: {
      width: 24,
      alignItems: 'center',
      marginRight: 12,
    },
    originDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.palette.neutral100,
      borderWidth: 2,
      borderColor: colors.palette.primary400,
      shadowColor: colors.palette.primary400,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    destinationIcon: {
      marginTop: 2,
      shadowColor: colors.palette.primary400,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    verticalLine: {
      width: 2,
      height: 12,
      backgroundColor: colors.palette.primary400,
      marginLeft: 11,
      shadowColor: colors.palette.primary400,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    value: {
      color: colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '500',
      flex: 1,
    },
    rideOptionsContainer: {
      marginTop: 8,
    },
    rideOptionsScroll: {
      paddingVertical: 10,
    },
    rideOptionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.palette.neutral600,
      borderRadius: 16,
      padding: 12,
      marginRight: 12,
      width: 180,
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.palette.neutral300,
    },
    rideDetailsContainer: {
      marginLeft: 12,
      flexShrink: 1,
    },
    rideName: {
      color: colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    ridePrice: {
      color: colors.palette.neutral100,
      fontSize: 18,
      fontWeight: '700',
    },
    selectedText: {
      color: colors.palette.primary400,
    },
    selectedCard: {
      borderWidth: 2,
      borderColor: colors.palette.primary400,
      backgroundColor: colors.palette.neutral800,
    },
    bookButton: {
      marginTop: 24,
      backgroundColor: colors.palette.primary400,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      alignItems: 'center',
      shadowColor: colors.palette.primary400,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    bookButtonText: {
      color: colors.palette.neutral100,
      fontWeight: 'bold',
      fontSize: 16,
    },
    distanceSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      padding: 12,
    },
    distanceIcon: {
      marginRight: 0,
    },
    distanceText: {
      color: colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '500',
      marginLeft: 4,
    },
    paymentContainer: {
      marginTop: 16,
    },
    sectionTitle: {
      fontSize: 18,
      color: colors.palette.neutral200,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    paymentOptionsScroll: {
      paddingVertical: 10,
    },
    paymentOptionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.palette.neutral600,
      borderRadius: 12,
      padding: 12,
      marginRight: 12,
      minWidth: 150,
    },
    paymentDetailsContainer: {
      marginLeft: 12,
      flexShrink: 1,
    },
    paymentName: {
      fontSize: 16,
      color: colors.text,
    },
  })

export default RideOptions
