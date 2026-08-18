// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Screen, Text } from '@/components'
import { TRANSACTION_PERIODS } from '@/data/mock-home'
import { queries } from '@/db/queries'
import { reopenConnection, sqlite } from '@/db'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useStores } from '@/models'
import { metrics, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
} from 'react-native-reanimated'
import { observer } from 'mobx-react-lite'

const HEADER_CONTENT_HEIGHT = 260 // Height needed for logo, welcome text, balance card
const HEADER_HEIGHT = HEADER_CONTENT_HEIGHT + 56 // Standard Material Design toolbar height
const TOOLBAR_HEIGHT = 100
const HEADER_SCROLL_DISTANCE = HEADER_HEIGHT - TOOLBAR_HEIGHT

// Define the TransactionPeriod type
export type TransactionPeriod =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'

interface TransactionSummary {
  stats: {
    label: string
    amount: number
    count?: number
    color: string
    icon: keyof typeof Ionicons.glyphMap
  }[]
  summary: {
    totalTransactions: number
    transfersSentCount: number
    transfersReceivedCount: number
    depositCount: number
    withdrawalCount: number
  }
}

interface RecentReceipt {
  id: number
  amount: number
  type: 'transfer'
  status: 'completed' | 'pending' | 'failed'
  description: string
  createdAt: string
  senderWalletId: number
  receiverWalletId: number
  contactName: string
}

interface RecentContact {
  userId: number
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  lastTransactionAt: string
}

