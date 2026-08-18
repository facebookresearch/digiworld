// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useEffect, useRef, useMemo } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { spacing, Text } from '@andojo/shared-theme'
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { ProductCard } from '@/components/ProductCard'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useToast } from '@/components/Toast'
import { Product } from '@/models/ProductStore'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useDrawerStatus } from '@react-navigation/drawer'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'react-native-linear-gradient'

const { width } = Dimensions.get('window')

const ModernHeader = observer(() => {
  const router = useRouter()
  const navigation = useNavigation()
  const { userStore, cartStore } = useStores()
  const { theme } = useAppTheme()
  const { trackClick } = useInteractionTracking(
    'HomeHeader',
    '/(app)/(drawer)/(tabs)/home',
  )

  const styles = useMemo(() => createStyles(theme), [theme])

  const openDrawer = () => {
    // @ts-ignore
    navigation.openDrawer()
  }

  const handleSearch = () => {
    trackClick('openSearch')
    router.push('/search')
  }

  return (
    <LinearGradient
      colors={[
        theme.colors.palette.primary500,
        theme.colors.palette.primary600,
      ]}
      style={styles.headerContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.headerTop}>
        <TouchableOpacity onPress={openDrawer} style={styles.avatarContainer}>
          <LinearGradient
            colors={[
              theme.colors.palette.primary500,
              theme.colors.palette.primary600,
            ]}
            style={styles.avatarGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons
              name="person"
              size={20}
              color={theme.colors.palette.neutral100}
            />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.greetingText}>
            Hello, {userStore.user?.firstName || 'Shopper'}!
          </Text>
          <Text style={styles.taglineText}>
            What are you looking for today?
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(app)/(drawer)/(tabs)/cart')}
          style={styles.cartButton}
        >
          <View style={styles.cartIconContainer}>
            <MaterialIcons
              name="shopping-bag"
              size={24}
              color={theme.colors.palette.neutral100}
            />
            {cartStore.totalItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartStore.totalItems}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <Pressable style={styles.modernSearchBar} onPress={handleSearch}>
        <View style={styles.searchContent}>
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.palette.neutral500}
          />
          <Text style={styles.searchText}>Search products, brands...</Text>
          <MaterialIcons
            name="tune"
            size={20}
            color={theme.colors.palette.neutral500}
          />
        </View>
      </Pressable>
    </LinearGradient>
  )
})

