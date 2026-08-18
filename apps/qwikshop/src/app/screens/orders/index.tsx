import { useEffect, useRef, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native'
import { Text, ProductImage } from '@/components'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useStores } from '@/models'
import { type Theme, spacing, useAppTheme } from '@andojo/shared-theme'
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons'
import { Instance } from 'mobx-state-tree'
import { OrderModel } from '@/models/OrderStore'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import LinearGradient from 'react-native-linear-gradient'

interface OrderItemProps {
  order: Instance<typeof OrderModel>
  onPress: (orderId: number) => void
}

const ModernHeader = observer(() => {
  const { orderStore } = useStores()
  const router = useRouter()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <LinearGradient
      colors={[
        theme.colors.palette.primary500,
        theme.colors.palette.primary600,
      ]}
      style={styles.headerContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.headerContent}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <LinearGradient
            colors={[
              `${theme.colors.palette.neutral100}33`,
              `${theme.colors.palette.neutral100}1A`,
            ]}
            style={styles.backButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSubtitle}>
            {orderStore.orders.length}{' '}
            {orderStore.orders.length === 1 ? 'order' : 'orders'} total
          </Text>
        </View>
      </View>
    </LinearGradient>
  )
})

const OrderStatusBadge = observer(({ status }: { status: string }) => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          colors: [
            theme.colors.palette.warning400,
            theme.colors.palette.warning500,
          ],
          icon: 'clock-outline',
          text: 'Pending',
        }
      case 'confirmed':
        return {
          colors: [
            theme.colors.palette.secondary400,
            theme.colors.palette.secondary500,
          ],
          icon: 'checkmark-circle-outline',
          text: 'Confirmed',
        }
      case 'shipped':
        return {
          colors: [
            theme.colors.palette.primary400,
            theme.colors.palette.primary500,
          ],
          icon: 'airplane-outline',
          text: 'Shipped',
        }
      case 'delivered':
        return {
          colors: [
            theme.colors.palette.success400,
            theme.colors.palette.success500,
          ],
          icon: 'checkmark-done-circle-outline',
          text: 'Delivered',
        }
      case 'cancelled':
        return {
          colors: [
            theme.colors.palette.error400,
            theme.colors.palette.error500,
          ],
          icon: 'close-circle-outline',
          text: 'Cancelled',
        }
      default:
        return {
          colors: [
            theme.colors.palette.neutral400,
            theme.colors.palette.neutral500,
          ],
          icon: 'help-circle-outline',
          text: 'Unknown',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <LinearGradient
      colors={config.colors as [string, string, ...string[]]}
      style={styles.statusBadge}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <Ionicons
        name={config.icon as any}
        size={14}
        color={theme.colors.palette.neutral900}
      />
      <Text style={styles.statusText}>{config.text}</Text>
    </LinearGradient>
  )
})

const OrderItem = observer(({ order, onPress }: OrderItemProps) => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <TouchableOpacity onPress={() => onPress(order.id)} activeOpacity={0.8}>
      <LinearGradient
        colors={[theme.colors.card, theme.colors.backgroundSecondary]}
        style={styles.orderCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {/* Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderTitleSection}>
            <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
            <Text style={styles.orderDate}>{formatDate(order.orderDate)}</Text>
          </View>
          <OrderStatusBadge status={order.status} />
        </View>

        {/* Items Preview */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsGrid}>
            {order.items.slice(0, 3).map((item: any) => (
              <View key={item.id} style={styles.itemPreview}>
                <ProductImage
                  productId={item.productId}
                  style={styles.itemThumbnail}
                  defaultSource={require('@/assets/images/placeholder_product.jpg')}
                />
              </View>
            ))}
            {order.items.length > 3 && (
              <View style={styles.moreItemsIndicator}>
                <Text style={styles.moreItemsText}>
                  +{order.items.length - 3}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.orderSummary}>
            <Text style={styles.itemCount}>
              {order.items.length} item{order.items.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.orderTotal}>
              ${order.grandTotal.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Action Section */}
        <View style={styles.actionSection}>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.trackButton}>
              <Ionicons name="location-outline" size={16} color="#2196F3" />
              <Text style={styles.trackButtonText}>Track Order</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.viewButton}>
              <Text style={styles.viewButtonText}>View Details</Text>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )
})

