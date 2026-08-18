import { EmptyState, ListView, Screen, Text } from '@/components'
import {
  PinInputModal,
  PinInputModalRef,
} from '@/components/contact/PinInputModal'
import { SendMoneyModal } from '@/components/contact/SendMoneyModal'
import { TransactionDetailsModal } from '@/components/contact/TransactionDetailsModal'
import { TransactionStatus } from '@/components/contact/TransactionStatus'
import { queries } from '@/db/queries'
import { useTransaction } from '@/hooks/useTransaction'
import { useStores } from '@/models'
import { Transaction } from '@/models/types'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { metrics, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

const ContactDetailsScreen = () => {
  const { theme } = useAppTheme()
  const router = useRouter()
  const { id, sessionId, sessionTimeStamp } = useLocalSearchParams()
  const { userStore, sessionStore } = useStores()
  const { width, height } = Dimensions.get('window')
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('ContactDetails', '/screens/contact/[id]')
  const styles = createStyles(theme)
  const [contact, setContact] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isContact, setIsContact] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [amount, setAmount] = useState('')
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isVerifyingPin, setIsVerifyingPin] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState<
    'completed' | 'pending' | 'failed'
  >('pending')
  const [currentTransaction, setCurrentTransaction] =
    useState<Transaction | null>(null)
  const {
    createP2PTransaction,
    verifyPin,
    isLoading: isTransactionLoading,
  } = useTransaction()
  const [isLoadingData, setIsLoadingData] = useState(true)

  const [error, setError] = useState<string | null>(null)
  const pinModalRef = useRef<PinInputModalRef>(null)
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null)
  const [showTransactionDetails, setShowTransactionDetails] = useState(false)
  const slideAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(1)).current
  const [isSliding, setIsSliding] = useState(false)
  const [contactId, setContactID] = useState<number | null>(Number(id) ?? null)
  const sessionRestoredRef = useRef(false)
  const lastSessionTimeStampRef = useRef<string | string[] | undefined>(
    undefined,
  )

  useFocusEffect(
    useCallback(() => {
      return () => {
        setShowTransferModal(false)
      }
    }, []),
  )

  // Load session data if exists
  useEffect(() => {
    // Reset restoration flag when sessionTimeStamp changes
    const currentSessionTimeStamp = Array.isArray(sessionTimeStamp)
      ? sessionTimeStamp[0]
      : sessionTimeStamp

    if (
      currentSessionTimeStamp &&
      currentSessionTimeStamp !== lastSessionTimeStampRef.current
    ) {
      sessionRestoredRef.current = false
      lastSessionTimeStampRef.current = currentSessionTimeStamp
    }

    if (sessionTimeStamp && !sessionRestoredRef.current) {
      const session = sessionStore.getSession(sessionId as string)

      if (session?.data?.sessionData) {
        const savedState = session.data.sessionData.formData as any

        // Restore state from session if needed
        if (savedState) {
          try {
            // Restore UI states with safety checks
            if (savedState.isContact !== undefined) {
              setIsContact(Boolean(savedState.isContact))
            }
            if (savedState.contactId !== undefined) {
              setContactID(Number(savedState.contactId))
            }

            // Only restore modal state if modal is NOT currently open
            // This prevents overwriting user input during active flow
            if (!showTransferModal) {
              if (savedState.showTransferModal !== undefined) {
                setShowTransferModal(Boolean(savedState.showTransferModal))
              }
              // Only restore amount if modal is closed (no active user flow)
              if (
                savedState.amount !== undefined &&
                savedState.amount !== null &&
                savedState.amount !== ''
              ) {
                setAmount(String(savedState.amount))
              } else if (savedState.amount === '') {
                setAmount('')
              }
            }

            if (!showPinModal) {
              if (savedState.showPinModal !== undefined) {
                setShowPinModal(Boolean(savedState.showPinModal))
              }
            }

            if (!showStatusModal) {
              if (savedState.showStatusModal !== undefined) {
                setShowStatusModal(Boolean(savedState.showStatusModal))
              }
            }

            if (!showTransactionDetails) {
              if (savedState.showTransactionDetails !== undefined) {
                setShowTransactionDetails(
                  Boolean(savedState.showTransactionDetails),
                )
              }
            }

            if (
              savedState.transactionStatus !== undefined &&
              ['completed', 'pending', 'failed'].includes(
                savedState.transactionStatus,
              )
            ) {
              setTransactionStatus(savedState.transactionStatus)
            }

            // Restore transaction data if available and valid
            if (
              savedState.currentTransaction &&
              typeof savedState.currentTransaction === 'object'
            ) {
              setCurrentTransaction(savedState.currentTransaction)
            }
            if (
              savedState.selectedTransaction &&
              typeof savedState.selectedTransaction === 'object'
            ) {
              setSelectedTransaction(savedState.selectedTransaction)
            }
            fetchContactAndTransactions()

            // Mark session as restored to prevent multiple restorations
            sessionRestoredRef.current = true
          } catch (error) {
            console.error('Error restoring session state:', error)
            // Continue with normal data loading if session restoration fails
            sessionRestoredRef.current = true
          }
        } else {
          sessionRestoredRef.current = true
        }
      } else {
        sessionRestoredRef.current = true
      }
    }
  }, [sessionTimeStamp, sessionId, sessionStore])
  useEffect(() => {
    fetchContactAndTransactions()
  }, [contactId])
  // Track screen mount with initial form data
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        contactId,
        isContact,
        timestamp: Date.now(),
        platform: Platform.OS,
        screenDimensions: {
          width,
          height,
        },
        showTransferModal,
        showPinModal,
        showStatusModal,
        showTransactionDetails,
        amount,
        error,
        transactionStatus,
        currentTransaction,
        selectedTransaction,
        contact,
        sessionId,
        dailyLimit: userStore.currentUser?.dailyLimit ?? null,
        monthlyLimit: userStore.currentUser?.monthlyLimit ?? null,
      })
    }, [
      contactId,
      isContact,
      sessionId,
      width,
      height,
      showStatusModal,
      showPinModal,
      showTransferModal,
      showTransactionDetails,
      amount,
      transactionStatus,
      currentTransaction,
      selectedTransaction,
      contact,
    ]),
  )

  const fetchContactAndTransactions = async (forceRefresh: boolean = false) => {
    try {
      // If we already have contact and transactions from the session and contact has the required information,
      // we can skip loading from the database. A caller can bypass this guard by passing `forceRefresh=true`.
      // Always refresh if forceRefresh is true, even if we have existing transactions.
      if (
        !forceRefresh &&
        contact &&
        contact.id &&
        transactions.length > 0 &&
        !isLoadingData
      ) {
        return
      }

      setIsLoadingData(true)
      setError(null)

      if (!userStore.currentUser?.id || !id) {
        return
      }

      const isExistingContact = await queries.checkContact(
        userStore.currentUser.id,
        Number(contactId),
      )
      setIsContact(isExistingContact)

      // Get contact details from database
      const contactDetails = await queries.getUserById(Number(contactId))
      if (!contactDetails) {
        setError('Contact not found')
        trackContentChange({
          event: 'error',
          error: 'Contact not found',
          contactId,
          timestamp: Date.now(),
        })
        return
      }
      // Set contact details
      setContact({
        id: contactDetails.id,
        firstName: contactDetails.firstName,
        lastName: contactDetails.lastName,
        email: contactDetails.email,
        phoneNumber: contactDetails.phoneNumber,
      })

      // Get both users' wallets
      const userWallets = await queries.getActiveWallets(
        userStore.currentUser.id,
      )
      const contactWallets = await queries.getActiveWallets(Number(contactId))
      if (!userWallets.length || !contactWallets.length) {
        setError('Wallet not found for either user')
        return
      }

      const userWalletId = userWallets[0].id
      const contactWalletId = contactWallets[0].id

      // Fetch transactions between these wallets
      const userTransactions = await queries.getTransactionsWithContact(
        userWalletId,
        contactWalletId,
      )
      // Transform transactions to match the UI format and sort by date
      const transformedTransactions = userTransactions
        .map((tx: Transaction) => ({
          ...tx,
          type: tx.senderWalletId === userWalletId ? 'transfer' : 'deposit',
          amount: Number(tx.amount),
          currency: tx.currency || 'USD',
          createdAt: tx.createdAt || new Date().toISOString(),
        }))
        .sort(
          (a: Transaction, b: Transaction) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )

      setTransactions(transformedTransactions)
    } catch (error) {
      console.error('Error fetching contact and transactions:', error)
      setError('Failed to load contact details and transactions')
      trackContentChange({
        event: 'error',
        error: 'Failed to load contact details and transactions',
        errorDetails: String(error),
        contactId: id,
        timestamp: Date.now(),
      })
    } finally {
      setIsLoadingData(false)
    }
  }

  const renderTransaction = useCallback(
    ({ item: transaction }: { item: Transaction }) => {
      const isOutgoing = transaction.type === 'transfer'
      const time = new Date(transaction.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
      const date = new Date(transaction.createdAt).toLocaleDateString()

      const getStatusColor = () => {
        switch (transaction.status) {
          case 'completed':
            return theme.colors.palette.success500
          case 'failed':
            return theme.colors.palette.neutral500
          case 'pending':
            return theme.colors.palette.primary500
          default:
            return theme.colors.palette.neutral500
        }
      }

      const getStatusIcon = () => {
        switch (transaction.status) {
          case 'completed':
            return 'checkmark-circle'
          case 'failed':
            return 'close-circle'
          case 'pending':
            return 'time'
          default:
            return 'help-circle'
        }
      }

      const getBubbleColors = () => {
        if (isOutgoing) {
          return [
            theme.colors.palette.primary100,
            theme.colors.palette.primary200,
          ] as const
        }
        return [
          theme.colors.palette.success100,
          theme.colors.palette.success200,
        ] as const
      }

      return (
        <TouchableOpacity
          style={[
            styles.transactionCard,
            isOutgoing
              ? styles.outgoingTransaction
              : styles.incomingTransaction,
          ]}
          onPress={() => {
            setSelectedTransaction(transaction)
            setShowTransactionDetails(true)
          }}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.transactionBubble,
              isOutgoing ? styles.outgoingBubble : styles.incomingBubble,
              { backgroundColor: theme.colors.palette.neutral100 },
            ]}
          >
            <LinearGradient
              colors={getBubbleColors()}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBubble}
            >
              <View style={styles.transactionContent}>
                <View style={styles.amountContainer}>
                  <View
                    style={[
                      styles.directionIconContainer,
                      isOutgoing
                        ? styles.backgroundBlue
                        : styles.backgroundGreen,
                    ]}
                  >
                    <Ionicons
                      name={isOutgoing ? 'arrow-up' : 'arrow-down'}
                      size={16}
                      color={
                        isOutgoing
                          ? theme.colors.palette.primary500
                          : theme.colors.palette.success500
                      }
                    />
                  </View>
                  <Text
                    text={`${transaction.amount} ${transaction.currency}`}
                    size="lg"
                    weight="bold"
                    style={[
                      styles.transactionAmount,
                      isOutgoing
                        ? styles.transactionTextBlue
                        : styles.transactionTextGreen,
                    ]}
                  />
                  <View
                    style={[
                      styles.statusIconContainer,
                      { backgroundColor: getStatusColor() },
                    ]}
                  >
                    <Ionicons
                      name={getStatusIcon()}
                      size={12}
                      color={theme.colors.palette.neutral100}
                    />
                  </View>
                </View>
                <View style={styles.timeContainer}>
                  <Text
                    text={time}
                    size="xs"
                    style={[
                      styles.timeText,
                      { color: theme.colors.palette.neutral600 },
                    ]}
                  />
                  <Text
                    text="•"
                    size="xs"
                    style={[
                      styles.dotSeparator,
                      { color: theme.colors.palette.neutral400 },
                    ]}
                  />
                  <Text
                    text={date}
                    size="xs"
                    style={[
                      styles.dateText,
                      { color: theme.colors.palette.neutral600 },
                    ]}
                  />
                </View>
              </View>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      )
    },
    [],
  )

  const handleSendMoney = () => {
    trackClick('send_money_button')
    setShowTransferModal(true)
    // Track modal open with full context
    trackContentChange({
      action: 'send_money_modal_opened',
      showTransferModal: true,
      amount: amount || '',
      dailyLimit: userStore.currentUser?.dailyLimit ?? null,
      monthlyLimit: userStore.currentUser?.monthlyLimit ?? null,
      contactId,
      timestamp: Date.now(),
      sessionData: {
        formData: {
          showTransferModal: true,
          amount: amount || '',
          dailyLimit: userStore.currentUser?.dailyLimit ?? null,
          monthlyLimit: userStore.currentUser?.monthlyLimit ?? null,
        },
      },
    })
  }

  const handleAddContact = async () => {
    trackClick('add_contact_button')
    try {
      if (!userStore.currentUser?.id || !contact) return

      const result = await queries.addContact({
        userId: userStore.currentUser.id,
        contactUserId: contact.id,
        nickname: `${contact.firstName} ${contact.lastName}`,
        favorite: 0,
      })

      if (result.success) {
        setIsContact(true)
        Alert.alert('Success', 'Contact added successfully')
      } else {
        console.warn('Failed to add contact:', result)
      }
    } catch (error) {
      console.error('Error adding contact:', error)
      Alert.alert('Error', 'Failed to add contact')
    }
  }

  const handleRemoveContact = async () => {
    trackClick('remove_contact_button')
    try {
      if (!userStore.currentUser?.id || !contact) return

      Alert.alert(
        'Remove Contact',
        `Are you sure you want to remove ${contact.firstName} ${contact.lastName} from your contacts?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              const result = await queries.removeContact(
                userStore.currentUser!.id,
                contact.id,
              )

              if (result.success) {
                setIsContact(false)
                Alert.alert('Success', 'Contact removed successfully')
              } else {
                console.warn('Failed to remove contact:', result)
                Alert.alert(
                  'Error',
                  result.error?.message || 'Failed to remove contact',
                )
              }
            },
          },
        ],
      )
    } catch (error) {
      console.error('Error removing contact:', error)
      Alert.alert('Error', 'Failed to remove contact')
    }
  }

  const handleConfirmAmount = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount')
      trackContentChange({
        action: 'invalid_amount_attempted',
        amount: amount || '',
        contactId,
        timestamp: Date.now(),
      })
      return
    }
    trackClick('confirm_amount_button')
    // Track modal close via confirm (not cancelled)
    trackContentChange({
      action: 'send_money_modal_confirmed',
      showTransferModal: false,
      amount,
      wasCancelled: false,
      dailyLimit: userStore.currentUser?.dailyLimit ?? null,
      monthlyLimit: userStore.currentUser?.monthlyLimit ?? null,
      contactId,
      timestamp: Date.now(),
      sessionData: {
        formData: {
          showTransferModal: false,
          amount,
        },
      },
    })
    setShowTransferModal(false)
    setShowPinModal(true)
  }

  const handleAmountChange = (newAmount: string) => {
    setAmount(newAmount)
    // Track amount changes in the modal
    trackContentChange({
      action: 'amount_changed',
      amount: newAmount,
      showTransferModal: true,
      contactId,
      timestamp: Date.now(),
      sessionData: {
        formData: {
          amount: newAmount,
          showTransferModal: true,
        },
      },
    })
  }

  const handleSendMoneyModalClose = () => {
    // Track modal close with current state
    trackContentChange({
      action: 'send_money_modal_closed',
      showTransferModal: false,
      amount: amount || '',
      wasCancelled: true,
      contactId,
      timestamp: Date.now(),
      sessionData: {
        formData: {
          showTransferModal: false,
          amount: '',
        },
      },
    })
    // Reset amount and all related state when the send panel is closed/cancelled so state doesn't persist
    setShowTransferModal(false)
    setAmount('')
    setStatusError(null)
    setCurrentTransaction(null)
  }

  const handlePinModalClose = () => {
    trackClick('close_pin_modal')
    setShowPinModal(false)
    setAmount('')
    if (pinModalRef.current) {
      pinModalRef.current.clearPin()
    }
  }

  const handleStatusModalClose = () => {
    trackClick('close_status_modal')
    setShowStatusModal(false)
    setAmount('')
    setCurrentTransaction(null)
    setStatusError(null)
    setTransactionStatus('pending')

    // Refresh transactions list after status modal is closed to ensure latest transactions are shown
    if (userStore.currentUser?.id && contactId) {
      fetchContactAndTransactions(true)
    }
  }

  const resetButton = () => {
    setIsSliding(false)
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handleSendMoneyPress = () => {
    if (isSliding) return

    trackClick('slide_to_send_initiated')
    setIsSliding(true)
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setTimeout(() => {
        resetButton()
        handleSendMoney()
      }, 200)
    })
  }

  if (isLoadingData) {
    return (
      <Screen preset="fixed" backgroundColor={theme.colors.palette.neutral100}>
        <EmptyState
          preset="generic"
          heading="Loading contact details"
          content="Please wait while we fetch the information..."
        />
      </Screen>
    )
  }

  // Add a safety check for null contact before rendering UI with contact data
  if (!contact) {
    return (
      <Screen preset="fixed" backgroundColor={theme.colors.palette.neutral100}>
        <EmptyState
          preset="generic"
          heading="Contact not available"
          content="There was an issue loading the contact details. Please try again."
          buttonTx={'Go Back'}
          buttonOnPress={() => {
            trackClick('error_go_back')
            router.back()
          }}
        />
      </Screen>
    )
  }

  const contactInitials = `${contact?.firstName?.[0] || ''}${
    contact?.lastName?.[0] || ''
  }`.toUpperCase()
  const contactFullName =
    `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim()

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.palette.neutral100 },
      ]}
    >
      <LinearGradient
        colors={[
          theme.colors.palette.primary400,
          theme.colors.palette.secondary400,
        ]}
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
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
          <View style={styles.contactHeader}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarContainer}>
                <Text text={contactInitials} style={styles.avatarText} />
              </View>
              {isContact && (
                <View style={styles.contactBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={theme.colors.palette.neutral100}
                  />
                </View>
              )}
            </View>
            <View style={styles.contactInfo}>
              <Text
                text={contactFullName}
                preset="heading"
                style={styles.contactName}
              />
            </View>
          </View>
        </View>
      </LinearGradient>

      {!isContact ? (
        <View style={styles.addContactContainer}>
          <TouchableOpacity
            style={styles.addContactButton}
            onPress={handleAddContact}
          >
            <LinearGradient
              colors={[
                theme.colors.palette.primary400,
                theme.colors.palette.secondary400,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addContactGradient}
            >
              <Ionicons
                name="person-add"
                size={16}
                color={theme.colors.palette.neutral100}
              />
              <Text text="Add to Contacts" style={styles.addContactText} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.addContactContainer}>
          <TouchableOpacity
            style={styles.removeContactButton}
            onPress={handleRemoveContact}
          >
            <LinearGradient
              colors={[
                theme.colors.palette.angry400,
                theme.colors.palette.angry500,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addContactGradient}
            >
              <Ionicons
                name="person-remove"
                size={16}
                color={theme.colors.palette.neutral100}
              />
              <Text text="Remove from Contacts" style={styles.addContactText} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.mainContent}>
        {transactions.length > 0 ? (
          <View style={styles.listWrapper}>
            <ListView
              data={[...transactions].reverse()}
              renderItem={renderTransaction}
              estimatedItemSize={100}
              contentContainerStyle={styles.listContentContainer}
              ListHeaderComponent={<View style={styles.listHeader} />}
              ListFooterComponent={<View style={styles.listFooter} />}
              inverted={true}
              keyExtractor={item => item.id.toString()}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <EmptyState
              heading="No transactions yet"
              content={`You haven't made any transactions with ${contactFullName}`}
              buttonTx={'Go Back'}
              buttonOnPress={() => router.back()}
            />
          </View>
        )}
      </View>

      <View style={styles.bottomContainer}>
        <Animated.View
          style={[
            styles.sendMoneyButton,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity onPress={handleSendMoneyPress} activeOpacity={0.95}>
            <LinearGradient
              colors={[
                theme.colors.palette.primary300,
                theme.colors.palette.primary400,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendMoneyGradient}
            >
              <Animated.View
                style={[
                  styles.sendMoneyInner,
                  {
                    transform: [
                      {
                        translateX: slideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -60],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.sendIconWrapper}>
                  <Ionicons
                    name="send"
                    size={18}
                    color={theme.colors.palette.neutral100}
                  />
                </View>
                <Text text="Pay" style={styles.sendMoneyTextLarge} />
              </Animated.View>
              <Animated.View
                style={[
                  styles.confirmSlide,
                  {
                    transform: [
                      {
                        translateX: slideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [60, 0],
                        }),
                      },
                    ],
                  },
                ]}
              ></Animated.View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <SendMoneyModal
        visible={showTransferModal}
        onClose={handleSendMoneyModalClose}
        onConfirm={handleConfirmAmount}
        amount={amount}
        onAmountChange={handleAmountChange}
        dailyLimit={userStore.currentUser?.dailyLimit}
        monthlyLimit={userStore.currentUser?.monthlyLimit}
      />

      <PinInputModal
        ref={pinModalRef}
        visible={showPinModal}
        onClose={handlePinModalClose}
        onSubmit={() => {
          const pin = pinModalRef.current?.getPin()
          if (!pin) return

          setIsVerifyingPin(true)
          verifyPin(pin).then(isPinValid => {
            setIsVerifyingPin(false)

            if (!isPinValid) {
              pinModalRef.current?.clearPin()
              return
            }

            createP2PTransaction({
              amount: Number(amount),
              method: 'transfer',
              email: userStore.currentUser?.email || '',
              pinVerified: 1,
              pinVerifiedAt: new Date().toISOString(),
              recipientId: contact.id,
            })
              .then(result => {
                // Clear PIN input
                if (pinModalRef.current) {
                  pinModalRef.current.clearPin()
                }

                setShowPinModal(false)
                setTransactionStatus(result.status || 'failed')

                // Show resulting transaction status modal and surface any error to the user
                setCurrentTransaction({
                  id: result.id || 0,
                  amount: Number(amount),
                  currency: 'USD',
                  type: 'transfer',
                  status: result.status || 'failed',
                  senderWalletId: userStore.currentUser?.id || 0,
                  receiverWalletId: contact.id,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  pinVerified: 1,
                } as Transaction)

                // If the transaction failed (e.g., daily/monthly limit), surface the error in the status bottom sheet
                if (!result.success) {
                  setStatusError(result.error || 'Failed to send money')
                } else {
                  setStatusError(null)
                  // Reset amount after successful transaction
                  setAmount('')
                }

                setShowStatusModal(true)

                if (result.success) {
                  // Refresh transactions immediately after successful transaction (force bypass of cache guard)
                  // Add a small delay to ensure transaction is committed to database
                  setTimeout(() => {
                    fetchContactAndTransactions(true)
                  }, 100)
                }
              })
              .catch(error => {
                // Clear PIN input on error
                if (pinModalRef.current) {
                  pinModalRef.current.clearPin()
                }
                setShowPinModal(false)

                // Set error message and show status modal with error
                const errorMessage =
                  error instanceof Error
                    ? error.message
                    : 'Failed to send money'
                setStatusError(errorMessage)
                setTransactionStatus('failed')

                // Create a failed transaction object for display
                setCurrentTransaction({
                  id: 0,
                  amount: Number(amount),
                  currency: 'USD',
                  type: 'transfer',
                  status: 'failed',
                  senderWalletId: userStore.currentUser?.id || 0,
                  receiverWalletId: contact.id,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  pinVerified: 1,
                } as Transaction)

                setShowStatusModal(true)

                // Also show alert as fallback
                Alert.alert('Error', errorMessage)
              })
          })
        }}
        isLoading={isTransactionLoading}
        isVerifyingPin={isVerifyingPin}
      />

      <TransactionStatus
        visible={showStatusModal}
        status={transactionStatus}
        transactionId={currentTransaction?.id || 0}
        onClose={handleStatusModalClose}
        errorMessage={statusError}
      />

      <TransactionDetailsModal
        visible={showTransactionDetails}
        onClose={() => {
          setShowTransactionDetails(false)
          setSelectedTransaction(null)
        }}
        transaction={selectedTransaction}
      />
    </View>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    mainContent: {
      flex: 1,
      marginBottom: 80,
      backgroundColor: theme.colors.palette.neutral100,
    },
    headerGradient: {
      paddingHorizontal: metrics.medium,
      paddingBottom: metrics.medium,
      paddingTop: metrics.xl,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      zIndex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: metrics.medium,
    },
    backButton: {
      marginRight: metrics.medium,
      padding: metrics.small,
      backgroundColor: `${theme.colors.palette.neutral100}33`,
      borderRadius: 16,
    },
    contactHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatarWrapper: {
      position: 'relative',
      marginRight: metrics.medium,
    },
    avatarContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    contactBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 10,
      padding: 3,
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral100,
    },
    avatarText: {
      fontSize: 24,
      color: theme.colors.palette.primary500,
      fontWeight: 'bold',
    },
    contactInfo: {
      flex: 1,
    },
    contactName: {
      color: theme.colors.palette.neutral100,
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    addContactContainer: {
      marginTop: 10,
      paddingHorizontal: metrics.medium,
    },
    addContactButton: {
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    removeContactButton: {
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.angry500,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    addContactGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: metrics.medium,
      gap: metrics.small,
    },
    addContactText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
    listWrapper: {
      flex: 1,
      paddingHorizontal: metrics.medium,
    },
    listContentContainer: {
      flexGrow: 1,
      justifyContent: 'flex-start',
      paddingBottom: metrics.xxl,
      backgroundColor: theme.colors.palette.neutral100,
    },
    listHeader: {
      height: metrics.xxl,
    },
    listFooter: {
      height: metrics.medium,
    },
    transactionCard: {
      marginVertical: metrics.small,
      maxWidth: '85%',
      alignSelf: 'stretch',
    },
    outgoingTransaction: {
      alignSelf: 'flex-end',
    },
    incomingTransaction: {
      alignSelf: 'flex-start',
    },
    transactionBubble: {
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    outgoingBubble: {
      borderTopRightRadius: 4,
    },
    incomingBubble: {
      borderTopLeftRadius: 4,
    },
    gradientBubble: {
      width: '100%',
    },
    transactionContent: {
      padding: metrics.medium,
    },
    amountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.small,
    },
    directionIconContainer: {
      borderRadius: 12,
      padding: 6,
    },
    statusIconContainer: {
      borderRadius: 10,
      padding: 4,
      marginLeft: metrics.small,
    },
    transactionAmount: {
      fontSize: 18,
    },
    timeContainer: {
      marginTop: metrics.small,
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.tiny,
    },
    timeText: {
      fontSize: 12,
      opacity: 0.9,
    },
    dateText: {
      fontSize: 12,
      opacity: 0.9,
    },
    dotSeparator: {
      fontSize: 12,
      opacity: 0.9,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: metrics.xl,
    },
    bottomContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: metrics.medium,
      backgroundColor: theme.colors.palette.neutral100,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral200,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      zIndex: 1,
      alignItems: 'flex-end',
    },
    sendMoneyButton: {
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.primary400,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
      width: 120,
    },
    sendMoneyGradient: {
      overflow: 'hidden',
    },
    sendMoneyInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: metrics.small,
      paddingHorizontal: metrics.medium,
      gap: metrics.small,
    },
    sendIconWrapper: {
      marginLeft: 0,
    },
    sendMoneyTextLarge: {
      color: theme.colors.palette.neutral100,
      fontSize: 18,
      letterSpacing: 0.5,
      fontWeight: '600',
    },
    confirmSlide: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backgroundBlue: {
      backgroundColor: theme.colors.palette.primary100,
    },
    backgroundGreen: {
      backgroundColor: theme.colors.palette.success100,
    },
    transactionTextGreen: {
      color: theme.colors.palette.success500,
    },
    transactionTextBlue: {
      color: theme.colors.palette.primary500,
    },
  })

export default ContactDetailsScreen
