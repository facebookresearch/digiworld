import React, { useCallback, useEffect, useRef, useMemo } from 'react'
import { Text, ProductImage } from '@/components'
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  StatusBar,
} from 'react-native'
import { spacing } from '@andojo/shared-theme'
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Instance } from 'mobx-state-tree'
import { CartItemModel } from '@/models/CartStore'
import { useDrawerStatus } from '@react-navigation/drawer'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'react-native-linear-gradient'

interface CartItemProps {
  item: Instance<typeof CartItemModel>
  onUpdateQuantity: (id: number, quantity: number) => void
  onRemove: (id: number) => void
}

interface CartSummaryProps {
  subtotal: number
  savings: number
  total: number
  itemCount: number
}

const CleanCartItem = ({ item, onUpdateQuantity }: CartItemProps) => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const discountPercentage =
    item.price > item.discountedPrice
      ? Math.round(((item.price - item.discountedPrice) / item.price) * 100)
      : 0

  return (
    <View style={styles.cleanCartItem}>
      <View style={styles.itemImageSection}>
        <View style={styles.imageContainer}>
          <ProductImage
            productId={item.productId}
            style={styles.productImage}
            isGallery={false}
            defaultSource={require('@/assets/images/placeholder_product.jpg')}
          />
          {discountPercentage > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPercentage}%</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.itemDetailsSection}>
        <View style={styles.itemHeader}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onUpdateQuantity(item.id, 0)}
          >
            <MaterialIcons
              name="close"
              size={18}
              color={theme.colors.palette.neutral500}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.sellerName}>by {item.seller}</Text>

        <View style={styles.stockRow}>
          <View
            style={[
              styles.stockBadge,
              {
                backgroundColor: item.inStock
                  ? theme.colors.palette.success100
                  : theme.colors.palette.error100,
              },
            ]}
          >
            <Text
              style={[
                styles.stockText,
                {
                  color: item.inStock
                    ? theme.colors.palette.success700
                    : theme.colors.palette.error700,
                },
              ]}
            >
              {item.inStock ? '✓ In Stock' : '✗ Out of Stock'}
            </Text>
          </View>
        </View>

        <View style={styles.priceQuantityRow}>
          <View style={styles.priceColumn}>
            <Text style={styles.currentPrice}>
              ${item.discountedPrice.toFixed(2)}
            </Text>
            {item.price > item.discountedPrice && (
              <Text style={styles.originalPrice}>${item.price.toFixed(2)}</Text>
            )}
          </View>

          <View style={styles.quantityControls}>
            <TouchableOpacity
              onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
              style={[
                styles.quantityButton,
                item.quantity <= 1 && styles.quantityButtonDisabled,
              ]}
            >
              <MaterialIcons
                name="remove"
                size={16}
                color={theme.colors.palette.neutral600}
              />
            </TouchableOpacity>

            <View style={styles.quantityValue}>
              <Text style={styles.quantityText}>{item.quantity}</Text>
            </View>

            <TouchableOpacity
              onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
              style={styles.quantityButton}
            >
              <MaterialIcons
                name="add"
                size={16}
                color={theme.colors.palette.neutral600}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.itemTotal}>
          <Text style={styles.itemTotalText}>
            Item Total: ${(item.discountedPrice * item.quantity).toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  )
}

const CleanCartSummary = ({
  subtotal,
  savings,
  total,
  itemCount,
}: CartSummaryProps) => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.cleanSummaryContainer}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <Text style={styles.itemCountText}>{itemCount} items</Text>
        </View>

        <View style={styles.summaryContent}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.shippingRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <View style={styles.freeTag}>
                <Text style={styles.freeTagText}>FREE</Text>
              </View>
            </View>
            <Text style={styles.summaryValueFree}>$0.00</Text>
          </View>

          {savings > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.savingsLabel}>You Save</Text>
              <Text style={styles.savingsValue}>-${savings.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.summaryDivider} />

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total?.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.deliveryInfo}>
          <MaterialIcons
            name="local-shipping"
            size={16}
            color={theme.colors.palette.primary500}
          />
          <Text style={styles.deliveryText}>
            Free delivery in 2-3 business days
          </Text>
        </View>
      </View>
    </View>
  )
}

