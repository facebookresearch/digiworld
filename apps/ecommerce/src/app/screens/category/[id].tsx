// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useRef, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import { StyleSheet, FlatList, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Header } from '@/components'
import { useStores } from '@/models'
import { useAppTheme, type Theme, spacing } from '@andojo/shared-theme'
import { ProductCard } from '@/components/ProductCard'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Product } from '@/models/ProductStore'
import { useToast } from '@/components/Toast'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

export default observer(function CategoryProductsScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const {
    productStore,
    categoryStore: { getCategoryById },
    cartStore,
    userStore,
    uiStore,
  } = useStores()
  const { products } = productStore
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const lastRefreshRef = useRef(0)

  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('CategoryProducts', `/screens/category/${id}`)

  const category = getCategoryById(Number(id))
  const categoryProducts = products.filter(p => p.categoryId === Number(id))

  useEffect(() => {
    trackScreenMount({
      timestamp: Date.now(),
      categoryId: id,
      categoryName: category?.name,
      productCount: categoryProducts.length,
    })

    trackContentChange({
      categoryFound: !!category,
      productsLoaded: true,
      productCount: categoryProducts.length,
    })
  }, [id, category, categoryProducts.length])

  const handleProductPress = (product: any) => {
    trackClick('productSelected')
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

  // Refresh data when mockDataAppendTime changes (after dbrefresh)
  useEffect(() => {
    if (uiStore.mockDataAppendTime > lastRefreshRef.current) {
      lastRefreshRef.current = uiStore.mockDataAppendTime
      console.log('🔄 Refreshing category products after dbrefresh...')
      const categoryId = Number(id)
      if (categoryId) {
        productStore.loadProductsByCategory(categoryId).catch(err => {
          console.error('Error refreshing category products:', err)
        })
      }
    }
  }, [uiStore.mockDataAppendTime, id, productStore])

  return (
    <View style={styles.container}>
      <Header
        title={category?.name || 'Category'}
        leftIcon="back"
        onLeftPress={() => router.back()}
        safeAreaEdges={['top']}
      />
      <FlatList
        data={categoryProducts}
        numColumns={2}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={handleProductPress}
            handleAddToCart={handleAddToCart}
            handleWishlisting={handleWishlisting}
            style={styles.productCard}
          />
        )}
        contentContainerStyle={{
          padding: spacing.xs,
          paddingBottom: insets.bottom + spacing.xl * 3,
        }}
        columnWrapperStyle={{
          justifyContent: 'space-between',
          marginBottom: spacing.xxs,
        }}
      />
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    count: {
      fontSize: 14,
      color: theme.colors.textDim,
      marginTop: spacing.xs,
    },
    grid: {
      padding: spacing.xs,
      paddingBottom: 100,
    },
    productCard: {
      flex: 1,
      margin: spacing.xs,
    },
  })
