import React, { useRef, useEffect } from 'react'
import {
  Modal,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme, Text } from '@andojo/shared-theme'
import { BankingStore } from '../models/BankingStore'
import { Instance } from 'mobx-state-tree'
import AccountTypeSelector from '@/components/AccountTypeSelector'
import { observer } from 'mobx-react-lite'

interface AccountCreationModalProps {
  bankingStore: Instance<typeof BankingStore>
  handleCreateAccount: () => void
  styles: Record<string, any>
}

const AccountCreationModal: React.FC<AccountCreationModalProps> = ({
  bankingStore,
  handleCreateAccount,
  styles,
}) => {
  const { theme } = useAppTheme()
  const accountNameRef = useRef<TextInput>(null)

  const isAccountNameFocused =
    bankingStore.accountCreationForm.currentFocused === 'accountName'

  // Restore focus when modal opens (similar to login.tsx)
  useEffect(() => {
    if (bankingStore.showAccountBottomSheet) {
      const focusedElement = bankingStore.accountCreationForm.currentFocused
      // Auto-focus account name field when modal opens, or restore previous focus
      if (focusedElement === 'accountName' || !focusedElement) {
        // Delay to ensure modal is fully rendered and TextInput is ready
        const timeoutId = setTimeout(() => {
          accountNameRef.current?.focus()
          // Set focus state if it wasn't already set
          if (!focusedElement) {
            bankingStore.setAccountCreationFocused('accountName')
          }
        }, 500)
        return () => clearTimeout(timeoutId)
      }
    }
    return undefined
  }, [bankingStore.showAccountBottomSheet])

  // Handle modal onShow event for more reliable focus
  const handleModalShow = () => {
    const focusedElement = bankingStore.accountCreationForm.currentFocused
    // Auto-focus account name field when modal opens
    if (focusedElement === 'accountName' || !focusedElement) {
      setTimeout(() => {
        accountNameRef.current?.focus()
        if (!focusedElement) {
          bankingStore.setAccountCreationFocused('accountName')
        }
      }, 300)
    }
  }

  return (
    <Modal
      visible={bankingStore.showAccountBottomSheet}
      transparent={true}
      animationType="slide"
      onShow={handleModalShow}
      onRequestClose={() => {
        bankingStore.resetAccountCreationForm()
        bankingStore.setShowAccountBottomSheet(false)
      }}
    >
      <View style={styles.bottomSheetOverlay}>
        <View style={styles.bottomSheetContainer}>
          <View
            style={[
              styles.bottomSheet,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <View style={styles.bottomSheetHeader}>
              <View style={styles.bottomSheetHandle} />
              <Text
                preset="subheading"
                style={
                  [styles.bottomSheetTitle, { color: theme.colors.text }] as any
                }
              >
                Open New Account
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  bankingStore.resetAccountCreationForm()
                  bankingStore.setShowAccountBottomSheet(false)
                }}
              >
                <Ionicons name="close" size={24} color={theme.colors.textDim} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.bottomSheetContent}>
              <View style={styles.inputGroup}>
                <Text
                  size="large"
                  style={
                    [styles.inputLabel, { color: theme.colors.text }] as any
                  }
                >
                  Account Names
                </Text>
                <TextInput
                  ref={accountNameRef}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                      borderColor: isAccountNameFocused
                        ? theme.colors.palette.primary500
                        : theme.colors.border,
                    },
                    isAccountNameFocused && styles.textInputFocused,
                  ]}
                  value={bankingStore.accountCreationForm.accountName}
                  onChangeText={bankingStore.setAccountName}
                  placeholder="Enter account name"
                  placeholderTextColor={theme.colors.textDim}
                  editable={!bankingStore.accountCreationForm.isCreating}
                  onFocus={() =>
                    bankingStore.setAccountCreationFocused('accountName')
                  }
                  onBlur={() => bankingStore.setAccountCreationFocused(null)}
                />
              </View>

              <AccountTypeSelector
                bankingStore={bankingStore}
                styles={styles}
              />

              <View style={styles.switchGroup}>
                <View style={styles.switchLabelContainer}>
                  <Text
                    style={
                      [styles.switchLabel, { color: theme.colors.text }] as any
                    }
                  >
                    Set as Primary Account
                  </Text>
                  <Text
                    style={
                      [
                        styles.switchDescription,
                        { color: theme.colors.textDim },
                      ] as any
                    }
                  >
                    Primary accounts are used for default transactions
                  </Text>
                </View>
                <Switch
                  value={bankingStore.accountCreationForm.isPrimary}
                  onValueChange={bankingStore.setIsPrimary}
                  disabled={bankingStore.accountCreationForm.isCreating}
                  trackColor={{
                    false: theme.colors.palette.neutral400,
                    true: theme.colors.palette.primary400,
                  }}
                  thumbColor={
                    bankingStore.accountCreationForm.isPrimary
                      ? theme.colors.palette.primary500
                      : theme.colors.palette.neutral500
                  }
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.createAccountButton,
                  {
                    backgroundColor: theme.colors.palette.primary400,
                    opacity:
                      !bankingStore.accountCreationForm.accountName.trim() ||
                      !bankingStore.accountCreationForm.selectedAccountType ||
                      bankingStore.accountCreationForm.isCreating
                        ? 0.6
                        : 1,
                  },
                ]}
                onPress={handleCreateAccount}
                disabled={
                  !bankingStore.accountCreationForm.accountName.trim() ||
                  !bankingStore.accountCreationForm.selectedAccountType ||
                  bankingStore.accountCreationForm.isCreating
                }
                activeOpacity={0.8}
              >
                <Text
                  preset="default"
                  size="large"
                  style={styles.createAccountButtonText as any}
                >
                  {bankingStore.accountCreationForm.isCreating
                    ? 'Creating Account...'
                    : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default observer(AccountCreationModal)
