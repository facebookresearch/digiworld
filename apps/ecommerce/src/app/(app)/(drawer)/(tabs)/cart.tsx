// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useEffect, useRef, useMemo } from 'react'
import { Text, ProductImage } from '@/components'
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from 'react-native'
import { useAppTheme, Theme, spacing } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Instance } from 'mobx-state-tree'
import { CartItemModel } from '@/models/CartStore'
import { useDrawerStatus } from '@react-navigation/drawer'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useNavigation } from '@react-navigation/native'

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

const CartItem = ({ item, onUpdateQuantity }: CartItemProps) => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.cartItem}>
      <ProductImage
        productId={item.productId}
        style={styles.productImage}
        isGallery={false}
        defaultSource={require('@/assets/images/placeholder_product.jpg')}
      />
      <View style={styles.itemDetails}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: '80%' }}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.productName}
            </Text>
            <Text style={styles.seller}>Sold by: {item.seller}</Text>
            <Text style={styles.stock}>
              {item.inStock ? 'In Stock' : 'Out of Stock'}
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>${item.discountedPrice.toFixed(2)}</Text>
            {item.price > item.discountedPrice && (
              <Text style={styles.originalPrice}>${item.price.toFixed(2)}</Text>
            )}
          </View>
        </View>

        <View style={styles.actionRow}>
          <View style={styles.quantitySelector}>
            <TouchableOpacity
              onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
              style={[
                styles.quantityButton,
                item.quantity <= 1 && styles.quantityButtonDisabled,
              ]}
            >
              <MaterialIcons
                name="remove"
                size={20}
                color={theme.colors.palette.neutral800}
              />
            </TouchableOpacity>
            <Text style={styles.quantity}>{item.quantity}</Text>
            <TouchableOpacity
              onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
              style={styles.quantityButton}
            >
              <MaterialIcons
                name="add"
                size={20}
                color={theme.colors.palette.neutral800}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  )
}

const CartSummary = ({
  subtotal,
  savings,
  total,
  itemCount,
}: CartSummaryProps) => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.summary}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal ({itemCount} items)</Text>
        <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
      </View>
      {savings > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.savingsLabel}>Your Savings</Text>
          <Text style={styles.savingsValue}>-${savings.toFixed(2)}</Text>
        </View>
      )}
      <View style={[styles.summaryRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>${total?.toFixed(2)}</Text>
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
  const styles = useMemo(() => createStyles(theme), [theme])

  const { trackScreenMount, trackContentChange } = useInteractionTracking(
    'Cart',
    '/(app)/(drawer)/(tabs)/cart',
  )

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
        .catch(error => {
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
  const hasOutOfStockItems = cartStore.items.some(item => !item.inStock)

  if (cartStore.isLoading) {
    return (
      <View style={styles.container}>
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
        <View style={styles.emptyCart}>
          <MaterialIcons
            name="error-outline"
            size={64}
            color={theme.colors.palette.angry500}
          />
          <Text
            style={[
              styles.emptyTitle,
              { color: theme.colors.palette.angry500 },
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

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <Text style={styles.itemCount}>{cartStore.items.length} items</Text>
        </View>
        <FlatList
          ref={flatListRef}
          data={cartStore.items}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.cartItems}
          removeClippedSubviews={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          renderItem={({ item }) => (
            <CartItem
              item={item}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemoveItem}
            />
          )}
          ListFooterComponent={() => (
            <CartSummary
              subtotal={cartStore.subtotal}
              savings={cartStore.savings}
              total={cartStore.total}
              itemCount={cartStore.items.length}
            />
          )}
        />
      </View>

      <View style={styles.stickyFooter}>
        {hasOutOfStockItems && (
          <Text style={styles.outOfStockWarning}>
            Please remove out of stock items to continue
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.checkoutButton,
            hasOutOfStockItems && styles.checkoutButtonDisabled,
          ]}
          onPress={handleCheckout}
          disabled={hasOutOfStockItems}
        >
          <Text style={styles.checkoutButtonText}>Continue to Checkout</Text>
          <Text style={styles.checkoutTotal}>
            ${cartStore.total?.toFixed(2)}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral800,
    },
    itemCount: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
    },
    cartItems: {
      padding: spacing.sm,
      paddingBottom: spacing.xl,
    },
    cartItem: {
      flexDirection: 'row',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 8,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    productImage: {
      width: 50,
      height: 50,
      borderRadius: 4,
      marginRight: spacing.xs,
    },
    itemDetails: {
      flex: 1,
    },
    productName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
    },
    seller: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
    },
    stock: {
      fontSize: 12,
      color: theme.colors.palette.angry500,
    },
    priceRow: {
      flexDirection: 'column',
    },
    price: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral800,
    },
    originalPrice: {
      fontSize: 14,
      color: theme.colors.palette.neutral500,
      textDecorationLine: 'line-through',
    },
    actionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    quantitySelector: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 4,
    },
    quantityButton: {
      padding: spacing.xxs,
    },
    quantityButtonDisabled: {
      opacity: 0.5,
    },
    quantity: {
      paddingHorizontal: spacing.sm,
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    removeButton: {
      padding: spacing.xs,
    },
    summary: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 8,
      padding: spacing.md,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    summaryLabel: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
    },
    savingsLabel: {
      fontSize: 16,
      color: theme.colors.palette.angry500,
    },
    savingsValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.angry500,
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral300,
      paddingTop: spacing.sm,
      marginBottom: 0,
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral800,
    },
    totalValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral800,
    },
    footer: {
      padding: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral300,
    },
    checkoutButton: {
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 8,
      padding: spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    checkoutButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral100,
    },
    checkoutTotal: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral100,
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
      color: theme.colors.palette.neutral800,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    emptyDescription: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
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
      color: theme.colors.palette.neutral100,
    },
    mainContent: {
      flex: 1,
      padding: spacing.sm,
    },
    stickyFooter: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral300,
    },
    outOfStockWarning: {
      color: theme.colors.palette.angry500,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    checkoutButtonDisabled: {
      backgroundColor: theme.colors.palette.neutral400,
      opacity: 0.7,
    },
  })