const QuickActions = observer(() => {
  const router = useRouter()
  const { theme } = useAppTheme()
  const { trackClick } = useInteractionTracking(
    'HomeQuickActions',
    '/(app)/(drawer)/(tabs)/home',
  )

  const styles = useMemo(() => createStyles(theme), [theme])

  const actions = [
    {
      id: 1,
      title: 'Categories',
      icon: 'grid-view',
      color: theme.colors.palette.primary500,
      route: '/(app)/(drawer)/(tabs)/categories',
    },
    {
      id: 2,
      title: 'Orders',
      icon: 'receipt-long',
      color: theme.colors.palette.warning500,
      route: '/screens/orders',
    },
  ]

  return (
    <View style={styles.quickActionsContainer}>
      {actions.map(action => (
        <TouchableOpacity
          key={action.id}
          style={styles.actionCard}
          onPress={() => {
            trackClick('quickAction')
            router.push(action.route as any)
          }}
        >
          <View
            style={[
              styles.actionIcon,
              { backgroundColor: `${action.color}15` },
            ]}
          >
            <MaterialIcons
              name={action.icon as any}
              size={24}
              color={action.color}
            />
          </View>
          <Text style={styles.actionTitle}>{action.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
})

const CategoryCarousel = observer(() => {
  const router = useRouter()
  const { categoryStore } = useStores()
  const { theme } = useAppTheme()
  const { trackClick } = useInteractionTracking(
    'HomeCategoryCarousel',
    '/(app)/(drawer)/(tabs)/home',
  )

  const styles = useMemo(() => createStyles(theme), [theme])

  // Extended categories with more variety
  const extendedCategories = [
    ...categoryStore.mainCategories,
    // Add more categories if we don't have enough
    { id: 'electronics', name: 'Electronics', icon: 'devices' },
    { id: 'fashion', name: 'Fashion', icon: 'checkroom' },
    { id: 'home', name: 'Home & Garden', icon: 'home' },
    { id: 'sports', name: 'Sports', icon: 'sports-soccer' },
    { id: 'books', name: 'Books', icon: 'menu-book' },
    { id: 'toys', name: 'Toys & Games', icon: 'toys' },
    { id: 'beauty', name: 'Beauty', icon: 'face' },
    { id: 'automotive', name: 'Automotive', icon: 'directions-car' },
    { id: 'health', name: 'Health', icon: 'health-and-safety' },
    { id: 'grocery', name: 'Grocery', icon: 'local-grocery-store' },
  ].slice(0, 12) // Take up to 12 categories

  return (
    <View style={styles.categorySection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Shop by Category</Text>
        <TouchableOpacity
          onPress={() => router.push('/(app)/(drawer)/(tabs)/categories')}
        >
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScrollContent}
        style={styles.categoryScroll}
      >
        {extendedCategories.map((category: any) => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryCard}
            onPress={() => {
              trackClick('selectCategory')
              router.push(`/screens/category/${category.id}`)
            }}
          >
            <LinearGradient
              colors={[
                theme.colors.palette.primary100,
                theme.colors.palette.primary200,
              ]}
              style={styles.categoryCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <View style={styles.categoryIconContainer}>
                <MaterialIcons
                  name={(category.icon as any) || 'category'}
                  size={32}
                  color={theme.colors.palette.primary600}
                />
              </View>
              <Text style={styles.categoryCardText} numberOfLines={2}>
                {category.name}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
})

const ProductSection = observer(
  ({
    title,
    products,
    onProductPress,
    onAddToCart,
    onUpdateQuantity,
    onWishlisting,
  }: any) => {
    const { theme } = useAppTheme()
    const styles = useMemo(() => createStyles(theme), [theme])

    return (
      <View style={styles.productSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>

        <FlatList
          data={products}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.productListContent}
          renderItem={({ item }) => (
            <View style={styles.horizontalProductCard}>
              <ProductCard
                product={item}
                onPress={onProductPress}
                handleAddToCart={onAddToCart}
                handleUpdateQuantity={onUpdateQuantity}
                handleWishlisting={onWishlisting}
              />
            </View>
          )}
        />
      </View>
    )
  },
)

export default observer(function HomeScreen() {
  const router = useRouter()
  const { sessionId, timeStamp } = useLocalSearchParams()
  const {
    productStore,
    categoryStore,
    userStore,
    cartStore,
    sessionStore,
    orderStore,
    uiStore,
  } = useStores()
  const toast = useToast()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const isDrawerOpen = useDrawerStatus() === 'open'
  const scrollY = useRef(new Animated.Value(0)).current
  const lastRefreshRef = useRef(0)
  const { theme } = useAppTheme()

  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('Home', '/(app)/(drawer)/(tabs)/home')

  const styles = useMemo(() => createStyles(theme), [theme])

  useEffect(() => {
    // Load data and handle session restoration
    if (sessionId) {
      const sessionData = sessionStore.getSession(sessionId as string)
      if (sessionData?.data) {
        const formData = sessionData.data.sessionData?.formData
        console.log('Restoring home screen session:', sessionData)
        // @ts-ignore
        if (!isDrawerOpen && formData?.isDrawerOpen) {
          // @ts-ignore
          navigation.openDrawer()
        }
        // @ts-ignore
        trackContentChange(formData)
      }
    }

    trackScreenMount({
      isAuthenticated: userStore.isAuthenticated,
      cartItemCount: cartStore.totalItems,
      sessionId,
      isDrawerOpen,
    })

    const loadData = async () => {
      try {
        await Promise.all([
          categoryStore.loadCategories(),
          productStore.loadProducts(),
          orderStore.loadOrders(),
        ]).catch(err => {
          console.log('Error loading data:', err)
        })

        trackContentChange({
          productsLoaded: true,
          productCount: productStore.products.length,
          categoriesLoaded: true,
          categoryCount: categoryStore.categories.length,
          hasDiscountedProducts: productStore.products.some(
            (p: Product) => p.discountedPrice < p.price,
          ),
        })
      } catch (error) {
        console.error('Failed to load data:', error)
        trackContentChange({
          productsLoaded: false,
          categoriesLoaded: false,
          error: String(error),
        })
        toast.show({
          title: 'Failed to load data',
          preset: 'error',
          placement: 'top',
        })
      }
    }

    loadData()
  }, [sessionId, timeStamp])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'Home',
        route: '/(app)/(drawer)/(tabs)/home',
        isAuthenticated: userStore.isAuthenticated,
        cartItemCount: cartStore.totalItems,
        sessionId,
        isDrawerOpen,
      })
    }, []),
  )

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
      console.log('🔄 Refreshing home screen data after dbrefresh...')
      Promise.all([
        categoryStore.loadCategories(),
        productStore.loadProducts(),
      ]).catch(err => {
        console.error('Error refreshing data:', err)
      })
    }
  }, [uiStore.mockDataAppendTime, categoryStore, productStore])

  const getDiscountedProducts = (limit: number = 6) => {
    return productStore.products
      .filter((p: Product) => p.discountedPrice < p.price)
      .slice()
      .sort((a: Product, b: Product) => {
        const discountA = (a.price - a.discountedPrice) / a.price
        const discountB = (b.price - b.discountedPrice) / b.price
        return discountB - discountA
      })
      .slice(0, limit)
  }

  const getTrendingProducts = (limit: number = 6) => {
    return productStore.products
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)
  }

  const getProductsByCategory = (categoryId: number, limit: number = 6) => {
    return productStore.products
      .filter((p: Product) => p.categoryId === categoryId)
      .slice(0, limit)
  }

  const getNewArrivals = (limit: number = 6) => {
    return productStore.products
      .slice()
      .sort((a: Product, b: Product) => b.id - a.id)
      .slice(0, limit)
  }

  const getBestSellers = (limit: number = 6) => {
    return productStore.products
      .slice()
      .sort((a: Product, b: Product) => {
        const aDiscount = a.price > a.discountedPrice ? 1 : 0
        const bDiscount = b.price > b.discountedPrice ? 1 : 0
        if (aDiscount !== bDiscount) return bDiscount - aDiscount
        return Math.random() - 0.5
      })
      .slice(0, limit)
  }

  const handleProductPress = (product: Product) => {
    trackClick('selectProduct')
    router.push(`/screens/product/${product.id}`)
  }

  const handleAddToCart = async (product: Product) => {
    trackClick('addToCart')
    if (!userStore.user?.id) {
      router.push('/login')
      return
    }

    try {
      await cartStore.addItem(userStore.user.id, product)
      trackContentChange({
        addToCartSuccess: true,
        productId: product.id,
      })
      toast.show({
        title: 'Product added successfully',
        preset: 'success',
        placement: 'top',
      })
    } catch (error) {
      trackContentChange({
        addToCartSuccess: false,
        productId: product.id,
        error: String(error),
      })
      console.error('Failed to add item to cart:', error)
      toast.show({
        title: 'Failed to add product',
        preset: 'error',
        placement: 'top',
      })
    }
  }

  const handleWishlisting = (productId: number) => {
    trackClick('toggleWishlist')
    userStore.handleWishlisting(productId)
  }

  const handleUpdateQuantity = useCallback(
    (productId: number, quantity: number) => {
      trackClick('updateQuantity')
      if (!userStore.user?.id) return

      const cartItem = cartStore.items.find(
        (item: any) => item.productId === productId,
      )
      if (!cartItem) return

      if (quantity === 0) {
        cartStore.removeItem(cartItem.id, userStore.user.id)
        trackContentChange({
          removeFromCartSuccess: true,
          productId,
        })
        toast.show({
          title: 'Product removed from cart',
          preset: 'success',
          placement: 'top',
        })
      } else {
        cartStore.updateItemQuantity(cartItem.id, quantity, userStore.user.id)
        trackContentChange({
          updateQuantitySuccess: true,
          productId,
          newQuantity: quantity,
        })
      }
    },
    [userStore.user?.id, cartStore, toast],
  )

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.primary100,
          theme.colors.palette.primary200,
          theme.colors.palette.primary300,
        ]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <ModernHeader />

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing.xl * 2,
        }}
      >
        <QuickActions />
        <CategoryCarousel />

        <ProductSection
          title="🔥 Hot Deals"
          products={getDiscountedProducts()}
          onProductPress={handleProductPress}
          onAddToCart={handleAddToCart}
          onUpdateQuantity={handleUpdateQuantity}
          onWishlisting={handleWishlisting}
        />

        <ProductSection
          title="⭐ Best Sellers"
          products={getBestSellers()}
          onProductPress={handleProductPress}
          onAddToCart={handleAddToCart}
          onUpdateQuantity={handleUpdateQuantity}
          onWishlisting={handleWishlisting}
        />

        <ProductSection
          title="🆕 New Arrivals"
          products={getNewArrivals()}
          onProductPress={handleProductPress}
          onAddToCart={handleAddToCart}
          onUpdateQuantity={handleUpdateQuantity}
          onWishlisting={handleWishlisting}
        />

        {categoryStore.categories.slice(0, 3).map((category: any) => {
          const categoryProducts = getProductsByCategory(category.id)
          if (categoryProducts.length === 0) return null

          return (
            <ProductSection
              key={category.id}
              title={`${category.name} Collection`}
              products={categoryProducts}
              onProductPress={handleProductPress}
              onAddToCart={handleAddToCart}
              onUpdateQuantity={handleUpdateQuantity}
              onWishlisting={handleWishlisting}
            />
          )
        })}

        <ProductSection
          title="📱 You Might Like"
          products={getTrendingProducts()}
          onProductPress={handleProductPress}
          onAddToCart={handleAddToCart}
          onUpdateQuantity={handleUpdateQuantity}
          onWishlisting={handleWishlisting}
        />
      </Animated.ScrollView>
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.palette.primary100,
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
    headerContainer: {
      paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 60,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    avatarContainer: {
      marginRight: spacing.md,
    },
    avatarGradient: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral100 + '4D',
    },
    headerCenter: {
      flex: 1,
    },
    greetingText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 2,
    },
    taglineText: {
      fontSize: 14,
      color: theme.colors.palette.neutral800,
      fontWeight: '500',
    },
    cartButton: {
      padding: spacing.xs,
    },
    cartIconContainer: {
      position: 'relative',
    },
    cartBadge: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: theme.colors.palette.accent500,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    cartBadgeText: {
      color: theme.colors.palette.neutral900,
      fontSize: 11,
      fontWeight: '700',
    },
    modernSearchBar: {
      backgroundColor: theme.colors.palette.neutral100 + 'E6',
      borderRadius: 16,
      borderColor: theme.colors.palette.neutral100 + '4D',
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    searchContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    searchText: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.palette.neutral500,
      fontWeight: '500',
    },

    // Quick Actions
    quickActionsContainer: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    actionCard: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100 + 'E6',
      borderRadius: 16,
      paddingVertical: spacing.md,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral100 + '33',
    },
    actionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    actionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.neutral700,
      textAlign: 'center',
    },

    // Banner Section
    bannerSection: {
      paddingVertical: spacing.md,
    },
    bannerCard: {
      width: width - spacing.md * 2,
      marginHorizontal: spacing.md,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    bannerGradient: {
      padding: spacing.lg,
      minHeight: 140,
      justifyContent: 'center',
    },
    bannerContent: {
      alignItems: 'flex-start',
    },
    bannerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    bannerSubtitle: {
      fontSize: 16,
      color: theme.colors.palette.neutral800,
      marginBottom: spacing.md,
      fontWeight: '500',
    },
    bannerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100 + '33',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 20,
      gap: spacing.xs,
    },
    bannerButtonText: {
      color: theme.colors.palette.neutral900,
      fontSize: 14,
      fontWeight: '600',
    },

    // Category Carousel
    categorySection: {
      paddingVertical: spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral800,
    },
    seeAllText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
    },
    categoryScroll: {
      paddingLeft: spacing.md,
    },
    categoryScrollContent: {
      paddingRight: spacing.md,
      gap: spacing.sm,
    },
    categoryCard: {
      width: 100,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    categoryCardGradient: {
      padding: spacing.md,
      alignItems: 'center',
      minHeight: 100,
      justifyContent: 'center',
    },
    categoryIconContainer: {
      marginBottom: spacing.xs,
    },
    categoryCardText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
      textAlign: 'center',
      lineHeight: 16,
    },

    productSection: {
      paddingVertical: spacing.md,
    },
    productListContent: {
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    horizontalProductCard: {
      width: 180,
    },
  })
