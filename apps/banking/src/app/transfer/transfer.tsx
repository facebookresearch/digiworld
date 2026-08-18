import React, { useRef, useEffect, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Dimensions,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router'
import { useStores } from '@/models'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { FancyAlert } from '@/components/FancyAlert'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'

const { width } = Dimensions.get('window')

const TransferScreen = observer(() => {
  const { bankingStore, userStore, uiStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const pinRefs = useRef<(TextInput | null)[]>([])
  const { sessionTimeStamp } = useLocalSearchParams()
  const amountRef = useRef<TextInput>(null)
  const { trackScreenMount } = useInteractionTracking(
    'Transfer',
    '/transfer/transfer',
  )

  // Get form state from UIStore
  const {
    fromAccountId,
    toAccountId,
    amount,
    pin,
    showPinInput,
    isProcessing,
    showSuccess,
    transferResult,
    showFromDropdown,
    showToDropdown,
    currentFocused,
  } = uiStore.transferForm

  // Get user accounts (exclude closed accounts)
  const userAccounts = bankingStore.activeAccounts.filter(
    account => account && account.userId === userStore.user?.id,
  )

  // Get available source accounts (can withdraw from)
  const sourceAccounts = userAccounts.filter(account => {
    if (!account || !account.accountTypeId) return false
    const accountType = bankingStore.getAccountType(account.accountTypeId)
    // IRA accounts cannot be used as source for transfers
    return (
      accountType?.code !== 'ira_account' &&
      accountType?.code !== 'money_market'
    )
  })

  useFocusEffect(
    React.useCallback(() => {
      trackScreenMount({
        date: Date.now(),
        screenName: 'Transfer Money',
        route: '/transfer/transfer',
      })
      // Reset form when screen loses focus (navigating away)
      // This preserves form state during rollback restoration, but clears it when navigating away
      return () => {
        // Reset form when navigating away to ensure fresh form on return
        // Rollback will restore the form state, but once user navigates away, it should be cleared
        uiStore.resetTransferForm()
      }
    }, [uiStore]),
  )

  useEffect(() => {
    if (sessionTimeStamp) {
      const focusedElement = currentFocused
      if (focusedElement === 'amount') {
        setTimeout(() => {
          amountRef.current?.focus()
          amountRef.current?.setSelection(amount.length, amount.length)
        }, 100)
      }
    }
  }, [sessionTimeStamp])

  // Get available destination accounts
  const destinationAccounts = userAccounts.filter(
    account => account && account.id !== fromAccountId,
  )

  const selectedFromAccount = sourceAccounts.find(a => a.id === fromAccountId)
  const selectedToAccount = destinationAccounts.find(a => a.id === toAccountId)

  const formatAccountNumber = (accountNumber: string) => {
    return `•••••••••${accountNumber.slice(-4)}`
  }

  const formatAccountDisplay = (account: any) => {
    if (!account) {
      return {
        name: 'Unknown Account',
        details: 'Account not found',
        type: 'ACCOUNT',
      }
    }

    const accountType = bankingStore.getAccountType(account.accountTypeId)
    const typeName =
      accountType?.code.replace('_', ' ').toUpperCase() || 'ACCOUNT'
    return {
      name: account.accountName || `${typeName} Account`,
      details: `${formatAccountNumber(account.accountNumber)} • $${account.balance.toFixed(2)}`,
      type: typeName,
    }
  }

  const validateTransfer = () => {
    if (!fromAccountId) {
      bankingStore.showAlert({
        title: 'Error',
        message: 'Please select a source account',
        preset: 'error',
      })
      return false
    }

    if (!toAccountId) {
      bankingStore.showAlert({
        title: 'Error',
        message: 'Please select a destination account',
        preset: 'error',
      })
      return false
    }

    if (fromAccountId === toAccountId) {
      bankingStore.showAlert({
        title: 'Error',
        message: 'Source and destination accounts must be different',
        preset: 'error',
      })
      return false
    }

    const transferAmount = parseFloat(amount)
    if (!amount || isNaN(transferAmount) || transferAmount <= 0) {
      bankingStore.showAlert({
        title: 'Error',
        message: 'Please enter a valid amount',
        preset: 'error',
      })
      return false
    }

    if (selectedFromAccount && transferAmount > selectedFromAccount.balance) {
      bankingStore.showAlert({
        title: 'Insufficient Funds',
        message: 'The transfer amount exceeds your available balance',
        preset: 'error',
      })
      return false
    }

    return true
  }

  const handleTransferRequest = debounce(() => {
    if (!validateTransfer()) return
    // If PIN validation disabled, perform the transfer immediately
    if (!bankingStore.isPINValidationRequired) {
      handlePinSubmit()
    } else {
      uiStore.toggleTransferPinInput(true)
    }
  }, 300)

  const handlePinChange = (value: string, index: number) => {
    const newPin = pin.split('')
    newPin[index] = value
    uiStore.setTransferPin(newPin.join(''))

    // Auto-focus next input if not the last box
    if (value && index < 3) {
      pinRefs.current[index + 1]?.focus()
    }
  }

  const handlePinKeyPress = (key: string, index: number) => {
    if (key === 'Backspace') {
      if (pin[index]) {
        // If current field has a value, clear it and move to previous field
        const newPin = pin.split('')
        newPin[index] = ''
        uiStore.setTransferPin(newPin.join(''))
        if (index > 0) {
          pinRefs.current[index - 1]?.focus()
        }
      } else if (index > 0) {
        // If current field is empty, move to previous field and clear it
        const newPin = pin.split('')
        newPin[index - 1] = ''
        uiStore.setTransferPin(newPin.join(''))
        pinRefs.current[index - 1]?.focus()
      }
    }
  }

  const handlePinSubmit = async () => {
    // Only validate PIN when required by system config
    if (bankingStore.isPINValidationRequired) {
      if (pin.length !== 4) {
        bankingStore.showAlert({
          title: 'Error',
          message: 'Please enter your complete 4-digit PIN',
          preset: 'error',
        })
        return
      }

      if (pin !== userStore.user?.pin) {
        bankingStore.showAlert({
          title: 'Invalid PIN',
          message: 'The PIN you entered is incorrect',
          preset: 'error',
        })
        uiStore.setTransferPin('')
        return
      }
    }

    uiStore.setTransferProcessing(true)
    try {
      // Store account info before transfer (in case references become stale)
      const fromAccountInfo = selectedFromAccount
        ? formatAccountDisplay(selectedFromAccount)
        : null
      const toAccountInfo = selectedToAccount
        ? formatAccountDisplay(selectedToAccount)
        : null

      const result = await bankingStore.transferFunds(
        fromAccountId!,
        toAccountId!,
        parseFloat(amount),
      )

      // Store the result with account info for success message
      const resultWithNames = {
        ...result,
        fromAccountName: fromAccountInfo?.name,
        toAccountName: toAccountInfo?.name,
      }

      uiStore.setTransferSuccess(true, resultWithNames)
      uiStore.toggleTransferPinInput(false)

      // Do not reset the form immediately so the success dialog can be shown.
      // The form will be reset when the user closes the success dialog
      // (handled in handleSuccessClose).
    } catch (error: any) {
      bankingStore.showAlert({
        title: 'Transfer Failed',
        message: error.message || 'An error occurred during the transfer',
        preset: 'error',
      })
    } finally {
      uiStore.setTransferProcessing(false)
    }
  }

  const handleSuccessClose = () => {
    // Reset the form and then close the screen
    uiStore.resetTransferForm()
    uiStore.setTransferSuccess(false)
    router.back()
  }

  const AccountDropdown = ({
    accounts,
    selectedId,
    onSelect,
    placeholder,
    isVisible,
    onToggle,
  }: {
    accounts: any[]
    selectedId: number | null
    onSelect: (id: number) => void
    placeholder: string
    isVisible: boolean
    onToggle: () => void
  }) => {
    const selectedAccount = accounts.find(a => a.id === selectedId)
    const displayInfo = selectedAccount
      ? formatAccountDisplay(selectedAccount)
      : null

    return (
      <View style={styles.accountDropdownContainer}>
        <TouchableOpacity
          style={[
            styles.selector,
            {
              backgroundColor: theme.colors.palette.neutral100,
              borderColor: theme.colors.palette.neutral400,
            },
          ]}
          onPress={onToggle}
        >
          <View style={styles.selectorDisplay}>
            {displayInfo ? (
              <View style={styles.selectedAccountInfo}>
                <Text style={styles.selectedAccountName}>
                  {displayInfo.name}
                </Text>
                <Text style={styles.selectedAccountDetails}>
                  {displayInfo.details}
                </Text>
              </View>
            ) : (
              <Text style={styles.dropdownPlaceholder}>{placeholder}</Text>
            )}
          </View>
          <Ionicons
            name={isVisible ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.colors.textDim}
          />
        </TouchableOpacity>

        {isVisible && (
          <View
            style={[
              styles.dropdown,
              {
                backgroundColor: theme.colors.palette.neutral100,
                borderColor: theme.colors.palette.neutral400,
              },
            ]}
          >
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {accounts.map(account => {
                const info = formatAccountDisplay(account)
                return (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.dropdownOption,
                      selectedId === account.id && {
                        backgroundColor: theme.colors.palette.primary100,
                      },
                    ]}
                    onPress={() => onSelect(account.id)}
                  >
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>{info.name}</Text>
                      <Text style={styles.accountNumber}>{info.details}</Text>
                    </View>
                    {selectedId === account.id && (
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
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            // Reset form when explicitly navigating away via back button
            uiStore.resetTransferForm()
            router.back()
          }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text preset="subheading" style={styles.headerTitle}>
          Transfer Money
        </Text>
        <Text style={styles.headerSubtitle}>
          Move money between your accounts
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Transfer Form Card */}
        <View style={styles.formCard}>
          {/* From Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>From Account</Text>
            <AccountDropdown
              accounts={sourceAccounts}
              selectedId={fromAccountId}
              onSelect={id => {
                uiStore.setTransferFromAccount(id)
              }}
              placeholder="Select source account"
              isVisible={showFromDropdown}
              onToggle={() => {
                uiStore.toggleTransferFromDropdown()
              }}
            />
          </View>

          {/* Transfer Direction Icon */}
          <View style={styles.transferIconContainer}>
            <View style={styles.transferIcon}>
              <Ionicons
                name="arrow-down"
                size={20}
                color={theme.colors.palette.primary400}
              />
            </View>
          </View>

          {/* To Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>To Account</Text>
            <AccountDropdown
              accounts={destinationAccounts}
              selectedId={toAccountId}
              onSelect={id => {
                uiStore.setTransferToAccount(id)
              }}
              placeholder="Select destination account"
              isVisible={showToDropdown}
              onToggle={() => {
                uiStore.toggleTransferToDropdown()
              }}
            />
          </View>

          {/* Amount Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transfer Amount</Text>
            <View
              style={[
                styles.amountContainer,
                {
                  borderColor:
                    currentFocused === 'amount'
                      ? theme.colors.palette.primary500
                      : theme.colors.palette.neutral300,
                },
              ]}
            >
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                ref={amountRef}
                style={styles.amountInput}
                value={amount}
                onChangeText={uiStore.setTransferAmount}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textDim}
                keyboardType="decimal-pad"
                maxLength={10}
                onFocus={() => uiStore.setTransferFocused('amount')}
                onBlur={() => uiStore.setTransferFocused(null)}
              />
            </View>
            {selectedFromAccount && (
              <Text style={styles.availableBalance}>
                Available: ${selectedFromAccount.balance.toFixed(2)}
              </Text>
            )}
          </View>
        </View>

        {/* Transfer Summary */}
        {fromAccountId && toAccountId && amount && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Transfer Summary</Text>
            <View style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>From:</Text>
                <Text style={styles.summaryValue}>
                  {formatAccountDisplay(selectedFromAccount!).name}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>To:</Text>
                <Text style={styles.summaryValue}>
                  {formatAccountDisplay(selectedToAccount!).name}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryAmountRow]}>
                <Text style={styles.summaryLabel}>Amount:</Text>
                <Text style={styles.summaryAmount}>
                  ${parseFloat(amount || '0').toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Transfer Button */}
        <TouchableOpacity
          style={[
            styles.transferButton,
            {
              opacity:
                !fromAccountId || !toAccountId || !amount || isProcessing
                  ? 0.6
                  : 1,
            },
          ]}
          onPress={handleTransferRequest}
          disabled={!fromAccountId || !toAccountId || !amount || isProcessing}
        >
          <Text style={styles.transferButtonText}>
            {amount
              ? `Transfer $${parseFloat(amount || '0').toFixed(2)}`
              : 'Transfer Money'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 4-Tile PIN Input Modal */}
      {showPinInput && (
        <View style={styles.pinOverlay}>
          <View style={styles.pinContainer}>
            <View style={styles.pinHeader}>
              <Ionicons
                name="shield-checkmark"
                size={32}
                color={theme.colors.palette.primary400}
              />
            </View>

            <Text style={styles.pinTitle}>Enter Your PIN</Text>
            <Text style={styles.pinSubtitle}>
              Please enter your 4-digit PIN to confirm the transfer
            </Text>

            <View style={styles.pinInputContainer}>
              {[...Array(4)].map((_, index) => (
                <TextInput
                  key={index}
                  ref={ref => (pinRefs.current[index] = ref)}
                  style={[
                    styles.pinInput,
                    { borderColor: theme.colors.border },
                  ]}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={pin[index] || ''}
                  onChangeText={value => handlePinChange(value, index)}
                  onKeyPress={({ nativeEvent }) =>
                    handlePinKeyPress(nativeEvent.key, index)
                  }
                  secureTextEntry
                  autoFocus={index === 0}
                />
              ))}
            </View>

            <View style={styles.pinButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  uiStore.toggleTransferPinInput(false)
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  {
                    opacity: pin.length !== 4 || isProcessing ? 0.6 : 1,
                  },
                ]}
                onPress={handlePinSubmit}
                disabled={pin.length !== 4 || isProcessing}
              >
                <Text style={styles.confirmButtonText}>
                  {isProcessing ? 'Processing...' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Success Dialog */}
      {showSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons
                name="checkmark"
                size={32}
                color={theme.colors.palette.neutral100}
              />
            </View>

            <Text style={styles.successTitle}>Transfer Successful!</Text>
            <Text style={styles.successMessage}>
              {transferResult &&
              transferResult.fromAccountName &&
              transferResult.toAccountName
                ? `Successfully transferred $${transferResult.amount?.toFixed(2)} from ${transferResult.fromAccountName} to ${transferResult.toAccountName}`
                : 'Your transfer has been completed successfully.'}
            </Text>

            <TouchableOpacity
              style={styles.successButton}
              onPress={handleSuccessClose}
            >
              <Text style={styles.successButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FancyAlert Component */}
      <FancyAlert
        visible={bankingStore.alertState.visible}
        title={bankingStore.alertState.title}
        message={bankingStore.alertState.message}
        preset={bankingStore.alertState.preset as any}
        onClose={() => bankingStore.hideAlert()}
        onConfirm={bankingStore.alertState.showConfirm ? () => {} : undefined}
        confirmText={bankingStore.alertState.confirmText}
        cancelText={bankingStore.alertState.cancelText}
      />
    </SafeAreaView>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },
    header: {
      paddingTop: 10,
      paddingHorizontal: 24,
      paddingBottom: 20,
    },
    backButton: {
      marginBottom: 16,
    },
    headerTitle: {
      color: theme.colors.palette.neutral800,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 40,
    },
    formCard: {
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
      color: theme.colors.palette.neutral800,
    },
    transferIconContainer: {
      alignItems: 'center',
      marginVertical: 16,
    },
    transferIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.palette.primary100,
    },

    // AccountDropdown component styles
    accountDropdownContainer: {
      position: 'relative',
      marginTop: 16,
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
    selectedAccountInfo: {
      flex: 1,
    },
    selectedAccountName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
      color: theme.colors.palette.neutral800,
    },
    selectedAccountDetails: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },
    dropdownPlaceholder: {
      fontSize: 16,
      color: theme.colors.palette.neutral500,
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 8,
      height: 150,
      overflow: 'hidden',
      zIndex: 1000,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    dropdownOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.overlay20,
    },
    accountInfo: {
      flex: 1,
    },
    accountName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
      color: theme.colors.palette.neutral800,
    },
    accountNumber: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },

    // Amount Styles
    amountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderWidth: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },
    currencySymbol: {
      fontSize: 28,
      fontWeight: '700',
      marginRight: 8,
      color: theme.colors.palette.primary400,
    },
    amountInput: {
      flex: 1,
      fontSize: 28,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
    },
    availableBalance: {
      fontSize: 14,
      marginTop: 8,
      textAlign: 'right',
      color: theme.colors.palette.neutral600,
    },

    // Summary Styles
    summaryCard: {
      backgroundColor: theme.colors.palette.primary100,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 16,
      textAlign: 'center',
      color: theme.colors.palette.primary500,
    },
    summaryContent: {
      gap: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryAmountRow: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.primary200,
    },
    summaryLabel: {
      fontSize: 15,
      color: theme.colors.palette.neutral600,
    },
    summaryValue: {
      fontSize: 15,
      fontWeight: '500',
      flex: 1,
      textAlign: 'right',
      color: theme.colors.palette.neutral800,
    },
    summaryAmount: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
    },

    // Button Styles
    transferButton: {
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 10,
    },
    transferButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 18,
      fontWeight: '700',
    },

    // PIN Modal Styles
    pinOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.palette.overlay50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pinContainer: {
      margin: 20,
      borderRadius: 20,
      padding: 24,
      width: width - 40,
      maxWidth: 400,
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
    },
    pinHeader: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      backgroundColor: theme.colors.palette.primary100,
    },
    pinTitle: {
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 8,
      color: theme.colors.palette.neutral800,
    },
    pinSubtitle: {
      fontSize: 15,
      textAlign: 'center',
      marginBottom: 32,
      lineHeight: 22,
      color: theme.colors.palette.neutral600,
    },
    pinInputContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 32,
      paddingHorizontal: 10,
    },
    pinInput: {
      width: 50,
      height: 60,
      borderWidth: 1,
      borderRadius: 8,
      marginHorizontal: 5,
      textAlign: 'center',
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
    },
    pinButtons: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    cancelButton: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
      backgroundColor: 'transparent',
      paddingVertical: 14,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
    },
    confirmButton: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: theme.colors.palette.primary500,
      paddingVertical: 14,
      alignItems: 'center',
    },
    confirmButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },

    // Success Modal Styles
    successOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.palette.overlay50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    successContainer: {
      margin: 20,
      borderRadius: 20,
      padding: 32,
      width: width - 40,
      maxWidth: 400,
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      backgroundColor: theme.colors.palette.success400,
    },
    successTitle: {
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 12,
      color: theme.colors.palette.neutral800,
    },
    successMessage: {
      fontSize: 15,
      textAlign: 'center',
      marginBottom: 32,
      lineHeight: 22,
      color: theme.colors.palette.neutral600,
    },
    successButton: {
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 32,
      minWidth: 120,
      alignItems: 'center',
    },
    successButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
  })

export default TransferScreen
