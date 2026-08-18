import React, { useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
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

const MyListingsScreen = observer(() => {
  const { userStore, auctionStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('my-listings', '/cards')

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
    }
  }, [userStore.isAuthenticated, userStore.user?.id])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'my-listings',
        route: '/cards',
      })
    }, [trackScreenMount]),
  )

  const handleItemPress = debounce((itemId: number) => {
    router.push(`/item/${itemId}`)
  }, 300)

  const handleListNewItem = debounce(() => {
    router.push('/sell')
  }, 300)

  // Get user's listings
  const userListings = userStore.user?.id
    ? auctionStore.getItemsBySeller(userStore.user.id)
    : []

  const activeListings = userListings.filter(item => item.status === 'active')
  const soldListings = userListings.filter(item => item.status === 'sold')
  const expiredListings = userListings.filter(item => item.status === 'expired')

  if (!userStore.isAuthenticated || !userStore.user) {
    return (
      <AnimatedBackground>
        <SafeAreaView style={styles.safeArea}>
          <Glassmorphic
            borderRadius={26}
            padding={40}
            variant="strong"
            style={styles.emptyState}
          >
            <Ionicons
              name="person-outline"
              size={64}
              color={theme.colors.textDim}
            />
            <Text style={{ ...styles.emptyText, color: theme.colors.text }}>
              Please sign in to view your listings
            </Text>
          </Glassmorphic>
        </SafeAreaView>
      </AnimatedBackground>
    )
  }

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.safeArea}>
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
          <View>
            <Text style={{ ...styles.headerTitle, color: theme.colors.text }}>
              My Listings
            </Text>
            <Text
              style={{ ...styles.headerSubtitle, color: theme.colors.textDim }}
            >
              Manage your auction items
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleListNewItem}
            activeOpacity={0.8}
            style={styles.addButton}
          >
            <Glassmorphic
              borderRadius={22}
              padding={12}
              variant="strong"
              backgroundColor={theme.colors.palette.primary400}
            >
              <Ionicons
                name="add"
                size={20}
                color={theme.colors.palette.neutral100}
              />
            </Glassmorphic>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats */}
        <Animated.View style={[styles.statsSection, { opacity: fadeAnim }]}>
          <Glassmorphic
            borderRadius={26}
            padding={20}
            variant="strong"
            style={styles.statsContainer}
          >
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{activeListings.length}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{soldListings.length}</Text>
              <Text style={styles.statLabel}>Sold</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{expiredListings.length}</Text>
              <Text style={styles.statLabel}>Expired</Text>
            </View>
          </Glassmorphic>
        </Animated.View>

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={{ opacity: fadeAnim }}
        >
          {/* Active Listings */}
          {activeListings.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Active Listings</Text>
                <Text style={styles.itemCount}>
                  {activeListings.length} item
                  {activeListings.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.listingsGrid}>
                {activeListings.map(item => {
                  const seller = auctionStore.getUserById(item.sellerId)
                  const category = auctionStore.getCategoryById(item.categoryId)
                  return (
                    <ItemCard
                      key={item.id}
                      item={item}
                      seller={seller || undefined}
                      category={category || undefined}
                      onPress={handleItemPress}
                      size="medium"
                      showSeller={false}
                      showCategory={true}
                      showStatus={true}
                    />
                  )
                })}
              </View>
            </View>
          )}

          {/* Sold Listings */}
          {soldListings.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Sold Items</Text>
                <Text style={styles.itemCount}>
                  {soldListings.length} item
                  {soldListings.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.listingsGrid}>
                {soldListings.map(item => {
                  const seller = auctionStore.getUserById(item.sellerId)
                  const category = auctionStore.getCategoryById(item.categoryId)
                  return (
                    <ItemCard
                      key={item.id}
                      item={item}
                      seller={seller || undefined}
                      category={category || undefined}
                      onPress={handleItemPress}
                      size="medium"
                      showSeller={false}
                      showCategory={true}
                      showStatus={true}
                    />
                  )
                })}
              </View>
            </View>
          )}

          {/* Expired Listings */}
          {expiredListings.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Expired Listings</Text>
                <Text style={styles.itemCount}>
                  {expiredListings.length} item
                  {expiredListings.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.listingsGrid}>
                {expiredListings.map(item => {
                  const seller = auctionStore.getUserById(item.sellerId)
                  const category = auctionStore.getCategoryById(item.categoryId)
                  return (
                    <ItemCard
                      key={item.id}
                      item={item}
                      seller={seller || undefined}
                      category={category || undefined}
                      onPress={handleItemPress}
                      size="medium"
                      showSeller={false}
                      showCategory={true}
                      showStatus={true}
                    />
                  )
                })}
              </View>
            </View>
          )}

          {/* Empty State */}
          {userListings.length === 0 && (
            <View style={styles.section}>
              <Glassmorphic
                borderRadius={26}
                padding={40}
                intensity={Platform.OS === 'ios' ? 70 : 85}
                backgroundColor={
                  Platform.OS === 'ios'
                    ? theme.colors.palette.secondary100
                    : theme.colors.palette.neutral100
                }
                borderColor={theme.colors.palette.neutral300}
                borderWidth={1}
                style={styles.emptyState}
              >
                <Ionicons
                  name="storefront-outline"
                  size={64}
                  color={theme.colors.palette.neutral400}
                />
                <Text style={{ ...styles.emptyText, color: theme.colors.text }}>
                  No listings yet
                </Text>
                <Text
                  style={{
                    ...styles.emptySubtext,
                    color: theme.colors.textDim,
                  }}
                >
                  Start selling by listing your first item
                </Text>
                <TouchableOpacity
                  onPress={handleListNewItem}
                  style={styles.emptyButton}
                >
                  <Text style={styles.emptyButtonText}>
                    List Your First Item
                  </Text>
                </TouchableOpacity>
              </Glassmorphic>
            </View>
          )}
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
      color: theme.colors.palette.neutral900,
      letterSpacing: -0.6,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 15,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
    },
    addButton: {
      marginTop: 4,
    },
    statsSection: {
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 13,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
    },
    statDivider: {
      width: 1,
      backgroundColor: theme.colors.palette.primary200,
      marginHorizontal: 8,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    section: {
      marginTop: 24,
      paddingHorizontal: 20,
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
    },
    itemCount: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
    },
    listingsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 15,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      marginBottom: 24,
    },
    emptyButton: {
      backgroundColor: theme.colors.palette.primary500,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 16,
    },
    emptyButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
  })

export default MyListingsScreen
