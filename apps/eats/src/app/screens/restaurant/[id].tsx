import { queries } from '@/db/queries'
import {
  getCachedAssetImageSource,
  useEatsAssetsVersion,
} from '@/utils/assetImageRefresh'
import { EntityType } from '@andojo/shared-asset-management/src/types/enums'
import { AutoImage, LoadingOverlay, Text, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

import CustomAlert from '@/app/components/CustomAlert'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { observer } from 'mobx-react-lite'

const fallbackImage = require('../../../../assets/images/pizza.png')

// Add type for form data
interface RestaurantFormData {
  [key: string]: unknown
  restaurantId?: number
  loading?: boolean
  categoriesCount?: number
  menuItemsCount?: number
  selectedCategory?: number | null
  userId?: number
  lastUpdated?: number
  screenName?: string
  route?: string
  action?: string
  timestamp?: number
  // Add alert state persistence
  alertState?: {
    showCartAlert?: boolean
    showErrorAlert?: boolean
    alertConfig?: {
      title: string
      message: string
      type: 'default' | 'warning' | 'error' | 'success'
      confirmText?: string
      cancelText?: string
      showCancel?: boolean
    }
    pendingMenuItem?: {
      id: number
      name: string
      restaurantId: number
    } | null
  }
}

const RestaurantDetailScreen = () => {
  const { id: paramId, sessionId, sessionTimeStamp } = useLocalSearchParams()
  const router = useRouter()
  const [restaurantId, setRestaurantId] = useState<number>(Number(paramId))
  const { userStore, sessionStore } = useStores()
  const { trackScreenMount, trackContentChange } = useInteractionTracking(
    'RestaurantDetailScreen',
    '/screens/restaurant/[id]',
  )
  const { theme } = useTheme()
  const colors = theme.colors
  const { cartStore } = useStores()

  const [restaurant, setRestaurant] = useState<any>(null)
  const [restaurantImg, setRestaurantImg] = useState(fallbackImage)
  const [categories, setCategories] = useState<any[]>([])
  const [menu, setMenu] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [menuImages, setMenuImages] = useState<{ [id: number]: any }>({})
  const [loading, setLoading] = useState(true)
  const [imgLoading, setImgLoading] = useState(true)
  const assetVersion = useEatsAssetsVersion()
  const categoryScrollRef = useRef<ScrollView>(null)
  const flatListRef = useRef<FlatList>(null)

  // Alert states
  const [showCartAlert, setShowCartAlert] = useState(false)
  const [showErrorAlert, setShowErrorAlert] = useState(false)
  const [alertConfig, setAlertConfig] = useState<{
    title: string
    message: string
    type: 'default' | 'warning' | 'error' | 'success'
    confirmText?: string
    cancelText?: string
    onConfirm?: () => void
    onCancel?: () => void
    showCancel?: boolean
  }>({
    title: '',
    message: '',
    type: 'default',
  })
  const [pendingMenuItem, setPendingMenuItem] = useState<any>(null)
  console.log('sessionTimeStamp', sessionTimeStamp, sessionId)

  // Load state from session
  useEffect(() => {
    if (!sessionTimeStamp) {
      return
    }

    const session = sessionStore.getSession(sessionId as string)
    if (!session?.data?.sessionData?.formData) {
      return
    }

    const formData = session.data.sessionData.formData as RestaurantFormData

    // Restore states based on the session data
    if (formData.restaurantId !== undefined && formData.restaurantId !== null) {
      setRestaurantId(formData.restaurantId)
    }
    if (formData.selectedCategory !== undefined) {
      setSelectedCategory(formData.selectedCategory)
    }

    // Restore alert states if they exist
    if (formData.alertState) {
      const { showCartAlert, showErrorAlert, alertConfig, pendingMenuItem } =
        formData.alertState
      if (showCartAlert) setShowCartAlert(true)
      if (showErrorAlert) setShowErrorAlert(true)
      if (alertConfig) setAlertConfig(alertConfig)
      if (pendingMenuItem) setPendingMenuItem(pendingMenuItem)
    }
  }, [sessionTimeStamp])

  // Save restaurantId to session when it changes
  useEffect(() => {
    if (sessionId && restaurantId) {
      trackContentChange({
        restaurantId,
        selectedCategory,
        alertState: {
          showCartAlert,
          showErrorAlert,
          alertConfig,
          pendingMenuItem,
        },
        timestamp: Date.now(),
      })
    }
  }, [
    restaurantId,
    selectedCategory,
    showCartAlert,
    showErrorAlert,
    alertConfig,
    pendingMenuItem,
    sessionId,
    sessionTimeStamp,
  ])

  // Track screen mount with alert state
  useEffect(() => {
    trackScreenMount({
      restaurantId,
      loading,
      categoriesCount: categories.length,
      menuItemsCount: menu.length,
      selectedCategory,
      timestamp: Date.now(),
      platform: Platform.OS,
      screenDimensions: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
      },
      userId: userStore.currentUser?.id,
      alertState: {
        showCartAlert,
        showErrorAlert,
        alertConfig,
        pendingMenuItem,
      },
      sessionData: {
        formData: {
          restaurantId,
          alertState: {
            showCartAlert,
            showErrorAlert,
            alertConfig,
            pendingMenuItem,
          },
        },
      },
    })
  }, [])

  // Function to show cart alert with state persistence
  const showCartAlertWithState = useCallback(
    (config: typeof alertConfig) => {
      setAlertConfig(config)
      setShowCartAlert(true)

      trackContentChange({
        action: 'show_cart_alert',
        timestamp: Date.now(),
        userId: userStore.currentUser?.id,
        restaurantId,
        alertState: {
          showCartAlert: true,
          showErrorAlert: false,
          alertConfig: config,
          pendingMenuItem,
        },
        sessionData: {
          formData: {
            restaurantId,
            alertState: {
              showCartAlert: true,
              showErrorAlert: false,
              alertConfig: config,
              pendingMenuItem,
            },
          },
        },
      })
    },
    [pendingMenuItem, restaurantId],
  )

  // Function to show error alert with state persistence
  const showErrorAlertWithState = useCallback(
    (config: typeof alertConfig) => {
      setAlertConfig(config)
      setShowErrorAlert(true)

      trackContentChange({
        action: 'show_error_alert',
        showErrorAlert: true,
        timestamp: Date.now(),
        userId: userStore.currentUser?.id,
        restaurantId,
        alertState: {
          showCartAlert: false,
          showErrorAlert: true,
          alertConfig: config,
          pendingMenuItem,
        },
        sessionData: {
          formData: {
            restaurantId,
            alertState: {
              showCartAlert: false,
              showErrorAlert: true,
              alertConfig: config,
              pendingMenuItem,
            },
          },
        },
      })
    },
    [pendingMenuItem, restaurantId],
  )

  // Function to clear alert states
  const clearAlertStates = useCallback(() => {
    setShowCartAlert(false)
    setShowErrorAlert(false)
    setPendingMenuItem(null)
    setAlertConfig({
      title: '',
      message: '',
      type: 'default',
    })

    trackContentChange({
      action: 'clear_alert_states',
      timestamp: Date.now(),
      userId: userStore.currentUser?.id,
      restaurantId,
      alertState: {
        showCartAlert: false,
        showErrorAlert: false,
        alertConfig: {
          title: '',
          message: '',
          type: 'default',
        },
        pendingMenuItem: null,
      },
      sessionData: {
        formData: {
          restaurantId,
          alertState: {
            showCartAlert: false,
            showErrorAlert: false,
            alertConfig: {
              title: '',
              message: '',
              type: 'default',
            },
            pendingMenuItem: null,
          },
        },
      },
    })
  }, [restaurantId])

  // Update alert handlers to use new state management
  const handleAlertConfirm = useCallback(
    (action: () => void) => {
      action()
      clearAlertStates()
    },
    [clearAlertStates],
  )

  const handleAlertCancel = useCallback(
    (action: () => void) => {
      action()
      clearAlertStates()
    },
    [clearAlertStates],
  )

  // Update restaurant data fetch to use new alert state management
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setImgLoading(true)
      try {
        const rest = await queries.getRestaurantById(restaurantId)

        setRestaurant(rest)
        getImageSource(
          EntityType.RESTAURANTS,
          restaurantId,
          fallbackImage,
          assetVersion,
        ).then(img => {
          setRestaurantImg(img)
          setImgLoading(false)
        })
        const cats = await queries.getCategoriesForRestaurant(restaurantId)
        setCategories(cats)
        setSelectedCategory(cats[0]?.id ?? null)
        const menuItems = await queries.getMenuForRestaurant(restaurantId)
        setMenu(menuItems)
        // Preload menu images
        const imgMap: { [id: number]: any } = {}
        await Promise.all(
          menuItems.map(async (item: any) => {
            imgMap[item.id] = await getImageSource(
              EntityType.MENU,
              item.id,
              fallbackImage,
              assetVersion,
            )
          }),
        )
        setMenuImages(imgMap)
      } catch (error) {
        console.error('Error fetching restaurant data:', error)
        showErrorAlertWithState({
          title: 'Error Loading Restaurant',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to load restaurant data. Please try again.',
          type: 'error',
          confirmText: 'Try Again',
          cancelText: 'Go Back',
          onConfirm: () => {
            clearAlertStates()
            fetchData()
          },
          onCancel: () => {
            clearAlertStates()
            router.back()
          },
          showCancel: true,
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [restaurantId, assetVersion])

  // Helper to resolve image for restaurant/category/menu
  const getImageSource = async (
    entityType: EntityType,
    entityId: string | number,
    fallback: any,
    version = 0,
  ) => {
    return getCachedAssetImageSource(entityType, entityId, fallback, version)
  }

  // Update cart operations to use new alert state management
  const handleAddToCart = (menuItem: any) => {
    if (cartStore.isEmpty) {
      cartStore.addToCart(menuItem, 1)
      return
    }

    const prevRestaurantId = cartStore.items[0].menuItem.restaurantId
    if (prevRestaurantId !== menuItem.restaurantId) {
      setPendingMenuItem(menuItem)
      showCartAlertWithState({
        title: 'Replace Cart Items?',
        message:
          'Your cart contains items from another restaurant. Do you want to clear the cart and add this item?',
        type: 'warning',
        confirmText: 'Clear & Add',
        cancelText: 'Cancel',
        onConfirm: () => {
          cartStore.clearCart()
          cartStore.addToCart(menuItem, 1)
        },
        onCancel: () => clearAlertStates(),
        showCancel: true,
      })
    } else {
      cartStore.addToCart(menuItem, 1)
    }
  }

  const handleRemoveFromCart = (menuItemId: number) => {
    const item = cartStore.items.find(i => i.menuItem.id === menuItemId)
    if (item) {
      if (item.quantity > 1) {
        cartStore.updateQuantity(menuItemId, item.quantity - 1)
      } else {
        setPendingMenuItem(item.menuItem)
        showCartAlertWithState({
          title: 'Remove Item',
          message: `Are you sure you want to remove ${item.menuItem.name} from your cart?`,
          type: 'warning',
          confirmText: 'Remove',
          cancelText: 'Cancel',
          onConfirm: () => {
            cartStore.removeFromCart(menuItemId)
            showCartAlertWithState({
              title: 'Item Removed',
              message: `${item.menuItem.name} has been removed from your cart.`,
              type: 'success',
              confirmText: 'OK',
              onConfirm: () => clearAlertStates(),
              showCancel: false,
            })
          },
          onCancel: () => clearAlertStates(),
          showCancel: true,
        })
      }
    }
  }

  const handleCategoryChipPress = (catId: number) => {
    setSelectedCategory(catId)
    trackContentChange({
      action: 'category_selected',
      categoryId: catId,
      categoryName: categories.find(c => c.id === catId)?.name,
      timestamp: Date.now(),
      userId: userStore.currentUser?.id,
    })
    const firstIdx = menu.findIndex(item => item.categoryId === catId)
    if (firstIdx !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: firstIdx, animated: true })
    }
  }

  // As the user scrolls, update the highlighted chip to match the first visible item's category
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { item: any }[] }) => {
      if (viewableItems && viewableItems.length > 0) {
        const firstItem = viewableItems[0].item
        if (firstItem && firstItem.categoryId !== selectedCategory) {
          setSelectedCategory(firstItem.categoryId)
        }
      }
    },
  ).current
  const viewabilityConfig = { itemVisiblePercentThreshold: 50 }

  interface MenuItemProps {
    item: {
      id: number
      name: string
      description: string
      price: number
      image?: string
    }
    menuImages: { [id: number]: any }
    onAdd: (menuItem: any) => void
    onRemove: (menuItemId: number) => void
  }

  const styles = StyleSheet.create({
    floatingBackBtn: {
      position: 'absolute',
      top: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 32,
      left: 16,
      backgroundColor: '#fff',
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
      zIndex: 30,
    },
    restaurantName: {
      fontSize: 22,
      fontWeight: '700',
      color: '#222',
      marginBottom: 6,
    },
    restaurantDesc: {
      fontSize: 15,
      color: '#888',
      marginBottom: 10,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    infoIcon: {
      fontSize: 18,
      color: colors.palette.primary500,
      marginRight: 2,
    },
    infoText: {
      fontSize: 15,
      color: '#222',
      marginRight: 12,
    },
    categoryScroll: {
      marginTop: 18,
      marginBottom: 8,
      paddingHorizontal: 12,
    },
    categoryScrollContent: {
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    categoryChip: {
      backgroundColor: '#f2f2f2',
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingVertical: 8,
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 70,
      borderWidth: 0,
      elevation: 0,
    },
    categoryChipActive: {
      backgroundColor: colors.palette.primary500,
      shadowColor: colors.palette.primary500,
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
    categoryChipText: {
      fontSize: 15,
      color: '#888',
      fontWeight: '500',
      textAlign: 'center',
    },
    categoryChipTextActive: {
      color: '#fff',
      fontWeight: '700',
    },
    stickyCategoryBar: {
      marginBottom: 4,
    },
    headerImageWrap: {
      width: '100%',
      height: 196,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: '#eee',
    },
    headerImage: {
      width: '100%',
      height: '100%',
    },
    headerCard: {
      backgroundColor: '#fff',
      borderRadius: 20,
      marginHorizontal: 16,
      marginTop: -64,
      padding: 18,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
      alignItems: 'flex-start',
      zIndex: 1,
    },
    menuItemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.palette.neutral100,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.md,
      marginLeft: theme.spacing.md,
      marginRight: theme.spacing.md,
      borderRadius: theme.styles.borderRadius.xl,
      ...theme.styles.shadow.sm,
    },
    menuItemContent: {
      flex: 1,
      justifyContent: 'center',
      gap: 2,
    },
    menuItemPriceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
      gap: 12,
    },
    menuItemQuantityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    menuItemImage: {
      width: 74,
      height: 74,
      borderRadius: theme.styles.borderRadius.lg,
      marginRight: theme.spacing.lg,
      backgroundColor: theme.colors.palette.neutral200,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    menuItemTitle: {
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 2,
    },
    menuItemDescription: {
      fontSize: 13,
      color: theme.colors.textDim,
      marginBottom: 4,
    },
    menuItemPrice: {
      fontSize: 16,
      color: theme.colors.palette.secondary400,
      marginRight: 12,
      backgroundColor: theme.colors.palette.secondary100,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: theme.styles.borderRadius.md,
    },
    menuItemQuantityButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.palette.accent100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuItemQuantityText: {
      fontSize: 20,
      color: theme.colors.palette.accent400,
      fontWeight: 'bold',
    },
    menuItemQuantity: {
      marginHorizontal: 12,
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    menuItemArrow: {
      marginLeft: 10,
      fontSize: 22,
      color: theme.colors.palette.accent200,
      fontWeight: 'bold',
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  })

  const MenuItem = observer(
    ({ item, menuImages, onAdd, onRemove }: MenuItemProps) => {
      const quantity =
        cartStore.items.find(i => i.menuItem.id === item.id)?.quantity || 0

      return (
        <TouchableOpacity
          onPress={() => router.push(`/screens/food/${item.id}`)}
          style={styles.menuItemContainer}
          activeOpacity={0.85}
        >
          <AutoImage
            source={menuImages[item.id] || fallbackImage}
            maxHeight={70}
            style={styles.menuItemImage}
          />
          <View style={styles.menuItemContent}>
            <Text preset="bold" style={styles.menuItemTitle}>
              {item.name}
            </Text>
            <Text
              preset="default"
              size="small"
              style={styles.menuItemDescription}
            >
              {item.description}
            </Text>
            <View style={styles.menuItemPriceContainer}>
              <Text preset="bold" style={styles.menuItemPrice}>
                ${item.price?.toFixed(2) ?? ''}
              </Text>
              <View style={styles.menuItemQuantityContainer}>
                <TouchableOpacity
                  style={styles.menuItemQuantityButton}
                  onPress={() => onRemove(item.id)}
                >
                  <Text style={styles.menuItemQuantityText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.menuItemQuantity}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.menuItemQuantityButton}
                  onPress={() => onAdd(item)}
                >
                  <Text style={styles.menuItemQuantityText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <Text style={styles.menuItemArrow}>{'›'}</Text>
        </TouchableOpacity>
      )
    },
  )

  return (
    <View style={styles.container}>
      <LoadingOverlay
        visible={loading || imgLoading}
        message="Loading restaurant..."
      />
      <View key="header">
        {/* Restaurant Image with Floating Back Button */}
        <View style={styles.headerImageWrap}>
          <Image
            source={restaurantImg}
            style={styles.headerImage}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.floatingBackBtn}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={colors.palette.primary300}
            />
          </TouchableOpacity>
        </View>
        {/* Restaurant Details Card, overlapping image */}
        {restaurant && (
          <View style={styles.headerCard}>
            <Text preset="heading" size="xxl" style={styles.restaurantName}>
              {restaurant.name}
            </Text>
            <Text
              preset="subheading"
              size="medium"
              style={styles.restaurantDesc}
            >
              {restaurant.description}
            </Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>★</Text>
              <Text style={styles.infoText}>
                {restaurant.rating?.toFixed(1) ?? '4.5'}
              </Text>
              <Text style={styles.infoIcon}>🚚</Text>
              <Text style={styles.infoText}>Free</Text>
              <Text style={styles.infoIcon}>⏰</Text>
              <Text style={styles.infoText}>20 min</Text>
            </View>
          </View>
        )}
      </View>
      {/* index 1: chips bar */}
      <View style={styles.stickyCategoryBar} key="chips">
        <ScrollView
          ref={categoryScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categories.map((cat, _idx) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => handleCategoryChipPress(cat.id)}
            >
              <Text
                preset={selectedCategory === cat.id ? 'bold' : 'default'}
                style={
                  selectedCategory === cat.id
                    ? styles.categoryChipTextActive
                    : styles.categoryChipText
                }
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {!loading && !imgLoading && restaurant && (
        <FlatList
          ref={flatListRef}
          data={menu}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{
            paddingBottom: theme.spacing.xl,
            paddingTop: theme.spacing.sm,
          }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MenuItem
              item={item}
              menuImages={menuImages}
              onAdd={handleAddToCart}
              onRemove={handleRemoveFromCart}
            />
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      )}

      <CustomAlert
        visible={showCartAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={() => handleAlertConfirm(() => alertConfig.onConfirm?.())}
        onCancel={() => handleAlertCancel(() => alertConfig.onCancel?.())}
        showCancel={alertConfig.showCancel}
      />

      <CustomAlert
        visible={showErrorAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={() => handleAlertConfirm(() => alertConfig.onConfirm?.())}
        onCancel={() => handleAlertCancel(() => alertConfig.onCancel?.())}
        showCancel={alertConfig.showCancel}
      />
    </View>
  )
}

export default observer(RestaurantDetailScreen)
