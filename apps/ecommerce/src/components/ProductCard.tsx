import React, { useMemo } from 'react'
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native'
import { observer } from 'mobx-react-lite'
import { Text, ProductImage } from '@/components'
import { useAppTheme, Theme, spacing } from '@andojo/shared-theme'
import { Product } from '@/models/ProductStore'
import { useStores } from '@/models'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
interface ProductCardProps {
  product: Product
  onPress: (product: Product) => void
  handleAddToCart: (product: Product) => void
  handleUpdateQuantity?: (productId: number, quantity: number) => void
  handleWishlisting?: (productId: number) => void
  style?: ViewStyle
}

// const formatPurchaseCount = (num: number) => {
//   if (num >= 1000) {
//     return num < 10000 ? `${(num / 1000).toFixed(1)}K+` : `${Math.floor(num / 1000)}K+`
//   }
//   return `${num}+`
// }

export const ProductCard = observer(
  ({
    product,
    onPress,
    style,
    handleAddToCart,
    handleUpdateQuantity,
    handleWishlisting,
  }: ProductCardProps) => {
    const { theme } = useAppTheme()
    const styles = useMemo(() => createStyles(theme), [theme])
    const { cartStore, userStore } = useStores()
    const cartItem = cartStore.items.find(item => item.productId === product.id)
    const isWishlistedProduct = userStore.currentUser?.wishlistIds?.includes(
      product.id,
    )
    const discountPercentage = Math.round(
      ((product.price - product.discountedPrice) / product.price) * 100,
    )

    const renderCartControls = () => {
      if (!product.inStock) {
        return (
          <View style={[styles.addButton, styles.addButtonDisabled]}>
            <Text style={styles.addButtonText}>Out of Stock</Text>
          </View>
        )
      }

      if (cartItem) {
        return (
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() =>
                handleUpdateQuantity?.(product.id, cartItem.quantity - 1)
              }
            >
              <MaterialIcons
                name="remove"
                size={16}
                color={theme.colors.palette.neutral100}
              />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{cartItem.quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() =>
                handleUpdateQuantity?.(product.id, cartItem.quantity + 1)
              }
            >
              <MaterialIcons
                name="add"
                size={16}
                color={theme.colors.palette.neutral100}
              />
            </TouchableOpacity>
          </View>
        )
      }

      return (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleAddToCart(product)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      )
    }

    return (
      <TouchableOpacity
        style={[styles.card, style]}
        onPress={() => onPress(product)}
      >
        <View style={styles.imageContainer}>
          <ProductImage
            productId={product.id}
            style={styles.image}
            isGallery={false}
            defaultSource={require('@/assets/images/placeholder_product.jpg')}
          />
          <TouchableOpacity
            onPress={() => {
              if (handleWishlisting) {
                handleWishlisting(product.id)
              }
            }}
            style={styles.wishlistButton}
          >
            <Ionicons
              name={isWishlistedProduct ? 'heart' : 'heart-outline'}
              size={22}
              color={
                isWishlistedProduct
                  ? theme.colors.palette.angry500
                  : theme.colors.palette.neutral500
              }
            />
          </TouchableOpacity>

          {/* {showPurchaseInfo && (
            <View style={styles.purchaseInfoContainer}>
              <Text style={styles.purchaseInfo}>
                {formatPurchaseCount(Math.floor(Math.random() * 5000) + 100)} bought last month
              </Text>
            </View>
          )} */}

          {/* Discount Overlay (Bottom Left) */}
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discountPercentage}% OFF</Text>
          </View>

          {/* Cart Controls Overlay (Bottom Right) */}
          {renderCartControls()}
        </View>

        <View style={styles.productContent}>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.discountPrice}>
              ${product.discountedPrice.toFixed(2)}
            </Text>
            {product.price > product.discountedPrice && (
              <Text style={styles.actualPrice}>
                ${product.price.toFixed(2)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  },
)

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      maxWidth: '48%',
      minWidth: '48%',
      aspectRatio: 3 / 5,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
      overflow: 'hidden',
    },
    imageContainer: {
      position: 'relative',
      height: '70%',
    },
    image: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.palette.neutral200,
    },
    discountBadge: {
      position: 'absolute',
      bottom: spacing.xs,
      left: spacing.xs,
      backgroundColor: theme.colors.palette.angry500,
      borderRadius: 4,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xxs,
    },
    discountText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral100,
    },
    addButton: {
      position: 'absolute',
      bottom: spacing.xs,
      right: spacing.xs,
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xxs,
    },
    addButtonText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral100,
    },
    productContent: {
      padding: spacing.xs,
      flex: 1,
      justifyContent: 'space-between',
    },
    name: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral800,
      marginBottom: spacing.xxs,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    discountPrice: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.angry500,
    },
    actualPrice: {
      fontSize: 12,
      textDecorationLine: 'line-through',
      color: theme.colors.palette.neutral500,
    },
    purchaseInfoContainer: {
      position: 'absolute',
      top: spacing.xs,
      left: spacing.xs,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 4,
      padding: spacing.xxs,
    },
    purchaseInfo: {
      fontSize: 12,
      color: theme.colors.palette.neutral100,
    },
    addButtonDisabled: {
      backgroundColor: theme.colors.palette.neutral400,
    },
    quantityContainer: {
      position: 'absolute',
      bottom: spacing.xs,
      right: spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 4,
      overflow: 'hidden',
    },
    quantityButton: {
      padding: spacing.xs,
      backgroundColor: theme.colors.palette.primary600,
    },
    quantityButtonDisabled: {
      opacity: 0.5,
    },
    quantityText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
      paddingHorizontal: spacing.sm,
    },
    inCartBadge: {
      position: 'absolute',
      top: spacing.xs,
      right: spacing.xs,
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 4,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xxs,
    },
    inCartText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
    wishlistButton: {
      position: 'absolute',
      top: spacing.xs,
      right: spacing.xs,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: spacing.xxs,
      zIndex: 10,
    },
    loadingImage: {
      opacity: 0.7,
    },
  })
