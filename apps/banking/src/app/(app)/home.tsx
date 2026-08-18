// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { useFocusEffect, useRouter } from 'expo-router'
import { useStores } from '@/models'
import { useAppTheme, Text, useToast, type Theme } from '@andojo/shared-theme'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { FancyAlert } from '@/components/FancyAlert'
import { SafeAreaView } from 'react-native-safe-area-context'
import AccountCreationModal from '@/components/AccountCreationModal'
import { debounce } from 'lodash'

const { width } = Dimensions.get('window')

const HomeScreen = observer(() => {
  const { bankingStore, userStore, notificationStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const toast = useToast()
  const { trackScreenMount } = useInteractionTracking('home', '/home')
  const router = useRouter()

  // Debounced navigation to prevent multiple rapid taps
  const debouncedNavigateToNotifications = useCallback(
    debounce(() => {
      router.push('/notifications/notifications')
    }, 300),
    [router],
  )

  // Debounced transaction navigation
  const handleTransactionNavigation = useCallback(
    debounce((transactionId: number) => {
      router.push(`/transactions/${transactionId}`)
    }, 300),
    [router],
  )

  // Debounced transactions page navigation
  const handleViewAllTransactions = useCallback(
    debounce(() => {
      router.push('/transactions')
    }, 300),
    [router],
  )

  // Load data on mount
  useEffect(() => {
    bankingStore.initializeSession({ userId: userStore?.user?.id, seed: 42 })
  }, [])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'home',
        route: '/home',
      })
      // Load notifications when home screen is focused
      return () => {
        // Home screen unfocused
      }
    }, [
      trackScreenMount,
      userStore.isAuthenticated,
      userStore.user,
      bankingStore.activeAccounts,
    ]),
  )

  // Greeting
  const userName = userStore.user?.displayName || 'User'
  const currentHour = new Date().getHours()
  const greeting =
    currentHour < 12
      ? 'Good Morning'
      : currentHour < 18
        ? 'Good Afternoon'
        : 'Good Evening'

  // Quick actions (static for now, could come from store later)
  const quickActions = [
    {
      id: 1,
      name: 'Transfer',
      icon: 'swap-horizontal-outline',
      color: theme.colors.palette.primary400,
      bgColor: theme.colors.palette.primary200 + '15',
    },
    {
      id: 2,
      name: 'Pay Bills',
      icon: 'receipt-outline',
      color: theme.colors.palette.secondary400,
      bgColor: theme.colors.palette.secondary400 + '15',
    },
    {
      id: 3,
      name: 'Nexus Pay',
      icon: 'send-outline',
      color: theme.colors.palette.success400,
      bgColor: theme.colors.palette.success400 + '15',
    },
    {
      id: 4,
      name: 'Cards',
      icon: 'card-outline',
      color: theme.colors.palette.accent200,
      bgColor: theme.colors.palette.accent200 + '15',
    },
  ]

  // Transaction helpers - category-based icons and colors
  const getTransactionIcon = (category: string, code: string): any => {
    // First check by category
    switch (category) {
      case 'credit':
        return 'arrow-down-circle'
      case 'debit':
        // More specific icons for debit transactions
        switch (code) {
          case 'withdrawal':
          case 'withdraw':
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

  const getTransactionIconStyle = (category: string, code: string) => ({
    backgroundColor: getTransactionColor(category, code) + '15',
  })

  const formatTransactionType = (type: string) =>
    type
      .split('_')
      .map(w => w[0].toUpperCase() + w.slice(1))
      .join(' ')

  const formatTransactionDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const diffDays = Math.floor(
      (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    )
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatAccountType = (accountTypeId: number) =>
    bankingStore
      .getAccountType(accountTypeId)
      ?.code.replace('_', ' ')
      .toUpperCase() || 'ACCOUNT'

  // Primary account handler
  const handleSetPrimaryAccount = async (accountId: number) => {
    console.log('Setting primary account:', accountId)

    // Check if account is already primary
    const account = bankingStore.accounts.find(a => a.id === accountId)
    if (account?.isPrimary) {
      console.log('Account is already primary, skipping')
      return
    }

    try {
      await bankingStore.setPrimaryAccount(accountId)

      // Try different toast configurations
      toast.show({
        title: 'Primary account updated successfully!',
        preset: 'success',
        duration: 5000,
        placement: 'bottom',
        textColor: theme.colors.palette.neutral200,
      })
    } catch (error: any) {
      console.log('Error setting primary account:', error)
      bankingStore.showAlert({
        title: 'Error',
        message: error.message || 'Failed to update primary account',
        preset: 'error',
      })

      toast.show({
        title: error.message || 'Failed to update primary account',
        preset: 'error',
        duration: 4000,
        placement: 'bottom',
      })
    }
  }

  // Account creation handlers
  const handleCreateAccount = async () => {
    console.log('Creating account...')
    if (!bankingStore.accountCreationForm.accountName.trim()) {
      bankingStore.showAlert({
        title: 'Error',
        message: 'Please enter an account name',
        preset: 'error',
      })
      return
    }

    if (!bankingStore.accountCreationForm.selectedAccountType) {
      bankingStore.showAlert({
        title: 'Error',
        message: 'Please select an account type',
        preset: 'error',
      })
      return
    }

    bankingStore.setIsCreatingAccount(true)
    try {
      const availableTypes = await bankingStore.getAvailableAccountTypes()
      const selectedType = availableTypes.find(
        t => t.id === bankingStore.accountCreationForm.selectedAccountType,
      )

      if (!selectedType) {
        bankingStore.showAlert({
          title: 'Error',
          message: 'Invalid account type selected',
          preset: 'error',
        })
        return
      }

      await bankingStore.createAccount({
        accountTypeId: bankingStore.accountCreationForm.selectedAccountType,
        accountName: bankingStore.accountCreationForm.accountName.trim(),
        initialDeposit: selectedType.initialDeposit,
        isPrimary: bankingStore.accountCreationForm.isPrimary,
      })

      // Try different toast configurations
      toast.show({
        title: 'Account created successfully!',
        preset: 'success',
        duration: 5000,
        placement: 'bottom',
        textColor: theme.colors.palette.neutral200,
      })

      // Reset form and close bottom sheet
      bankingStore.resetAccountCreationForm()
      bankingStore.setShowAccountBottomSheet(false)
    } catch (error: any) {
      const errorMessage =
        error.message === 'ACCOUNT_LIMIT_REACHED'
          ? 'You have reached the maximum number of accounts for this type in your tier.'
          : error.message || 'Failed to create account'

      bankingStore.showAlert({
        title: 'Error',
        message: errorMessage,
        preset: 'error',
      })

      toast.show({
        title: errorMessage,
        preset: 'error',
        duration: 4000,
        placement: 'bottom',
      })
    } finally {
      bankingStore.setIsCreatingAccount(false)
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text
              preset="default"
              style={{ color: theme.colors.textDim as string }}
            >
              {greeting}
            </Text>
            <Text
              preset="default"
              style={{ color: theme.colors.text as string }}
            >
              {userName}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[
                styles.openAccountButton,
                { backgroundColor: theme.colors.palette.primary400 },
              ]}
              onPress={() => bankingStore.setShowAccountBottomSheet(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={theme.colors.palette.neutral100}
              />
              <Text style={styles.openAccountButtonText}>Open Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.headerButton,
                { backgroundColor: theme.colors.palette.neutral200 },
              ]}
              onPress={debouncedNavigateToNotifications}
              activeOpacity={0.8}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={theme.colors.palette.neutral700}
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
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Accounts Carousel */}
        <View style={styles.accountsSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            decelerationRate="fast"
            snapToInterval={width - 48}
            contentContainerStyle={styles.accountsContainer}
          >
            {bankingStore.activeAccounts.map((account, index) => (
              <LinearGradient
                key={account.id}
                colors={
                  index % 2 === 0
                    ? [
                        theme.colors.palette.primary500,
                        theme.colors.palette.accent500,
                      ]
                    : [
                        theme.colors.palette.secondary500,
                        theme.colors.palette.accent500,
                      ]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.accountCard, styles.cardShadow]}
              >
                <View style={styles.accountCardHeader}>
                  <View>
                    <Text style={styles.accountName} preset="subheading">
                      {account.accountName || `Account ${account.id}`}
                    </Text>
                    <Text style={styles.accountNumber}>
                      {bankingStore.isAccountDetailsVisible(account.id)
                        ? account.accountNumber.replace(/(.{4})/g, '$1 ').trim()
                        : `•••••••••${account.accountNumber.slice(-4)}`}
                    </Text>
                    <Text style={styles.accountType} preset="default">
                      {formatAccountType(account.accountTypeId)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      bankingStore.toggleAccountDetailsVisibility(account.id)
                    }
                  >
                    <Ionicons
                      name={
                        bankingStore.isAccountDetailsVisible(account.id)
                          ? 'eye-outline'
                          : 'eye-off-outline'
                      }
                      size={20}
                      color={theme.colors.palette.neutral200}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.accountBalance}>
                  <Text style={styles.balanceLabel}>Available Balance</Text>
                  <Text preset="subheading" style={styles.balanceAmount}>
                    ${account.balance.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.accountFooter}>
                  <View style={styles.accountStatus}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: theme.colors.palette.success400 },
                      ]}
                    />
                    <Text style={styles.statusText}>Active</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.primaryBadge,
                      {
                        backgroundColor: account.isPrimary
                          ? theme.colors.palette.overlay50
                          : theme.colors.palette.overlay20,
                        borderWidth: account.isPrimary ? 0 : 1,
                        borderColor: account.isPrimary
                          ? 'transparent'
                          : theme.colors.palette.overlay20,
                        opacity: account.isPrimary ? 1 : 0.9,
                      },
                    ]}
                    onPress={() => {
                      if (!account.isPrimary) {
                        handleSetPrimaryAccount(account.id)
                      }
                    }}
                    activeOpacity={account.isPrimary ? 1 : 0.8}
                    disabled={account.isPrimary}
                  >
                    <Text
                      style={{
                        ...styles.primaryText,
                        color: account.isPrimary
                          ? theme.colors.palette.neutral100
                          : theme.colors.palette.neutral200,
                      }}
                    >
                      {account.isPrimary ? 'Primary' : 'Set as Primary'}
                    </Text>
                    {account.isPrimary && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={theme.colors.palette.neutral100}
                        style={{ marginLeft: 6 }}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            ))}
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text preset="subheading" style={{ color: theme.colors.text }}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map(action => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionButton,
                  { backgroundColor: (theme.colors as any).surface },
                ]}
                activeOpacity={0.7}
                onPress={debounce(() => {
                  if (action.name === 'Transfer') {
                    router.push('/transfer/transfer')
                  } else if (action.name === 'Pay Bills') {
                    router.push('/pay-bills')
                  } else if (action.name === 'Nexus Pay') {
                    router.push('/nexus-pay')
                  } else if (action.name === 'Cards') {
                    router.push('/cards')
                  }
                }, 300)}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: action.bgColor },
                  ]}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={24}
                    color={action.color}
                  />
                </View>
                <Text
                  style={
                    [styles.actionText, { color: theme.colors.text }] as any
                  }
                >
                  {action.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Text preset="subheading" style={{ color: theme.colors.text }}>
              Last 5 Transactions
            </Text>
            <TouchableOpacity onPress={handleViewAllTransactions}>
              <Text
                style={
                  [
                    styles.seeAllText,
                    { color: theme.colors.palette.primary400 },
                  ] as any
                }
              >
                View All
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.transactionsContainer,
              { backgroundColor: (theme.colors as any).surface },
            ]}
          >
            {bankingStore.recentTransactions.length ? (
              <ScrollView
                showsVerticalScrollIndicator={true}
                style={styles.transactionsScrollView}
                nestedScrollEnabled={true}
              >
                {bankingStore.recentTransactions
                  .slice(0, 5)
                  .map((txn, index) => {
                    // Handle both old and new transaction structures
                    let transactionType, category, code, name, type

                    if (txn.transactionTypeId) {
                      // New structure with transactionTypeId
                      transactionType = bankingStore.getTransactionType(
                        txn.transactionTypeId,
                      )
                      category = transactionType?.category || 'debit'
                      code = transactionType?.code || 'unknown'
                      name = txn.description || 'Unknown Transaction'
                      type = transactionType?.name
                    } else if (txn.transactionType) {
                      // Old structure with transactionType string
                      transactionType = bankingStore.getTransactionTypeByCode(
                        txn.transactionType,
                      )
                      category = transactionType?.category || 'debit'
                      code = txn.transactionType
                      name =
                        txn.description ||
                        formatTransactionType(txn.transactionType)
                      type = transactionType?.name
                    } else {
                      // Fallback
                      category = 'debit'
                      code = 'unknown'
                      name = txn.description || 'Unknown Transaction'
                    }

                    const isCredit = category === 'credit'

                    return (
                      <TouchableOpacity
                        key={txn.id}
                        style={[
                          styles.transactionItem,
                          index <
                            bankingStore.recentTransactions.slice(0, 5).length -
                              1 && {
                            borderBottomColor: theme.colors.border,
                            borderBottomWidth: 1,
                          },
                        ]}
                        onPress={() => handleTransactionNavigation(txn.id)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.transactionIconContainer,
                            getTransactionIconStyle(category, code),
                          ]}
                        >
                          <Ionicons
                            name={getTransactionIcon(category, code)}
                            size={18}
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
                            preset="default"
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
                            {formatTransactionDate(txn.createdAt)}
                          </Text>
                        </View>

                        <View style={styles.transactionAmountContainer}>
                          <Text
                            style={
                              [
                                styles.transactionAmount,
                                {
                                  color: isCredit
                                    ? theme.colors.palette.success400
                                    : theme.colors.palette.angry400,
                                },
                              ] as any
                            }
                          >
                            {isCredit ? '+' : '-'}${txn.amount.toFixed(2)}
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={theme.colors.textDim}
                          />
                        </View>
                      </TouchableOpacity>
                    )
                  })}
              </ScrollView>
            ) : (
              <View style={styles.emptyTransactions}>
                <Ionicons
                  name="receipt-outline"
                  size={48}
                  color={theme.colors.textDim}
                />
                <Text
                  style={
                    [styles.emptyText, { color: theme.colors.textDim }] as any
                  }
                >
                  No recent transactions
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Account Creation Bottom Sheet */}
      <AccountCreationModal
        bankingStore={bankingStore}
        styles={styles}
        handleCreateAccount={handleCreateAccount}
      />

      {/* FancyAlert Component */}
      <FancyAlert
        visible={bankingStore.alertState.visible}
        title={bankingStore.alertState.title}
        message={bankingStore.alertState.message}
        preset={bankingStore.alertState.preset as any}
        onClose={() => bankingStore.hideAlert()}
        onConfirm={bankingStore.alertState.showConfirm ? () => {} : undefined}
        confirmText={bankingStore.alertState.confirmText}
        cancelText={bankingStore.alertState.cancelText}
      />
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
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerLeft: {
      flex: 1,
    },
    headerRight: {
      flexDirection: 'row',
      gap: 12,
    },
    headerButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    notificationBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      backgroundColor: theme.colors.palette.angry500,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    notificationBadgeText: {
      color: theme.colors.palette.neutral100,
      fontSize: 12,
      fontWeight: '600',
    },
    openAccountButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      gap: 6,
    },
    openAccountButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 14,
      fontWeight: '600',
    },

    // Account Cards
    accountsSection: {
      marginTop: 24,
    },
    accountsContainer: {
      paddingHorizontal: 24,
    },
    accountCard: {
      width: width - 48,
      marginRight: 16,
      borderRadius: 20,
      padding: 24,
      minHeight: 150,
    },
    cardShadow: {
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    accountCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    accountType: {
      color: theme.colors.palette.neutral200,
      marginBottom: 2,
    },
    accountName: {
      color: theme.colors.palette.neutral300,
      marginBottom: 4,
    },
    accountNumber: {
      color: theme.colors.palette.neutral300,
      fontSize: 14,
      marginBottom: 4,
    },
    accountBalance: {
      marginBottom: 8,
    },
    balanceLabel: {
      color: theme.colors.palette.neutral300,
      fontSize: 14,
      marginBottom: 8,
    },
    balanceAmount: {
      color: theme.colors.palette.neutral100,
    },
    accountFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    accountStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      color: theme.colors.palette.neutral300,
      fontSize: 14,
      fontWeight: '500',
    },
    primaryBadge: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      minWidth: 80,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryText: {
      color: theme.colors.palette.neutral100,
      fontSize: 12,
      fontWeight: '600',
    },

    // Sections
    section: {
      paddingHorizontal: 24,
      marginTop: 24,
    },
    lastSection: {
      paddingBottom: 70,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },

    seeAllText: {
      fontSize: 16,
      fontWeight: '600',
    },

    // Quick Actions
    quickActionsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
    },
    actionButton: {
      width: (width - 64) / 2,
      alignItems: 'center',
      padding: 12,
      borderRadius: 16,
      marginBottom: 8,
    },
    actionIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    actionText: {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },

    // Transactions
    transactionsContainer: {
      borderRadius: 16,
      overflow: 'hidden',
      height: 280, // Fixed height to ensure scrolling works
    },
    transactionsScrollView: {
      flex: 1,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      minHeight: 72, // Ensure consistent height for each transaction
    },
    transactionIconContainer: {
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
    transactionDescription: {
      fontSize: 12,
      marginTop: 2,
      fontStyle: 'italic',
    },
    transactionAmountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    emptyTransactions: {
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 16,
      marginTop: 16,
      textAlign: 'center',
    },

    // Bottom Sheet Styles
    bottomSheetOverlay: {
      flex: 1,
      backgroundColor: theme.colors.palette.overlay50,
      justifyContent: 'flex-end',
    },
    bottomSheetContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    bottomSheet: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
      minHeight: '80%',
    },
    bottomSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.overlay20,
    },
    bottomSheetHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.palette.overlay20,
      borderRadius: 2,
      position: 'absolute',
      top: 8,
      left: '50%',
      marginLeft: -20,
    },
    bottomSheetTitle: {
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      padding: 4,
    },
    bottomSheetContent: {
      flex: 1,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 2,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      fontWeight: '400',
      minHeight: 56,
    },
    textInputFocused: {
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    accountTypesSection: {
      marginBottom: 20,
    },
    tierInfo: {
      fontSize: 14,
      fontWeight: '400',
    },
    accountTypeOption: {
      borderWidth: 2,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    accountTypeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    accountTypeInfo: {
      flex: 1,
    },
    accountTypeName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    accountTypeDescription: {
      fontSize: 14,
    },
    accountTypeDetails: {
      gap: 8,
    },
    accountTypeDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    detailLabel: {
      fontSize: 14,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    noAccountTypes: {
      padding: 20,
      alignItems: 'center',
    },
    noAccountTypesText: {
      fontSize: 16,
    },
    switchGroup: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
      paddingVertical: 8,
    },
    switchLabelContainer: {
      flex: 1,
      marginRight: 16,
    },
    switchLabel: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    switchDescription: {
      fontSize: 14,
    },
    createAccountButton: {
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 20,
    },
    createAccountButtonText: {
      color: theme.colors.palette.neutral100,
    },
  })

export default HomeScreen
