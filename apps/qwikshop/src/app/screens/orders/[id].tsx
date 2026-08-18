// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useState, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { Text, FancyAlert, ProductImage } from '@/components'
import { useAppTheme, type Theme, spacing } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useToast } from '@/components/Toast'
import LinearGradient from 'react-native-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const OrderStatusBadge = ({ status }: { status: string }) => {
  const { theme } = useAppTheme()

  const getStatusColors = () => {
    switch (status) {
      case 'pending':
        return [theme.colors.palette.accent500, theme.colors.palette.accent600]
      case 'confirmed':
        return [
          theme.colors.palette.primary500,
          theme.colors.palette.primary600,
        ]
      case 'shipped':
        return [
          theme.colors.palette.secondary500,
          theme.colors.palette.secondary600,
        ]
      case 'delivered':
        return [
          theme.colors.palette.success500,
          theme.colors.palette.success600,
        ]
      case 'cancelled':
        return [theme.colors.palette.error500, theme.colors.palette.error600]
      default:
        return [
          theme.colors.palette.neutral500,
          theme.colors.palette.neutral600,
        ]
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return 'hourglass-empty'
      case 'confirmed':
        return 'check-circle'
      case 'shipped':
        return 'local-shipping'
      case 'delivered':
        return 'done-all'
      case 'cancelled':
        return 'cancel'
      default:
        return 'info'
    }
  }

  return (
    <LinearGradient
      colors={getStatusColors()}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 20,
        gap: 4,
      }}
    >
      <MaterialIcons
        name={getStatusIcon() as any}
        size={16}
        color={theme.colors.palette.neutral900}
      />
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: theme.colors.palette.neutral900,
        }}
      >
        {status.toUpperCase()}
      </Text>
    </LinearGradient>
  )
}

const OrderItem = ({
  item,
  order,
  onUpdateQuantity,
  onRemoveItem,
  isEditing = false,
}: {
  item: any
  order: any
  onUpdateQuantity: (itemId: number, quantity: number) => void
  onRemoveItem: (itemId: number) => void
  isEditing?: boolean
}) => {
  const { theme } = useAppTheme()

  // Safety check for item data
  if (!item || !item.id) {
    return null
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.palette.neutral200,
      }}
    >
      <View style={{ position: 'relative' }}>
        <ProductImage
          productId={item.productId}
          style={{ width: 60, height: 60, borderRadius: 8 }}
          defaultSource={require('@/assets/images/placeholder_product.jpg')}
        />
        <View
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            backgroundColor: theme.colors.palette.accent500,
            borderRadius: 12,
            minWidth: 24,
            height: 24,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: theme.colors.palette.neutral100,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: theme.colors.palette.neutral100,
            }}
          >
            {item.quantity}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, marginLeft: spacing.md, gap: spacing.xs }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: theme.colors.text,
            lineHeight: 18,
          }}
          numberOfLines={2}
        >
          {item.productName}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: theme.colors.textDim,
              fontWeight: '500',
            }}
          >
            SKU: {item.sku || 'N/A'}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: theme.colors.palette.accent500,
              }}
            >
              ${item.discountedPrice.toFixed(2)}
            </Text>
            {item.price > item.discountedPrice && (
              <Text
                style={{
                  fontSize: 12,
                  color: theme.colors.textDim,
                  textDecorationLine: 'line-through',
                }}
              >
                ${item.price.toFixed(2)}
              </Text>
            )}
          </View>
        </View>

        <View style={{ marginTop: spacing.xs }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: theme.colors.palette.primary600,
            }}
          >
            Total: ${(item.discountedPrice * item.quantity).toFixed(2)}
          </Text>
        </View>

        {/* Controls row - only show when editing */}
        {isEditing && order.status === 'pending' && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: spacing.xs,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
              }}
            >
              <TouchableOpacity
                style={{ borderRadius: 16 }}
                onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
              >
                <LinearGradient
                  colors={[
                    theme.colors.palette.primary500,
                    theme.colors.palette.primary600,
                  ]}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons
                    name="remove"
                    size={16}
                    color={theme.colors.palette.neutral100}
                  />
                </LinearGradient>
              </TouchableOpacity>

              <View
                style={{
                  backgroundColor: theme.colors.palette.neutral200,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  borderRadius: 8,
                  minWidth: 40,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: theme.colors.text,
                  }}
                >
                  {item.quantity}
                </Text>
              </View>

              <TouchableOpacity
                style={{ borderRadius: 16 }}
                onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
              >
                <LinearGradient
                  colors={[
                    theme.colors.palette.primary500,
                    theme.colors.palette.primary600,
                  ]}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons
                    name="add"
                    size={16}
                    color={theme.colors.palette.neutral100}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{ borderRadius: 16 }}
              onPress={() => onRemoveItem(item.id)}
            >
              <LinearGradient
                colors={[
                  theme.colors.palette.error500,
                  theme.colors.palette.error600,
                ]}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={18}
                  color={theme.colors.palette.neutral100}
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

