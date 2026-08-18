import React, { useEffect, useRef, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { Text, Header, ProductImage } from '@/components'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useStores } from '@/models'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { MaterialIcons } from '@expo/vector-icons'
import { Instance } from 'mobx-state-tree'
import { OrderModel } from '@/models/OrderStore'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

interface OrderItemProps {
  order: Instance<typeof OrderModel>
  onPress: (orderId: number) => void
}

const OrderStatusBadge = ({
  status,
  theme,
}: {
  status: string
  theme: any
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return theme.colors.palette.accent500
      case 'confirmed':
        return theme.colors.palette.primary500
      case 'shipped':
        return theme.colors.palette.secondary500
      case 'delivered':
        return theme.colors.palette.primary300
      case 'cancelled':
        return theme.colors.palette.angry500
      default:
        return theme.colors.palette.neutral500
    }
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        statusBadge: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          borderRadius: 12,
          backgroundColor: getStatusColor(),
        },
        statusText: {
          fontSize: 12,
          fontWeight: '600',
          color: theme.colors.palette.neutral100,
        },
      }),
    [status, theme],
  )

  return (
    <View style={styles.statusBadge}>
      <Text style={styles.statusText}>{status.toUpperCase()}</Text>
    </View>
  )
}

const OrderItem = observer(
  ({ order, onPress, theme }: OrderItemProps & { theme: any }) => {
    const styles = useMemo(
      () =>
        StyleSheet.create({
          orderItem: {
            backgroundColor: theme.colors.palette.neutral100,
            borderRadius: 12,
            padding: spacing.md,
            marginBottom: spacing.sm,
          },
          orderHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.xs,
          },
          orderNumber: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.colors.palette.neutral800,
          },
          orderInfo: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: spacing.sm,
          },
          date: {
            fontSize: 14,
            color: theme.colors.palette.neutral600,
          },
          total: {
            fontSize: 14,
            fontWeight: '600',
            color: theme.colors.palette.neutral800,
          },
          itemsPreview: {
            borderTopWidth: 1,
            borderTopColor: theme.colors.palette.neutral200,
            paddingTop: spacing.sm,
          },
          previewItem: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: spacing.xs,
          },
          itemImage: {
            width: 40,
            height: 40,
            borderRadius: 4,
            marginRight: spacing.xs,
          },
          itemInfo: {
            flex: 1,
          },
          itemName: {
            fontSize: 14,
            color: theme.colors.palette.neutral800,
          },
          itemQuantity: {
            fontSize: 12,
            color: theme.colors.palette.neutral600,
          },
          moreItems: {
            fontSize: 12,
            color: theme.colors.palette.primary500,
            marginTop: spacing.xxs,
          },
        }),
      [theme],
    )

    return (
      <TouchableOpacity
        style={styles.orderItem}
        onPress={() => onPress(order.id)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
          <OrderStatusBadge status={order.status} theme={theme} />
        </View>

        <View style={styles.orderInfo}>
          <Text style={styles.date}>
            Ordered on {new Date(order.orderDate).toLocaleDateString()}
          </Text>
          <Text style={styles.total}>
            Total: ${order.grandTotal.toFixed(2)}
          </Text>
        </View>

        <View style={styles.itemsPreview}>
          {order.items.slice(0, 2).map(item => (
            <View key={item.id} style={styles.previewItem}>
              <ProductImage
                productId={item.productId}
                style={styles.itemImage}
                defaultSource={require('@/assets/images/placeholder_product.jpg')}
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.productName}
                </Text>
                <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
              </View>
            </View>
          ))}
          {order.items.length > 2 && (
            <Text style={styles.moreItems}>
              +{order.items.length - 2} more items
            </Text>
          )}
        </View>
      </TouchableOpacity>
    )
  },
)

export default observer(function OrdersScreen() {
  const { theme } = useAppTheme()
  const router = useRouter()
  const { sessionId, timeStamp } = useLocalSearchParams()
  const { orderStore, userStore, sessionStore, uiStore } = useStores()
  const lastRefreshRef = useRef(0)

  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('Orders', '/screens/orders')

  const styles = useMemo(() => createStyles(theme), [theme])

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
        <Header title="My Orders" />
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
        <Header
          title="My Orders"
          leftIcon="back"
          onLeftPress={() => router.back()}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons
            name="error-outline"
            size={64}
            color={theme.colors.palette.angry500}
          />
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
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (orderStore.orders.length === 0) {
    return (
      <View style={styles.container}>
        <Header
          title="My Orders"
          leftIcon="back"
          onLeftPress={() => router.back()}
        />
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="shopping-bag"
            size={64}
            color={theme.colors.palette.neutral400}
          />
          <Text style={styles.emptyTitle}>No Orders Yet</Text>
          <Text style={styles.emptyDescription}>
            Your orders will appear here once you make a purchase
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => {
              trackClick('startShopping')
              router.push('/(app)/(drawer)/(tabs)/home')
            }}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header
        title="My Orders"
        leftIcon="back"
        onLeftPress={() => router.back()}
      />
      <FlatList
        data={orderStore.orders}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <OrderItem order={item} onPress={handleOrderPress} theme={theme} />
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
      backgroundColor: theme.colors.background,
    },
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      padding: spacing.md,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.palette.angry500,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    retryButton: {
      marginTop: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 8,
    },
    retryText: {
      fontSize: 16,
      color: theme.colors.palette.neutral100,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral800,
      marginTop: spacing.lg,
    },
    emptyDescription: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    shopButton: {
      marginTop: spacing.xl,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 8,
    },
    shopButtonText: {
      fontSize: 16,
      color: theme.colors.palette.neutral100,
      fontWeight: '600',
    },
  })
