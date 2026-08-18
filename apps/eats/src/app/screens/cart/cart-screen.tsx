import CustomAlert from '@/app/components/CustomAlert'
import { queries } from '@/db/queries'
import { useStores } from '@/models/helpers/useStores'
import {
  getCachedAssetImageSource,
  useEatsAssetsVersion,
} from '@/utils/assetImageRefresh'
import { EntityType } from '@andojo/shared-asset-management/src/types/enums'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useTheme } from '@andojo/shared-theme'
import { AutoImage, Screen, Text } from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import React, { useEffect, useState } from 'react'
import {
  Animated,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ImageStyle,
} from 'react-native'

const fallbackImage = require('../../../../assets/images/pizza.png')

const CartScreen = observer(() => {
  const router = useRouter()
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const { cartStore, sessionStore } = useStores()
  const [promo, setPromo] = useState('')
  const [isInvalidCode, setIsInvalidCode] = useState(false)
  const [menuImages, setMenuImages] = useState<{ [id: number]: any }>({})
  const [imgLoading, setImgLoading] = useState(true)
  const assetVersion = useEatsAssetsVersion()
  const [restaurantData, setRestaurantData] = useState<{
    deliveryFee: number
    minOrder: number
  } | null>(null)
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('Cart', '/screens/cart/cart-screen')
  const fadeAnim = React.useRef(new Animated.Value(0)).current
  const slideAnim = React.useRef(new Animated.Value(50)).current
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
    alertType?: string
    itemId?: number
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

  // Load restaurant data
  useEffect(() => {
    async function loadRestaurantData() {
      if (cartStore.items.length > 0) {
        const restaurantId = cartStore.items[0].menuItem.restaurantId
        const restaurant = await queries.getRestaurantById(restaurantId)
        if (restaurant) {
          setRestaurantData({
            deliveryFee: restaurant.deliveryFee || 0,
            minOrder: restaurant.minOrder || 0,
          })
        }
      }
    }
    loadRestaurantData()
  }, [cartStore.items])

  // Load images for cart items
  useEffect(() => {
    async function loadImages() {
      setImgLoading(true)
      const imgMap: { [id: number]: any } = {}
      await Promise.all(
        cartStore.items.map(async item => {
          imgMap[item.menuItem.id] = await getCachedAssetImageSource(
            EntityType.MENU,
            item.menuItem.id,
            fallbackImage,
            assetVersion,
          )
        }),
      )
      setMenuImages(imgMap)
      setImgLoading(false)
    }
    if (cartStore.items.length > 0) {
      loadImages()
    }
  }, [cartStore.items, assetVersion])

  // Handle empty cart
  React.useEffect(() => {
    if (cartStore.isEmpty && router.canGoBack()) {
      router.back()
    }
  }, [cartStore.isEmpty])

  // Restore promo, isInvalidCode, and alertConfig from session if available
  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession(sessionId as string)
      if (session?.data?.sessionData) {
        const formData = session.data.sessionData.formData as any

        if (formData) {
          if (typeof formData.promoCode === 'string') {
            setPromo(formData.promoCode)
          }
          if (typeof formData.isInvalidCode === 'boolean') {
            setIsInvalidCode(formData.isInvalidCode)
          }
          if (
            typeof formData.alertConfig === 'object' &&
            formData.alertConfig !== null
          ) {
            const { alertType, itemId, ...rest } = formData.alertConfig
            setAlertConfig({
              ...rest,
              alertType,
              itemId,
              onConfirm: () => {
                if (alertType === 'removeItem' && typeof itemId === 'number') {
                  cartStore.removeFromCart(itemId)
                  trackClick('removeItem')
                  hideAlert()
                } else if (alertType === 'clearCart') {
                  cartStore.clearCart()
                  trackClick('clearCart')
                  if (router.canGoBack()) {
                    router.back()
                  }
                  hideAlert()
                } else if (typeof rest.onConfirm === 'function') {
                  rest.onConfirm()
                } else {
                  hideAlert()
                }
              },
              onCancel: () => {
                if (alertType === 'removeItem') {
                  trackClick('cancelRemoveItem')
                } else if (alertType === 'clearCart') {
                  trackClick('cancelClearCart')
                }
                hideAlert()
              },
            })
          }
        }
      }
    }
  }, [sessionTimeStamp])

  const showAlert = (
    config: Omit<typeof alertConfig, 'visible'> & {
      alertType?: string
      itemId?: number
    },
  ) => {
    trackContentChange({ alertConfig: { ...config, visible: true } })
    setAlertConfig({ ...config, visible: true })
  }

  const hideAlert = () => {
    trackContentChange({ alertConfig: { ...alertConfig, visible: false } })
    setAlertConfig(prev => ({ ...prev, visible: false }))
  }

  const handleClearCart = () => {
    showAlert({
      title: 'Clear Cart',
      message: 'Are you sure you want to remove all items?',
      type: 'warning',
      confirmText: 'Clear',
      cancelText: 'Cancel',
      showCancel: true,
      alertType: 'clearCart',
      onConfirm: () => {
        cartStore.clearCart()
        trackClick('clearCart')
        if (router.canGoBack()) {
          router.back()
        }
        hideAlert()
      },
      onCancel: () => {
        trackClick('cancelClearCart')
        hideAlert()
      },
    })
  }

  const handleRemoveItem = (itemId: number) => {
    showAlert({
      title: 'Remove Item',
      message: 'Do you want to remove this item from cart?',
      type: 'warning',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      showCancel: true,
      alertType: 'removeItem',
      itemId,
      onConfirm: () => {
        cartStore.removeFromCart(itemId)
        trackClick('removeItem')
        hideAlert()
      },
      onCancel: () => {
        trackClick('cancelRemoveItem')
        hideAlert()
      },
    })
  }

  const handleApplyPromo = () => {
    if (promo) {
      trackClick('applyPromo')
      setIsInvalidCode(true)
      setTimeout(() => {
        setPromo('')
        setIsInvalidCode(false)
      }, 2000)
    }
  }

  const handleCheckout = () => {
    if (!isMinOrderMet && restaurantData) {
      showAlert({
        title: 'Minimum Order Required',
        message: `Please add items worth at least $${restaurantData.minOrder.toFixed(2)} to proceed.`,
        type: 'warning',
        confirmText: 'OK',
        cancelText: 'Cancel',
        showCancel: false,
        onConfirm: () => {
          trackClick('minOrderAlert')
          hideAlert()
        },
        onCancel: hideAlert,
      })
      return
    }
    trackClick('checkout')
    router.replace('/screens/payment/payment-screen')
  }

  React.useEffect(() => {
    trackScreenMount({
      itemCount: cartStore.items.length,
      subtotal: cartStore.subtotal,
      timestamp: Date.now(),
    })

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const subtotal = cartStore.subtotal
  const deliveryFee = restaurantData?.deliveryFee || 0
  const total = subtotal + deliveryFee
  const isMinOrderMet = restaurantData
    ? subtotal >= restaurantData.minOrder
    : true

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
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    clearButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    headerTitle: {
      flex: 1,
      color: colors.palette.neutral100,
      marginLeft: 12,
    },
    scrollContent: {
      flex: 1,
    },
    scrollContentContainer: {
      padding: 16,
      paddingTop: 8,
      paddingBottom: 24,
    },
    scroll: {
      flex: 1,
    },
    glassEffect: {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(10px)',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.4)',
      shadowColor: colors.palette.neutral800,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    itemCard: {
      flexDirection: 'row',
      padding: 16,
      marginBottom: 12,
    },
    itemImage: {
      width: 80,
      height: 80,
      borderRadius: 12,
      marginRight: 16,
      backgroundColor: colors.palette.neutral200,
      borderWidth: 1,
      borderColor: colors.palette.neutral300,
    },
    itemInfo: {
      flex: 1,
      justifyContent: 'space-between',
    },
    price: {
      color: colors.palette.primary500,
      marginTop: 4,
    },
    stepperControl: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.palette.neutral100,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.palette.neutral200,
      alignSelf: 'flex-start',
      marginTop: 8,
      overflow: 'hidden',
    },
    stepperButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.palette.neutral100,
    },
    stepperValue: {
      minWidth: 40,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.palette.neutral200,
      backgroundColor: colors.palette.neutral100,
    },
    promoSection: {
      marginBottom: 20,
    },
    promoTitle: {
      color: colors.palette.neutral100,
      marginBottom: 8,
    },
    promoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    promoInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.palette.neutral100,
      borderWidth: 1,
      borderColor: colors.palette.neutral300,
      borderRadius: 8,
      paddingHorizontal: 12,
      height: 48,
    },
    promoInputWrapperError: {
      borderColor: colors.palette.secondary500,
      backgroundColor: colors.palette.secondary100,
    },
    promoIcon: {
      marginRight: 8,
    },
    promoInput: {
      flex: 1,
      height: 48,
      fontSize: 16,
      color: colors.palette.neutral800,
    },
    applyButton: {
      backgroundColor: colors.palette.neutral300,
      paddingHorizontal: 20,
      height: 48,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    applyButtonActive: {
      backgroundColor: colors.palette.neutral100,
    },
    applyButtonText: {
      color: colors.palette.neutral600,
    },
    errorText: {
      color: colors.palette.neutral100,
      marginTop: 4,
      marginLeft: 4,
    },
    summary: {
      padding: 20,
      marginTop: 16,
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
    checkoutButton: {
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: colors.palette.primary500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    checkoutButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
    },
    checkoutButtonText: {
      color: colors.palette.neutral100,
      fontSize: 18,
      marginRight: 8,
    },
    buttonIcon: {
      marginLeft: 4,
    },
    minOrderWarning: {
      color: colors.palette.secondary500,
      marginTop: 4,
      marginBottom: 8,
      textAlign: 'center',
    },
    checkoutButtonDisabled: {
      opacity: 0.7,
    },
    itemImageLoading: {
      opacity: 0.5,
    } as ImageStyle,
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
        <Text
          text="Cart"
          size="large"
          weight="semibold"
          style={styles.headerTitle}
        />
        <TouchableOpacity style={styles.clearButton} onPress={handleClearCart}>
          <Ionicons
            name="trash-outline"
            size={22}
            color={colors.palette.neutral100}
          />
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          styles.scrollContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {cartStore.items.map(item => (
            <View
              key={item.menuItem.id}
              style={[styles.itemCard, styles.glassEffect]}
            >
              <AutoImage
                source={menuImages[item.menuItem.id] || fallbackImage}
                style={[
                  styles.itemImage,
                  imgLoading && styles.itemImageLoading,
                ]}
                onLoadStart={() => setImgLoading(true)}
                onLoadEnd={() => setImgLoading(false)}
              />
              <View style={styles.itemInfo}>
                <Text
                  text={item.menuItem.name}
                  size="large"
                  weight="semibold"
                />
                <Text
                  text={`$${item.menuItem.price.toFixed(2)}`}
                  size="medium"
                  style={styles.price}
                />
                <View style={styles.stepperControl}>
                  <TouchableOpacity
                    onPress={() => {
                      if (item.quantity === 1) {
                        handleRemoveItem(item.menuItem.id)
                      } else {
                        cartStore.updateQuantity(
                          item.menuItem.id,
                          item.quantity - 1,
                        )
                        trackClick('decreaseQuantity')
                      }
                    }}
                    style={styles.stepperButton}
                  >
                    <Ionicons
                      name={item.quantity === 1 ? 'trash-outline' : 'remove'}
                      size={18}
                      color={
                        item.quantity === 1
                          ? colors.palette.secondary500
                          : colors.palette.neutral700
                      }
                    />
                  </TouchableOpacity>
                  <View style={styles.stepperValue}>
                    <Text
                      text={item.quantity.toString()}
                      size="medium"
                      weight="semibold"
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      cartStore.updateQuantity(
                        item.menuItem.id,
                        item.quantity + 1,
                      )
                      trackClick('increaseQuantity')
                    }}
                    style={styles.stepperButton}
                  >
                    <Ionicons
                      name="add"
                      size={18}
                      color={colors.palette.neutral700}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          <View style={styles.promoSection}>
            <Text
              text="Promo Code"
              size="medium"
              weight="semibold"
              style={styles.promoTitle}
            />
            <View style={styles.promoRow}>
              <View
                style={[
                  styles.promoInputWrapper,
                  isInvalidCode && styles.promoInputWrapperError,
                ]}
              >
                <Ionicons
                  name={
                    isInvalidCode ? 'alert-circle-outline' : 'ticket-outline'
                  }
                  size={22}
                  color={
                    isInvalidCode
                      ? colors.palette.secondary500
                      : colors.palette.primary500
                  }
                  style={styles.promoIcon}
                />
                <TextInput
                  style={styles.promoInput}
                  placeholder="Enter code"
                  value={promo}
                  onChangeText={text => {
                    setPromo(text)
                    setIsInvalidCode(false)
                    trackContentChange({ promoCode: text })
                  }}
                  placeholderTextColor={colors.palette.neutral400}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  promo ? styles.applyButtonActive : null,
                ]}
                onPress={handleApplyPromo}
                disabled={!promo}
              >
                <Text
                  text="Apply"
                  size="medium"
                  weight="semibold"
                  style={styles.applyButtonText}
                />
              </TouchableOpacity>
            </View>
            {isInvalidCode && (
              <Text
                text="Invalid promo code"
                size="small"
                style={styles.errorText}
              />
            )}
          </View>
        </ScrollView>

        <View style={[styles.summary, styles.glassEffect]}>
          <View style={styles.summaryRow}>
            <Text text="Subtotal" size="medium" />
            <Text text={`$${subtotal.toFixed(2)}`} size="medium" />
          </View>
          <View style={styles.summaryRow}>
            <Text text="Delivery" size="medium" />
            <Text text={`$${deliveryFee.toFixed(2)}`} size="medium" />
          </View>
          {restaurantData && !isMinOrderMet && (
            <Text
              text={`Minimum order amount: $${restaurantData.minOrder.toFixed(2)}`}
              size="small"
              style={styles.minOrderWarning}
            />
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text text="Total" size="large" weight="bold" />
            <Text
              text={`$${total.toFixed(2)}`}
              size="large"
              weight="bold"
              style={styles.totalAmount}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.checkoutButton,
              !isMinOrderMet && styles.checkoutButtonDisabled,
            ]}
            onPress={handleCheckout}
            disabled={!isMinOrderMet}
          >
            <LinearGradient
              colors={
                isMinOrderMet
                  ? [colors.palette.primary400, colors.palette.primary500]
                  : [colors.palette.neutral400, colors.palette.neutral500]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.checkoutButtonGradient}
            >
              <Text
                text={
                  isMinOrderMet
                    ? 'Proceed to Checkout'
                    : 'Minimum Order Required'
                }
                style={styles.checkoutButtonText}
                weight="bold"
              />
              {isMinOrderMet && (
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
      </Animated.View>

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

export default CartScreen
