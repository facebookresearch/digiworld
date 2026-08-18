import React, { useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useStores } from '@/models'
import { Text, type Theme, useAppTheme } from '@andojo/shared-theme'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Glassmorphic, AnimatedBackground, ItemCard } from '@/components'

const { width } = Dimensions.get('window')
const ITEM_WIDTH = width * 0.42
const ITEMS_PER_ROW = 8

interface CategoryRowProps {
  category: { id: number; name: string }
  items: any[]
  onItemPress: (itemId: number) => void
  onSeeAllPress: (categoryId: number, categoryName: string) => void
  theme: any
}

const CategoryRow = React.memo(
  ({
    category,
    items,
    onItemPress,
    onSeeAllPress,
    theme,
  }: CategoryRowProps) => {
    const displayItems = items.slice(0, ITEMS_PER_ROW)
    const styles = useMemo(() => createStyles(theme), [theme])

    return (
      <View style={styles.categoryRow}>
        <View style={styles.categoryHeader}>
          <Text style={{ ...styles.categoryTitle, color: theme.colors.text }}>
            {category.name}
          </Text>
          {items.length > ITEMS_PER_ROW && (
            <TouchableOpacity
              onPress={() => onSeeAllPress(category.id, category.name)}
              activeOpacity={0.7}
              style={styles.seeAllButton}
            >
              <Text style={{ ...styles.seeAllText, color: theme.colors.tint }}>
                See All
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.colors.tint}
              />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          horizontal
          data={displayItems}
          keyExtractor={item => `item-${item.id}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => (
            <View style={styles.itemWrapper}>
              <ItemCard
                item={item}
                onPress={onItemPress}
                size="small"
                showSeller={false}
              />
            </View>
          )}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
        />
      </View>
    )
  },
)

const BrowseScreen = observer(() => {
  const { userStore, auctionStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('browse', '/browse')

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const headerSlideAnim = useRef(new Animated.Value(-20)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(headerSlideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  useEffect(() => {
    if (userStore.isAuthenticated && userStore.user?.id) {
      // Only load data if not already loaded (prevents blocking tab switches)
      if (!auctionStore.dataLoaded) {
        auctionStore.loadAllData().catch(console.error)
      }
    }
  }, [userStore.isAuthenticated, userStore.user?.id])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'browse',
        route: '/browse',
      })
    }, [trackScreenMount]),
  )

  const handleItemPress = useCallback(
    (itemId: number) => {
      router.push(`/item/${itemId}`)
    },
    [router],
  )

  const handleSeeAllPress = useCallback(
    (categoryId: number, categoryName: string) => {
      router.push({
        pathname: '/category/[id]',
        params: { id: categoryId, name: categoryName },
      })
    },
    [router],
  )

  // Group items by category
  const categoriesWithItems = auctionStore.categories
    .map(category => ({
      category,
      items: auctionStore.getItemsByCategory(category.id),
    }))
    .filter(({ items }) => items.length > 0)

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: headerSlideAnim }],
            },
          ]}
        >
          <View>
            <Text style={{ ...styles.headerTitle, color: theme.colors.text }}>
              Browse Auctions
            </Text>
            <Text
              style={{ ...styles.headerSubtitle, color: theme.colors.textDim }}
            >
              Discover amazing items up for auction
            </Text>
          </View>
        </Animated.View>

        {/* Category Rows */}
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={categoriesWithItems}
            keyExtractor={item => `category-${item.category.id}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            renderItem={({ item }) => (
              <CategoryRow
                category={item.category}
                items={item.items}
                onItemPress={handleItemPress}
                onSeeAllPress={handleSeeAllPress}
                theme={theme}
              />
            )}
            ListEmptyComponent={
              <Glassmorphic
                borderRadius={24}
                padding={48}
                intensity={Platform.OS === 'ios' ? 75 : 90}
                backgroundColor={
                  Platform.OS === 'ios'
                    ? theme.colors.palette.secondary100
                    : theme.colors.palette.neutral100
                }
                borderColor={theme.colors.palette.neutral300}
                borderWidth={1}
                style={styles.emptyState}
              >
                <View style={styles.emptyIconContainer}>
                  <Glassmorphic
                    borderRadius={40}
                    padding={20}
                    intensity={Platform.OS === 'ios' ? 60 : 80}
                    backgroundColor={theme.colors.palette.primary100}
                    borderColor={theme.colors.palette.primary300}
                    borderWidth={1}
                  >
                    <Ionicons
                      name="cube-outline"
                      size={48}
                      color={theme.colors.tint}
                    />
                  </Glassmorphic>
                </View>
                <Text style={{ ...styles.emptyText, color: theme.colors.text }}>
                  No items available
                </Text>
                <Text style={styles.emptySubtext}>
                  Check back later for new listings
                </Text>
              </Glassmorphic>
            }
          />
        </Animated.View>
      </SafeAreaView>
    </AnimatedBackground>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.6,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 15,
      fontWeight: '500',
    },
    scrollContent: {
      paddingBottom: 100,
    },
    categoryRow: {
      marginBottom: 28,
    },
    categoryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 14,
    },
    categoryTitle: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.6,
    },
    seeAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    seeAllText: {
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: -0.2,
    },
    horizontalList: {
      paddingLeft: 20,
      paddingRight: 10,
    },
    itemWrapper: {
      width: ITEM_WIDTH,
      marginRight: 12,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 20,
      marginTop: 40,
      minHeight: 280,
    },
    emptyIconContainer: {
      marginBottom: 20,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: '700',
      marginTop: 16,
      marginBottom: 10,
      letterSpacing: -0.4,
    },
    emptySubtext: {
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 22,
      opacity: 0.85,
      color: theme.colors.textDim,
    },
  })

export default BrowseScreen
