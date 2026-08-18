// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native'
import { Text } from '@/components'
import { useStores } from '@/models'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { ProductCard } from '@/components/ProductCard'
import { Product } from '@/models/ProductStore'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import LinearGradient from 'react-native-linear-gradient'
const { width } = Dimensions.get('window')

type SortOption = 'price_asc' | 'price_desc' | 'newest' | 'popular'

interface FilterState {
  categoryId?: number
  sortBy: SortOption
  minPrice?: number
  maxPrice?: number
}

const SEARCH_DEBOUNCE_MS = 300
const MIN_SEARCH_CHARS = 3

export default observer(function SearchScreen() {
  const router = useRouter()
  const { sessionId, timeStamp } = useLocalSearchParams()
  const { productStore, cartStore, userStore, sessionStore, uiStore } =
    useStores()
  const lastRefreshRef = useRef(0)
  const latestFiltersRef = useRef<FilterState>({ sortBy: 'popular' })
  const latestQueryRef = useRef('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestApplyRef = useRef<((f: FilterState, q: string) => void) | null>(
    null,
  )
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching] = useState(false)
  const [isFilteringData, setIsFilteringData] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    sortBy: 'popular',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(
    Array.from(productStore.products),
  )
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [, setIsSessionLoaded] = useState(false)

  const { trackScreenMount, trackTextChange, trackClick, trackContentChange } =
    useInteractionTracking('Search', '/search')

  // Memoize handlers first - move these up before they're used
  const handleAddToCart = useCallback(
    async (product: Product) => {
      if (!userStore.user?.id) {
        router.push('/login')
        return
      }
      try {
        await cartStore.addItem(userStore.user.id, product, 1)
      } catch (error) {
        console.error('Failed to add to cart:', error)
      }
    },
    [userStore.user?.id, cartStore, router],
  )

  const handleUpdateQuantity = useCallback(
    (productId: number, quantity: number) => {
      if (!userStore.user?.id) return

      const cartItem = cartStore.items.find(
        (item: any) => item.productId === productId,
      )
      if (!cartItem) return

      if (quantity === 0) {
        cartStore.removeItem(cartItem.id, userStore.user.id)
      } else {
        cartStore.updateItemQuantity(cartItem.id, quantity, userStore.user.id)
      }
    },
    [userStore.user?.id, cartStore],
  )

  // Memoize render functions
  // const renderItem = useCallback(
  //   ({ item }: { item: Product }) => (
  //     <ProductCard
  //       product={item}
  //       onPress={product => router.push(`/screens/product/${product.id}`)}
  //       handleAddToCart={handleAddToCart}
  //       handleUpdateQuantity={handleUpdateQuantity}
  //       style={styles.productCard}
  //     />
  //   ),
  //   [handleAddToCart, handleUpdateQuantity, router],
  // )

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <MaterialIcons
          name="search-off"
          size={64}
          color={theme.colors.palette.neutral400}
        />
        <Text style={styles.emptyText}>No products found</Text>
      </View>
    ),
    [],
  )

  const keyExtractor = useCallback((item: Product) => item.id.toString(), [])

  // Separate function to handle data filtering and sorting
  const applyFiltersAndSort = useCallback(
    async (currentFilters: FilterState, query: string) => {
      setIsFilteringData(true)

      // Use setTimeout to allow UI to update before heavy computation
      setTimeout(() => {
        try {
          let results: Product[] = Array.from(productStore.products)

          // Apply search query
          if (query) {
            results = results.filter(
              (product: Product) =>
                product.name.toLowerCase().includes(query.toLowerCase()) ||
                product.description.toLowerCase().includes(query.toLowerCase()),
            )
          }

          // Apply category filter
          if (currentFilters.categoryId) {
            results = results.filter(
              (product: Product) =>
                product.categoryId === currentFilters.categoryId,
            )
          }

          // Apply price filters
          if (currentFilters.minPrice !== undefined) {
            results = results.filter(
              (product: Product) =>
                product.discountedPrice >= currentFilters.minPrice!,
            )
          }
          if (currentFilters.maxPrice !== undefined) {
            results = results.filter(
              (product: Product) =>
                product.discountedPrice <= currentFilters.maxPrice!,
            )
          }

          // Apply sorting
          switch (currentFilters.sortBy) {
            case 'price_asc':
              results.sort(
                (a: Product, b: Product) =>
                  a.discountedPrice - b.discountedPrice,
              )
              break
            case 'price_desc':
              results.sort(
                (a: Product, b: Product) =>
                  b.discountedPrice - a.discountedPrice,
              )
              break
            case 'newest':
              results.sort(
                (a: Product, b: Product) =>
                  ((b as any).createdAt || 0) - ((a as any).createdAt || 0),
              )
              break
            case 'popular':
            default:
              results.sort(
                (a: Product, b: Product) =>
                  ((b as any).rating || 0) - ((a as any).rating || 0),
              )
          }

          setFilteredProducts(results)
        } finally {
          setIsFilteringData(false)
        }
      }, 0)
    },
    [productStore.products],
  )

  // Effect for session restoration
  useEffect(() => {
    trackScreenMount({
      timestamp: Date.now(),
      initialProductCount: productStore.products.length,
    })

    if (sessionId) {
      const session = sessionStore.getSession(sessionId as string)
      if (session?.data) {
        const sessionData = session.data as any
        console.log(
          'Search session data:',
          JSON.stringify(sessionData, null, 2),
        )
        const formData = sessionData.sessionData?.formData
        if (sessionData.sessionData) {
          // Restore both search query and filters
          if (formData?.searchQuery !== undefined) {
            setSearchQuery(formData.searchQuery)
            setDebouncedSearchQuery(formData.searchQuery)
          }

          if (formData?.filters) {
            setFilters(formData.filters)
          }

          if (formData?.showFilters !== undefined) {
            setShowFilters(formData.showFilters)
          }

          trackContentChange({
            restoredFromSession: true,
            searchQuery: formData?.searchQuery,
            filters: formData?.filters,
            showFilters: formData?.showFilters,
          })
        }
        setIsSessionLoaded(true)
      }
    }
  }, [sessionId, timeStamp])

  // Handle search query changes
  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text)
      trackTextChange('searchQuery', text)
      trackContentChange({
        searchQuery: text,
        filters, // Track both elements
        showFilters,
      })
    },
    [filters, showFilters],
  )

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newSortBy: SortOption) => {
      const newFilters = { ...filters, sortBy: newSortBy }
      setFilters(newFilters)
      trackClick(`filter_${newSortBy}`)
      trackContentChange({
        searchQuery, // Track both elements
        filters: newFilters,
        showFilters,
      })
    },
    [searchQuery, filters, showFilters],
  )

  // Handle filter visibility toggle
  const handleToggleFilters = useCallback(() => {
    const newShowFilters = !showFilters
    setShowFilters(newShowFilters)
    trackClick(newShowFilters ? 'showFilters' : 'hideFilters')
    trackContentChange({
      searchQuery,
      filters,
      showFilters: newShowFilters,
    })
  }, [searchQuery, filters, showFilters])

  const handleWishlisting = (productId: number) => {
    trackClick('toggleWishlist')
    userStore.handleWishlisting(productId)
  }

  // Effect for search debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length === 0 || searchQuery.length >= MIN_SEARCH_CHARS) {
        setDebouncedSearchQuery(searchQuery)
        // Track when the debounced search actually updates
        trackContentChange({
          debouncedSearchQuery: searchQuery,
          filters,
          showFilters,
          meetsMinChars: searchQuery.length >= MIN_SEARCH_CHARS,
        })
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Effect for applying filters and search
  useEffect(() => {
    applyFiltersAndSort(filters, debouncedSearchQuery)
  }, [filters, debouncedSearchQuery])

  // Keep refs in sync with latest values so focus/refresh effects always use fresh data
  useEffect(() => {
    latestFiltersRef.current = filters
  }, [filters])
  useEffect(() => {
    latestQueryRef.current = debouncedSearchQuery
  }, [debouncedSearchQuery])
  useEffect(() => {
    latestApplyRef.current = applyFiltersAndSort
  }, [applyFiltersAndSort])

  // Refresh data when mockDataAppendTime changes (after dbrefresh)
  useEffect(() => {
    if (uiStore.mockDataAppendTime > lastRefreshRef.current) {
      lastRefreshRef.current = uiStore.mockDataAppendTime
      console.log('🔄 Refreshing search screen data after dbrefresh...')
      productStore
        .loadProducts()
        .then(() =>
          latestApplyRef.current?.(
            latestFiltersRef.current,
            latestQueryRef.current,
          ),
        )
        .catch((err: any) => {
          console.error('Error refreshing products:', err)
        })
    }
  }, [uiStore.mockDataAppendTime, productStore])

  // Reload products whenever search screen comes into focus so injected mockdata is visible
  useFocusEffect(
    useCallback(() => {
      productStore
        .loadProducts()
        .then(() =>
          latestApplyRef.current?.(
            latestFiltersRef.current,
            latestQueryRef.current,
          ),
        )
        .catch((err: any) =>
          console.error('Error loading products on focus:', err),
        )
    }, [productStore]),
  )

  const renderFilterButton = (label: string, value: SortOption) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filters.sortBy === value && styles.filterButtonActive,
      ]}
      onPress={() => handleFilterChange(value)}
    >
      {filters.sortBy === value ? (
        <LinearGradient
          colors={[
            theme.colors.palette.primary500,
            theme.colors.palette.primary600,
          ]}
          style={styles.filterButtonGradient}
        >
          <Text style={styles.filterButtonTextActive}>{label}</Text>
        </LinearGradient>
      ) : (
        <Text style={styles.filterButtonText}>{label}</Text>
      )}
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.primary500,
          theme.colors.palette.primary600,
        ]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <MaterialIcons
                name="search"
                size={20}
                color={theme.colors.palette.neutral600}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for products..."
                placeholderTextColor={theme.colors.textDim}
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearchChange('')}>
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={theme.colors.palette.neutral600}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={handleToggleFilters}
            style={styles.filterToggleButton}
          >
            <MaterialIcons
              name="tune"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
        </View>

        {searchQuery.length > 0 && searchQuery.length < MIN_SEARCH_CHARS && (
          <Text style={styles.searchHint}>
            Please enter at least {MIN_SEARCH_CHARS} characters to search
          </Text>
        )}
      </LinearGradient>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <LinearGradient
            colors={[
              theme.colors.palette.secondary100,
              theme.colors.palette.secondary200,
            ]}
            style={styles.filtersGradient}
          >
            <Text style={styles.filtersTitle}>Sort & Filter</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterScrollContent}
            >
              {renderFilterButton('🔥 Popular', 'popular')}
              {renderFilterButton('💰 Low Price', 'price_asc')}
              {renderFilterButton('💎 High Price', 'price_desc')}
              {renderFilterButton('✨ Newest', 'newest')}
            </ScrollView>
          </LinearGradient>
        </View>
      )}

      {isSearching || isFilteringData ? (
        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={[
              theme.colors.palette.primary100,
              theme.colors.palette.primary200,
            ]}
            style={styles.loadingGradient}
          >
            <ActivityIndicator
              size="large"
              color={theme.colors.palette.primary500}
            />
            <Text style={styles.loadingText}>
              {isSearching ? 'Searching...' : 'Updating results...'}
            </Text>
          </LinearGradient>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={({ item }) => (
            <View style={styles.productCardWrapper}>
              <ProductCard
                product={item}
                onPress={product =>
                  router.push(`/screens/product/${product.id}`)
                }
                handleAddToCart={handleAddToCart}
                handleUpdateQuantity={handleUpdateQuantity}
                handleWishlisting={handleWishlisting}
                style={styles.productCard}
              />
            </View>
          )}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productList}
          keyExtractor={keyExtractor}
          ListEmptyComponent={ListEmptyComponent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          showsVerticalScrollIndicator={false}
          style={styles.productFlatList}
        />
      )}
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    headerGradient: {
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.md,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    backButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 20,
      padding: spacing.xs,
    },
    searchContainer: {
      flex: 1,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 25,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    searchInput: {
      flex: 1,
      marginLeft: spacing.xs,
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: '500',
    },
    filterToggleButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 20,
      padding: spacing.xs,
    },
    searchHint: {
      fontSize: 12,
      color: theme.colors.palette.neutral100,
      marginTop: spacing.xs,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    filtersContainer: {
      marginBottom: spacing.xs,
    },
    filtersGradient: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    filtersTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: spacing.sm,
    },
    filterScroll: {},
    filterScrollContent: {
      paddingRight: spacing.sm,
    },
    filterButton: {
      marginRight: spacing.sm,
      borderRadius: 25,
      overflow: 'hidden',
    },
    filterButtonActive: {
      // Handled by gradient
    },
    filterButtonGradient: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 25,
    },
    filterButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textDim,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 25,
      overflow: 'hidden',
    },
    filterButtonTextActive: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    productFlatList: {
      backgroundColor: theme.colors.background,
    },
    productList: {
      padding: spacing.sm,
    },
    productRow: {
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    productCardWrapper: {
      width: (width - spacing.sm * 3) / 2,
    },
    productCard: {
      // Styles handled by wrapper
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      margin: spacing.xl,
    },
    loadingGradient: {
      padding: spacing.xl,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: spacing.xl,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textDim,
      marginTop: spacing.sm,
      fontWeight: '500',
    },
    loadingText: {
      marginTop: spacing.sm,
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: '600',
    },
  })