export default observer(function CartScreen() {
  const router = useRouter()
  const { sessionId, timeStamp } = useLocalSearchParams()
  const { cartStore, userStore, sessionStore, uiStore } = useStores()
  const navigation = useNavigation()
  const isDrawerOpen = useDrawerStatus() === 'open'
  const flatListRef = useRef<FlatList>(null)
  const lastRefreshRef = useRef(0)
  const { theme } = useAppTheme()

  const { trackScreenMount, trackContentChange } = useInteractionTracking(
    'Cart',
    '/(app)/(drawer)/(tabs)/cart',
  )

  const styles = useMemo(() => createStyles(theme), [theme])

  useEffect(() => {
    // First try to restore from session if sessionId exists
    if (sessionId) {
      const sessionData = sessionStore.getSession(sessionId as string)
      if (sessionData?.data) {
        const formData = sessionData.data.sessionData?.formData
        console.log('Restoring cart session:', sessionData)
        // @ts-ignore
        if (!isDrawerOpen && formData?.isDrawerOpen) {
          // @ts-ignore
          navigation.openDrawer()
        }
        // @ts-ignore
        trackContentChange(formData)
      }
    }
  }, [sessionId, timeStamp])

  useEffect(() => {
    trackScreenMount({
      isAuthenticated: userStore.isAuthenticated,
      cartItemCount: cartStore.totalItems,
      sessionId,
      isDrawerOpen,
    })

    if (userStore.isAuthenticated && userStore.user?.id) {
      cartStore
        .loadCart(userStore.user.id)
        .then(() => {
          trackContentChange({
            cartLoaded: true,
            itemCount: cartStore.items.length,
            totalAmount: cartStore.total,
          })
        })
        .catch((error: any) => {
          trackContentChange({
            cartLoaded: false,
            error: String(error),
          })
        })
    }
  }, [userStore.isAuthenticated])

  useFocusEffect(
    useCallback(() => {
      // Track screen mount when focused
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'Cart',
        route: '/(app)/(drawer)/(tabs)/cart',
      })
    }, []),
  )

  // Track drawer state changes
  useEffect(() => {
    trackContentChange({
      drawerStateChanged: true,
      isDrawerOpen,
    })
  }, [isDrawerOpen])

  // Refresh data when mockDataAppendTime changes (after dbrefresh)
  useEffect(() => {
    if (uiStore.mockDataAppendTime > lastRefreshRef.current) {
      lastRefreshRef.current = uiStore.mockDataAppendTime
      console.log('🔄 Refreshing cart after dbrefresh...')
      if (userStore.isAuthenticated && userStore.user?.id) {
        cartStore.loadCart(userStore.user.id).catch(err => {
          console.error('Error refreshing cart:', err)
        })
      }
    }
  }, [
    uiStore.mockDataAppendTime,
    userStore.isAuthenticated,
    userStore.user?.id,
    cartStore,
  ])

  const handleUpdateQuantity = (itemId: number, newQuantity: number) => {
    if (userStore.user?.id) {
      if (newQuantity < 1) {
        cartStore.removeItem(itemId, userStore.user?.id as number)
      } else {
        cartStore.updateItemQuantity(
          itemId,
          newQuantity,
          userStore.user?.id as number,
        )
      }
    }
  }

  const handleRemoveItem = (itemId: number) => {
    if (userStore.user?.id) {
      Alert.alert(
        'Remove Item',
        'Are you sure you want to remove this item from your cart?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () =>
              cartStore.removeItem(itemId, userStore.user?.id as number),
          },
        ],
      )
    }
  }

  const handleCheckout = () => {
    if (!userStore.isAuthenticated) {
      router.push('/login')
      return
    }
    router.push('/screens/checkout')
  }

  // Add check for out-of-stock items
  const hasOutOfStockItems = cartStore.items.some((item: any) => !item.inStock)

  if (cartStore.isLoading) {
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
        <View style={styles.emptyCart}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.primary500}
          />
        </View>
      </View>
    )
  }

  if (cartStore.error) {
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
        <View style={styles.emptyCart}>
          <MaterialIcons
            name="error-outline"
            size={64}
            color={theme.colors.palette.error500}
          />
          <Text
            style={[
              styles.emptyTitle,
              { color: theme.colors.palette.error500 },
            ]}
          >
            Error loading cart
          </Text>
          <Text style={styles.emptyDescription}>{cartStore.error}</Text>
          <TouchableOpacity
            style={styles.continueShopping}
            onPress={() =>
              userStore.user?.id && cartStore.loadCart(userStore.user.id)
            }
          >
            <Text style={styles.continueShoppingText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (cartStore.items.length === 0) {
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
        <View style={styles.emptyCart}>
          <MaterialIcons
            name="shopping-cart"
            size={64}
            color={theme.colors.palette.neutral400}
          />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyDescription}>
            Add items to your cart and they will appear here
          </Text>
          <TouchableOpacity
            style={styles.continueShopping}
            onPress={() => router.push('/(app)/(drawer)/(tabs)/home')}
          >
            <Text style={styles.continueShoppingText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const openDrawer = () => {
    // @ts-ignore
    navigation.openDrawer()
  }

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[
          theme.colors.palette.primary100,
          theme.colors.backgroundSecondary,
        ]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Modern Header */}
      <LinearGradient
        colors={[
          theme.colors.palette.primary500,
          theme.colors.palette.primary600,
        ]}
        style={styles.modernHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={openDrawer}
            style={styles.modernMenuButton}
          >
            <LinearGradient
              // @ts-ignore
              colors={[
                theme.colors.palette.primary500,
                theme.colors.palette.primary600,
              ]}
              style={styles.menuButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons
                name="menu"
                size={20}
                color={theme.colors.palette.neutral100}
              />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.modernHeaderCenter}>
            <Text style={styles.modernHeaderTitle}>Shopping Cart</Text>
            <View style={styles.cartSummaryChip}>
              <MaterialIcons
                name="shopping-cart"
                size={14}
                color={theme.colors.palette.primary600}
              />
              <Text style={styles.cartSummaryText}>
                {cartStore.totalItems} items • ${cartStore.total?.toFixed(2)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.modernCheckoutButton,
              hasOutOfStockItems && styles.checkoutButtonDisabled,
            ]}
            onPress={handleCheckout}
            disabled={hasOutOfStockItems}
          >
            <LinearGradient
              colors={
                hasOutOfStockItems
                  ? [
                      theme.colors.palette.neutral600,
                      theme.colors.palette.neutral700,
                    ]
                  : [
                      theme.colors.palette.accent500,
                      theme.colors.palette.accent600,
                    ]
              }
              style={styles.checkoutButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialIcons
                name="payment"
                size={16}
                color={theme.colors.palette.neutral100}
              />
              <Text style={styles.checkoutButtonText}>Checkout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
      <View style={styles.mainContent}>
        {/* Floating Order Summary Preview */}
        <LinearGradient
          colors={[
            theme.colors.palette.primary50,
            theme.colors.palette.primary100,
          ]}
          style={styles.floatingSummaryPreview}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.summaryPreviewContent}>
            <View style={styles.summaryPreviewLeft}>
              <MaterialIcons
                name="receipt"
                size={20}
                color={theme.colors.palette.secondary600}
              />
              <Text style={styles.summaryPreviewText}>Order Summary</Text>
            </View>
            <View style={styles.summaryPreviewRight}>
              <Text style={styles.summaryPreviewTotal}>
                ${cartStore.total?.toFixed(2)}
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={16}
                color={theme.colors.palette.secondary600}
              />
            </View>
          </View>
        </LinearGradient>
        {hasOutOfStockItems && (
          <LinearGradient
            colors={[
              theme.colors.palette.error500,
              theme.colors.palette.error600,
            ]}
            style={styles.warningBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <MaterialIcons
              name="warning"
              size={20}
              color={theme.colors.palette.neutral100}
            />
            <Text style={styles.outOfStockWarning}>
              Remove out of stock items to continue
            </Text>
          </LinearGradient>
        )}
        <FlatList
          ref={flatListRef}
          data={cartStore.items}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.cartItems}
          removeClippedSubviews={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          renderItem={({ item }: { item: any }) => (
            <CleanCartItem
              item={item}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemoveItem}
            />
          )}
          ListFooterComponent={() => (
            <View style={styles.footerSpacing}>
              <CleanCartSummary
                subtotal={cartStore.subtotal}
                savings={cartStore.savings}
                total={cartStore.total}
                itemCount={cartStore.items.length}
              />
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },
    backgroundGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },

    // Modern Header
    modernHeader: {
      paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 60,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 4,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    modernMenuButton: {
      borderRadius: 25,
      overflow: 'hidden',
    },
    menuButtonGradient: {
      padding: 12,
      alignItems: 'center',
    },
    modernHeaderCenter: {
      flex: 1,
      alignItems: 'center',
    },
    modernHeaderTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    cartSummaryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.primary100,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 16,
      gap: 4,
    },
    cartSummaryText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.primary600,
    },
    modernCheckoutButton: {
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.accent500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    checkoutButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 6,
    },
    checkoutButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    mainContent: {
      flex: 1,
    },

    // Clean Cart Items
    cleanCartItem: {
      backgroundColor: theme.colors.palette.neutral100 + 'E6',
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: 16,
      padding: spacing.md,
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral100 + '4D',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
      minHeight: 120,
    },
    itemImageSection: {
      marginRight: spacing.md,
    },
    imageContainer: {
      position: 'relative',
    },
    itemDetailsSection: {
      flex: 1,
      justifyContent: 'space-between',
      minWidth: 0,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.xs,
      minHeight: 40,
    },
    removeButton: {
      padding: 6,
      borderRadius: 12,
      backgroundColor: theme.colors.palette.neutral200,
      minWidth: 32,
      minHeight: 32,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    sellerName: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
      marginBottom: spacing.xs,
    },
    stockRow: {
      marginBottom: spacing.sm,
    },
    stockBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    stockText: {
      fontSize: 11,
      fontWeight: '600',
    },
    priceQuantityRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    priceColumn: {
      flex: 1,
    },
    currentPrice: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral800,
    },
    quantityControls: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 8,
    },
    quantityButton: {
      padding: 8,
      borderRadius: 6,
      backgroundColor: theme.colors.palette.neutral100,
      margin: 2,
    },
    quantityValue: {
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    quantityText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
    },
    itemTotal: {
      alignItems: 'flex-end',
    },
    itemTotalText: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
    },
    floatingSummaryPreview: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      borderRadius: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral100 + '33',
    },
    summaryPreviewContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    summaryPreviewLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    summaryPreviewText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.secondary600,
    },
    summaryPreviewRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    summaryPreviewTotal: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.secondary700,
    },
    footerSpacing: {
      paddingBottom: spacing.xl,
    },

    // Clean Summary
    cleanSummaryContainer: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.lg,
    },
    summaryCard: {
      backgroundColor: theme.colors.palette.neutral100 + 'F2',
      borderRadius: 16,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral100 + '4D',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 5,
    },
    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral800,
    },
    itemCountText: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
    },
    summaryContent: {
      gap: spacing.sm,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 14,
      color: theme.colors.palette.neutral700,
      fontWeight: '500',
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
    },
    shippingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    freeTag: {
      backgroundColor: theme.colors.palette.success100,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    freeTagText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.palette.success700,
    },
    summaryValueFree: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.success600,
    },
    savingsLabel: {
      fontSize: 14,
      color: theme.colors.palette.accent600,
      fontWeight: '600',
    },
    savingsValue: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.accent600,
    },
    summaryDivider: {
      height: 1,
      backgroundColor: theme.colors.palette.neutral300,
      marginVertical: spacing.sm,
    },
    totalRow: {
      paddingTop: spacing.xs,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral800,
    },
    totalValue: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.palette.primary600,
    },
    deliveryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral200,
    },
    deliveryText: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
    },
    cartItems: {
      padding: spacing.sm,
      paddingBottom: spacing.xl,
    },

    // Shared styles
    productImageContainer: {
      position: 'relative',
    },
    productImage: {
      width: 80,
      height: 80,
      borderRadius: 12,
    },
    discountBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: theme.colors.palette.accent500,
      borderRadius: 12,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    discountText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    productName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      lineHeight: 20,
      flex: 1,
      marginRight: spacing.xs,
      paddingRight: spacing.xs,
    },
    originalPrice: {
      fontSize: 14,
      color: theme.colors.textDim,
      textDecorationLine: 'line-through',
    },
    quantityButtonDisabled: {
      opacity: 0.5,
    },

    // Warning and empty states
    warningBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
      borderRadius: 12,
      shadowColor: theme.colors.palette.error500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    outOfStockWarning: {
      color: theme.colors.palette.neutral900,
      fontSize: 14,
      fontWeight: '600',
    },
    checkoutButtonDisabled: {
      opacity: 0.6,
    },
    emptyCart: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    emptyDescription: {
      fontSize: 16,
      color: theme.colors.textDim,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    continueShopping: {
      backgroundColor: theme.colors.palette.primary500,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
      borderRadius: 8,
    },
    continueShoppingText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
  })
