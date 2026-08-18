import { Text } from '@/components'
import { queries } from '@/db/queries'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useStores } from '@/models/helpers/useStores'
import { metrics, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useIsFocused } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
  VirtualizedList,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type TransactionType = 'transfer' | 'deposit' | 'withdrawal'
type TransactionStatus = 'completed' | 'pending' | 'failed'

interface Transaction {
  id: number
  senderWalletId: number
  receiverWalletId: number
  amount: number
  currency: string
  status: TransactionStatus
  type: TransactionType
  description: string
  createdAt: string
  reference: string
  pinVerified: number
  pinVerifiedAt: string | null
}

type FilterType = 'all' | TransactionType
type DateRangeType =
  | 'today'
  | 'week'
  | 'month'
  | '3months'
  | '6months'
  | 'year'
  | 'all'

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'transfer', label: 'Transfers' },
  { id: 'deposit', label: 'Deposits' },
  { id: 'withdrawal', label: 'Withdrawals' },
]

const QUICK_FILTERS: {
  id: FilterType
  label: string
  icon: keyof typeof Ionicons.glyphMap
}[] = [
  { id: 'all', label: 'All', icon: 'albums-outline' },
  { id: 'transfer', label: 'Transfers', icon: 'swap-horizontal-outline' },
  { id: 'deposit', label: 'Deposits', icon: 'arrow-down-outline' },
  { id: 'withdrawal', label: 'Withdrawals', icon: 'arrow-up-outline' },
]

const DATE_RANGES: {
  id: DateRangeType
  label: string
  icon: keyof typeof Ionicons.glyphMap
}[] = [
  { id: 'today', label: 'Today', icon: 'today-outline' },
  { id: 'week', label: 'This Week', icon: 'calendar-outline' },
  { id: 'month', label: 'This Month', icon: 'calendar-clear-outline' },
  { id: '3months', label: 'Last 3 Months', icon: 'calendar-number-outline' },
  { id: '6months', label: 'Last 6 Months', icon: 'calendar-number-outline' },
  { id: 'year', label: 'This Year', icon: 'calendar-number-outline' },
  { id: 'all', label: 'All Time', icon: 'infinite-outline' },
]

const DRAWER_WIDTH = Dimensions.get('window').width * 0.85
const ITEMS_PER_PAGE = 20
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 120,
  mass: 0.8,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
}

const getDateRange = (
  range: DateRangeType,
): { startDate: string; endDate: string } => {
  const now = new Date()
  // Set end date to end of current day to include all transactions from today
  const endDate = new Date(now)
  endDate.setHours(23, 59, 59, 999)

  let startDate: Date

  switch (range) {
    case 'today':
      // Start of today
      startDate = new Date(now)
      startDate.setHours(0, 0, 0, 0)
      break
    case 'week':
      // Start of 7 days ago
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 7)
      startDate.setHours(0, 0, 0, 0)
      break
    case 'month':
      // Start of 30 days ago
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
      break
    case '3months':
      // Start of 3 months ago
      startDate = new Date(now)
      startDate.setMonth(startDate.getMonth() - 3)
      startDate.setHours(0, 0, 0, 0)
      break
    case '6months':
      // Start of 6 months ago
      startDate = new Date(now)
      startDate.setMonth(startDate.getMonth() - 6)
      startDate.setHours(0, 0, 0, 0)
      break
    case 'year':
      // Start of 1 year ago
      startDate = new Date(now)
      startDate.setFullYear(startDate.getFullYear() - 1)
      startDate.setHours(0, 0, 0, 0)
      break
    case 'all':
      // All time - use a very old date to include all transactions
      startDate = new Date('2000-01-01T00:00:00.000Z')
      break
    default:
      // Default to 1 month
      startDate = new Date(now)
      startDate.setMonth(startDate.getMonth() - 1)
      startDate.setHours(0, 0, 0, 0)
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  }
}

interface QuickFilter {
  id: FilterType
  label: string
  icon: keyof typeof Ionicons.glyphMap
}

interface FilterItem {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  isActive: boolean
  onPress: () => void
}

interface FilterSection {
  title: string
  data: FilterItem[]
}

