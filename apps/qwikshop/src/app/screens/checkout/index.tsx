// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useState, useRef, useMemo } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { useAppTheme, type Theme, spacing } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useToast } from '@/components/Toast'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Instance } from 'mobx-state-tree'
import { PromoCodeSheet } from '@/components/checkout/PromoCodeSheet'
import { CheckoutHeader } from '@/components/checkout/CheckoutHeader'
import { ProgressSteps } from '@/components/checkout/ProgressSteps'
import { CheckoutBottomBar } from '@/components/checkout/CheckoutBottomBar'
import { AddressStep } from '@/components/checkout/AddressStep'
import { PaymentStep } from '@/components/checkout/PaymentStep'
import { ReviewStep } from '@/components/checkout/ReviewStep'
import BottomSheet from '@gorhom/bottom-sheet'
import { IPromoCode } from '@/models/PromoStore'
import { PaymentMethod, Address } from '@/models/UserStore'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
export default observer(function CheckoutScreen() {
  const { sessionId, timeStamp } = useLocalSearchParams()
  const router = useRouter()
  const toast = useToast()
  const insets = useSafeAreaInsets()
  const { theme } = useAppTheme()
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

  const steps = ['Address', 'Payment', 'Review']

  const styles = useMemo(() => createStyles(theme), [theme])

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

    // Load promo codes
    promoStore.loadPromoCodes()
    console.log('📦 Loading promo codes...')
  }, [])

  const handleAddressSelect = (addressId: any) => {
    trackClick('selectAddress')
    setSelectedAddress(addressId)
    trackContentChange({
      selectedAddress: addressId,
    })
  }

  const handlePaymentSelect = (paymentId: any) => {
    // Add random delay and change button variant
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
    // Add random processing delay to make automation timing unpredictable
    const processingDelay = Math.random() * 800 + 300

    setTimeout(() => {
      switch (currentStep) {
        case 1:
          if (selectedAddress) {
            trackClick('continueToPayment')
            setCurrentStep(2)
            trackContentChange({
              currentStep: 2,
              selectedAddress,
            })
            // Randomize layout for next step
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
    }, processingDelay)
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

    setIsPromoSheetVisible(false)

    trackContentChange({
      appliedPromo: promoCode,
      promoDiscount: discount,
      couponCode: promoCode.code,
      isPromoSheetVisible: false,
    })
  }

  const handleShowPromoSheet = () => {
    console.log('🚀 Button clicked! Opening promo sheet...')
    console.log('Current isPromoSheetVisible:', isPromoSheetVisible)

    setIsPromoSheetVisible(true)
    trackContentChange({
      isPromoSheetVisible: true,
      appliedPromo,
      promoDiscount,
      couponCode,
    })

    console.log('✅ Set isPromoSheetVisible to true')
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <AddressStep
            addresses={userStore.addresses}
            selectedAddress={selectedAddress}
            onAddressSelect={handleAddressSelect}
            onAddAddress={handleAddAddress}
          />
        )
      case 2:
        return (
          <PaymentStep
            paymentMethods={userStore.paymentMethods}
            selectedPaymentMethod={selectedPaymentMethod}
            onPaymentSelect={handlePaymentSelect}
            onAddPayment={handleAddPayment}
          />
        )
      case 3:
        return (
          <ReviewStep
            selectedAddress={selectedAddress}
            selectedPaymentMethod={selectedPaymentMethod}
            cartItems={cartStore.items}
            cartSubtotal={cartStore.subtotal}
            cartSavings={cartStore.savings}
            cartTax={cartStore.tax}
            promoDiscount={promoDiscount}
            appliedPromo={appliedPromo}
            couponCode={couponCode}
            onStepPress={handleStepPress}
            onShowPromoSheet={handleShowPromoSheet}
            onRemovePromo={() => {
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
          />
        )
      default:
        return null
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.safeAreaBackground, { height: insets.top }]} />

      <LinearGradient
        colors={[
          theme.colors.palette.primary100,
          theme.colors.palette.secondary100,
          theme.colors.palette.accent100,
          theme.colors.palette.neutral100,
        ]}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.backgroundGradient}
      />

      <CheckoutHeader
        paddingTop={insets.top + 10}
        cartItemCount={cartStore.items.length}
      />

      <ProgressSteps
        currentStep={currentStep}
        steps={steps}
        onStepPress={handleStepPress}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderCurrentStep()}
      </ScrollView>

      <CheckoutBottomBar
        paddingBottom={insets.bottom}
        currentStep={currentStep}
        isPlacingOrder={isPlacingOrder}
        cartItemCount={cartStore.items.length}
        cartSavings={cartStore.savings}
        totalAmount={cartStore.subtotal - promoDiscount + cartStore.tax}
        selectedAddress={selectedAddress}
        selectedPaymentMethod={selectedPaymentMethod}
        onContinue={handleContinue}
      />

      <LoadingOverlay
        visible={isPlacingOrder}
        message="Processing your order..."
      />

      <PromoCodeSheet
        bottomSheetRef={promoSheetRef}
        onApply={handleApplyPromoCode}
        isVisible={isPromoSheetVisible}
        showModalBottomSheet={isPromoSheetVisible}
        setShowModalBottomSheet={setIsPromoSheetVisible}
        onModalClose={() => {
          console.log('🔄 Closing promo sheet')
          setIsPromoSheetVisible(false)
          trackContentChange({
            isPromoSheetVisible: false,
          })
        }}
      />
    </SafeAreaView>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },
    safeAreaBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.palette.primary300,
      zIndex: 1,
    },
    backgroundGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.lg,
    },
  })