export default observer(function OrderDetailsScreen() {
  const { id, sessionId, timeStamp } = useLocalSearchParams()
  const router = useRouter()
  const toast = useToast()
  const insets = useSafeAreaInsets()
  const { orderStore, userStore, sessionStore } = useStores()
  const { theme } = useAppTheme()
  const [order, setOrder] = useState<any>(null)
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null)
  const [showConfirmSave, setShowConfirmSave] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const styles = useMemo(() => createStyles(theme), [theme])

  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('OrderDetails', `/screens/orders/${id}`)
  const canModifyOrder = order?.status === 'pending' || false

  // Single useEffect for initialization
  useEffect(() => {
    let isMounted = true

    const initializeScreen = async () => {
      try {
        // First try to restore from session if sessionId exists
        if (sessionId) {
          const sessionData = sessionStore.getSession(sessionId as string)
          if (sessionData?.data && isMounted) {
            console.log('Restoring order details session:', sessionData)
            trackContentChange(sessionData.data)
          }
        }

        trackScreenMount({
          orderId: id,
          isAuthenticated: !!userStore.currentUser?.id,
          sessionId,
        })

        if (userStore.currentUser?.id && id && isMounted) {
          // Load the order from store
          const loadedOrder = await orderStore.loadOrderById(
            Number(id),
            userStore.currentUser.id,
          )

          if (loadedOrder && isMounted) {
            setOrder(JSON.parse(JSON.stringify(loadedOrder)))
            setIsInitialized(true)

            trackContentChange({
              orderLoaded: true,
              status: loadedOrder.status,
              itemCount: loadedOrder.items.length,
              totalAmount: loadedOrder.grandTotal,
            })
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error loading order:', error)
          trackContentChange({
            orderLoaded: false,
            error: String(error),
          })
        }
      }
    }

    initializeScreen()

    return () => {
      isMounted = false
      // Clear pending order when leaving screen
      if (orderStore.isEditing) {
        orderStore.cancelEditing()
      }
    }
  }, [id, userStore.currentUser?.id, timeStamp])

  // Separate useEffect for handling editing state changes
  useEffect(() => {
    if (!isInitialized) return

    if (orderStore.isEditing && orderStore.pendingOrder) {
      setOrder(JSON.parse(JSON.stringify(orderStore.pendingOrder)))
    } else if (!orderStore.isEditing) {
      const currentOrder = orderStore.getOrderById(Number(id))
      if (currentOrder) {
        setOrder(JSON.parse(JSON.stringify(currentOrder)))
      }
    }
  }, [orderStore.pendingOrder, orderStore.isEditing, id, isInitialized])

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

  // Early return if not initialized or still loading
  if (orderStore.isLoading || !isInitialized) {
    return (
      <LinearGradient
        colors={[
          theme.colors.palette.primary100,
          theme.colors.palette.primary200,
        ]}
        style={styles.container}
      >
        {/* Modern Header */}
        <LinearGradient
          colors={[
            theme.colors.palette.primary500,
            theme.colors.palette.primary600,
          ]}
          style={[styles.header, { paddingTop: insets.top + 10 }]}
        >
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.headerRight} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={[
              theme.colors.palette.neutral100,
              theme.colors.backgroundSecondary,
            ]}
            style={styles.loadingCard}
          >
            <ActivityIndicator
              size="large"
              color={theme.colors.palette.primary500}
            />
            <Text style={styles.loadingText}>Loading order details...</Text>
          </LinearGradient>
        </View>
      </LinearGradient>
    )
  }

  if (!order) {
    return (
      <LinearGradient
        colors={[
          theme.colors.palette.primary100,
          theme.colors.palette.primary200,
        ]}
        style={styles.container}
      >
        {/* Modern Header */}
        <LinearGradient
          colors={[
            theme.colors.palette.primary500,
            theme.colors.palette.primary600,
          ]}
          style={[styles.header, { paddingTop: insets.top + 10 }]}
        >
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.headerRight} />
        </LinearGradient>

        <View style={styles.errorContainer}>
          <LinearGradient
            colors={[
              theme.colors.palette.error100,
              theme.colors.palette.error200,
            ]}
            style={styles.errorCard}
          >
            <MaterialIcons
              name="error-outline"
              size={64}
              color={theme.colors.palette.error500}
            />
            <Text style={styles.errorText}>Order not found</Text>
            <Text style={styles.errorSubtext}>
              This order may have been deleted or doesn't exist.
            </Text>
          </LinearGradient>
        </View>
      </LinearGradient>
    )
  }

  const renderOrderSummary = () => (
    <View style={styles.modernCard}>
      <LinearGradient
        colors={[
          theme.colors.palette.neutral100,
          theme.colors.backgroundSecondary,
        ]}
        style={styles.cardGradient}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderTitleSection}>
            <MaterialIcons
              name="receipt-long"
              size={24}
              color={theme.colors.palette.primary500}
            />
            <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          </View>
          <OrderStatusBadge status={order.status} />
        </View>

        <View style={styles.orderInfoGrid}>
          <View style={styles.infoItem}>
            <MaterialIcons
              name="event"
              size={20}
              color={theme.colors.palette.secondary500}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Order Date</Text>
              <Text style={styles.infoValue}>
                {new Date(order.orderDate).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons
              name="payments"
              size={20}
              color={theme.colors.palette.accent500}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>
                ${order.grandTotal.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  )

  const renderDeliveryAddress = () => {
    const address = order.deliveryAddress || order.shippingAddressSnapshot
    return (
      <View style={styles.modernCard}>
        <LinearGradient
          colors={[
            theme.colors.palette.neutral100,
            theme.colors.backgroundSecondary,
          ]}
          style={styles.cardGradient}
        >
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="location-on"
              size={24}
              color={theme.colors.palette.primary500}
            />
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>

          {address ? (
            <View style={styles.addressContent}>
              <View style={styles.addressHeader}>
                <Text style={styles.addressName}>{address.fullName}</Text>
                {order.shippingAddressSnapshot && (
                  <View style={styles.deletedBadge}>
                    <MaterialIcons
                      name="warning"
                      size={16}
                      color={theme.colors.palette.accent500}
                    />
                    <Text style={styles.deletedText}>Deleted</Text>
                  </View>
                )}
              </View>

              <View style={styles.addressDetails}>
                <Text style={styles.addressText}>{address.street}</Text>
                <Text style={styles.addressText}>
                  {address.city}, {address.state} {address.pincode}
                </Text>
                {address.phone && (
                  <View style={styles.phoneRow}>
                    <MaterialIcons
                      name="phone"
                      size={16}
                      color={theme.colors.palette.secondary500}
                    />
                    <Text style={styles.phoneText}>{address.phone}</Text>
                  </View>
                )}
              </View>

              {order.shippingAddressSnapshot && (
                <View style={styles.warningNote}>
                  <Text style={styles.warningText}>
                    This address has been removed from your address book
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noAddressContainer}>
              <MaterialIcons
                name="location-off"
                size={48}
                color={theme.colors.palette.neutral400}
              />
              <Text style={styles.noAddressText}>Address not available</Text>
              <Text style={styles.noAddressSubtext}>
                The delivery address for this order is no longer available.
              </Text>
            </View>
          )}
        </LinearGradient>
      </View>
    )
  }
  const renderBillingSummary = () => (
    <View style={styles.modernCard}>
      <LinearGradient
        colors={[
          theme.colors.palette.neutral100,
          theme.colors.backgroundSecondary,
        ]}
        style={styles.cardGradient}
      >
        <View style={styles.sectionHeader}>
          <MaterialIcons
            name="receipt"
            size={24}
            color={theme.colors.palette.primary500}
          />
          <Text style={styles.sectionTitle}>Billing Summary</Text>
        </View>

        <View style={styles.billingSummary}>
          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>Subtotal</Text>
            <Text style={styles.billingValue}>
              ${order.subtotal?.toFixed(2)}
            </Text>
          </View>

          {order.totalSavings > 0 && (
            <View style={styles.billingRow}>
              <View style={styles.savingsRow}>
                <MaterialIcons
                  name="savings"
                  size={16}
                  color={theme.colors.palette.success500}
                />
                <Text style={[styles.billingLabel, styles.savingsLabel]}>
                  Total Savings
                </Text>
              </View>
              <Text style={[styles.billingValue, styles.savingsValue]}>
                -${order.totalSavings.toFixed(2)}
              </Text>
            </View>
          )}

          {order.couponDiscount > 0 && (
            <View style={styles.billingRow}>
              <View style={styles.promoRow}>
                <MaterialIcons
                  name="local-offer"
                  size={16}
                  color={theme.colors.palette.secondary500}
                />
                <Text style={[styles.billingLabel, styles.promoLabel]}>
                  {order.couponCode}
                </Text>
              </View>
              <Text style={[styles.billingValue, styles.savingsValue]}>
                -${order.couponDiscount.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>Shipping</Text>
            <Text style={[styles.billingValue, styles.freeShipping]}>
              {order.shipping > 0 ? `$${order.shipping.toFixed(2)}` : 'FREE'}
            </Text>
          </View>

          {order.tax > 0 && (
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Tax</Text>
              <Text style={styles.billingValue}>${order.tax.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.billingDivider} />

          <View style={styles.billingTotal}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>
              ${order.grandTotal.toFixed(2)}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  )

  // const ListHeaderComponent = () => (
  //   <>
  //     {renderOrderSummary()}
  //     {renderDeliveryAddress()}
  //     <Text style={styles.sectionTitle}>Order Items</Text>
  //   </>
  // )

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

      // Small delay to ensure state is updated
      setTimeout(async () => {
        // Reload the order to ensure we have the latest data
        if (userStore.currentUser?.id) {
          try {
            const updatedOrder = await orderStore.loadOrderById(
              Number(id),
              userStore.currentUser.id,
            )
            if (updatedOrder) {
              setOrder(JSON.parse(JSON.stringify(updatedOrder)))
            }
          } catch (reloadError) {
            console.error('Failed to reload order after save:', reloadError)
          }
        }
      }, 100)
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
    <LinearGradient
      key={`order-${id}`}
      colors={[
        theme.colors.palette.primary100,
        theme.colors.palette.primary200,
      ]}
      style={styles.container}
    >
      {/* Modern Header */}
      <LinearGradient
        colors={[
          theme.colors.palette.primary500,
          theme.colors.palette.primary600,
        ]}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.palette.neutral100}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.headerRight}>
          {canModifyOrder &&
            (orderStore.isEditing ? (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => setShowConfirmSave(true)}
              >
                <LinearGradient
                  colors={[
                    theme.colors.palette.success500,
                    theme.colors.palette.success600,
                  ]}
                  style={styles.saveButtonGradient}
                >
                  <MaterialIcons
                    name="save"
                    size={18}
                    color={theme.colors.palette.neutral100}
                  />
                  <Text style={styles.saveButtonText}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleStartEditing}
              >
                <MaterialIcons
                  name="edit"
                  size={20}
                  color={theme.colors.palette.neutral100}
                />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {renderOrderSummary()}
        {renderDeliveryAddress()}

        {/* Order Items Section */}
        <View style={styles.modernCard}>
          <LinearGradient
            colors={[
              theme.colors.palette.neutral100,
              theme.colors.backgroundSecondary,
            ]}
            style={styles.cardGradient}
          >
            <View style={styles.sectionHeader}>
              <MaterialIcons
                name="shopping-cart"
                size={24}
                color={theme.colors.palette.primary500}
              />
              <Text style={styles.sectionTitle}>
                Order Items ({order?.items?.length || 0})
              </Text>
            </View>

            {order?.items && Array.isArray(order.items)
              ? order.items.map((item: any, index: number) => (
                  <View
                    key={`item-${item.id}-${order.id}`}
                    style={
                      index === order.items.length - 1 && styles.lastOrderItem
                    }
                  >
                    <OrderItem
                      item={item}
                      order={order}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemoveItem={deleteAlert}
                      isEditing={orderStore.isEditing}
                    />
                  </View>
                ))
              : null}
          </LinearGradient>
        </View>

        {renderBillingSummary()}
      </ScrollView>

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
    </LinearGradient>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },

    // Header Styles
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      backgroundColor: theme.colors.palette.primary300,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      textAlign: 'center',
    },
    headerRight: {
      width: 40,
      alignItems: 'flex-end',
    },
    saveButton: {
      borderRadius: 20,
    },
    saveButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 20,
      gap: 4,
    },
    saveButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    editButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },

    // Content Styles
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.md,
    },

    // Modern Card Styles
    modernCard: {
      borderRadius: 16,
      marginBottom: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cardGradient: {
      borderRadius: 16,
      padding: spacing.md,
    },

    // Section Header
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },

    // Order Summary Styles
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    orderTitleSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    orderNumber: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 20,
      gap: 4,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    orderInfoGrid: {
      gap: spacing.md,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 12,
      color: theme.colors.textDim,
      fontWeight: '500',
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    totalAmount: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.accent500,
    },

    // Address Styles
    addressContent: {
      gap: spacing.sm,
    },
    addressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    addressName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    deletedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.accent100,
      paddingHorizontal: spacing.xs,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    deletedText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.palette.accent600,
    },
    addressDetails: {
      gap: 4,
    },
    addressText: {
      fontSize: 14,
      color: theme.colors.textDim,
      lineHeight: 20,
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    phoneText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.secondary600,
    },
    warningNote: {
      backgroundColor: theme.colors.palette.accent100,
      padding: spacing.sm,
      borderRadius: 8,
      marginTop: spacing.sm,
    },
    warningText: {
      fontSize: 12,
      color: theme.colors.palette.accent600,
      fontStyle: 'italic',
    },
    noAddressContainer: {
      alignItems: 'center',
      padding: spacing.lg,
      gap: spacing.sm,
    },
    noAddressText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textDim,
    },
    noAddressSubtext: {
      fontSize: 14,
      color: theme.colors.textDim,
      textAlign: 'center',
    },

    // Order Item Styles
    orderItem: {
      flexDirection: 'row',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    lastOrderItem: {
      borderBottomWidth: 0,
    },
    itemImageContainer: {
      position: 'relative',
    },
    itemImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
    },
    quantityBadge: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: theme.colors.palette.accent500,
      borderRadius: 12,
      minWidth: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral100,
    },
    quantityBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    itemContent: {
      flex: 1,
      marginLeft: spacing.md,
      gap: spacing.xs,
    },
    itemTotal: {
      marginTop: spacing.xs,
    },
    itemTotalText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.primary600,
    },
    itemName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
      lineHeight: 18,
    },
    itemMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    skuText: {
      fontSize: 11,
      color: theme.colors.textDim,
      fontWeight: '500',
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    currentPrice: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.accent500,
    },
    originalPrice: {
      fontSize: 12,
      color: theme.colors.textDim,
      textDecorationLine: 'line-through',
    },

    // Edit Controls
    editControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    quantityControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    quantityButton: {
      borderRadius: 16,
    },
    quantityButtonGradient: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quantityDisplay: {
      backgroundColor: theme.colors.palette.neutral200,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 8,
      minWidth: 40,
      alignItems: 'center',
    },
    quantityText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
    },
    removeButton: {
      borderRadius: 16,
    },
    removeButtonGradient: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Billing Summary Styles
    billingSummary: {
      gap: spacing.sm,
    },
    billingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    billingLabel: {
      fontSize: 14,
      color: theme.colors.textDim,
      fontWeight: '500',
    },
    billingValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    savingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    savingsLabel: {
      color: theme.colors.palette.success600,
    },
    savingsValue: {
      color: theme.colors.palette.success600,
      fontWeight: '700',
    },
    promoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    promoLabel: {
      color: theme.colors.palette.secondary600,
      fontWeight: '600',
    },
    freeShipping: {
      color: theme.colors.palette.success600,
      fontWeight: '700',
    },
    billingDivider: {
      height: 1,
      backgroundColor: theme.colors.palette.neutral300,
      marginVertical: spacing.sm,
    },
    billingTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    totalValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.accent500,
    },

    // Loading and Error States
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    loadingCard: {
      alignItems: 'center',
      padding: spacing.xl,
      borderRadius: 16,
      gap: spacing.md,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textDim,
      fontWeight: '500',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    errorCard: {
      alignItems: 'center',
      padding: spacing.xl,
      borderRadius: 16,
      gap: spacing.md,
    },
    errorText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.error600,
      textAlign: 'center',
    },
    errorSubtext: {
      fontSize: 14,
      color: theme.colors.palette.error500,
      textAlign: 'center',
    },

    // Alert Styles
    confirmDialog: {
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    deleteButton: {
      backgroundColor: theme.colors.palette.error500,
    },
    updateButton: {
      backgroundColor: theme.colors.palette.primary500,
    },
    updateButtonText: {
      color: theme.colors.palette.neutral100,
    },
  })
