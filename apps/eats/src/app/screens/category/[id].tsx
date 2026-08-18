// Copyright (c) Meta Platforms, Inc. and affiliates.
import { queries } from '@/db/queries'
import { useStores } from '@/models/helpers/useStores'
import { colors } from '@/theme'
import {
  getCachedAssetImageSource,
  useEatsAssetsVersion,
} from '@/utils/assetImageRefresh'
import icons from '@andojo/shared-asset-management/src/icons'
import { EntityType } from '@andojo/shared-asset-management/src/types/enums'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Screen, Text } from '@andojo/shared-theme/src/components'
import { metrics } from '@andojo/shared-theme/src/themes/metrics'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

const fallbackImage = require('../../../../assets/images/pizza.png')

type Restaurant = {
  id: number
  name: string
  description?: string
  rating?: number
  address: string
  logo?: string
  deliveryFee?: number
  minOrder?: number
  deliveryRadius?: number
}

function RestaurantListCard({ rest }: { rest: Restaurant }) {
  const router = useRouter()
  const [imgSrc, setImgSrc] = useState(fallbackImage)
  const assetVersion = useEatsAssetsVersion()

  useEffect(() => {
    async function fetchImage() {
      const result = await getImageSource(
        EntityType.RESTAURANTS,
        rest.id,
        fallbackImage,
        assetVersion,
      )
      setImgSrc(result)
    }
    fetchImage()
  }, [rest.id, assetVersion])

  return (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => router.push(`/screens/restaurant/${rest.id}`)}
    >
      <Image source={imgSrc} style={styles.restaurantCardImage} />
      <View style={styles.restaurantCardInfo}>
        <Text style={styles.restaurantCardName}>{rest.name}</Text>
        <Text style={styles.restaurantCardDesc} numberOfLines={1}>
          {rest.description}
        </Text>
        <View style={styles.restaurantCardDetails}>
          <View style={styles.restaurantCardRatingWrap}>
            <Image
              source={icons.bell}
              style={styles.restaurantCardRatingIcon}
            />
            <Text style={styles.restaurantCardRating}>
              {rest.rating?.toFixed(1) ?? 'New'}
            </Text>
          </View>
          {rest.deliveryFee !== undefined && (
            <Text style={styles.restaurantCardDelivery}>
              Delivery: ${rest.deliveryFee.toFixed(2)}
            </Text>
          )}
        </View>
        {rest.minOrder !== undefined && (
          <Text style={styles.restaurantCardMinOrder}>
            Min. order: ${rest.minOrder.toFixed(2)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

const getImageSource = async (
  entityType: EntityType,
  entityId: string | number,
  fallback: any,
  assetVersion = 0,
) => {
  return getCachedAssetImageSource(entityType, entityId, fallback, assetVersion)
}

export default function CategoryScreen() {
  const router = useRouter()
  const { id: paramId, sessionId } = useLocalSearchParams<{
    id: string
    sessionId?: string
  }>()
  const { sessionStore, userStore } = useStores()
  const [id, setId] = useState<string>(paramId)
  const [category, setCategory] = useState<{ name: string } | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)

  // Add interaction tracking
  const { trackScreenMount, trackContentChange } = useInteractionTracking(
    'CategoryScreen',
    '/screens/category/[id]',
  )

  // Track screen mount
  useEffect(() => {
    trackScreenMount({
      categoryId: id,
      loading,
      restaurantsCount: restaurants.length,
      timestamp: Date.now(),
      platform:
        typeof window !== 'undefined' && window.navigator
          ? window.navigator.platform
          : 'unknown',
      screenDimensions: {
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
      },
      userId: userStore?.currentUser?.id,
    })
  }, [])

  // Track content change when category or restaurants change
  useEffect(() => {
    if (!loading) {
      trackContentChange({
        action: 'category_or_restaurants_update',
        categoryId: id,
        categoryName: category?.name,
        restaurantsCount: restaurants.length,
        timestamp: Date.now(),
        userId: userStore?.currentUser?.id,
      })
    }
  }, [category, restaurants, loading])

  // Restore state from session if available
  useEffect(() => {
    if (!sessionId) return
    const session = sessionStore.getSession(sessionId as string)
    if (!session?.data?.sessionData?.formData) {
      return
    }
    const formData = session.data.sessionData.formData as any
    if (formData.categoryId !== undefined) {
      setId(formData.categoryId)
    }
  }, [sessionId])

  useEffect(() => {
    async function loadCategoryData() {
      if (!id) return

      setLoading(true)
      try {
        // Get category details
        const categoryData = await queries.getCategoryById(Number(id))
        if (categoryData) {
          setCategory(categoryData)
        }

        // Get restaurants for this category
        const categoryRestaurants = await queries.getRestaurantsByCategory(
          Number(id),
        )
        setRestaurants(categoryRestaurants)
      } catch (error) {
        console.error('Error loading category data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCategoryData()
  }, [id])

  if (loading) {
    return (
      <Screen preset="fixed" safeAreaEdges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.palette.primary500} />
        </View>
      </Screen>
    )
  }

  return (
    <Screen preset="fixed" safeAreaEdges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{category?.name || 'Category'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {restaurants.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No restaurants found in this category
            </Text>
          </View>
        ) : (
          <View style={styles.restaurantList}>
            {restaurants.map(rest => (
              <RestaurantListCard key={rest.id} rest={rest} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: metrics.medium,
    paddingTop: 16,
    paddingBottom: 32,
  },
  restaurantList: {
    gap: 12,
  },
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
    padding: 12,
    gap: 14,
  },
  restaurantCardImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
  },
  restaurantCardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  restaurantCardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  restaurantCardDesc: {
    fontSize: 14,
    color: '#888',
    marginBottom: 6,
  },
  restaurantCardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  restaurantCardRatingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  restaurantCardRatingIcon: {
    width: 16,
    height: 16,
    tintColor: '#FFD700',
    marginRight: 2,
    resizeMode: 'contain',
  },
  restaurantCardRating: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
  },
  restaurantCardDelivery: {
    fontSize: 13,
    color: colors.palette.primary500,
    fontWeight: '500',
  },
  restaurantCardMinOrder: {
    fontSize: 13,
    color: '#666',
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
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
})
