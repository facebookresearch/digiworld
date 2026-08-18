// @ts-nocheck
import React, { useEffect, useState, useRef, useMemo } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
} from 'react-native'
import { Header, Text, Button, Screen } from '@/components'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { useToast } from '@/components/Toast'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Instance } from 'mobx-state-tree'
import StepIndicator from '@/components/checkout/StepIndicator'
import { PromoCodeSheet } from '@/components/checkout/PromoCodeSheet'
import BottomSheet from '@gorhom/bottom-sheet'
import { IPromoCode } from '@/models/PromoStore'
import { PaymentMethod, Address } from '@/models/UserStore'

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    mainContent: {
      flex: 1,
      minHeight: '100%',
    },
    content: {
      padding: spacing.md,
      flexGrow: 1,
    },
    footerSpace: {
      height: 80,
    },
    stepContent: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: spacing.md,
    },
    addressCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.separator,
    },
    selectedCard: {
      borderColor: theme.colors.palette.primary500,
      borderWidth: 2,
      backgroundColor: theme.colors.palette.primary50,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    addressName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    addressText: {
      fontSize: 14,
      color: theme.colors.textDim,
      marginBottom: spacing.xxs,
    },
    addressPhone: {
      fontSize: 14,
      color: theme.colors.textDim,
      marginTop: spacing.xs,
    },
    defaultBadge: {
      backgroundColor: theme.colors.palette.primary100,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 12,
    },
    defaultText: {
      color: theme.colors.palette.primary500,
      fontSize: 12,
      fontWeight: '500',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.palette.primary500,
      padding: spacing.sm,
      borderRadius: 12,
      gap: spacing.xs,
    },
    addButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
    paymentCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.separator,
    },
    cardNumber: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: spacing.xs,
    },
    cardName: {
      fontSize: 14,
      color: theme.colors.textDim,
      marginBottom: spacing.xs,
    },
    cardExpiry: {
      fontSize: 14,
      color: theme.colors.textDim,
    },
    reviewSection: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.separator,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.sm,
      backgroundColor: theme.colors.palette.neutral50,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.separator,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    sectionContent: {
      padding: spacing.md,
      backgroundColor: theme.colors.background,
    },
    billingSummary: {
      padding: spacing.md,
    },
    billingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    billingLabel: {
      fontSize: 14,
      color: theme.colors.textDim,
    },
    billingValue: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '500',
    },
    savingsLabel: {
      color: theme.colors.success,
    },
    savingsValue: {
      color: theme.colors.success,
    },
    billingTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    totalValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.separator,
      backgroundColor: theme.colors.background,
      padding: spacing.md,
      paddingBottom: spacing.lg,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    footerButton: {
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 12,
      paddingVertical: spacing.sm,
    },
    footerButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.primary100,
    },
    promoSection: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    promoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      padding: spacing.sm,
      borderRadius: 8,
      gap: spacing.xs,
    },
    promoButtonText: {
      color: theme.colors.palette.primary500,
      fontSize: 14,
      fontWeight: '600',
    },
    appliedPromoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.palette.primary50,
      padding: spacing.sm,
      borderRadius: 8,
      marginTop: spacing.xs,
    },
    appliedPromoCode: {
      color: theme.colors.palette.primary500,
      fontSize: 14,
      fontWeight: '600',
    },
    reviewText: {
      fontSize: 14,
      color: theme.colors.text,
      marginBottom: spacing.xxs,
      opacity: 1,
    },
  })

