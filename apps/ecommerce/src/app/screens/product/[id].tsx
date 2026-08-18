import React, { useState, useEffect, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Screen, Text, Header, Button, ProductImage } from '@/components'
import { useStores } from '@/models'
import { spacing, useAppTheme } from '@andojo/shared-theme'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { useToast } from '@/components/Toast'
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'
import { Reviews } from '@/app/components/Reviews'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    imageContainer: {
      width: '100%',
      aspectRatio: 4 / 3,
      backgroundColor: theme.colors.palette.neutral100,
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      bottom: spacing.xxs,
      width: '100%',
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.palette.neutral300,
      marginHorizontal: 4,
    },
    paginationDotActive: {
      backgroundColor: theme.colors.palette.primary500,
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    content: {
      padding: spacing.md,
    },
    name: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral800,
      marginBottom: spacing.sm,
    },
    description: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      marginBottom: spacing.md,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    rating: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ratingText: {
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: spacing.xs,
      color: theme.colors.palette.neutral800,
    },
    reviewCount: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      marginLeft: spacing.xs,
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    discountPrice: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.palette.angry500,
    },
    originalPrice: {
      fontSize: 18,
      textDecorationLine: 'line-through',
      color: theme.colors.palette.neutral500,
      marginLeft: spacing.sm,
    },
    discount: {
      fontSize: 16,
      color: theme.colors.palette.angry500,
      marginLeft: spacing.sm,
    },
    stockContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    stockText: {
      fontSize: 16,
      marginLeft: spacing.xs,
    },
    sellerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    sellerLabel: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
    },
    sellerName: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.palette.neutral800,
      marginLeft: spacing.xs,
    },
    category: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    categoryText: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      marginLeft: spacing.xs,
    },
    section: {
      marginBottom: spacing.xxxs,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral800,
      marginBottom: spacing.xxs,
    },
    specsList: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 8,
      padding: spacing.xxs,
    },
    specItem: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
      justifyContent: 'space-around',
      alignItems: 'center',
      alignContent: 'space-around',
    },
    specLabel: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },
    specValue: {
      fontSize: 14,
      color: theme.colors.palette.neutral800,
      marginLeft: spacing.xs,
    },
    detailText: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      lineHeight: 24,
    },
    footer: {
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral200,
      backgroundColor: theme.colors.background,
    },
    addToCartButton: {
      minHeight: 50,
    },
    quantityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 8,
      overflow: 'hidden',
      height: 50,
    },
    quantityButton: {
      padding: spacing.sm,
      backgroundColor: theme.colors.palette.primary600,
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      width: 60,
    },
    quantityButtonDisabled: {
      opacity: 0.5,
    },
    quantityText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
      paddingHorizontal: spacing.xl,
    },
    wishlistButton: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 20,
      padding: spacing.xs,
      zIndex: 10,
    },
  })

