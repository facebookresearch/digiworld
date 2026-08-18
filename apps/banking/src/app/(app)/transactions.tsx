import React, { useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useStores } from '@/models'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'

const TransactionsScreen = observer(() => {
  const { bankingStore, uiStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking(
    'transactions',
    '/transactions',
  )

  // Get selected filter from UIStore
  const selectedFilter = uiStore.transactionFilter.activeFilter

  // Dynamic filters based on transaction types and actual transaction counts
  const filters = [
    {
      id: 'all',
      name: 'All',
      count: bankingStore.recentTransactions?.length || 0,
    },
    ...bankingStore.transactionTypes.map(type => ({
      id: type.code,
      name: type.name,
      count: bankingStore.transactionsByType[type.code] || 0,
    })),
  ]

  // Get filtered transactions
  const filteredTransactions =
    bankingStore.getTransactionsByFilter(selectedFilter)

  // Debounced navigation function
  const handleTransactionNavigation = debounce((transactionId: number) => {
    router.push(`/transactions/${transactionId}`)
  }, 300)

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'transactions',
        route: '/transactions',
      })
      return () => {
        // Transactions screen unfocused
      }
    }, [trackScreenMount, bankingStore.recentTransactions, selectedFilter]),
  )

  const getTransactionIcon = (category: string, code: string) => {
    // First check by category
    switch (category) {
      case 'credit':
        return 'arrow-down-circle'
      case 'debit':
        // More specific icons for debit transactions
        switch (code) {
          case 'withdrawal':
            return 'cash-outline'
          case 'bill_payment':
            return 'receipt-outline'
          case 'credit_card_payment':
            return 'card-outline'
          case 'purchase':
            return 'storefront-outline'
          case 'interest_charge':
            return 'trending-up-outline'
          case 'monthly_fee':
            return 'calendar-outline'
          default:
            return 'arrow-up-circle'
        }
      case 'transfer':
        switch (code) {
          case 'zelle':
            return 'send-outline'
          case 'external_transfer':
            return 'swap-horizontal-outline'
          case 'transfer':
            return 'repeat-outline'
          default:
            return 'swap-horizontal'
        }
      default:
        return 'card-outline'
    }
  }

  const getTransactionColor = (category: string, code: string) => {
    // Color based on category with some specific overrides
    switch (category) {
      case 'credit':
        return theme.colors.palette.success400
      case 'debit':
        switch (code) {
          case 'interest_charge':
          case 'monthly_fee':
            return theme.colors.palette.angry400
          case 'bill_payment':
            return theme.colors.palette.secondary400
          case 'credit_card_payment':
            return theme.colors.palette.primary400
          case 'purchase':
            return theme.colors.palette.accent400
          default:
            return theme.colors.palette.angry300
        }
      case 'transfer':
        switch (code) {
          case 'zelle':
            return theme.colors.palette.accent300
          default:
            return theme.colors.palette.primary300
        }
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

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* Fixed Header */}
        <View style={styles.header}>
          <Text
            preset="subheading"
            style={[styles.title, { color: theme.colors.text }] as any}
          >
            Transaction History
          </Text>
          <Text preset="default" style={{ color: theme.colors.textDim } as any}>
            Track all your account activity
          </Text>
        </View>

        {/* Fixed Filter Tabs with Horizontal Scroll */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabsContainer}
          >
            {filters.map(filter => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterTab,
                  selectedFilter === filter.id && {
                    backgroundColor: theme.colors.palette.primary400,
                  },
                  selectedFilter !== filter.id && {
                    backgroundColor: (theme.colors as any).surface,
                  },
                ]}
                onPress={() => uiStore.setTransactionFilter(filter.id)}
              >
                <Text
                  style={
                    [
                      styles.filterTabText,
                      selectedFilter === filter.id && {
                        color: theme.colors.palette.neutral100,
                      },
                      selectedFilter !== filter.id && {
                        color: theme.colors.text,
                      },
                    ] as any
                  }
                >
                  {filter.name}
                </Text>
                {filter.count > 0 && (
                  <View
                    style={[
                      styles.filterBadge,
                      selectedFilter === filter.id && {
                        backgroundColor: theme.colors.palette.overlay20,
                      },
                      selectedFilter !== filter.id && {
                        backgroundColor: theme.colors.palette.primary300,
                      },
                    ]}
                  >
                    <Text
                      style={
                        [
                          styles.filterBadgeText,
                          { color: theme.colors.palette.neutral100 },
                        ] as any
                      }
                    >
                      {filter.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Scrollable Transactions List Only */}
        <View style={styles.transactionsSection}>
          <FlatList
            data={filteredTransactions || []}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.transactionsScrollContent}
            style={styles.transactionsScrollView}
            renderItem={({ item: transaction, index }) => {
              let transactionType, category, code, name, type

              if (transaction.transactionTypeId) {
                // New structure with transactionTypeId
                transactionType = bankingStore.getTransactionType(
                  transaction.transactionTypeId,
                )
                category = transactionType?.category || 'debit'
                code = transactionType?.code || 'unknown'
                name = transaction.description || 'Unknown Transaction'
                type = transactionType?.name
              } else if (transaction.transactionType) {
                transactionType = bankingStore.getTransactionTypeByCode(
                  transaction.transactionType,
                )
                category = transactionType?.category || 'debit'
                code = transaction.transactionType
                name = transaction.description || 'Unknown Transaction'
                type = transactionType?.name
              } else {
                // Fallback
                category = 'debit'
                code = 'unknown'
                name = 'Unknown Transaction'
              }

              // Use the transaction's computed isOutgoing property for consistent display
              // const isCredit = !transaction.isOutgoing

              return (
                <View
                  style={[
                    styles.transactionItemWrapper,
                    { backgroundColor: (theme.colors as any).surface },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.transactionItem,
                      index < (filteredTransactions?.length || 0) - 1 && {
                        borderBottomColor: theme.colors.border,
                        borderBottomWidth: 1,
                      },
                    ]}
                    onPress={() => handleTransactionNavigation(transaction.id)}
                  >
                    <View
                      style={[
                        styles.transactionIcon,
                        {
                          backgroundColor:
                            getTransactionColor(category, code) + '15',
                        },
                      ]}
                    >
                      <Ionicons
                        name={getTransactionIcon(category, code) as any}
                        size={20}
                        color={getTransactionColor(category, code)}
                      />
                    </View>

                    <View style={styles.transactionDetails}>
                      <Text
                        style={
                          [
                            styles.transactionTitle,
                            { color: theme.colors.text },
                          ] as any
                        }
                      >
                        {name}
                      </Text>
                      <Text
                        size="medium"
                        style={{ color: theme.colors.textDim } as any}
                      >
                        {type}
                      </Text>
                      <Text
                        style={
                          [
                            styles.transactionDate,
                            { color: theme.colors.textDim },
                          ] as any
                        }
                      >
                        {formatTransactionDate(transaction.createdAt)}
                      </Text>
                    </View>

                    <View style={styles.transactionAmountContainer}>
                      <Text
                        style={
                          [
                            styles.transactionAmount,
                            {
                              color: transaction.isOutgoing
                                ? theme.colors.palette.angry400
                                : theme.colors.palette.success400,
                            },
                          ] as any
                        }
                      >
                        {transaction.signedAmount}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={theme.colors.textDim}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              )
            }}
            ListEmptyComponent={() => (
              <View
                style={[
                  styles.transactionsContainer,
                  { backgroundColor: (theme.colors as any).surface },
                ]}
              >
                <View style={styles.emptyTransactions}>
                  <Ionicons
                    name="receipt-outline"
                    size={48}
                    color={theme.colors.textDim}
                  />
                  <Text style={styles.emptyText}>No transactions found</Text>
                  <Text
                    style={
                      [
                        styles.emptySubtext,
                        { color: theme.colors.textDim },
                      ] as any
                    }
                  >
                    Your transaction history will appear here
                  </Text>
                </View>
              </View>
            )}
            ItemSeparatorComponent={null}
            getItemLayout={(data, index) => ({
              length: 80, // Height including margin (72 + 8)
              offset: 80 * index,
              index,
            })}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
            legacyImplementation={false}
          />
        </View>
      </View>
    </SafeAreaView>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingTop: 20,
      paddingHorizontal: 24,
      paddingBottom: 20,
    },
    title: {
      marginBottom: 4,
    },
    searchSection: {
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    filterSection: {
      paddingBottom: 16,
    },
    filterTabsContainer: {
      paddingHorizontal: 24,
      paddingRight: 32,
    },

    searchContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    searchButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      gap: 12,
    },
    searchText: {
      fontSize: 16,
    },
    filterButton: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },
    filterTab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 8,
      marginRight: 12,
    },
    transactionsSection: {
      flex: 1,
      padding: 16,
    },
    transactionsScrollView: {
      flex: 1,
    },
    transactionsScrollContent: {
      paddingBottom: 60,
      backgroundColor: 'transparent',
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
    },
    transactionsContainer: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    transactionItemWrapper: {
      borderRadius: 16,
      marginBottom: 8,
      overflow: 'hidden',
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: 'transparent',
      minHeight: 72,
    },
    transactionIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    transactionDetails: {
      flex: 1,
    },
    transactionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    transactionDate: {
      fontSize: 14,
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
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 8,
      color: theme.colors.textDim,
    },
    emptySubtext: {
      fontSize: 14,
      textAlign: 'center',
    },
  })

export default TransactionsScreen
