import React, { useEffect, useRef, useMemo } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ScrollView,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useStores } from '@/models'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { SuccessDialog } from '@/components/SuccessDialog'
import { queries } from '@/db/queries'
import { getSnapshot } from 'mobx-state-tree'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'

const PayBillScreen = observer(() => {
  const { bankingStore, userStore, uiStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { id, billerId, sessionTimeStamp } = useLocalSearchParams()
  console.log('PayBillScreen params:', { id, billerId })
  const isNewPayment = id === 'new'
  const isCreditCardPayment =
    typeof id === 'string' && id.startsWith('credit-card-')
  const creditCardId = isCreditCardPayment
    ? parseInt(id.replace('credit-card-', ''))
    : null

  const { trackScreenMount } = useInteractionTracking(
    'Pay Bill',
    `/bills/pay/${id}`,
  )

  const targetBillId =
    isNewPayment || isCreditCardPayment ? null : parseInt(id as string)
  const targetBillerId = isNewPayment ? parseInt(billerId as string) : null

  // Get form state from UIStore
  const {
    selectedBill,
    selectedBiller,
    targetCreditCard,
    paymentMethod,
    selectedAccountId,
    selectedCreditCardId,
    showAccountPicker,
    showCreditCardPicker,
    paymentAmount,
    isLoading,
    showPinModal,
    pin,
    currentFocused,
  } = uiStore.payBillForm

  // Get dialog state from UIStore
  const {
    visible: dialogVisible,
    isSuccess,
    message,
    subMessage,
  } = uiStore.dialogState

  // Get user accounts (exclude closed accounts)
  const userAccounts = bankingStore.activeAccounts.filter(
    account => account && account.userId === userStore.user?.id,
  )

  // Get available payment accounts (exclude IRA and money market accounts)
  const paymentAccounts = userAccounts.filter(account => {
    if (!account || !account.accountTypeId) return false
    const accountType = bankingStore.getAccountType(account.accountTypeId)
    // Only allow checking and savings accounts for bill payments
    return (
      accountType?.code !== 'ira_account' &&
      accountType?.code !== 'money_market'
    )
  })

  // Get selected account and credit card objects from IDs
  const selectedAccount = paymentAccounts.find(a => a.id === selectedAccountId)
  const selectedCreditCard = bankingStore.creditCards.find(
    c => c.id === selectedCreditCardId,
  )

  const otpRefs = useRef<(TextInput | null)[]>([])
  const paymentAmountRef = useRef<TextInput>(null)

  useEffect(() => {
    loadData()
  }, [])

  // Focus restoration for sessionTimeStamp
  useEffect(() => {
    if (sessionTimeStamp) {
      const focusedElement = currentFocused
      if (focusedElement === 'paymentAmount') {
        setTimeout(() => {
          paymentAmountRef.current?.focus()
          paymentAmountRef.current?.setSelection(
            paymentAmount.length,
            paymentAmount.length,
          )
        }, 100)
      } else {
        // Focus on the first empty OTP input or the last filled one
        const currentPin = pin
        const pinLength = currentPin.length
        if (pinLength < 4) {
          setTimeout(() => {
            otpRefs.current[pinLength]?.focus()
          }, 100)
        }
      }
    }
  }, [sessionTimeStamp, currentFocused, paymentAmount, pin])

  useFocusEffect(
    React.useCallback(() => {
      trackScreenMount({
        date: Date.now(),
        screenName: 'Pay Bill',
        route: `/bills/pay/${id}`,
      })
    }, []),
  )

  const loadData = async () => {
    try {
      // await bankingStore.loadBills()
      // await bankingStore.loadBillers()
      // await bankingStore.loadAccounts()

      if (isCreditCardPayment && creditCardId) {
        // Credit card payment
        console.log('Looking for credit card with ID:', creditCardId)
        console.log(
          'Available credit cards:',
          bankingStore.creditCards.map(c => ({
            id: c.id,
            lastFour: c.lastFourDigits,
          })),
        )
        const creditCard = bankingStore.creditCards.find(
          c => c.id === creditCardId,
        )
        console.log('Found credit card:', creditCard)
        // @ts-ignore
        uiStore.setPayBillTargetCreditCard(getSnapshot(creditCard))
        // currentBalance is a primitive (number). don't pass primitives to getSnapshot
        uiStore.setPayBillAmount(creditCard?.currentBalance?.toString() || '')
        uiStore.setPayBillPaymentMethod('account')
      } else if (isNewPayment && targetBillerId) {
        const biller = bankingStore.billers.find(b => b.id === targetBillerId)
        // @ts-ignore
        uiStore.setPayBillSelectedBiller(getSnapshot(biller))
        // averageBillAmount is a primitive (number). don't pass primitives to getSnapshot
        uiStore.setPayBillAmount(biller?.averageBillAmount?.toString() || '')
      } else if (!isNewPayment && targetBillId) {
        // Existing bill payment
        const bill = bankingStore.bills.find(b => b.id === targetBillId)
        console.log('Trying to set selected bill:', bill)

        if (bill) {
          uiStore.setPayBillSelectedBill(getSnapshot(bill))

          const biller = bankingStore.billers.find(b => b.id === bill.billerId)
          if (biller) {
            uiStore.setPayBillSelectedBiller(getSnapshot(biller))
          }

          uiStore.setPayBillAmount(bill.amount.toString())
        } else {
          uiStore.setPayBillSelectedBill(null)
          uiStore.setPayBillSelectedBiller(null)
        }
      }

      // Auto-select primary account
      const primaryAccount = paymentAccounts.find(a => a.isPrimary)
      if (primaryAccount) {
        uiStore.setPayBillSelectedAccount(primaryAccount.id)
      }

      // Auto-select first credit card if available
      if (bankingStore.creditCards.length > 0) {
        uiStore.setPayBillSelectedCreditCard(bankingStore.creditCards[0].id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handlePayment = debounce(async () => {
    // Get actual account and credit card objects from IDs
    const selectedAccount = paymentAccounts.find(
      a => a.id === selectedAccountId,
    )
    const selectedCreditCard = bankingStore.creditCards.find(
      c => c.id === selectedCreditCardId,
    )

    // For credit card payments, we don't need a biller
    if (!isCreditCardPayment && !selectedBiller) {
      uiStore.showDialog({
        isSuccess: false,
        message: 'Error',
        subMessage: 'Biller not found',
      })
      return
    }

    // For credit card payments, validate the target credit card
    if (isCreditCardPayment && !targetCreditCard) {
      uiStore.showDialog({
        isSuccess: false,
        message: 'Error',
        subMessage: 'Credit card not found',
      })
      return
    }

    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      uiStore.showDialog({
        isSuccess: false,
        message: 'Error',
        subMessage: 'Please enter a valid payment amount',
      })
      return
    }

    if (paymentMethod === 'account' && !selectedAccount) {
      uiStore.showDialog({
        isSuccess: false,
        message: 'Error',
        subMessage: 'Please select a bank account',
      })
      return
    }

    if (paymentMethod === 'credit_card' && !selectedCreditCard) {
      uiStore.showDialog({
        isSuccess: false,
        message: 'Error',
        subMessage: 'Please select a credit card',
      })
      return
    }

    // Validate sufficient funds
    if (
      paymentMethod === 'account' &&
      selectedAccount &&
      selectedAccount.balance < amount
    ) {
      uiStore.showDialog({
        isSuccess: false,
        message: 'Error',
        subMessage: 'Insufficient funds in selected account',
      })
      return
    }

    if (
      paymentMethod === 'credit_card' &&
      selectedCreditCard &&
      selectedCreditCard.availableCredit < amount
    ) {
      uiStore.showDialog({
        isSuccess: false,
        message: 'Error',
        subMessage: 'Insufficient credit limit on selected card',
      })
      return
    }

    // Show PIN modal for secure payment
    // If PIN validation is disabled, process payment immediately
    if (!bankingStore.isPINValidationRequired) {
      processPayment()
    } else {
      uiStore.togglePayBillPinModal()
    }
  }, 300)

  const processPayment = async () => {
    // Get actual account and credit card objects from IDs
    const selectedAccount = paymentAccounts.find(
      a => a.id === selectedAccountId,
    )
    const selectedCreditCard = bankingStore.creditCards.find(
      c => c.id === selectedCreditCardId,
    )

    // Only validate PIN when required by system config
    if (bankingStore.isPINValidationRequired) {
      if (pin !== userStore.user?.pin) {
        uiStore.showDialog({
          isSuccess: false,
          message: 'Error',
          subMessage: 'Invalid PIN',
        })
        uiStore.setPayBillPin('')
        return
      }
    }

    uiStore.setPayBillLoading(true)
    try {
      if (isCreditCardPayment) {
        // Credit card payment
        await bankingStore.makeCreditCardPayment({
          creditCardId: targetCreditCard.id,
          fromAccountId: selectedAccount?.id || 0,
          amount: parseFloat(paymentAmount),
          memo: `Credit Card Payment - ${targetCreditCard.lastFourDigits}`,
        })

        uiStore.showDialog({
          isSuccess: true,
          message: 'Success',
          subMessage: `Payment of $${parseFloat(paymentAmount).toFixed(2)} to credit card ending in ${targetCreditCard.lastFourDigits} processed successfully!`,
        })
      } else if (isNewPayment) {
        // Create a new bill first, then pay it
        const newBill = await queries.createBill({
          userId: userStore.user?.id,
          billerId: targetBillerId as number,
          amount: parseFloat(paymentAmount),
          isRecurring: 0,
          accountId: selectedAccount?.id,
          dueDay: 7,
          dueDate: Date.now() * 1 + 7 * 24 * 60 * 60 * 1000, // Due in 7 days
        })

        await bankingStore.payBill({
          billId: newBill.id,
          paymentMethod: paymentMethod as 'account' | 'credit_card',
          accountId:
            paymentMethod === 'account' ? selectedAccount?.id : undefined,
          creditCardId:
            paymentMethod === 'credit_card'
              ? selectedCreditCard?.id
              : undefined,
          sessionId: bankingStore.currentSession?.id,
        })

        uiStore.showDialog({
          isSuccess: true,
          message: 'Success',
          subMessage: `Payment to ${selectedBiller.name} processed successfully!`,
        })
      } else {
        // Pay existing bill
        await bankingStore.payBill({
          billId: selectedBill.id,
          paymentMethod: paymentMethod as 'account' | 'credit_card',
          accountId:
            paymentMethod === 'account' ? selectedAccount?.id : undefined,
          creditCardId:
            paymentMethod === 'credit_card'
              ? selectedCreditCard?.id
              : undefined,
          sessionId: bankingStore.currentSession?.id,
        })

        uiStore.showDialog({
          isSuccess: true,
          message: 'Success',
          subMessage: `Payment to ${selectedBiller.name} processed successfully!`,
        })
      }
    } catch (error: any) {
      uiStore.showDialog({
        isSuccess: false,
        message: 'Error',
        subMessage: error.message || 'Payment failed',
      })
    } finally {
      uiStore.setPayBillLoading(false)
      uiStore.setPayBillPin('')
    }
  }

  const handleOtpChange = (value: string, index: number) => {
    const newPin = pin.split('')
    newPin[index] = value
    uiStore.setPayBillPin(newPin.join(''))

    // Auto-focus next input if not the last box
    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace') {
      if (pin[index]) {
        // If current field has a value, clear it and move to previous field
        const newPin = pin.split('')
        newPin[index] = ''
        uiStore.setPayBillPin(newPin.join(''))
        if (index > 0) {
          otpRefs.current[index - 1]?.focus()
        }
      } else if (index > 0) {
        // If current field is empty, move to previous field and clear it
        const newPin = pin.split('')
        newPin[index - 1] = ''
        uiStore.setPayBillPin(newPin.join(''))
        otpRefs.current[index - 1]?.focus()
      }
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'utilities':
        return 'flash'
      case 'telecom':
        return 'phone-portrait'
      case 'insurance':
        return 'shield-checkmark'
      case 'finance':
        return 'card'
      case 'subscription':
        return 'tv'
      default:
        return 'business'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'utilities':
        return theme.colors.palette.secondary400
      case 'telecom':
        return theme.colors.palette.primary200
      case 'insurance':
        return theme.colors.palette.success400
      case 'finance':
        return theme.colors.palette.accent200
      case 'subscription':
        return theme.colors.palette.accent400
      default:
        return theme.colors.palette.neutral400
    }
  }

  const formatAccountNumber = (accountNumber: string) => {
    return `****${accountNumber.slice(-4)}`
  }

  const formatCardNumber = (cardNumber: string) => {
    return `****${cardNumber.slice(-4)}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Show loading only if we haven't loaded the required data yet
  if (
    (!isCreditCardPayment &&
      !selectedBiller &&
      (isNewPayment || !selectedBill)) ||
    (isCreditCardPayment && !targetCreditCard)
  ) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </View>
    )
  }

  const onDialogDismiss = (status: string) => {
    if (status === 'success') {
      router.replace('/(app)/pay-bills')
    } else {
      uiStore.hideDialog()
    }
  }

  // Determine whether the payment amount should be editable.
  // If there's a pending bill for the selected biller, or if this is a
  // credit-card payment for a card that has an outstanding balance, lock editing.
  const hasPendingBillerBill = selectedBiller
    ? bankingStore.pendingBills.some(b => b.billerId === selectedBiller.id)
    : false

  const hasCreditCardOutstanding = isCreditCardPayment
    ? Boolean(targetCreditCard && targetCreditCard.currentBalance > 0)
    : false

  const isAmountEditable =
    (isNewPayment || !selectedBill) &&
    !hasPendingBillerBill &&
    !hasCreditCardOutstanding

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        data={[]}
        renderItem={() => null} // Placeholder renderItem
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              <Text preset="subheading" style={{ color: theme.colors.text }}>
                Pay Bill
              </Text>
            </View>

            {/* Bill/Credit Card Info */}
            <View style={styles.section}>
              <View
                style={[
                  styles.billCard,
                  { backgroundColor: (theme.colors as any).surface },
                ]}
              >
                <View style={styles.billHeader}>
                  <View style={styles.billerInfo}>
                    <View
                      style={[
                        styles.billerIcon,
                        {
                          backgroundColor: isCreditCardPayment
                            ? theme.colors.palette.primary400 + '15'
                            : getCategoryColor(selectedBiller?.category) + '15',
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          isCreditCardPayment
                            ? 'card'
                            : (getCategoryIcon(selectedBiller?.category) as any)
                        }
                        size={24}
                        color={
                          isCreditCardPayment
                            ? theme.colors.palette.primary400
                            : getCategoryColor(selectedBiller?.category)
                        }
                      />
                    </View>
                    <View>
                      <Text
                        style={
                          [
                            styles.billerName,
                            { color: theme.colors.text },
                          ] as any
                        }
                      >
                        {isCreditCardPayment
                          ? `Credit Card Payment`
                          : selectedBiller?.name}
                      </Text>
                      <Text
                        style={
                          [
                            styles.billerCategory,
                            { color: theme.colors.textDim },
                          ] as any
                        }
                      >
                        {isCreditCardPayment
                          ? `Card ending in ${targetCreditCard?.lastFourDigits}`
                          : selectedBiller?.category?.charAt(0).toUpperCase() +
                            selectedBiller?.category?.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.billDetails}>
                  {selectedBill ? (
                    <>
                      <View style={styles.billDetailRow}>
                        <Text
                          style={
                            [
                              styles.billDetailLabel,
                              { color: theme.colors.textDim },
                            ] as any
                          }
                        >
                          Amount Due
                        </Text>
                        <Text
                          style={
                            [
                              styles.billDetailValue,
                              { color: theme.colors.text },
                            ] as any
                          }
                        >
                          ${selectedBill.amount.toFixed(2)}
                        </Text>
                      </View>

                      {selectedBill.dueDate && (
                        <View style={styles.billDetailRow}>
                          <Text
                            style={
                              [
                                styles.billDetailLabel,
                                { color: theme.colors.textDim },
                              ] as any
                            }
                          >
                            Due Date
                          </Text>
                          <Text
                            style={
                              [
                                styles.billDetailValue,
                                { color: theme.colors.text },
                              ] as any
                            }
                          >
                            {formatDate(selectedBill.dueDate)}
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.billDetailRow}>
                      <Text
                        style={
                          [
                            styles.billDetailLabel,
                            { color: theme.colors.textDim },
                          ] as any
                        }
                      >
                        Payment Type
                      </Text>
                      <Text
                        style={
                          [
                            styles.billDetailValue,
                            { color: theme.colors.text },
                          ] as any
                        }
                      >
                        One-time Payment
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Payment Amount */}
            <View style={styles.section}>
              <Text
                preset="subheading"
                style={{ color: theme.colors.text as string }}
              >
                Payment Amount
              </Text>
              <TextInput
                ref={paymentAmountRef}
                style={[
                  styles.amountInput,
                  {
                    backgroundColor: (theme.colors as any).surface,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                  ((selectedBill && !isNewPayment) || !isAmountEditable) &&
                    styles.readOnlyInput,
                ]}
                value={paymentAmount}
                onChangeText={uiStore.setPayBillAmount}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textDim}
                keyboardType="decimal-pad"
                editable={isAmountEditable}
                onFocus={() => uiStore.setPayBillFocused('paymentAmount')}
                onBlur={() => uiStore.setPayBillFocused(null)}
              />
              {isCreditCardPayment && targetCreditCard && (
                <Text
                  style={
                    [styles.amountNote, { color: theme.colors.textDim }] as any
                  }
                >
                  Current balance: ${targetCreditCard.currentBalance.toFixed(2)}
                </Text>
              )}
              {selectedBill && !isNewPayment && !isCreditCardPayment && (
                <Text
                  style={
                    [styles.amountNote, { color: theme.colors.textDim }] as any
                  }
                >
                  This is the amount due for your bill
                </Text>
              )}
              {isNewPayment && selectedBiller?.averageBillAmount && (
                <Text
                  style={
                    [styles.amountNote, { color: theme.colors.textDim }] as any
                  }
                >
                  Average amount: ${selectedBiller.averageBillAmount.toFixed(2)}
                </Text>
              )}
            </View>

            {/* Payment Method Selection - Hide for credit card payments */}
            {!isCreditCardPayment && (
              <View style={styles.section}>
                <Text
                  preset="subheading"
                  style={{ color: theme.colors.text as string }}
                >
                  Payment Method
                </Text>

                <View style={styles.paymentMethodToggle}>
                  <TouchableOpacity
                    style={[
                      styles.toggleOption,
                      paymentMethod === 'account' && styles.toggleOptionActive,
                      {
                        backgroundColor:
                          paymentMethod === 'account'
                            ? theme.colors.palette.primary500
                            : (theme.colors as any).surface,
                      },
                    ]}
                    onPress={() => uiStore.setPayBillPaymentMethod('account')}
                  >
                    <Ionicons
                      name="card"
                      size={20}
                      color={
                        paymentMethod === 'account'
                          ? theme.colors.palette.neutral100
                          : theme.colors.textDim
                      }
                    />
                    <Text
                      style={
                        [
                          styles.toggleText,
                          {
                            color:
                              paymentMethod === 'account'
                                ? theme.colors.palette.neutral100
                                : theme.colors.text,
                          },
                        ] as any
                      }
                    >
                      Bank Account
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.toggleOption,
                      paymentMethod === 'credit_card' &&
                        styles.toggleOptionActive,
                      {
                        backgroundColor:
                          paymentMethod === 'credit_card'
                            ? theme.colors.palette.primary500
                            : (theme.colors as any).surface,
                      },
                    ]}
                    onPress={() =>
                      uiStore.setPayBillPaymentMethod('credit_card')
                    }
                  >
                    <Ionicons
                      name="card"
                      size={20}
                      color={
                        paymentMethod === 'credit_card'
                          ? theme.colors.palette.neutral100
                          : theme.colors.textDim
                      }
                    />
                    <Text
                      style={
                        [
                          styles.toggleText,
                          {
                            color:
                              paymentMethod === 'credit_card'
                                ? theme.colors.palette.neutral100
                                : theme.colors.text,
                          },
                        ] as any
                      }
                    >
                      Credit Card
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Account/Card Selection */}
            {(paymentMethod === 'account' || isCreditCardPayment) && (
              <View style={styles.section}>
                <Text
                  style={[styles.label, { color: theme.colors.text }] as any}
                >
                  Select Bank Account *
                </Text>
                <TouchableOpacity
                  style={[
                    styles.selector,
                    {
                      backgroundColor: (theme.colors as any).surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => uiStore.togglePayBillAccountPicker()}
                >
                  <View style={styles.selectorDisplay}>
                    {selectedAccount ? (
                      <View style={styles.accountInfo}>
                        <Text
                          style={
                            [
                              styles.accountName,
                              { color: theme.colors.text },
                            ] as any
                          }
                        >
                          {selectedAccount.accountName}
                        </Text>
                        <Text
                          style={
                            [
                              styles.accountNumber,
                              { color: theme.colors.textDim },
                            ] as any
                          }
                        >
                          {formatAccountNumber(selectedAccount.accountNumber)} •
                          ${selectedAccount.balance.toFixed(2)}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={
                          [
                            styles.placeholderText,
                            { color: theme.colors.textDim },
                          ] as any
                        }
                      >
                        Select an account
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name={showAccountPicker ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.colors.textDim}
                  />
                </TouchableOpacity>

                {showAccountPicker && (
                  <View
                    style={[
                      styles.dropdown,
                      {
                        backgroundColor: (theme.colors as any).surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <ScrollView
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      {paymentAccounts.map(account => (
                        <TouchableOpacity
                          key={account.id}
                          style={[
                            styles.dropdownOption,
                            selectedAccount?.id === account.id && {
                              backgroundColor:
                                theme.colors.palette.primary500 + '10',
                            },
                          ]}
                          onPress={() => {
                            uiStore.setPayBillSelectedAccount(account.id)
                          }}
                        >
                          <View style={styles.accountInfo}>
                            <Text
                              style={
                                [
                                  styles.accountName,
                                  { color: theme.colors.text },
                                ] as any
                              }
                            >
                              {account.accountName}
                            </Text>
                            <Text
                              style={
                                [
                                  styles.accountNumber,
                                  { color: theme.colors.textDim },
                                ] as any
                              }
                            >
                              {formatAccountNumber(account.accountNumber)} • $
                              {account.balance.toFixed(2)}
                            </Text>
                          </View>
                          {selectedAccount?.id === account.id && (
                            <Ionicons
                              name="checkmark"
                              size={20}
                              color={theme.colors.palette.primary500}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {paymentMethod === 'credit_card' && (
              <View style={styles.section}>
                <Text
                  style={[styles.label, { color: theme.colors.text }] as any}
                >
                  Select Credit Card *
                </Text>
                <TouchableOpacity
                  style={[
                    styles.selector,
                    {
                      backgroundColor: (theme.colors as any).surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => uiStore.togglePayBillCreditCardPicker()}
                >
                  <View style={styles.selectorDisplay}>
                    {selectedCreditCard ? (
                      <View style={styles.cardInfo}>
                        <Text
                          style={
                            [
                              styles.cardName,
                              { color: theme.colors.text },
                            ] as any
                          }
                        >
                          {selectedCreditCard.cardholderName}
                        </Text>
                        <Text
                          style={
                            [
                              styles.cardNumber,
                              { color: theme.colors.textDim },
                            ] as any
                          }
                        >
                          {formatCardNumber(selectedCreditCard.cardNumber)} • $
                          {selectedCreditCard.availableCredit.toFixed(2)}{' '}
                          available
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={
                          [
                            styles.placeholderText,
                            { color: theme.colors.textDim },
                          ] as any
                        }
                      >
                        Select a credit card
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name={showCreditCardPicker ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.colors.textDim}
                  />
                </TouchableOpacity>

                {showCreditCardPicker && (
                  <View
                    style={[
                      styles.dropdown,
                      {
                        backgroundColor: (theme.colors as any).surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <ScrollView
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      {bankingStore.creditCards
                        .filter(card => card.status === 'active')
                        .map(card => (
                          <TouchableOpacity
                            key={card.id}
                            style={[
                              styles.dropdownOption,
                              selectedCreditCard?.id === card.id && {
                                backgroundColor:
                                  theme.colors.palette.primary500 + '10',
                              },
                            ]}
                            onPress={() => {
                              uiStore.setPayBillSelectedCreditCard(card.id)
                            }}
                          >
                            <View style={styles.cardInfo}>
                              <Text
                                style={
                                  [
                                    styles.cardName,
                                    { color: theme.colors.text },
                                  ] as any
                                }
                              >
                                {card.cardholderName}
                              </Text>
                              <Text
                                style={
                                  [
                                    styles.cardNumber,
                                    { color: theme.colors.textDim },
                                  ] as any
                                }
                              >
                                {formatCardNumber(card.cardNumber)} • $
                                {card.availableCredit.toFixed(2)} available
                              </Text>
                            </View>
                            {selectedCreditCard?.id === card.id && (
                              <Ionicons
                                name="checkmark"
                                size={20}
                                color={theme.colors.palette.primary500}
                              />
                            )}
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* Pay Button */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[
                  styles.payButton,
                  { backgroundColor: theme.colors.palette.primary500 },
                  isLoading && styles.disabledButton,
                ]}
                onPress={handlePayment}
                disabled={isLoading}
              >
                <Text
                  style={
                    [
                      styles.payButtonText,
                      { color: theme.colors.palette.neutral100 },
                    ] as any
                  }
                >
                  {isLoading
                    ? 'Processing...'
                    : `Pay $${parseFloat(paymentAmount || '0').toFixed(2)}`}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        nestedScrollEnabled
      />

      {/* OTP Modal */}
      <Modal
        visible={showPinModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => uiStore.togglePayBillPinModal()}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.otpModal,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <Text style={styles.otpTitle}>Enter PIN</Text>
            <Text style={styles.otpSubtitle}>
              Enter your 4-digit PIN to proceed
            </Text>

            <View style={styles.otpInputContainer}>
              {[...Array(4)].map((_, index) => (
                <TextInput
                  key={index}
                  ref={ref => (otpRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    { borderColor: theme.colors.border },
                  ]}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={pin[index] || ''}
                  onChangeText={value => handleOtpChange(value, index)}
                  onKeyPress={({ nativeEvent }) =>
                    handleOtpKeyPress(nativeEvent.key, index)
                  }
                  secureTextEntry
                />
              ))}
            </View>

            <View style={styles.otpButtons}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { borderColor: theme.colors.border },
                ]}
                onPress={() => uiStore.togglePayBillPinModal()}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  { backgroundColor: theme.colors.palette.primary500 },
                ]}
                onPress={processPayment}
              >
                <Text style={styles.confirmButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Dialog */}
      <SuccessDialog
        visible={dialogVisible}
        isSuccess={isSuccess}
        message={message}
        subMessage={subMessage}
        onClose={() => {
          onDialogDismiss(isSuccess ? 'success' : 'error')
        }}
      />
    </KeyboardAvoidingView>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      paddingTop: 40,
      paddingHorizontal: 24,
      paddingBottom: 20,
    },
    backButton: {
      marginBottom: 16,
    },
    subtitle: {
      fontSize: 16,
      marginTop: 4,
    },
    section: {
      paddingHorizontal: 24,
      marginBottom: 24,
    },
    billCard: {
      borderRadius: 16,
      padding: 20,
    },
    billHeader: {
      marginBottom: 20,
    },
    billerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    billerIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    billerName: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 4,
    },
    billerCategory: {
      fontSize: 14,
    },
    billDetails: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral300,
      paddingTop: 16,
    },
    billDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    billDetailLabel: {
      fontSize: 14,
    },
    billDetailValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    amountInput: {
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 16,
    },
    readOnlyInput: {
      opacity: 0.7,
    },
    amountNote: {
      fontSize: 12,
      textAlign: 'center',
      marginTop: 8,
    },
    paymentMethodToggle: {
      flexDirection: 'row',
      borderRadius: 12,
      padding: 4,
      backgroundColor: theme.colors.palette.neutral300,
      marginTop: 16,
    },
    toggleOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    toggleOptionActive: {
      // Active styles handled inline
    },
    toggleText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    selector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    selectorDisplay: {
      flex: 1,
    },
    placeholderText: {
      fontSize: 16,
    },
    dropdown: {
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 8,
      height: 150,
      overflow: 'hidden',
    },
    dropdownOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    accountInfo: {
      flex: 1,
    },
    accountName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    accountNumber: {
      fontSize: 14,
    },
    cardInfo: {
      flex: 1,
    },
    cardName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    cardNumber: {
      fontSize: 14,
    },
    payButton: {
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 40,
    },
    disabledButton: {
      opacity: 0.6,
    },
    payButtonText: {
      fontSize: 18,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.palette.overlay20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    otpModal: {
      width: '90%',
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
    },
    otpTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
      textAlign: 'center',
    },
    otpSubtitle: {
      fontSize: 14,
      marginBottom: 24,
      textAlign: 'center',
    },
    otpInputContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
      paddingHorizontal: 10,
    },
    otpInput: {
      width: 50, // Adjusted width for better spacing
      height: 60, // Adjusted height for better spacing
      borderWidth: 1,
      borderRadius: 8,
      marginHorizontal: 5,
      textAlign: 'center',
      fontSize: 20, // Slightly larger font size
      fontWeight: '600',
    },
    otpButtons: {
      flexDirection: 'row',
      width: '100%',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
  })

export default PayBillScreen
