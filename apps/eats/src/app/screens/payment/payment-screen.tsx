// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useStores } from '@/models/helpers/useStores'
import { useTheme } from '@andojo/shared-theme'
import { Screen, Text } from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { observer } from 'mobx-react-lite'
import React, { useState, useCallback } from 'react'
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native'
import { db } from '@/db'
import { ordersTable, orderItemsTable, restaurantsTable } from '@/db/schema'
import { eq } from 'drizzle-orm'
import CustomAlert from '@/app/components/CustomAlert'
import { OrderStatus } from '@/app/constants/orderStatus'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

type PaymentMethod = 'card' | 'cash' | 'apple_pay'

const PaymentScreen = observer(() => {
  const router = useRouter()
  const { cartStore, userStore, sessionStore } = useStores()
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const { trackScreenMount, trackContentChange } = useInteractionTracking(
    'PaymentScreen',
    '/screens/payment/payment-screen',
  )
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>('card')
  const [isLoading, setIsLoading] = useState(false)
  const { theme } = useTheme()
  const colors = theme.colors
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean
    title: string
    message: string
    type: 'default' | 'warning' | 'error' | 'success'
    confirmText: string
    cancelText: string
    showCancel: boolean
    onConfirm: () => void
    onCancel: () => void
    orderId?: string
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'default',
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: true,
    onConfirm: () => {},
    onCancel: () => {},
  })

  // Restore alert state from session if available
  React.useEffect(() => {
    if (!sessionTimeStamp) return
    const session = sessionStore.getSession(sessionId as string)
    if (!session?.data?.sessionData?.formData) return
    const formData = session.data.sessionData.formData as any
    // Restore selectedPaymentMethod if present
    if (formData.selectedPaymentMethod) {
      setSelectedPaymentMethod(formData.selectedPaymentMethod)
    }
    const action = formData.action
    if (action === 'show_alert' && formData.alertConfig) {
      setAlertConfig({
        ...formData.alertConfig,
        onConfirm: () => {
          hideAlert()
          router.replace({
            pathname: '/screens/order/order-tracking',
            params: { orderId: formData.alertConfig.orderId },
          })
        },
        onCancel: () => {
          hideAlert()
          router.replace('/(tabs)/home')
        },
      })
    } else if (action === 'show_alert') {
      setAlertConfig(prev => ({
        ...prev,
        visible: true,
        title: prev.title || 'Alert',
        message: prev.message || '',
        type: prev.type || 'default',
        onConfirm: () => setAlertConfig(p => ({ ...p, visible: false })),
        onCancel: () => setAlertConfig(p => ({ ...p, visible: false })),
      }))
    } else if (action === 'hide_alert') {
      setAlertConfig(prev => ({ ...prev, visible: false }))
    }
  }, [sessionTimeStamp])

  // Track screen mount
  React.useEffect(() => {
    trackScreenMount({
      timestamp: Date.now(),
      platform: Platform.OS,
      screenDimensions: {
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
      },
      userId: userStore.currentUser?.id,
    })
  }, [])

  // Track selectedPaymentMethod changes and persist in session
  React.useEffect(() => {
    if (!sessionTimeStamp) return
    // Track content change
    trackContentChange({
      action: 'select_payment_method',
      selectedPaymentMethod,
      timestamp: Date.now(),
      userId: userStore.currentUser?.id,
    })
  }, [selectedPaymentMethod, sessionTimeStamp])

  const showAlert = (config: Omit<typeof alertConfig, 'visible'>) => {
    setAlertConfig({ ...config, visible: true })
    trackContentChange({
      action: 'show_alert',
      alertConfig: { ...config, visible: true },
      timestamp: Date.now(),
      userId: userStore.currentUser?.id,
    })
  }

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }))
    trackContentChange({
      action: 'hide_alert',
      timestamp: Date.now(),
      userId: userStore.currentUser?.id,
    })
  }

  const handleBackPress = () => {
    // Use replace to prevent back navigation to cart
    router.replace('/')
  }

  const getDeliveryFee = useCallback(async (restaurantId: number) => {
    const restaurant = await db
      .select()
      .from(restaurantsTable)
      .where(eq(restaurantsTable.id, restaurantId))
      .get()
    return restaurant?.deliveryFee || 0
  }, [])

  const [deliveryFee, setDeliveryFee] = useState(0)

  // Update delivery fee when cart items change
  React.useEffect(() => {
    async function updateDeliveryFee() {
      if (cartStore.items[0]?.menuItem.restaurantId) {
        const fee = await getDeliveryFee(
          cartStore.items[0].menuItem.restaurantId,
        )
        setDeliveryFee(fee)
      }
    }
    updateDeliveryFee()
  }, [cartStore.items, getDeliveryFee])

  const subtotal = cartStore.subtotal
  const total = subtotal + deliveryFee

  const handlePlaceOrder = async () => {
    if (!userStore.selectedAddress) {
      showAlert({
        title: 'Address Required',
        message: 'Please select a delivery address to continue.',
        type: 'warning',
        confirmText: 'OK',
        cancelText: 'Cancel',
        showCancel: false,
        onConfirm: () => {
          hideAlert()
          router.replace('/screens/address/address-list')
        },
        onCancel: hideAlert,
      })
      return
    }

    setIsLoading(true)
    try {
      const userId = userStore.currentUser?.id
      if (!userId) {
        throw new Error('User not logged in')
      }

      const restaurantId = cartStore.items[0].menuItem.restaurantId
      const subtotal = cartStore.subtotal
      const total = subtotal + deliveryFee

      // Create order
      const order = await db
        .insert(ordersTable)
        .values({
          userId,
          restaurantId,
          addressId: userStore.selectedAddress.id,
          status: OrderStatus.Pending,
          total,
          deliveryAddress: `${userStore.selectedAddress.addressLine1}, ${userStore.selectedAddress.city}, ${userStore.selectedAddress.state} ${userStore.selectedAddress.postalCode}`,
          paymentMethod: selectedPaymentMethod,
          specialInstructions: '',
          cutlery: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning({ id: ordersTable.id })
        .get()

      // Create order items
      await Promise.all(
        cartStore.items.map(item =>
          db.insert(orderItemsTable).values({
            orderId: order.id,
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            price: item.menuItem.price,
            specialInstructions: '',
          }),
        ),
      )

      // Clear cart and show success
      cartStore.clearCart()
      showAlert({
        title: 'Order Placed Successfully!',
        message: 'Your order has been placed and is being prepared.',
        type: 'success',
        confirmText: 'Track Order',
        cancelText: 'Back to Home',
        showCancel: true,
        orderId: order.id,
        onConfirm: () => {
          hideAlert()
          // Use replace to prevent back navigation to cart
          router.replace({
            pathname: '/screens/order/order-tracking',
            params: { orderId: order.id },
          })
        },
        onCancel: () => {
          hideAlert()
          // Use replace to prevent back navigation to cart
          router.replace('/(tabs)/home')
        },
      })
    } catch (error) {
      console.error('Error placing order:', error)
      showAlert({
        title: 'Order Failed',
        message: 'There was an error placing your order. Please try again.',
        type: 'error',
        confirmText: 'OK',
        cancelText: 'Cancel',
        showCancel: false,
        onConfirm: hideAlert,
        onCancel: hideAlert,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    contentContainerStyle: {
      flexGrow: 1,
    },
    gradientBackground: {
      ...StyleSheet.absoluteFillObject,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 12,
      backgroundColor: 'transparent',
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      backgroundColor: colors.palette.overlay20,
    },
    headerTitle: {
      flex: 1,
      color: colors.palette.neutral100,
      marginLeft: 12,
    },
    scroll: {
      flex: 1,
    },
    scrollContentContainer: {
      padding: 16,
      paddingBottom: 100,
    },
    section: {
      marginBottom: 20,
      padding: 16,
    },
    glassEffect: {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(10px)',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.4)',
      shadowColor: colors.palette.neutral800,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    sectionTitle: {
      marginBottom: 16,
      color: colors.palette.neutral800,
    },
    addressCard: {
      padding: 16,
      backgroundColor: colors.palette.neutral100,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.palette.neutral200,
    },
    addressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    addressLabel: {
      marginLeft: 8,
      color: colors.palette.neutral800,
    },
    defaultBadge: {
      marginLeft: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: colors.palette.primary500,
      borderRadius: 12,
    },
    defaultBadgeText: {
      color: colors.palette.neutral100,
    },
    addressText: {
      color: colors.palette.neutral600,
      marginBottom: 4,
    },
    addAddressButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      backgroundColor: colors.palette.neutral100,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.palette.neutral300,
    },
    addAddressText: {
      marginLeft: 8,
      color: colors.palette.primary500,
    },
    paymentMethods: {
      gap: 12,
    },
    paymentMethod: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.palette.neutral100,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.palette.neutral200,
    },
    selectedPaymentMethod: {
      backgroundColor: colors.palette.primary500,
      borderColor: colors.palette.primary500,
    },
    paymentMethodText: {
      marginLeft: 12,
      color: colors.palette.neutral700,
    },
    selectedPaymentMethodText: {
      color: colors.palette.neutral100,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    totalRow: {
      marginTop: 8,
      marginBottom: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.palette.neutral200,
    },
    totalAmount: {
      color: colors.palette.primary500,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderTopWidth: 1,
      borderTopColor: colors.palette.neutral200,
    },
    placeOrderButton: {
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: colors.palette.primary500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    placeOrderButtonDisabled: {
      opacity: 0.7,
    },
    placeOrderButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
    },
    placeOrderButtonText: {
      color: colors.palette.neutral100,
      fontSize: 18,
      marginRight: 8,
    },
    buttonIcon: {
      marginLeft: 4,
    },
  })

  return (
    <Screen
      preset="scroll"
      style={styles.container}
      contentContainerStyle={styles.contentContainerStyle}
    >
      <LinearGradient
        colors={[colors.palette.primary400, colors.palette.primary500]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.palette.neutral100}
          />
        </TouchableOpacity>
        <Text
          text="Payment & Order"
          size="large"
          weight="semibold"
          style={styles.headerTitle}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Selected Address Section */}
        <View style={[styles.section, styles.glassEffect]}>
          <Text
            text="Delivery Address"
            size="large"
            weight="semibold"
            style={styles.sectionTitle}
          />
          {userStore.selectedAddress ? (
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <Ionicons
                  name="location"
                  size={20}
                  color={colors.palette.primary500}
                />
                <Text
                  text={userStore.selectedAddress.label}
                  size="medium"
                  weight="semibold"
                  style={styles.addressLabel}
                />
                {userStore.selectedAddress.isDefault === 1 && (
                  <View style={styles.defaultBadge}>
                    <Text
                      text="Default"
                      size="small"
                      style={styles.defaultBadgeText}
                    />
                  </View>
                )}
              </View>
              <Text
                text={userStore.selectedAddress.addressLine1}
                size="medium"
                style={styles.addressText}
              />
              {userStore.selectedAddress.addressLine2 && (
                <Text
                  text={userStore.selectedAddress.addressLine2}
                  size="medium"
                  style={styles.addressText}
                />
              )}
              <Text
                text={`${userStore.selectedAddress.city}, ${userStore.selectedAddress.state} ${userStore.selectedAddress.postalCode}`}
                size="medium"
                style={styles.addressText}
              />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addAddressButton}
              onPress={() => router.push('/screens/address/address-list')}
            >
              <Ionicons
                name="add-circle-outline"
                size={24}
                color={colors.palette.primary500}
              />
              <Text
                text="Select Delivery Address"
                size="medium"
                weight="semibold"
                style={styles.addAddressText}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Method Section */}
        <View style={[styles.section, styles.glassEffect]}>
          <Text
            text="Payment Method"
            size="large"
            weight="semibold"
            style={styles.sectionTitle}
          />
          <View style={styles.paymentMethods}>
            <TouchableOpacity
              style={[
                styles.paymentMethod,
                selectedPaymentMethod === 'card' &&
                  styles.selectedPaymentMethod,
              ]}
              onPress={() => setSelectedPaymentMethod('card')}
            >
              <Ionicons
                name="card-outline"
                size={24}
                color={
                  selectedPaymentMethod === 'card'
                    ? colors.palette.neutral100
                    : colors.palette.neutral700
                }
              />
              <Text
                text="Credit/Debit Card"
                size="medium"
                weight="semibold"
                style={
                  selectedPaymentMethod === 'card'
                    ? styles.selectedPaymentMethodText
                    : styles.paymentMethodText
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paymentMethod,
                selectedPaymentMethod === 'cash' &&
                  styles.selectedPaymentMethod,
              ]}
              onPress={() => setSelectedPaymentMethod('cash')}
            >
              <Ionicons
                name="cash-outline"
                size={24}
                color={
                  selectedPaymentMethod === 'cash'
                    ? colors.palette.neutral100
                    : colors.palette.neutral700
                }
              />
              <Text
                text="Cash on Delivery"
                size="medium"
                weight="semibold"
                style={
                  selectedPaymentMethod === 'cash'
                    ? styles.selectedPaymentMethodText
                    : styles.paymentMethodText
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paymentMethod,
                selectedPaymentMethod === 'apple_pay' &&
                  styles.selectedPaymentMethod,
              ]}
              onPress={() =>
                setSelectedPaymentMethod('apple_pay' as PaymentMethod)
              }
            >
              <Ionicons
                name="logo-apple"
                size={24}
                color={
                  selectedPaymentMethod === 'apple_pay'
                    ? colors.palette.neutral100
                    : colors.palette.neutral700
                }
              />
              <Text
                text="Apple Pay"
                size="medium"
                weight="semibold"
                style={
                  selectedPaymentMethod === 'apple_pay'
                    ? styles.selectedPaymentMethodText
                    : styles.paymentMethodText
                }
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Summary Section */}
        <View style={[styles.section, styles.glassEffect]}>
          <Text
            text="Order Summary"
            size="large"
            weight="semibold"
            style={styles.sectionTitle}
          />
          <View style={styles.summaryRow}>
            <Text text="Subtotal" size="medium" />
            <Text text={`$${subtotal.toFixed(2)}`} size="medium" />
          </View>
          <View style={styles.summaryRow}>
            <Text text="Delivery Fee" size="medium" />
            <Text text={`$${deliveryFee.toFixed(2)}`} size="medium" />
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text text="Total" size="large" weight="bold" />
            <Text
              text={`$${total.toFixed(2)}`}
              size="large"
              weight="bold"
              style={styles.totalAmount}
            />
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.placeOrderButton,
            isLoading && styles.placeOrderButtonDisabled,
          ]}
          onPress={handlePlaceOrder}
          disabled={isLoading}
        >
          <LinearGradient
            colors={[colors.palette.primary400, colors.palette.primary500]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.placeOrderButtonGradient}
          >
            <Text
              text={isLoading ? 'Placing Order...' : 'Place Order'}
              style={styles.placeOrderButtonText}
              weight="bold"
            />
            {!isLoading && (
              <Ionicons
                name="arrow-forward"
                size={20}
                color={colors.palette.neutral100}
                style={styles.buttonIcon}
              />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        showCancel={alertConfig.showCancel}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </Screen>
  )
})

export default PaymentScreen
