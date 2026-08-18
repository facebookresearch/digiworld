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
import { LoadingOverlay, Text } from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

const fallbackImage = require('../../../../assets/images/pizza.png')

export default function FoodDetailScreen() {
  const { foodId: paramFoodId, sessionId } = useLocalSearchParams()
  const router = useRouter()
  const navigation = useNavigation()
  const { sessionStore, userStore } = useStores()
  const [foodId, setFoodId] = useState(paramFoodId)
  const menuItemId = Number(foodId)

  const [menuItem, setMenuItem] = useState<any>(null)
  const [menuImg, setMenuImg] = useState(fallbackImage)
  const [loading, setLoading] = useState(true)
  const assetVersion = useEatsAssetsVersion()
  const { cartStore } = useStores()
  const { theme } = useTheme()
  const colors = theme.colors

  // Add interaction tracking
  const { trackScreenMount, trackContentChange } = useInteractionTracking(
    'FoodDetailScreen',
    '/screens/food/[foodId]',
  )

  const styles = StyleSheet.create({
    detailCard: {
      backgroundColor: colors.palette.neutral100,
      borderRadius: 20,
      marginHorizontal: 16,
      marginTop: -40,
      marginBottom: 12,
      padding: 18,
      shadowColor: colors.palette.neutral900,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
      alignItems: 'flex-start',
      zIndex: 1,
    },
    foodName: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    foodDesc: {
      fontSize: 15,
      color: colors.textDim,
      marginBottom: 10,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      backgroundColor: colors.palette.overlay20,
    },
    foodPrice: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    backBtn: {
      marginTop: 20,
      backgroundColor: colors.palette.accent500,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 20,
    },
    backBtnText: {
      color: colors.palette.neutral100,
      fontWeight: 'bold',
      fontSize: 16,
    },
    headerBar: {
      position: 'absolute',
      top: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 32,
      left: 0,
      right: 0,
      zIndex: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      height: 56,
    },
    imageWrap: {
      marginTop: 80,
      alignItems: 'center',
      justifyContent: 'center',
      height: 320,
      position: 'relative',
    },
    imageEllipse: {
      position: 'absolute',
      top: 40,
      left: '50%',
      marginLeft: -140,
      width: 280,
      height: 220,
      borderRadius: 140,
      backgroundColor: colors.palette.accent100,
      zIndex: 1,
    },
    foodImage: {
      width: 240,
      height: 240,
      borderRadius: 120,
      zIndex: 2,
      borderWidth: 4,
      borderColor: colors.palette.neutral100,
      shadowColor: colors.palette.neutral900,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    sizePriceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    foodSize: {
      fontSize: 15,
      color: colors.textDim,
      marginRight: 8,
    },
    sizeDivider: {
      width: 1,
      height: 18,
      backgroundColor: colors.palette.neutral300,
      marginHorizontal: 8,
    },
    caloriesText: {
      fontSize: 15,
      color: colors.palette.primary500,
      fontWeight: '600',
      marginBottom: 8,
    },
    tagsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 6,
    },
    tag: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 8,
      alignSelf: 'flex-start',
    },
    notAvailableTag: {
      backgroundColor: colors.palette.angry100,
    },
    popularTag: {
      backgroundColor: colors.palette.secondary100,
    },
    tagText: {
      color: colors.palette.primary500,
      fontWeight: 'bold',
      fontSize: 13,
    },
    quantityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 16,
      backgroundColor: colors.palette.neutral100,
      borderRadius: 24,
      padding: 8,
      alignSelf: 'center',
      minWidth: 160,
    },
    quantityRowDisabled: {
      opacity: 0.5,
    },
    qtyBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.palette.primary100,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 8,
    },
    qtyBtnDisabled: {
      backgroundColor: colors.palette.neutral200,
    },
    qtyBtnText: {
      fontSize: 22,
      fontWeight: 'bold',
    },
    qtyBtnTextDisabled: {
      color: colors.palette.neutral400,
    },
    qtyBtnTextActive: {
      color: colors.palette.primary500,
    },
    qtyValue: {
      fontSize: 20,
      fontWeight: 'bold',
      minWidth: 40,
      textAlign: 'center',
    },
    qtyValueDisabled: {
      color: colors.palette.neutral400,
    },
    qtyValueActive: {
      color: colors.palette.primary500,
    },
    bgEllipse1: {
      position: 'absolute',
      top: -120,
      left: -80,
      width: 320,
      height: 320,
      borderRadius: 160,
      opacity: 0.18,
      zIndex: 0,
    },
    bgEllipse2: {
      position: 'absolute',
      bottom: -100,
      right: -60,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: colors.palette.accent200,
      opacity: 0.13,
    },
    deleteButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      backgroundColor: colors.palette.overlay20,
    },
    container: {
      flex: 1,
      backgroundColor: colors.palette.neutral100,
    },
    content: {
      paddingBottom: 32,
    },
    scroll: {
      flex: 1,
    },
  })

  // Track screen mount
  useEffect(() => {
    trackScreenMount({
      menuItemId,
      loading,
      quantity:
        cartStore.items.find(item => item.menuItem.id === menuItemId)
          ?.quantity || 0,
      timestamp: Date.now(),
      platform:
        typeof window !== 'undefined' && window.navigator
          ? window.navigator.platform
          : 'unknown',
      screenDimensions: {
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
      },
      userId: userStore?.currentUser?.id,
    })
  }, [])

  // Track content change when menuItem or quantity changes
  useEffect(() => {
    if (!loading) {
      trackContentChange({
        action: 'menuItem_or_quantity_update',
        menuItemId,
        menuItemName: menuItem?.name,
        quantity:
          cartStore.items.find(item => item.menuItem.id === menuItemId)
            ?.quantity || 0,
        timestamp: Date.now(),
        userId: userStore?.currentUser?.id,
      })
    }
  }, [menuItem, cartStore.items, loading])

  // Restore foodId from session if available
  useEffect(() => {
    if (!sessionId) return
    const session = sessionStore.getSession(sessionId as string)
    if (!session?.data?.sessionData?.formData) {
      return
    }
    const formData = session.data.sessionData.formData as any
    if (formData.menuItemId !== undefined) {
      setFoodId(formData.menuItemId)
    }
  }, [sessionId])

  // Get current quantity from cart store
  const currentCartItem = cartStore.items.find(
    item => item.menuItem.id === menuItemId,
  )
  const [quantity, setQuantity] = useState(currentCartItem?.quantity || 0)

  // Update quantity when cart changes
  useEffect(() => {
    const cartItem = cartStore.items.find(
      item => item.menuItem.id === menuItemId,
    )
    if (cartItem) {
      setQuantity(cartItem.quantity)
    } else {
      setQuantity(0)
    }
  }, [cartStore.items, menuItemId])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const item = await queries.getMenuItemById(menuItemId)
      setMenuItem(item)
      const img = await getImageSource(
        EntityType.MENU,
        menuItemId,
        fallbackImage,
        assetVersion,
      )
      setMenuImg(img)
      setLoading(false)
    }
    fetchData()
  }, [menuItemId, assetVersion])

  // Helper to resolve image for restaurant/category/menu
  const getImageSource = async (
    entityType: EntityType,
    entityId: string | number,
    fallback: any,
    version = 0,
  ) => {
    return getCachedAssetImageSource(entityType, entityId, fallback, version)
  }

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

  const showAlert = (config: Omit<typeof alertConfig, 'visible'>) => {
    setAlertConfig({ ...config, visible: true })
  }

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }))
  }

  const handleRemoveItem = () => {
    showAlert({
      title: 'Remove Item',
      message: 'Do you want to remove this item from cart?',
      type: 'warning',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      showCancel: true,
      onConfirm: () => {
        cartStore.removeFromCart(menuItemId)
        if (navigation.canGoBack()) {
          router.back()
        }
        hideAlert()
      },
      onCancel: hideAlert,
    })
  }

  const handleBackPress = () => {
    // Check if we can go back (restaurant screen is in stack)
    if (navigation.canGoBack()) {
      router.back()
    } else if (menuItem?.restaurantId) {
      // If restaurant screen is not in stack, navigate to it
      router.push({
        pathname: '/screens/restaurant/[id]',
        params: { id: menuItem.restaurantId },
      })
    } else {
      // Fallback to home if no restaurant ID
      router.push('/')
    }
  }

  if (loading) {
    return <LoadingOverlay visible={true} message="Loading food..." />
  }

  if (!menuItem) {
    return (
      <View style={styles.centered}>
        <Text>Food item not found.</Text>
        <TouchableOpacity onPress={handleBackPress} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const isAvailable = menuItem.isActive !== 0 && menuItem.isActive !== false
  const isPopular = menuItem.isPopular === 1 || menuItem.isPopular === true

  return (
    <View style={styles.container}>
      {/* Decorative Ellipses */}
      <LinearGradient
        colors={[colors.palette.primary500, colors.palette.primary600]}
        start={{ x: 0.1, y: 0.2 }}
        end={{ x: 0.8, y: 0.8 }}
        style={styles.bgEllipse1}
      />
      <View style={styles.bgEllipse2} />

      {/* Custom Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.palette.neutral100}
          />
        </TouchableOpacity>

        {currentCartItem && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleRemoveItem}
          >
            <Ionicons
              name="trash-outline"
              size={22}
              color={colors.palette.neutral100}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Food Image with Ellipse BG */}
        <View style={styles.imageWrap}>
          <View style={styles.imageEllipse} />
          <Image source={menuImg} style={styles.foodImage} resizeMode="cover" />
        </View>

        {/* Details Card */}
        <View style={styles.detailCard}>
          <View style={styles.tagsRow}>
            {!isAvailable && (
              <View style={[styles.tag, styles.notAvailableTag]}>
                <Text style={styles.tagText}>Not Available</Text>
              </View>
            )}
            {isPopular && (
              <View style={[styles.tag, styles.popularTag]}>
                <Text style={styles.tagText}>Popular</Text>
              </View>
            )}
          </View>
          <Text preset="heading" size="xxl" style={styles.foodName}>
            {menuItem.name}
          </Text>
          <View style={styles.sizePriceRow}>
            <Text style={styles.foodSize}>Large</Text>
            <View style={styles.sizeDivider} />
            <Text preset="bold" style={styles.foodPrice}>
              ${menuItem.price?.toFixed(2) ?? ''}
            </Text>
          </View>
          {/* Calories row */}
          {menuItem.calories ? (
            <Text style={styles.caloriesText}>{menuItem.calories} kcal</Text>
          ) : null}
          <Text preset="subheading" size="medium" style={styles.foodDesc}>
            {menuItem.description}
          </Text>

          {/* Updated Quantity Row */}
          <View
            style={[
              styles.quantityRow,
              !isAvailable && styles.quantityRowDisabled,
            ]}
          >
            <TouchableOpacity
              style={[
                styles.qtyBtn,
                (!isAvailable || quantity <= 0) && styles.qtyBtnDisabled,
              ]}
              onPress={() => {
                if (isAvailable && quantity > 0) {
                  const newQty = quantity - 1
                  setQuantity(newQty)
                  if (newQty === 0) {
                    cartStore.removeFromCart(menuItemId)
                  } else if (currentCartItem) {
                    cartStore.updateQuantity(menuItemId, newQty)
                  }
                }
              }}
              disabled={!isAvailable || quantity <= 0}
            >
              <Text
                style={{
                  ...styles.qtyBtnText,
                  ...(!isAvailable || quantity <= 0
                    ? styles.qtyBtnTextDisabled
                    : styles.qtyBtnTextActive),
                }}
              >
                -
              </Text>
            </TouchableOpacity>
            <Text
              style={{
                ...styles.qtyValue,
                ...(!isAvailable
                  ? styles.qtyValueDisabled
                  : styles.qtyValueActive),
              }}
            >
              {quantity}
            </Text>
            <TouchableOpacity
              style={[styles.qtyBtn, !isAvailable && styles.qtyBtnDisabled]}
              onPress={() => {
                if (isAvailable) {
                  const newQty = quantity + 1
                  setQuantity(newQty)
                  if (currentCartItem) {
                    cartStore.updateQuantity(menuItemId, newQty)
                  } else {
                    cartStore.addToCart(menuItem, newQty)
                  }
                }
              }}
              disabled={!isAvailable}
            >
              <Text
                style={{
                  ...styles.qtyBtnText,
                  ...(!isAvailable
                    ? styles.qtyBtnTextDisabled
                    : styles.qtyBtnTextActive),
                }}
              >
                +
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

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
    </View>
  )
}
