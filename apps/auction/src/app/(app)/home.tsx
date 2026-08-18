// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View,
  ScrollView,
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
import { Text, type Theme } from '@andojo/shared-theme'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Glassmorphic, AnimatedBackground, ItemCard } from '@/components'
import { debounce } from 'lodash'
import { useAppTheme } from '@andojo/shared-theme'

const { width } = Dimensions.get('window')
const CARD_WIDTH = width - 48

const HomeScreen = observer(() => {
  const { userStore, auctionStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { trackScreenMount } = useInteractionTracking('home', '/home')
  const router = useRouter()

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
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
      auctionStore
        .createSession({
          sessionId: `session_${Date.now()}`,
          userId: userStore.user.id,
          seed: 42,
        })
        .catch(console.error)
    }
  }, [userStore.isAuthenticated, userStore.user?.id])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'home',
        route: '/home',
      })
    }, [trackScreenMount]),
  )

  // Get auction data
  const featuredItems = auctionStore.auctionItems.slice(0, 6)
  const endingSoonItems = auctionStore.auctionItems
    .filter(item => item.timeRemaining && item.timeRemaining < 86400)
    .slice(0, 6)
  const buyNowItems = auctionStore.buyNowItems.slice(0, 6)
  const myBids = userStore.user?.id
    ? auctionStore.getBidsByUser(userStore.user.id).slice(0, 5)
    : []

  // const formatTimeRemaining = (seconds: number | null) => {
  //   if (!seconds) return 'Ended'
  //   const hours = Math.floor(seconds / 3600)
  //   const minutes = Math.floor((seconds % 3600) / 60)
  //   if (hours > 0) return `${hours}h ${minutes}m`
  //   return `${minutes}m`
  // }

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`
  }

  const handleSearch = debounce(() => {
    router.push('/search')
  }, 300)

  const handleItemPress = debounce((itemId: number) => {
    router.push(`/item/${itemId}`)
  }, 300)

  const handleCategoryPress = debounce((categoryId: number) => {
    const category = auctionStore.getCategoryById(categoryId)
    router.push({
      pathname: '/category/[id]',
      params: { id: categoryId.toString(), name: category?.name || 'Category' },
    })
  }, 300)

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header with Search */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleSearch}
            activeOpacity={0.8}
            style={styles.searchWrapper}
          >
            <Glassmorphic
              borderRadius={22}
              padding={0}
              variant="strong"
              style={styles.searchContainer}
            >
              <View style={styles.searchInner}>
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={theme.colors.textDim}
                  style={styles.searchIcon}
                />
                <Text
                  style={{
                    ...styles.searchInputPlaceholder,
                    color: theme.colors.textDim,
                  }}
                >
                  Search auctions...
                </Text>
                {/* Bell icon hidden - not needed */}
                {/* <TouchableOpacity
                  onPress={e => {
                    e.stopPropagation()
                    router.push('/notifications/notifications')
                  }}
                  style={styles.notificationButton}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color={theme.colors.textDim}
                  />
                  {notificationStore.notifications.filter(n => n.isRead === 0)
                    .length > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {
                          notificationStore.notifications.filter(
                            n => n.isRead === 0,
                          ).length
                        }
                      </Text>
                    </View>
                  )}
                </TouchableOpacity> */}
              </View>
            </Glassmorphic>
          </TouchableOpacity>
        </Animated.View>

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          {/* Categories Horizontal Scroll */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shop by Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {auctionStore.categories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => handleCategoryPress(category.id)}
                  activeOpacity={0.8}
                >
                  <Glassmorphic
                    borderRadius={22}
                    padding={16}
                    intensity={Platform.OS === 'ios' ? 70 : 85}
                    backgroundColor={
                      Platform.OS === 'ios'
                        ? theme.colors.palette.secondary100
                        : theme.colors.palette.neutral100
                    }
                    borderColor={theme.colors.palette.neutral300}
                    borderWidth={1}
                    style={styles.categoryCard}
                  >
                    <View style={styles.categoryIconContainer}>
                      <Ionicons
                        name="cube-outline"
                        size={28}
                        color={theme.colors.palette.primary600}
                      />
                    </View>
                    <Text style={styles.categoryName} numberOfLines={2}>
                      {category.name}
                    </Text>
                    <Text style={styles.categoryCount}>
                      {auctionStore.getItemsByCategory(category.id).length}{' '}
                      items
                    </Text>
                  </Glassmorphic>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Featured Auctions */}
          {featuredItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🔥 Featured Auctions</Text>
                <TouchableOpacity
                  onPress={() => router.push('/browse')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.itemsContainer}
              >
                {featuredItems.map(item => {
                  const seller = auctionStore.getUserById(item.sellerId)
                  return (
                    <ItemCard
                      key={item.id}
                      item={item}
                      seller={seller || undefined}
                      onPress={handleItemPress}
                      size="medium"
                      showSeller={true}
                    />
                  )
                })}
              </ScrollView>
            </View>
          )}

          {/* Ending Soon */}
          {endingSoonItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>⏰ Ending Soon</Text>
                <TouchableOpacity
                  onPress={() => router.push('/browse')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.itemsContainer}
              >
                {endingSoonItems.map(item => {
                  const seller = auctionStore.getUserById(item.sellerId)
                  return (
                    <ItemCard
                      key={item.id}
                      item={item}
                      seller={seller || undefined}
                      onPress={handleItemPress}
                      size="medium"
                      showSeller={true}
                    />
                  )
                })}
              </ScrollView>
            </View>
          )}

          {/* Buy Now Items */}
          {buyNowItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🛒 Buy It Now</Text>
                <TouchableOpacity
                  onPress={() => router.push('/browse')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.itemsContainer}
              >
                {buyNowItems.map(item => {
                  const seller = auctionStore.getUserById(item.sellerId)
                  return (
                    <ItemCard
                      key={item.id}
                      item={item}
                      seller={seller || undefined}
                      onPress={handleItemPress}
                      size="medium"
                      showSeller={true}
                    />
                  )
                })}
              </ScrollView>
            </View>
          )}

          {/* My Bids */}
          {myBids.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🎯 My Bids</Text>
                <TouchableOpacity
                  onPress={() => router.push('/my-bids')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              <Glassmorphic
                borderRadius={26}
                padding={20}
                intensity={Platform.OS === 'ios' ? 70 : 85}
                backgroundColor={
                  Platform.OS === 'ios'
                    ? theme.colors.palette.secondary100
                    : theme.colors.palette.neutral100
                }
                borderColor={theme.colors.palette.neutral300}
                borderWidth={1}
                style={styles.bidsContainer}
              >
                {myBids.map((bid, index) => {
                  const item = auctionStore.getItemById(bid.itemId)
                  return (
                    <TouchableOpacity
                      key={bid.id}
                      onPress={() => item && handleItemPress(item.id)}
                      activeOpacity={0.7}
                      style={[
                        styles.bidItem,
                        index < myBids.length - 1 && styles.bidItemBorder,
                      ]}
                    >
                      <View style={styles.bidItemLeft}>
                        <Ionicons
                          name={bid.isWinning ? 'trophy' : 'hammer-outline'}
                          size={20}
                          color={
                            bid.isWinning
                              ? theme.colors.palette.success500
                              : theme.colors.palette.neutral600
                          }
                        />
                        <View style={styles.bidItemInfo}>
                          <Text style={styles.bidItemTitle} numberOfLines={1}>
                            {item?.title || 'Item'}
                          </Text>
                          <Text style={styles.bidItemAmount}>
                            Your bid: {formatPrice(bid.bidAmount)}
                          </Text>
                        </View>
                      </View>
                      {bid.isWinning && (
                        <View style={styles.winningBadge}>
                          <Text style={styles.winningBadgeText}>Winning</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </Glassmorphic>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                onPress={() => router.push('/sell')}
                activeOpacity={0.8}
              >
                <Glassmorphic
                  borderRadius={22}
                  padding={20}
                  intensity={Platform.OS === 'ios' ? 70 : 85}
                  backgroundColor={
                    Platform.OS === 'ios'
                      ? theme.colors.palette.secondary100
                      : theme.colors.palette.neutral100
                  }
                  borderColor={theme.colors.palette.neutral300}
                  borderWidth={1}
                  style={styles.quickActionCard}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={32}
                    color={theme.colors.palette.primary600}
                  />
                  <Text style={styles.quickActionText}>List Item</Text>
                </Glassmorphic>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/my-bids')}
                activeOpacity={0.8}
              >
                <Glassmorphic
                  borderRadius={22}
                  padding={20}
                  intensity={Platform.OS === 'ios' ? 70 : 85}
                  backgroundColor={
                    Platform.OS === 'ios'
                      ? theme.colors.palette.secondary100
                      : theme.colors.palette.neutral100
                  }
                  borderColor={theme.colors.palette.neutral300}
                  borderWidth={1}
                  style={styles.quickActionCard}
                >
                  <Ionicons
                    name="hammer-outline"
                    size={32}
                    color={theme.colors.palette.primary600}
                  />
                  <Text style={styles.quickActionText}>My Bids</Text>
                </Glassmorphic>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.ScrollView>
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
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
      backgroundColor: 'transparent',
      width: '100%',
    },
    searchWrapper: {
      width: '100%',
      minHeight: 50,
    },
    searchContainer: {
      width: '100%',
      minHeight: 50,
    },
    scrollView: {
      flex: 1,
    },
    searchInner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 16,
    },
    searchIcon: {
      marginRight: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.palette.neutral900,
      fontWeight: '500',
    },
    searchInputPlaceholder: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
    },
    notificationButton: {
      padding: 4,
      position: 'relative',
    },
    notificationBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      backgroundColor: theme.colors.palette.angry500,
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    notificationBadgeText: {
      color: theme.colors.palette.neutral100,
      fontSize: 10,
      fontWeight: '600',
    },
    scrollContent: {
      paddingBottom: 100,
    },
    section: {
      marginTop: 28,
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 18,
    },
    sectionTitle: {
      fontSize: 23,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      letterSpacing: -0.6,
      lineHeight: 28,
      marginBottom: 20,
    },
    seeAllText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
      letterSpacing: -0.2,
    },
    categoriesContainer: {
      paddingRight: 20,
      gap: 14,
    },
    categoryCard: {
      width: 112,
      alignItems: 'center',
      height: 132,
    },
    categoryIconContainer: {
      marginBottom: 12,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: theme.colors.palette.primary100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryName: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      textAlign: 'center',
      marginBottom: 6,
    },
    categoryCount: {
      fontSize: 11,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
    },
    itemsContainer: {
      paddingRight: 20,
      gap: 18,
    },
    itemCard: {
      width: CARD_WIDTH * 0.75,
      overflow: 'hidden',
    },
    itemImagePlaceholder: {
      width: '100%',
      height: 180,
      backgroundColor: theme.colors.palette.primary100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemInfo: {
      padding: 18,
    },
    itemTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginBottom: 12,
      minHeight: 44,
      lineHeight: 22,
      letterSpacing: -0.3,
    },
    itemPriceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    itemPrice: {
      fontSize: 23,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
      letterSpacing: -0.6,
    },
    bidBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.primary500,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 14,
      gap: 5,
    },
    bidCount: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
    timeRemainingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    urgentTime: {
      backgroundColor: theme.colors.palette.angry100,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    timeRemaining: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
    },
    urgentText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.angry500,
    },
    sellerName: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
    },
    bidsContainer: {
      marginTop: 8,
    },
    bidItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
    },
    bidItemBorder: {
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.palette.primary200,
    },
    bidItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    bidItemInfo: {
      flex: 1,
    },
    bidItemTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    bidItemAmount: {
      fontSize: 13,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
    },
    winningBadge: {
      backgroundColor: theme.colors.palette.success100,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    winningBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.palette.success500,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      marginTop: 10,
    },
    quickActionCard: {
      width: (width - 68) / 2,
      alignItems: 'center',
      minHeight: 112,
      justifyContent: 'center',
    },
    quickActionText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginTop: 10,
      textAlign: 'center',
    },
  })

export default HomeScreen
