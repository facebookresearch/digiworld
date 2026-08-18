// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useEffect, useRef, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Animated,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useStores } from '@/models'
import { Text, type Theme } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'
import { AnimatedBackground, Glassmorphic } from '@/components'
import { useAppTheme } from '@andojo/shared-theme'

const TransactionsScreen = observer(() => {
  const { auctionStore, userStore, uiStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking(
    'transactions',
    '/history',
  )

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

  // Get selected filter from UIStore
  const selectedFilter = uiStore.transactionFilter.activeFilter || 'all'

  // Get user transactions (exclude 'listing' transactions as they're free)
  const userTransactions = userStore.user?.id
    ? auctionStore
        .getTransactionsByUser(userStore.user.id)
        .filter(t => t.transactionType !== 'listing')
    : []

  // Dynamic filters based on transaction types (excluding 'listing')
  const transactionTypes = ['purchase', 'bid_win', 'sale', 'refund']
  const filters = [
    {
      id: 'all',
      name: 'All',
      count: userTransactions.length,
    },
    ...transactionTypes.map(type => ({
      id: type,
      name: type
        .split('_')
        .map(w => w[0].toUpperCase() + w.slice(1))
        .join(' '),
      count: userTransactions.filter(t => t.transactionType === type).length,
    })),
  ]

  // Get filtered transactions (sorted by transactionDate descending - latest first)
  // Note: getTransactionsByUser already sorts, but we re-sort here to ensure consistency
  const filteredTransactions = (
    selectedFilter === 'all'
      ? userTransactions
      : userTransactions.filter(t => t.transactionType === selectedFilter)
  ).sort((a, b) => {
    // Parse dates more robustly
    const parseDate = (dateStr: string | null | undefined): number => {
      if (!dateStr) return 0
      const parsed = new Date(dateStr).getTime()
      return isNaN(parsed) ? 0 : parsed
    }

    // Use transactionDate first, then createdAt, then id as tiebreaker
    const dateA = parseDate(a.transactionDate || a.createdAt)
    const dateB = parseDate(b.transactionDate || b.createdAt)

    // If dates are equal, use ID as tiebreaker (higher ID = newer)
    if (dateB === dateA) {
      return b.id - a.id
    }
    return dateB - dateA
  })

  // Debounced navigation function
  const handleTransactionNavigation = debounce((transactionId: number) => {
    router.push(`/transactions/${transactionId}`)
  }, 300)

  useFocusEffect(
    useCallback(() => {
      if (userStore.user?.id) {
        auctionStore.loadUserTransactions(userStore.user.id)
      }
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'transactions',
        route: '/history',
      })
      return () => {
        // Transactions screen unfocused
      }
    }, [trackScreenMount, userTransactions, selectedFilter]),
  )

  const getTransactionIcon = (transactionType: string): any => {
    switch (transactionType) {
      case 'purchase':
        return 'storefront-outline'
      case 'bid_win':
        return 'trophy-outline'
      case 'sale':
        return 'cash-outline'
      case 'refund':
        return 'arrow-undo-outline'
      case 'listing':
        return 'add-circle-outline'
      default:
        return 'receipt-outline'
    }
  }

  const getTransactionColor = (transactionType: string) => {
    switch (transactionType) {
      case 'sale':
      case 'bid_win':
        return theme.colors.palette.success400
      case 'refund':
        return theme.colors.palette.accent400
      case 'purchase':
        return theme.colors.palette.accent400
      case 'listing':
        return theme.colors.palette.primary400
      default:
        return theme.colors.textDim
    }
  }

  const formatTransactionDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTransactionType = (type: string) => {
    return type
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  const formatFailureReason = (reason: string | null | undefined): string => {
    if (!reason) return 'Payment failed'

    // Convert code-like strings to user-friendly messages
    const reasonMap: Record<string, string> = {
      PAYMENT_DECLINED: 'Payment was declined',
      INSUFFICIENT_FUNDS: 'Insufficient funds',
      DECLINED: 'Payment was declined',
      CARD_DECLINED: 'Card was declined',
      EXPIRED_CARD: 'Card has expired',
      INVALID_CARD: 'Invalid card number',
    }

    // Check for exact match first
    if (reasonMap[reason]) {
      return reasonMap[reason]
    }

    // Check if it contains any of the keys (case-insensitive)
    const upperReason = reason.toUpperCase()
    for (const [key, message] of Object.entries(reasonMap)) {
      if (upperReason.includes(key)) {
        return message
      }
    }

    // If it's already user-friendly (contains spaces, lowercase), return as-is
    if (reason.includes(' ') || reason === reason.toLowerCase()) {
      return reason
    }

    // Otherwise, format it nicely
    return reason
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
  }

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Fixed Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={{ ...styles.headerTitle, color: theme.colors.text }}>
            Transaction History
          </Text>
          <Text size="medium" style={{ color: theme.colors.textDim }}>
            Track all your account activity
          </Text>
        </Animated.View>

        {/* Fixed Filter Tabs with Horizontal Scroll */}
        <Animated.View style={[styles.filterSection, { opacity: fadeAnim }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabsContainer}
          >
            {filters.map(filter => (
              <TouchableOpacity
                key={filter.id}
                onPress={() => uiStore.setTransactionFilter(filter.id)}
                activeOpacity={0.8}
              >
                <Glassmorphic
                  borderRadius={20}
                  padding={12}
                  variant={selectedFilter === filter.id ? 'strong' : 'default'}
                  backgroundColor={
                    selectedFilter === filter.id
                      ? theme.colors.palette.primary400
                      : undefined
                  }
                  style={styles.filterTab}
                >
                  <Text
                    style={StyleSheet.flatten([
                      styles.filterTabText,
                      {
                        color:
                          selectedFilter === filter.id
                            ? theme.colors.palette.neutral100
                            : theme.colors.text,
                      },
                    ])}
                  >
                    {filter.name}
                  </Text>
                  {filter.count > 0 && (
                    <View
                      style={[
                        styles.filterBadge,
                        {
                          backgroundColor:
                            selectedFilter === filter.id
                              ? theme.colors.palette.neutral400
                              : theme.colors.palette.primary300,
                        },
                      ]}
                    >
                      <Text style={styles.filterBadgeText}>{filter.count}</Text>
                    </View>
                  )}
                </Glassmorphic>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Scrollable Transactions List Only */}
        <Animated.View
          style={[styles.transactionsSection, { opacity: fadeAnim }]}
        >
          <FlatList
            data={filteredTransactions || []}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.transactionsScrollContent}
            style={styles.transactionsScrollView}
            renderItem={({ item: transaction }) => {
              const transactionType = transaction.transactionType || 'unknown'
              const name = formatTransactionType(transactionType)
              const type = formatTransactionType(transactionType)

              return (
                <TouchableOpacity
                  onPress={() => handleTransactionNavigation(transaction.id)}
                  activeOpacity={0.8}
                  style={styles.transactionItemWrapper}
                >
                  <Glassmorphic
                    borderRadius={16}
                    padding={16}
                    variant="strong"
                    style={styles.transactionItem}
                  >
                    <Glassmorphic
                      borderRadius={12}
                      padding={12}
                      variant="subtle"
                      backgroundColor={
                        getTransactionColor(transactionType) + '15'
                      }
                      style={styles.transactionIcon}
                    >
                      <Ionicons
                        name={getTransactionIcon(transactionType)}
                        size={20}
                        color={getTransactionColor(transactionType)}
                      />
                    </Glassmorphic>

                    <View style={styles.transactionDetails}>
                      <View style={styles.transactionTitleRow}>
                        <Text
                          style={StyleSheet.flatten([
                            styles.transactionTitle,
                            {
                              color:
                                transaction.paymentStatus === 'failed'
                                  ? theme.colors.textDim
                                  : theme.colors.text,
                            },
                          ])}
                        >
                          {name}
                        </Text>
                        {transaction.paymentStatus === 'failed' && (
                          <View
                            style={[
                              styles.failedBadge,
                              {
                                backgroundColor: theme.colors.palette?.angry500,
                              },
                            ]}
                          >
                            <Ionicons
                              name="close-circle"
                              size={12}
                              color={theme.colors.palette.neutral100}
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={StyleSheet.flatten([
                                styles.failedBadgeText,
                                { color: theme.colors.palette.neutral100 },
                              ])}
                            >
                              Failed
                            </Text>
                          </View>
                        )}
                      </View>
                      {transaction.paymentStatus === 'failed' &&
                      transaction.failureReason ? (
                        <Text
                          size="small"
                          style={StyleSheet.flatten([
                            styles.failureReason,
                            {
                              color: theme.colors.palette?.angry500,
                            },
                          ])}
                          numberOfLines={1}
                        >
                          {formatFailureReason(transaction.failureReason)}
                        </Text>
                      ) : (
                        <Text
                          size="medium"
                          style={{ color: theme.colors.textDim }}
                        >
                          {type}
                        </Text>
                      )}
                      <Text
                        style={StyleSheet.flatten([
                          styles.transactionDate,
                          { color: theme.colors.textDim },
                        ])}
                      >
                        {formatTransactionDate(
                          transaction.transactionDate || transaction.createdAt,
                        )}
                      </Text>
                    </View>

                    <View style={styles.transactionAmountContainer}>
                      <Text
                        style={StyleSheet.flatten([
                          styles.transactionAmount,
                          {
                            color:
                              transaction.paymentStatus === 'failed'
                                ? theme.colors.textDim
                                : transaction.isOutgoing
                                  ? theme.colors.palette.angry400
                                  : theme.colors.palette.success400,
                            opacity:
                              transaction.paymentStatus === 'failed' ? 0.5 : 1,
                          },
                        ])}
                      >
                        {transaction.signedAmount}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={theme.colors.textDim}
                      />
                    </View>
                  </Glassmorphic>
                </TouchableOpacity>
              )
            }}
            ListEmptyComponent={() => (
              <Glassmorphic
                borderRadius={26}
                padding={40}
                variant="strong"
                style={styles.emptyTransactions}
              >
                <Ionicons
                  name="receipt-outline"
                  size={48}
                  color={theme.colors.textDim}
                />
                <Text
                  style={StyleSheet.flatten([
                    styles.emptyText,
                    { color: theme.colors.text },
                  ])}
                >
                  No transactions found
                </Text>
                <Text
                  style={StyleSheet.flatten([
                    styles.emptySubtext,
                    { color: theme.colors.textDim },
                  ])}
                >
                  Your transaction history will appear here
                </Text>
              </Glassmorphic>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            getItemLayout={(data, index) => ({
              length: 88,
              offset: 88 * index,
              index,
            })}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
            legacyImplementation={false}
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
      paddingTop: 20,
      paddingHorizontal: 24,
      paddingBottom: 20,
    },
    filterSection: {
      paddingBottom: 16,
    },
    filterTabsContainer: {
      paddingHorizontal: 24,
      paddingRight: 32,
      gap: 12,
    },
    filterTab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    filterTabText: {
      fontSize: 14,
      fontWeight: '600',
    },
    filterBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 20,
      alignItems: 'center',
    },
    filterBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
    transactionsSection: {
      flex: 1,
      paddingHorizontal: 16,
    },
    transactionsScrollView: {
      flex: 1,
    },
    transactionsScrollContent: {
      paddingBottom: 60,
    },
    transactionItemWrapper: {
      marginBottom: 8,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    transactionIcon: {
      marginRight: 16,
    },
    transactionDetails: {
      flex: 1,
    },
    transactionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 4,
    },
    transactionTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    failedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    failedBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    failureReason: {
      fontSize: 12,
      marginTop: 4,
      fontWeight: '500',
    },
    transactionDate: {
      fontSize: 14,
      marginTop: 2,
    },
    transactionAmountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: '700',
    },
    emptyTransactions: {
      alignItems: 'center',
      marginTop: 40,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      textAlign: 'center',
    },
    separator: {
      height: 0,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      letterSpacing: -0.6,
      marginBottom: 4,
    },
  })

export default TransactionsScreen
