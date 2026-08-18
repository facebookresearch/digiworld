// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Button, Card, Screen, Text } from '@/components'
import { queries } from '@/db/queries'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useStores } from '@/models'
import { Transaction } from '@/models/types'
import { metrics, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Dimensions,
  Easing,
  Platform,
  Animated as RNAnimated,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width, height } = Dimensions.get('window')

export default function WithdrawalSuccessScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams()
  const { userStore, sessionStore } = useStores()
  const { theme } = useAppTheme()
  const { trackScreenMount, trackClick } = useInteractionTracking(
    'WithdrawalSuccess',
    '/screens/payment/withdrawal-success',
  )

  // Session parameters
  const sessionId =
    typeof params.sessionId === 'string' ? params.sessionId : null
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  // Validate and parse parameters
  const id =
    typeof params.transactionId === 'string'
      ? parseInt(params.transactionId, 10)
      : null

  const [transactionId, setTransactionId] = useState(id)

  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [walletBalance, setWalletBalance] = useState<string>('0.00')
  const [transactionStatus, setTransactionStatus] = useState<string>('')
  const [amount, setAmount] = useState<string>('0')
  const [method, setMethod] = useState<string>('bank')

  // Animation values
  const scaleAnim = React.useRef(new RNAnimated.Value(0)).current
  const opacityAnim = React.useRef(new RNAnimated.Value(0)).current
  const bounceAnim = React.useRef(new RNAnimated.Value(0)).current
  const confettiAnim = React.useRef(new RNAnimated.Value(0)).current
  const cardSlideAnim = React.useRef(new RNAnimated.Value(width)).current
  const balanceCountAnim = React.useRef(new RNAnimated.Value(0)).current
  const balanceTextAnim = React.useRef(new RNAnimated.Value(0)).current
  const tipCardAnim = React.useRef(new RNAnimated.Value(0)).current
  const buttonAnim = React.useRef(new RNAnimated.Value(0)).current

  // Load session data if exists (useful for restoring scroll position or animations)
  useEffect(() => {
    if (params.sessionTimeStamp) {
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
  }, [params.sessionTimeStamp, sessionStore])

  // Track screen mount and save session state
  useFocusEffect(
    useCallback(() => {
      // Track the screen mount with transaction details
      trackScreenMount({
        transactionId,
        timestamp: Date.now(),
        platform: Platform.OS,
        screenDimensions: {
          width,
          height,
        },
      })
    }, [transactionId]),
  )

  useEffect(() => {
    // Fetch the specific transaction and wallet balance
    const fetchTransactionDetails = async () => {
      if (!userStore.userProfile?.id) {
        console.error('User not found')
        return
      }

      try {
        // Get user's wallet
        const wallets = await queries.getActiveWallets(userStore.userProfile.id)
        if (!wallets || wallets.length === 0) {
          throw new Error('No active wallet found')
        }

        const walletId = wallets[0].id

        // Get specific transaction by ID
        if (transactionId) {
          const specificTransaction =
            await queries.getTransactionById(transactionId)
          if (specificTransaction) {
            setTransaction(specificTransaction)
            setAmount(specificTransaction.amount.toString())
            setMethod(specificTransaction.method || 'bank')

            // Update transaction status if available
            if (specificTransaction.status) {
              setTransactionStatus(specificTransaction.status)
            }
          } else {
            throw new Error('Transaction not found')
          }
        }

        // Get wallet balance
        const wallet = await queries.getWalletById(walletId)
        if (wallet) {
          setWalletBalance(wallet.balance.toFixed(2))
        }
      } catch (error) {
        console.error('Error fetching transaction details:', error)
        Alert.alert('Error', 'Failed to load transaction details', [
          {
            text: 'Go Back',
            onPress: () => router.back(),
          },
        ])
      }
    }

    fetchTransactionDetails()
  }, [userStore.userProfile?.id, transactionId, sessionId])

  useEffect(() => {
    // Staggered animation sequence
    const animationSequence = [
      RNAnimated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }),

      RNAnimated.timing(confettiAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),

      RNAnimated.timing(cardSlideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),

      RNAnimated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),

      RNAnimated.timing(balanceTextAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),

      RNAnimated.timing(balanceCountAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),

      RNAnimated.timing(tipCardAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),

      RNAnimated.timing(buttonAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]

    // Start the animation sequence
    RNAnimated.sequence(animationSequence).start()

    // Continuous bounce animation for the success icon
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(bounceAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        RNAnimated.timing(bounceAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [])

  const handleGoHome = () => {
    trackClick('go_home')

    // Clear session data if needed when navigating away
    if (sessionId) {
      try {
        if (transactionStatus.toLowerCase() === 'completed') {
          // Find the session to remove
          const sessionsArray = sessionStore.sessions
          const sessionIndex = sessionsArray.findIndex(s => s.id === sessionId)
          if (sessionIndex >= 0) {
            // Remove the session from the array if found
            sessionsArray.splice(sessionIndex, 1)
          }
        }
      } catch (error) {
        console.error('Error clearing session data:', error)
      }
    }

    router.replace('/(tabs)/home')
  }

  const handleViewTransactions = () => {
    trackClick('view_transactions')

    // Pass sessionId to the transactions screen to continue tracking
    if (sessionId) {
      router.replace({
        pathname: '/(tabs)/transactions',
        params: { sessionId },
      })
    } else {
      router.replace('/(tabs)/transactions')
    }
  }

  // ... rest of the animation styles and helper functions from deposit-success.tsx ...

  // Render confetti particles
  const renderConfetti = () => {
    const confetti = []
    const confettiColors = [
      theme.colors.palette.primary300,
      theme.colors.palette.primary400,
      theme.colors.palette.secondary400,
      theme.colors.palette.accent400,
      theme.colors.palette.neutral100,
    ]

    for (let i = 0; i < 50; i++) {
      const size = Math.random() * 8 + 4
      const left = Math.random() * width
      const color =
        confettiColors[Math.floor(Math.random() * confettiColors.length)]

      const animStyle = {
        position: 'absolute',
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: size / 2,
        left,
        top: -20,
        opacity: confettiAnim.interpolate({
          inputRange: [0, 0.2, 0.8, 1],
          outputRange: [0, 1, 1, 0],
        }),
        transform: [
          {
            translateY: confettiAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 500 + Math.random() * 200],
              extrapolate: 'clamp',
            }),
          },
          {
            translateX: confettiAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, (Math.random() - 0.5) * 200],
              extrapolate: 'clamp',
            }),
          },
          {
            rotate: confettiAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', `${Math.random() * 360}deg`],
            }),
          },
        ],
      }

      confetti.push(<RNAnimated.View key={i} style={animStyle as any} />)
    }

    return confetti
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
  }

  // Get status color based on transaction status
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return theme.colors.palette.success400
      case 'processing':
      case 'pending':
        return theme.colors.palette.accent400
      case 'failed':
        return theme.colors.palette.angry500
      default:
        return theme.colors.palette.primary400
    }
  }

  // Get status icon based on transaction status
  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'checkmark-circle'
      case 'processing':
      case 'pending':
        return 'time'
      case 'failed':
        return 'close-circle'
      default:
        return 'checkmark-circle'
    }
  }

  const styles = createStyles(theme)

  return (
    <Screen preset="scroll" style={styles.container} keyboardBottomOffset={0}>
      <LinearGradient
        colors={[
          transactionStatus === 'failed'
            ? theme.colors.palette.angry400
            : transactionStatus === 'pending' ||
                transactionStatus === 'processing'
              ? theme.colors.palette.accent400
              : theme.colors.palette.success400,
          transactionStatus === 'failed'
            ? theme.colors.palette.angry500
            : transactionStatus === 'pending' ||
                transactionStatus === 'processing'
              ? theme.colors.palette.secondary500
              : theme.colors.palette.success500,
        ]}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Confetti animation */}
      <View style={styles.confettiContainer}>{renderConfetti()}</View>

      <View
        style={[
          styles.mainContainer,
          {
            paddingTop: insets.top || metrics.medium,
            paddingBottom: insets.bottom || metrics.medium,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Success Icon */}
            <RNAnimated.View
              style={[
                styles.successIconContainer,
                {
                  transform: [
                    { scale: scaleAnim },
                    {
                      translateY: bounceAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -10],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.iconCircle}>
                <Ionicons
                  name={getStatusIcon(transactionStatus)}
                  size={64}
                  color={getStatusColor(transactionStatus)}
                />
              </View>
            </RNAnimated.View>

            {/* Success Text */}
            <RNAnimated.View
              style={[
                styles.textContainer,
                {
                  opacity: opacityAnim,
                  transform: [
                    {
                      translateY: opacityAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text
                text={
                  transactionStatus === 'completed'
                    ? 'Withdrawal Successful!'
                    : transactionStatus === 'pending'
                      ? 'Withdrawal Processing...'
                      : 'Withdrawal Failed!'
                }
                preset="heading"
                style={styles.title}
              />

              <Text
                text={
                  transactionStatus === 'completed'
                    ? `$${amount} has been withdrawn from your wallet`
                    : transactionStatus === 'pending'
                      ? `$${amount} withdrawal is being processed`
                      : `$${amount} withdrawal could not be completed`
                }
                size="lg"
                style={styles.subtitle}
              />
            </RNAnimated.View>

            {/* Balance Card */}
            <RNAnimated.View
              style={[
                styles.balanceCardContainer,
                {
                  opacity: balanceTextAnim,
                  transform: [
                    {
                      translateY: balanceTextAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.balanceCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text
                  text="Current Balance"
                  size="sm"
                  style={styles.balanceLabel}
                />
                <View style={styles.balanceRow}>
                  <Text text="$" size="lg" style={styles.currencySymbol} />
                  <RNAnimated.Text style={styles.balanceAmount}>
                    {balanceCountAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        parseFloat(walletBalance) + parseFloat(amount),
                        parseFloat(walletBalance),
                      ],
                    })}
                  </RNAnimated.Text>
                </View>
              </LinearGradient>
            </RNAnimated.View>

            {/* Transaction Details Card */}
            <RNAnimated.View
              style={[
                styles.detailsCardContainer,
                {
                  transform: [
                    {
                      translateX: cardSlideAnim,
                    },
                  ],
                },
              ]}
            >
              <Card
                preset="default"
                style={[
                  styles.detailsCard,
                  transactionStatus === 'failed'
                    ? styles.failedCard
                    : transactionStatus === 'pending' ||
                        transactionStatus === 'processing'
                      ? styles.processingCard
                      : styles.successCard,
                ]}
                heading="Transaction Details"
                headingStyle={styles.detailsHeading}
                ContentComponent={
                  <View>
                    {transaction ? (
                      <>
                        <View style={styles.detailRow}>
                          <Text text="Amount" style={styles.detailLabel} />
                          <Text
                            text={`$${amount}`}
                            weight="bold"
                            style={styles.detailValue}
                          />
                        </View>

                        <View style={styles.detailRow}>
                          <Text
                            text="Payment Method"
                            style={styles.detailLabel}
                          />
                          <Text
                            text={
                              method === 'bank'
                                ? 'Bank Account'
                                : method === 'card'
                                  ? 'Credit/Debit Card'
                                  : 'Apple Pay'
                            }
                            style={styles.detailValue}
                          />
                        </View>

                        <View style={styles.detailRow}>
                          <Text text="Date" style={styles.detailLabel} />
                          <Text
                            text={formatDate(transaction.createdAt)}
                            style={styles.detailValue}
                          />
                        </View>

                        <View style={styles.detailRow}>
                          <Text
                            text="Transaction ID"
                            style={styles.detailLabel}
                          />
                          <Text
                            text={`#${transaction.id}`}
                            style={styles.detailValue}
                          />
                        </View>

                        <View style={styles.detailRow}>
                          <Text text="Status" style={styles.detailLabel} />
                          <View style={styles.statusContainer}>
                            <View
                              style={[
                                styles.statusDot,
                                {
                                  backgroundColor:
                                    getStatusColor(transactionStatus),
                                },
                              ]}
                            />
                            <Text
                              text={transactionStatus || 'Completed'}
                              style={[
                                styles.statusText,
                                { color: getStatusColor(transactionStatus) },
                              ]}
                            />
                          </View>
                        </View>

                        <View style={styles.detailRow}>
                          <Text text="Type" style={styles.detailLabel} />
                          <Text
                            text={transaction.type || 'Withdrawal'}
                            style={{
                              ...styles.detailValue,
                              ...styles.textTransform,
                            }}
                          />
                        </View>
                      </>
                    ) : (
                      <View style={styles.loadingContainer}>
                        <Text
                          text="Loading transaction details..."
                          style={styles.loadingText}
                        />
                        <View style={styles.shimmerContainer}>
                          <View style={styles.shimmer} />
                          <View style={styles.shimmer} />
                          <View style={styles.shimmer} />
                          <View style={styles.shimmer} />
                        </View>
                      </View>
                    )}
                  </View>
                }
              />
            </RNAnimated.View>
          </View>
        </ScrollView>

        {/* Buttons */}
        <RNAnimated.View
          style={[
            styles.buttonContainer,
            {
              opacity: buttonAnim,
              transform: [
                {
                  translateY: buttonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Button
            text="View Transactions"
            preset="reversed"
            style={styles.button}
            onPress={handleViewTransactions}
            LeftAccessory={props => (
              <Ionicons
                name="list"
                size={20}
                color={theme.colors.palette.neutral100}
                style={props.style}
              />
            )}
          />

          <Button
            text="Back to Home"
            preset="filled"
            style={styles.primaryButton}
            onPress={handleGoHome}
            LeftAccessory={props => (
              <Ionicons
                name="home"
                size={20}
                color={theme.colors.palette.primary400}
                style={props.style}
              />
            )}
          />
        </RNAnimated.View>

        {/* Enhanced Tips Section */}
        <RNAnimated.View
          style={[
            styles.tipsContainer,
            {
              opacity: buttonAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
              transform: [
                {
                  translateY: buttonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.tipDivider}>
            <View style={styles.tipDividerLine} />
            <Text text="TIPS" size="xs" style={styles.tipDividerText} />
            <View style={styles.tipDividerLine} />
          </View>

          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Ionicons
                name="time-outline"
                size={20}
                color={
                  transactionStatus === 'failed'
                    ? theme.colors.palette.angry500
                    : transactionStatus === 'pending' ||
                        transactionStatus === 'processing'
                      ? theme.colors.palette.secondary400
                      : theme.colors.palette.primary400
                }
              />
              <Text
                text="Recent transactions appear at the top of your transaction history."
                size="xs"
                style={styles.tipItemText}
              />
            </View>

            <View style={styles.tipItem}>
              <Ionicons
                name="download-outline"
                size={20}
                color={
                  transactionStatus === 'failed'
                    ? theme.colors.palette.angry500
                    : transactionStatus === 'pending' ||
                        transactionStatus === 'processing'
                      ? theme.colors.palette.secondary400
                      : theme.colors.palette.primary400
                }
              />
              <Text
                text="You can download a receipt of this transaction from the transaction details screen."
                size="xs"
                style={styles.tipItemText}
              />
            </View>

            <View style={styles.tipItem}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color={
                  transactionStatus === 'failed'
                    ? theme.colors.palette.angry500
                    : transactionStatus === 'pending' ||
                        transactionStatus === 'processing'
                      ? theme.colors.palette.secondary400
                      : theme.colors.palette.primary400
                }
              />
              <Text
                text={
                  transactionStatus === 'pending' ||
                  transactionStatus === 'processing'
                    ? "You'll receive a notification when this transaction is completed."
                    : 'Enable notifications to stay updated on all your transactions.'
                }
                size="xs"
                style={styles.tipItemText}
              />
            </View>
          </View>
        </RNAnimated.View>
      </View>
    </Screen>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    background: {
      ...StyleSheet.absoluteFillObject,
    },
    confettiContainer: {
      ...StyleSheet.absoluteFillObject,
      pointerEvents: 'none',
    },
    mainContainer: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: metrics.medium,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: metrics.xl,
    },
    successIconContainer: {
      marginBottom: metrics.xl,
      alignItems: 'center',
    },
    iconCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.palette.neutral100,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 10,
      borderWidth: 4,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    textContainer: {
      alignItems: 'center',
      width: '100%',
    },
    title: {
      color: theme.colors.palette.neutral100,
      marginBottom: metrics.small,
      textAlign: 'center',
      fontSize: 28,
      textShadowColor: 'rgba(0,0,0,0.2)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    subtitle: {
      color: theme.colors.palette.neutral200,
      marginBottom: metrics.large,
      textAlign: 'center',
    },
    balanceCardContainer: {
      width: '100%',
      marginBottom: metrics.medium,
    },
    balanceCard: {
      borderRadius: metrics.borderRadiusLarge,
      padding: metrics.medium,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    balanceLabel: {
      color: theme.colors.palette.neutral100,
      marginBottom: metrics.small,
      opacity: 0.8,
    },
    balanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    currencySymbol: {
      color: theme.colors.palette.neutral100,
      marginRight: metrics.tiny,
    },
    balanceAmount: {
      color: theme.colors.palette.neutral100,
      fontSize: 32,
      fontWeight: 'bold',
    },
    detailsCardContainer: {
      width: '100%',
      marginBottom: metrics.medium,
    },
    detailsCard: {
      backgroundColor: theme.colors.palette.neutral100,
      width: '100%',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
      borderRadius: metrics.borderRadiusLarge,
      padding: metrics.medium,
      borderLeftWidth: 5,
    },
    successCard: {
      borderLeftColor: theme.colors.palette.success400,
    },
    processingCard: {
      borderLeftColor: theme.colors.palette.secondary400,
    },
    failedCard: {
      borderLeftColor: theme.colors.palette.angry500,
    },
    detailsHeading: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: metrics.medium,
      textAlign: 'center',
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: metrics.small,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
      alignItems: 'center',
    },
    detailLabel: {
      color: theme.colors.textDim,
      flex: 1,
      fontSize: 16,
    },
    detailValue: {
      color: theme.colors.text,
      textAlign: 'right',
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flex: 1,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.palette.success400,
      marginRight: metrics.tiny,
    },
    statusText: {
      color: theme.colors.palette.success400,
      fontWeight: 'bold',
      textTransform: 'capitalize',
    },
    buttonContainer: {
      width: '100%',
      paddingHorizontal: metrics.small,
      paddingTop: metrics.tiny,
    },
    button: {
      marginBottom: metrics.medium,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusMedium,
      shadowColor: 'rgba(0,0,0,0.3)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    primaryButton: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusMedium,
      shadowColor: 'rgba(0,0,0,0.3)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    loadingContainer: {
      padding: metrics.medium,
      alignItems: 'center',
    },
    loadingText: {
      marginBottom: metrics.medium,
      color: theme.colors.textDim,
    },
    shimmerContainer: {
      width: '100%',
    },
    shimmer: {
      height: 20,
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: metrics.borderRadiusSmall,
      marginBottom: metrics.small,
      opacity: 0.7,
    },
    tipsContainer: {
      width: '100%',
      paddingHorizontal: metrics.medium,
      paddingBottom: metrics.medium,
      marginTop: metrics.small,
    },
    tipDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: metrics.medium,
    },
    tipDividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    tipDividerText: {
      color: 'rgba(255,255,255,0.6)',
      marginHorizontal: metrics.small,
      fontWeight: '600',
    },
    tipsList: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: metrics.borderRadiusMedium,
      padding: metrics.medium,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
    },
    tipItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: metrics.medium,
    },
    tipItemText: {
      color: theme.colors.palette.neutral100,
      marginLeft: metrics.small,
      flex: 1,
      opacity: 0.9,
    },
    textTransform: {
      textTransform: 'capitalize',
    },
  })
