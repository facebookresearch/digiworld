// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Text, useAppTheme } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { applySnapshot } from 'mobx-state-tree'
import { useStores } from '@/models'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { queries } from '@/db/queries'
import { AppDialog, FancyAlert } from '@/components'

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      padding: 16,
      paddingBottom: 32,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    backButton: {
      padding: 8,
      borderRadius: 20,
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
    },
    amountCard: {
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      marginBottom: 24,
    },
    transactionIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.palette.primary300,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    transactionType: {
      fontSize: 16,
      color: theme.colors.palette.neutral100,
      marginBottom: 8,
      textTransform: 'capitalize',
    },
    amount: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      marginBottom: 8,
    },
    transactionDate: {
      fontSize: 14,
      color: theme.colors.palette.neutral300,
    },
    failedAlert: {
      borderRadius: 20,
      padding: 20,
      marginBottom: 24,
      borderWidth: 2,
    },
    failedAlertHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    failedAlertTitle: {
      fontSize: 18,
      fontWeight: '700',
    },
    failedAlertMessage: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      lineHeight: 22,
    },
    failedAlertSubtext: {
      fontSize: 14,
      lineHeight: 20,
    },
    card: {
      borderRadius: 20,
      padding: 0,
      marginBottom: 16,
      backgroundColor: theme.colors.surface || theme.colors.background,
    },
    cardHeader: {
      padding: 20,
      paddingBottom: 12,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border || theme.colors.palette.neutral300,
      marginHorizontal: 20,
      marginBottom: 12,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      alignItems: 'flex-start',
    },
    label: {
      fontSize: 14,
      color: theme.colors.textDim,
      flex: 1,
    },
    value: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'right',
      flex: 1.5,
      color: theme.colors.text,
    },
    itemTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 8,
    },
    itemDescription: {
      fontSize: 14,
      color: theme.colors.textDim,
      marginBottom: 12,
    },
    statusBadge: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
    },
    statusText: {
      fontWeight: '600',
      fontSize: 14,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    errorText: {
      marginTop: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      gap: 8,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
    cannotCancelInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    cannotCancelText: {
      fontSize: 14,
      flex: 1,
    },
  })

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

