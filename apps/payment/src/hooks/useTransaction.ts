// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useState } from 'react'
import { useStores } from '@/models/helpers/useStores'
import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'
import { Alert } from 'react-native'

interface TransactionData {
  amount: number
  method: string
  email: string
  pinVerified: number
  pinVerifiedAt: string
  recipientId?: number
}

interface TransactionResult {
  success: boolean
  id?: number
  error?: string
  status?: 'completed' | 'pending' | 'failed'
}

export const useTransaction = () => {
  const { userStore } = useStores()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verifyPin = async (pin: string): Promise<boolean> => {
    try {
      if (!userStore.currentUser?.email) {
        throw new Error('User profile not found')
      }

      const user = await queries.getUserByEmail(userStore.currentUser.email)
      if (!user) {
        throw new Error('User data not found')
      }

      // Check if PIN is locked
      if (user.pinLockedUntil) {
        const lockUntil = new Date(user.pinLockedUntil)
        if (lockUntil > new Date()) {
          const remainingTime = Math.ceil(
            (lockUntil.getTime() - Date.now()) / (1000 * 60),
          )
          Alert.alert(
            'PIN Locked',
            `Your PIN is temporarily locked. Please try again in ${remainingTime} minutes.`,
          )
          return false
        }
      }

      // Verify PIN
      if (user.pin !== pin) {
        const newAttempts = (user.pinAttempts || 0) + 1

        // Update PIN attempts
        await mutations.updateUser(user.id, {
          pinAttempts: newAttempts,
          pinLockedUntil:
            newAttempts >= 3
              ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
              : null,
        })

        if (newAttempts >= 3) {
          Alert.alert(
            'PIN Locked',
            'Your PIN has been locked for 30 minutes due to multiple failed attempts.',
          )
        } else {
          Alert.alert(
            'Invalid PIN',
            `Incorrect PIN. You have ${3 - newAttempts} attempts remaining.`,
          )
        }
        return false
      }

      // Reset PIN attempts on successful verification
      if (user.pinAttempts > 0) {
        await mutations.updateUser(user.id, {
          pinAttempts: 0,
          pinLockedUntil: null,
        })
      }

      return true
    } catch (err) {
      const error = err as Error
      Alert.alert('Error', error.message)
      return false
    }
  }

  const simulateTransactionStatus = (): 'completed' | 'pending' | 'failed' => {
    // For now, make all transactions succeed to remove nondeterministic failures
    // and reduce flakiness in the app during testing.
    return 'completed'
  }

  const createP2PTransaction = async (
    data: TransactionData,
  ): Promise<TransactionResult> => {
    try {
      setIsLoading(true)
      setError(null)

      if (!userStore.currentUser?.id) {
        throw new Error('User not found')
      }

      if (!data.recipientId) {
        throw new Error('Recipient not found')
      }

      // Get active wallet for the current user
      const activeWallets = await queries.getActiveWallets(
        userStore.currentUser.id,
      )
      if (!activeWallets || activeWallets.length === 0) {
        throw new Error('No active wallet found')
      }

      const activeWallet = activeWallets[0]

      // Enforce daily and monthly transaction limits
      const dailyLimit = userStore.currentUser?.dailyLimit
      const monthlyLimit = userStore.currentUser?.monthlyLimit

      const now = Date.now()

      // Local day boundaries based on device time
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)

      // Month boundaries
      const startOfMonth = new Date(now)
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const startOfNextMonth = new Date(startOfMonth)
      startOfNextMonth.setMonth(startOfMonth.getMonth() + 1)
      const endOfMonth = new Date(startOfNextMonth.getTime() - 1)

      // Fetch ALL transactions for the day and month ranges (no pagination for limit checking)
      const todaysTransactions = await queries.getAllTransactionsByDateRange(
        activeWallet.id,
        startOfDay.toISOString(),
        endOfDay.toISOString(),
      )

      const monthTransactions = await queries.getAllTransactionsByDateRange(
        activeWallet.id,
        startOfMonth.toISOString(),
        endOfMonth.toISOString(),
      )

      // Only count outgoing TRANSFER transactions (where this wallet is the sender to another wallet).
      // Exclude deposits and withdrawals (self-transactions) as they don't count against transfer limits.
      // Include 'pending' and 'completed' so pending debits also reserve limit.
      const outgoingToday = (todaysTransactions || []).filter(
        (tx: any) =>
          tx.senderWalletId === activeWallet.id &&
          tx.type === 'transfer' &&
          (tx.status === 'completed' || tx.status === 'pending'),
      )
      const outgoingMonth = (monthTransactions || []).filter(
        (tx: any) =>
          tx.senderWalletId === activeWallet.id &&
          tx.type === 'transfer' &&
          (tx.status === 'completed' || tx.status === 'pending'),
      )

      const sentToday = outgoingToday.reduce(
        (sum: number, tx: any) => sum + Number(tx.amount || 0),
        0,
      )

      const sentThisMonth = outgoingMonth.reduce(
        (sum: number, tx: any) => sum + Number(tx.amount || 0),
        0,
      )

      if (
        dailyLimit !== undefined &&
        dailyLimit !== null &&
        Number(dailyLimit) > 0
      ) {
        const availableToday = Math.max(0, Number(dailyLimit) - sentToday)
        if (sentToday + data.amount > Number(dailyLimit)) {
          throw new Error(
            `Daily transaction limit exceeded.\n\n` +
              `Limit: $${Number(dailyLimit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
              `Spent today: $${sentToday.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
              `Available: $${availableToday.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
              `Attempted: $${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
              `Your daily limit resets at midnight.`,
          )
        }
      }

      if (
        monthlyLimit !== undefined &&
        monthlyLimit !== null &&
        Number(monthlyLimit) > 0
      ) {
        const availableThisMonth = Math.max(
          0,
          Number(monthlyLimit) - sentThisMonth,
        )
        if (sentThisMonth + data.amount > Number(monthlyLimit)) {
          throw new Error(
            `Monthly transaction limit exceeded.\n\n` +
              `Limit: $${Number(monthlyLimit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
              `Spent this month: $${sentThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
              `Available: $${availableThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
              `Attempted: $${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
              `Your monthly limit resets on the 1st of each month.`,
          )
        }
      }

      // Check if wallet has sufficient balance
      if (activeWallet.balance < data.amount) {
        throw new Error(
          `Insufficient balance. Available balance: $${activeWallet.balance.toFixed(2)}`,
        )
      }

      // Get recipient's active wallet
      const recipientWallets = await queries.getActiveWallets(data.recipientId)
      if (!recipientWallets || recipientWallets.length === 0) {
        throw new Error('Recipient has no active wallet')
      }

      const recipientWallet = recipientWallets[0]
      const status = simulateTransactionStatus()

      const transactionData = {
        senderWalletId: activeWallet.id,
        receiverWalletId: recipientWallet.id,
        amount: data.amount,
        type: 'transfer' as const,
        status,
        currency: 'USD',
        description: 'P2P Transfer',
        reference: `P2P-${Date.now()}`,
        pinVerified: data.pinVerified,
        pinVerifiedAt: data.pinVerifiedAt,
      }

      const result = await mutations.createTransaction(transactionData)
      if (!result.success) {
        throw new Error('Failed to create transaction')
      }

      if (status === 'completed') {
        // Update both wallets' balances
        await mutations.updateWalletBalance(activeWallet.id)
        await mutations.updateWalletBalance(recipientWallet.id)
      }

      return {
        success: true,
        id: result.id,
        status,
      }
    } catch (err) {
      const error = err as Error
      setError(error.message)
      return {
        success: false,
        error: error.message,
        status: 'failed',
      }
    } finally {
      setIsLoading(false)
    }
  }

  const createDepositeTransaction = async (
    data: TransactionData,
  ): Promise<TransactionResult> => {
    try {
      setIsLoading(true)
      setError(null)

      if (!userStore.currentUser?.id) {
        throw new Error('User not found')
      }

      const activeWallets = await queries.getActiveWallets(
        userStore.currentUser.id,
      )
      if (!activeWallets || activeWallets.length === 0) {
        throw new Error('No active wallet found')
      }

      const activeWallet = activeWallets[0]
      const status = simulateTransactionStatus()

      const transactionData = {
        senderWalletId: activeWallet.id,
        receiverWalletId: activeWallet.id,
        amount: data.amount,
        type: 'deposit' as const,
        status,
        currency: 'USD',
        description: `Deposit via ${data.method}`,
        reference: `Deposit-${Date.now()}`,
        pinVerified: data.pinVerified,
        pinVerifiedAt: data.pinVerifiedAt,
      }

      const result = await mutations.createTransaction(transactionData)
      if (!result.success) {
        throw new Error('Failed to create transaction')
      }

      if (status === 'completed') {
        await mutations.updateWalletBalance(activeWallet.id)
      }

      return {
        success: true,
        id: result.id,
        status,
      }
    } catch (err) {
      const error = err as Error
      setError(error.message)
      return {
        success: false,
        error: error.message,
        status: 'failed',
      }
    } finally {
      setIsLoading(false)
    }
  }

  const createWithdrawalTransaction = async (
    data: TransactionData,
  ): Promise<TransactionResult> => {
    try {
      setIsLoading(true)
      setError(null)

      if (!userStore.currentUser?.id) {
        throw new Error('User not found')
      }

      // Get active wallet and check balance first
      const activeWallets = await queries.getActiveWallets(
        userStore.currentUser.id,
      )
      if (!activeWallets || activeWallets.length === 0) {
        throw new Error('No active wallet found')
      }

      const activeWallet = activeWallets[0]

      // Check if wallet has sufficient balance before proceeding
      if (activeWallet.balance < data.amount) {
        throw new Error(
          `Insufficient balance. Available balance: $${activeWallet.balance.toFixed(2)}`,
        )
      }

      // Use the centralized simulator. Currently it always returns 'completed'.
      const simulatedStatus = simulateTransactionStatus()

      const transactionData = {
        senderWalletId: activeWallet.id,
        receiverWalletId: activeWallet.id,
        amount: data.amount,
        type: 'withdrawal' as const,
        status: simulatedStatus,
        currency: 'USD',
        description: `Withdrawal via ${data.method}`,
        reference: `Withdrawal-${Date.now()}`,
        pinVerified: data.pinVerified,
        pinVerifiedAt: data.pinVerifiedAt,
      }

      const result = await mutations.createTransaction(transactionData)
      if (!result.success) {
        throw new Error('Failed to create withdrawal')
      }

      if (simulatedStatus === 'completed') {
        await mutations.updateWalletBalance(activeWallet.id)
      }

      return {
        success: true,
        id: result.id,
        error: simulatedStatus === 'failed' ? 'Withdrawal failed' : undefined,
      }
    } catch (err) {
      const error = err as Error
      setError(error.message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createP2PTransaction,
    createDepositeTransaction,
    createWithdrawalTransaction,
    verifyPin,
    isLoading,
    error,
  }
}
