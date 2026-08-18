// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useState, useRef, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import {
  useRouter,
  useLocalSearchParams,
  useFocusEffect,
  usePathname,
} from 'expo-router'
import { useStores } from '@/models'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FancyAlert } from '@/components/FancyAlert'
import { SuccessDialog } from '@/components/SuccessDialog'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'

const SendMoneyScreen = observer(() => {
  const { bankingStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { id, sessionTimeStamp } = useLocalSearchParams()
  const path = usePathname()
  console.log('Current path:', path)
  const { trackScreenMount } = useInteractionTracking(
    'Send Money',
    `/nexus-pay/${id}`,
  )

  const otpRefs = useRef<(TextInput | null)[]>([])
  const amountRef = useRef<TextInput>(null)
  const memoRef = useRef<TextInput>(null)
  const [dialogState, setDialogState] = useState({
    visible: false,
    isSuccess: true,
    message: '',
    subMessage: '',
  })

  // Get form state
  const { amount, memo, pin, currentFocused } = bankingStore.sendMoneyForm

  // Reset form when component mounts
  useEffect(() => {
    return () => {
      // Clean up form when component unmounts
      bankingStore.resetSendMoneyForm()
    }
  }, [])

  // Focus restoration for sessionTimeStamp
  useEffect(() => {
    if (sessionTimeStamp) {
      const focusedElement = currentFocused
      if (focusedElement === 'amount') {
        setTimeout(() => {
          amountRef.current?.focus()
          amountRef.current?.setSelection(amount.length, amount.length)
        }, 100)
      } else if (focusedElement === 'memo') {
        setTimeout(() => {
          memoRef.current?.focus()
          memoRef.current?.setSelection(memo.length, memo.length)
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
  }, [sessionTimeStamp, currentFocused, amount, memo, pin])

  useFocusEffect(
    React.useCallback(() => {
      trackScreenMount({
        date: Date.now(),
        screenName: 'Send Money',
        route: `/nexus-pay/${id}`,
      })
    }, []),
  )

  // Get the contact details
  const contact = bankingStore.zelleContacts.find(c => c.id === Number(id))

  // Get available accounts (savings and checking only)
  const availableAccounts = bankingStore.activeAccounts.filter(account => {
    const accountType = bankingStore.getAccountType(account.accountTypeId)
    return accountType && ['savings', 'checking'].includes(accountType.code)
  })

  // Auto-select primary account on mount
  useEffect(() => {
    if (bankingStore.sendMoneyForm.selectedAccountId === null) {
      const primaryAccount = availableAccounts.find(
        account => account.isPrimary,
      )
      if (primaryAccount) {
        bankingStore.setSendMoneySelectedAccountId(primaryAccount.id)
      } else if (availableAccounts.length > 0) {
        bankingStore.setSendMoneySelectedAccountId(availableAccounts[0].id)
      }
    }
  }, [bankingStore.activeAccounts.length]) // Only run when accounts change, not on every render

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U'
    const words = name
      .trim()
      .split(' ')
      .filter(word => word.length > 0)
    if (words.length === 0) return 'U'
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase()
    }
    return (
      words[0].charAt(0) + words[words.length - 1].charAt(0)
    ).toUpperCase()
  }

  // Helper function to format phone number
  const formatPhoneNumber = (phone: string) => {
    if (!phone || typeof phone !== 'string') return ''
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    return phone
  }

  const handleAmountChange = (text: string) => {
    // Only allow numbers and decimal point
    const cleanText = text.replace(/[^0-9.]/g, '')

    // Prevent multiple decimal points
    const parts = cleanText.split('.')
    if (parts.length > 2) {
      return
    }

    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return
    }

    bankingStore.setSendMoneyAmount(cleanText)
  }
  const handleSend = debounce(() => {
    const amountNum = parseFloat(bankingStore.sendMoneyForm.amount)

    if (!amountNum || amountNum <= 0) {
      bankingStore.showAlert({
        title: 'Invalid Amount',
        message: 'Please enter a valid amount greater than $0.00',
        preset: 'error',
      })
      return
    }

    if (!bankingStore.sendMoneyForm.selectedAccountId) {
      bankingStore.showAlert({
        title: 'No Account Selected',
        message: 'Please select an account to send money from',
        preset: 'error',
      })
      return
    }

    const selectedAccount = availableAccounts.find(
      acc => acc.id === bankingStore.sendMoneyForm.selectedAccountId,
    )
    if (!selectedAccount || selectedAccount.balance < amountNum) {
      bankingStore.showAlert({
        title: 'Insufficient Funds',
        message: 'You do not have enough funds in the selected account',
        preset: 'error',
      })
      return
    }

    // If PIN validation is disabled by system config, perform send immediately
    if (!bankingStore.isPINValidationRequired) {
      // Directly perform the send (handlePinSubmit contains the send logic)
      handlePinSubmit()
    } else {
      bankingStore.setSendMoneyShowPinModal(true)
    }
  }, 300)

  const handlePinSubmit = async () => {
    // Only validate PIN when required by system config
    if (bankingStore.isPINValidationRequired) {
      if (bankingStore.sendMoneyForm.pin.length !== 4) {
        bankingStore.showAlert({
          title: 'Invalid PIN',
          message: 'Please enter your 4-digit PIN',
          preset: 'error',
        })
        return
      }
    }

    bankingStore.setSendMoneyIsProcessing(true)
    try {
      // Create Zelle transaction
      const transactionData = {
        userId: bankingStore.currentSession?.userId,
        fromAccountId: bankingStore.sendMoneyForm.selectedAccountId,
        zelleContactId: Number(id),
        amount: parseFloat(bankingStore.sendMoneyForm.amount),
        memo: bankingStore.sendMoneyForm.memo.trim() || undefined,
        pin: bankingStore.sendMoneyForm.pin,
      }

      // Call the Zelle payment API
      await bankingStore.sendZellePayment({
        ...transactionData,
        userId: bankingStore.currentSession!.userId,
        fromAccountId: bankingStore.sendMoneyForm.selectedAccountId!,
      })

      bankingStore.setSendMoneyShowPinModal(false)
      bankingStore.setSendMoneyPin('')

      setDialogState({
        visible: true,
        isSuccess: true,
        message: 'Payment Sent',
        subMessage: `$${bankingStore.sendMoneyForm.amount} has been sent to ${contact?.contactName} successfully!`,
      })
    } catch (error) {
      console.error('Error sending payment:', error)
      bankingStore.setSendMoneyShowPinModal(false)
      bankingStore.setSendMoneyPin('')

      bankingStore.showAlert({
        title: 'Payment Failed',
        message: 'Unable to send payment. Please try again.',
        preset: 'error',
      })
    } finally {
      bankingStore.setSendMoneyIsProcessing(false)
    }
  }

  const handleOtpChange = (value: string, index: number) => {
    const newPin = bankingStore.sendMoneyForm.pin.split('')
    newPin[index] = value
    bankingStore.setSendMoneyPin(newPin.join(''))

    // Auto-focus next input if not the last box
    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace') {
      if (bankingStore.sendMoneyForm.pin[index]) {
        // If current field has a value, clear it and move to previous field
        const newPin = bankingStore.sendMoneyForm.pin.split('')
        newPin[index] = ''
        bankingStore.setSendMoneyPin(newPin.join(''))
        if (index > 0) {
          otpRefs.current[index - 1]?.focus()
        }
      } else if (index > 0) {
        // If current field is empty, move to previous field and clear it
        const newPin = bankingStore.sendMoneyForm.pin.split('')
        newPin[index - 1] = ''
        bankingStore.setSendMoneyPin(newPin.join(''))
        otpRefs.current[index - 1]?.focus()
      }
    }
  }

  const onDialogDismiss = (status: string) => {
    if (status === 'success') {
      bankingStore.resetSendMoneyForm()
      router.back()
    } else {
      setDialogState({ ...dialogState, visible: false })
    }
  }

  const handleCancel = () => {
    router.back()
  }

  if (!contact) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text>Contact not found</Text>
          <TouchableOpacity onPress={handleCancel}>
            <Text>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text
          preset="subheading"
          style={{ color: theme.colors.text as string }}
        >
          Send Money
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contact Info */}
        <View style={styles.contactSection}>
          <View
            style={[
              styles.contactAvatar,
              { backgroundColor: theme.colors.palette.primary400 + '20' },
            ]}
          >
            <Text
              style={{
                ...styles.contactInitial,
                color: theme.colors.palette.primary400,
              }}
            >
              {getInitials(contact.contactName)}
            </Text>
          </View>
          <Text
            style={{
              ...styles.contactName,
              color: theme.colors.text as string,
            }}
          >
            {contact.contactName}
          </Text>
          {contact.contactEmail && (
            <Text
              style={{
                ...styles.contactDetail,
                color: theme.colors.textDim as string,
              }}
            >
              {contact.contactEmail}
            </Text>
          )}
          {contact.contactPhone && (
            <Text
              style={{
                ...styles.contactDetail,
                color: theme.colors.textDim as string,
              }}
            >
              {formatPhoneNumber(contact.contactPhone)}
            </Text>
          )}
        </View>

        {/* Amount Input */}
        <View style={styles.amountSection}>
          <Text
            style={{
              ...styles.sectionTitle,
              color: theme.colors.text as string,
            }}
          >
            Amount
          </Text>
          <View style={styles.amountInputContainer}>
            <Text
              style={{
                ...styles.dollarSign,
                color: theme.colors.text as string,
              }}
            >
              $
            </Text>
            <TextInput
              ref={amountRef}
              style={{
                ...styles.amountInput,
                color: theme.colors.text as string,
              }}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textDim}
              value={bankingStore.sendMoneyForm.amount}
              onChangeText={handleAmountChange}
              keyboardType="decimal-pad"
              maxLength={10}
              onFocus={() => bankingStore.setSendMoneyFocused('amount')}
              onBlur={() => bankingStore.setSendMoneyFocused(null)}
            />
          </View>
        </View>

        {/* Account Selection */}
        <View style={styles.accountSection}>
          <Text
            style={{
              ...styles.sectionTitle,
              color: theme.colors.text as string,
            }}
          >
            From Account *
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
              bankingStore.setSendMoneyShowAccountPicker(
                !bankingStore.sendMoneyForm.showAccountPicker,
              )
            }
          >
            <View style={styles.selectorDisplay}>
              {bankingStore.sendMoneyForm.selectedAccountId ? (
                (() => {
                  const selectedAccount = availableAccounts.find(
                    acc =>
                      acc.id === bankingStore.sendMoneyForm.selectedAccountId,
                  )
                  const accountType = bankingStore.getAccountType(
                    selectedAccount?.accountTypeId || 0,
                  )
                  return (
                    <View style={styles.accountInfo}>
                      <Text
                        style={{
                          ...styles.accountName,
                          color: theme.colors.text as string,
                        }}
                      >
                        {selectedAccount?.accountName ||
                          `${accountType?.name} Account`}
                      </Text>
                      <Text
                        style={{
                          ...styles.accountNumber,
                          color: theme.colors.textDim as string,
                        }}
                      >
                        ****{selectedAccount?.accountNumber.slice(-4)} • $
                        {selectedAccount?.balance.toFixed(2)}
                      </Text>
                    </View>
                  )
                })()
              ) : (
                <Text
                  style={{
                    ...styles.placeholderText,
                    color: theme.colors.textDim as string,
                  }}
                >
                  Select an account
                </Text>
              )}
            </View>
            <Ionicons
              name={
                bankingStore.sendMoneyForm.showAccountPicker
                  ? 'chevron-up'
                  : 'chevron-down'
              }
              size={20}
              color={theme.colors.textDim}
            />
          </TouchableOpacity>

          {bankingStore.sendMoneyForm.showAccountPicker && (
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
                {availableAccounts.map(account => {
                  const accountType = bankingStore.getAccountType(
                    account.accountTypeId,
                  )
                  const isSelected =
                    bankingStore.sendMoneyForm.selectedAccountId === account.id

                  return (
                    <TouchableOpacity
                      key={account.id}
                      style={[
                        styles.dropdownOption,
                        isSelected && {
                          backgroundColor:
                            theme.colors.palette.primary400 + '10',
                        },
                      ]}
                      onPress={() => {
                        bankingStore.setSendMoneySelectedAccountId(account.id)
                        bankingStore.setSendMoneyShowAccountPicker(false)
                      }}
                    >
                      <View style={styles.accountLeft}>
                        <View
                          style={[
                            styles.accountIcon,
                            {
                              backgroundColor:
                                theme.colors.palette.primary400 + '20',
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              accountType?.code === 'checking'
                                ? 'card'
                                : 'wallet'
                            }
                            size={20}
                            color={theme.colors.palette.primary400}
                          />
                        </View>
                        <View style={styles.accountInfo}>
                          <Text
                            style={{
                              ...styles.accountName,
                              color: theme.colors.text as string,
                            }}
                          >
                            {account.accountName ||
                              `${accountType?.name} Account`}
                          </Text>
                          <Text
                            style={{
                              ...styles.accountNumber,
                              color: theme.colors.textDim as string,
                            }}
                          >
                            ****{account.accountNumber.slice(-4)} • $
                            {account.balance.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={theme.colors.palette.primary400}
                        />
                      )}
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Memo Input */}
        <View style={styles.memoSection}>
          <Text
            style={{
              ...styles.sectionTitle,
              color: theme.colors.text as string,
            }}
          >
            Memo (Optional)
          </Text>
          <TextInput
            ref={memoRef}
            style={[
              styles.memoInput,
              {
                backgroundColor: (theme.colors as any).surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            placeholder="What's this for?"
            placeholderTextColor={theme.colors.textDim}
            value={bankingStore.sendMoneyForm.memo}
            onChangeText={bankingStore.setSendMoneyMemo}
            maxLength={100}
            multiline
            onFocus={() => bankingStore.setSendMoneyFocused('memo')}
            onBlur={() => bankingStore.setSendMoneyFocused(null)}
          />
        </View>
      </ScrollView>

      {/* Send Button */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: theme.colors.palette.primary400,
              opacity:
                !bankingStore.sendMoneyForm.amount ||
                bankingStore.sendMoneyForm.isProcessing
                  ? 0.6
                  : 1,
            },
          ]}
          onPress={handleSend}
          disabled={
            !bankingStore.sendMoneyForm.amount ||
            bankingStore.sendMoneyForm.isProcessing
          }
        >
          <Text style={styles.sendButtonText}>
            Send ${bankingStore.sendMoneyForm.amount || '0.00'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* PIN Modal */}
      {bankingStore.sendMoneyForm.showPinModal && (
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.pinModal,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <Text
              style={{
                ...styles.pinTitle,
                color: theme.colors.text as string,
              }}
            >
              Enter Your PIN
            </Text>
            <Text
              style={{
                ...styles.pinSubtitle,
                color: theme.colors.textDim as string,
              }}
            >
              Confirm payment of ${bankingStore.sendMoneyForm.amount} to{' '}
              {contact.contactName}
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
                  value={bankingStore.sendMoneyForm.pin[index] || ''}
                  onChangeText={value => handleOtpChange(value, index)}
                  onKeyPress={({ nativeEvent }) =>
                    handleOtpKeyPress(nativeEvent.key, index)
                  }
                  secureTextEntry
                />
              ))}
            </View>

            <View style={styles.pinButtons}>
              <TouchableOpacity
                style={[
                  styles.pinCancelButton,
                  {
                    backgroundColor: (theme.colors as any).surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => {
                  bankingStore.setSendMoneyShowPinModal(false)
                  bankingStore.setSendMoneyPin('')
                }}
              >
                <Text
                  style={{
                    ...styles.pinCancelText,
                    color: theme.colors.text as string,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.pinConfirmButton,
                  {
                    backgroundColor: theme.colors.palette.primary400,
                    opacity:
                      bankingStore.sendMoneyForm.pin.length !== 4 ||
                      bankingStore.sendMoneyForm.isProcessing
                        ? 0.6
                        : 1,
                  },
                ]}
                onPress={handlePinSubmit}
                disabled={
                  bankingStore.sendMoneyForm.pin.length !== 4 ||
                  bankingStore.sendMoneyForm.isProcessing
                }
              >
                <Text style={styles.pinConfirmText}>
                  {bankingStore.sendMoneyForm.isProcessing
                    ? 'Processing...'
                    : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <FancyAlert
        visible={bankingStore.alertState.visible}
        title={bankingStore.alertState.title || undefined}
        message={bankingStore.alertState.message}
        preset={
          bankingStore.alertState.preset as
            | 'default'
            | 'success'
            | 'error'
            | 'warning'
            | 'delete'
        }
        onClose={() => bankingStore.hideAlert()}
        confirmText={bankingStore.alertState.confirmText}
        cancelText={bankingStore.alertState.cancelText}
      />

      <SuccessDialog
        visible={dialogState.visible}
        isSuccess={dialogState.isSuccess}
        message={dialogState.message}
        subMessage={dialogState.subMessage}
        onClose={() => {
          onDialogDismiss(dialogState.isSuccess ? 'success' : 'error')
        }}
      />
    </SafeAreaView>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    backButton: {
      padding: 4,
    },
    placeholder: {
      width: 32,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contactSection: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    contactAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    contactInitial: {
      fontSize: 32,
      fontWeight: '600',
    },
    contactName: {
      fontSize: 24,
      fontWeight: '600',
      marginBottom: 8,
    },
    contactDetail: {
      fontSize: 16,
      marginBottom: 4,
    },
    amountSection: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
    },
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    dollarSign: {
      fontSize: 48,
      fontWeight: '300',
      marginRight: 8,
    },
    amountInput: {
      fontSize: 48,
      fontWeight: '300',
      textAlign: 'center',
      minWidth: 120,
    },

    accountSection: {
      marginBottom: 32,
    },
    selector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginTop: 8,
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
      maxHeight: 200,
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
    accountLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    accountIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    accountInfo: {
      flex: 1,
    },
    accountName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    accountNumber: {
      fontSize: 14,
    },
    memoSection: {
      marginBottom: 32,
    },
    memoInput: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    actionButtons: {
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    sendButton: {
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    sendButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 18,
      fontWeight: '600',
    },
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.palette.overlay50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pinModal: {
      margin: 24,
      padding: 24,
      borderRadius: 16,
      width: '90%',
      maxWidth: 400,
    },
    pinTitle: {
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 8,
    },
    pinSubtitle: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 24,
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
    pinButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    pinCancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
    },
    pinCancelText: {
      fontSize: 16,
      fontWeight: '600',
    },
    pinConfirmButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    pinConfirmText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
  })

export default SendMoneyScreen