export default observer(function ProductDetailScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const { id, sessionId, timeStamp } = useLocalSearchParams()
  const router = useRouter()
  const toast = useToast()
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
  const cartItem = cartStore.items.find(item => item.productId === product?.id)
  const isWishlistedProduct = userStore.currentUser?.wishlistIds?.includes(
    product?.id,
  )

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

  const discountPercentage = Math.round(
    ((product.price - product.discountedPrice) / product.price) * 100,
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
      cartStore.removeItem(cartItem.id, userStore.user.id)
      toast.show({
        title: 'Product removed from cart',
        preset: 'success',
        placement: 'top',
      })
      return
    }

    cartStore.updateItemQuantity(cartItem.id, newQuantity, userStore.user.id)
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

  const renderSpecification = (key: string, value: string) => (
    <View key={key} style={styles.specItem}>
      <Text style={styles.specLabel}>{capitalizeFirstLetter(key)}:</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  )

  return (
    <ScrollView style={styles.container}>
      <Header
        title="Product Details"
        leftIcon="back"
        onLeftPress={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Image Gallery with Pagination */}
        <View style={styles.imageContainer}>
          <TouchableOpacity
            onPress={() => handleWishlisting(product.id)}
            style={styles.wishlistButton}
          >
            <Ionicons
              name={isWishlistedProduct ? 'heart' : 'heart-outline'}
              size={26}
              color={
                isWishlistedProduct
                  ? theme.colors.palette.angry500
                  : theme.colors.palette.neutral500
              }
            />
          </TouchableOpacity>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
          >
            {product.images.map((_, index: number) => (
              <ProductImage
                key={index}
                productId={product.id}
                isGallery={index > 0}
                galleryIndex={index}
                style={[styles.image, { width: SCREEN_WIDTH }]}
                defaultSource={require('@/assets/images/placeholder_product.jpg')}
              />
            ))}
          </ScrollView>
          {/* Pagination Dots */}
          <View style={styles.pagination}>
            {product.images.map((_: string, index: number) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  currentImageIndex === index && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.content}>
          {/* Product Info */}
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.description}>{product.shortDescription}</Text>

          {/* Rating and Reviews */}
          <View style={styles.ratingContainer}>
            <View style={styles.rating}>
              <Ionicons
                name="star"
                size={20}
                color={theme.colors.palette.angry500}
              />
              <Text style={styles.ratingText}>{product.rating || 4.7}</Text>
            </View>
            <Text style={styles.reviewCount}>
              ({product.reviewCount || 814} reviews)
            </Text>
          </View>

          {/* Price Section */}
          <View style={styles.priceContainer}>
            <Text style={styles.discountPrice}>
              ${product.discountedPrice.toFixed(2)}
            </Text>
            <Text style={styles.originalPrice}>
              ${product.price.toFixed(2)}
            </Text>
            <Text style={styles.discount}>{discountPercentage}% OFF</Text>
          </View>

          {/* Stock Status */}
          <View style={styles.stockContainer}>
            <MaterialIcons
              name={product.inStock ? 'check-circle' : 'remove-circle'}
              size={20}
              color={
                product.inStock
                  ? theme.colors.palette.angry500
                  : theme.colors.palette.angry100
              }
            />
            <Text
              style={[
                styles.stockText,
                {
                  color: product.inStock
                    ? theme.colors.palette.angry500
                    : theme.colors.palette.angry100,
                },
              ]}
            >
              {product.inStock
                ? `In Stock (${product.stockCount} available)`
                : 'Out of Stock'}
            </Text>
          </View>

          {/* Seller Info */}
          <View style={styles.sellerContainer}>
            <Text style={styles.sellerLabel}>Sold by:</Text>
            <Text style={styles.sellerName}>{product.seller}</Text>
          </View>

          {/* Category */}
          <Pressable style={styles.category}>
            <MaterialIcons
              name="category"
              size={20}
              color={theme.colors.palette.neutral600}
            />
            <Text style={styles.categoryText}>
              {product.categoryName} {`>`} {product.subcategoryName}
            </Text>
          </Pressable>

          {/* Specifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            <View style={styles.specsList}>
              {Object.entries(JSON.parse(product.specs) || {}).map(
                ([key, value]) => renderSpecification(key, value as string),
              )}
            </View>
          </View>

          {/* Detailed Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this item</Text>
            <Text style={styles.detailText}>{product.description}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Cart Controls */}
      <View style={styles.footer}>
        {!product.inStock ? (
          <Button
            preset="filled"
            text="Out of Stock"
            disabled={true}
            style={styles.addToCartButton}
          />
        ) : cartItem ? (
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={[
                styles.quantityButton,
                cartItem.quantity <= 1 && styles.quantityButtonDisabled,
              ]}
              onPress={() => handleUpdateQuantity(cartItem.quantity - 1)}
              disabled={cartItem.quantity <= 1}
            >
              <MaterialIcons
                name="remove"
                size={24}
                color={theme.colors.palette.neutral100}
              />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{cartItem.quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleUpdateQuantity(cartItem.quantity + 1)}
            >
              <MaterialIcons
                name="add"
                size={24}
                color={theme.colors.palette.neutral100}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <Button
            preset="filled"
            text="Add to Cart"
            onPress={handleAddToCart}
            style={styles.addToCartButton}
          />
        )}
      </View>

      {/* Reviews Section */}
      {product && <Reviews productId={product.id} />}
    </ScrollView>
  )
})
