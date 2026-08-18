import { Screen, Text } from '@/components'
import { queries } from '@/db/queries'
import { Transaction } from '@/models/types'
import { colors, metrics } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useStores } from '@/models'

const { width, height } = Dimensions.get('window')

const TransactionDetailsScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { id, sessionId } = params
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [transactionId, setTransactionId] = useState(id)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const { sessionStore } = useStores()
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('TransactionDetails', '/transaction/[id]')

  // Load session data if exists
  useEffect(() => {
    if (sessionId && !isSessionLoaded) {
      try {
        const session = sessionStore.getSession(String(sessionId))
        if (session?.data?.sessionData) {
          const savedState = session.data.sessionData.formData as any
          setTransactionId(savedState.transactionId)
        }

        // We're not setting any state from session, just registering that we checked
        trackContentChange({
          event: 'session_checked',
          sessionId,
          transactionId: id,
          timestamp: Date.now(),
        })
      } catch (error) {
        console.error('Error loading session data:', error)
      }
      setIsSessionLoaded(true)
    } else if (!isSessionLoaded) {
      setIsSessionLoaded(true)
    }
  }, [sessionId, isSessionLoaded, sessionStore, id, trackContentChange])

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
    }, [transactionId, sessionId, trackScreenMount, width, height]),
  )

  const pollAttempts = useRef(0)
  const pollInterval = useRef<number | null>(null)

  const fetchTransaction = useCallback(async () => {
    try {
      setIsLoading(true)
      const transactionDetails = await queries.getTransactionById(
        Number(transactionId),
      )
      if (transactionDetails) {
        setTransaction(transactionDetails)
      }
    } catch (error) {
      console.error('Error fetching transaction:', error)
    } finally {
      setIsLoading(false)
    }
  }, [transactionId])

  useEffect(() => {
    // initial fetch
    pollAttempts.current = 0
    fetchTransaction()

    // If transaction not found, poll for a short period (e.g. 10s)
    if (!transaction) {
      pollInterval.current = Number(
        setInterval(async () => {
          if (pollAttempts.current >= 10) {
            if (pollInterval.current) {
              clearInterval(pollInterval.current)
              pollInterval.current = null
            }
            return
          }

          pollAttempts.current += 1
          try {
            const t = await queries.getTransactionById(Number(transactionId))
            if (t) {
              setTransaction(t)
              if (pollInterval.current) {
                clearInterval(pollInterval.current)
                pollInterval.current = null
              }
            }
          } catch (err) {
            console.error('Polling error fetching transaction:', err)
          }
        }, 1000),
      )
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
        pollInterval.current = null
      }
    }
  }, [transactionId, fetchTransaction])

  const handleRetry = async () => {
    pollAttempts.current = 0
    if (pollInterval.current) {
      clearInterval(pollInterval.current)
      pollInterval.current = null
    }
    await fetchTransaction()
    if (!transaction) {
      pollInterval.current = Number(
        setInterval(async () => {
          if (pollAttempts.current >= 10) {
            if (pollInterval.current) {
              clearInterval(pollInterval.current)
              pollInterval.current = null
            }
            return
          }
          pollAttempts.current += 1
          try {
            const t = await queries.getTransactionById(Number(transactionId))
            if (t) {
              setTransaction(t)
              if (pollInterval.current) {
                clearInterval(pollInterval.current)
                pollInterval.current = null
              }
            }
          } catch (err) {
            console.error('Polling error fetching transaction:', err)
          }
        }, 1000),
      )
    }
  }

  if (isLoading) {
    return (
      <Screen preset="fixed" backgroundColor={colors.palette.neutral100}>
        <View style={styles.loadingContainer}>
          <Text text="Loading transaction details..." />
        </View>
      </Screen>
    )
  }

  if (!transaction) {
    return (
      <Screen preset="fixed" backgroundColor={colors.palette.neutral100}>
        <View style={styles.loadingContainer}>
          <Text text="Transaction not found" />
          <TouchableOpacity
            onPress={handleRetry}
            style={[styles.backButton, { marginTop: metrics.medium }]}
          >
            <Text text="Retry" style={{ color: colors.palette.neutral100 }} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { marginTop: metrics.small }]}
          >
            <Text text="Back" style={{ color: colors.palette.neutral100 }} />
          </TouchableOpacity>
        </View>
      </Screen>
    )
  }

  const isOutgoing = transaction.type === 'transfer'
  const formattedDate = new Date(transaction.createdAt).toLocaleDateString(
    undefined,
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  )
  const formattedTime = new Date(transaction.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Screen preset="scroll" backgroundColor={colors.palette.neutral100}>
      <LinearGradient
        colors={[colors.palette.primary400, colors.palette.secondary400]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              trackClick('back_button')
              router.back()
            }}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={colors.palette.neutral100}
            />
          </TouchableOpacity>
          <Text
            text="Transaction Details"
            style={styles.headerTitle}
            weight="bold"
          />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.card}>
          <View style={styles.amountSection}>
            <LinearGradient
              colors={
                isOutgoing
                  ? [colors.palette.primary400, colors.palette.primary500]
                  : [colors.palette.secondary400, colors.palette.secondary500]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.amountContainer}
            >
              <Ionicons
                name={isOutgoing ? 'arrow-forward' : 'arrow-back'}
                size={32}
                color={colors.palette.neutral100}
              />
              <Text
                text={`${transaction.amount} ${transaction.currency}`}
                style={styles.amountText}
                weight="bold"
              />
              <Text
                text={isOutgoing ? 'Sent' : 'Received'}
                style={styles.typeText}
              />
            </LinearGradient>
          </View>

          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Text text="Status" style={styles.detailLabel} />
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      transaction.status === 'completed'
                        ? colors.palette.success100
                        : colors.palette.failed,
                  },
                ]}
              >
                <Text
                  text={transaction.status}
                  style={[
                    styles.statusText,
                    {
                      color:
                        transaction.status === 'completed'
                          ? colors.palette.success500
                          : colors.palette.primary500,
                    },
                  ]}
                  weight="medium"
                />
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text text="Date" style={styles.detailLabel} />
              <Text text={formattedDate} style={styles.detailValue} />
            </View>

            <View style={styles.detailRow}>
              <Text text="Time" style={styles.detailLabel} />
              <Text text={formattedTime} style={styles.detailValue} />
            </View>

            <View style={styles.detailRow}>
              <Text text="Transaction ID" style={styles.detailLabel} />
              <Text
                text={`#${transaction.id}`}
                style={styles.detailValue}
                onPress={() => {
                  trackClick('transaction_id_pressed')
                }}
              />
            </View>

            {transaction.pinVerified === 1 && (
              <View style={styles.detailRow}>
                <Text text="PIN Verified" style={styles.detailLabel} />
                <View style={styles.verifiedBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={colors.palette.success500}
                  />
                  <Text text="Verified" style={styles.verifiedText} />
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: metrics.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    paddingHorizontal: metrics.medium,
    paddingBottom: metrics.medium,
    paddingTop: metrics.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: metrics.medium,
  },
  headerTitle: {
    color: colors.palette.neutral100,
    fontSize: 20,
    marginLeft: metrics.medium,
  },
  backButton: {
    padding: metrics.small,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
  },
  card: {
    backgroundColor: colors.palette.neutral100,
    borderRadius: 24,
    shadowColor: colors.palette.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  amountSection: {
    width: '100%',
  },
  amountContainer: {
    padding: metrics.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountText: {
    color: colors.palette.neutral100,
    fontSize: 32,
    lineHeight: 40,
    marginVertical: metrics.small,
  },
  typeText: {
    color: colors.palette.neutral100,
    fontSize: 16,
    opacity: 0.9,
  },
  detailsSection: {
    padding: metrics.large,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: metrics.small,
  },
  detailLabel: {
    color: colors.textDim,
    fontSize: 16,
  },
  detailValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: metrics.medium,
    paddingVertical: metrics.tiny,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: metrics.tiny,
    backgroundColor: colors.palette.success100,
    paddingHorizontal: metrics.medium,
    paddingVertical: metrics.tiny,
    borderRadius: 12,
  },
  verifiedText: {
    color: colors.palette.success500,
    fontSize: 14,
    fontWeight: '500',
  },
})

export default TransactionDetailsScreen