function HomeScreen() {
  const { theme } = useAppTheme()
  const router = useRouter()
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false)
  const [selectedPeriod, setSelectedPeriod] =
    useState<TransactionPeriod>('last_month')

  const styles = createStyles(theme)
  const HEADER_GRADIENTS = {
    primary: [
      theme.colors.palette.primary400,
      theme.colors.palette.secondary400,
    ] as [string, string],
    action: [
      theme.colors.palette.accent400,
      theme.colors.palette.accent400,
    ] as [string, string],
    card: [
      `${theme.colors.palette.neutral100}1A`,
      `${theme.colors.palette.neutral100}0D`,
    ] as [string, string],
  }
  const scrollY = useSharedValue(0)
  const { t } = useTranslation()
  const { userStore, sessionStore, uiStore } = useStores()
  const userProfile = userStore.userProfile
  const [showQRCode, setShowQRCode] = useState(false)
  const overlayAnimation = useSharedValue(0)
  const contentAnimation = useSharedValue(0)
  const [walletBalance, setWalletBalance] = useState<string>('0.00')
  const [transactionSummary, setTransactionSummary] =
    useState<TransactionSummary | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [recentReceipts, setRecentReceipts] = useState<RecentReceipt[]>([])
  const [recentContacts, setRecentContacts] = useState<RecentContact[]>([])
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)

  // Setup interaction tracking
  const { width, height } = Dimensions.get('window')
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('Home', '/(tabs)/home')

  // Load session data if exists
  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession(sessionId as string)

      if (session?.data?.sessionData) {
        const savedState = session.data.sessionData.formData as any

        // Restore state from session
        if (savedState) {
          // Restore selected period if exists
          if (savedState.selectedPeriod) {
            setSelectedPeriod(savedState.selectedPeriod)
          }
          if (savedState.showPeriodDropdown) {
            setSelectedPeriod(savedState.showPeriodDropdown)
          }

          // Restore QR code state if exists
          if (savedState.showQRCode) {
            setShowQRCode(savedState.showQRCode)

            // Animate overlay and content if QR was visible
            if (savedState.showQRCode) {
              overlayAnimation.value = 1
              contentAnimation.value = 1
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
    } else {
      // When no session exists, just set isSessionLoaded to true
      setIsSessionLoaded(true)
    }
  }, [sessionTimeStamp, sessionId, sessionStore])

  // Combine fetchWalletBalance and fetchTransactionSummary into a single refresh function
  // Helper function to retry database operations
  const retryDatabaseOperation = async (
    operation: () => Promise<any>,
    maxRetries = 5,
  ) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Check if database is ready by attempting a simple operation
        try {
          await sqlite.execAsync('SELECT 1')
        } catch (error) {
          console.log('Database not ready, attempting to reopen...')
          await reopenConnection()
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }

        return await operation()
      } catch (error: any) {
        const errorMessage = error?.message || ''

        // Check if it's a database connection/reset related error
        const isDatabaseError =
          errorMessage.includes('Access to closed resource') ||
          errorMessage.includes('Database not ready') ||
          errorMessage.includes('database is locked') ||
          errorMessage.includes('no such table') ||
          errorMessage.includes('database connection') ||
          errorMessage.includes('NativeStatement.runSync') ||
          errorMessage.includes('NativeDatabase.prepareSync') ||
          errorMessage.includes('Database not available')

        if (isDatabaseError && i < maxRetries - 1) {
          console.log(`Database error, retrying... (${i + 1}/${maxRetries})`)
          // Try to reopen connection
          try {
            await reopenConnection()
          } catch (reopenError) {
            console.error('Failed to reopen database:', reopenError)
          }
          // Exponential backoff for database errors
          const delay = Math.min(1000 * Math.pow(2, i), 5000)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        // For other errors, use linear backoff
        if (i < maxRetries - 1) {
          console.log(`Other error, retrying... (${i + 1}/${maxRetries})`)
          const delay = 500 * (i + 1)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        throw error
      }
    }
  }

  const refreshData = useCallback(async () => {
    if (!userStore.userProfile?.id) {
      console.error('User not found')
      return
    }

    try {
      const wallets = await retryDatabaseOperation(() =>
        queries.getActiveWallets(userStore.userProfile!.id),
      )

      if (!wallets || wallets.length === 0) {
        throw new Error('No active wallet found')
      }

      const walletId = wallets[0].id

      const wallet = await retryDatabaseOperation(() =>
        queries.getWalletById(walletId),
      )

      if (wallet) {
        setWalletBalance(wallet.balance.toFixed(2))

        // Track content change after wallet balance update
        trackContentChange({
          walletBalance: wallet.balance.toFixed(2),
          timestamp: Date.now(),
        })
      }

      await fetchTransactionSummary()
      await fetchRecentReceipts()
      await fetchRecentContacts()
    } catch (error) {
      console.error('Failed to refresh data:', error)
      // Don't recursively call refreshData to avoid infinite loops
    }
  }, [userStore.userProfile?.id, selectedPeriod, trackContentChange])

  // Add useFocusEffect to refresh data when tab is focused
  useFocusEffect(
    useCallback(() => {
      if (isSessionLoaded) {
        refreshData()

        // Track content change on focus effect
        trackScreenMount({
          walletBalance,
          selectedPeriod,
          isLoadingSummary,
          isRefreshing,
          showQRCode,
          showPeriodDropdown,
          timestamp: Date.now(),
          platform: Platform.OS,
          screenDimensions: {
            width,
            height,
          },
          userProfileId: userStore.userProfile?.id,
          sessionId,
        })
      }
    }, [
      isSessionLoaded,
      refreshData,
      selectedPeriod,
      trackContentChange,
      sessionTimeStamp,
      showQRCode,
      showPeriodDropdown,
      sessionStore,
    ]),
  )

  const getDateRangeForPeriod = (
    period: TransactionPeriod,
  ): [string, string] => {
    const now = new Date()
    const endDate = now.toISOString()
    let startDate: Date

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0))
        break
      case 'this_week':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()))
        break
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        break
      case 'last_3_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        break
      default:
        startDate = new Date(now.setDate(now.getDate() - 30))
    }

    return [startDate.toISOString(), endDate]
  }

  const fetchTransactionSummary = async () => {
    try {
      setIsLoadingSummary(true)
      if (!userStore.userProfile?.id) {
        throw new Error('User not found')
      }

      // Get user's active wallet
      const wallets = await queries.getActiveWallets(userStore.userProfile.id)
      if (!wallets || wallets.length === 0) {
        throw new Error('No active wallet found')
      }

      const [startDate, endDate] = getDateRangeForPeriod(selectedPeriod)
      const summary = await queries.getTransactionSummary(
        wallets[0].id,
        startDate,
        endDate,
      )

      if (summary) {
        // Calculate total money in and out
        const totalMoneyIn =
          (summary.stats.find(s => s.label === 'P2P Received')?.amount || 0) +
          (summary.stats.find(s => s.label === 'Deposits')?.amount || 0)
        const totalMoneyOut =
          (summary.stats.find(s => s.label === 'P2P Sent')?.amount || 0) +
          (summary.stats.find(s => s.label === 'Withdrawals')?.amount || 0)

        const typedSummary: TransactionSummary = {
          stats: [
            {
              label: 'Total In',
              amount: totalMoneyIn,
              color: theme.colors.palette.success500,
              icon: 'trending-up',
            },
            {
              label: 'Total Out',
              amount: totalMoneyOut,
              color: theme.colors.palette.angry500,
              icon: 'trending-down',
            },
            {
              label: 'Sent',
              amount:
                summary.stats.find(s => s.label === 'P2P Sent')?.amount || 0,
              count:
                summary.stats.find(s => s.label === 'P2P Sent')?.count || 0,
              color: theme.colors.palette.accent500,
              icon: 'arrow-forward',
            },
            {
              label: 'Received',
              amount:
                summary.stats.find(s => s.label === 'P2P Received')?.amount ||
                0,
              count:
                summary.stats.find(s => s.label === 'P2P Received')?.count || 0,
              color: theme.colors.palette.primary500,
              icon: 'arrow-back',
            },
            {
              label: 'Deposits',
              amount:
                summary.stats.find(s => s.label === 'Deposits')?.amount || 0,
              count:
                summary.stats.find(s => s.label === 'Deposits')?.count || 0,
              color: theme.colors.palette.success500,
              icon: 'wallet',
            },
            {
              label: 'Withdrawals',
              amount:
                summary.stats.find(s => s.label === 'Withdrawals')?.amount || 0,
              count:
                summary.stats.find(s => s.label === 'Withdrawals')?.count || 0,
              color: theme.colors.palette.angry500,
              icon: 'cash',
            },
          ],
          summary: summary.summary,
        }
        setTransactionSummary(typedSummary)
      }
    } catch (error) {
      console.error('Error fetching transaction summary:', error)
    } finally {
      setIsLoadingSummary(false)
    }
  }

  const fetchRecentReceipts = async () => {
    try {
      if (!userStore.userProfile?.id) return

      const wallets = await queries.getActiveWallets(userStore.userProfile.id)
      if (!wallets || wallets.length === 0) return

      const transactions = await queries.getTransactionsByType(
        wallets[0].id,
        'transfer',
        1,
        5,
      )

      // Get contact information for each transaction
      const receiptsWithContacts = await Promise.all(
        transactions.map(
          async (transaction: {
            id: number
            amount: number
            type: 'transfer'
            status: 'completed' | 'pending' | 'failed'
            description: string
            createdAt: string
            senderWalletId: number
            receiverWalletId: number
          }) => {
            const otherWalletId =
              transaction.senderWalletId === wallets[0].id
                ? transaction.receiverWalletId
                : transaction.senderWalletId

            // Get wallet owner's information
            const wallet = await queries.getWalletById(otherWalletId)
            if (!wallet) return null

            // Get user information
            const user = await queries.getUserById(wallet.userId)
            if (!user) return null

            return {
              ...transaction,
              contactName: `${user.firstName} ${user.lastName}`,
            }
          },
        ),
      )

      setRecentReceipts(receiptsWithContacts.filter(Boolean) as RecentReceipt[])
    } catch (error) {
      console.error('Error fetching recent receipts:', error)
    }
  }

  const fetchRecentContacts = async () => {
    try {
      if (!userStore.userProfile?.id) return
      const contacts = await queries.getRecentContactsFromTransactions(
        userStore.userProfile.id,
      )
      setRecentContacts(contacts)
    } catch (error) {
      console.error('Error fetching recent contacts:', error)
    }
  }

  useEffect(() => {
    fetchTransactionSummary()
    fetchRecentReceipts()
    fetchRecentContacts()
  }, [selectedPeriod, userStore.userProfile?.id])

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      const velocity = (event.velocity ?? 0) as number

      if (Math.abs(velocity) > 500) {
        scrollY.value = withDecay({
          velocity,
          clamp: [0, HEADER_SCROLL_DISTANCE],
        })
      } else {
        scrollY.value = event.contentOffset.y
      }
    },
    onBeginDrag: () => {
      // Optional: Add effects when starting to scroll
    },
    onEndDrag: () => {
      if (scrollY.value < HEADER_SCROLL_DISTANCE / 2) {
        scrollY.value = withSpring(0, {
          damping: 15,
          stiffness: 100,
        })
      } else {
        scrollY.value = withSpring(HEADER_SCROLL_DISTANCE, {
          damping: 15,
          stiffness: 100,
        })
      }
    },
  })

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, HEADER_SCROLL_DISTANCE],
      [0, -HEADER_SCROLL_DISTANCE],
      Extrapolate.CLAMP,
    )

    return {
      transform: [
        {
          translateY: withSpring(translateY, {
            damping: 20,
            stiffness: 90,
            mass: 0.5,
          }),
        },
      ],
    }
  })

  const toolbarAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [HEADER_SCROLL_DISTANCE - 40, HEADER_SCROLL_DISTANCE],
      [0, 1],
      Extrapolate.CLAMP,
    )

    const scale = interpolate(
      scrollY.value,
      [HEADER_SCROLL_DISTANCE - 40, HEADER_SCROLL_DISTANCE],
      [0.8, 1],
      Extrapolate.CLAMP,
    )

    return {
      opacity: withSpring(opacity, {
        damping: 15,
        stiffness: 100,
      }),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [HEADER_SCROLL_DISTANCE - 40, HEADER_SCROLL_DISTANCE],
            [-20, 0],
            Extrapolate.CLAMP,
          ),
        },
        {
          scale: withSpring(scale, {
            damping: 15,
            stiffness: 100,
          }),
        },
      ],
    }
  })

  const headerContentStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, HEADER_SCROLL_DISTANCE],
      [1, 0.95],
      Extrapolate.CLAMP,
    )

    return {
      transform: [
        {
          scale: withSpring(scale, {
            damping: 15,
            stiffness: 100,
          }),
        },
      ],
    }
  })

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayAnimation.value,
    }
  })

  const contentStyle = useAnimatedStyle(() => {
    return {
      opacity: contentAnimation.value,
      transform: [
        {
          scale: interpolate(contentAnimation.value, [0, 1], [0.9, 1]),
        },
      ],
    }
  })

  const handleQRPress = useCallback(() => {
    // Track click event
    trackClick('qrCodeButton')

    setShowQRCode(true)
    overlayAnimation.value = withSpring(1, { damping: 15 })
    contentAnimation.value = withSpring(1, {
      damping: 20,
      stiffness: 100,
    })

    // Track content change after QR code is shown
    trackContentChange({
      event: 'qr_code_shown',
      timestamp: Date.now(),
    })
  }, [
    trackClick,
    trackContentChange,
    sessionId,
    sessionStore,
    selectedPeriod,
    walletBalance,
  ])

  const handleClose = useCallback(() => {
    // Track click event
    trackClick('closeQRButton')

    contentAnimation.value = withSpring(0, {
      damping: 15,
      stiffness: 100,
    })
    overlayAnimation.value = withSpring(0, { damping: 15 })
    setTimeout(() => {
      setShowQRCode(false)

      // Track content change after QR code is hidden
      trackContentChange({
        event: 'qr_code_hidden',
        timestamp: Date.now(),
      })
    }, 300)
  }, [
    trackClick,
    trackContentChange,
    sessionId,
    sessionStore,
    selectedPeriod,
    walletBalance,
  ])

  useEffect(() => {
    refreshData()
  }, [uiStore.mockDataAppendTime])

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)

    // Track content change when refresh starts
    trackContentChange({
      event: 'pull_to_refresh_started',
      timestamp: Date.now(),
    })

    await refreshData()
    setIsRefreshing(false)

    // Track content change when refresh completes
    trackContentChange({
      event: 'pull_to_refresh_completed',
      timestamp: Date.now(),
    })
  }, [refreshData, trackContentChange])

  const renderTransactionSummary = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text
          text={t('homeScreen:transactions.title')}
          size="lg"
          weight="bold"
        />
        <View style={styles.periodSelectorContainer}>
          <TouchableOpacity
            style={styles.periodSelector}
            onPress={() => setShowPeriodDropdown(!showPeriodDropdown)}
          >
            <Text
              text={
                TRANSACTION_PERIODS.find(p => p.id === selectedPeriod)?.label
              }
              size="sm"
              style={styles.periodText}
            />
            <Ionicons
              name={showPeriodDropdown ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={theme.colors.text}
            />
          </TouchableOpacity>

          {showPeriodDropdown && (
            <View style={styles.periodDropdown}>
              {TRANSACTION_PERIODS.map(period => (
                <TouchableOpacity
                  key={period.id}
                  style={[
                    styles.periodOption,
                    selectedPeriod === period.id && styles.periodOptionSelected,
                  ]}
                  onPress={() => {
                    // Track click event when period option is selected
                    trackClick(`periodOption_${period.id}`)

                    setSelectedPeriod(period.id)
                    setShowPeriodDropdown(false)

                    // Track content change when period is selected
                    trackContentChange({
                      event: 'period_selected',
                      selectedPeriod: period.id,
                      periodLabel: period.label,
                      timestamp: Date.now(),
                    })
                  }}
                >
                  <Text
                    text={period.label}
                    size="sm"
                    style={[
                      styles.periodOptionText,
                      selectedPeriod === period.id &&
                        styles.periodOptionTextSelected,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {isLoadingSummary ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.primary500}
          />
        </View>
      ) : transactionSummary ? (
        <View style={styles.summaryContainer}>
          {/* Total Money Summary */}
          <View style={styles.totalMoneyContainer}>
            <View style={styles.totalMoneyItem}>
              <View style={styles.totalMoneyHeader}>
                <Ionicons
                  name="trending-up"
                  size={20}
                  color={theme.colors.palette.success500}
                />
                <Text
                  text="Total In"
                  size="sm"
                  style={styles.totalMoneyLabel}
                />
              </View>
              <Text
                text={`$${transactionSummary.stats[0].amount.toFixed(2)}`}
                size="xl"
                weight="bold"
                style={[styles.totalMoneyValue, styles.textGreen]}
              />
            </View>
            <View style={styles.totalMoneySeparator} />
            <View style={styles.totalMoneyItem}>
              <View style={styles.totalMoneyHeader}>
                <Ionicons
                  name="trending-down"
                  size={20}
                  color={theme.colors.palette.angry500}
                />
                <Text
                  text="Total Out"
                  size="sm"
                  style={styles.totalMoneyLabel}
                />
              </View>
              <Text
                text={`$${transactionSummary.stats[1].amount.toFixed(2)}`}
                size="xl"
                weight="bold"
                style={[styles.totalMoneyValue, styles.textRed]}
              />
            </View>
          </View>

          {/* Transaction Cards */}
          <View style={styles.transactionGrid}>
            {transactionSummary.stats.slice(2).map(stat => (
              <View
                key={stat.label}
                style={[
                  styles.statItem,
                  {
                    backgroundColor: `${stat.color}08`,
                    borderColor: `${stat.color}15`,
                  },
                ]}
              >
                <View style={styles.transactionCardContent}>
                  <View style={styles.transactionCardHeader}>
                    <View
                      style={[
                        styles.transactionCardIcon,
                        { backgroundColor: `${stat.color}15` },
                      ]}
                    >
                      <Ionicons name={stat.icon} size={20} color={stat.color} />
                    </View>
                    {stat.count !== undefined && (
                      <View
                        style={[
                          styles.transactionCountBadge,
                          { backgroundColor: `${stat.color}15` },
                        ]}
                      >
                        <Text
                          text={`${stat.count} txns`}
                          size="xs"
                          style={[
                            styles.transactionCountText,
                            { color: stat.color },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                  <Text
                    text={stat.label}
                    size="md"
                    weight="bold"
                    style={[
                      styles.transactionCardLabel,
                      { color: theme.colors.text },
                    ]}
                  />
                  <Text
                    text={`$${stat.amount.toFixed(2)}`}
                    size="lg"
                    weight="bold"
                    style={[
                      styles.transactionCardAmount,
                      { color: stat.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text
            text="No transaction data available"
            size="sm"
            style={styles.emptyStateText}
          />
        </View>
      )}
    </View>
  )

  const renderRecentReceipts = () => {
    if (!recentReceipts || recentReceipts.length === 0) return null

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.headerWithBadge}>
            <Text text="Recent Receipts" size="lg" weight="bold" />
            <View style={styles.newBadge}>
              <Text text="P2P" size="xs" style={styles.newBadgeText} />
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              // Track click event when "View All" is clicked
              trackClick('viewAllReceipts')
              router.push('/transactions')

              // Track content change
              trackContentChange({
                event: 'navigate_to_all_transactions',
                timestamp: Date.now(),
              })
            }}
          >
            <Text text="View All" size="sm" style={styles.viewAll} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentTransactionsContainer}
        >
          {recentReceipts.map((receipt, index) => (
            <TouchableOpacity
              key={`receipt-${receipt.id}-${index}`}
              style={styles.recentTransactionCard}
              onPress={() => router.push(`/screens/transaction/${receipt.id}`)}
            >
              <View style={styles.recentTransactionHeader}>
                <View
                  style={[
                    styles.recentTransactionIcon,
                    receipt.senderWalletId === userStore.userProfile?.id
                      ? styles.containerOrangeBackground
                      : styles.containerBlueBackground,
                  ]}
                >
                  <Ionicons
                    name={
                      receipt.senderWalletId === userStore.userProfile?.id
                        ? 'arrow-forward'
                        : 'arrow-back'
                    }
                    size={20}
                    color={theme.colors.palette.neutral100}
                  />
                </View>
                <View
                  style={[
                    styles.recentTransactionStatus,
                    receipt.status === 'completed'
                      ? styles.containerGreenBackground
                      : styles.containerRedBackground,
                  ]}
                >
                  <Text
                    text={receipt.status}
                    size="xs"
                    style={[
                      styles.recentTransactionStatusText,
                      receipt.status === 'completed'
                        ? styles.textGreen
                        : styles.textRed,
                    ]}
                  />
                </View>
              </View>

              <Text
                text={receipt.contactName}
                size="md"
                weight="bold"
                style={styles.recentTransactionDescription}
              />

              <Text
                text={`$${receipt.amount.toFixed(2)}`}
                size="lg"
                weight="bold"
                style={[
                  styles.recentTransactionAmount,
                  receipt.senderWalletId === userStore.userProfile?.id
                    ? styles.textOrange
                    : styles.textBlue,
                ]}
              />

              <Text
                text={new Date(receipt.createdAt).toLocaleDateString()}
                size="xs"
                style={styles.recentTransactionDate}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )
  }

  const renderRecentContacts = () => {
    if (!recentContacts || recentContacts.length === 0) return null

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.headerWithBadge}>
            <Text text="Recent Contacts" size="lg" weight="bold" />
            <View style={styles.newBadge}>
              <Text text="P2P" size="xs" style={styles.newBadgeText} />
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              // Track click event when "View All" is clicked
              trackClick('viewAllContacts')

              router.push('contacts' as any)

              // Track content change
              trackContentChange({
                event: 'navigate_to_all_contacts',
                timestamp: Date.now(),
              })
            }}
          >
            <Text text="View All" size="sm" style={styles.viewAll} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentContactsContainer}
        >
          {recentContacts.map((contact, index) => (
            <TouchableOpacity
              key={`contact-${contact.userId}-${index}`}
              style={styles.recentContactCard}
              onPress={() => {
                // Track click event when contact is clicked
                trackClick(`contact_${contact.userId}`)

                router.push(`/screens/contact/${contact.userId}`)

                // Track content change when navigating to contact details
                trackContentChange({
                  event: 'navigate_to_contact_details',
                  contactId: contact.userId,
                  contactName: `${contact.firstName} ${contact.lastName}`,
                  timestamp: Date.now(),
                })
              }}
            >
              <View style={styles.contactAvatarContainer}>
                <View style={styles.contactAvatar}>
                  <Text
                    text={`${contact.firstName[0]}${contact.lastName[0]}`}
                    size="lg"
                    style={styles.contactAvatarText}
                  />
                </View>
              </View>
              <Text
                text={`${contact.firstName}`}
                size="sm"
                weight="bold"
                style={styles.contactName}
                numberOfLines={1}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )
  }

  return (
    <Screen
      preset="fixed"
      backgroundColor={theme.colors.palette.neutral100}
      contentContainerStyle={styles.container}
    >
      {showQRCode && (
        <Animated.View style={[styles.overlayContainer, overlayStyle]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
          <Animated.View style={[styles.modalContent, contentStyle]}>
            <LinearGradient
              colors={[
                theme.colors.palette.neutral800,
                theme.colors.palette.neutral900,
              ]}
              style={styles.modalInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="close-circle"
                  size={28}
                  color={theme.colors.palette.neutral100}
                />
              </TouchableOpacity>

              <Text
                text="Scan QR Code"
                preset="heading"
                style={styles.qrTitle}
              />
              <Text
                text="Share this code to receive payment"
                size="sm"
                style={styles.qrSubtitle}
              />

              <View style={styles.qrWrapper}>
                <QRCode
                  value={String(userStore.userProfile?.id || 'guest')}
                  size={220}
                  backgroundColor="white"
                  color="black"
                />
              </View>

              <Text
                text={userStore.userProfile?.displayName || 'Guest User'}
                preset="heading"
                style={styles.username}
              />
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      )}

      {/* Animated Toolbar */}
      <Animated.View style={[styles.toolbar, toolbarAnimatedStyle]}>
        <LinearGradient
          colors={HEADER_GRADIENTS.primary}
          style={styles.toolbarGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.toolbarContent}>
            <View style={styles.balanceRow}>
              <LinearGradient
                colors={HEADER_GRADIENTS.action}
                style={styles.logoContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Image
                  source={require('../../../assets/images/logo.png')}
                  style={styles.logo}
                />
              </LinearGradient>
              <Text
                text={t('homeScreen:welcome.andojoPay')}
                size="xl"
                style={[styles.glitterText, { marginLeft: metrics.small }]}
              />
            </View>
            <View
              style={[
                styles.headerActions,
                { marginTop: metrics.xxl, marginRight: metrics.small },
              ]}
            >
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={handleQRPress}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                  style={styles.actionButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name="qr-code-outline"
                    size={22}
                    color={theme.colors.palette.neutral100}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.palette.primary500}
            colors={[theme.colors.palette.primary500]}
            progressBackgroundColor={theme.colors.palette.neutral200}
          />
        }
      >
        {/* Header Section */}
        <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
          <LinearGradient
            colors={HEADER_GRADIENTS.primary}
            style={styles.headerGradient}
          >
            <Animated.View style={headerContentStyle}>
              <View style={styles.header}>
                <View style={styles.headerContent}>
                  <LinearGradient
                    colors={HEADER_GRADIENTS.action}
                    style={styles.logoContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Image
                      source={require('../../../assets/images/logo.png')}
                      style={styles.logo}
                    />
                  </LinearGradient>
                  <View style={styles.userProfileContainer}>
                    <Text
                      text={t('homeScreen:welcome.greeting')}
                      size="sm"
                      style={styles.welcomeText}
                      numberOfLines={1}
                    />
                    <Text
                      text={
                        userProfile?.displayName ||
                        t('homeScreen:welcome.userName')
                      }
                      preset="heading"
                      style={styles.userName}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    />
                  </View>
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={styles.headerActionButton}
                    onPress={handleQRPress}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={[
                        'rgba(255,255,255,0.2)',
                        'rgba(255,255,255,0.1)',
                      ]}
                      style={styles.actionButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons
                        name="qr-code-outline"
                        size={22}
                        color={theme.colors.palette.neutral100}
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              <LinearGradient
                colors={HEADER_GRADIENTS.card}
                style={styles.balanceCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.balanceHeader}>
                  <View>
                    <View style={styles.walletLabel}>
                      <Ionicons
                        name="wallet-outline"
                        size={18}
                        color={theme.colors.palette.neutral100}
                      />
                      <Text
                        text={t('homeScreen:wallet.balance')}
                        size="sm"
                        style={styles.balanceLabel}
                      />
                    </View>
                    <View style={styles.balanceRow}>
                      <Text
                        text="$"
                        size="lg"
                        style={[styles.currencySymbol, styles.glitterText]}
                      />
                      <Text
                        text={walletBalance.split('.')[0]}
                        size="xxl"
                        style={[styles.balanceMain, styles.glitterText]}
                      />
                      <Text
                        text={`.${walletBalance.split('.')[1]}`}
                        size="lg"
                        style={[styles.balanceCents, styles.glitterText]}
                      />
                    </View>
                  </View>
                  <View style={styles.balanceActions}>
                    <TouchableOpacity
                      style={styles.balanceActionButton}
                      onPress={() => {
                        // Track click event when "Add Money" is clicked
                        trackClick('addMoneyButton')

                        router.push('/screens/payment/add-money' as any)

                        // Track content change
                        trackContentChange({
                          event: 'navigate_to_add_money',
                          currentBalance: walletBalance,
                          timestamp: Date.now(),
                        })
                      }}
                    >
                      <LinearGradient
                        colors={[
                          theme.colors.palette.primary400 + '40',
                          theme.colors.palette.primary500 + '40',
                        ]}
                        style={styles.actionButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons
                          name="wallet-outline"
                          size={24}
                          color={theme.colors.palette.neutral100}
                        />

                        <Text
                          text={t('homeScreen:wallet.deposit')}
                          size="xs"
                          style={styles.actionButtonText}
                        />
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.balanceActionButton}
                      onPress={() => {
                        // Track click event when "Withdraw" is clicked
                        trackClick('withdrawButton')

                        router.push('/screens/payment/withdraw' as any)

                        // Track content change
                        trackContentChange({
                          event: 'navigate_to_withdraw',
                          currentBalance: walletBalance,
                          timestamp: Date.now(),
                        })
                      }}
                    >
                      <LinearGradient
                        colors={[
                          theme.colors.palette.angry500 + '40',
                          theme.colors.palette.angry100 + '40',
                        ]}
                        style={styles.actionButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons
                          name="cash-outline"
                          size={24}
                          color={theme.colors.palette.neutral100}
                        />

                        <Text
                          text={t('homeScreen:wallet.withdraw')}
                          size="xs"
                          style={styles.actionButtonText}
                        />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          </LinearGradient>
        </Animated.View>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {renderRecentContacts()}
          {renderTransactionSummary()}

          {renderRecentReceipts()}
          {/* Promotional Banners */}
          {/* <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                text={t('homeScreen:featured.title')}
                size="lg"
                weight="bold"
              />
              <TouchableOpacity>
                <Text
                  text={t('homeScreen:featured.viewAll')}
                  size="sm"
                  style={styles.viewAll}
                />
              </TouchableOpacity>
            </View> */}

          {/* <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bannersContainer}
            >
              {PROMO_BANNERS.map(banner => (
                <TouchableOpacity
                  key={banner.id}
                  style={[
                    styles.banner,
                    { backgroundColor: banner.backgroundColor },
                  ]}
                  onPress={() => {
                    // Track click event when promotional banner is clicked
                    trackClick(`promoBanner_${banner.id}`)

                    Linking.openURL(banner.url)

                    // Track content change
                    trackContentChange({
                      event: 'promo_banner_clicked',
                      bannerId: banner.id,
                      bannerTitle: banner.title,
                      timestamp: Date.now(),
                    })
                  }}
                >
                  <Image
                    source={{ uri: banner.image }}
                    style={styles.bannerImage}
                  />
                  <View style={styles.bannerContent}>
                    <Text
                      text={banner.title}
                      size="lg"
                      weight="bold"
                      style={styles.bannerTitle}
                    />
                    <Text
                      text={banner.description}
                      size="sm"
                      style={styles.bannerDescription}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView> */}
          {/* </View> */}

          {/* Credit Card Products Section */}
          {/* <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.headerWithBadge}>
                <Text text="Credit Cards" size="lg" weight="bold" />
                <View style={styles.newBadge}>
                  <Text text="New" size="xs" style={styles.newBadgeText} />
                </View>
              </View>
              <TouchableOpacity>
                <Text text="Compare All" size="sm" style={styles.viewAll} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.loanBannersContainer}
            >
              {CREDIT_CARD_BANNERS.map(card => (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.loanBanner,
                    { backgroundColor: card.backgroundColor },
                  ]}
                  onPress={() => {
                    // Track click event when credit card banner is clicked
                    trackClick(`creditCardBanner_${card.id}`)

                    Linking.openURL(card.url)

                    // Track content change
                    trackContentChange({
                      event: 'credit_card_banner_clicked',
                      cardId: card.id,
                      cardTitle: card.title,
                      timestamp: Date.now(),
                    })
                  }}
                >
                  <Image
                    source={{ uri: card.image }}
                    style={styles.loanBannerImage}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.3)']}
                    style={styles.loanGradient}
                  >
                    <View style={styles.loanContent}>
                      <Text
                        text={card.title}
                        size="lg"
                        weight="bold"
                        style={styles.loanTitle}
                      />
                      <Text
                        text={card.description}
                        size="sm"
                        style={styles.loanDescription}
                      />
                      <View style={styles.applyButton}>
                        <Text
                          text="Apply Now"
                          size="sm"
                          style={styles.applyButtonText}
                        />
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color={theme.colors.palette.primary500}
                        />
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View> */}
        </View>
      </Animated.ScrollView>
    </Screen>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create<any>({
    container: {
      flex: 1,
      paddingTop: 0,
    },
    scrollContent: {
      paddingTop: HEADER_HEIGHT, // Add padding to account for fixed header
    },
    headerContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: HEADER_HEIGHT,
      zIndex: 1,
    },
    toolbar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: TOOLBAR_HEIGHT,
      zIndex: 2,
    },
    toolbarGradient: {
      flex: 1,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    toolbarContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: metrics.medium,
      paddingTop: metrics.xl,
      height: '100%',
    },
    contentContainer: {
      backgroundColor: 'theme.colors.palette.neutral100',
      paddingHorizontal: metrics.medium,
      paddingTop: -metrics.medium,
    },
    headerGradient: {
      paddingHorizontal: metrics.medium,
      paddingTop: metrics.xl,
      paddingBottom: metrics.large,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: metrics.large,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: metrics.large,
    },
    logoContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
    },
    logo: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    welcomeText: {
      color: theme.colors.palette.neutral200,
      maxWidth: '90%',
    },
    userName: {
      color: theme.colors.palette.neutral100,
      fontSize: 26,
      lineHeight: 34,
      maxWidth: '90%',
    },
    headerActions: {
      flexDirection: 'row',
      gap: metrics.small,
      position: 'absolute',
      right: metrics.zero,
      top: metrics.zero,
    },
    headerActionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: 'hidden',
    },
    actionButtonGradient: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    balanceCard: {
      borderRadius: 16,
      padding: metrics.medium,
      paddingBottom: metrics.medium,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      marginBottom: metrics.medium,
    },
    balanceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: metrics.small,
    },
    walletLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.tiny,
      marginBottom: metrics.tiny,
    },
    balanceLabel: {
      color: theme.colors.palette.neutral100,
    },
    balanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.small,
    },
    currencySymbol: {
      fontSize: 24,
      marginTop: 8,
      marginRight: 2,
    },
    balanceMain: {
      fontSize: 42,
      letterSpacing: -1,
    },
    balanceCents: {
      fontSize: 24,
      marginTop: 8,
      marginLeft: 2,
    },
    balanceActions: {
      flexDirection: 'row',
      gap: metrics.medium,
      marginTop: metrics.small,
    },
    balanceActionButton: {
      width: 52,
      height: 64,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 25,
    },
    section: {
      marginBottom: 24,
      marginTop: -12,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: metrics.tiny,
      marginBottom: 16,
    },
    periodSelectorContainer: {
      position: 'relative',
      zIndex: 1,
    },
    periodSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.tiny,
      paddingHorizontal: metrics.small,
      paddingVertical: metrics.tiny,
      borderRadius: metrics.borderRadiusLarge,
      backgroundColor: theme.colors.palette.neutral100,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
    },
    periodText: {
      color: theme.colors.text,
    },
    periodDropdown: {
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: metrics.tiny,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      padding: metrics.tiny,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      minWidth: 150,
    },
    periodOption: {
      paddingVertical: metrics.small,
      paddingHorizontal: metrics.medium,
      borderRadius: metrics.borderRadiusMedium,
    },
    periodOptionSelected: {
      backgroundColor: theme.colors.palette.primary500,
    },
    periodOptionText: {
      color: theme.colors.text,
    },
    periodOptionTextSelected: {
      color: theme.colors.palette.neutral100,
    },
    bannerContent: {
      flex: 1,
      justifyContent: 'center',
      padding: metrics.medium,
    },
    bannerTitle: {
      marginBottom: metrics.tiny,
      color: theme.colors.text,
    },
    bannerDescription: {
      color: theme.colors.textDim,
      lineHeight: 20,
    },
    statItem: {
      width: '47.5%', // Slightly less than 50% to account for gap
      padding: metrics.small,
      borderRadius: metrics.borderRadiusLarge,
      borderWidth: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },
    headerWithBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.small,
    },
    newBadge: {
      backgroundColor: theme.colors.palette.primary500,
      paddingHorizontal: metrics.small,
      paddingVertical: metrics.tiny,
      borderRadius: metrics.borderRadiusLarge,
    },
    newBadgeText: {
      color: theme.colors.palette.neutral100,
      fontWeight: 'bold',
    },
    transactionListContainer: {
      marginTop: metrics.medium,
    },
    glitterText: {
      color: theme.colors.palette.neutral100,
      textShadowColor: 'rgba(255, 255, 255, 0.75)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 8,
    },

    actionButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 11,
      textAlign: 'center',
    },
    overlayContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modalContent: {
      width: '85%',
      maxWidth: 340,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: theme.colors.palette.neutral900,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    modalInner: {
      padding: metrics.xl,
      alignItems: 'center',
      position: 'relative',
    },
    closeButton: {
      position: 'absolute',
      top: metrics.medium,
      right: metrics.medium,
      zIndex: 2,
    },
    qrTitle: {
      color: theme.colors.palette.neutral100,
      fontSize: 24,
      marginTop: metrics.medium,
      marginBottom: metrics.tiny,
      textAlign: 'center',
    },
    qrSubtitle: {
      color: theme.colors.palette.neutral400,
      textAlign: 'center',
      marginBottom: metrics.xl,
    },
    qrWrapper: {
      padding: metrics.medium,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    username: {
      color: theme.colors.palette.neutral100,
      marginTop: metrics.xl,
      textAlign: 'center',
    },
    loadingContainer: {
      padding: metrics.xl,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyState: {
      padding: metrics.xl,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyStateText: {
      color: theme.colors.textDim,
    },
    summaryContainer: {
      gap: metrics.medium,
    },
    totalMoneyContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
      padding: metrics.medium,
      marginBottom: metrics.medium,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      elevation: 2,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    totalMoneyItem: {
      flex: 1,
      alignItems: 'flex-start',
    },
    totalMoneyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.tiny,
      marginBottom: metrics.tiny,
    },
    totalMoneyLabel: {
      color: theme.colors.textDim,
      marginLeft: metrics.tiny,
    },
    totalMoneyValue: {
      fontSize: 28,
      lineHeight: 34,
    },
    totalMoneySeparator: {
      width: 1,
      height: '80%',
      backgroundColor: theme.colors.palette.neutral200,
      marginHorizontal: metrics.medium,
    },
    transactionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: metrics.medium,
      paddingHorizontal: metrics.tiny,
    },
    transactionCardContent: {
      gap: metrics.small,
    },
    transactionCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    transactionCardIcon: {
      width: 40,
      height: 40,
      borderRadius: metrics.borderRadiusLarge,
      justifyContent: 'center',
      alignItems: 'center',
    },
    transactionCardLabel: {
      fontSize: 15,
      marginTop: 4,
    },
    transactionCardAmount: {
      fontSize: 20,
      lineHeight: 28,
    },
    transactionCountBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    transactionCountText: {
      fontSize: 12,
      fontWeight: '600',
    },
    recentTransactionsContainer: {
      paddingVertical: metrics.small,
      gap: metrics.medium,
      paddingRight: metrics.medium,
    },
    recentTransactionCard: {
      width: 240,
      padding: metrics.medium,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    recentTransactionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: metrics.small,
    },
    recentTransactionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recentTransactionStatus: {
      paddingHorizontal: metrics.small,
      paddingVertical: metrics.tiny,
      borderRadius: metrics.borderRadiusLarge,
    },
    recentTransactionStatusText: {
      textTransform: 'capitalize',
      fontSize: 12,
    },
    recentTransactionDescription: {
      color: theme.colors.text,
      marginBottom: metrics.tiny,
      fontSize: 14,
    },
    recentTransactionAmount: {
      marginBottom: metrics.tiny,
      fontSize: 24,
      fontWeight: 'bold',
    },
    recentTransactionDate: {
      color: theme.colors.textDim,
      fontSize: 14,
      fontWeight: '500',
    },
    recentContactsContainer: {
      paddingVertical: metrics.small,
      gap: metrics.medium,
      paddingRight: metrics.medium,
    },
    recentContactCard: {
      width: 100,
      alignItems: 'center',
      padding: metrics.small,
    },
    contactAvatarContainer: {
      marginBottom: metrics.tiny,
    },
    contactAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.palette.primary500 + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    contactAvatarText: {
      color: theme.colors.palette.primary500,
      fontSize: 20,
      fontWeight: 'bold',
    },
    contactName: {
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: metrics.tiny,
    },
    userProfileContainer: {
      marginLeft: metrics.small,
      flex: 1,
      marginTop: metrics.small,
    },
    textOrange: {
      color: theme.colors.palette.accent500,
    },
    textBlue: {
      color: theme.colors.palette.primary500,
    },
    textGreen: {
      color: theme.colors.palette.success500,
    },
    textRed: {
      color: theme.colors.palette.angry500,
    },
    containerGreenBackground: {
      backgroundColor: `${theme.colors.palette.success500}15`,
    },
    containerRedBackground: {
      backgroundColor: `${theme.colors.palette.angry500}15`,
    },
    containerOrangeBackground: {
      backgroundColor: `${theme.colors.palette.accent500}15`,
    },
    containerBlueBackground: {
      backgroundColor: `${theme.colors.palette.primary500}15`,
    },
  })

export default observer(HomeScreen)
