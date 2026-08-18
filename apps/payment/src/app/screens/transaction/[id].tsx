import { Screen, Text } from '@/components'
import { queries } from '@/db/queries'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useStores } from '@/models/helpers/useStores'
import { metrics, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width, height } = Dimensions.get('window')

type TransactionType = 'transfer' | 'deposit' | 'withdrawal'
type TransactionStatus = 'completed' | 'pending' | 'failed'

interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
}

interface Wallet {
  id: number
  userId: number
  balance: number
  currency: string
  type: string
  status: string
}

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
  // Additional fields for the enhanced view
  senderWallet?: Wallet
  receiverWallet?: Wallet
  senderUser?: User
  receiverUser?: User
}

export default function TransactionDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const params = useLocalSearchParams()
  const { sessionId, id } = params
  const { userStore, sessionStore } = useStores()
  const { theme } = useAppTheme()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [transactionId, setTransactionId] = useState(id)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('TransactionDetails', '/screens/transaction/[id]')

  useEffect(() => {
    if (sessionId && !isSessionLoaded) {
      try {
        const session = sessionStore.getSession(sessionId as string)

        if (session?.data?.sessionData) {
          const savedState = session.data.sessionData.formData as any
          setTransactionId(savedState.transactionId)
        }
      } catch (error) {
        console.error('Error loading session data:', error)
      }
      setIsSessionLoaded(true)
    } else if (!isSessionLoaded) {
      setIsSessionLoaded(true)
    }
  }, [])

  // Track screen mount
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        transactionId,
        sessionId: sessionId || null,
        timestamp: Date.now(),
        screenDimensions: {
          width,
          height,
        },
      })
    }, [transactionId, sessionId, trackScreenMount]),
  )

  const fetchTransactionDetails = async () => {
    try {
      setIsLoading(true)
      const details = await queries.getTransactionById(Number(transactionId))
      if (details) {
        // Fetch sender wallet and user details
        const senderWallet = await queries.getWalletById(details.senderWalletId)
        const senderUser = senderWallet
          ? await queries.getUserById(senderWallet.userId)
          : null

        // Fetch receiver wallet and user details
        const receiverWallet = await queries.getWalletById(
          details.receiverWalletId,
        )
        const receiverUser = receiverWallet
          ? await queries.getUserById(receiverWallet.userId)
          : null

        setTransaction({
          ...details,
          senderWallet,
          receiverWallet,
          senderUser,
          receiverUser,
        })

        // Track transaction loaded
        trackContentChange({
          event: 'transaction_loaded',
          transactionId: details.id,
          transactionType: details.type,
          transactionStatus: details.status,
          timestamp: Date.now(),
        })
      }
    } catch (error) {
      console.error('Error fetching transaction details:', error)

      // Track error
      trackContentChange({
        event: 'transaction_load_error',
        transactionId,
        error: String(error),
        timestamp: Date.now(),
      })
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => {
    fetchTransactionDetails()
  }, [transactionId])

  const shareReceipt = useCallback(async () => {
    if (!transaction) return

    // Track share action
    trackClick('share_receipt')

    const isReceived =
      transaction.receiverWallet?.userId === userStore.currentUser?.id
    const formattedDate = new Date(transaction.createdAt).toLocaleDateString(
      'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    )

    const senderName = transaction.senderUser
      ? `${transaction.senderUser.firstName} ${transaction.senderUser.lastName}`
      : 'Unknown Sender'
    const receiverName = transaction.receiverUser
      ? `${transaction.receiverUser.firstName} ${transaction.receiverUser.lastName}`
      : 'Unknown Receiver'

    let receiptText = ''

    switch (transaction.type) {
      case 'transfer':
        if (isReceived) {
          receiptText = `Payment Received 💰
------------------
You received ${transaction.amount.toFixed(2)} ${transaction.currency} from ${senderName}
Date: ${formattedDate}
Status: ${
            transaction.status === 'completed'
              ? '✅ Completed'
              : transaction.status === 'pending'
                ? '⏳ Pending'
                : '❌ Failed'
          }
Reference: ${transaction.reference}
${transaction.description ? `\nNote: ${transaction.description}` : ''}`
        } else {
          receiptText = `Payment Sent 💸
------------------
You sent ${transaction.amount.toFixed(2)} ${transaction.currency} to ${receiverName}
Date: ${formattedDate}
Status: ${
            transaction.status === 'completed'
              ? '✅ Completed'
              : transaction.status === 'pending'
                ? '⏳ Pending'
                : '❌ Failed'
          }
Reference: ${transaction.reference}
${transaction.description ? `\nNote: ${transaction.description}` : ''}`
        }
        break

      case 'deposit':
        receiptText = `Deposit Successful 📥
------------------
Amount: ${transaction.amount.toFixed(2)} ${transaction.currency}
Date: ${formattedDate}
Status: ${
          transaction.status === 'completed'
            ? '✅ Completed'
            : transaction.status === 'pending'
              ? '⏳ Pending'
              : '❌ Failed'
        }
Reference: ${transaction.reference}
${transaction.description ? `\nNote: ${transaction.description}` : ''}`
        break

      case 'withdrawal':
        receiptText = `Withdrawal Successful 📤
------------------
Amount: ${transaction.amount.toFixed(2)} ${transaction.currency}
Date: ${formattedDate}
Status: ${
          transaction.status === 'completed'
            ? '✅ Completed'
            : transaction.status === 'pending'
              ? '⏳ Pending'
              : '❌ Failed'
        }
Reference: ${transaction.reference}
${transaction.description ? `\nNote: ${transaction.description}` : ''}`
        break
    }

    try {
      await Share.share({
        message: receiptText,
        title: `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} Receipt`,
      })

      // Track successful share
      trackContentChange({
        event: 'receipt_shared',
        transactionId: transaction.id,
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error('Error sharing receipt:', error)

      // Track share error
      trackContentChange({
        event: 'share_error',
        transactionId: transaction.id,
        error: String(error),
        timestamp: Date.now(),
      })
    }
  }, [transaction, userStore.currentUser?.id, trackClick, trackContentChange])

  const getTransactionColor = useCallback(
    (type: TransactionType, isReceived: boolean) => {
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
    },
    [],
  )

  const getStatusGradient = useCallback(
    (status: TransactionStatus): [string, string] => {
      switch (status) {
        case 'completed':
          return [
            theme.colors.palette.primary100,
            theme.colors.palette.primary200,
          ]
        case 'pending':
          return [
            theme.colors.palette.accent100,
            theme.colors.palette.accent200,
          ]
        case 'failed':
          return [theme.colors.palette.angry100, theme.colors.palette.angry200]
        default:
          return [
            theme.colors.palette.neutral100,
            theme.colors.palette.neutral200,
          ]
      }
    },
    [],
  )

  const getStatusIcon = useCallback((status: TransactionStatus) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle'
      case 'pending':
        return 'time'
      case 'failed':
        return 'close-circle'
      default:
        return 'help-circle'
    }
  }, [])

  const styles = createStyles(theme)

  if (!transaction && !isLoading) {
    return (
      <Screen preset="scroll">
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                trackClick('back_button_error')
                router.back()
              }}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text
              text="Transaction Details"
              size="xl"
              weight="bold"
              style={styles.headerTitle}
            />
            <View style={styles.shareButton} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={theme.colors.error}
            />
            <Text
              text="Transaction not found"
              size="lg"
              weight="medium"
              style={styles.errorText}
            />
          </View>
        </View>
      </Screen>
    )
  }

  return (
    <Screen preset="scroll">
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              trackClick('back_button')
              router.back()
            }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text
            text="Transaction Details"
            size="xl"
            weight="bold"
            style={styles.headerTitle}
          />
          <TouchableOpacity style={styles.shareButton} onPress={shareReceipt}>
            <Ionicons
              name="share-outline"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.palette.primary500}
            />
          </View>
        ) : (
          transaction && (
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.contentContainer}
              onScroll={() => {
                trackContentChange({
                  event: 'transaction_details_scrolled',
                  timestamp: Date.now(),
                })
              }}
              scrollEventThrottle={16}
            >
              {/* Transaction Status Card */}
              <LinearGradient
                colors={getStatusGradient(transaction.status)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statusCard}
                onTouchStart={() => {
                  trackClick('status_card_pressed')
                }}
              >
                <View style={styles.statusIconContainer}>
                  <Ionicons
                    name={getStatusIcon(transaction.status)}
                    size={32}
                    color={
                      transaction.status === 'failed'
                        ? theme.colors.error
                        : theme.colors.palette.primary500
                    }
                  />
                </View>
                <Text
                  text={transaction.status.toUpperCase()}
                  size="lg"
                  weight="bold"
                  style={[
                    styles.statusText,
                    {
                      color:
                        transaction.status === 'failed'
                          ? theme.colors.error
                          : theme.colors.palette.primary500,
                    },
                  ]}
                />
              </LinearGradient>

              {/* Amount Card */}
              <View
                style={styles.amountCard}
                onTouchStart={() => {
                  trackClick('amount_card_pressed')
                }}
              >
                <Text
                  text={transaction.amount.toFixed(2)}
                  size="xxl"
                  weight="bold"
                  style={[
                    styles.amount,
                    {
                      color: getTransactionColor(
                        transaction.type,
                        transaction.receiverWallet?.userId ===
                          userStore.currentUser?.id,
                      ),
                    },
                  ]}
                />
                <Text
                  text={transaction.currency}
                  size="lg"
                  weight="medium"
                  style={styles.currency}
                />
                {transaction.description && (
                  <Text
                    text={transaction.description}
                    size="md"
                    style={styles.description}
                  />
                )}
              </View>

              {/* Transaction Details */}
              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Text text="Type" size="sm" style={styles.detailLabel} />
                  <View style={styles.typeContainer}>
                    <Ionicons
                      name={
                        transaction.type === 'transfer'
                          ? 'swap-horizontal'
                          : transaction.type === 'deposit'
                            ? 'arrow-down'
                            : 'arrow-up'
                      }
                      size={20}
                      color={theme.colors.text}
                    />
                    <Text
                      text={
                        transaction.type.charAt(0).toUpperCase() +
                        transaction.type.slice(1)
                      }
                      size="sm"
                      weight="medium"
                      style={styles.detailValue}
                    />
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text text="Date" size="sm" style={styles.detailLabel} />
                  <Text
                    text={new Date(transaction.createdAt).toLocaleDateString(
                      'en-US',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      },
                    )}
                    size="sm"
                    style={styles.detailValue}
                  />
                </View>

                <View style={styles.detailRow}>
                  <Text text="Reference" size="sm" style={styles.detailLabel} />
                  <Text
                    text={transaction.reference}
                    size="sm"
                    style={styles.detailValue}
                    onPress={() => {
                      trackClick('reference_pressed')
                    }}
                  />
                </View>

                {transaction.pinVerified === 1 && (
                  <View style={styles.detailRow}>
                    <Text
                      text="PIN Verified"
                      size="sm"
                      style={styles.detailLabel}
                    />
                    <View
                      style={styles.verifiedContainer}
                      onTouchStart={() => {
                        trackClick('pin_verified_pressed')
                      }}
                    >
                      <Ionicons
                        name="shield-checkmark"
                        size={20}
                        color={theme.colors.palette.primary500}
                      />
                      <Text
                        text={
                          transaction.pinVerifiedAt
                            ? new Date(
                                transaction.pinVerifiedAt,
                              ).toLocaleString()
                            : 'Yes'
                        }
                        size="sm"
                        style={[
                          styles.detailValue,
                          { color: theme.colors.palette.primary500 },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Sender and Receiver Details */}
              <View style={styles.participantsCard}>
                <View
                  style={styles.participantSection}
                  onTouchStart={() => {
                    trackClick('sender_details_pressed')
                  }}
                >
                  <Text text="From" size="sm" style={styles.participantLabel} />
                  <View style={styles.participantInfo}>
                    <View style={styles.avatarContainer}>
                      <Text
                        text={transaction.senderUser?.firstName?.[0] || '?'}
                        size="xl"
                        weight="bold"
                        style={styles.avatarText}
                      />
                    </View>
                    <View style={styles.participantDetails}>
                      <Text
                        text={
                          transaction.senderUser
                            ? `${transaction.senderUser.firstName} ${transaction.senderUser.lastName}`
                            : 'Unknown Sender'
                        }
                        size="md"
                        weight="medium"
                        style={styles.participantName}
                      />
                      {transaction.senderUser?.email && (
                        <Text
                          text={transaction.senderUser.email}
                          size="sm"
                          style={styles.participantEmail}
                        />
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.participantDivider} />

                <View
                  style={styles.participantSection}
                  onTouchStart={() => {
                    trackClick('receiver_details_pressed')
                  }}
                >
                  <Text text="To" size="sm" style={styles.participantLabel} />
                  <View style={styles.participantInfo}>
                    <View
                      style={[
                        styles.avatarContainer,
                        { backgroundColor: theme.colors.palette.accent500 },
                      ]}
                    >
                      <Text
                        text={transaction.receiverUser?.firstName?.[0] || '?'}
                        size="xl"
                        weight="bold"
                        style={styles.avatarText}
                      />
                    </View>
                    <View style={styles.participantDetails}>
                      <Text
                        text={
                          transaction.receiverUser
                            ? `${transaction.receiverUser.firstName} ${transaction.receiverUser.lastName}`
                            : 'Unknown Receiver'
                        }
                        size="md"
                        weight="medium"
                        style={styles.participantName}
                      />
                      {transaction.receiverUser?.email && (
                        <Text
                          text={transaction.receiverUser.email}
                          size="sm"
                          style={styles.participantEmail}
                        />
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          )
        )}
      </View>
    </Screen>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: metrics.medium,
      paddingVertical: metrics.small,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      marginHorizontal: metrics.medium,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral100,
      justifyContent: 'center',
      alignItems: 'center',
    },
    shareButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral100,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      color: theme.colors.error,
      marginTop: metrics.medium,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: metrics.medium,
      gap: metrics.medium,
    },
    statusCard: {
      borderRadius: metrics.borderRadiusLarge,
      padding: metrics.medium,
      alignItems: 'center',
      gap: metrics.small,
    },
    statusIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statusText: {
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    amountCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
      padding: metrics.medium,
      alignItems: 'center',
      gap: metrics.small,
    },
    amount: {
      fontSize: 40,
    },
    currency: {
      color: theme.colors.textDim,
    },
    description: {
      color: theme.colors.text,
      textAlign: 'center',
      marginTop: metrics.small,
    },
    detailsCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
      padding: metrics.medium,
      gap: metrics.small,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: metrics.tiny,
    },
    detailLabel: {
      color: theme.colors.textDim,
    },
    detailValue: {
      color: theme.colors.text,
      marginLeft: metrics.small,
    },
    typeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.tiny,
    },
    verifiedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.tiny,
    },
    participantsCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
      padding: metrics.medium,
      gap: metrics.medium,
    },
    participantSection: {
      gap: metrics.small,
    },
    participantLabel: {
      color: theme.colors.textDim,
    },
    participantInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.medium,
    },
    avatarContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.palette.primary500,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: theme.colors.palette.neutral100,
    },
    participantDetails: {
      flex: 1,
    },
    participantName: {
      color: theme.colors.text,
    },
    participantEmail: {
      color: theme.colors.textDim,
    },
    participantDivider: {
      height: 1,
      backgroundColor: theme.colors.palette.neutral200,
    },
  })
