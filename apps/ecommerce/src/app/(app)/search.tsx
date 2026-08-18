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
} from 'react-native'
import { Screen, Text, Header } from '@/components'
import { useStores } from '@/models'
import { spacing, useAppTheme } from '@andojo/shared-theme'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { ProductCard } from '@/components/ProductCard'
import { Product } from '@/models/ProductStore'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

type SortOption = 'price_asc' | 'price_desc' | 'newest' | 'popular'

interface FilterState {
  categoryId?: number
  sortBy: SortOption
  minPrice?: number
  maxPrice?: number
}

const SEARCH_DEBOUNCE_MS = 300
const MIN_SEARCH_CHARS = 3

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    searchContainer: {
      padding: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 8,
      paddingHorizontal: spacing.sm,
    },
    searchInput: {
      flex: 1,
      height: 40,
      marginLeft: spacing.xs,
      fontSize: 16,
      color: theme.colors.palette.neutral800,
    },
    filtersContainer: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    filterScroll: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    filterButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 16,
      backgroundColor: theme.colors.palette.neutral200,
      marginRight: spacing.xs,
    },
    filterButtonActive: {
      backgroundColor: theme.colors.palette.primary500,
    },
    filterButtonText: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },
    filterButtonTextActive: {
      color: theme.colors.palette.neutral100,
    },
    productList: {
      padding: spacing.sm,
    },
    productRow: {
      justifyContent: 'space-between',
    },
    productCard: {
      marginBottom: spacing.sm,
      width: '48%',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: spacing.xl,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      marginTop: spacing.sm,
    },
    loadingText: {
      marginTop: spacing.sm,
      fontSize: 16,
      color: theme.colors.palette.neutral600,
    },
    searchHint: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
      marginTop: spacing.xs,
      marginLeft: spacing.sm,
    },
  })

export default observer(function SearchScreen() {
  const router = useRouter()
  const { sessionId, timeStamp } = useLocalSearchParams()
  const { productStore, cartStore, userStore, sessionStore, uiStore } =
    useStores()
  const { theme } = useAppTheme()
  const lastRefreshRef = useRef(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching] = useState(false)
  const [isFilteringData, setIsFilteringData] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    sortBy: 'popular',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [filteredProducts, setFilteredProducts] = useState(
    Array.from(productStore.products),
  )
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [, setIsSessionLoaded] = useState(false)

  const { trackScreenMount, trackTextChange, trackClick, trackContentChange } =
    useInteractionTracking('Search', '/search')

  const styles = useMemo(() => createStyles(theme), [theme])

  // Memoize handlers first - move these up before they're used
  const handleAddToCart = useCallback(
    async (product: any) => {
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
        item => item.productId === productId,
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
  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        product={item}
        onPress={product => router.push(`/screens/product/${product.id}`)}
        handleAddToCart={handleAddToCart}
        handleUpdateQuantity={handleUpdateQuantity}
        style={styles.productCard}
      />
    ),
    [handleAddToCart, handleUpdateQuantity, router, styles.productCard],
  )

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
    [styles.emptyContainer, styles.emptyText, theme.colors.palette.neutral400],
  )

  const keyExtractor = useCallback((item: Product) => item.id.toString(), [])

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 280,
      offset: 280 * Math.floor(index / 2),
      index,
    }),
    [],
  )

  // Refresh data when mockDataAppendTime changes (after dbrefresh)
  useEffect(() => {
    if (uiStore.mockDataAppendTime > lastRefreshRef.current) {
      lastRefreshRef.current = uiStore.mockDataAppendTime
      console.log('🔄 Refreshing search screen data after dbrefresh...')
      productStore.loadProducts().catch(err => {
        console.error('Error refreshing products:', err)
      })
    }
  }, [uiStore.mockDataAppendTime, productStore])

  // Separate function to handle data filtering and sorting
  const applyFiltersAndSort = useCallback(
    async (currentFilters: FilterState, query: string) => {
      setIsFilteringData(true)

      // Use setTimeout to allow UI to update before heavy computation
      setTimeout(() => {
        try {
          let results = Array.from(productStore.products)

          // Apply search query
          if (query) {
            results = results.filter(
              product =>
                product.name.toLowerCase().includes(query.toLowerCase()) ||
                product.description.toLowerCase().includes(query.toLowerCase()),
            )
          }

          // Apply category filter
          if (currentFilters.categoryId) {
            results = results.filter(
              product => product.categoryId === currentFilters.categoryId,
            )
          }

          // Apply price filters
          if (currentFilters.minPrice !== undefined) {
            results = results.filter(
              product => product.discountedPrice >= currentFilters.minPrice!,
            )
          }
          if (currentFilters.maxPrice !== undefined) {
            results = results.filter(
              product => product.discountedPrice <= currentFilters.maxPrice!,
            )
          }

          // Apply sorting
          switch (currentFilters.sortBy) {
            case 'price_asc':
              results.sort((a, b) => a.discountedPrice - b.discountedPrice)
              break
            case 'price_desc':
              results.sort((a, b) => b.discountedPrice - a.discountedPrice)
              break
            case 'newest':
              results.sort((a, b) => b.createdAt - a.createdAt)
              break
            case 'popular':
            default:
              results.sort((a, b) => (b.rating || 0) - (a.rating || 0))
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

  const renderFilterButton = (label: string, value: SortOption) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filters.sortBy === value && styles.filterButtonActive,
      ]}
      onPress={() => handleFilterChange(value)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filters.sortBy === value && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )

  return (
    <Screen style={styles.container} preset="fixed">
      <Header
        title="Search"
        leftIcon="back"
        onLeftPress={() => router.back()}
        RightActionComponent={
          <TouchableOpacity
            onPress={handleToggleFilters}
            style={{ marginRight: spacing.sm }}
          >
            <MaterialIcons
              name="filter-list"
              size={24}
              color={
                showFilters
                  ? theme.colors.palette.primary500
                  : theme.colors.palette.neutral800
              }
            />
          </TouchableOpacity>
        }
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons
            name="search"
            size={24}
            color={theme.colors.palette.neutral600}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search products (min. ${MIN_SEARCH_CHARS} characters)...`}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <MaterialIcons
                name="close"
                size={24}
                color={theme.colors.palette.neutral600}
              />
            </TouchableOpacity>
          )}
        </View>
        {searchQuery.length > 0 && searchQuery.length < MIN_SEARCH_CHARS && (
          <Text style={styles.searchHint}>
            Please enter at least {MIN_SEARCH_CHARS} characters to search
          </Text>
        )}
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {renderFilterButton('Popular', 'popular')}
            {renderFilterButton('Price: Low to High', 'price_asc')}
            {renderFilterButton('Price: High to Low', 'price_desc')}
            {renderFilterButton('Newest', 'newest')}
          </ScrollView>
        </View>
      )}

      {isSearching || isFilteringData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.primary500}
          />
          <Text style={styles.loadingText}>
            {isSearching ? 'Searching...' : 'Updating results...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productList}
          keyExtractor={keyExtractor}
          ListEmptyComponent={ListEmptyComponent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          getItemLayout={getItemLayout}
        />
      )}
    </Screen>
  )
})
