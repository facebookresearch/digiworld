import { Text } from '@/components'
import { queries } from '@/db/queries'
import { useStores } from '@/models'
import { Transaction } from '@/models/types'
import { metrics, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

const { height } = Dimensions.get('window')

interface TransactionStatusProps {
  status: 'completed' | 'pending' | 'failed'
  transactionId: number
  onClose: () => void
  visible: boolean
  // Optional error message to display in the sheet instead of the loading text/transaction details
  errorMessage?: string | null
}

export function TransactionStatus({
  status,
  transactionId,
  onClose,
  visible,
  errorMessage,
}: TransactionStatusProps) {
  const { theme } = useAppTheme()
  const slideAnim = useRef(new Animated.Value(height)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { userStore } = useStores()

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: height,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible])

  const fetchTransactionDetails = React.useCallback(async () => {
    try {
      setIsLoading(true)
      if (!userStore.userProfile?.id) {
        console.error('User not found')
        setIsLoading(false)
        return
      }

      // Guard: if transactionId is not valid, skip fetching to avoid noisy errors.
      if (!transactionId || transactionId <= 0) {
        // No transaction to fetch yet (transaction may still be creating). Skip silently.
        setIsLoading(false)
        return
      }

      const wallets = await queries.getActiveWallets(userStore.userProfile.id)
      if (!wallets || wallets.length === 0) {
        throw new Error('No active wallet found')
      }

      const specificTransaction =
        await queries.getTransactionById(transactionId)

      if (specificTransaction) {
        setTransaction(specificTransaction)
      } else {
        // It's possible the transaction isn't immediately visible yet; avoid throwing an error
        // which was causing noisy logs/crashes. We'll leave `transaction` null and show loading state.
        console.warn(`Transaction ${transactionId} not found yet`)
      }
    } catch (error) {
      console.error('Error fetching transaction details:', error)
    } finally {
      setIsLoading(false)
    }
  }, [transactionId, userStore.userProfile?.id])

  useEffect(() => {
    if (visible) {
      fetchTransactionDetails()
    }
  }, [visible, fetchTransactionDetails])

  if (!visible) return null

  const styles = createStyles(theme)

  const getStatusColors = () => {
    switch (status) {
      case 'completed':
        return [
          theme.colors.palette.success400,
          theme.colors.palette.success500,
        ] as const
      case 'pending':
        return [
          theme.colors.palette.accent400,
          theme.colors.palette.accent500,
        ] as const
      case 'failed':
        return [
          theme.colors.palette.angry400,
          theme.colors.palette.angry500,
        ] as const
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle'
      case 'pending':
        return 'time'
      case 'failed':
        return 'close-circle'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Transaction Successful'
      case 'pending':
        return 'Transaction Processing'
      case 'failed':
        return 'Transaction Failed'
    }
  }

  const getStatusDescription = () => {
    switch (status) {
      case 'completed':
        return 'Your money has been sent successfully'
      case 'pending':
        return 'Your transaction is being processed'
      case 'failed':
        return 'There was an error processing your transaction'
    }
  }

  return (
    <>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
      >
        <TouchableOpacity
          style={styles.handleContainer}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <View style={styles.handle} />
        </TouchableOpacity>

        {isLoading || !transaction ? (
          <View style={styles.loadingContainer}>
            {/* If an explicit error message was passed, show it here instead of the generic loading text */}
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <View style={styles.errorIconContainer}>
                  <Ionicons
                    name="alert-circle"
                    size={48}
                    color={theme.colors.palette.angry500}
                  />
                </View>
                <Text
                  text="Transaction Failed"
                  size="lg"
                  weight="bold"
                  style={styles.errorTitle}
                />
                <Text text={errorMessage} style={styles.errorMessage} />
                <TouchableOpacity
                  style={styles.errorCloseButton}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[
                      theme.colors.palette.angry400,
                      theme.colors.palette.angry500,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.errorCloseButtonGradient}
                  >
                    <Text text="Close" style={styles.errorCloseButtonText} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <Text
                text="Loading transaction details..."
                style={styles.loadingText}
              />
            )}
          </View>
        ) : (
          <View style={styles.content}>
            <LinearGradient
              colors={getStatusColors()}
              style={styles.headerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconContainer}>
                    <Ionicons
                      name={getStatusIcon()}
                      size={32}
                      color={theme.colors.palette.neutral100}
                    />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text text={getStatusText()} style={styles.statusText} />
                    <Text
                      text={getStatusDescription()}
                      style={styles.statusDescription}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeButtonContainer}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <View style={styles.closeButton}>
                    <Ionicons
                      name="close"
                      size={20}
                      color={theme.colors.palette.neutral100}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <View style={styles.detailsContainer}>
              <View style={styles.amountContainer}>
                <Text
                  text={`$${(transaction.amount || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
                  style={styles.amount}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                />
              </View>

              <View style={styles.transactionDetails}>
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelContainer}>
                    <Ionicons
                      name="calendar"
                      size={16}
                      color={theme.colors.palette.neutral600}
                    />
                    <Text text="Date" style={styles.detailLabel} />
                  </View>
                  <Text
                    text={new Date(transaction.createdAt).toLocaleString()}
                    style={styles.detailValue}
                  />
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelContainer}>
                    <Ionicons
                      name="receipt"
                      size={16}
                      color={theme.colors.palette.neutral600}
                    />
                    <Text text="Transaction ID" style={styles.detailLabel} />
                  </View>
                  <Text
                    text={`#${transaction.id}`}
                    style={styles.detailValue}
                  />
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelContainer}>
                    <Ionicons
                      name="card"
                      size={16}
                      color={theme.colors.palette.neutral600}
                    />
                    <Text text="Payment Method" style={styles.detailLabel} />
                  </View>
                  <Text text="Bank Transfer" style={styles.detailValue} />
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelContainer}>
                    <Ionicons
                      name="shield-checkmark"
                      size={16}
                      color={theme.colors.palette.neutral600}
                    />
                    <Text text="Security" style={styles.detailLabel} />
                  </View>
                  <Text
                    text={
                      transaction.pinVerified === 1
                        ? 'PIN Verified'
                        : 'Not Verified'
                    }
                    style={styles.detailValue}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.doneButton}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={getStatusColors()}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.doneButtonGradient}
                >
                  <View style={styles.doneButtonContent}>
                    <Text
                      text="Done"
                      style={styles.doneButtonText}
                      weight="bold"
                    />
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={theme.colors.palette.neutral100}
                    />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
    },
    overlayTouchable: {
      flex: 1,
    },
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.palette.neutral100,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
      minHeight: '50%',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      zIndex: 1001,
    },
    handleContainer: {
      width: '100%',
      alignItems: 'center',
      paddingVertical: metrics.small,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.palette.neutral300,
      borderRadius: 2,
    },
    content: {
      flex: 1,
      height: '100%',
    },
    headerGradient: {
      padding: metrics.medium,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: metrics.medium,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    headerTextContainer: {
      flex: 1,
    },
    statusText: {
      color: theme.colors.palette.neutral100,
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 2,
    },
    statusDescription: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: 14,
    },
    closeButtonContainer: {
      marginLeft: metrics.small,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    detailsContainer: {
      flex: 1,
      padding: metrics.medium,
    },
    amountContainer: {
      alignItems: 'center',
      marginBottom: metrics.medium,
      paddingVertical: metrics.medium,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    amount: {
      fontSize: 36,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral800,
      marginBottom: metrics.small,
      lineHeight: 44,
      textAlign: 'center',
      width: '100%',
      paddingHorizontal: metrics.medium,
    },
    transactionDetails: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: metrics.medium,
      marginBottom: metrics.medium,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      flex: 1,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: metrics.small,
    },
    detailLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.tiny,
    },
    detailLabel: {
      color: theme.colors.palette.neutral600,
      fontSize: 14,
      fontWeight: '500',
    },
    detailValue: {
      color: theme.colors.palette.neutral800,
      fontSize: 14,
      fontWeight: '600',
    },
    loadingContainer: {
      padding: metrics.large,
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    loadingText: {
      color: theme.colors.textDim,
      fontSize: 16,
      fontWeight: '500',
    },
    errorContainer: {
      alignItems: 'center',
      padding: metrics.large,
      width: '100%',
    },
    errorIconContainer: {
      marginBottom: metrics.medium,
    },
    errorTitle: {
      color: theme.colors.palette.angry500,
      marginBottom: metrics.medium,
      textAlign: 'center',
    },
    errorMessage: {
      color: theme.colors.textDim,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: metrics.large,
      textAlign: 'center',
    },
    errorCloseButton: {
      borderRadius: 16,
      overflow: 'hidden',
      marginTop: metrics.medium,
      width: '100%',
    },
    errorCloseButtonGradient: {
      paddingVertical: metrics.medium,
      paddingHorizontal: metrics.large,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorCloseButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
    doneButton: {
      borderRadius: 16,
      overflow: 'hidden',
      marginTop: metrics.medium,
    },
    doneButtonGradient: {
      paddingVertical: metrics.medium,
      paddingHorizontal: metrics.large,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: metrics.small,
    },
    doneButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
  })
