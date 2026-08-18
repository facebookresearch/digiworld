import React, { useCallback, useEffect, useRef, useMemo } from 'react'
import {
  View,
  StyleSheet,
  SectionList,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Screen, Text } from '@/components'
import { spacing, useAppTheme, Theme } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import PromotionCarousel from '@/components/PromotionCarousel'
import { ProductCard } from '@/components/ProductCard'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useToast } from '@/components/Toast'
import { Product } from '@/models/ProductStore'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useDrawerStatus } from '@react-navigation/drawer'
import { useNavigation } from '@react-navigation/native'

const SearchBar = observer(() => {
  const router = useRouter()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { trackClick } = useInteractionTracking(
    'HomeSearch',
    '/(app)/(drawer)/(tabs)/home',
  )

  const handleSearch = () => {
    trackClick('openSearch')
    router.push('/search')
  }

  return (
    <Pressable style={styles.searchContainer} onPress={handleSearch}>
      <Ionicons
        name="search"
        size={20}
        color={theme.colors.textDim}
        style={styles.searchIcon}
      />
      <Text style={styles.searchPlaceholder}>Search products</Text>
    </Pressable>
  )
})

const CategoriesList = observer(() => {
  const router = useRouter()
  const { categoryStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { trackClick } = useInteractionTracking(
    'HomeCategories',
    '/(app)/(drawer)/(tabs)/home',
  )

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoriesContainer}
    >
      <View style={styles.categoriesInnerContainer}>
        {categoryStore.mainCategories.map((category: any) => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryItem}
            onPress={() => {
              trackClick('selectCategory')
              router.push(`/screens/category/${category.id}`)
            }}
          >
            <MaterialIcons
              name={(category.icon as any) || 'category'}
              size={30}
              color={theme.colors.tint}
            />
            <Text style={styles.categoryText}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
})

export default observer(function HomeScreen() {
  const router = useRouter()
  const { sessionId, timeStamp } = useLocalSearchParams()
  const {
    productStore,
    categoryStore,
    userStore,
    cartStore,
    sessionStore,
    uiStore,
  } = useStores()
  const toast = useToast()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const isDrawerOpen = useDrawerStatus() === 'open'
  const lastRefreshRef = useRef(0)

  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('Home', '/(app)/(drawer)/(tabs)/home')

  useEffect(() => {
    // First try to restore from session if sessionId exists
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

    // Load products and categories with proper error handling
    const loadData = async () => {
      try {
        await Promise.all([
          categoryStore.loadCategories(),
          productStore.loadProducts(),
        ]).catch(err => {
          console.log('Error loading data:', err)
        })

        trackContentChange({
          productsLoaded: true,
          productCount: productStore.products.length,
          categoriesLoaded: true,
          categoryCount: categoryStore.categories.length,
          hasDiscountedProducts: productStore.products.some(
            p => p.discountedPrice < p.price,
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
      console.log('🔄 Refreshing home screen data after dbrefresh...')
      Promise.all([
        categoryStore.loadCategories(),
        productStore.loadProducts(),
      ]).catch(err => {
        console.error('Error refreshing data:', err)
      })
    }
  }, [uiStore.mockDataAppendTime, categoryStore, productStore])

  // Get products by category
  const getProductsByCategory = (categoryId: number, limit: number = 8) => {
    return productStore.products
      .filter(p => p.categoryId === categoryId)
      .slice(0, limit)
  }

  // Get products by discount percentage
  const getDiscountedProducts = (limit: number = 8) => {
    return productStore.products
      .filter((p: any) => p.discountedPrice < p.price)
      .sort((a: any, b: any) => {
        const discountA = (a.price - a.discountedPrice) / a.price
        const discountB = (b.price - b.discountedPrice) / b.price
        return discountB - discountA
      })
      .slice(0, limit)
  }

  // Create sections using category and discount data
  const sections = [
    {
      title: 'Best Deals',
      data: getDiscountedProducts(8),
    },
    ...categoryStore.categories
      .slice(0, 3) // Take first two categories
      .map(category => ({
        title: `Top ${category.name}`,
        data: getProductsByCategory(category.id, 8),
      }))
      .filter(section => section.data.length > 0),
  ]

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
        item => item.productId === productId,
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
    <Screen style={styles.container}>
      <View style={styles.header}>
        <SearchBar />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id.toString()}
        renderItem={({ index, section }) => {
          // Ensure items are grouped in rows of 2
          if (index % 2 !== 0) return null

          // Group the next 2 items in a row
          const rowItems = section.data.slice(index, index + 2)

          return (
            <View style={styles.gridRow}>
              {rowItems.map(product => (
                <ProductCard
                  key={product.id}
                  product={{
                    ...product,
                    imageUrl: product.imageUrl, // Map image to imageUrl
                  }}
                  onPress={handleProductPress}
                  handleAddToCart={handleAddToCart}
                  handleUpdateQuantity={handleUpdateQuantity}
                  handleWishlisting={handleWishlisting}
                />
              ))}
            </View>
          )
        }}
        ListHeaderComponent={() => (
          <React.Fragment>
            {/* <LocationBanner /> */}
            <CategoriesList />
            <PromotionCarousel />
          </React.Fragment>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionTitle}>{title}</Text>
        )}
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing.xl * 2,
        }}
      />
    </Screen>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: spacing.xl,
    },
    header: { marginBottom: spacing.xxs },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 8,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      marginHorizontal: spacing.sm,
      marginVertical: spacing.xs,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchIcon: {
      marginRight: spacing.xs,
    },
    searchPlaceholder: {
      flex: 1,
      color: theme.colors.textDim,
      fontSize: 16,
    },
    locationBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: theme.colors.background,
    },
    locationIcon: {
      marginRight: spacing.xs,
    },
    locationText: {
      fontSize: 14,
      color: theme.colors.text,
      flex: 1,
    },
    promoContainer: {
      paddingHorizontal: spacing.sm,
      marginVertical: spacing.xs,
    },
    categoriesContainer: {
      paddingHorizontal: spacing.sm,
    },
    categoriesInnerContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xxs,
    },
    categoryItem: {
      alignItems: 'center',
      marginHorizontal: spacing.sm,
    },
    categoryIcon: {
      fontSize: 40,
      lineHeight: 60,
    },
    categoryText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.sm,
      marginTop: spacing.md,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      color: theme.colors.text,
    },
    viewAllText: {
      fontSize: 14,
      color: theme.colors.tint,
      fontWeight: '600',
    },
    gridRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingRight: spacing.xxs,
      paddingLeft: spacing.xxs,
    },
    gridItem: {
      width: '48%', // Slightly less than 50% to account for spacing
    },
  })