export default observer(function CheckoutScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const { sessionId, timeStamp } = useLocalSearchParams()
  const router = useRouter()
  const toast = useToast()
  const { cartStore, userStore, sessionStore, orderStore, promoStore } =
    useStores()

  const [selectedAddress, setSelectedAddress] = useState<Instance<
    typeof Address
  > | null>(null)
  const [couponCode, setCouponCode] = useState<string>('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<Instance<
    typeof PaymentMethod
  > | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [appliedPromo, setAppliedPromo] = useState<IPromoCode | null>(null)
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [isPromoSheetVisible, setIsPromoSheetVisible] = useState(false)
  const promoSheetRef = useRef<BottomSheet>(null)

  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('Checkout', '/screens/checkout')

  const steps = ['Select address', 'Select payment', 'Review order']

  useEffect(() => {
    if (sessionId) {
      const sessionData = sessionStore.getSession(sessionId as string)
      if (sessionData?.data) {
        const data = sessionData.data
        const formData = data.sessionData?.formData || {}
        console.log(
          'Restoring checkout session:',
          JSON.stringify(data, null, 2),
        )

        // Track only the essential data
        trackContentChange({
          selectedAddress: formData.selectedAddress,
          selectedPaymentId: formData.selectedPaymentId,
          currentStep: formData.currentStep,
          cartItemCount: formData.cartItemCount,
          cartTotal: formData.cartTotal,
          appliedPromo: formData.appliedPromo,
          promoDiscount: formData.promoDiscount,
          couponCode: formData.couponCode,
          isPromoSheetVisible: formData.isPromoSheetVisible,
        })

        // Set state from the correct data path
        if (formData.selectedAddress) {
          setSelectedAddress(formData.selectedAddress)
        }
        if (formData.selectedPaymentId) {
          setSelectedPaymentMethod(formData.selectedPaymentId)
        }
        if (formData.currentStep) {
          setCurrentStep(formData.currentStep)
        }
        if (formData.appliedPromo) {
          setAppliedPromo(formData.appliedPromo)
        }
        if (formData.promoDiscount !== undefined) {
          setPromoDiscount(formData.promoDiscount)
        }
        if (formData.couponCode) {
          setCouponCode(formData.couponCode)
        }
        if (formData.isPromoSheetVisible !== undefined) {
          setIsPromoSheetVisible(formData.isPromoSheetVisible)
        }
      }
    }
  }, [sessionId, timeStamp])

  useEffect(() => {
    trackScreenMount({
      isAuthenticated: userStore.isAuthenticated,
      cartItemCount: cartStore.items.length,
      cartTotal: cartStore.total,
      hasAddresses: userStore.addresses.length > 0,
      hasPaymentMethods: userStore.paymentMethods.length > 0,
      sessionId,
    })
    promoStore.loadPromoCodes()
  }, [])

  const handleAddressSelect = (addressId: any) => {
    trackClick('selectAddress')
    setSelectedAddress(addressId)
    trackContentChange({
      selectedAddress: addressId,
    })
  }

  const handlePaymentSelect = (paymentId: any) => {
    trackClick('selectPayment')
    setSelectedPaymentMethod(paymentId)
    trackContentChange({
      selectedPaymentId: paymentId,
    })
  }

  const handleAddAddress = () => {
    trackClick('addAddress')
    router.push('/address')
  }

  const handleAddPayment = () => {
    trackClick('addPayment')
    router.push('/payment')
  }

  const handlePlaceOrder = async () => {
    try {
      if (!selectedAddress) {
        alert('Please select a delivery address')
        setCurrentStep(1)
        return
      }

      if (!selectedPaymentMethod) {
        alert('Please select a payment method')
        setCurrentStep(2)
        return
      }

      if (!userStore.user) {
        alert('Please log in to place an order')
        return
      }
      setIsPlacingOrder(true)

      // Calculate final amounts including any promo discount
      const subtotalAfterPromo = cartStore.subtotal - promoDiscount
      const tax = cartStore.tax
      const shipping = 0
      const finalTotal = subtotalAfterPromo + tax

      // Create order using selected address and payment method
      const order = {
        id: `order-${Date.now()}`,
        userId: userStore.user.id,
        orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
        items: cartStore.items.map(item => ({
          ...item,
          id: `${item.id}-${Date.now()}`,
          sku: `SKU-${item.productId}`,
        })),
        deliveryAddress: {
          id: selectedAddress.id,
          fullName: selectedAddress.fullName,
          street: selectedAddress.street,
          city: selectedAddress.city,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode,
          phone: selectedAddress.phone,
        },
        paymentMethod: selectedPaymentMethod.id,
        subtotal: cartStore.subtotal,
        totalSavings: cartStore.savings,
        shipping,
        tax,
        couponDiscount: promoDiscount,
        couponCode,
        grandTotal: finalTotal,
        status: 'pending' as const,
        orderDate: new Date().toISOString(),
        estimatedDeliveryDate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        paymentStatus: 'pending',
        shippedDate: null,
        deliveryDate: null,
        trackingNumber: null,
        courierPartner: null,
        invoiceUrl: null,
        isGift: false,
        giftMessage: null,
      }

      // First create the order
      const createdOrder = await orderStore.createOrder(order)

      if (createdOrder) {
        // Only clear cart if order was created successfully
        await cartStore.clearCart(userStore.user.id)
        setIsPlacingOrder(false)
        toast.show({
          title: 'Order placed successfully',
          preset: 'success',
          placement: 'top',
        })
        // Replace instead of push to prevent going back
        if (router.canGoBack()) {
          router.back()
        } else {
          router.replace('/screens/orders')
        }
      } else {
        setIsPlacingOrder(false)
        throw new Error('Failed to create order')
      }
    } catch (error) {
      console.error('Failed to place order:', error)
      setIsPlacingOrder(false)
      toast.show({
        title: 'Failed to place order, please try again',
        preset: 'error',
        placement: 'top',
      })
    }
  }

  const handleContinue = () => {
    switch (currentStep) {
      case 1:
        if (selectedAddress) {
          trackClick('continueToPayment')
          setCurrentStep(2)
          trackContentChange({
            currentStep: 2,
            selectedAddress,
          })
        } else {
          toast.show({
            title: 'Please select a delivery address',
            preset: 'error',
            placement: 'top',
          })
        }
        break
      case 2:
        if (selectedPaymentMethod) {
          trackClick('continueToReview')
          setCurrentStep(3)
          trackContentChange({
            currentStep: 3,
            selectedAddress,
            selectedPaymentId: selectedPaymentMethod,
          })
        } else {
          toast.show({
            title: 'Please select a payment method',
            preset: 'error',
            placement: 'top',
          })
        }
        break
      case 3:
        handlePlaceOrder()
        break
    }
  }

  const handleStepPress = (step: number) => {
    if (step < currentStep) {
      // Only allow going back
      setCurrentStep(step)
      trackContentChange({
        currentStep: step,
      })
    }
  }

  const handleApplyPromoCode = (promoCode: IPromoCode) => {
    // Validate minimum purchase amount
    if (cartStore.subtotal < promoCode.minPurchase) {
      toast.show({
        title: `Minimum order amount of $${promoCode.minPurchase} required`,
        preset: 'error',
        placement: 'top',
      })
      return
    }

    // Calculate discount
    let discount = 0
    if (promoCode.type === 'percentage') {
      discount = (cartStore.subtotal * promoCode.value) / 100
    } else {
      discount = promoCode.discountValue
    }

    // Apply maximum discount limit
    if (discount > promoCode.maxDiscount) {
      discount = promoCode.maxDiscount
    }

    setPromoDiscount(discount)
    setAppliedPromo(promoCode)
    setCouponCode(promoCode.code)

    toast.show({
      title: 'Promo code applied successfully',
      preset: 'success',
      placement: 'top',
    })

    trackContentChange({
      appliedPromo: promoCode,
      promoDiscount: discount,
      couponCode: promoCode.code,
      isPromoSheetVisible: false,
    })

    setIsPromoSheetVisible(false)
  }

  const handleShowPromoSheet = () => {
    trackContentChange({
      isPromoSheetVisible: true,
      appliedPromo,
      promoDiscount,
      couponCode,
    })
    setIsPromoSheetVisible(true)
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Select Delivery Address</Text>
            {userStore.addresses.map(address => (
              <Pressable
                key={address.id}
                style={[
                  styles.addressCard,
                  selectedAddress?.id === address.id && styles.selectedCard,
                ]}
                onPress={() => handleAddressSelect(address)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.addressName}>{address.fullName}</Text>
                  {address.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.addressText}>
                  {address.street}, {address.city}
                </Text>
                <Text style={styles.addressText}>
                  {address.state}, {address.pincode}
                </Text>
                <Text style={styles.addressPhone}>{address.phone}</Text>
              </Pressable>
            ))}
            {userStore.addresses.length === 0 && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddAddress}
              >
                <MaterialIcons
                  name="add"
                  size={24}
                  color={theme.colors.palette.neutral100}
                />
                <Text style={styles.addButtonText}>Add New Address</Text>
              </TouchableOpacity>
            )}
          </View>
        )

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Choose Payment Method</Text>
            {userStore.paymentMethods.map(method => (
              <Pressable
                key={method.id}
                style={[
                  styles.paymentCard,
                  selectedPaymentMethod?.id === method.id &&
                    styles.selectedCard,
                ]}
                onPress={() => handlePaymentSelect(method)}
              >
                <View style={styles.cardHeader}>
                  <MaterialIcons
                    name={
                      method.cardType === 'visa' ? 'credit-card' : 'payment'
                    }
                    size={24}
                    color={theme.colors.palette.primary500}
                  />
                  {method.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardNumber}>
                  •••• •••• •••• {method.cardNumber?.slice(-4) || ''}
                </Text>
                <Text style={styles.cardName}>{method.nameOnCard}</Text>
                <Text style={styles.cardExpiry}>
                  Expires {method.expiryMonth}/{method.expiryYear}
                </Text>
              </Pressable>
            ))}
            {userStore.paymentMethods.length === 0 && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddPayment}
              >
                <MaterialIcons
                  name="add"
                  size={24}
                  color={theme.colors.palette.neutral100}
                />
                <Text style={styles.addButtonText}>Add New Payment Method</Text>
              </TouchableOpacity>
            )}
          </View>
        )

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review & Place Order</Text>
            <View style={styles.reviewSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Delivery Address</Text>
                <TouchableOpacity onPress={() => handleStepPress(1)}>
                  <MaterialIcons
                    name="edit"
                    size={20}
                    color={theme.colors.palette.primary500}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.sectionContent}>
                <Text style={styles.reviewText}>
                  {selectedAddress?.fullName}
                </Text>
                <Text style={styles.reviewText}>
                  {selectedAddress?.street}, {selectedAddress?.city}
                </Text>
                <Text style={styles.reviewText}>
                  {selectedAddress?.state}, {selectedAddress?.pincode}
                </Text>
                <Text style={styles.reviewText}>{selectedAddress?.phone}</Text>
              </View>
            </View>

            <View style={styles.reviewSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Payment Method</Text>
                <TouchableOpacity onPress={() => handleStepPress(2)}>
                  <MaterialIcons
                    name="edit"
                    size={20}
                    color={theme.colors.palette.primary500}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.sectionContent}>
                <Text style={styles.reviewText}>
                  {selectedPaymentMethod?.cardType.toUpperCase()} ending in{' '}
                  {selectedPaymentMethod?.cardNumber?.slice(-4)}
                </Text>
                <Text style={styles.reviewText}>
                  {selectedPaymentMethod?.nameOnCard}
                </Text>
              </View>
            </View>

            <View style={styles.reviewSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Order Summary</Text>
              </View>
              <View style={styles.billingSummary}>
                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel}>Original Subtotal</Text>
                  <Text style={styles.billingValue}>
                    ${cartStore.originalSubtotal.toFixed(2)}
                  </Text>
                </View>
                {cartStore.savings > 0 && (
                  <View style={styles.billingRow}>
                    <Text style={[styles.billingLabel, styles.savingsLabel]}>
                      Item Discounts
                    </Text>
                    <Text style={[styles.billingValue, styles.savingsValue]}>
                      -${cartStore.savings.toFixed(2)}
                    </Text>
                  </View>
                )}
                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel}>
                    Subtotal after Discounts
                  </Text>
                  <Text style={styles.billingValue}>
                    ${cartStore.subtotal.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel}>Shipping</Text>
                  <Text style={styles.billingValue}>Free</Text>
                </View>
                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel}>Tax (10%)</Text>
                  <Text style={styles.billingValue}>
                    ${cartStore.tax.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.promoSection}>
                  <TouchableOpacity
                    style={styles.promoButton}
                    onPress={() => {
                      handleShowPromoSheet()
                    }}
                  >
                    <MaterialIcons
                      name="local-offer"
                      size={20}
                      color={theme.colors.palette.primary500}
                    />
                    <Text style={styles.promoButtonText}>
                      {appliedPromo ? 'Change Promo Code' : 'Apply Promo Code'}
                    </Text>
                  </TouchableOpacity>
                  {appliedPromo && (
                    <View style={styles.appliedPromoContainer}>
                      <Text style={styles.appliedPromoCode}>
                        {appliedPromo.code}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setAppliedPromo(null)
                          setPromoDiscount(0)
                          setCouponCode('')
                          trackContentChange({
                            appliedPromo: null,
                            promoDiscount: 0,
                            couponCode: '',
                            isPromoSheetVisible: false,
                          })
                        }}
                      >
                        <MaterialIcons
                          name="close"
                          size={20}
                          color={theme.colors.error}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                {promoDiscount > 0 && (
                  <View style={styles.billingRow}>
                    <Text style={[styles.billingLabel, styles.savingsLabel]}>
                      Promo Code: {couponCode}
                    </Text>
                    <Text style={[styles.billingValue, styles.savingsValue]}>
                      -${promoDiscount.toFixed(2)}
                    </Text>
                  </View>
                )}
                <View style={styles.billingTotal}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>
                    $
                    {(
                      cartStore.subtotal -
                      promoDiscount +
                      cartStore.tax
                    ).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )

      default:
        return null
    }
  }

  return (
    <React.Fragment>
      <Screen preset="scroll" style={styles.container}>
        <Header
          title="Checkout"
          leftIcon="back"
          onLeftPress={() => router.back()}
        />

        <StepIndicator
          currentStep={currentStep}
          steps={steps}
          onStepPress={handleStepPress}
        />

        <View style={styles.mainContent}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {renderCurrentStep()}
            <View style={styles.footerSpace} />
          </ScrollView>
        </View>

        <LoadingOverlay
          visible={isPlacingOrder}
          message="Processing your order..."
        />
      </Screen>
      <View style={styles.footer}>
        <Button
          text={
            currentStep === 3
              ? isPlacingOrder
                ? 'Placing Order...'
                : 'Place Order'
              : 'Continue'
          }
          onPress={handleContinue}
          disabled={
            isPlacingOrder ||
            (currentStep === 1 && !selectedAddress) ||
            (currentStep === 2 && !selectedPaymentMethod) ||
            (currentStep === 3 && (!selectedAddress || !selectedPaymentMethod))
          }
          style={styles.footerButton}
          textStyle={styles.footerButtonText}
        />
      </View>

      <PromoCodeSheet
        bottomSheetRef={promoSheetRef}
        onApply={handleApplyPromoCode}
        isVisible={isPromoSheetVisible}
        showModalBottomSheet={isPromoSheetVisible}
        setShowModalBottomSheet={setIsPromoSheetVisible}
        onModalClose={() => {
          setIsPromoSheetVisible(false)
          trackContentChange({
            isPromoSheetVisible: false,
          })
        }}
      />
    </React.Fragment>
  )
})
