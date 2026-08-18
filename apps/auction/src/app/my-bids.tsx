// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { useRouter, useFocusEffect } from 'expo-router'
import { useStores } from '@/models'
import { Text, type Theme } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Glassmorphic, ItemCard } from '@/components'
import { debounce } from 'lodash'
import { useAppTheme } from '@andojo/shared-theme'

const MyBidsScreen = observer(() => {
  const { userStore, auctionStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('my-bids', '/my-bids')

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
        screen: 'my-bids',
        route: '/my-bids',
      })
    }, [trackScreenMount]),
  )

  const handleItemPress = debounce((itemId: number) => {
    router.push(`/item/${itemId}`)
  }, 300)

  // Get user's bids
  const userBids = userStore.user?.id
    ? auctionStore.getBidsByUser(userStore.user.id)
    : []

  // Group bids by item and get unique items
  const bidItems = userBids
    .map(bid => {
      const item = auctionStore.getItemById(bid.itemId)
      return item ? { item, bid } : null
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  // Remove duplicates (same item, multiple bids)
  const uniqueBidItems = Array.from(
    new Map(bidItems.map(entry => [entry.item.id, entry])).values(),
  )

  // Sort by most recent bid
  uniqueBidItems.sort((a, b) => {
    const aBid = userBids.find(bid => bid.itemId === a.item.id)
    const bBid = userBids.find(bid => bid.itemId === b.item.id)
    if (!aBid || !bBid) return 0
    return (
      new Date(bBid.createdAt).getTime() - new Date(aBid.createdAt).getTime()
    )
  })

  if (!userStore.isAuthenticated || !userStore.user) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[
            theme.colors.palette.primary100,
            theme.colors.palette.primary200,
            theme.colors.palette.secondary100,
          ]}
          style={styles.backgroundGradient}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.emptyState}>
            <Ionicons
              name="person-outline"
              size={64}
              color={theme.colors.palette.neutral400}
            />
            <Text style={styles.emptyText}>
              Please sign in to view your bids
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={styles.signInButton}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.primary100,
          theme.colors.palette.primary200,
          theme.colors.palette.secondary100,
        ]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.backgroundOrbs}>
          <View style={[styles.orb, styles.orb1]} />
          <View style={[styles.orb, styles.orb2]} />
        </View>
      </LinearGradient>

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral700}
            />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>My Bids</Text>
            <Text style={styles.headerSubtitle}>
              {userBids.length} bid{userBids.length !== 1 ? 's' : ''} on{' '}
              {uniqueBidItems.length} item
              {uniqueBidItems.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {uniqueBidItems.length > 0 ? (
            <>
              {uniqueBidItems.map(({ item }) => {
                const seller = auctionStore.getUserById(item.sellerId)
                const itemBids = auctionStore.getBidsByItem(item.id)
                const userItemBids = itemBids.filter(
                  b => b.userId === userStore.user!.id,
                )
                const highestUserBid = userItemBids.reduce(
                  (max, b) => (b.bidAmount > max.bidAmount ? b : max),
                  userItemBids[0],
                )
                const isWinning =
                  auctionStore.getWinningBid(item.id)?.userId ===
                  userStore.user!.id

                return (
                  <Glassmorphic
                    key={item.id}
                    borderRadius={26}
                    padding={20}
                    intensity={Platform.OS === 'ios' ? 75 : 90}
                    backgroundColor={
                      Platform.OS === 'ios'
                        ? theme.colors.palette.secondary100
                        : theme.colors.palette.neutral100
                    }
                    borderColor={theme.colors.palette.neutral300}
                    borderWidth={1}
                    style={styles.bidCard}
                  >
                    <TouchableOpacity
                      onPress={() => handleItemPress(item.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.bidCardHeader}>
                        <View style={styles.bidCardLeft}>
                          {isWinning && (
                            <View style={styles.winningBadge}>
                              <Ionicons
                                name="trophy"
                                size={16}
                                color={theme.colors.palette.neutral100}
                              />
                              <Text style={styles.winningBadgeText}>
                                Winning
                              </Text>
                            </View>
                          )}
                          <View style={styles.bidInfo}>
                            <Text style={styles.bidLabel}>
                              Your Highest Bid
                            </Text>
                            <Text style={styles.bidAmount}>
                              ${highestUserBid.bidAmount.toFixed(2)}
                            </Text>
                            <Text style={styles.bidCount}>
                              {userItemBids.length} bid
                              {userItemBids.length !== 1 ? 's' : ''} on this
                              item
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={theme.colors.palette.neutral500}
                        />
                      </View>
                      <View style={styles.itemPreview}>
                        <ItemCard
                          item={item}
                          seller={seller || undefined}
                          onPress={handleItemPress}
                          size="small"
                          showSeller={false}
                        />
                      </View>
                    </TouchableOpacity>
                  </Glassmorphic>
                )
              })}
            </>
          ) : (
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
                name="hammer-outline"
                size={64}
                color={theme.colors.palette.neutral400}
              />
              <Text style={styles.emptyText}>No bids yet</Text>
              <Text style={styles.emptySubtext}>
                Start bidding on items to see them here
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(app)/pay-bills')}
                style={styles.browseButton}
              >
                <Text style={styles.browseButtonText}>Browse Items</Text>
              </TouchableOpacity>
            </Glassmorphic>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    backgroundGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    backgroundOrbs: {
      ...StyleSheet.absoluteFillObject,
    },
    orb: {
      position: 'absolute',
      borderRadius: 200,
      opacity: 0.15,
    },
    orb1: {
      width: 400,
      height: 400,
      backgroundColor: theme.colors.palette.neutral100,
      top: -50,
      right: -50,
    },
    orb2: {
      width: 320,
      height: 320,
      backgroundColor: theme.colors.palette.neutral100,
      bottom: -40,
      left: -40,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
    },
    backButton: {
      padding: 8,
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
    scrollContent: {
      paddingBottom: 100,
      paddingHorizontal: 20,
      gap: 16,
    },
    bidCard: {
      marginBottom: 0,
    },
    bidCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    bidCardLeft: {
      flex: 1,
    },
    winningBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.palette.success500,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      gap: 5,
      marginBottom: 12,
    },
    winningBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
    bidInfo: {
      marginTop: 0,
    },
    bidLabel: {
      fontSize: 13,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
      marginBottom: 4,
    },
    bidAmount: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
      marginBottom: 4,
    },
    bidCount: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
    },
    itemPreview: {
      marginTop: 12,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
      marginTop: 40,
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
    browseButton: {
      backgroundColor: theme.colors.palette.primary500,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 16,
    },
    browseButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
    signInButton: {
      backgroundColor: theme.colors.palette.primary500,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 16,
      marginTop: 8,
    },
    signInButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
  })

export default MyBidsScreen
