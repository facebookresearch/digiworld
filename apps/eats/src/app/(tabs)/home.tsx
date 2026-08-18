// Copyright (c) Meta Platforms, Inc. and affiliates.
import { queries } from '@/db/queries'
import { useStores } from '@/models/helpers/useStores'
import { shared } from '@/styles'
import {
  getCachedAssetImageSource,
  useEatsAssetsVersion,
} from '@/utils/assetImageRefresh'
import { colors } from '@/theme'
import icons from '@andojo/shared-asset-management/src/icons'
import { EntityType } from '@andojo/shared-asset-management/src/types/enums'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Screen, useTheme } from '@andojo/shared-theme'
import { metrics } from '@andojo/shared-theme/src/themes/metrics'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { FlashList } from '@shopify/flash-list'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Text as RNText,
} from 'react-native'

const fallbackImage = require('../../../assets/images/pizza.png')

// Helper to get category card colors from theme
const getCategoryCardColors = (palette: any) => [
  palette.primary100,
  palette.secondary100,
  palette.accent100,
  palette.neutral300,
  palette.success100,
]

function AnimatedPlaceholder() {
  const fadeAnim = useRef(new Animated.Value(1)).current
  const [currentIndex, setCurrentIndex] = useState(0)
  const { theme } = useTheme()

  const placeholders = [
    'Search for a restaurant...',
    'Search for a category...',
    'Search for a menu item...',
    'Search for a cuisine...',
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.ease,
      }).start(() => {
        // Change text
        setCurrentIndex(prev => (prev + 1) % placeholders.length)
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.ease,
        }).start()
      })
    }, 2000) // Change every 3 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <Animated.Text
      style={[
        styles.searchInput,
        {
          opacity: fadeAnim,
          color: theme.colors.textDim,
        },
      ]}
    >
      {placeholders[currentIndex]}
    </Animated.Text>
  )
}

function formatAddress(item: any) {
  let line = (item.addressLine1 ?? '') || ''
  if (item.addressLine2) line += `, ${item.addressLine2 ?? ''}`
  if (item.city || item.state || item.postalCode) {
    line += `, ${item.city ?? ''}${item.city && item.state ? ', ' : ''}${item.state ?? ''} ${item.postalCode ?? ''}`
  }
  return line.trim()
}

// Memoize the PlainHeader component
const PlainHeader = memo(() => {
  const router = useRouter()
  const { userStore } = useStores()
  const { theme } = useTheme()
  const [addresses, setAddresses] = useState<any[]>([])

  useEffect(() => {
    // Fetch addresses when component mounts
    const fetchAddresses = async () => {
      if (userStore.currentUser?.id) {
        await userStore.fetchAddresses()
        setAddresses(userStore.addresses)
      }
    }
    fetchAddresses()
  }, [userStore.currentUser?.id])

  // Get the address to display
  const getDisplayAddress = () => {
    // First check if there's a selected address
    if (userStore.selectedAddress) {
      return userStore.selectedAddress
    }

    // If no selected address, find the default address
    const defaultAddress = addresses.find(addr => addr.isDefault === 1)
    if (defaultAddress) {
      return defaultAddress
    }

    // If no default address, return the first address in the list
    if (addresses.length > 0) {
      return addresses[0]
    }

    // If no addresses at all, return null
    return null
  }

  const displayAddress = getDisplayAddress()
  const area = displayAddress?.label || 'Select Address'
  const address = displayAddress
    ? formatAddress(displayAddress)
    : 'Add your delivery address'

  return (
    <View style={styles.plainHeader}>
      <View style={styles.headerLeft}>
        <TouchableOpacity
          style={styles.addressContainer}
          onPress={() =>
            router.push({ pathname: '/screens/address/address-list' })
          }
          activeOpacity={0.7}
        >
          <View style={styles.addressRow}>
            <Ionicons
              name="location-sharp"
              size={20}
              color={theme.colors.palette.primary500}
              style={shared.iconMargin}
            />
            <RNText style={[styles.areaLabel, { color: theme.colors.text }]}>
              {area}
            </RNText>
            <Ionicons
              name="chevron-down"
              size={16}
              color={theme.colors.text}
              style={shared.iconMargin}
            />
          </View>
          <RNText
            style={[styles.addressText, { color: theme.colors.textDim }]}
            numberOfLines={1}
          >
            {address}
          </RNText>
        </TouchableOpacity>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={[
            styles.profileCircleGray,
            { backgroundColor: theme.colors.palette.neutral600 },
          ]}
          onPress={() => router.push('/screens/profile')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="person"
            size={20}
            color={theme.colors.palette.neutral900}
          />
        </TouchableOpacity>
      </View>
    </View>
  )
})

// Memoize the SearchBar component
const SearchBar = memo(
  ({ _value }: { _value: string; onChange: (v: string) => void }) => {
    const router = useRouter()
    const { theme } = useTheme()
    const scaleAnim = useRef(new Animated.Value(1)).current

    const handlePress = useCallback(() => {
      router.push('/screens/search')
    }, [router])

    const handlePressIn = useCallback(() => {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start()
    }, [scaleAnim])

    const handlePressOut = useCallback(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start()
    }, [scaleAnim])

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[
            styles.searchBarWrap,
            {
              backgroundColor: theme.colors.palette.neutral100,
              borderColor: theme.colors.palette.neutral300,
            },
          ]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <View
            style={[
              styles.searchIconContainer,
              { backgroundColor: theme.colors.palette.neutral200 },
            ]}
          >
            <Ionicons
              name="search"
              size={20}
              color={theme.colors.palette.primary500}
            />
          </View>
          <AnimatedPlaceholder />
        </TouchableOpacity>
      </Animated.View>
    )
  },
)

