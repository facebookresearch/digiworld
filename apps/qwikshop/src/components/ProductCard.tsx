import React, { useMemo } from 'react'
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native'
import { observer } from 'mobx-react-lite'
import { Text, ProductImage } from '@/components'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Product } from '@/models/ProductStore'
import { useStores } from '@/models'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'

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
    const { cartStore, userStore } = useStores()
    const { theme } = useAppTheme()
    const styles = useMemo(() => createStyles(theme), [theme])

    const cartItem = cartStore.items.find(item => item.productId === product.id)
    const isWishlistedProduct = userStore.currentUser?.wishlistIds?.includes(
      product.id,
    )
    const price = Number(product.price ?? 0)
    const discountedPrice = Number(product.discountedPrice ?? price)
    const discountPercentage = Math.round(
      price > 0 ? ((price - discountedPrice) / price) * 100 : 0,
    )

    const renderCartControls = () => {
      if (!product.inStock) {
        return (
          <View style={styles.outOfStockButton}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )
      }

      if (cartItem) {
        return (
          <LinearGradient
            colors={[
              theme.colors.palette.primary500,
              theme.colors.palette.primary600,
            ]}
            style={styles.quantityContainer}
          >
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() =>
                handleUpdateQuantity?.(product.id, cartItem.quantity - 1)
              }
            >
              <MaterialIcons
                name="remove"
                size={14}
                color={theme.colors.palette.neutral900}
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
                size={14}
                color={theme.colors.palette.neutral900}
              />
            </TouchableOpacity>
          </LinearGradient>
        )
      }

      return (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleAddToCart(product)}
        >
          <LinearGradient
            colors={[
              theme.colors.palette.primary500,
              theme.colors.palette.primary600,
            ]}
            style={styles.addButtonGradient}
          >
            <MaterialIcons
              name="add-shopping-cart"
              size={16}
              color={theme.colors.palette.neutral900}
            />
          </LinearGradient>
        </TouchableOpacity>
      )
    }

    return (
      <TouchableOpacity
        style={[styles.card, style]}
        onPress={() => onPress(product)}
      >
        <LinearGradient
          colors={[theme.colors.palette.neutral100, theme.colors.card]}
          style={styles.cardGradient}
        >
          <View style={styles.imageContainer}>
            <ProductImage
              productId={product.id}
              style={styles.image}
              isGallery={false}
              defaultSource={require('@/assets/images/placeholder_product.jpg')}
            />

            {/* Wishlist Button */}
            <TouchableOpacity
              onPress={() => {
                if (handleWishlisting) {
                  handleWishlisting(product.id)
                }
              }}
              style={styles.wishlistButton}
            >
              <LinearGradient
                colors={
                  isWishlistedProduct
                    ? [
                        theme.colors.palette.accent500,
                        theme.colors.palette.accent600,
                      ]
                    : [
                        `${theme.colors.palette.neutral100}E6`,
                        `${theme.colors.palette.neutral100}B3`,
                      ]
                }
                style={styles.wishlistGradient}
              >
                <Ionicons
                  name={isWishlistedProduct ? 'heart' : 'heart-outline'}
                  size={18}
                  color={
                    isWishlistedProduct
                      ? theme.colors.palette.neutral900
                      : theme.colors.palette.neutral600
                  }
                />
              </LinearGradient>
            </TouchableOpacity>

            {/* Discount Badge */}
            {discountPercentage > 0 && (
              <LinearGradient
                colors={[
                  theme.colors.palette.accent500,
                  theme.colors.palette.accent600,
                ]}
                style={styles.discountBadge}
              >
                <Text style={styles.discountText}>-{discountPercentage}%</Text>
              </LinearGradient>
            )}

            {/* Cart Controls */}
            <View style={styles.cartControlsContainer}>
              {renderCartControls()}
            </View>
          </View>

          <View style={styles.productContent}>
            <Text style={styles.name} numberOfLines={2}>
              {product.name}
            </Text>

            <View style={styles.ratingContainer}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <MaterialIcons
                    key={star}
                    name="star"
                    size={12}
                    color={
                      star <= 4
                        ? theme.colors.palette.accent500
                        : theme.colors.palette.neutral300
                    }
                  />
                ))}
              </View>
              <Text style={styles.ratingText}>(4.0)</Text>
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.discountPrice}>
                ${discountedPrice.toFixed(2)}
              </Text>
              {price > discountedPrice && (
                <Text style={styles.actualPrice}>${price.toFixed(2)}</Text>
              )}
            </View>

            {/* Free Shipping Badge */}
            <View style={styles.shippingBadge}>
              <MaterialIcons
                name="local-shipping"
                size={12}
                color={theme.colors.palette.success500}
              />
              <Text style={styles.shippingText}>Free Ship</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    )
  },
)

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flex: 1,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
      marginBottom: spacing.xs,
    },
    cardGradient: {
      flex: 1,
      borderRadius: 16,
    },
    imageContainer: {
      position: 'relative',
      height: 140,
      margin: spacing.xs,
      borderRadius: 12,
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
    },
    wishlistButton: {
      position: 'absolute',
      top: spacing.xs,
      right: spacing.xs,
      borderRadius: 16,
      overflow: 'hidden',
      zIndex: 10,
    },
    wishlistGradient: {
      padding: spacing.xs,
      borderRadius: 16,
    },
    discountBadge: {
      position: 'absolute',
      top: spacing.xs,
      left: spacing.xs,
      borderRadius: 12,
      paddingHorizontal: spacing.xs,
      paddingVertical: 4,
    },
    discountText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    cartControlsContainer: {
      position: 'absolute',
      bottom: spacing.xs,
      right: spacing.xs,
    },
    addButton: {
      borderRadius: 20,
      overflow: 'hidden',
    },
    addButtonGradient: {
      padding: spacing.xs,
      borderRadius: 20,
    },
    outOfStockButton: {
      backgroundColor: theme.colors.palette.neutral400,
      borderRadius: 12,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    outOfStockText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
    quantityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      overflow: 'hidden',
    },
    quantityButton: {
      padding: 6,
    },
    quantityText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      paddingHorizontal: spacing.xs,
      minWidth: 20,
      textAlign: 'center',
    },
    productContent: {
      padding: spacing.sm,
      gap: spacing.xs,
    },
    name: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
      lineHeight: 16,
      height: 32, // Fixed height for 2 lines
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    stars: {
      flexDirection: 'row',
      gap: 1,
    },
    ratingText: {
      fontSize: 10,
      color: theme.colors.textDim,
      fontWeight: '500',
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    discountPrice: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.primary600,
    },
    actualPrice: {
      fontSize: 12,
      textDecorationLine: 'line-through',
      color: theme.colors.textDim,
    },
    shippingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: theme.colors.palette.success100,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    shippingText: {
      fontSize: 9,
      fontWeight: '600',
      color: theme.colors.palette.success600,
    },
    loadingImage: {
      opacity: 0.7,
    },
  })
