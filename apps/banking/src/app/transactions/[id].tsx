// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useMemo } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useStores } from '@/models'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import {
  getTransactionAccountContext,
  getTransactionDescription,
  getTransactionIcon,
} from '@/utils/transactionHelpers'

const { width } = Dimensions.get('window')

const createStyles = (theme: Theme) =>
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
      backgroundColor: theme.colors.palette.overlay20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    transactionType: {
      fontSize: 16,
      color: theme.colors.palette.neutral200,
      marginBottom: 8,
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
    card: {
      borderRadius: 20,
      padding: 0,
      marginBottom: 16,
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
      backgroundColor: theme.colors.palette.neutral300,
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
    accountInfo: {
      alignItems: 'flex-end',
      flex: 1.5,
    },
    accountType: {
      fontSize: 12,
      marginTop: 2,
      color: theme.colors.textDim,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      marginTop: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    imageContainer: {
      padding: 20,
      alignItems: 'center',
    },
    image: {
      width: width - 64,
      height: 200,
      borderRadius: 12,
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
  })

const TransactionDetailsScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { bankingStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const transactionTypes = bankingStore.transactionTypes
  const { trackScreenMount } = useInteractionTracking(
    'Transaction Details',
    `/transactions/${id}`,
  )

  useFocusEffect(
    React.useCallback(() => {
      trackScreenMount({
        date: Date.now(),
        screenName: 'Transaction Details',
        route: `/transactions/${id}`,
      })
    }, []),
  )

  const transaction = bankingStore.transactions.find(
    t => t.id.toString() === id,
  )

  // // Get account info by ID
  // const getAccountInfo = (accountId: number) => {
  //   const account = bankingStore.accounts.find(acc => acc.id === accountId)
  //   if (!account) return null

  //   const accountType = bankingStore.accountTypes.find(
  //     t => t.id === account.accountTypeId,
  //   )
  //   return {
  //     id: account.id,
  //     name: account.accountName || accountType?.name || 'Account',
  //     accountNumber: account.accountNumber,
  //     type: accountType?.name || 'Account',
  //     lastFour: account.accountNumber.slice(-4),
  //   }
  // }

  // Get Zelle contact info by ID
  const getZelleContactInfo = (contactId: number) => {
    const contact = bankingStore.zelleContacts?.find(
      contact => contact.id === contactId,
    )
    return contact
      ? {
          name: contact.contactName,
          email: contact.contactEmail || '',
          phone: contact.contactPhone || '',
        }
      : { name: 'Unknown Contact', email: '', phone: '' }
  }

  // Get biller info by ID
  const getBillerInfo = (billerId: number) => {
    const biller = bankingStore.billers?.find(b => b.id === billerId)
    return biller
      ? {
          name: biller.name,
          category: biller.category || '',
          description: biller.description || '',
        }
      : { name: 'Unknown Biller', category: '', description: '' }
  }

  const getTransactionTypeInfo = (typeId: number) => {
    return (
      transactionTypes.find(type => type.id === typeId) || {
        code: 'unknown',
        name: 'Unknown Transaction',
        category: 'unknown',
        description: 'Unknown transaction type',
      }
    )
  }

  const getTransactionColor = (category: string, code: string) => {
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

  // Format date to more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
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
            color={theme.colors.palette.angry400}
          />
          <Text preset="subheading" style={styles.errorText}>
            Transaction Not Found
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const transactionTypeInfo = getTransactionTypeInfo(
    transaction.transactionTypeId || 0,
  )
  const transactionColor = getTransactionColor(
    transactionTypeInfo.category || 'unknown',
    transactionTypeInfo.code || 'unknown',
  )

  // Get transaction sign and account context
  const formattedAmount = transaction.signedAmount

  // Get account context for display
  const accountContext = getTransactionAccountContext(
    transaction,
    bankingStore.accounts.slice(),
    bankingStore.zelleContacts?.slice(),
    bankingStore.billers?.slice(),
  )

  const transactionDescription = getTransactionDescription(
    transaction,
    accountContext,
    transactionTypeInfo.code,
  )

  const zelleContact = transaction.zelleContactId
    ? getZelleContactInfo(transaction.zelleContactId!)
    : null
  const billerInfo = transaction.billerId
    ? getBillerInfo(transaction.billerId)
    : null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header with back button */}
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

        {/* Transaction Amount Card with Material 3 elevation */}
        <View
          style={[styles.amountCard, { backgroundColor: transactionColor }]}
        >
          <View style={styles.transactionIconContainer}>
            <Ionicons
              name={getTransactionIcon(transactionTypeInfo.code) as any}
              size={32}
              color={theme.colors.palette.neutral100}
            />
          </View>
          <Text style={styles.transactionType}>{transactionDescription}</Text>
          <Text style={styles.amount}>{formattedAmount}</Text>
          <Text style={styles.transactionDate}>
            {formatDate(transaction.transactionDate || transaction.createdAt)}
          </Text>
        </View>

        {/* Account Details Card */}
        {(accountContext.fromAccount || accountContext.toAccount) && (
          <View
            style={[
              styles.card,
              { backgroundColor: (theme.colors as any).surface },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Account Details</Text>
            </View>
            <View style={styles.divider} />

            {accountContext.fromAccount && (
              <View style={styles.row}>
                <Text style={styles.label}>From</Text>
                <View style={styles.accountInfo}>
                  <Text style={styles.value}>
                    {accountContext.fromAccount.name}
                  </Text>
                  {(accountContext.fromAccount as any).lastFour && (
                    <Text style={styles.accountType}>
                      {accountContext.fromAccount.type} ••••{' '}
                      {(accountContext.fromAccount as any).lastFour}
                    </Text>
                  )}
                  {(accountContext.fromAccount as any).category && (
                    <Text style={styles.accountType}>
                      {(accountContext.fromAccount as any).category}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {accountContext.toAccount && (
              <View style={styles.row}>
                <Text style={styles.label}>To</Text>
                <View style={styles.accountInfo}>
                  <Text style={styles.value}>
                    {accountContext.toAccount.name}
                  </Text>
                  {(accountContext.toAccount as any).lastFour && (
                    <Text style={styles.accountType}>
                      {accountContext.toAccount.type} ••••{' '}
                      {(accountContext.toAccount as any).lastFour}
                    </Text>
                  )}
                  {(accountContext.toAccount as any).category && (
                    <Text style={styles.accountType}>
                      {(accountContext.toAccount as any).category}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Contact/Biller Details Card */}
        {(zelleContact || billerInfo) && (
          <View
            style={[
              styles.card,
              { backgroundColor: (theme.colors as any).surface },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {zelleContact ? 'Nexus Contact' : 'Biller Information'}
              </Text>
            </View>
            <View style={styles.divider} />

            {zelleContact && (
              <>
                <View style={styles.row}>
                  <Text style={styles.label}>Contact Name</Text>
                  <Text style={styles.value}>{zelleContact.name}</Text>
                </View>

                {zelleContact.email && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Email</Text>
                    <Text style={styles.value}>{zelleContact.email}</Text>
                  </View>
                )}

                {zelleContact.phone && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Phone</Text>
                    <Text style={styles.value}>{zelleContact.phone}</Text>
                  </View>
                )}
              </>
            )}

            {billerInfo && (
              <>
                <View style={styles.row}>
                  <Text style={styles.label}>Biller Name</Text>
                  <Text style={styles.value}>{billerInfo.name}</Text>
                </View>

                {billerInfo.category && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Category</Text>
                    <Text style={styles.value}>{billerInfo.category}</Text>
                  </View>
                )}

                {billerInfo.description && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Description</Text>
                    <Text style={styles.value}>{billerInfo.description}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Transaction Details Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: (theme.colors as any).surface },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Transaction Details</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.value}>{transaction.description}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Amount</Text>
            <Text
              style={{
                ...styles.value,
                color: transaction.isOutgoing
                  ? theme.colors.palette.angry400
                  : theme.colors.palette.success400,
              }}
            >
              {formattedAmount}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Fee</Text>
            <Text style={styles.value}>${transaction.fee.toFixed(2)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Balance Before</Text>
            <Text style={styles.value}>
              ${transaction.balanceBefore?.toFixed(2) || 'N/A'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Balance After</Text>
            <Text style={styles.value}>
              ${transaction.balanceAfter?.toFixed(2) || 'N/A'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>
              {formatDate(transaction.transactionDate || transaction.createdAt)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Posted Date</Text>
            <Text style={styles.value}>
              {transaction.postedDate
                ? formatDate(transaction.postedDate)
                : 'N/A'}
            </Text>
          </View>

          {transaction.pendingUntil && (
            <View style={styles.row}>
              <Text style={styles.label}>Pending Until</Text>
              <Text style={styles.value}>
                {formatDate(transaction.pendingUntil)}
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    transaction.status === 'success'
                      ? theme.colors.palette.success400 + '20'
                      : theme.colors.palette.angry400 + '20',
                },
              ]}
            >
              <Text
                style={{
                  ...styles.statusText,
                  color:
                    transaction.status === 'success'
                      ? theme.colors.palette.success400
                      : theme.colors.palette.angry400,
                }}
              >
                {transaction.status === 'success' ? 'Completed' : 'Failed'}
              </Text>
            </View>
          </View>
        </View>

        {/* Additional Details Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: (theme.colors as any).surface },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Additional Details</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Reference ID</Text>
            <Text style={styles.value}>{transaction.referenceId || 'N/A'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Confirmation Number</Text>
            <Text style={styles.value}>
              {transaction.confirmationNumber || 'N/A'}
            </Text>
          </View>

          {transaction.memo && (
            <View style={styles.row}>
              <Text style={styles.label}>Memo</Text>
              <Text style={styles.value}>{transaction.memo}</Text>
            </View>
          )}

          {transaction.failureReason && (
            <View style={styles.row}>
              <Text style={styles.label}>Failure Reason</Text>
              <Text
                style={{
                  ...styles.value,
                  color: theme.colors.palette.angry400,
                }}
              >
                {transaction.failureReason}
              </Text>
            </View>
          )}

          {transaction.errorCode && (
            <View style={styles.row}>
              <Text style={styles.label}>Error Code</Text>
              <Text
                style={{
                  ...styles.value,
                  color: theme.colors.palette.angry400,
                }}
              >
                {transaction.errorCode}
              </Text>
            </View>
          )}

          {transaction.errorMessage && (
            <View style={styles.row}>
              <Text style={styles.label}>Error Message</Text>
              <Text
                style={{
                  ...styles.value,
                  color: theme.colors.palette.angry400,
                }}
              >
                {transaction.errorMessage}
              </Text>
            </View>
          )}

          {transaction.metadata && (
            <View style={styles.row}>
              <Text style={styles.label}>Metadata</Text>
              <Text style={styles.value}>{transaction.metadata}</Text>
            </View>
          )}
        </View>

        {transaction.image && (
          <View
            style={[
              styles.card,
              { backgroundColor: (theme.colors as any).surface },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Transaction Receipt</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.imageContainer}>
              <Image source={{ uri: transaction.image }} style={styles.image} />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default TransactionDetailsScreen
