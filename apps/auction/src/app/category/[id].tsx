// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useStores } from '@/models'
import { Text, type Theme } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Glassmorphic, AnimatedBackground, ItemCard } from '@/components'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useAppTheme } from '@andojo/shared-theme'

const { width } = Dimensions.get('window')
const ITEM_WIDTH = (width - 54) / 2
const ITEMS_PER_PAGE = 10

const CategoryDetailScreen = observer(() => {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>()
  const { auctionStore, uiStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()

  const { trackScreenMount } = useInteractionTracking(
    'category-detail',
    `/category/${id}`,
  )

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const categoryId = parseInt(id as string, 10)
  const category = auctionStore.getCategoryById(categoryId)
  // Use category name from store if not available in route params (e.g., during deeplink navigation)
  const categoryName = name || category?.name || 'Category'
  const allItems = auctionStore.getItemsByCategory(categoryId)

  // Initialize category pagination if needed
  useEffect(() => {
    if (uiStore.browseState.categoryPagination.categoryId !== categoryId) {
      uiStore.setCategoryPaginationCategoryId(categoryId)
      uiStore.setCategoryPaginationPage(1)
      uiStore.setCategoryPaginationAllItemsLoaded(false)
      uiStore.setCategoryPaginationLoading(false)
    }
  }, [categoryId, uiStore])

  // Paginated items
  const page = uiStore.browseState.categoryPagination.page
  const loading = uiStore.browseState.categoryPagination.loading
  const allItemsLoaded = uiStore.browseState.categoryPagination.allItemsLoaded
  const displayItems = allItems.slice(0, page * ITEMS_PER_PAGE)
  const hasMore = displayItems.length < allItems.length

  useEffect(() => {
    if (displayItems.length >= allItems.length && allItems.length > 0) {
      uiStore.setCategoryPaginationAllItemsLoaded(true)
    }
  }, [displayItems.length, allItems.length, uiStore])

  const handleItemPress = useCallback(
    (itemId: number) => {
      router.push(`/item/${itemId}`)
    },
    [router],
  )

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'category-detail',
        route: `/category/${id}`,
      })
      // Initialize pagination for this category
      uiStore.setCategoryPaginationCategoryId(categoryId)
      uiStore.setCategoryPaginationPage(1)
      uiStore.setCategoryPaginationAllItemsLoaded(false)
      uiStore.setCategoryPaginationLoading(false)

      return () => {
        // Reset pagination when screen unmounts
        uiStore.resetCategoryPagination()
      }
    }, [trackScreenMount, id, categoryId, uiStore]),
  )

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return

    uiStore.setCategoryPaginationLoading(true)
    // Simulate network delay
    setTimeout(() => {
      uiStore.setCategoryPaginationPage(page + 1)
      uiStore.setCategoryPaginationLoading(false)
    }, 300)
  }, [loading, hasMore, page, uiStore])

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const seller = auctionStore.getUserById(item.sellerId)
      return (
        <View style={styles.itemWrapper}>
          <ItemCard
            item={item}
            seller={seller || undefined}
            onPress={handleItemPress}
            size="medium"
            showSeller={true}
          />
        </View>
      )
    },
    [handleItemPress, auctionStore],
  )

  const renderFooter = useCallback(() => {
    if (allItemsLoaded) {
      return (
        <Glassmorphic
          borderRadius={16}
          padding={20}
          intensity={Platform.OS === 'ios' ? 50 : 70}
          backgroundColor={
            Platform.OS === 'ios'
              ? theme.colors.palette.secondary100
              : theme.colors.palette.neutral100
          }
          borderColor={theme.colors.palette.neutral300}
          borderWidth={1}
          style={styles.footer}
        >
          <Text style={{ ...styles.footerText, color: theme.colors.textDim }}>
            That's all Folks! 🎉
          </Text>
        </Glassmorphic>
      )
    }

    if (loading) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color={theme.colors.tint} />
        </View>
      )
    }

    return null
  }, [allItemsLoaded, loading, theme])

  const renderEmpty = useCallback(
    () => (
      <Glassmorphic
        borderRadius={24}
        padding={48}
        intensity={Platform.OS === 'ios' ? 50 : 75}
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
            <Ionicons name="cube-outline" size={48} color={theme.colors.tint} />
          </Glassmorphic>
        </View>
        <Text style={{ ...styles.emptyText, color: theme.colors.text }}>
          No items in this category
        </Text>
        <Text style={{ ...styles.emptySubtext, color: theme.colors.textDim }}>
          Check back later for new listings
        </Text>
      </Glassmorphic>
    ),
    [theme],
  )

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-back"
                size={28}
                color={theme.colors.text}
              />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{categoryName}</Text>
              <Text
                style={{
                  ...styles.headerSubtitle,
                  color: theme.colors.textDim,
                }}
              >
                {allItems.length} item{allItems.length !== 1 ? 's' : ''}{' '}
                available
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Items Grid with Infinite Scroll */}
        <Animated.View
          style={[
            styles.listContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <FlatList
            data={displayItems}
            keyExtractor={item => `item-${item.id}`}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onEndReached={loadMore}
            onEndReachedThreshold={0.8}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmpty}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
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
      marginBottom: 8,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    backButton: {
      marginRight: 12,
      padding: 4,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.6,
      marginBottom: 4,
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: 15,
      fontWeight: '500',
    },
    listContainer: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 100,
    },
    row: {
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    itemWrapper: {
      width: ITEM_WIDTH,
    },
    footer: {
      marginTop: 20,
      marginBottom: 20,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      letterSpacing: -0.2,
    },
    loadingFooter: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 60,
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
    },
  })

export default CategoryDetailScreen
