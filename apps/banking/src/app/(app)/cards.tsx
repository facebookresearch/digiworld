// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  ListRenderItem,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { useRouter, useFocusEffect } from 'expo-router'
import { useStores } from '@/models'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { FancyAlert } from '@/components/FancyAlert'
import { SafeAreaView } from 'react-native-safe-area-context'
import { debounce } from 'lodash'

const { width } = Dimensions.get('window')

interface CreditCard {
  id: number
  cardNumber: string
  expiryMonth: number
  expiryYear: number
  cvv: string
  creditLimit: number
  availableCredit: number
  currentBalance: number
  lastFourDigits: string
  apr: number
  annualFee: number
  latePaymentFee: number
  cashAdvanceFeePercent: number
  status: string
}

interface Transaction {
  id: string
  description: string
  amount: number
  transactionDate: string
  createdAt: string
  transactionType: string
}

interface SectionData {
  type: 'cards' | 'balances' | 'actions' | 'transactions'
  data?: any[]
  title?: string
}

const CardsScreen = observer(() => {
  const { bankingStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('cards', '/cards')
  const [tierInfo, setTierInfo] = useState<any>(null)
  const mainFlatListRef = useRef<FlatList>(null)

  const [cardToClose, setCardToClose] = useState<number | null>(null)

  const creditCards = bankingStore.creditCards.filter(
    card => card.status === 'active',
  )
  const selectedCard = bankingStore.safeSelectedCreditCard

  // Toggle between showing all credit card transactions vs selected card transactions
  // Set to true: Shows all credit card transactions with generic title
  // Set to false: Shows transactions for the selected card only
  const showAllCardTransactionsAtOnce = true

  const cardTransactions = showAllCardTransactionsAtOnce
    ? bankingStore.transactions
        .filter(
          t =>
            t.transactionType === 'credit_card_payment' ||
            t.transactionType === 'purchase' ||
            t.creditCardId,
        )
        .slice(0, 5)
    : bankingStore.selectedCardTransactions

  // Create sections data for the main FlatList
  const sectionsData: SectionData[] = [
    { type: 'cards', data: creditCards },
    ...(creditCards.some(card => card.currentBalance > 0)
      ? [
          {
            type: 'balances' as const,
            data: creditCards.filter(card => card.currentBalance > 0),
            title: 'Outstanding Balance',
          },
        ]
      : []),
    { type: 'actions', title: 'Card Services' },
    { type: 'transactions', data: cardTransactions, title: 'Recent Activity' },
  ]

  useEffect(() => {
    const loadTierInfo = async () => {
      try {
        const info = await bankingStore.getUserTierInfo()
        setTierInfo(info)
      } catch (error) {
        console.error('Error loading tier info:', error)
      }
    }

    if (bankingStore.currentSession?.userId) {
      loadTierInfo()
    }
  }, [bankingStore.currentSession?.userId, creditCards.length])

  useEffect(() => {
    if (creditCards.length > 0) {
      bankingStore.initializeSelectedCard()
    }
  }, [creditCards.length])

  useEffect(() => {
    if (selectedCard) {
      bankingStore.loadSelectedCardTransactions()
    }
  }, [selectedCard?.id])

  useEffect(() => {}, [cardTransactions, selectedCard])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'cards',
        route: '/cards',
      })
      return () => {
        // Cards screen unfocused
      }
    }, [
      trackScreenMount,
      bankingStore.creditCards,
      bankingStore.safeSelectedCreditCard,
    ]),
  )

  const toggleCardVisibility = (cardId: number) => {
    console.log('Toggling card visibility for card:', cardId)
    const currentVisibility = bankingStore.isCardDetailsVisible(cardId)
    console.log('Current visibility:', currentVisibility)
    bankingStore.toggleCardDetailsVisibility(cardId)
    const newVisibility = bankingStore.isCardDetailsVisible(cardId)
    console.log('New visibility:', newVisibility)
  }

  const formatCardNumber = (cardNumber: string, isVisible: boolean) => {
    if (isVisible) {
      return cardNumber.replace(/(.{4})/g, '$1 ').trim()
    }
    // Show only last 4 digits
    return `•••• •••• •••• ${cardNumber.slice(-4)}`
  }

  const formatExpiryDate = (month: number, year: number) => {
    const monthStr = month.toString().padStart(2, '0')
    const yearStr = year.toString().slice(-2)
    return `${monthStr}/${yearStr}`
  }

  const formatCurrencyAmount = (amount: number) => `$${amount.toFixed(2)}`

  const handleCardScroll = (event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x
    const cardWidth = width - 48
    const currentIndex = Math.round(scrollX / cardWidth)

    if (currentIndex >= 0 && currentIndex < creditCards.length) {
      const currentCard = creditCards[currentIndex]
      if (
        currentCard &&
        (!selectedCard || selectedCard.id !== currentCard.id)
      ) {
        console.log(
          `Card scroll: selecting card ${currentCard.id} (${currentCard.lastFourDigits})`,
        )
        bankingStore.setSelectedCreditCard(currentCard.id)
      }
    }
  }

  const CreditCardItem = observer(
    ({ card, index }: { card: CreditCard; index: number }) => {
      const gradient =
        index % 2 === 0
          ? [theme.colors.palette.primary500, theme.colors.palette.accent500]
          : [theme.colors.palette.secondary500, theme.colors.palette.accent500]
      const isDetailsVisible = bankingStore.isCardDetailsVisible(card.id)

      return (
        <TouchableOpacity activeOpacity={0.9}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.cardItem,
              styles.cardShadow,
              selectedCard?.id === card.id && styles.selectedCard,
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardType}>CREDIT CARD</Text>
              <TouchableOpacity
                onPress={() => toggleCardVisibility(card.id)}
                style={[
                  styles.eyeButton,
                  isDetailsVisible && styles.eyeButtonActive,
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isDetailsVisible ? 'eye' : 'eye-off'}
                  size={24}
                  color={
                    isDetailsVisible
                      ? theme.colors.palette.neutral100
                      : theme.colors.palette.neutral400
                  }
                />
              </TouchableOpacity>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.cardName}>Andojo Credit Card</Text>
              <Text
                style={
                  [
                    styles.cardNumber,
                    isDetailsVisible && styles.cardNumberVisible,
                  ] as any
                }
              >
                {formatCardNumber(card.cardNumber, isDetailsVisible)}
              </Text>
            </View>

            <View style={styles.cardDetails}>
              <View style={styles.cardDetailItem}>
                <Text style={styles.cardDetailLabel}>VALID THRU</Text>
                <Text style={styles.cardDetailValue}>
                  {formatExpiryDate(card.expiryMonth, card.expiryYear)}
                </Text>
              </View>
              <View style={styles.cardDetailItem}>
                <Text style={styles.cardDetailLabel}>APR</Text>
                <Text style={styles.cardDetailValue}>
                  {card.apr.toFixed(2)}%
                </Text>
              </View>
              <View style={styles.cardDetailItem}>
                <Text style={styles.cardDetailLabel}>CVV</Text>
                <Text style={styles.cardDetailValue}>
                  {isDetailsVisible ? card.cvv : '•••'}
                </Text>
              </View>
            </View>

            <View style={styles.feeSection}>
              <View style={styles.feeItem}>
                <Text style={styles.feeLabel}>Annual Fee</Text>
                <Text style={styles.feeValue}>
                  {formatCurrencyAmount(card.annualFee ?? 0)}
                </Text>
              </View>
              <View style={styles.feeItem}>
                <Text style={styles.feeLabel}>Late Payment Fee</Text>
                <Text style={styles.feeValue}>
                  {formatCurrencyAmount(card.latePaymentFee ?? 0)}
                </Text>
              </View>
              <View style={styles.feeItem}>
                <Text style={styles.feeLabel}>Cash Advance Fee</Text>
                <Text style={styles.feeValue}>
                  {(card.cashAdvanceFeePercent ?? 0).toFixed(2)}%
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.balanceLabel}>Total Credit Limit</Text>
                <Text style={styles.balanceAmount}>
                  ${card.creditLimit.toFixed(2)}
                </Text>
              </View>
              <View style={styles.limitInfo}>
                <Text style={styles.limitLabel}>Available Credit</Text>
                <Text style={styles.limitAmount}>
                  ${card.availableCredit.toFixed(2)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )
    },
  )

  const renderCreditCard: ListRenderItem<CreditCard> = ({
    item: card,
    index,
  }) => {
    return <CreditCardItem card={card} index={index} />
  }

  const renderEmptyCards = () => (
    <View style={styles.noCardsContainer}>
      <View
        style={[
          styles.noCardsCard,
          { backgroundColor: (theme.colors as any).surface },
        ]}
      >
        <Ionicons name="card-outline" size={64} color={theme.colors.textDim} />
        <Text
          preset="subheading"
          style={
            [styles.noCardsTitle, { color: theme.colors.text as string }] as any
          }
        >
          No Credit Cards
        </Text>
        <Text
          style={
            [
              styles.noCardsSubtitle,
              { color: theme.colors.textDim as string },
            ] as any
          }
        >
          {tierInfo
            ? `Apply for your first credit card. As a ${tierInfo.tierName} member, you can have up to ${tierInfo.maxCards} credit card${tierInfo.maxCards > 1 ? 's' : ''}.`
            : 'Apply for your first credit card to get started'}
        </Text>
        <TouchableOpacity
          style={[
            styles.applyButton,
            { backgroundColor: theme.colors.palette.primary400 },
          ]}
          onPress={handleApplyCard}
        >
          <Text style={styles.applyButtonText}>Apply Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderTransaction: ListRenderItem<Transaction> = ({
    item: transaction,
  }) => {
    const isCreditCardPayment =
      transaction.transactionType === 'credit_card_payment'
    const isBillPaymentUsingCard =
      transaction.transactionType === 'bill_payment'
    const isPositiveTransaction = isCreditCardPayment && !isBillPaymentUsingCard

    return (
      <TouchableOpacity
        style={[
          styles.transactionCard,
          { backgroundColor: (theme.colors as any).surface },
        ]}
        onPress={() => handleTransactionNavigation(transaction.id)}
        activeOpacity={0.7}
      >
        <View style={styles.transactionCardHeader}>
          <View
            style={[
              styles.transactionCardIcon,
              {
                backgroundColor: isPositiveTransaction
                  ? theme.colors.palette.success400 + '15'
                  : theme.colors.palette.primary400 + '15',
              },
            ]}
          >
            <Ionicons
              name={isPositiveTransaction ? 'arrow-down-circle' : 'card'}
              size={20}
              color={
                isPositiveTransaction
                  ? theme.colors.palette.success400
                  : theme.colors.palette.primary400
              }
            />
          </View>
          <Text
            style={
              [
                styles.transactionCardAmount,
                {
                  color: isPositiveTransaction
                    ? theme.colors.palette.success400
                    : theme.colors.palette.angry500,
                },
              ] as any
            }
          >
            {isPositiveTransaction ? '+' : '-'}$
            {Math.abs(transaction.amount).toFixed(2)}
          </Text>
        </View>

        <View style={styles.transactionCardBody}>
          <Text
            style={
              [
                styles.transactionCardDescription,
                { color: theme.colors.text as string },
              ] as any
            }
            numberOfLines={2}
          >
            {transaction.description || 'Card Transaction'}
          </Text>
          <Text
            style={
              [
                styles.transactionCardDate,
                { color: theme.colors.textDim as string },
              ] as any
            }
          >
            {new Date(
              transaction.transactionDate || transaction.createdAt,
            ).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  const renderEmptyTransactions = () => (
    <View style={[styles.emptyActivity, styles.emptyActivityHorizontal]}>
      <Ionicons name="card-outline" size={48} color={theme.colors.textDim} />
      <Text
        style={
          [styles.emptyText, { color: theme.colors.textDim as string }] as any
        }
      >
        {showAllCardTransactionsAtOnce
          ? 'No credit card transactions'
          : selectedCard
            ? 'No recent transactions'
            : 'Select a card to view activity'}
      </Text>
      <Text
        style={
          [
            styles.emptySubtext,
            { color: theme.colors.textDim as string },
          ] as any
        }
      >
        {showAllCardTransactionsAtOnce
          ? 'Your credit card transactions will appear here'
          : selectedCard
            ? `Transactions for card •••• ${selectedCard.lastFourDigits} will appear here`
            : 'Swipe through cards above to see their transactions'}
      </Text>
    </View>
  )

  const renderOutstandingBalance: ListRenderItem<CreditCard> = ({
    item: card,
    index,
  }) => {
    const outstandingCards = creditCards.filter(c => c.currentBalance > 0)

    return (
      <TouchableOpacity
        style={[
          styles.balanceItem,
          index < outstandingCards.length - 1 && {
            borderBottomColor: theme.colors.border,
            borderBottomWidth: 1,
          },
        ]}
        onPress={() => {
          router.push(`/bills/pay/credit-card-${card.id}`)
        }}
      >
        <View style={styles.balanceItemLeft}>
          <View
            style={{
              ...styles.balanceItemIcon,
              backgroundColor: theme.colors.palette.primary200,
            }}
          >
            <Ionicons
              name="card"
              size={20}
              color={theme.colors.palette.primary500}
            />
          </View>
          <View style={styles.balanceItemDetails}>
            <Text
              style={
                [
                  styles.balanceItemTitle,
                  { color: theme.colors.text as string },
                ] as any
              }
            >
              •••• {card.lastFourDigits}
            </Text>
            <Text
              style={
                [
                  styles.balanceItemSubtitle,
                  { color: theme.colors.textDim as string },
                ] as any
              }
            >
              Andojo Credit Card
            </Text>
          </View>
        </View>
        <View style={styles.balanceItemRight}>
          <Text
            style={
              [
                styles.balanceItemAmount,
                { color: theme.colors.palette.primary500 },
              ] as any
            }
          >
            ${card.currentBalance.toFixed(2)}
          </Text>
          <View
            style={{
              ...styles.payNowBadge,
              backgroundColor: theme.colors.palette.primary500,
            }}
          >
            <Text style={styles.payNowBadgeText}>Pay Now</Text>
            <Ionicons
              name="arrow-forward"
              size={12}
              color={theme.colors.palette.neutral100}
            />
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const renderMainSection: ListRenderItem<SectionData> = ({
    item: section,
  }) => {
    switch (section.type) {
      case 'cards':
        return (
          <View style={styles.cardsSection}>
            {section.data && section.data.length > 0 ? (
              <FlatList
                data={section.data}
                renderItem={renderCreditCard}
                keyExtractor={item =>
                  `${item.id}-${bankingStore.isCardDetailsVisible(item.id)}`
                }
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                decelerationRate="fast"
                snapToInterval={width - 48}
                contentContainerStyle={styles.cardsContainer}
                onMomentumScrollEnd={handleCardScroll}
                getItemLayout={(_, index) => ({
                  length: width - 48,
                  offset: (width - 48) * index,
                  index,
                })}
                extraData={bankingStore.visibleCardDetails}
              />
            ) : (
              renderEmptyCards()
            )}
          </View>
        )

      case 'balances':
        return (
          <View style={styles.section}>
            <Text
              style={
                [
                  styles.sectionTitle,
                  { color: theme.colors.text as string },
                ] as any
              }
            >
              {section.title}
            </Text>
            <View
              style={[
                styles.balancesContainer,
                { backgroundColor: (theme.colors as any).surface },
              ]}
            >
              <FlatList
                data={section.data}
                renderItem={renderOutstandingBalance}
                keyExtractor={item => `balance-${item.id}`}
                scrollEnabled={false}
                ItemSeparatorComponent={() => (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: theme.colors.border,
                    }}
                  />
                )}
              />
            </View>
          </View>
        )

      case 'actions':
        return (
          <View style={styles.section}>
            <Text
              style={
                [
                  styles.sectionTitle,
                  { color: theme.colors.text as string },
                ] as any
              }
            >
              {section.title}
            </Text>
            <View style={styles.actionsGrid}>
              {cardActions.map(action => (
                <TouchableOpacity
                  key={action.id}
                  style={[
                    styles.actionButton,
                    { backgroundColor: (theme.colors as any).surface },
                  ]}
                  onPress={action.onPress}
                >
                  <View
                    style={[
                      styles.actionIcon,
                      { backgroundColor: action.color + '15' },
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
                      [
                        styles.actionText,
                        { color: theme.colors.text as string },
                      ] as any
                    }
                  >
                    {action.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )

      case 'transactions':
        return (
          <View style={[styles.section, styles.lastSection]}>
            <View style={styles.sectionHeader}>
              <Text
                style={
                  [
                    styles.sectionTitle,
                    { color: theme.colors.text as string },
                  ] as any
                }
              >
                {section.title}
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

            <View style={styles.activityContainer}>
              <FlatList
                data={section.data || []}
                renderItem={renderTransaction}
                keyExtractor={(item, index) =>
                  item?.id?.toString() || index.toString()
                }
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.transactionsHorizontalContainer}
                snapToInterval={width * 0.75 + 12} // Card width + separator
                decelerationRate="fast"
                ListEmptyComponent={renderEmptyTransactions}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                style={styles.transactionsHorizontalList}
              />
            </View>
          </View>
        )

      default:
        return null
    }
  }

  const handleApplyCardInternal = async () => {
    if (!bankingStore.currentSession?.userId) {
      bankingStore.showAlert({
        title: 'Error',
        message: 'Please log in to apply for a credit card',
        preset: 'error',
      })
      return
    }

    try {
      const canApply = await bankingStore.canApplyForCreditCard()
      if (!canApply) {
        const tierInfo = await bankingStore.getUserTierInfo()
        if (tierInfo) {
          bankingStore.showAlert({
            title: 'Card Limit Reached',
            message: `You have reached the maximum number of credit cards (${tierInfo.currentCards}/${tierInfo.maxCards}) for your ${tierInfo.tierName} tier.`,
            preset: 'warning',
          })
        } else {
          bankingStore.showAlert({
            title: 'Cannot Apply',
            message:
              'You cannot apply for additional credit cards at this time.',
            preset: 'error',
          })
        }
        return
      }

      // Reset terms state for fresh application and navigate to terms screen
      bankingStore.resetCreditCardTermsState()
      router.push('/credit-card/terms')
    } catch (error) {
      console.error('Error checking card application eligibility:', error)
      bankingStore.showAlert({
        title: 'Error',
        message:
          'Unable to check card application eligibility. Please try again.',
        preset: 'error',
      })
    }
  }

  // Debounced apply function to prevent multiple rapid applications
  const handleApplyCard = useCallback(debounce(handleApplyCardInternal, 300), [
    bankingStore,
    router,
  ])

  // Debounced transaction navigation
  const handleTransactionNavigation = useCallback(
    debounce((transactionId: string) => {
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

  const handleCloseCard = async (cardId: number) => {
    const cardToClose = creditCards.find(card => card.id === cardId)
    setCardToClose(cardId)

    bankingStore.showAlert({
      title: 'Close Credit Card',
      message: cardToClose
        ? `Are you sure you want to close your Andojo Credit Card ending in ${cardToClose.lastFourDigits}?${cardToClose.currentBalance > 0 ? '\n\nNote: You must pay off the outstanding balance of $' + cardToClose.currentBalance.toFixed(2) + ' before closing this card.' : ''}`
        : 'Are you sure you want to close this credit card?',
      preset: 'delete',
      showConfirm: true,
      confirmText: 'Close Card',
      cancelText: 'Cancel',
    })
  }

  const confirmCloseCard = async () => {
    if (!cardToClose) {
      return
    }

    // Hide the confirmation alert first
    bankingStore.hideAlert()

    try {
      await bankingStore.closeCreditCard(cardToClose)
      console.log('Card closed successfully')

      // Refresh tier info since card count changed
      const info = await bankingStore.getUserTierInfo()
      setTierInfo(info)

      bankingStore.showAlert({
        title: 'Success',
        message: 'Credit card closed successfully',
        preset: 'success',
      })
    } catch (error: any) {
      // Check if the error is about outstanding balance
      if (error.message) {
        bankingStore.showAlert({
          title: 'Error',
          message: 'Clear the outstanding balance to close the card',
          preset: 'error',
        })
      } else {
        bankingStore.showAlert({
          title: 'Error',
          message: error.message || 'Failed to close credit card',
          preset: 'error',
        })
      }
    } finally {
      setCardToClose(null)
    }
  }

  const cardActions = [
    {
      id: 1,
      name: 'Apply for Card',
      icon: 'add-circle',
      color: theme.colors.palette.primary400,
      onPress: handleApplyCard,
    },
    {
      id: 2,
      name: 'Close Card',
      icon: 'close-circle',
      color: theme.colors.palette.angry500,
      onPress: () => {
        if (creditCards.length === 0) {
          bankingStore.showAlert({
            title: 'No Cards',
            message: "You don't have any active credit cards to close",
            preset: 'warning',
          })
          return
        }

        // Close the selected card (there should always be one selected)
        if (selectedCard) {
          handleCloseCard(selectedCard.id)
        }
      },
    },
  ]

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <FlatList
        ref={mainFlatListRef}
        data={sectionsData}
        renderItem={renderMainSection}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        showsVerticalScrollIndicator={false}
        // Allow nested scrolling so inner FlatLists (like the transactions
        // list) can receive touch events and scroll independently.
        nestedScrollEnabled={true}
        // Improve gesture handling when tapping inputs inside lists
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <Text
              preset="subheading"
              style={{ color: theme.colors.text as string }}
            >
              My Cards
            </Text>
            <Text
              preset="default"
              style={{ color: theme.colors.textDim as string }}
            >
              Manage your cards and payments
            </Text>
          </View>
        )}
        contentContainerStyle={styles.mainContainer}
      />

      {/* FancyAlert Component */}
      <FancyAlert
        visible={bankingStore.alertState.visible}
        title={bankingStore.alertState.title}
        message={bankingStore.alertState.message}
        preset={bankingStore.alertState.preset as any}
        onClose={() => {
          bankingStore.hideAlert()
          setCardToClose(null)
        }}
        onConfirm={
          bankingStore.alertState.showConfirm
            ? () => {
                console.log('FancyAlert onConfirm called')
                confirmCloseCard()
              }
            : undefined
        }
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
    mainContainer: {
      flexGrow: 1,
      paddingBottom: 50,
    },
    header: {
      paddingTop: 20,
      paddingHorizontal: 24,
      paddingBottom: 20,
    },

    cardsSection: {
      marginTop: 24,
    },
    cardsContainer: {
      paddingHorizontal: 24,
    },
    cardItem: {
      width: width - 48,
      marginRight: 16,
      borderRadius: 20,
      padding: 24,
      minHeight: 320,
    },
    cardShadow: {
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    cardType: {
      color: theme.colors.palette.neutral200,
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 1,
    },
    transactionsHorizontalContainer: {
      paddingLeft: 5,
    },
    cardBody: {
      marginBottom: 20,
    },
    cardName: {
      color: theme.colors.palette.neutral100,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
    },
    cardNumber: {
      color: theme.colors.palette.neutral200,
      fontSize: 16,
      letterSpacing: 2,
    },
    cardNumberVisible: {
      color: theme.colors.palette.neutral100,
      fontWeight: '600',
      textShadowColor: theme.colors.palette.neutral900,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    feeSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 18,
    },
    feeItem: {
      flex: 1,
    },
    feeLabel: {
      color: theme.colors.palette.neutral200,
      fontSize: 11,
      marginBottom: 4,
    },
    feeValue: {
      color: theme.colors.palette.neutral100,
      fontSize: 14,
      fontWeight: '600',
    },
    balanceLabel: {
      color: theme.colors.palette.neutral200,
      fontSize: 12,
      marginBottom: 4,
    },
    balanceAmount: {
      color: theme.colors.palette.neutral100,
      fontSize: 20,
      fontWeight: '700',
    },
    limitInfo: {
      alignItems: 'flex-end',
    },
    limitLabel: {
      color: theme.colors.palette.neutral200,
      fontSize: 12,
      marginBottom: 4,
    },
    limitAmount: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
    section: {
      paddingHorizontal: 24,
      marginTop: 15,
    },
    lastSection: {
      paddingBottom: 32,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    seeAllText: {
      fontSize: 16,
      fontWeight: '600',
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    actionButton: {
      width: (width - 60) / 2,
      alignItems: 'center',
      padding: 20,
      borderRadius: 16,
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
    activityContainer: {
      minHeight: 220, // Accommodate card height (400) + padding
    },
    emptyActivity: {
      alignItems: 'center',
      padding: 40,
    },
    emptyActivityHorizontal: {
      width: width * 0.75,
      marginLeft: 24,
      marginRight: 12,
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
    noCardsContainer: {
      paddingHorizontal: 24,
    },
    noCardsCard: {
      borderRadius: 20,
      padding: 40,
      alignItems: 'center',
      minHeight: 200,
      justifyContent: 'center',
    },
    noCardsTitle: {
      marginTop: 16,
      marginBottom: 8,
    },
    noCardsSubtitle: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 24,
    },
    applyButton: {
      paddingHorizontal: 32,
      paddingVertical: 12,
      borderRadius: 12,
    },
    applyButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
    selectedCard: {
      transform: [{ scale: 1.02 }],
      shadowOpacity: 0.25,
    },

    // Transaction card styles for horizontal layout
    transactionCard: {
      width: width * 0.75, // 75% of screen width for 1.25+ cards visible
      height: 200,
      padding: 16,
      borderRadius: 16,
      overflow: 'hidden',
    },
    transactionsHorizontalList: {
      paddingBottom: 20, // Extra padding to prevent clipping
    },
    transactionCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    transactionCardIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    transactionCardAmount: {
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    transactionCardBody: {
      flex: 1,
    },
    transactionCardDescription: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      lineHeight: 22,
    },
    transactionCardDate: {
      fontSize: 14,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      minHeight: 72, // Ensure consistent height for each transaction
    },
    transactionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
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
    transactionDescription: {
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
      letterSpacing: -0.3,
    },
    eyeButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.overlay50,
    },
    eyeButtonActive: {
      backgroundColor: theme.colors.palette.overlay50,
    },
    cardDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    cardDetailItem: {
      alignItems: 'flex-start',
    },
    cardDetailLabel: {
      color: theme.colors.palette.neutral300,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1,
      marginBottom: 4,
    },
    cardDetailValue: {
      color: theme.colors.palette.neutral200,
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 1,
    },
    // Outstanding Balances Section Styles
    balancesContainer: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    balanceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      minHeight: 80,
    },
    balanceItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    balanceItemIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      opacity: 0.4,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    balanceItemDetails: {
      flex: 1,
    },
    balanceItemTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    balanceItemSubtitle: {
      fontSize: 14,
    },
    balanceItemRight: {
      alignItems: 'flex-end',
    },
    balanceItemAmount: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 8,
    },
    payNowBadge: {
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
    },
    payNowBadgeText: {
      color: theme.colors.palette.neutral100,
      fontSize: 12,
      fontWeight: '600',
      marginRight: 4,
    },
  })

export default CardsScreen
