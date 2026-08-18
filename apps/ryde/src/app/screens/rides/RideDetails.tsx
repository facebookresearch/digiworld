import { useEffect, useState } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Text } from '@andojo/shared-theme/src/components'
import { useTheme, Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { queries } from '@/db/queries'
import SedanSvg from '../../../../assets/images/cabs/sedan.svg'
import SuvSvg from '../../../../assets/images/cabs/suv.svg'
import VanSvg from '../../../../assets/images/cabs/van.svg'
import FeedbackModal from './components/FeedbackModal'
import { mutations } from '@/db/mutations'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useIsFocused } from '@react-navigation/native'
import { observer } from 'mobx-react-lite'

function getInitials(name: string) {
  if (!name) return ''
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatPaymentMode(mode?: string) {
  if (!mode) return 'N/A'
  return mode
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getPaymentIcon(mode?: string): keyof typeof Ionicons.glyphMap {
  switch (mode) {
    case 'cash':
      return 'cash-outline'
    case 'credit_card':
      return 'card-outline'
    case 'digital_wallet':
      return 'wallet-outline'
    default:
      return 'help-circle-outline'
  }
}

const RideDetails = () => {
  const router = useRouter()
  const { theme } = useTheme()
  const colors = theme.colors
  const styles = createStyles(colors)

  // Inner component that uses styles
  const RideIcon = ({ name }: { name: string }) => {
    try {
      switch (name?.toLowerCase()) {
        case 'sedan':
          return <SedanSvg width={48} height={48} style={styles.spacing} />
        case 'suv':
          return <SuvSvg width={48} height={48} style={styles.spacing} />
        case 'mini van':
        case 'van':
          return <VanSvg width={48} height={48} style={styles.spacing} />
        default:
          return <SedanSvg width={48} height={48} style={styles.spacing} />
      }
    } catch (error) {
      return null
    }
  }

  const {
    rideId: rideIdParam,
    sessionId,
    sessionTimeStamp,
  } = useLocalSearchParams() as {
    rideId?: string
    sessionId?: string
    sessionTimeStamp?: string
  }
  const { sessionStore, uiStore } = useStores()
  const [rideId, setRideId] = useState<string | undefined>(rideIdParam)
  const [ride, setRide] = useState<any>(null)
  const [driver, setDriver] = useState<any>(null)
  const [feedback, setFeedback] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paymentDetails, setPaymentDetails] = useState<any>(null)
  const isFocused = useIsFocused()
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('RideDetails', '/screens/rides/RideDetails')

  // Restore rideId from session if available
  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession(sessionId as string)
      if (session?.data?.sessionData) {
        const formData = session.data.sessionData.formData as any
        if (formData.rideId || formData.ride_id) {
          setRideId(formData.rideId || formData.ride_id)
        }
      }
    }
  }, [sessionTimeStamp])

  useEffect(() => {
    trackScreenMount({
      rideId,
      timestamp: Date.now(),
      sessionId,
    })
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        if (!rideId) return
        const rideData = await queries.getRideById(Number(rideId))
        setRide(rideData)
        if (rideData?.feedbackSubmitted === 0 && isFocused) {
          uiStore.setIsFeedbackModalVisible(true)
        }
        if (rideData?.driverId) {
          const driverData = await queries.getDriverById(rideData.driverId)
          setDriver(driverData)
        }
        if (rideData?.paymentMode && rideData.paymentMode !== 'cash') {
          const paymentId = parseInt(rideData.paymentMode, 10)
          if (!isNaN(paymentId)) {
            const details = await queries.getPaymentMethodById(paymentId)
            setPaymentDetails(details)
          }
        }
        if (rideData?.feedbackSubmitted) {
          const feedbackData = await queries.getFeedbackForRide(Number(rideId))
          if (feedbackData && feedbackData.length > 0) {
            setFeedback(feedbackData[0])
          }
        }
      } catch (error) {
        console.error('Failed to fetch ride data:', error)
      } finally {
        setLoading(false)
      }
    }
    if (isFocused) {
      console.log('Fetching ride data')
      fetchData()
    }
  }, [rideId])

  // useEffect(() => {
  //   return () => {
  //     uiStore.clearIsFeedbackModalVisible()
  //   }
  // }, [])

  const handleFeedbackSubmit = async (data: {
    rating: number
    comment: string
  }) => {
    try {
      if (!rideId) return

      // 1. Create feedback in DB
      await mutations.createFeedback({
        rideId: Number(rideId),
        rating: data.rating,
        comment: data.comment,
      })

      // 2. Update ride to mark feedback as submitted
      await mutations.updateRide(Number(rideId), { feedbackSubmitted: 1 })

      // 3. Refetch ride and feedback to update UI
      const updatedRide = await queries.getRideById(Number(rideId))

      setRide(updatedRide)
      const feedbackData = await queries.getFeedbackForRide(Number(rideId))

      if (feedbackData && feedbackData.length > 0) {
        setFeedback(feedbackData[0])
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      // setIsFeedbackModalVisible(false)
      uiStore.clearIsFeedbackModalVisible()
    }
  }

  if (loading) {
    return (
      <LinearGradient
        colors={[colors.palette.neutral700, colors.palette.neutral800]}
        style={styles.gradient}
      >
        <ActivityIndicator size="large" color={colors.palette.neutral100} />
      </LinearGradient>
    )
  }

  if (!ride) {
    trackContentChange({
      state: 'not_found',
      rideId,
      timestamp: Date.now(),
      sessionId,
    })
    return (
      <LinearGradient
        colors={[colors.palette.primary400, colors.palette.primary500]}
        style={styles.gradient}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)/home')}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.palette.neutral100}
          />
        </TouchableOpacity>
        <Text style={styles.loadingText}>Ride not found.</Text>
      </LinearGradient>
    )
  }

  // Parse pickup/drop location
  let pickup = { placename: '' }
  let drop = { placename: '' }
  try {
    pickup = JSON.parse(ride.pickupLocation)
    drop = JSON.parse(ride.dropLocation)
  } catch {}

  // Date/time formatting
  const date = ride.startTime ? new Date(ride.startTime) : null
  const dateStr = date ? date.toLocaleDateString() : '--'
  const timeStr = date
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--'

  // Driver initials placeholder
  const driverInitials = getInitials(driver?.name || '')

  return (
    <LinearGradient
      colors={[colors.palette.neutral700, colors.palette.neutral800]}
      style={styles.gradient}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.palette.neutral100}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} preset="heading">
          Ride Details
        </Text>
      </View>
      <View style={styles.card}>
        <View style={styles.rideTypeRow}>
          <RideIcon name={driver.vehicleType} />
          <View>
            <Text style={styles.rideTypeText}>{driver.vehicleType} Ride</Text>
            <Text style={styles.rideDateText}>
              {dateStr} • {timeStr}
            </Text>
            <Text style={styles.rideFareText}>
              $ {ride.fareAmount} •{' '}
              {ride.status?.charAt(0).toUpperCase() + ride.status?.slice(1)}
            </Text>
            <View style={styles.paymentMethodRow}>
              <Ionicons
                name={
                  paymentDetails
                    ? getPaymentIcon(paymentDetails.type)
                    : getPaymentIcon(ride?.paymentMode)
                }
                size={16}
                color={colors.palette.neutral300}
                style={styles.paymentIcon}
              />
              <Text style={styles.paymentMethodText}>
                {paymentDetails
                  ? `${paymentDetails.provider} (••••${
                      paymentDetails.accountNumber?.slice(-4) || ''
                    })`
                  : formatPaymentMode(ride?.paymentMode)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {ride.feedbackSubmitted && feedback && ride.status !== 'cancelled' ? (
          <View style={styles.driverRow}>
            <View style={styles.driverAvatarPlaceholder}>
              <Text style={styles.driverInitials}>{driverInitials}</Text>
            </View>
            <View>
              <Text style={styles.driverName}>
                You rated {driver?.name || 'Driver'}
              </Text>
              <View style={styles.ratingRow}>
                {[...Array(5)].map((_, i) => (
                  <Ionicons
                    key={i}
                    name="star"
                    size={20}
                    color={
                      i < (feedback.rating || 0)
                        ? colors.palette.primary400
                        : colors.palette.neutral400
                    }
                    style={styles.starSpacing}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.driverRow}>
            <View style={styles.driverAvatarPlaceholder}>
              <Text style={styles.driverInitials}>{driverInitials}</Text>
            </View>
            <View>
              <Text style={styles.driverName}>{driver?.name || 'Driver'}</Text>
              <Text style={styles.vehicleInfo}>
                {driver?.vehicleName} • {driver?.vehicleNumber}
              </Text>
            </View>
          </View>
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>RIDE DETAILS</Text>
        <View style={styles.rideDetailsRow}>
          <View style={styles.ridePointRow}>
            <Ionicons
              name="ellipse"
              size={16}
              color={colors.palette.neutral100}
              style={styles.ridePointIcon}
            />
            <Text style={styles.ridePointText}>{pickup.placename}</Text>
          </View>
          <Ionicons
            name="arrow-down"
            size={18}
            color={colors.palette.neutral100}
          />
          <View style={styles.ridePointRow}>
            <Ionicons
              name="location"
              size={16}
              color={colors.palette.neutral100}
              style={styles.spacing}
            />
            <Text style={styles.ridePointText}>{drop.placename}</Text>
          </View>
        </View>
        <View style={styles.metaDataRow}>
          <View style={styles.rideMetaRow}>
            <Text style={styles.rideMetaText}>Duration</Text>
            <Text style={styles.rideMetaText}>Distance</Text>
            <Text style={styles.rideMetaText}>Total Fare</Text>
          </View>
          <View style={styles.rideMetaRow}>
            <Text style={styles.rideMetaValue}>
              {(ride.distanceKm * 2.5).toFixed(1)} mins
            </Text>
            <Text style={styles.rideMetaValue}>
              {ride.distanceKm ? `${ride.distanceKm} km` : '--'}
            </Text>
            <Text style={styles.rideMetaValue}>$ {ride.fareAmount}</Text>
          </View>
        </View>
      </View>
      {!ride.feedbackSubmitted && isFocused && (
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => {
            trackClick('feedbackButton')
            uiStore.setIsFeedbackModalVisible(true)
          }}
        >
          {ride.status === 'cancelled' ? (
            <Text style={styles.submitButtonText}>Reason For Cancellation</Text>
          ) : (
            <Text style={styles.submitButtonText}>How Was the Ride?</Text>
          )}
        </TouchableOpacity>
      )}
      <FeedbackModal
        visible={uiStore.isFeedbackModalVisible}
        onClose={() => uiStore.clearIsFeedbackModalVisible()}
        onSubmit={handleFeedbackSubmit}
        isCancellation={ride.status === 'cancelled'}
      />
    </LinearGradient>
  )
}

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    gradient: {
      flex: 1,
      paddingTop: 40,
      paddingHorizontal: 0,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 100,
    },
    headerTitle: {
      color: colors.palette.neutral100,
      fontSize: 22,
      marginLeft: 16,
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
      marginTop: 20,
      marginHorizontal: 16,
      backgroundColor: colors.palette.neutral800,
      borderRadius: 20,
      padding: 20,
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    rideTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    rideTypeText: {
      fontSize: 18,
      color: colors.palette.primary400,
      marginRight: 8,
    },
    rideDateText: {
      fontSize: 14,
      color: colors.palette.neutral300,
    },
    rideFareText: {
      fontSize: 16,
      color: colors.palette.neutral100,
      marginBottom: 8,
    },
    divider: {
      height: 1,
      backgroundColor: colors.palette.neutral700,
      marginVertical: 12,
    },
    driverRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    driverAvatarPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.palette.primary400,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    driverInitials: {
      color: colors.palette.neutral200,
      fontSize: 22,
    },
    driverName: {
      color: colors.palette.neutral100,
      fontSize: 16,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    vehicleInfo: {
      color: colors.palette.neutral400,
      fontSize: 14,
      marginTop: 2,
    },
    sectionTitle: {
      color: colors.palette.primary400,
      marginTop: 16,
      marginBottom: 6,
      fontSize: 15,
    },
    rideDetailsRow: {
      flexDirection: 'column',
      marginBottom: 8,
    },
    ridePointRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    ridePointText: {
      color: colors.palette.neutral100,
      fontSize: 16,
      flex: 1,
    },
    rideMetaRow: {
      marginBottom: 2,
    },
    rideMetaText: {
      color: colors.palette.neutral400,
      fontSize: 14,
      marginBottom: 4,
    },
    rideMetaValue: {
      color: colors.palette.neutral100,
      fontSize: 14,
      marginBottom: 4,
    },
    metaDataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    loadingText: {
      color: colors.palette.neutral100,
      fontSize: 18,
      textAlign: 'center',
    },
    submitButton: {
      backgroundColor: colors.palette.primary400,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 24,
      width: '50%',
      alignSelf: 'center',
    },
    submitButtonText: {
      color: colors.palette.neutral100,
      fontSize: 16,
    },
    ridePointIcon: {
      marginRight: 8,
      borderColor: colors.palette.primary400,
      borderWidth: 2,
      borderRadius: 100,
    },
    spacing: {
      marginRight: 8,
    },
    starSpacing: {
      marginRight: 2,
    },
    paymentMethodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    paymentIcon: {
      marginRight: 6,
    },
    paymentMethodText: {
      fontSize: 14,
      color: colors.palette.neutral300,
    },
  })

export default observer(RideDetails)
