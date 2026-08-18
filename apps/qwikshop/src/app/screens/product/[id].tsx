// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState, useEffect, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
  StatusBar,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Screen, Text, Header, ProductImage } from '@/components'
import { useStores } from '@/models'
import { useAppTheme, type Theme, spacing } from '@andojo/shared-theme'
import {
  MaterialIcons,
  Ionicons,
  FontAwesome5,
  Feather,
} from '@expo/vector-icons'
import { useToast } from '@/components/Toast'
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'
import { Reviews } from '@/app/components/Reviews'
import { LinearGradient } from 'react-native-linear-gradient'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export default observer(function ProductDetailScreen() {
  const { id, sessionId, timeStamp } = useLocalSearchParams()
  const router = useRouter()
  const toast = useToast()
  const { theme } = useAppTheme()
  const {
    productStore: { getProductById },
    userStore,
    cartStore,
    sessionStore,
    reviewStore,
  } = useStores()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('ProductDetails', `/screens/product/${id}`)

  const product = getProductById(Number(id))
  const cartItem = cartStore.items.find(
    (item: any) => item.productId === product?.id,
  )
  const isWishlistedProduct = userStore.currentUser?.wishlistIds?.includes(
    product?.id,
  )

  const styles = useMemo(() => createStyles(theme), [theme])

  useEffect(() => {
    // First try to restore from session if sessionId exists
    if (sessionId) {
      const sessionData = sessionStore.getSession(sessionId as string)
      if (sessionData?.data) {
        console.log('Restoring product details session:', sessionData)
        trackContentChange(sessionData.data)
        setTimeout(() => {
          const latestInteration = getLatestInteraction()
          console.log(
            'Latest interaction',
            JSON.stringify(latestInteration, null, 2),
          )
        }, 1000)
      }
    }

    trackScreenMount({
      productId: id,
      isAuthenticated: userStore.isAuthenticated,
      productFound: !!product,
      isInCart: !!cartItem,
      isWishlisted: isWishlistedProduct,
      sessionId,
    })
  }, [id, sessionId, timeStamp])

  useEffect(() => {
    console.log('loading reviews', Number(id))
    reviewStore.loadProductReviews(Number(id))
  }, [id])

  if (!product) {
    return (
      <Screen style={styles.container}>
        <Header
          title="Product Details"
          leftIcon="back"
          onLeftPress={() => router.back()}
        />
        <Text>Product not found</Text>
      </Screen>
    )
  }

  const productImages =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [product.imageUrl].filter(Boolean)
  const price = Number(product.price ?? 0)
  const discountedPrice = Number(product.discountedPrice ?? price)
  let productSpecs: Record<string, unknown> = {}
  try {
    productSpecs = product.specs ? JSON.parse(product.specs) : {}
  } catch {
    productSpecs = {}
  }
  const discountPercentage = Math.round(
    price > 0 ? ((price - discountedPrice) / price) * 100 : 0,
  )

  const handleAddToCart = () => {
    trackClick('addToCart')
    if (!userStore.user?.id) {
      router.push('/login')
      return
    }

    cartStore.addItem(userStore.user.id, product, 1)
    toast.show({
      title: 'Product added successfully',
      preset: 'success',
      placement: 'top',
    })
  }

  const handleUpdateQuantity = (newQuantity: number) => {
    trackClick('updateQuantity')
    if (!userStore.user?.id || !cartItem) return

    if (newQuantity === 0) {
      cartStore.removeItem(cartItem.id)
      toast.show({
        title: 'Product removed from cart',
        preset: 'success',
        placement: 'top',
      })
      return
    }

    cartStore.updateItemQuantity(cartItem.id, newQuantity)
  }

  const handleWishlisting = (productId: number) => {
    trackClick('toggleWishlist')
    userStore.handleWishlisting(productId)
  }

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
    setCurrentImageIndex(newIndex)
    trackContentChange({
      imageScrolled: true,
      currentImageIndex: newIndex,
    })
  }

  // const handleCategoryPress = () => {
  //   trackClick("viewCategory")
  // }

  const capitalizeFirstLetter = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1)

  // Remove this function as we're handling specs inline now

  return (
    <LinearGradient
      colors={[
        theme.colors.palette.primary100,
        theme.colors.backgroundSecondary,
      ]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* Modern Header */}
      <LinearGradient
        colors={[
          theme.colors.palette.primary500,
          theme.colors.palette.primary600,
        ]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.card} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => handleWishlisting(product.id)}
        >
          <Ionicons
            name={isWishlistedProduct ? 'heart' : 'heart-outline'}
            size={24}
            color={
              isWishlistedProduct
                ? theme.colors.palette.error100
                : theme.colors.card
            }
          />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image Gallery */}
        <View style={styles.imageSection}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            style={styles.imageGallery}
          >
            {productImages.map((image: string, index: number) => (
              <View key={index} style={styles.imageWrapper}>
                <ProductImage
                  productId={product.id}
                  isGallery={index > 0}
                  galleryIndex={index}
                  style={styles.heroImage}
                  defaultSource={require('@/assets/images/placeholder_product.jpg')}
                />
              </View>
            ))}
          </ScrollView>

          {/* Image Indicators */}
          <View style={styles.imageIndicators}>
            {productImages.map((image: string, index: number) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  currentImageIndex === index && styles.activeIndicator,
                ]}
              />
            ))}
          </View>

          {/* Discount Badge */}
          {discountPercentage > 0 && (
            <View style={styles.discountBadge}>
              <LinearGradient
                colors={[
                  theme.colors.palette.accent500,
                  theme.colors.palette.accent600,
                ]}
                style={styles.discountGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.discountText}>-{discountPercentage}%</Text>
              </LinearGradient>
            </View>
          )}
        </View>

        {/* Product Info Card */}
        <LinearGradient
          colors={[theme.colors.card, theme.colors.backgroundSecondary]}
          style={styles.productCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productDescription}>
            {product.shortDescription || product.description}
          </Text>

          {/* Rating & Reviews */}
          <View style={styles.ratingSection}>
            <View style={styles.ratingBadge}>
              <Ionicons
                name="star"
                size={16}
                color={theme.colors.palette.accent500}
              />
              <Text style={styles.ratingValue}>{product.rating || 4.7}</Text>
            </View>
            <Text style={styles.reviewsText}>
              ({product.reviewCount || 814} reviews)
            </Text>
          </View>

          {/* Price Section */}
          <View style={styles.priceSection}>
            <Text style={styles.currentPrice}>
              ${discountedPrice.toFixed(2)}
            </Text>
            {discountPercentage > 0 && (
              <Text style={styles.originalPrice}>${price.toFixed(2)}</Text>
            )}
          </View>
        </LinearGradient>

        {/* Features Cards */}
        <View style={styles.featuresGrid}>
          {/* Stock Status */}
          <LinearGradient
            colors={[theme.colors.card, theme.colors.backgroundSecondary]}
            style={styles.featureCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.featureContent}>
              <View
                style={[
                  styles.featureIcon,
                  {
                    backgroundColor: product.inStock
                      ? theme.colors.palette.success100
                      : theme.colors.palette.error100,
                  },
                ]}
              >
                <MaterialIcons
                  name={product.inStock ? 'check-circle' : 'remove-circle'}
                  size={20}
                  color={
                    product.inStock
                      ? theme.colors.palette.success500
                      : theme.colors.palette.error500
                  }
                />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>
                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                </Text>
                <Text style={styles.featureSubtitle}>
                  {product.inStock
                    ? `${product.stockCount} available`
                    : 'Notify when available'}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Seller Info */}
          <LinearGradient
            colors={[theme.colors.card, theme.colors.backgroundSecondary]}
            style={styles.featureCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.featureContent}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: theme.colors.palette.secondary100 },
                ]}
              >
                <FontAwesome5
                  name="store"
                  size={18}
                  color={theme.colors.palette.secondary500}
                />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Sold by</Text>
                <Text style={styles.featureSubtitle}>{product.seller}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Category */}
          <LinearGradient
            colors={[theme.colors.card, theme.colors.backgroundSecondary]}
            style={styles.featureCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.featureContent}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: theme.colors.palette.primary100 },
                ]}
              >
                <MaterialIcons
                  name="category"
                  size={20}
                  color={theme.colors.palette.primary500}
                />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Category</Text>
                <Text style={styles.featureSubtitle}>
                  {product.categoryName}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Shipping */}
          <LinearGradient
            colors={[theme.colors.card, theme.colors.backgroundSecondary]}
            style={styles.featureCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.featureContent}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: theme.colors.palette.success100 },
                ]}
              >
                <Feather
                  name="truck"
                  size={18}
                  color={theme.colors.palette.success500}
                />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Free Shipping</Text>
                <Text style={styles.featureSubtitle}>2-3 business days</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Specifications */}
        <LinearGradient
          colors={[theme.colors.card, theme.colors.backgroundSecondary]}
          style={styles.sectionCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.sectionTitle}>Specifications</Text>
          <View style={styles.specsList}>
            {Object.entries(productSpecs).map(([key, value]) => (
              <View key={key} style={styles.specRow}>
                <Text style={styles.specKey}>{capitalizeFirstLetter(key)}</Text>
                <Text style={styles.specValue}>{value as string}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Description */}
        <LinearGradient
          colors={[theme.colors.card, theme.colors.backgroundSecondary]}
          style={styles.sectionCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.sectionTitle}>About this item</Text>
          <Text style={styles.descriptionText}>{product.description}</Text>
        </LinearGradient>

        {/* Reviews Section */}
        {product && <Reviews productId={product.id} />}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Bar */}
      <View style={styles.actionBar}>
        <LinearGradient
          colors={[`${theme.colors.card}F2`, theme.colors.card]}
          style={styles.actionBarGradient}
        >
          {!product.inStock ? (
            <TouchableOpacity style={styles.outOfStockButton} disabled>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </TouchableOpacity>
          ) : cartItem ? (
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={[
                  styles.quantityBtn,
                  cartItem.quantity <= 1 && styles.quantityBtnDisabled,
                ]}
                onPress={() => handleUpdateQuantity(cartItem.quantity - 1)}
                disabled={cartItem.quantity <= 1}
              >
                <MaterialIcons
                  name="remove"
                  size={20}
                  color={theme.colors.card}
                />
              </TouchableOpacity>

              <View style={styles.quantityDisplay}>
                <Text style={styles.quantityNumber}>{cartItem.quantity}</Text>
                <Text style={styles.quantityLabel}>in cart</Text>
              </View>

              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => handleUpdateQuantity(cartItem.quantity + 1)}
              >
                <MaterialIcons name="add" size={20} color={theme.colors.card} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addToCartBtn}
              onPress={handleAddToCart}
            >
              <LinearGradient
                colors={[
                  theme.colors.palette.accent500,
                  theme.colors.palette.accent600,
                ]}
                style={styles.addToCartGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialIcons
                  name="shopping-cart"
                  size={24}
                  color={theme.colors.card}
                />
                <Text style={styles.addToCartText}>Add to Cart</Text>
                <Text style={styles.addToCartPrice}>
                  ${product.discountedPrice.toFixed(2)}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>
    </LinearGradient>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 60,
      paddingBottom: spacing.md,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${theme.colors.card}33`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.card,
    },

    // Scroll View
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100,
    },

    // Image Section
    imageSection: {
      backgroundColor: theme.colors.card,
      marginBottom: spacing.sm,
    },
    imageGallery: {
      height: SCREEN_WIDTH,
    },
    imageWrapper: {
      width: SCREEN_WIDTH,
      height: SCREEN_WIDTH,
    },
    heroImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    imageIndicators: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    indicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.palette.neutral300,
      marginHorizontal: 4,
    },
    activeIndicator: {
      backgroundColor: theme.colors.palette.accent500,
      width: 24,
      height: 8,
      borderRadius: 4,
    },
    discountBadge: {
      position: 'absolute',
      top: spacing.md,
      left: spacing.md,
      borderRadius: 12,
      overflow: 'hidden',
    },
    discountGradient: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    discountText: {
      color: theme.colors.card,
      fontSize: 14,
      fontWeight: '700',
    },

    // Product Card
    productCard: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
      padding: spacing.lg,
      borderRadius: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    productName: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: spacing.sm,
      lineHeight: 32,
    },
    productDescription: {
      fontSize: 16,
      color: theme.colors.textDim,
      marginBottom: spacing.md,
      lineHeight: 24,
    },

    // Rating Section
    ratingSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.accent100,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 16,
      marginRight: spacing.sm,
    },
    ratingValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.accent600,
      marginLeft: 4,
    },
    reviewsText: {
      fontSize: 14,
      color: theme.colors.textDim,
    },

    // Price Section
    priceSection: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    currentPrice: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.palette.accent500,
      marginRight: spacing.sm,
    },
    originalPrice: {
      fontSize: 18,
      color: theme.colors.textDim,
      textDecorationLine: 'line-through',
    },

    // Features Grid
    featuresGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    featureCard: {
      width: (SCREEN_WIDTH - spacing.md * 3) / 2,
      padding: spacing.md,
      borderRadius: 12,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    featureContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
    },
    featureText: {
      flex: 1,
    },
    featureTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    featureSubtitle: {
      fontSize: 12,
      color: theme.colors.textDim,
    },

    // Section Cards
    sectionCard: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.lg,
      borderRadius: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: spacing.md,
    },

    // Specifications
    specsList: {
      gap: spacing.sm,
    },
    specRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    specKey: {
      fontSize: 14,
      color: theme.colors.textDim,
      flex: 1,
    },
    specValue: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      textAlign: 'right',
      flex: 1,
    },

    // Description
    descriptionText: {
      fontSize: 16,
      color: theme.colors.textDim,
      lineHeight: 24,
    },

    // Bottom Spacing
    bottomSpacing: {
      height: 20,
    },

    // Action Bar
    actionBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral200,
    },
    actionBarGradient: {
      padding: spacing.md,
    },

    // Out of Stock
    outOfStockButton: {
      backgroundColor: theme.colors.palette.neutral300,
      paddingVertical: spacing.md,
      borderRadius: 16,
      alignItems: 'center',
    },
    outOfStockText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textDim,
    },

    // Quantity Controls
    quantityControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 16,
      padding: spacing.xs,
    },
    quantityBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.palette.accent500,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quantityBtnDisabled: {
      backgroundColor: theme.colors.palette.neutral300,
    },
    quantityDisplay: {
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    quantityNumber: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
    },
    quantityLabel: {
      fontSize: 12,
      color: theme.colors.textDim,
      marginTop: 2,
    },

    // Add to Cart
    addToCartBtn: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    addToCartGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    addToCartText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.card,
    },
    addToCartPrice: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.card,
      marginLeft: spacing.sm,
    },
  })