export default function TransactionsScreen() {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const isFocused = useIsFocused()
  const { userStore, sessionStore } = useStores()
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const router = useRouter()

  const styles = createStyles(theme)
  const HEADER_GRADIENTS = {
    primary: [
      theme.colors.palette.primary400,
      theme.colors.palette.secondary400,
    ] as [string, string],
  }
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [activeDateRange, setActiveDateRange] = useState<DateRangeType>('month')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const drawerX = useSharedValue(DRAWER_WIDTH)
  const fadeAnim = useSharedValue(0)
  const centerButtonRotate = useSharedValue(0)
  const overlayOpacity = useSharedValue(0)
  const { width, height } = Dimensions.get('window')
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('Transactions', '/(tabs)/transactions')

  // Memoized date range calculation
  const dateRange = useMemo(
    () => getDateRange(activeDateRange),
    [activeDateRange],
  )

  // Load session data if exists
  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession(sessionId as string)

      if (session?.data?.sessionData) {
        const savedState = session.data.sessionData.formData as any

        // Restore state from session
        if (savedState) {
          // Restore filter settings if they exist
          if (savedState.activeFilter) {
            setActiveFilter(savedState.activeFilter)
          }
          if (savedState.activeDateRange) {
            setActiveDateRange(savedState.activeDateRange)
          }
          if (savedState.isDrawerOpen) {
            setIsDrawerOpen(savedState.isDrawerOpen)
            if (savedState.isDrawerOpen) {
              drawerX.value = 0
            }
          }

          // Track content change after state restoration
          trackContentChange({
            event: 'session_state_restored',
            restoredState: savedState,
            timestamp: Date.now(),
          })
        }
      }
      setIsSessionLoaded(true)
    } else if (!sessionTimeStamp) {
      // When no session exists, just set isSessionLoaded to true
      setIsSessionLoaded(true)
    }
  }, [sessionTimeStamp, sessionId, sessionStore])

  // Track screen mount with initial form data
  useFocusEffect(
    useCallback(() => {
      if (isSessionLoaded) {
        trackScreenMount({
          activeFilter,
          activeDateRange,
          isDrawerOpen,
          page,
          hasMore,
          timestamp: Date.now(),
          platform: Platform.OS,
          screenDimensions: {
            width,
            height,
          },
          sessionId,
        })
      }
    }, [
      isSessionLoaded,
      trackScreenMount,
      activeFilter,
      activeDateRange,
      isDrawerOpen,
      page,
      hasMore,
      width,
      height,
      sessionId,
    ]),
  )

  // Optimized fetch transactions with pagination
  const fetchTransactions = useCallback(
    async (pageNum: number = 1, refresh: boolean = false) => {
      try {
        if (refresh) {
          setIsRefreshing(true)
        } else if (pageNum === 1) {
          setIsLoading(true)
        }

        if (!userStore.currentUser?.id) return

        const activeWallets = await queries.getActiveWallets(
          userStore.currentUser.id,
        )
        if (!activeWallets?.length) return

        const walletId = activeWallets[0].id
        let fetchedTransactions: Transaction[] = []

        if (activeFilter === 'all') {
          // Only filter by date range when 'all' transaction types are selected
          fetchedTransactions = await queries.getTransactionsByDateRange(
            walletId,
            dateRange.startDate,
            dateRange.endDate,
            pageNum,
            ITEMS_PER_PAGE,
          )
        } else {
          // When a specific transaction type is selected, we need to apply both filters
          // First get transactions by type
          const typeFilteredTransactions = await queries.getTransactionsByType(
            walletId,
            activeFilter,
            pageNum,
            activeDateRange === 'all'
              ? ITEMS_PER_PAGE // No need to fetch extra if no date filtering
              : ITEMS_PER_PAGE * 3, // Fetch more items to account for date filtering
          )

          // Then filter by date range in memory (skip if "All Time" is selected)
          if (activeDateRange === 'all') {
            fetchedTransactions = typeFilteredTransactions
          } else {
            const startDate = new Date(dateRange.startDate)
            const endDate = new Date(dateRange.endDate)

            fetchedTransactions = typeFilteredTransactions.filter(
              (tx: Transaction) => {
                const txDate = new Date(tx.createdAt)
                return txDate >= startDate && txDate <= endDate
              },
            )

            // Apply pagination manually after filtering
            const startIndex = (pageNum - 1) * ITEMS_PER_PAGE
            fetchedTransactions = fetchedTransactions.slice(
              startIndex,
              startIndex + ITEMS_PER_PAGE,
            )
          }
        }

        setHasMore(fetchedTransactions.length === ITEMS_PER_PAGE)

        if (refresh || pageNum === 1) {
          setTransactions(fetchedTransactions)
          setPage(1)
        } else {
          setTransactions(prev => [...prev, ...fetchedTransactions])
        }
      } catch (error) {
        console.error('Error fetching transactions:', error)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [userStore.currentUser?.id, activeFilter, dateRange],
  )

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchTransactions(1, true)
  }, [fetchTransactions])

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchTransactions(nextPage)
    }
  }, [isLoading, hasMore, page, fetchTransactions])

  // Fetch transactions when filters change or screen is focused
  useEffect(() => {
    if (isFocused) {
      fetchTransactions(1)
      fadeAnim.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      })
    } else {
      fadeAnim.value = withTiming(0, {
        duration: 200,
        easing: Easing.in(Easing.ease),
      })
    }
  }, [isFocused, activeFilter, activeDateRange, fetchTransactions])

  // Track filter changes
  useEffect(() => {
    if (isSessionLoaded) {
      trackContentChange({
        activeFilter,
        activeDateRange,
        isDrawerOpen,
        page,
        hasMore,
        timestamp: Date.now(),
      })
    }
  }, [
    activeFilter,
    activeDateRange,
    isDrawerOpen,
    isSessionLoaded,
    trackContentChange,
  ])

  const getTransactionIcon = (type: TransactionType, isReceived: boolean) => {
    switch (type) {
      case 'transfer':
        return isReceived ? 'arrow-down-outline' : 'arrow-up-outline'
      case 'deposit':
        return 'add-circle-outline'
      case 'withdrawal':
        return 'remove-circle-outline'
      default:
        return 'ellipsis-horizontal'
    }
  }

  const getTransactionColor = (type: TransactionType, isReceived: boolean) => {
    switch (type) {
      case 'transfer':
        return isReceived
          ? theme.colors.palette.primary500
          : theme.colors.palette.accent500
      case 'deposit':
        return theme.colors.palette.primary500
      case 'withdrawal':
        return theme.colors.palette.angry500
      default:
        return theme.colors.textDim
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Function to open the drawer
  const openDrawer = useCallback(() => {
    drawerX.value = withSpring(0, SPRING_CONFIG)
    overlayOpacity.value = withTiming(1, { duration: 300 })
    centerButtonRotate.value = withTiming(1, { duration: 300 })
    setIsDrawerOpen(true)
    trackClick('open_filter_drawer')
  }, [drawerX, overlayOpacity, centerButtonRotate, trackClick])

  // Function to close the drawer
  const closeDrawer = useCallback(() => {
    drawerX.value = withSpring(DRAWER_WIDTH, SPRING_CONFIG)
    overlayOpacity.value = withTiming(0, { duration: 300 })
    centerButtonRotate.value = withTiming(0, { duration: 300 })
    setIsDrawerOpen(false)
    trackClick('close_filter_drawer')
  }, [drawerX, overlayOpacity, centerButtonRotate, trackClick])

  const FilterDrawer = () => {
    const insets = useSafeAreaInsets()
    const drawerAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: drawerX.value }],
    }))

    const sections: FilterSection[] = useMemo(
      () => [
        {
          title: 'Transaction Type',
          data: FILTERS.map(
            filter =>
              ({
                id: filter.id,
                label: filter.label,
                icon:
                  QUICK_FILTERS.find(f => f.id === filter.id)?.icon ||
                  'albums-outline',
                isActive: activeFilter === filter.id,
                onPress: () => setActiveFilter(filter.id),
              }) as FilterItem,
          ),
        },
        {
          title: 'Date Range',
          data: DATE_RANGES.map(
            range =>
              ({
                id: range.id,
                label: range.label,
                icon: range.icon,
                isActive: activeDateRange === range.id,
                onPress: () => setActiveDateRange(range.id),
              }) as FilterItem,
          ),
        },
      ],
      [activeFilter, activeDateRange],
    )

    const renderFilterOption = useCallback(
      ({ item }: { item: FilterItem }) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.filterOption,
            item.isActive && styles.filterOptionActive,
          ]}
          onPress={() => {
            item.onPress()
            trackClick(`filter_option_${item.id}`)
          }}
        >
          <LinearGradient
            colors={
              item.isActive
                ? [
                    theme.colors.palette.primary400,
                    theme.colors.palette.primary500,
                  ]
                : [
                    `${theme.colors.palette.neutral100}80`,
                    `${theme.colors.palette.neutral100}4D`,
                  ]
            }
            style={styles.filterOptionGradient}
          >
            <Ionicons
              name={item.icon}
              size={20}
              color={
                item.isActive
                  ? theme.colors.palette.neutral100
                  : theme.colors.text
              }
            />
            <Text
              text={item.label}
              size="md"
              style={[
                styles.filterOptionText,
                item.isActive && styles.filterOptionTextActive,
              ]}
            />
          </LinearGradient>
        </TouchableOpacity>
      ),
      [trackClick],
    )

    const renderSectionHeader = useCallback(
      ({ section }: { section: FilterSection }) => (
        <View style={styles.filterSection}>
          <Text
            text={section.title}
            size="lg"
            weight="semiBold"
            style={styles.sectionTitle}
          />
        </View>
      ),
      [],
    )

    return (
      <Animated.View style={[styles.filterDrawer, drawerAnimatedStyle]}>
        <LinearGradient
          colors={[
            `${theme.colors.palette.neutral100}FA`,
            `${theme.colors.palette.neutral200}FC`,
            `${theme.colors.palette.neutral300}FA`,
          ]}
          style={styles.filterDrawerContent}
        >
          <View
            style={[
              styles.filterHeader,
              { paddingTop: insets.top + metrics.medium },
            ]}
          >
            <Text
              text="Filters"
              size="xl"
              weight="bold"
              style={styles.filterTitle}
            />
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  closeDrawer()
                  // Reset to page 1 and refresh transactions with new filters
                  setPage(1)
                  fetchTransactions(1, true)
                  trackClick('apply_filters')
                }}
              >
                <LinearGradient
                  colors={[
                    theme.colors.palette.primary400,
                    theme.colors.palette.secondary400,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.headerApplyButton}
                >
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={theme.colors.palette.neutral100}
                  />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeDrawer}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <SectionList
            sections={sections}
            renderItem={renderFilterOption}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            style={styles.filterList}
            contentContainerStyle={styles.filterListContent}
            bounces={false}
            keyExtractor={item => item.id}
          />
        </LinearGradient>
      </Animated.View>
    )
  }

  // Animation styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      {
        translateX: withSpring(fadeAnim.value * 0, SPRING_CONFIG),
      },
    ],
  }))

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    pointerEvents: overlayOpacity.value > 0 ? 'auto' : 'none',
  }))

  // Memoized transaction item renderer
  const renderTransaction = useCallback(
    ({ item: transaction }: { item: Transaction }) => {
      if (!userStore.currentUser?.id) return null

      const isReceived =
        transaction.receiverWalletId === userStore.currentUser.id
      const transactionColor = getTransactionColor(transaction.type, isReceived)

      return (
        <TouchableOpacity
          key={transaction.id}
          style={styles.transactionItem}
          onPress={() => {
            trackClick(`transaction_${transaction.id}`)
            router.push({
              pathname: '/screens/transaction/[id]',
              params: { id: transaction.id, sessionId },
            })
          }}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${transactionColor}15` },
            ]}
          >
            <Ionicons
              name={getTransactionIcon(transaction.type, isReceived)}
              size={24}
              color={transactionColor}
            />
          </View>

          <View style={styles.transactionInfo}>
            <View style={styles.transactionHeader}>
              <Text
                text={transaction.description || transaction.type}
                size="md"
                weight="bold"
                style={styles.description}
              />
              <View style={styles.amountContainer}>
                <Text
                  text={`${isReceived ? '+' : '-'}${transaction.amount.toFixed(2)}`}
                  size="md"
                  weight="bold"
                  style={[styles.amount, { color: transactionColor }]}
                />
                <Text
                  text={transaction.currency}
                  size="sm"
                  style={styles.currency}
                />
              </View>
            </View>

            <View style={styles.transactionDetails}>
              <Text
                text={formatDate(transaction.createdAt)}
                size="sm"
                style={styles.date}
              />
              <Text
                text={transaction.reference || ''}
                size="sm"
                style={styles.reference}
              />
              {transaction.status !== 'completed' && (
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        transaction.status === 'failed'
                          ? theme.colors.errorBackground
                          : theme.colors.palette.accent100,
                    },
                  ]}
                >
                  <Text
                    text={transaction.status}
                    size="xs"
                    style={[
                      styles.statusText,
                      {
                        color:
                          transaction.status === 'failed'
                            ? theme.colors.error
                            : theme.colors.palette.accent500,
                      },
                    ]}
                  />
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      )
    },
    [userStore.currentUser?.id, router, trackClick, sessionId],
  )

  // Memoized empty component
  const EmptyComponent = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Ionicons
          name="receipt-outline"
          size={48}
          color={theme.colors.textDim}
        />
        <Text
          text="No transactions found"
          size="lg"
          weight="medium"
          style={styles.emptyStateText}
        />
      </View>
    ),
    [],
  )

  // Render quick filter item
  const renderQuickFilter = useCallback(
    ({ item: filter }: { item: QuickFilter }) => (
      <TouchableOpacity
        key={filter.id}
        style={[
          styles.quickFilterButton,
          activeFilter === filter.id && styles.quickFilterButtonActive,
        ]}
        onPress={() => {
          setActiveFilter(filter.id)
          trackClick(`quick_filter_${filter.id}`)
        }}
      >
        <Ionicons
          name={filter.icon}
          size={20}
          color={
            activeFilter === filter.id
              ? theme.colors.palette.primary500
              : theme.colors.palette.neutral100
          }
        />
        <Text
          text={filter.label}
          size="sm"
          style={[
            styles.quickFilterText,
            activeFilter === filter.id && styles.quickFilterTextActive,
          ]}
        />
      </TouchableOpacity>
    ),
    [activeFilter, trackClick],
  )

  return (
    <View style={styles.screenContainer}>
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        <LinearGradient
          colors={HEADER_GRADIENTS.primary}
          style={[styles.headerGradient, { paddingTop: insets.top }]}
        >
          <View style={styles.header}>
            <Text
              text="Transactions"
              size="xl"
              weight="bold"
              style={styles.headerTitle}
            />

            {/* Filter Button in Header */}
            <TouchableOpacity
              style={styles.filterButton}
              onPress={isDrawerOpen ? closeDrawer : openDrawer}
            >
              <Ionicons
                name="funnel-outline"
                size={24}
                color={theme.colors.palette.neutral100}
              />
            </TouchableOpacity>
          </View>

          <FlatList
            horizontal
            data={QUICK_FILTERS}
            renderItem={renderQuickFilter}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            style={styles.quickFilters}
            contentContainerStyle={styles.quickFiltersContent}
          />
        </LinearGradient>

        {isLoading && page === 1 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.palette.primary500}
            />
          </View>
        ) : (
          <View style={styles.listContainer}>
            <VirtualizedList
              data={transactions}
              renderItem={renderTransaction}
              keyExtractor={(item: Transaction) => item.id.toString()}
              getItemCount={data => data.length}
              getItem={(data, index) => data[index]}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor={theme.colors.palette.primary500}
                  colors={[theme.colors.palette.primary500]}
                />
              }
              ListEmptyComponent={EmptyComponent}
              ListFooterComponent={
                hasMore && !isRefreshing ? (
                  <View style={styles.footer}>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.palette.primary500}
                    />
                  </View>
                ) : null
              }
              removeClippedSubviews={Platform.OS === 'android'}
              maxToRenderPerBatch={10}
              windowSize={10}
              initialNumToRender={10}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.listContent,
                !transactions.length && styles.transactionFlex,
              ]}
              style={styles.list}
            />
          </View>
        )}

        {/* Filter drawer */}
        <FilterDrawer />

        {/* Touch-blocking overlay when drawer is open */}
        <Animated.View
          style={[styles.overlay, overlayAnimatedStyle]}
          onTouchStart={closeDrawer}
        />
      </Animated.View>
    </View>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    listContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    list: {
      flex: 1,
    },
    headerGradient: {
      paddingHorizontal: metrics.medium,
      paddingBottom: metrics.medium,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      zIndex: 1,
      elevation: 4,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: metrics.medium,
    },
    headerTitle: {
      color: theme.colors.palette.neutral100,
      flex: 1,
    },
    filterButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${theme.colors.palette.neutral100}26`,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: metrics.xxl * 2,
    },
    emptyStateText: {
      color: theme.colors.textDim,
      marginTop: metrics.medium,
    },
    transactionFlex: {
      flex: 1,
    },
    transactionItem: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
      padding: metrics.medium,
      marginBottom: metrics.medium,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
    },
    iconContainer: {
      width: metrics.buttonHeight * 0.8,
      height: metrics.buttonHeight * 0.8,
      borderRadius: metrics.borderRadiusXL,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: metrics.medium,
    },
    transactionInfo: {
      flex: 1,
    },
    transactionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: metrics.tiny,
    },
    description: {
      flex: 1,
      marginRight: metrics.small,
    },
    amountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.tiny,
    },
    amount: {
      fontSize: metrics.text.large,
    },
    currency: {
      color: theme.colors.textDim,
      fontSize: metrics.text.small,
    },
    transactionDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: metrics.small,
    },
    date: {
      color: theme.colors.textDim,
      fontSize: metrics.text.small,
    },
    reference: {
      color: theme.colors.textDim,
      fontSize: metrics.text.small,
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: metrics.small,
      paddingVertical: metrics.tiny,
      borderRadius: metrics.borderRadiusSmall,
      alignSelf: 'flex-start',
    },
    statusText: {
      textTransform: 'capitalize',
      fontSize: metrics.text.tiny,
      fontWeight: '600',
    },
    quickFilters: {
      marginTop: metrics.medium,
    },
    quickFiltersContent: {
      paddingRight: metrics.medium,
    },
    quickFilterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.tiny,
      paddingHorizontal: metrics.medium,
      paddingVertical: metrics.small,
      backgroundColor: `${theme.colors.palette.neutral100}1A`,
      borderRadius: metrics.borderRadiusLarge,
      marginRight: metrics.small,
    },
    quickFilterButtonActive: {
      backgroundColor: theme.colors.palette.neutral100,
    },
    quickFilterText: {
      color: theme.colors.palette.neutral100,
    },
    quickFilterTextActive: {
      color: theme.colors.palette.primary500,
    },
    filterDrawer: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: DRAWER_WIDTH,
      backgroundColor: 'transparent',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: -2, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 20,
      zIndex: 10,
    },
    filterDrawerContent: {
      flex: 1,
      borderTopLeftRadius: 24,
      borderBottomLeftRadius: 24,
      overflow: 'hidden',
      borderLeftWidth: 1,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: `${theme.colors.palette.neutral900}0D`,
    },
    filterHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: metrics.medium,
      borderBottomWidth: 1,
      borderBottomColor: `${theme.colors.palette.neutral900}08`,
      backgroundColor: `${theme.colors.palette.neutral100}80`,
    },
    filterTitle: {
      color: theme.colors.text,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${theme.colors.palette.neutral900}0D`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterList: {
      flex: 1,
    },
    filterListContent: {
      paddingBottom: metrics.medium,
    },
    filterSection: {
      padding: metrics.medium,
      borderBottomWidth: 1,
      borderBottomColor: `${theme.colors.palette.neutral900}08`,
      backgroundColor: `${theme.colors.palette.neutral100}80`,
    },
    sectionTitle: {
      marginBottom: metrics.medium,
      color: theme.colors.text,
    },
    filterOption: {
      marginBottom: metrics.small,
      borderRadius: metrics.borderRadiusLarge,
      overflow: 'hidden',
    },
    filterOptionGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.small,
      padding: metrics.medium,
    },
    filterOptionActive: {
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    filterOptionText: {
      color: theme.colors.text,
    },
    filterOptionTextActive: {
      color: theme.colors.palette.neutral100,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.medium,
    },
    applyButton: {
      borderRadius: metrics.borderRadiusLarge,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    headerApplyButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 0,
    },
    listContent: {
      paddingHorizontal: metrics.medium,
      paddingBottom: metrics.large,
    },
    footer: {
      paddingVertical: metrics.medium,
      alignItems: 'center',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: `${theme.colors.palette.neutral900}80`,
      zIndex: 5,
    },
  })
