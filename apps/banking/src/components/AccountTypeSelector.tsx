import React from 'react'
import { observer } from 'mobx-react-lite'
import { TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme, Text } from '@andojo/shared-theme'
import { Instance } from 'mobx-state-tree'
import { BankingStore } from '../models/BankingStore'
interface AccountType {
  id: number
  code: string
  description: string | null
  canCreate: boolean
  initialDeposit: number
  currentCount: number
  maxAllowed: number
  isAllowedForCurrentTier: boolean
  requiredTier: string | null | undefined
  requiredTierName: string | null | undefined
}

interface AccountTypeSelectorProps {
  bankingStore: Instance<typeof BankingStore>
  styles: Record<string, any>
}

const AccountTypeSelector: React.FC<AccountTypeSelectorProps> = observer(
  ({ bankingStore, styles }) => {
    const { theme } = useAppTheme()
    const [availableTypes, setAvailableTypes] = React.useState<AccountType[]>(
      [],
    )
    const [tierInfo, setTierInfo] = React.useState<{ tierName: string } | null>(
      null,
    )
    const [nextTierInfo, setNextTierInfo] = React.useState<{
      tierName: string | null
      isHighestTier: boolean
    } | null>(null)

    React.useEffect(() => {
      const loadAccountTypes = async () => {
        try {
          const types = await bankingStore.getAllAccountTypesWithStatus()
          const config = await bankingStore.getTierAccountConfig()
          const nextTier = await bankingStore.getNextTierInfo()
          setAvailableTypes(types)
          setTierInfo(config)
          setNextTierInfo(nextTier)
        } catch (error) {
          console.error('Error loading account types:', error)
        }
      }

      loadAccountTypes()
    }, [bankingStore])

    const formatAccountTypeName = (code: string) => {
      return code.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount)
    }

    const getUpgradeMessage = (type: AccountType) => {
      if (type.isAllowedForCurrentTier) {
        // Account type is allowed for current tier but limit reached
        if (nextTierInfo?.isHighestTier) {
          return 'Please contact bank to create more accounts'
        } else if (nextTierInfo?.tierName) {
          return `Upgrade to ${nextTierInfo.tierName} to create more accounts`
        }
        return 'Account limit reached'
      } else {
        // Account type not allowed for current tier - use the actual tier name from database
        if (type.requiredTierName) {
          return `Upgrade to ${type.requiredTierName} to access this account type`
        }
        return 'Not available for your tier'
      }
    }

    return (
      <View style={styles.accountTypesSection}>
        <Text
          size="large"
          style={[styles.inputLabel, { color: theme.colors.text }] as any}
        >
          Account Type
          {tierInfo && (
            <Text
              style={[styles.tierInfo, { color: theme.colors.textDim }] as any}
            >
              {' '}
              ({tierInfo.tierName} Tier)
            </Text>
          )}
        </Text>

        {availableTypes.map(type => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.accountTypeOption,
              {
                backgroundColor:
                  bankingStore.accountCreationForm.selectedAccountType ===
                  type.id
                    ? theme.colors.palette.primary100
                    : theme.colors.palette.neutral300,
                borderColor:
                  bankingStore.accountCreationForm.selectedAccountType ===
                  type.id
                    ? theme.colors.palette.primary400
                    : theme.colors.border,
                opacity: !type.isAllowedForCurrentTier ? 0.6 : 1,
              },
            ]}
            onPress={() => {
              if (
                type.canCreate &&
                !bankingStore.accountCreationForm.isCreating
              ) {
                bankingStore.setSelectedAccountType(type.id)
              }
            }}
            disabled={
              !type.canCreate || bankingStore.accountCreationForm.isCreating
            }
          >
            <View style={styles.accountTypeHeader}>
              <View style={styles.accountTypeInfo}>
                <Text
                  style={
                    [
                      styles.accountTypeName,
                      {
                        color:
                          bankingStore.accountCreationForm
                            .selectedAccountType === type.id
                            ? theme.colors.palette.primary600
                            : theme.colors.text,
                      },
                    ] as any
                  }
                >
                  {formatAccountTypeName(type.code)}
                </Text>
                <Text
                  style={
                    [
                      styles.accountTypeDescription,
                      { color: theme.colors.textDim },
                    ] as any
                  }
                >
                  {type.description ||
                    `${formatAccountTypeName(type.code)} account`}
                </Text>
              </View>

              {bankingStore.accountCreationForm.selectedAccountType ===
                type.id &&
                type.canCreate && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={theme.colors.palette.primary400}
                  />
                )}

              {!type.isAllowedForCurrentTier && (
                <Ionicons
                  name="lock-closed"
                  size={24}
                  color={theme.colors.palette.angry400}
                />
              )}
            </View>

            <View style={styles.accountTypeDetails}>
              <View style={styles.accountTypeDetailRow}>
                <Text
                  style={
                    [styles.detailLabel, { color: theme.colors.textDim }] as any
                  }
                >
                  Initial Deposit:
                </Text>
                <Text
                  style={
                    [styles.detailValue, { color: theme.colors.text }] as any
                  }
                >
                  {formatCurrency(type.initialDeposit)}
                </Text>
              </View>

              {type.isAllowedForCurrentTier && (
                <View style={styles.accountTypeDetailRow}>
                  <Text
                    style={
                      [
                        styles.detailLabel,
                        { color: theme.colors.textDim },
                      ] as any
                    }
                  >
                    Accounts:
                  </Text>
                  <Text
                    style={
                      [
                        styles.detailValue,
                        {
                          color: type.canCreate
                            ? theme.colors.palette.success400
                            : theme.colors.palette.angry400,
                        },
                      ] as any
                    }
                  >
                    {`${type.currentCount}/${type.maxAllowed}${!type.canCreate ? ' (Limit Reached)' : ''}`}
                  </Text>
                </View>
              )}

              {!type.canCreate && (
                <View style={styles.accountTypeDetailRow}>
                  <Text
                    style={
                      [
                        styles.detailLabel,
                        {
                          color: theme.colors.palette.angry400,
                          fontStyle: 'italic',
                        },
                      ] as any
                    }
                  >
                    {getUpgradeMessage(type)}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {availableTypes.length === 0 && (
          <View style={styles.noAccountTypes}>
            <Text
              style={
                [
                  styles.noAccountTypesText,
                  { color: theme.colors.textDim },
                ] as any
              }
            >
              Loading account types...
            </Text>
          </View>
        )}
      </View>
    )
  },
)

export default AccountTypeSelector
