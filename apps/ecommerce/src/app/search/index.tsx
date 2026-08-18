import React, { useEffect, useState, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import { View, StyleSheet, FlatList, TextInput } from 'react-native'
import { Screen, Text, Header } from '@/components'
import { ProductCard } from '@/components/ProductCard'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useStores } from '@/models'
import { spacing, useAppTheme } from '@andojo/shared-theme'
import { MaterialIcons } from '@expo/vector-icons'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useToast } from '@/components/Toast'
import { Product } from '@/models/ProductStore'

interface SessionData {
  searchQuery?: string
  [key: string]: any
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 8,
      paddingHorizontal: spacing.md,
      marginHorizontal: spacing.md,
      marginVertical: spacing.md,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      fontSize: 16,
    },
    list: {
      padding: spacing.md,
    },
    productCard: {
      flex: 1,
      margin: spacing.xs,
    },
    emptyText: {
      textAlign: 'center',
      marginTop: spacing.lg,
      color: theme.colors.palette.neutral600,
    },
  })

export default observer(function SearchScreen() {
  const { sessionId, timeStamp } = useLocalSearchParams()
  const router = useRouter()
  const { productStore, userStore, sessionStore, cartStore } = useStores()
  const { theme } = useAppTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const toast = useToast()

  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('Search', '/search')

  const styles = useMemo(() => createStyles(theme), [theme])

  useEffect(() => {
    // First try to restore from session if sessionId exists
    if (sessionId) {
      const sessionData = sessionStore.getSession(sessionId as string)
      if (sessionData?.data) {
        const data = sessionData.data as SessionData
        console.log('Restoring search session:', data)
        trackContentChange(data)
        if (typeof data.searchQuery === 'string') {
          setSearchQuery(data.searchQuery)
        }
      }
    }

    trackScreenMount({
      isAuthenticated: userStore.isAuthenticated,
      resultsCount: searchResults.length,
      sessionId,
    })
  }, [sessionId, timeStamp])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    const results = productStore.products.filter(
      (p: Product) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase()),
    )
    setSearchResults(results)
    trackContentChange({
      searchQuery: query,
      resultsCount: results.length,
    })
  }

  const handleProductPress = (product: Product) => {
    trackClick('selectProduct')
    router.push(`/product/${product.id}`)
  }

  const handleAddToCart = (product: Product) => {
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

  const handleUpdateQuantity = (productId: number, quantity: number) => {
    trackClick('updateQuantity')
    if (!userStore.user?.id) return

    const cartItem = cartStore.items.find(
      (item: any) => item.productId === productId,
    )
    if (!cartItem) return

    if (quantity === 0) {
      cartStore.removeItem(cartItem.id, userStore.user.id)
      toast.show({
        title: 'Product removed from cart',
        preset: 'success',
        placement: 'top',
      })
      return
    }

    cartStore.updateItemQuantity(cartItem.id, quantity, userStore.user.id)
  }

  const handleWishlisting = (productId: number) => {
    trackClick('toggleWishlist')
    userStore.handleWishlisting(productId)
  }

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      onPress={handleProductPress}
      handleAddToCart={handleAddToCart}
      handleUpdateQuantity={handleUpdateQuantity}
      handleWishlisting={handleWishlisting}
      style={styles.productCard}
    />
  )
  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(app)/(drawer)/(tabs)/home')
    }
  }

  return (
    <Screen style={styles.container}>
      <Header title="Search" leftIcon="back" onLeftPress={handleBackPress} />
      <View style={styles.searchContainer}>
        <MaterialIcons
          name="search"
          size={24}
          color={theme.colors.palette.neutral600}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={handleSearch}
          autoFocus
        />
      </View>
      <FlatList
        data={searchResults}
        renderItem={renderProduct}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {searchQuery
              ? 'No products found'
              : 'Start typing to search products'}
          </Text>
        }
      />
    </Screen>
  )
})
