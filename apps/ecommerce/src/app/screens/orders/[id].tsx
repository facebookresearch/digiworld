import React, { useEffect, useState, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { Screen, Text, Header, FancyAlert, ProductImage } from '@/components'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { MaterialIcons } from '@expo/vector-icons'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useToast } from '@/components/Toast'

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

const OrderItem = ({
  item,
  order,
  onUpdateQuantity,
  onRemoveItem,
  isEditing = false,
  theme,
}: {
  item: any
  order: any
  onUpdateQuantity: (itemId: number, quantity: number) => void
  onRemoveItem: (itemId: number) => void
  isEditing?: boolean
  theme: any
}) => {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        itemCard: {
          flexDirection: 'row',
          padding: spacing.sm,
          backgroundColor: theme.colors.palette.neutral100,
          borderRadius: 8,
          marginBottom: spacing.xs,
        },
        itemImage: {
          width: 50,
          height: 50,
          borderRadius: 4,
        },
        itemContent: {
          flex: 1,
          marginLeft: spacing.sm,
        },
        itemName: {
          fontSize: 16,
          fontWeight: '600',
          color: theme.colors.palette.neutral800,
          marginBottom: spacing.xs,
        },
        metaRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.xs,
        },
        itemMeta: {
          fontSize: 12,
          color: theme.colors.palette.neutral600,
        },
        priceContainer: {
          flexDirection: 'row',
          alignItems: 'flex-end',
        },
        discountedPrice: {
          fontSize: 14,
          fontWeight: 'bold',
          color: theme.colors.palette.neutral800,
        },
        originalPrice: {
          marginLeft: spacing.sm,
          fontSize: 12,
          color: theme.colors.palette.neutral600,
          textDecorationLine: 'line-through',
        },
        controlsRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        quantityControls: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.palette.primary500,
          borderRadius: 4,
          padding: spacing.xxs,
        },
        quantityButton: {
          padding: spacing.xxs,
        },
        quantityText: {
          paddingHorizontal: spacing.sm,
          fontSize: 14,
          fontWeight: '600',
          color: theme.colors.palette.neutral100,
        },
        removeButton: {
          padding: spacing.xs,
        },
      }),
    [theme],
  )

  return (
    <View style={styles.itemCard}>
      <ProductImage
        productId={item.productId}
        style={styles.itemImage}
        defaultSource={require('@/assets/images/placeholder_product.jpg')}
      />
      <View style={styles.itemContent}>
        {/* Title */}
        <Text style={styles.itemName} numberOfLines={1}>
          {item.productName}
        </Text>

        {/* SKU and Price row */}
        <View style={styles.metaRow}>
          <Text style={styles.itemMeta}>
            SKU: {item.sku || 'N/A'} • {item.quantity} units
          </Text>
          <View style={styles.priceContainer}>
            <Text style={styles.discountedPrice}>
              ${item.discountedPrice.toFixed(2)}
            </Text>
            <Text style={styles.originalPrice}>${item.price.toFixed(2)}</Text>
          </View>
        </View>

        {/* Controls row - only show when editing */}
        {isEditing && order.status === 'pending' && (
          <View style={styles.controlsRow}>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
              >
                <MaterialIcons
                  name="remove"
                  size={16}
                  color={theme.colors.palette.neutral100}
                />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
              >
                <MaterialIcons
                  name="add"
                  size={16}
                  color={theme.colors.palette.neutral100}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemoveItem(item.id)}
            >
              <MaterialIcons
                name="delete-outline"
                size={20}
                color={theme.colors.palette.angry500}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

export default observer(function OrderDetailsScreen() {
  const { theme } = useAppTheme()
  const { id, sessionId, timeStamp } = useLocalSearchParams()
  const router = useRouter()
  const toast = useToast()
  const { orderStore, userStore, sessionStore } = useStores()
  const [order, setOrder] = useState<any>(null)
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null)
  const [showConfirmSave, setShowConfirmSave] = useState(false)

  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('OrderDetails', `/screens/orders/${id}`)
  const canModifyOrder = order?.status === 'pending' || false

  const styles = useMemo(() => createStyles(theme), [theme])

  useEffect(() => {
    // First try to restore from session if sessionId exists
    if (sessionId) {
      const sessionData = sessionStore.getSession(sessionId as string)
      if (sessionData?.data) {
        console.log('Restoring order details session:', sessionData)
        trackContentChange(sessionData.data)
      }
    }

    trackScreenMount({
      orderId: id,
      isAuthenticated: !!userStore.currentUser?.id,
      sessionId,
    })

    if (userStore.currentUser?.id && id) {
      // Load the order from store
      orderStore
        .loadOrderById(Number(id), userStore.currentUser.id)
        .then(loadedOrder => {
          if (loadedOrder) {
            // Only set the order if we're not already editing
            if (!orderStore.isEditing) {
              setOrder(loadedOrder)
            }
            trackContentChange({
              orderLoaded: true,
              status: loadedOrder.status,
              itemCount: loadedOrder.items.length,
              totalAmount: loadedOrder.grandTotal,
            })
          }
        })
        .catch(error => {
          console.error('Error loading order:', error)
          trackContentChange({
            orderLoaded: false,
            error: String(error),
          })
        })
    }
  }, [id, userStore.currentUser?.id, timeStamp])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear pending order when leaving screen
      if (orderStore.isEditing) {
        orderStore.cancelEditing()
      }
    }
  }, [])

  useEffect(() => {
    if (orderStore.isEditing && orderStore.pendingOrder) {
      setOrder(JSON.parse(JSON.stringify(orderStore.pendingOrder)))
    } else if (!orderStore.isEditing) {
      const currentOrder = orderStore.getOrderById(Number(id))
      if (currentOrder) {
        setOrder(JSON.parse(JSON.stringify(currentOrder)))
      }
    }
  }, [orderStore.pendingOrder, orderStore.isEditing, id])

  const handleStartEditing = () => {
    if (!canModifyOrder) return
    orderStore.startEditing(Number(id))
    setOrder(orderStore.pendingOrder)
  }
  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/screens/orders')
    }
  }

  if (orderStore.isLoading) {
    return (
      <Screen style={styles.container} preset="fixed" safeAreaEdges={['top']}>
        <Header
          title="Order Details"
          leftIcon="back"
          onLeftPress={handleBackPress}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.primary500}
          />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </Screen>
    )
  }

  if (!order) {
    return (
      <Screen style={styles.container} preset="fixed" safeAreaEdges={['top']}>
        <Header
          title="Order Details"
          leftIcon="back"
          onLeftPress={handleBackPress}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons
            name="error-outline"
            size={64}
            color={theme.colors.palette.angry500}
          />
          <Text style={styles.errorText}>Order not found</Text>
        </View>
      </Screen>
    )
  }

  const renderOrderSummary = () => (
    <View style={styles.section}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
        <OrderStatusBadge status={order.status} theme={theme} />
      </View>
      <View style={styles.orderInfo}>
        <Text style={styles.infoLabel}>Order Date</Text>
        <Text style={styles.infoValue}>
          {new Date(order.orderDate).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.orderInfo}>
        <Text style={styles.infoLabel}>Total Amount</Text>
        <Text style={styles.infoValue}>${order.grandTotal.toFixed(2)}</Text>
      </View>
    </View>
  )

  const renderDeliveryAddress = () => {
    const address = order.deliveryAddress || order.shippingAddressSnapshot
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        {address ? (
          <View style={styles.addressCard}>
            <Text style={styles.addressName}>{address.fullName}</Text>
            <Text style={styles.addressText}>{address.street}</Text>
            <Text style={styles.addressText}>
              {address.city}, {address.state} {address.pincode}
            </Text>
            {address.phone && (
              <Text style={styles.addressText}>Phone: {address.phone}</Text>
            )}
            {order.shippingAddressSnapshot && (
              <Text style={styles.deletedAddressNote}>
                (This address has been deleted from your address book)
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.addressCard}>
            <MaterialIcons
              name="location-off"
              size={24}
              color={theme.colors.palette.neutral500}
            />
            <Text style={styles.noAddressText}>Address not available</Text>
            <Text style={styles.addressText}>
              The delivery address for this order is no longer available.
            </Text>
          </View>
        )}
      </View>
    )
  }
  const renderBillingSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Billing Summary</Text>
      <View style={styles.billingSummary}>
        <View style={styles.billingRow}>
          <Text style={styles.billingLabel}>Subtotal</Text>
          <Text style={styles.billingValue}>${order.subtotal?.toFixed(2)}</Text>
        </View>
        {order.totalSavings > 0 && (
          <View style={styles.billingRow}>
            <Text style={[styles.billingLabel, styles.savingsLabel]}>
              Total Savings
            </Text>
            <Text style={[styles.billingValue, styles.savingsValue]}>
              -${order.totalSavings.toFixed(2)}
            </Text>
          </View>
        )}
        {order.couponDiscount > 0 && (
          <View style={styles.billingRow}>
            <Text style={[styles.billingLabel, styles.savingsLabel]}>
              Promo Code: {order.couponCode}
            </Text>
            <Text style={[styles.billingValue, styles.savingsValue]}>
              -${order.couponDiscount.toFixed(2)}
            </Text>
          </View>
        )}
        {order.shipping > 0 && (
          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>Shipping</Text>
            <Text style={styles.billingValue}>
              ${order.shipping.toFixed(2)}
            </Text>
          </View>
        )}
        {order.tax > 0 && (
          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>Tax</Text>
            <Text style={styles.billingValue}>${order.tax.toFixed(2)}</Text>
          </View>
        )}
        <View style={styles.billingTotal}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${order.grandTotal.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  )

  const ListHeaderComponent = () => (
    <>
      {renderOrderSummary()}
      {renderDeliveryAddress()}
      <Text style={styles.sectionTitle}>Order Items</Text>
    </>
  )

  const deleteAlert = (itemId: number) => {
    setDeleteItemId(itemId)
  }

  const handleUpdateQuantity = (itemId: number, newQuantity: number) => {
    if (!canModifyOrder) return

    if (newQuantity === 0) {
      deleteAlert(itemId)
      return
    }
    trackClick('updateOrderQuantity')
    orderStore.updatePendingOrderItem(itemId, newQuantity)
    setOrder({ ...orderStore.pendingOrder })
  }

  const handleRemoveItem = (itemId: number) => {
    if (!canModifyOrder) return

    trackClick('removeOrderItem')
    orderStore.removePendingOrderItem(itemId)
    // The order will be updated via the useEffect above
    setDeleteItemId(null)
  }

  const handleConfirmChanges = async () => {
    setShowConfirmSave(false)
    try {
      trackClick('confirmOrderChanges')
      await orderStore.saveChanges()
      // Reload the order to ensure we have the latest data
      if (userStore.currentUser?.id) {
        const updatedOrder = await orderStore.loadOrderById(
          Number(id),
          userStore.currentUser.id,
        )
        if (updatedOrder) {
          setOrder(JSON.parse(JSON.stringify(updatedOrder)))
        }
      }
    } catch (error) {
      console.error('Failed to update order:', error)
      toast.show({
        title: 'Failed to save changes',
        preset: 'error',
        placement: 'top',
      })
    }
  }

  return (
    <Screen style={styles.container} preset="fixed">
      <Header
        title="Order Details"
        leftIcon="back"
        onLeftPress={handleBackPress}
        RightActionComponent={
          canModifyOrder ? (
            <View style={styles.headerActions}>
              {orderStore.isEditing ? (
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => setShowConfirmSave(true)}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleStartEditing}>
                  <Text style={styles.headerActionText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View />
          )
        }
      />
      <FlatList
        data={order?.items || []}
        renderItem={({ item }) => (
          <OrderItem
            item={item}
            order={order}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={deleteAlert}
            isEditing={orderStore.isEditing}
            theme={theme}
          />
        )}
        keyExtractor={item => item.id}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={renderBillingSummary}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      />

      <FancyAlert
        visible={deleteItemId !== null}
        message="Do you want to remove this item from the order?"
        icon="trash-outline"
        onClose={() => setDeleteItemId(null)}
        onConfirm={() => {
          if (deleteItemId) handleRemoveItem(deleteItemId)
          setDeleteItemId(null)
        }}
        confirmText="Delete"
        confirmButtonStyle={styles.deleteButton}
      />

      <FancyAlert
        visible={showConfirmSave}
        title="Confirm updates to order?"
        message="Updated invoices would be sent to your registered email."
        icon="save-outline"
        onClose={() => setShowConfirmSave(false)}
        onConfirm={handleConfirmChanges}
        containerStyle={styles.confirmDialog}
        confirmText="Confirm"
        confirmButtonStyle={styles.updateButton}
        confirmTextStyle={styles.updateButtonText}
      />
    </Screen>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    contentContainer: {
      padding: spacing.md,
    },
    section: {
      marginBottom: spacing.lg,
    },
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    orderNumber: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
    },
    orderInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
    },
    infoLabel: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.palette.neutral800,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
      marginBottom: spacing.sm,
    },
    addressCard: {
      backgroundColor: theme.colors.palette.neutral100,
      padding: spacing.md,
      borderRadius: 8,
    },
    addressName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
      marginBottom: spacing.xs,
    },
    addressText: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      marginBottom: spacing.xxs,
    },
    noAddressText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
      marginVertical: spacing.xs,
    },
    deletedAddressNote: {
      fontSize: 12,
      fontStyle: 'italic',
      color: theme.colors.palette.neutral500,
      marginTop: spacing.xs,
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    billingSummary: {
      backgroundColor: theme.colors.palette.neutral100,
      padding: spacing.md,
      borderRadius: 8,
    },
    billingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
    },
    billingLabel: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },
    billingValue: {
      fontSize: 14,
      color: theme.colors.palette.neutral800,
    },
    savingsLabel: {
      color: theme.colors.palette.secondary500,
    },
    savingsValue: {
      color: theme.colors.palette.secondary500,
      fontWeight: '500',
    },
    billingTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: spacing.sm,
      marginTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral300,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
    },
    totalValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    headerActionText: {
      fontSize: 16,
      color: theme.colors.palette.primary500,
      fontWeight: '600',
    },
    saveButton: {
      backgroundColor: theme.colors.palette.primary500,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 4,
    },
    saveButtonText: {
      fontSize: 16,
      color: theme.colors.palette.neutral100,
      fontWeight: '600',
    },
    confirmDialog: {
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    deleteButton: {
      backgroundColor: theme.colors.error,
    },
    updateButton: {
      backgroundColor: theme.colors.palette.primary500,
    },
    updateButtonText: {
      color: theme.colors.palette.neutral100,
    },
  })
