import { AnimatedPlaceholder } from '@/components/AnimatedPlaceholder'
import { queries } from '@/db/queries'
import { useStores } from '@/models/helpers/useStores'
import { colors } from '@/theme'
import {
  getCachedAssetImageSource,
  useEatsAssetsVersion,
} from '@/utils/assetImageRefresh'
import { EntityType } from '@andojo/shared-asset-management/src/types/enums'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Screen, Text } from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

const fallbackImage = require('../../../assets/images/pizza.png')

type SearchResult = {
  type: 'category' | 'restaurant' | 'menu'
  id: number
  name: string
  description?: string
  restaurantId?: number
  restaurantName?: string
  image?: any
}

// Add type for form data
interface SearchFormData {
  [key: string]: unknown
  searchQuery?: string
  loading?: boolean
  resultsCount?: number
  userId?: number
  lastUpdated?: number
  screenName?: string
  route?: string
  action?: string
  timestamp?: number
}

export default function SearchScreen() {
  const router = useRouter()
  const { sessionTimeStamp } = useLocalSearchParams()
  console.log('sessionTimeStamp', sessionTimeStamp)
  const { userStore, sessionStore } = useStores()
  const { trackScreenMount, trackContentChange } = useInteractionTracking(
    'SearchScreen',
    '/screens/search',
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const assetVersion = useEatsAssetsVersion()
  const inputRef = useRef<TextInput>(null)

  // Load search state from session
  useEffect(() => {
    if (!sessionTimeStamp) {
      return
    }

    const session = sessionStore.getSession()
    if (!session?.data?.sessionData?.formData) {
      return
    }

    const formData = session.data.sessionData.formData as SearchFormData

    // Restore states based on the session data
    if (formData.searchQuery !== undefined) {
      setSearchQuery(formData.searchQuery)
      // If there was a search query, trigger the search
      if (formData.searchQuery.trim().length >= 2) {
        performSearch(formData.searchQuery)
      }
    }
    if (formData.loading !== undefined) {
      setLoading(formData.loading)
    }
  }, [sessionTimeStamp])

  // Track screen mount
  useEffect(() => {
    trackScreenMount({
      loading,
      searchQuery,
      resultsCount: results.length,
      timestamp: Date.now(),
      platform: Platform.OS,
      screenDimensions: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
      },
      userId: userStore.currentUser?.id,
    })
  }, [])

  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setResults([])
        trackContentChange({
          action: 'search_cleared',
          searchQuery: '',
          timestamp: Date.now(),
          userId: userStore.currentUser?.id,
        })
        return
      }

      setLoading(true)
      trackContentChange({
        action: 'search_started',
        searchQuery: query,
        timestamp: Date.now(),
        userId: userStore.currentUser?.id,
      })

      try {
        const searchResults: SearchResult[] = []

        // Search categories
        const categories = await queries.searchCategories(query)
        for (const cat of categories) {
          const restaurants = await queries.getRestaurantsByCategory(cat.id)
          if (restaurants.length > 0) {
            searchResults.push({
              type: 'category',
              id: cat.id,
              name: cat.name,
              description: `${restaurants.length} restaurants`,
            })
          }
        }

        // Search restaurants
        const restaurants = await queries.searchRestaurants(query)
        for (const rest of restaurants) {
          const img = await getImageSource(
            EntityType.RESTAURANTS,
            rest.id,
            fallbackImage,
            assetVersion,
          )
          searchResults.push({
            type: 'restaurant',
            id: rest.id,
            name: rest.name,
            description: rest.description,
            image: img,
          })
        }

        // Search menu items
        const menuItems = await queries.searchMenuItems(query)
        for (const item of menuItems) {
          const restaurant = await queries.getRestaurantById(item.restaurantId)
          const img = await getImageSource(
            EntityType.MENU,
            item.id,
            fallbackImage,
            assetVersion,
          )
          searchResults.push({
            type: 'menu',
            id: item.id,
            name: item.name,
            description: item.description,
            restaurantId: item.restaurantId,
            restaurantName: restaurant?.name,
            image: img,
          })
        }

        setResults(searchResults)
        trackContentChange({
          action: 'search_completed',
          searchQuery: query,
          timestamp: Date.now(),
          userId: userStore.currentUser?.id,
        })
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    [assetVersion],
  )

  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery.trim())
      } else {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [searchQuery, performSearch])

  const getImageSource = async (
    entityType: EntityType,
    entityId: string | number,
    fallback: any,
    version = 0,
  ) => {
    try {
      return getCachedAssetImageSource(entityType, entityId, fallback, version)
    } catch (error) {
      console.error('Error getting image source:', error)
    }
    return fallback
  }

  const handleResultPress = (result: SearchResult) => {
    trackContentChange({
      action: 'result_selected',
      resultType: result.type,
      resultId: result.id,
      resultName: result.name,
      timestamp: Date.now(),
      userId: userStore.currentUser?.id,
    })

    switch (result.type) {
      case 'category':
        router.push({
          pathname: '/screens/category/[id]',
          params: { id: result.id },
        })
        break
      case 'restaurant':
        router.push(`/screens/restaurant/${result.id}`)
        break
      case 'menu':
        router.push(`/screens/food/${result.id}`)
        break
    }
  }

  const renderResultItem = ({ item }: { item: SearchResult }) => {
    if (!item || !item.id) return null

    const getIcon = () => {
      switch (item.type) {
        case 'category':
          return 'restaurant-outline'
        case 'restaurant':
          return 'storefront-outline'
        case 'menu':
          return 'fast-food-outline'
        default:
          return 'help-outline'
      }
    }

    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleResultPress(item)}
      >
        {item.image ? (
          <Image source={item.image} style={styles.resultImage} />
        ) : (
          <View style={styles.iconContainer}>
            <Ionicons
              name={getIcon()}
              size={24}
              color={colors.palette.primary500}
            />
          </View>
        )}
        <View style={styles.resultContent}>
          <Text style={styles.resultName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.resultDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
          {item.type === 'menu' && item.restaurantName && (
            <Text style={styles.restaurantName}>{item.restaurantName}</Text>
          )}
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.palette.neutral400}
        />
      </TouchableOpacity>
    )
  }

  return (
    <Screen preset="fixed" safeAreaEdges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            trackContentChange({
              action: 'back_pressed',
              timestamp: Date.now(),
              userId: userStore.currentUser?.id,
            })
            router.back()
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          {!searchQuery && (
            <AnimatedPlaceholder
              onFocus={() => {
                inputRef.current?.focus()
                setIsFocused(true)
                trackContentChange({
                  action: 'search_focused',
                  timestamp: Date.now(),
                  userId: userStore.currentUser?.id,
                })
              }}
              style={styles.placeholderText}
              containerStyle={styles.placeholderContainer}
            />
          )}
          <TextInput
            ref={inputRef}
            style={[
              styles.searchInput,
              !searchQuery && !isFocused && styles.searchInputWithPlaceholder,
            ]}
            value={searchQuery}
            onChangeText={text => {
              setSearchQuery(text)
              trackContentChange({
                action: 'search_input_changed',
                searchQuery: text,
                timestamp: Date.now(),
                userId: userStore.currentUser?.id,
              })
            }}
            autoFocus
            returnKeyType="search"
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false)
              trackContentChange({
                action: 'search_blurred',
                timestamp: Date.now(),
                userId: userStore.currentUser?.id,
              })
            }}
          />
        </View>
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSearchQuery('')
              trackContentChange({
                action: 'search_cleared',
                timestamp: Date.now(),
                userId: userStore.currentUser?.id,
              })
            }}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={colors.palette.neutral400}
            />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.palette.primary500} />
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderResultItem}
          keyExtractor={item => `${item.type}-${item.id}`}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={
            searchQuery.length > 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {loading ? 'Searching...' : 'No results found'}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    marginRight: 12,
  },
  searchInputContainer: {
    flex: 1,
    position: 'relative',
    height: 40,
    justifyContent: 'center',
  },
  searchInput: {
    height: 40,
    fontSize: 16,
    color: colors.text,
    padding: 0,
    backgroundColor: 'transparent',
  },
  searchInputWithPlaceholder: {
    color: 'transparent', // Make text transparent when placeholder is shown
  },
  clearButton: {
    padding: 4,
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: colors.palette.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
    marginRight: 8,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  resultDescription: {
    fontSize: 14,
    color: colors.palette.neutral600,
    marginBottom: 2,
  },
  restaurantName: {
    fontSize: 13,
    color: colors.palette.primary500,
    fontWeight: '500',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.palette.neutral600,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.palette.neutral400,
    backgroundColor: 'transparent',
  },
})
