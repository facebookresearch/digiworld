// Copyright (c) Meta Platforms, Inc. and affiliates.
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
import DateTimePicker from '@react-native-community/datetimepicker'
import DropdownList from '@/components/DropdownList'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'

const SchedulePaymentScreen = observer(() => {
  const { bankingStore, userStore, uiStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { sessionTimeStamp } = useLocalSearchParams()
  const { trackScreenMount } = useInteractionTracking(
    'Schedule Payment',
    '/bills/schedule-payment',
  )

  // Get form state from UIStore
  const {
    selectedBillerId,
    paymentMethod,
    selectedAccountId,
    selectedCreditCardId,
    showAccountPicker,
    showCreditCardPicker,
    showBillerPicker,
    paymentAmount,
    scheduledDate,
    showDatePicker,
    showTimePicker,
    notes,
    isLoading,
    showPinModal,
    pin,
    currentFocused,
  } = uiStore.schedulePaymentForm

  useFocusEffect(
    React.useCallback(() => {
      trackScreenMount({
        date: Date.now(),
        screenName: 'Schedule Payment',
        route: '/bills/schedule-payment',
      })
    }, []),
  )

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

  // Get selected objects from IDs
  const selectedBiller = bankingStore.billers.find(
    b => b.id === selectedBillerId,
  )
  const selectedAccount = paymentAccounts.find(a => a.id === selectedAccountId)
  const selectedCreditCard = bankingStore.creditCards.find(
    c => c.id === selectedCreditCardId,
  )
  const scheduledDateObj = scheduledDate
    ? new Date(scheduledDate)
    : new Date(Date.now() + 24 * 60 * 60 * 1000)

  const otpRefs = useRef<(TextInput | null)[]>([])
  const paymentAmountRef = useRef<TextInput>(null)
  const notesRef = useRef<TextInput>(null)

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
      } else if (focusedElement === 'notes') {
        setTimeout(() => {
          notesRef.current?.focus()
          notesRef.current?.setSelection(notes.length, notes.length)
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
  }, [sessionTimeStamp, currentFocused, paymentAmount, notes, pin])

  const loadData = async () => {
    try {
      // Auto-select primary account
      const primaryAccount = paymentAccounts.find(a => a.isPrimary)
      if (primaryAccount) {
        uiStore.setSchedulePaymentAccount(primaryAccount.id)
      }

      // Auto-select first credit card if available
      if (bankingStore.creditCards.length > 0) {
        uiStore.setSchedulePaymentCreditCard(bankingStore.creditCards[0].id)
      }

      // Set initial scheduled date if not set
      if (!scheduledDate) {
        uiStore.setSchedulePaymentDate(
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        )
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSchedulePayment = debounce(async () => {
    if (!selectedBiller) {
      uiStore.showDialog({
        isSuccess: false,
        message: 'Error',
        subMessage: 'Please select a biller',
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

    // Validate scheduled date is in the future
    if (scheduledDateObj <= new Date()) {
      uiStore.showDialog({
        isSuccess: false,
        message: 'Error',
        subMessage: 'Please select a future date and time',
      })
      return
    }

    // Show PIN modal for secure scheduling
    // If PIN validation disabled, process immediately
    console.log(
      'PIN validation required:',
      bankingStore.isPINValidationRequired,
    )
    if (!bankingStore.isPINValidationRequired) {
      processScheduledPayment()
    } else {
      uiStore.toggleSchedulePaymentPinModal()
    }
  }, 300)

  const processScheduledPayment = async () => {
    // Only validate PIN when required by system config
    if (bankingStore.isPINValidationRequired) {
      if (pin !== userStore.user?.pin) {
        uiStore.showDialog({
          isSuccess: false,
          message: 'Error',
          subMessage: 'Invalid PIN',
        })
        uiStore.setSchedulePaymentPin('')
        return
      }
    }

    uiStore.setSchedulePaymentLoading(true)

    try {
      await bankingStore.scheduleFuturePayment({
        billerId: selectedBiller?.id?.toString() || '',
        fromAccountId:
          paymentMethod === 'account'
            ? selectedAccount?.id?.toString() || ''
            : undefined,
        creditCardId:
          paymentMethod === 'credit_card'
            ? selectedCreditCard?.id?.toString() || ''
            : '',
        amount: parseFloat(paymentAmount),
        scheduledDate: scheduledDateObj.toISOString(), // Ensure date is properly formatted as a string
        notes:
          notes || `Scheduled payment to ${selectedBiller?.name || 'biller'}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      // Refresh scheduled payments list
      await bankingStore.loadScheduledPayments()

      uiStore.showDialog({
        isSuccess: true,
        message: 'Success',
        subMessage: `Payment of $${paymentAmount} to ${selectedBiller?.name || 'biller'} scheduled for ${scheduledDateObj.toLocaleDateString()}`,
      })
    } catch (error: any) {
      uiStore.showDialog({
        isSuccess: false,
        message: 'Error',
        subMessage: error.message || 'Failed to schedule payment',
      })
      console.log('Failed to schedule payment:', error)
    } finally {
      uiStore.setSchedulePaymentLoading(false)
      uiStore.setSchedulePaymentPin('')
    }
  }

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    uiStore.toggleSchedulePaymentDatePicker()
    if (selectedDate) {
      const newDate = new Date(scheduledDateObj)
      newDate.setFullYear(selectedDate.getFullYear())
      newDate.setMonth(selectedDate.getMonth())
      newDate.setDate(selectedDate.getDate())
      uiStore.setSchedulePaymentDate(newDate.toISOString())
    }
  }

  const handleTimeChange = (event: any, selectedTime: Date | undefined) => {
    uiStore.toggleSchedulePaymentTimePicker()
    if (selectedTime) {
      const newDate = new Date(scheduledDateObj)
      newDate.setHours(selectedTime.getHours())
      newDate.setMinutes(selectedTime.getMinutes())
      uiStore.setSchedulePaymentDate(newDate.toISOString())
    }
  }

  const handleOtpChange = (value: string, index: number) => {
    const newPin = pin.split('')
    newPin[index] = value
    uiStore.setSchedulePaymentPin(newPin.join(''))

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
        uiStore.setSchedulePaymentPin(newPin.join(''))
        if (index > 0) {
          otpRefs.current[index - 1]?.focus()
        }
      } else if (index > 0) {
        // If current field is empty, move to previous field and clear it
        const newPin = pin.split('')
        newPin[index - 1] = ''
        uiStore.setSchedulePaymentPin(newPin.join(''))
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

  const onDialogDismiss = (status: string) => {
    if (status === 'success') {
      router.replace('/(app)/pay-bills')
    } else {
      uiStore.hideDialog()
    }
  }

  const renderBillerItem = (biller: any) => (
    <View style={styles.billerInfo}>
      <View
        style={[
          styles.billerIcon,
          {
            backgroundColor: getCategoryColor(biller.category) + '15',
          },
        ]}
      >
        <Ionicons
          name={getCategoryIcon(biller.category) as any}
          size={20}
          color={getCategoryColor(biller.category)}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ ...styles.billerName, color: theme.colors.text }} // Ensure text is visible
        >
          {biller.name}
        </Text>
        <Text
          style={{ ...styles.billerCategory, color: theme.colors.textDim }} // Ensure category text is visible
        >
          {biller.category?.charAt(0).toUpperCase() + biller.category?.slice(1)}
        </Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          data={[]}
          renderItem={() => null} // Placeholder renderItem
          ListHeaderComponent={
            <>
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
                  Schedule Payment
                </Text>
                <Text
                  style={
                    [styles.subtitle, { color: theme.colors.textDim }] as any
                  }
                >
                  Schedule a future payment to any biller
                </Text>
              </View>

              {/* Biller Selection */}
              <View style={styles.section}>
                <Text
                  preset="subheading"
                  style={{ color: theme.colors.text as string }}
                >
                  Select Biller
                </Text>
                <TouchableOpacity
                  style={[
                    styles.selector,
                    {
                      backgroundColor: (theme.colors as any).surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => uiStore.toggleSchedulePaymentBillerPicker()}
                >
                  <View style={styles.selectorDisplay}>
                    {selectedBiller ? (
                      <View style={styles.billerInfo}>
                        <View
                          style={[
                            styles.billerIcon,
                            {
                              backgroundColor:
                                getCategoryColor(
                                  selectedBiller?.category || 'utilities',
                                ) + '15',
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              getCategoryIcon(
                                selectedBiller?.category || 'utilities',
                              ) as any
                            }
                            size={20}
                            color={getCategoryColor(
                              selectedBiller?.category || 'utilities',
                            )}
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
                            {selectedBiller?.name}
                          </Text>
                          <Text
                            style={
                              [
                                styles.billerCategory,
                                { color: theme.colors.textDim },
                              ] as any
                            }
                          >
                            {selectedBiller?.category?.charAt(0).toUpperCase() +
                              (selectedBiller?.category?.slice(1) || '')}
                          </Text>
                        </View>
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
                        Select a biller
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name={showBillerPicker ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.colors.textDim}
                  />
                </TouchableOpacity>

                {showBillerPicker && (
                  <DropdownList
                    data={bankingStore.billers}
                    renderItem={renderBillerItem}
                    onSelect={biller => {
                      uiStore.setSchedulePaymentBiller(biller.id)
                      if (biller.averageBillAmount) {
                        uiStore.setSchedulePaymentAmount(
                          biller.averageBillAmount.toString(),
                        )
                      }
                    }}
                    selectedItem={selectedBiller}
                    keyExtractor={biller => biller.id.toString()}
                    style={{ borderColor: theme.colors.border }}
                  />
                )}
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
                  ]}
                  value={paymentAmount}
                  onChangeText={uiStore.setSchedulePaymentAmount}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textDim}
                  keyboardType="decimal-pad"
                  onFocus={() =>
                    uiStore.setSchedulePaymentFocused('paymentAmount')
                  }
                  onBlur={() => uiStore.setSchedulePaymentFocused(null)}
                />
                {selectedBiller?.averageBillAmount && (
                  <Text
                    style={
                      [
                        styles.amountNote,
                        { color: theme.colors.textDim },
                      ] as any
                    }
                  >
                    Average amount: $
                    {selectedBiller.averageBillAmount.toFixed(2)}
                  </Text>
                )}
              </View>

              {/* Scheduled Date & Time */}
              <View style={styles.section}>
                <Text
                  preset="subheading"
                  style={{ color: theme.colors.text as string }}
                >
                  Schedule Date & Time
                </Text>

                <View style={styles.dateTimeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.dateTimeButton,
                      {
                        backgroundColor: (theme.colors as any).surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => uiStore.toggleSchedulePaymentDatePicker()}
                  >
                    <Ionicons
                      name="calendar"
                      size={20}
                      color={theme.colors.palette.primary500}
                    />
                    <Text
                      style={
                        [
                          styles.dateTimeText,
                          { color: theme.colors.text },
                        ] as any
                      }
                    >
                      {scheduledDateObj.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.dateTimeButton,
                      {
                        backgroundColor: (theme.colors as any).surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => uiStore.toggleSchedulePaymentTimePicker()}
                  >
                    <Ionicons
                      name="time"
                      size={20}
                      color={theme.colors.palette.primary500}
                    />
                    <Text
                      style={
                        [
                          styles.dateTimeText,
                          { color: theme.colors.text },
                        ] as any
                      }
                    >
                      {scheduledDateObj.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={scheduledDateObj}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}

                {showTimePicker && (
                  <DateTimePicker
                    value={scheduledDateObj}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </View>

              {/* Payment Method Selection */}
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
                    onPress={() => uiStore.setSchedulePaymentMethod('account')}
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
                      uiStore.setSchedulePaymentMethod('credit_card')
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

              {/* Account/Card Selection */}
              {paymentMethod === 'account' && (
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
                    onPress={() => uiStore.toggleSchedulePaymentAccountPicker()}
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
                            {formatAccountNumber(selectedAccount.accountNumber)}{' '}
                            • ${selectedAccount.balance.toFixed(2)}
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
                        style={styles.dropdownScroll}
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
                              uiStore.setSchedulePaymentAccount(account.id)
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
                    onPress={() =>
                      uiStore.toggleSchedulePaymentCreditCardPicker()
                    }
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
                            {formatCardNumber(selectedCreditCard.cardNumber)} •
                            ${selectedCreditCard.availableCredit.toFixed(2)}{' '}
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
                      name={
                        showCreditCardPicker ? 'chevron-up' : 'chevron-down'
                      }
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
                        style={styles.dropdownScroll}
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
                                uiStore.setSchedulePaymentCreditCard(card.id)
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

              {/* Notes */}
              <View style={styles.section}>
                <Text
                  preset="subheading"
                  style={{ color: theme.colors.text as string }}
                >
                  Notes (Optional)
                </Text>
                <TextInput
                  ref={notesRef}
                  style={[
                    styles.notesInput,
                    {
                      backgroundColor: (theme.colors as any).surface,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  value={notes}
                  onChangeText={uiStore.setSchedulePaymentNotes}
                  placeholder="Add any notes for this scheduled payment..."
                  placeholderTextColor={theme.colors.textDim}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  onFocus={() => uiStore.setSchedulePaymentFocused('notes')}
                  onBlur={() => uiStore.setSchedulePaymentFocused(null)}
                />
              </View>

              {/* Schedule Button */}
              <View style={styles.section}>
                <TouchableOpacity
                  style={[
                    styles.scheduleButton,
                    { backgroundColor: theme.colors.palette.primary500 },
                    isLoading && styles.disabledButton,
                  ]}
                  onPress={handleSchedulePayment}
                  disabled={isLoading}
                >
                  <Text
                    style={
                      [
                        styles.scheduleButtonText,
                        { color: theme.colors.palette.neutral100 },
                      ] as any
                    }
                  >
                    {isLoading
                      ? 'Scheduling...'
                      : `Schedule Payment for ${scheduledDateObj.toLocaleDateString()}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          }
          nestedScrollEnabled
        />

        {/* PIN Modal */}
        <Modal
          visible={showPinModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => uiStore.toggleSchedulePaymentPinModal()}
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
                Enter your 4-digit PIN to schedule payment
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
                  onPress={() => uiStore.toggleSchedulePaymentPinModal()}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    { backgroundColor: theme.colors.palette.primary500 },
                  ]}
                  onPress={processScheduledPayment}
                >
                  <Text style={styles.confirmButtonText}>Schedule</Text>
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
    </SafeAreaView>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingTop: 20,
      paddingHorizontal: 24,
      paddingBottom: 20,
    },
    backButton: {
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    subtitle: {
      fontSize: 16,
      marginTop: 4,
    },
    section: {
      paddingHorizontal: 24,
      marginBottom: 24,
    },
    selector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginTop: 16,
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
      height: 150, // Fixed height for dropdown
      overflow: 'hidden',
      backgroundColor: theme.colors.palette.neutral100,
      width: '100%', // Ensure dropdown takes full width
    },
    dropdownOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.overlay20,
      width: '100%', // Ensure options take full width
    },
    dropdownOptionLast: {
      borderBottomWidth: 0, // Remove border for the last item
    },
    dropdownScroll: {
      height: 150, // Fixed height for scrolling
    },
    billerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    billerIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    billerName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    billerCategory: {
      fontSize: 14,
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
    amountNote: {
      fontSize: 12,
      textAlign: 'center',
      marginTop: 8,
    },
    dateTimeContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    dateTimeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 8,
    },
    dateTimeText: {
      fontSize: 16,
      fontWeight: '600',
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
    notesInput: {
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      height: 80,
      marginTop: 16,
    },
    scheduleButton: {
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 40,
    },
    disabledButton: {
      opacity: 0.6,
    },
    scheduleButtonText: {
      fontSize: 18,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.palette.overlay50,
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
      width: 50,
      height: 60,
      borderWidth: 1,
      borderRadius: 8,
      marginHorizontal: 5,
      textAlign: 'center',
      fontSize: 20,
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

export default SchedulePaymentScreen