export default observer(function OrdersScreen() {
  const router = useRouter()
  const { sessionId, timeStamp } = useLocalSearchParams()
  const { orderStore, userStore, sessionStore, uiStore } = useStores()
  const lastRefreshRef = useRef(0)
  const { theme } = useAppTheme()

  const styles = useMemo(() => createStyles(theme), [theme])

  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('Orders', '/screens/orders')

  useEffect(() => {
    // First try to restore from session if sessionId exists
    if (sessionId) {
      const sessionData = sessionStore.getSession(sessionId as string)
      if (sessionData?.data) {
        console.log('Restoring orders list session:', sessionData)
        trackContentChange(sessionData.data)
      }
    }

    trackScreenMount({
      timestamp: Date.now(),
      isAuthenticated: userStore.isAuthenticated,
      userId: userStore.user?.id,
      sessionId,
    })

    if (userStore.isAuthenticated && userStore.user?.id) {
      orderStore
        .loadOrders(userStore.user.id)
        .then(() => {
          trackContentChange({
            ordersLoaded: true,
            orderCount: orderStore.orders.length,
            hasError: !!orderStore.error,
          })
        })
        .catch((error: any) => {
          trackContentChange({
            ordersLoaded: false,
            error: String(error),
          })
        })
    }
  }, [userStore.isAuthenticated, timeStamp])

  // Refresh data when mockDataAppendTime changes (after dbrefresh)
  useEffect(() => {
    if (uiStore.mockDataAppendTime > lastRefreshRef.current) {
      lastRefreshRef.current = uiStore.mockDataAppendTime
      console.log('🔄 Refreshing orders after dbrefresh...')
      if (userStore.isAuthenticated && userStore.user?.id) {
        orderStore.loadOrders(userStore.user.id).catch(err => {
          console.error('Error refreshing orders:', err)
        })
      }
    }
  }, [
    uiStore.mockDataAppendTime,
    userStore.isAuthenticated,
    userStore.user?.id,
    orderStore,
  ])

  const handleOrderPress = (orderId: number) => {
    trackClick('viewOrderDetails')
    router.push(`/screens/orders/${orderId}`)
  }

  if (orderStore.isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[
            theme.colors.palette.primary100,
            theme.colors.backgroundSecondary,
          ]}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <ModernHeader />
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.primary500}
          />
        </View>
      </View>
    )
  }

  if (orderStore.error) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[
            theme.colors.palette.primary100,
            theme.colors.backgroundSecondary,
          ]}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <ModernHeader />
        <View style={styles.errorContainer}>
          <LinearGradient
            colors={[theme.colors.card, theme.colors.backgroundSecondary]}
            style={styles.errorCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <View style={styles.errorIconContainer}>
              <LinearGradient
                colors={[
                  theme.colors.errorBackground,
                  theme.colors.palette.error100,
                ]}
                style={styles.errorIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons
                  name="error-outline"
                  size={48}
                  color={theme.colors.palette.neutral100}
                />
              </LinearGradient>
            </View>
            <Text style={styles.errorText}>{orderStore.error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                trackClick('retryLoadOrders')
                if (userStore.user?.id) {
                  orderStore.loadOrders(userStore.user.id)
                }
              }}
            >
              <LinearGradient
                colors={[
                  theme.colors.palette.primary500,
                  theme.colors.palette.primary600,
                ]}
                style={styles.retryButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.retryText}>Retry</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    )
  }

  if (orderStore.orders.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[
            theme.colors.palette.primary100,
            theme.colors.backgroundSecondary,
          ]}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <ModernHeader />
        <View style={styles.emptyContainer}>
          <LinearGradient
            colors={[theme.colors.card, theme.colors.backgroundSecondary]}
            style={styles.emptyCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <View style={styles.emptyIllustration}>
              <LinearGradient
                colors={[
                  theme.colors.palette.primary400,
                  theme.colors.palette.primary500,
                ]}
                style={styles.emptyIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <FontAwesome5
                  name="shopping-bag"
                  size={48}
                  color={theme.colors.palette.neutral100}
                />
              </LinearGradient>
            </View>

            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptyDescription}>
              Start shopping to see your orders here.{'\n'}
              Discover amazing products at great prices!
            </Text>
          </LinearGradient>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.primary100,
          theme.colors.backgroundSecondary,
        ]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <ModernHeader />

      <LinearGradient
        colors={[
          theme.colors.palette.primary50,
          theme.colors.palette.primary100,
        ]}
        style={styles.statsHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <LinearGradient
          colors={[theme.colors.card, theme.colors.backgroundSecondary]}
          style={styles.statsCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.statsContent}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{orderStore.orders.length}</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {
                  orderStore.orders.filter(
                    (order: any) => order.status === 'delivered',
                  ).length
                }
              </Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                $
                {orderStore.orders
                  .reduce(
                    (sum: number, order: any) => sum + order.grandTotal,
                    0,
                  )
                  .toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
          </View>
        </LinearGradient>
      </LinearGradient>

      <FlatList
        data={orderStore.orders}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={({ item }) => (
          <OrderItem order={item} onPress={handleOrderPress} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Header Styles
    headerContainer: {
      paddingTop: 50,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.md,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    backButtonGradient: {
      padding: spacing.sm,
      borderRadius: 12,
    },
    headerTextContainer: {
      flex: 1,
      alignItems: 'center',
      marginHorizontal: spacing.md,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.palette.neutral200,
      fontWeight: '500',
      marginTop: 2,
    },
    shopMoreButton: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    shopMoreButtonGradient: {
      padding: spacing.sm,
      borderRadius: 12,
    },

    // Modern Stats Header
    statsHeader: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      borderRadius: 16,
      marginHorizontal: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
      marginTop: 20,
    },
    statsCard: {
      padding: spacing.md,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    statsContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textDim,
      fontWeight: '500',
    },
    statDivider: {
      width: 1,
      height: 30,
      backgroundColor: theme.colors.palette.neutral300,
      marginHorizontal: spacing.sm,
    },

    // List
    listContent: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
    },

    // Order Card
    orderCard: {
      marginBottom: spacing.md,
      marginHorizontal: spacing.md,
      padding: spacing.lg,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
      marginTop: spacing.xs,
    },
    orderTitleSection: {
      flex: 1,
    },
    orderNumber: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    orderDate: {
      fontSize: 14,
      color: theme.colors.textDim,
    },

    // Status Badge
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 16,
      gap: 4,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },

    // Items Section
    itemsSection: {
      marginBottom: spacing.md,
    },
    itemsGrid: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },
    itemPreview: {
      marginRight: spacing.xs,
    },
    itemThumbnail: {
      width: 50,
      height: 50,
      borderRadius: 8,
    },
    moreItemsIndicator: {
      width: 50,
      height: 50,
      borderRadius: 8,
      backgroundColor: theme.colors.palette.neutral200,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral300,
      borderStyle: 'dashed',
    },
    moreItemsText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textDim,
    },
    orderSummary: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 20,
    },
    itemCount: {
      fontSize: 14,
      color: theme.colors.textDim,
    },
    orderTotal: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.error500,
    },

    // Action Section
    actionSection: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral200,
      paddingTop: spacing.md,
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    trackButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.primary100,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 20,
      gap: 6,
    },
    trackButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
    },
    viewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    viewButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.textDim,
    },

    // Error States
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    errorCard: {
      alignItems: 'center',
      padding: spacing.xl,
      borderRadius: 24,
      width: '100%',
      maxWidth: 320,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    errorIconContainer: {
      marginBottom: spacing.lg,
      borderRadius: 32,
      overflow: 'hidden',
    },
    errorIconGradient: {
      padding: spacing.lg,
      borderRadius: 32,
    },
    errorText: {
      fontSize: 18,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: spacing.lg,
      fontWeight: '600',
    },
    retryButton: {
      borderRadius: 25,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    retryButtonGradient: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: 25,
    },
    retryText: {
      fontSize: 16,
      color: theme.colors.palette.neutral100,
      fontWeight: '600',
    },

    // Empty State
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyCard: {
      alignItems: 'center',
      padding: spacing.xl,
      borderRadius: 24,
      width: '100%',
      maxWidth: 320,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    emptyIllustration: {
      marginBottom: spacing.lg,
    },
    emptyIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    emptyDescription: {
      fontSize: 16,
      color: theme.colors.textDim,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: spacing.xl,
    },
    emptyActionButton: {
      borderRadius: 25,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    shopButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: 25,
      gap: spacing.sm,
    },
    shopButtonText: {
      fontSize: 16,
      color: theme.colors.palette.neutral900,
      fontWeight: '700',
    },
  })