const TransactionDetailsScreen = observer(() => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { auctionStore, userStore, uiStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const [item, setItem] = useState<any>(null)
  const [seller, setSeller] = useState<any>(null)

  const { trackScreenMount } = useInteractionTracking(
    'Transaction Details',
    `/transactions/${id}`,
  )
  console.log('transactionId in transaction details screen', id)

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'transaction-details',
        route: `/transactions/${id}`,
      })
    }, [trackScreenMount, id]),
  )

  useEffect(() => {
    const loadTransactionDetails = async () => {
      uiStore.setTransactionDetailsLoading(true)
      try {
        // Always load fresh transaction from DB to ensure we have latest status
        const transactionId = parseInt(id || '0', 10)
        if (!transactionId) {
          uiStore.setTransactionDetailsLoading(false)
          return
        }

        // Reload user transactions to get fresh data
        if (userStore.user?.id) {
          await auctionStore.loadUserTransactions(userStore.user.id)
        }

        // Load fresh transaction from DB
        const freshTransaction = await queries.getTransactionById(transactionId)
        if (!freshTransaction) {
          uiStore.setTransactionDetailsLoading(false)
          return
        }

        // Update transaction in store if it exists, or add it
        const existingIndex = auctionStore.transactions.findIndex(
          t => t.id === transactionId,
        )
        if (existingIndex >= 0) {
          // Update existing transaction in store with fresh data using applySnapshot
          applySnapshot(
            auctionStore.transactions[existingIndex],
            freshTransaction,
          )
        } else {
          // Add to store (will create Transaction model instance)
          auctionStore.transactions.push(freshTransaction as any)
        }

        // Load item if available
        if (freshTransaction.itemId) {
          const itemData = await queries.getItemDetail(freshTransaction.itemId)
          setItem(itemData)
        }

        // Load seller if available
        if (freshTransaction.sellerId) {
          const sellerData = await queries.getUserById(
            freshTransaction.sellerId,
          )
          setSeller(sellerData)
        }
      } catch (error) {
        console.error('Error loading transaction details:', error)
      } finally {
        uiStore.setTransactionDetailsLoading(false)
      }
    }

    loadTransactionDetails()
  }, [id, userStore.user?.id])

  // Get transaction from store (MST model instance with computed properties)
  const transaction = auctionStore.transactions.find(
    t => t.id.toString() === id,
  )
  console.log('transaction in transaction details screen', transaction)

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'Purchase'
      case 'bid_win':
        return 'Auction Win'
      case 'sale':
        return 'Sale'
      case 'listing':
        return 'Listing Fee'
      case 'refund':
        return 'Refund'
      default:
        return type
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'bid_win':
        return 'cart'
      case 'sale':
        return 'cash'
      case 'listing':
        return 'add-circle'
      case 'refund':
        return 'arrow-undo'
      default:
        return 'receipt'
    }
  }

  const getTransactionColor = (type: string, status: string) => {
    if (status === 'refunded') {
      return theme.colors.palette?.angry400 || theme.colors.palette.angry500
    }
    if (status === 'failed' || status === 'cancelled') {
      return theme.colors.palette?.angry400 || theme.colors.palette.angry500
    }
    switch (type) {
      case 'purchase':
      case 'bid_win':
        return (
          theme.colors.palette?.primary400 || theme.colors.palette.primary500
        )
      case 'sale':
        return (
          theme.colors.palette?.success400 || theme.colors.palette.success500
        )
      case 'listing':
        return (
          theme.colors.palette?.secondary400 ||
          theme.colors.palette.secondary500
        )
      case 'refund':
        return theme.colors.palette?.angry400 || theme.colors.palette.angry500
      default:
        return theme.colors.palette?.accent400 || theme.colors.palette.accent500
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`
  }

  const handleCancelPurchase = async () => {
    if (!transaction) return

    uiStore.setTransactionDetailsCancelling(true)
    try {
      await auctionStore.cancelPurchase(transaction.id)
      // Reload transaction to get updated status
      await auctionStore.loadUserTransactions(userStore.user!.id)
      uiStore.setTransactionDetailsDialog({
        visible: true,
        type: 'success',
        title: 'Purchase Cancelled',
        message: `Your purchase has been cancelled and a full refund of ${formatCurrency(transaction.amount)} has been issued. A refund transaction has been created in your history.`,
      })
      uiStore.setShowCancelConfirm(false)
      // Navigate back after a delay
      setTimeout(() => {
        router.back()
      }, 2000)
    } catch (error: any) {
      uiStore.setTransactionDetailsDialog({
        visible: true,
        type: 'error',
        title: 'Cancellation Failed',
        message: error.message || 'Failed to cancel purchase',
      })
    } finally {
      uiStore.setTransactionDetailsCancelling(false)
    }
  }

  if (uiStore.transactionDetails.loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
      >
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!transaction) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
      >
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={
              theme.colors.palette?.angry400 || theme.colors.palette.angry500
            }
          />
          <Text size="xl" style={styles.errorText}>
            Transaction Not Found
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const transactionColor = getTransactionColor(
    transaction.transactionType,
    transaction.status,
  )
  const isOutgoing = ['purchase', 'bid_win', 'listing'].includes(
    transaction.transactionType,
  )
  const formattedAmount = isOutgoing
    ? `-${formatCurrency(transaction.amount)}`
    : formatCurrency(transaction.amount)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text size="large" style={styles.headerTitle}>
            Transaction Details
          </Text>
        </View>

        {/* Transaction Amount Card */}
        <View
          style={[styles.amountCard, { backgroundColor: transactionColor }]}
        >
          <View style={styles.transactionIconContainer}>
            <Ionicons
              name={getTransactionIcon(transaction.transactionType) as any}
              size={32}
              color={theme.colors.palette.neutral100}
            />
          </View>
          <Text style={styles.transactionType}>
            {getTransactionTypeLabel(transaction.transactionType)}
          </Text>
          <Text style={styles.amount}>{formattedAmount}</Text>
          <Text style={styles.transactionDate}>
            {formatDate(transaction.transactionDate || transaction.createdAt)}
          </Text>
        </View>

        {/* Failed Payment Alert */}
        {transaction.paymentStatus === 'failed' && (
          <View
            style={[
              styles.failedAlert,
              {
                backgroundColor: theme.colors.palette?.angry500 + '15',
                borderColor: theme.colors.palette?.angry500 + '40',
              },
            ]}
          >
            <View style={styles.failedAlertHeader}>
              <Ionicons
                name="alert-circle"
                size={24}
                color={theme.colors.palette?.angry500}
              />
              <Text
                style={[
                  styles.failedAlertTitle,
                  { color: theme.colors.palette?.angry500 },
                ]}
              >
                Payment Failed
              </Text>
            </View>
            {transaction.failureReason && (
              <Text
                style={[
                  styles.failedAlertMessage,
                  { color: theme.colors.text },
                ]}
              >
                {formatFailureReason(transaction.failureReason)}
              </Text>
            )}
            <Text
              style={[
                styles.failedAlertSubtext,
                { color: theme.colors.textDim },
              ]}
            >
              This transaction was not completed. No payment was processed and
              the item remains available.
            </Text>
          </View>
        )}

        {/* Item Details Card */}
        {item && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Item Details</Text>
            </View>
            <View style={styles.divider} />
            <View style={{ padding: 20 }}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              {item.description && (
                <Text style={styles.itemDescription}>{item.description}</Text>
              )}
              {item.category && (
                <View style={styles.row}>
                  <Text style={styles.label}>Category</Text>
                  <Text style={styles.value}>{item.category.name}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Cost Breakdown Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Cost Breakdown</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Item Price</Text>
            <Text style={styles.value}>
              {formatCurrency(transaction.amount / (transaction.quantity || 1))}
            </Text>
          </View>

          {transaction.quantity && transaction.quantity > 1 && (
            <View style={styles.row}>
              <Text style={styles.label}>Quantity</Text>
              <Text style={styles.value}>{transaction.quantity}</Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.label}>Total Amount</Text>
            <Text
              style={[
                styles.value,
                {
                  color: isOutgoing
                    ? theme.colors.palette?.angry400 ||
                      theme.colors.palette.angry500
                    : theme.colors.palette?.success400 ||
                      theme.colors.palette.success500,
                },
              ]}
            >
              {formattedAmount}
            </Text>
          </View>

          {transaction.refundAmount > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Refunded</Text>
              <Text
                style={[
                  styles.value,
                  {
                    color:
                      theme.colors.palette?.success400 ||
                      theme.colors.palette.success500,
                  },
                ]}
              >
                {formatCurrency(transaction.refundAmount)}
              </Text>
            </View>
          )}
        </View>

        {/* Transaction Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Transaction Information</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Transaction ID</Text>
            <Text style={styles.value}>#{transaction.id}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>
              {getTransactionTypeLabel(transaction.transactionType)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    transaction.status === 'completed'
                      ? (theme.colors.palette?.success400 ||
                          theme.colors.palette.success500) + '20'
                      : transaction.status === 'refunded'
                        ? (theme.colors.palette?.angry400 ||
                            theme.colors.palette.angry500) + '20'
                        : (theme.colors.palette?.accent400 ||
                            theme.colors.palette.accent500) + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      transaction.status === 'completed'
                        ? theme.colors.palette?.success400 ||
                          theme.colors.palette.success500
                        : transaction.status === 'refunded'
                          ? theme.colors.palette?.angry400 ||
                            theme.colors.palette.angry500
                          : theme.colors.palette?.accent400 ||
                            theme.colors.palette.accent500,
                  },
                ]}
              >
                {transaction.status.charAt(0).toUpperCase() +
                  transaction.status.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Payment Status</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    transaction.paymentStatus === 'success'
                      ? (theme.colors.palette?.success400 ||
                          theme.colors.palette.success500) + '20'
                      : transaction.paymentStatus === 'failed'
                        ? (theme.colors.palette?.angry400 ||
                            theme.colors.palette.angry500) + '20'
                        : (theme.colors.palette?.accent400 ||
                            theme.colors.palette.accent500) + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      transaction.paymentStatus === 'success'
                        ? theme.colors.palette?.success400 ||
                          theme.colors.palette.success500
                        : transaction.paymentStatus === 'failed'
                          ? theme.colors.palette?.angry400 ||
                            theme.colors.palette.angry500
                          : theme.colors.palette?.accent400 ||
                            theme.colors.palette.accent500,
                  },
                ]}
              >
                {transaction.paymentStatus.charAt(0).toUpperCase() +
                  transaction.paymentStatus.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>
              {formatDate(transaction.transactionDate || transaction.createdAt)}
            </Text>
          </View>

          {transaction.paymentMethod && (
            <View style={styles.row}>
              <Text style={styles.label}>Payment Method</Text>
              <Text style={styles.value}>
                {transaction.paymentMethod
                  .split('_')
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ')}
              </Text>
            </View>
          )}

          {transaction.paymentCardNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>Card</Text>
              <Text style={styles.value}>
                •••• {transaction.paymentCardNumber.slice(-4)}
              </Text>
            </View>
          )}
        </View>

        {/* Seller/Buyer Info Card */}
        {seller && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {transaction.transactionType === 'sale' ? 'Buyer' : 'Seller'}
              </Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{seller.name || seller.username}</Text>
            </View>

            {seller.username && (
              <View style={styles.row}>
                <Text style={styles.label}>Username</Text>
                <Text style={styles.value}>{seller.username}</Text>
              </View>
            )}

            {seller.email && (
              <View style={styles.row}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{seller.email}</Text>
              </View>
            )}

            {transaction.transactionType === 'sale' &&
              seller.sellerRating > 0 && (
                <View style={styles.row}>
                  <Text style={styles.label}>Seller Rating</Text>
                  <Text style={styles.value}>
                    {seller.sellerRating.toFixed(1)} ⭐
                  </Text>
                </View>
              )}
          </View>
        )}

        {/* Failure/Refund Info */}
        {(transaction.failureReason || transaction.refundedAt) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {transaction.failureReason
                  ? 'Payment Failure'
                  : 'Refund Details'}
              </Text>
            </View>
            <View style={styles.divider} />

            {transaction.failureReason && (
              <View style={styles.row}>
                <Text style={styles.label}>Reason</Text>
                <Text
                  style={[
                    styles.value,
                    { color: theme.colors.palette?.angry500 },
                  ]}
                >
                  {formatFailureReason(transaction.failureReason)}
                </Text>
              </View>
            )}

            {transaction.refundedAt && (
              <View style={styles.row}>
                <Text style={styles.label}>Refunded At</Text>
                <Text style={styles.value}>
                  {formatDate(transaction.refundedAt)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Cancel Purchase Button */}
        {transaction && transaction.transactionType === 'purchase' && (
          <View style={styles.card}>
            {transaction.canCancel ? (
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor:
                      theme.colors.palette?.angry400 ||
                      theme.colors.palette.angry500,
                  },
                ]}
                onPress={() => uiStore.setShowCancelConfirm(true)}
                disabled={uiStore.transactionDetails.isCancelling}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={theme.colors.palette.neutral100}
                />
                <Text style={styles.cancelButtonText}>
                  {uiStore.transactionDetails.isCancelling
                    ? 'Cancelling...'
                    : 'Cancel Purchase'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.cannotCancelInfo}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={theme.colors.textDim}
                />
                <Text
                  style={{
                    ...styles.cannotCancelText,
                    color: theme.colors.textDim,
                  }}
                >
                  {transaction.status === 'refunded' ||
                  transaction.refundAmount > 0
                    ? 'This purchase has already been refunded'
                    : transaction.status !== 'completed'
                      ? `This purchase cannot be cancelled (Status: ${transaction.status})`
                      : 'This purchase cannot be cancelled'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Cancel Confirmation Dialog */}
      <FancyAlert
        visible={uiStore.transactionDetails.showCancelConfirm}
        title="Cancel Purchase"
        message={`Are you sure you want to cancel this purchase? A full refund of ${formatCurrency(transaction.amount)} will be issued.`}
        preset="warning"
        onClose={() => uiStore.setShowCancelConfirm(false)}
        onConfirm={handleCancelPurchase}
        confirmText="Yes, Cancel"
        cancelText="Keep Purchase"
      />

      {/* Success/Error Dialog */}
      <AppDialog
        visible={uiStore.transactionDetails.dialog.visible}
        type={uiStore.transactionDetails.dialog.type}
        title={uiStore.transactionDetails.dialog.title || undefined}
        message={uiStore.transactionDetails.dialog.message}
        onClose={() => uiStore.hideTransactionDetailsDialog()}
        autoClose={uiStore.transactionDetails.dialog.type === 'success'}
      />
    </SafeAreaView>
  )
})

export default TransactionDetailsScreen
