import CustomAlert from '@/app/components/CustomAlert'
import { OrderStatus, getOrderStatusConfig } from '@/app/constants/orderStatus'
import { mutations } from '@/db/mutations'
import { queries } from '@/db/queries'
import { useStores } from '@/models/helpers/useStores'
import { colors } from '@/theme'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { metrics, useTheme } from '@andojo/shared-theme'
import { Screen, Text } from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const emptyOrdersImg = require('../../../assets/images/pizza.png')

const SWIPE_REVEAL_WIDTH = 100
const SWIPE_THRESHOLD = 40

function formatAddress(item: any) {
  let line = (item.addressLine1 ?? '') || ''
  if (item.addressLine2) line += `, ${item.addressLine2 ?? ''}`
  if (item.city || item.state || item.postalCode) {
    line += `, ${item.city ?? ''}${item.city && item.state ? ', ' : ''}${item.state ?? ''} ${item.postalCode ?? ''}`
  }
  return line.trim()
}

// Memoize the PlainHeader component
const PlainHeader = memo(() => {
  const router = useRouter()
  const { userStore } = useStores()
  const [addresses, setAddresses] = useState<any[]>([])

  useEffect(() => {
    // Fetch addresses when component mounts
    const fetchAddresses = async () => {
      if (userStore.currentUser?.id) {
        await userStore.fetchAddresses()
        setAddresses(userStore.addresses)
      }
    }
    fetchAddresses()
  }, [userStore.currentUser?.id])

  // Get the address to display
  const getDisplayAddress = () => {
    // First check if there's a selected address
    if (userStore.selectedAddress) {
      return userStore.selectedAddress
    }

    // If no selected address, find the default address
    const defaultAddress = addresses.find(addr => addr.isDefault === 1)
    if (defaultAddress) {
      return defaultAddress
    }

    // If no default address, return the first address in the list
    if (addresses.length > 0) {
      return addresses[0]
    }

    // If no addresses at all, return null
    return null
  }

  const displayAddress = getDisplayAddress()
  const area = displayAddress?.label || 'Select Address'
  const address = displayAddress
    ? formatAddress(displayAddress)
    : 'Add your delivery address'

  return (
    <View style={styles.plainHeader}>
      <View style={styles.headerLeft}>
        <TouchableOpacity
          style={styles.addressContainer}
          onPress={() =>
            router.push({ pathname: '/screens/address/address-list' })
          }
          activeOpacity={0.7}
        >
          <View style={styles.addressRow}>
            <Ionicons
              name="location-sharp"
              size={20}
              color={colors.palette.primary500}
              style={styles.locationIcon}
            />
            <Text style={styles.areaLabel}>{area}</Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color="#222"
              style={styles.chevronIcon}
            />
          </View>
          <Text style={styles.addressText} numberOfLines={1}>
            {address}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.profileCircleGray}
          onPress={() => router.push('/screens/profile')}
          activeOpacity={0.7}
        >
          <Ionicons name="person" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  )
})

interface OrderItem {
  id: number
  restaurantId: number
  restaurantName?: string
  status: OrderStatus
  total: number
  createdAt: string
}

interface OrderCardProps {
  item: OrderItem
  onCancel: () => void
  onPress: () => void
  sessionId: string | undefined
  sessionTimeStamp: string | undefined
}

// Add type for form data
interface OrderFormData {
  orders?: OrderItem[]
  loading?: boolean
  userId?: number
  lastUpdated?: number
  screenName?: string
  route?: string
  action?: string
  orderId?: number
  timestamp?: number
}