// Helper to resolve image for restaurant/category/menu
const getImageSource = async (
  entityType: EntityType,
  entityId: string | number,
  fallback: any,
  assetVersion = 0,
) => {
  return getCachedAssetImageSource(entityType, entityId, fallback, assetVersion)
}

// Memoize the PopularFoodCard component
const PopularFoodCard = memo(({ food }: { food: any }) => {
  const router = useRouter()
  const { theme } = useTheme()
  const [imgSrc, setImgSrc] = useState(fallbackImage)
  const assetVersion = useEatsAssetsVersion()

  useEffect(() => {
    let isMounted = true
    async function fetchImage() {
      const result = await getImageSource(
        EntityType.MENU,
        food.id,
        fallbackImage,
        assetVersion,
      )

      if (isMounted) {
        setImgSrc(result)
      }
    }
    fetchImage()
    return () => {
      isMounted = false
    }
  }, [food.id, assetVersion])

  const handlePress = useCallback(() => {
    router.push({
      pathname: '/screens/food/[foodId]',
      params: { foodId: food.id },
    })
  }, [router, food.id])

  return (
    <TouchableOpacity onPress={handlePress}>
      <View
        style={[
          styles.foodCard,
          { backgroundColor: theme.colors.palette.neutral100 },
        ]}
      >
        <Image
          source={imgSrc}
          style={styles.foodImage}
          defaultSource={fallbackImage}
        />
        <RNText
          numberOfLines={1}
          style={[styles.foodName, { color: theme.colors.text }]}
        >
          {food.name}
        </RNText>
        <View style={styles.foodCardHeader}>
          <RNText
            style={[
              styles.foodPrice,
              { color: theme.colors.palette.secondary400 },
            ]}
          >
            ${food.price?.toFixed(2) ?? ''}
          </RNText>
          <View
            style={[
              styles.calorieBadge,
              { backgroundColor: theme.colors.palette.primary100 },
            ]}
          >
            <RNText
              style={[
                styles.calorieBadgeText,
                { color: theme.colors.palette.primary500 },
              ]}
            >
              {String(food.calories ?? '') + ' cal'}
            </RNText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
})

// Memoize the CategoryCard component
const CategoryCard = memo(
  ({
    name,
    id,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    restaurantId,
    index,
  }: {
    name: string
    id: number
    restaurantId: number
    index: number
  }) => {
    const router = useRouter()
    const { theme } = useTheme()
    const [imgSrc, setImgSrc] = useState(fallbackImage)
    const assetVersion = useEatsAssetsVersion()

    useEffect(() => {
      let isMounted = true
      getImageSource(
        EntityType.CATEGORIES,
        id,
        fallbackImage,
        assetVersion,
      ).then(result => {
        if (isMounted) {
          setImgSrc(result)
        }
      })
      return () => {
        isMounted = false
      }
    }, [id, assetVersion])

    const handlePress = useCallback(() => {
      router.push({
        pathname: '/screens/category/[id]',
        params: { id },
      })
    }, [router, id])

    const categoryCardColors = getCategoryCardColors(theme.colors.palette)
    const bgColor = useMemo(
      () => categoryCardColors[index % categoryCardColors.length],
      [index, categoryCardColors],
    )

    return (
      <TouchableOpacity onPress={handlePress}>
        <View style={[styles.categoryCard, { backgroundColor: bgColor }]}>
          <Image
            source={imgSrc}
            style={styles.categoryImage}
            defaultSource={fallbackImage}
          />
          <RNText style={[styles.categoryName, { color: theme.colors.text }]}>
            {name}
          </RNText>
        </View>
      </TouchableOpacity>
    )
  },
)

// Memoize the RestaurantListCard component
const RestaurantListCard = memo(({ rest }: { rest: any }) => {
  const { theme } = useTheme()
  const [imgSrc, setImgSrc] = useState(fallbackImage)
  const assetVersion = useEatsAssetsVersion()

  useEffect(() => {
    let isMounted = true
    async function fetchImage() {
      const result = await getImageSource(
        EntityType.RESTAURANTS,
        rest.id,
        fallbackImage,
        assetVersion,
      )
      if (isMounted) {
        setImgSrc(result)
      }
    }
    fetchImage()
    return () => {
      isMounted = false
    }
  }, [rest.id, assetVersion])

  return (
    <Link href={`/screens/restaurant/${rest.id}`} asChild>
      <TouchableOpacity>
        <View
          style={[
            styles.restaurantCard,
            { backgroundColor: theme.colors.palette.neutral100 },
          ]}
        >
          <Image
            source={imgSrc}
            style={[
              styles.restaurantCardImage,
              { backgroundColor: theme.colors.palette.neutral300 },
            ]}
            defaultSource={fallbackImage}
          />
          <View style={styles.restaurantCardInfo}>
            <RNText
              style={[styles.restaurantCardName, { color: theme.colors.text }]}
            >
              {rest.name}
            </RNText>
            <RNText
              style={[
                styles.restaurantCardDesc,
                { color: theme.colors.textDim },
              ]}
            >
              {rest.description}
            </RNText>
            <View style={styles.restaurantCardRatingWrap}>
              <Image
                source={icons.bell}
                style={[
                  styles.restaurantCardRatingIcon,
                  { tintColor: theme.colors.palette.accent400 },
                ]}
              />
              <RNText
                style={[
                  styles.restaurantCardRating,
                  { color: theme.colors.text },
                ]}
              >
                {rest.rating ?? ''}
              </RNText>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  )
})

// Loading skeleton component
const LoadingSkeleton = () => {
  const { theme } = useTheme()
  return (
    <View style={styles.skeletonContainer}>
      <ActivityIndicator size="large" color={theme.colors.palette.primary500} />
    </View>
  )
}

// Add type for form data
interface HomeFormData {
  search?: string
  loading?: boolean
  userId?: number
  lastUpdated?: number
  screenName?: string
  route?: string
  action?: string
  timestamp?: number
}

export default observer(function HomeScreen() {
  const [search, setSearch] = useState('')
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [popularFoods, setPopularFoods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { userStore, sessionStore } = useStores()
  const router = useRouter()
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const { theme } = useTheme()
  const { trackScreenMount, trackContentChange } = useInteractionTracking(
    'HomeScreen',
    '/(tabs)/home',
  )

  // Load search and loading states from session
  useFocusEffect(
    useCallback(() => {
      if (!sessionTimeStamp) {
        return
      }
      const session = sessionStore.getSession(sessionId as any)

      if (!session?.data?.sessionData?.formData) {
        return
      }

      const formData = session.data.sessionData.formData as HomeFormData

      // Restore states based on the session data
      if (formData.search !== undefined) {
        setSearch(formData.search)
      }
      if (formData.loading !== undefined) {
        setLoading(formData.loading)
      }
    }, [sessionTimeStamp, sessionStore]),
  )

  // Track screen mount with state values on focus
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        loading,
        timestamp: Date.now(),
        platform: Platform.OS,
        screenDimensions: {
          width: Dimensions.get('window').width,
          height: Dimensions.get('window').height,
        },
        userId: userStore.currentUser?.id,
      })
    }, [trackScreenMount]),
  )

  // Track search changes
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      trackContentChange({
        action: 'search_changed',
        search: value,
        timestamp: Date.now(),
        userId: userStore.currentUser?.id,
      })
    },
    [trackContentChange, userStore.currentUser?.id],
  )

  // Memoize the data fetching function
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      // First check if user has any addresses
      if (userStore.currentUser?.id) {
        await userStore.fetchAddresses()

        // If no addresses exist, redirect to add address
        if (!userStore.addresses.length) {
          router.replace({ pathname: '/screens/address/add-address' })
          return
        }
      }

      // Fetch all data in parallel
      const [dbRestaurants, allCategories, allPopular] = await Promise.all([
        queries.getAllRestaurants(),
        Promise.all(
          (await queries.getAllRestaurants()).map(async (rest: any) => {
            const cats = await queries.getCategoriesForRestaurant(rest.id)
            return cats.map((cat: any) => ({ ...cat, restaurantId: rest.id }))
          }),
        ).then(cats => cats.flat()),
        Promise.all(
          (await queries.getAllRestaurants()).map(async (rest: any) => {
            const pop = await queries.getPopularMenuItems(rest.id)
            return pop.map((item: any) => ({ ...item, restaurantId: rest.id }))
          }),
        ).then(items => items.flat()),
      ])

      setRestaurants(dbRestaurants || [])
      setCategories(allCategories)
      setPopularFoods(allPopular)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [userStore.currentUser?.id, router])

  useEffect(() => {
    fetchData()
  }, [fetchData, sessionTimeStamp])

  // Memoize the render functions
  const renderCategory = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <CategoryCard
        key={item.id}
        name={item.name}
        id={item.id}
        restaurantId={item.restaurantId}
        index={index}
      />
    ),
    [],
  )

  const renderFood = useCallback(
    ({ item }: { item: any }) => <PopularFoodCard key={item.id} food={item} />,
    [],
  )

  const renderRestaurant = useCallback(
    ({ item }: { item: any }) => (
      <RestaurantListCard key={item.id} rest={item} />
    ),
    [],
  )

  const renderContent = () => {
    if (loading) {
      return <LoadingSkeleton />
    }

    if (!loading && !restaurants.length) {
      return (
        <View style={styles.emptyState}>
          <RNText
            style={[styles.emptyStateText, { color: theme.colors.textDim }]}
          >
            No restaurants found.
          </RNText>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { backgroundColor: theme.colors.palette.primary500 },
            ]}
            onPress={fetchData}
          >
            <RNText
              style={[
                styles.retryButtonText,
                { color: theme.colors.palette.neutral900 },
              ]}
            >
              Retry
            </RNText>
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <>
        <View>
          <RNText style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Top Categories
          </RNText>
          <FlashList
            data={categories}
            renderItem={renderCategory}
            estimatedItemSize={120}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.flashListContent}
          />
        </View>

        <RNText style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Popular Food
        </RNText>
        <FlashList
          data={popularFoods}
          renderItem={renderFood}
          estimatedItemSize={190}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.flashListContentVertical}
        />

        <RNText style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Open Restaurants
        </RNText>
        <FlashList
          data={restaurants}
          renderItem={renderRestaurant}
          estimatedItemSize={94}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.flashListContentBottom}
        />
      </>
    )
  }

  return (
    <Screen
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      safeAreaEdges={['top', 'bottom']}
    >
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
      />
      <PlainHeader />
      <SearchBar _value={search} onChange={handleSearchChange} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {renderContent()}
      </ScrollView>
    </Screen>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  scrollView: {
    flex: 1,
  } as ViewStyle,
  contentContainer: {
    paddingHorizontal: metrics.medium,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  } as ViewStyle,
  plainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: metrics.medium,
    justifyContent: 'space-between',
    paddingBottom: 12,
  } as ViewStyle,
  headerLeft: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  areaLabel: {
    fontWeight: 'bold',
    fontSize: 17,
    color: colors.text,
    marginRight: 2,
  } as TextStyle,
  addressText: {
    color: colors.textDim,
    fontSize: 14,
    marginTop: 2,
    marginLeft: 6,
    maxWidth: 220,
  } as TextStyle,
  headerRight: {
    marginLeft: 12,
  } as ViewStyle,
  profileCircleGray: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.palette.neutral600,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  addressContainer: {
    flex: 1,
  } as ViewStyle,
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.palette.neutral100,
    borderRadius: 8,
    marginHorizontal: metrics.medium,
    marginBottom: 24,
    height: 48,
    marginTop: 12,
    paddingHorizontal: metrics.small,
    shadowColor: colors.palette.neutral400,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: colors.palette.neutral200,
  } as ViewStyle,
  searchIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.palette.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    color: colors.text,
    fontFamily: 'Inter-Regular',
  } as TextStyle,
  sectionTitle: {
    fontSize: metrics.text.xl,
    color: colors.text,
    marginBottom: 8,
  } as TextStyle,
  foodCard: {
    width: 160,
    height: 190,
    borderRadius: 20,
    marginRight: 16,
    shadowColor: colors.palette.neutral900,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  } as ViewStyle,
  foodCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 160,
  } as ViewStyle,
  foodPrice: {
    fontSize: metrics.text.medium,
    color: colors.palette.secondary400,
    marginLeft: 18,
  } as TextStyle,
  foodImage: {
    width: '100%',
    height: '60%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginBottom: 10,
  } as ImageStyle,
  foodName: {
    fontSize: metrics.text.medium,
    color: colors.text,
    textAlign: 'left',
    marginBottom: 8,
  } as TextStyle,
  calorieBadge: {
    backgroundColor: colors.palette.primary100,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  } as ViewStyle,
  calorieBadgeText: {
    color: colors.palette.primary500,
    fontWeight: 'bold',
    fontSize: metrics.text.small,
  } as TextStyle,
  categoryCard: {
    backgroundColor: colors.palette.neutral100,
    borderRadius: 14,
    alignItems: 'center',
    marginRight: 18,
    padding: 16,
    paddingVertical: 8,
    width: 100,
    height: 120,
    shadowColor: colors.palette.neutral900,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    justifyContent: 'center',
  } as ViewStyle,
  categoryImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 4,
  } as ImageStyle,
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    textTransform: 'capitalize',
  } as TextStyle,
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: colors.palette.neutral100,
    borderRadius: 18,
    shadowColor: colors.palette.neutral900,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
    padding: 12,
    gap: 14,
  } as ViewStyle,
  restaurantCardImage: {
    width: 70,
    height: 70,
    borderRadius: 14,
    marginRight: 10,
    backgroundColor: colors.palette.neutral300,
  } as ImageStyle,
  restaurantCardInfo: {
    flex: 1,
    justifyContent: 'center',
  } as ViewStyle,
  restaurantCardName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  } as TextStyle,
  restaurantCardDesc: {
    fontSize: 14,
    color: colors.textDim,
    marginBottom: 6,
  } as TextStyle,
  restaurantCardRatingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  restaurantCardRatingIcon: {
    width: 16,
    height: 16,
    tintColor: colors.palette.accent400,
    marginRight: 2,
    resizeMode: 'contain',
  } as ImageStyle,
  restaurantCardRating: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  } as TextStyle,
  skeletonContainer: {
    padding: metrics.medium,
  } as ViewStyle,
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: metrics.medium,
  } as ViewStyle,
  emptyStateText: {
    fontSize: 16,
    color: colors.textDim,
    marginBottom: 16,
  } as TextStyle,
  retryButton: {
    backgroundColor: colors.palette.primary500,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  } as ViewStyle,
  retryButtonText: {
    color: colors.palette.neutral900,
    fontSize: 16,
    fontWeight: '600',
  } as TextStyle,
  flashListContent: {
    paddingHorizontal: 2,
    paddingVertical: 8,
  } as ViewStyle,
  flashListContentVertical: {
    paddingVertical: 4,
  } as ViewStyle,
  flashListContentBottom: {
    paddingBottom: 32,
  } as ViewStyle,
  separator: {
    height: 12,
  } as ViewStyle,
})