const OrderCard = ({
  item,
  onCancel,
  onPress,
  sessionId,
  sessionTimeStamp,
}: OrderCardProps) => {
  const { trackContentChange, trackClick } = useInteractionTracking(
    'OrdersScreen',
    '/(tabs)/orders',
  )
  const { sessionStore } = useStores()
  const { theme } = useTheme()
  const position = useRef(new Animated.Value(0)).current
  const [isOpen, setIsOpen] = useState(false)
  const [isSwiping, setIsSwiping] = useState(false)
  const [showCancelAlert, setShowCancelAlert] = useState(false)

  const handleCancelPress = () => {
    trackClick('cancelOrder')
    setShowCancelAlert(true)
    trackContentChange({
      action: 'cancel_alert_shown',
      isSwiping,
      orderId: item.id,
      timestamp: Date.now(),
    })
  }

  const handleCancelConfirm = () => {
    trackContentChange({
      action: 'cancel_confirmed',
      orderId: item.id,
      timestamp: Date.now(),
    })
    onCancel()
    close()
    setShowCancelAlert(false)
  }

  const handleCancelReject = () => {
    trackContentChange({
      action: 'cancel_rejected',
      orderId: item.id,
      timestamp: Date.now(),
    })
    close()
    setShowCancelAlert(false)
  }

  const close = () => {
    Animated.spring(position, {
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      setIsOpen(false)
      trackContentChange({
        action: 'card_closed',
        orderId: item.id,
        timestamp: Date.now(),
      })
    })
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isOpen,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const shouldSet =
          Math.abs(gestureState.dx) > 5 && gestureState.dx < 0 && !isOpen
        if (shouldSet) {
          trackContentChange({
            action: 'order_card_swipe_start',
            orderId: item.id,
            timestamp: Date.now(),
          })
        }
        return shouldSet
      },
      onPanResponderGrant: () => {
        setIsSwiping(true)
        trackContentChange({
          action: 'swipe_started',
          orderId: item.id,
          timestamp: Date.now(),
        })
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0 && gestureState.dx > -SWIPE_REVEAL_WIDTH) {
          position.setValue(gestureState.dx)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsSwiping(false)
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Reveal cancel
          Animated.timing(position, {
            toValue: -SWIPE_REVEAL_WIDTH,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            setIsOpen(true)
            trackContentChange({
              action: 'card_opened',
              orderId: item.id,
              timestamp: Date.now(),
            })
          })
        } else {
          // Snap back
          Animated.spring(position, {
            toValue: 0,
            useNativeDriver: true,
          }).start(() => {
            trackContentChange({
              action: 'swipe_cancelled',
              orderId: item.id,
              timestamp: Date.now(),
            })
          })
        }
      },
    }),
  ).current

  // Load card and alert states from session
  useFocusEffect(
    useCallback(() => {
      if (!sessionTimeStamp || !sessionId) {
        return
      }

      const session = sessionStore.getSession(sessionId)
      if (!session?.data?.sessionData?.formData) {
        return
      }

      const formData = session.data.sessionData.formData as OrderFormData

      console.log('formData', formData)

      // Reset states first
      setIsOpen(false)
      setShowCancelAlert(false)
      position.setValue(0)

      // Restore states based on the last action
      if (formData.orderId === item.id) {
        switch (formData.action) {
          case 'cancel_alert_shown':
            setShowCancelAlert(true)
            break
          case 'card_opened':
            setIsOpen(true)
            setTimeout(() => {
              position.setValue(-SWIPE_REVEAL_WIDTH)
            }, 0)
            break
          case 'swipe_started':
            setIsSwiping(true)
            break
          case 'card_closed':
            setIsOpen(false)
            setShowCancelAlert(false)
            break
          default:
            // No state to restore for this action
            break
        }
      } else {
        // Order ID mismatch
      }
    }, [sessionTimeStamp, item.id]),
  )

  const statusConfig = getOrderStatusConfig(item.status, theme.colors)
  const canCancel =
    item.status === OrderStatus.Preparing || item.status === OrderStatus.Pending

  const cancelOpacity = position.interpolate({
    inputRange: [-SWIPE_REVEAL_WIDTH, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  return (
    <View style={styles.orderCardContainer} pointerEvents="box-none">
      <CustomAlert
        visible={showCancelAlert}
        title="Cancel Order"
        message="Are you sure you want to cancel this order?"
        type="warning"
        confirmText="Yes, Cancel"
        cancelText="No, Keep Order"
        onConfirm={handleCancelConfirm}
        onCancel={handleCancelReject}
        showCancel={true}
      />
      {/* Overlay to close cancel when open and tap outside */}
      {isOpen && (
        <TouchableWithoutFeedback onPress={close}>
          <View style={styles.overlay} pointerEvents="box-only" />
        </TouchableWithoutFeedback>
      )}
      {/* Cancel Action (revealed on swipe, under the card) */}
      {canCancel && (
        <Animated.View
          style={[styles.cancelRevealArea, { opacity: cancelOpacity }]}
        >
          <TouchableOpacity
            style={styles.cancelAction}
            onPress={handleCancelPress}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle" size={28} color="#fff" />
            <Text style={styles.actionText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      <Animated.View
        {...(canCancel ? panResponder.panHandlers : {})}
        style={{
          transform: [{ translateX: position }],
        }}
      >
        {isOpen ? (
          <TouchableWithoutFeedback onPress={close}>
            <View style={styles.orderCard}>
              <View style={styles.orderHeaderRow}>
                <Text
                  style={styles.orderRestaurant}
                  numberOfLines={1}
                  weight="bold"
                  size="large"
                >
                  {item.restaurantName}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusConfig.bg },
                  ]}
                >
                  <Ionicons
                    name={statusConfig.icon as keyof typeof Ionicons.glyphMap}
                    size={14}
                    color={statusConfig.color}
                    style={styles.iconMargin}
                  />
                  <Text
                    style={StyleSheet.flatten([
                      styles.statusText,
                      { color: statusConfig.color },
                    ])}
                    size="small"
                  >
                    {statusConfig.label}
                  </Text>
                </View>
              </View>
              <View style={styles.orderDetailsRow}>
                <Ionicons
                  name="pricetag"
                  size={16}
                  color={colors.palette.neutral400}
                  style={styles.iconMargin}
                />
                <Text style={styles.orderTotal} size="medium">
                  Total: ${item.total?.toFixed(2)}
                </Text>
              </View>
              <View style={styles.orderDetailsRow}>
                <Ionicons
                  name="calendar"
                  size={16}
                  color={colors.palette.neutral400}
                  style={styles.iconMargin}
                />
                <Text style={styles.orderDate} size="small">
                  {new Date(item.createdAt).toLocaleString([], {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        ) : (
          <TouchableOpacity
            onPress={() => {
              onPress()
            }}
            activeOpacity={0.8}
          >
            <View style={styles.orderCard}>
              <View style={styles.orderHeaderRow}>
                <Text
                  style={styles.orderRestaurant}
                  numberOfLines={1}
                  weight="bold"
                  size="large"
                >
                  {item.restaurantName}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusConfig.bg },
                  ]}
                >
                  <Ionicons
                    name={statusConfig.icon as keyof typeof Ionicons.glyphMap}
                    size={14}
                    color={statusConfig.color}
                    style={styles.iconMargin}
                  />
                  <Text
                    style={StyleSheet.flatten([
                      styles.statusText,
                      { color: statusConfig.color },
                    ])}
                    size="small"
                  >
                    {statusConfig.label}
                  </Text>
                </View>
              </View>
              <View style={styles.orderDetailsRow}>
                <Ionicons
                  name="pricetag"
                  size={16}
                  color={colors.palette.neutral400}
                  style={styles.iconMargin}
                />
                <Text style={styles.orderTotal} size="medium">
                  Total: ${item.total?.toFixed(2)}
                </Text>
              </View>
              <View style={styles.orderDetailsRow}>
                <Ionicons
                  name="calendar"
                  size={16}
                  color={colors.palette.neutral400}
                  style={styles.iconMargin}
                />
                <Text style={styles.orderDate} size="small">
                  {new Date(item.createdAt).toLocaleString([], {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  )
}

export default function OrdersScreen() {
  const { userStore, sessionStore } = useStores()
  const router = useRouter()
  const { trackContentChange } = useInteractionTracking(
    'OrdersScreen',
    '/(tabs)/orders',
  )
  const userId = userStore.currentUser?.id
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const [showErrorAlert, setShowErrorAlert] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Load session data if exists
  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession(sessionId as string)
      if (session?.data?.sessionData) {
        const formData = session.data.sessionData.formData as any
        if (formData) {
          // Restore orders state if available
          if (formData.orders) {
            setOrders(formData.orders)
            setLoading(false)
          }
        }
      }
    }
  }, [sessionTimeStamp, sessionId, sessionStore])

  // Use focus effect to fetch orders regardless of session
  useFocusEffect(
    useCallback(() => {
      fetchOrders()
    }, [userId, sessionTimeStamp]), // Add userId as dependency to ensure we have the user ID
  )

  async function fetchOrders() {
    if (!userId) {
      return
    }
    setLoading(true)
    try {
      trackContentChange({
        action: 'fetch_orders_start',
        userId,
        timestamp: Date.now(),
      })

      const userOrders = await queries.getOrdersForUser(userId)

      // Fetch restaurant names for the orders
      const ordersWithNames = await Promise.all(
        (userOrders || []).map(async (order: any) => {
          const restaurant = await queries.getRestaurantById(order.restaurantId)
          return {
            ...order,
            restaurantName: restaurant?.name,
          }
        }),
      )

      // Sort by createdAt descending (latest first)
      ordersWithNames.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )

      setOrders(ordersWithNames)

      trackContentChange({
        action: 'fetch_orders_success',
        orderCount: ordersWithNames.length,
        orders: ordersWithNames, // Persist the orders state
        timestamp: Date.now(),
      })
    } catch (error) {
      trackContentChange({
        action: 'fetch_orders_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      })
      setShowErrorAlert(true)
      setErrorMessage('Failed to fetch orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async (orderId: number) => {
    try {
      trackContentChange({
        action: 'cancel_order_start',
        orderId,
        orders, // Persist current orders state
        timestamp: Date.now(),
      })

      await mutations.updateOrder(orderId, { status: OrderStatus.Cancelled })
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status: OrderStatus.Cancelled }
            : order,
        ),
      )

      trackContentChange({
        action: 'cancel_order_success',
        orderId,
        orders: orders.map(order =>
          order.id === orderId
            ? { ...order, status: OrderStatus.Cancelled }
            : order,
        ), // Persist updated orders state
        timestamp: Date.now(),
      })

      setShowErrorAlert(true)
      setErrorMessage('Order cancelled successfully')
    } catch (error) {
      trackContentChange({
        action: 'cancel_order_error',
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      })
      setShowErrorAlert(true)
      setErrorMessage('Failed to cancel order. Please try again.')
    }
  }

  const handleErrorAlertClose = () => {
    setShowErrorAlert(false)
    setErrorMessage('')
  }

  const renderOrder = ({ item }: { item: OrderItem }) => {
    return (
      <OrderCard
        item={item}
        onCancel={() => handleCancelOrder(item.id)}
        onPress={() =>
          router.push(`/screens/order/order-tracking?orderId=${item.id}`)
        }
        sessionId={sessionId as string | undefined} // Allow undefined sessionId
        sessionTimeStamp={sessionTimeStamp as string | undefined}
      />
    )
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator
          size="large"
          style={styles.loadingIndicator}
          color={colors.palette.primary500}
        />
      </Screen>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomAlert
        visible={showErrorAlert}
        title={errorMessage.includes('successfully') ? 'Success' : 'Error'}
        message={errorMessage}
        type={errorMessage.includes('successfully') ? 'success' : 'error'}
        confirmText="OK"
        onConfirm={handleErrorAlertClose}
        onCancel={handleErrorAlertClose}
        showCancel={false}
      />
      <PlainHeader />
      <View style={styles.divider} />
      <Screen preset="fixed" style={styles.screenContainer}>
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Image
              source={emptyOrdersImg}
              style={styles.emptyImg}
              resizeMode="contain"
            />
            <Text style={styles.emptyText} weight="semibold" size="xl">
              No Orders Yet
            </Text>
            <Text style={styles.emptySubText} size="medium">
              You haven't placed any orders yet. Start exploring restaurants and
              enjoy your first meal!
            </Text>
            <TouchableOpacity style={styles.ctaBtn}>
              <LinearGradient
                colors={[
                  colors.palette.primary400,
                  colors.palette.secondary400,
                ]}
                style={styles.ctaBtnGradient}
              >
                <Text style={styles.ctaBtnText} weight="bold" size="large">
                  Order Now
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrder}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Screen>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.palette.neutral100,
  },
  plainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: metrics.medium,
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  areaLabel: {
    fontWeight: 'bold',
    fontSize: 17,
    color: '#222',
    marginRight: 2,
  },
  addressText: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
    marginLeft: 6,
    maxWidth: 220,
  },
  headerRight: {
    marginLeft: 12,
  },
  profileCircleGray: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressContainer: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.palette.neutral200,
    width: '100%',
    marginTop: 12,
    marginBottom: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  orderCard: {
    backgroundColor: colors.palette.neutral100,
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    shadowColor: colors.palette.primary500,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.palette.neutral200,
    zIndex: 2,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderRestaurant: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.palette.primary500,
    maxWidth: 180,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    flexDirection: 'row',
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  orderDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 15,
    color: colors.palette.neutral600,
    marginBottom: 0,
    fontWeight: '500',
  },
  orderDate: {
    fontSize: 13,
    color: colors.palette.neutral400,
    marginLeft: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 24,
  },
  emptyImg: {
    width: 180,
    height: 180,
    marginBottom: 18,
    opacity: 0.85,
  },
  emptyText: {
    fontSize: 22,
    color: colors.palette.primary500,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 15,
    color: colors.palette.neutral500,
    textAlign: 'center',
    marginBottom: 10,
  },
  ctaBtn: {
    marginTop: 18,
    borderRadius: 18,
    overflow: 'hidden',
    width: 180,
    alignSelf: 'center',
    elevation: 2,
  },
  ctaBtnGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 18,
  },
  ctaBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  cancelAction: {
    backgroundColor: colors.palette.angry500,
    width: SWIPE_REVEAL_WIDTH,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    flex: 1,
    flexDirection: 'column',
    marginLeft: 8,
  },
  orderCardContainer: {
    position: 'relative',
    marginBottom: 18,
  },
  cancelRevealArea: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_REVEAL_WIDTH,
    height: '85%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    marginTop: 4,
    fontWeight: 'bold',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.01)',
    zIndex: 0,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 4,
  },
  chevronIcon: {
    marginLeft: 2,
  },
  iconMargin: {
    marginRight: 4,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: colors.palette.neutral100,
    paddingTop: 0,
  },
  loadingIndicator: {
    marginTop: 40,
  },
})
