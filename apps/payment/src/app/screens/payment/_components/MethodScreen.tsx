import { Button, Card, Text } from '@/components'
import { colors, metrics } from '@andojo/shared-theme'
import { styles as commonStyles } from '@/utils/payment/styles'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { memo } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native'

interface PaymentMethod {
  id: string
  name: string
  icon: keyof typeof Ionicons.glyphMap
  description: string
}

const DEPOSIT_METHODS: PaymentMethod[] = [
  {
    id: 'bank1',
    name: 'Bank Account 1',
    icon: 'business-outline',
    description: ' Add to your primary bank account',
  },
  {
    id: 'bank2',
    name: 'Bank Account 2',
    icon: 'business-outline',
    description: 'Add to your secondary bank account',
  },
  {
    id: 'card',
    name: 'Credit/Debit Card',
    icon: 'card-outline',
    description: 'Add money using your card',
  },
]

const WITHDRAWAL_METHODS: PaymentMethod[] = [
  {
    id: 'bank1',
    name: 'Bank Account 1',
    icon: 'business-outline',
    description: 'Withdraw to your primary bank account',
  },
  {
    id: 'bank2',
    name: 'Bank Account 2',
    icon: 'business-outline',
    description: 'Withdraw to your secondary bank account',
  },
]

interface MethodScreenProps {
  amount: string
  selectedMethod: string | null

  onMethodSelect: (methodId: string) => void
  onBack: () => void
  onContinue: () => void
  isLoading: boolean
  type?: 'deposit' | 'withdrawal'
}

interface PaymentMethodCardProps {
  method: PaymentMethod
  isSelected: boolean

  onSelect: (methodId: string) => void
  type?: 'deposit' | 'withdrawal'
}

interface TransactionSummaryProps {
  amount: string
}

interface SummaryRowProps {
  label: string
  value: string
  isTotal?: boolean
}

const PaymentMethodCard = memo<PaymentMethodCardProps>(
  ({ method, isSelected, onSelect, type = 'deposit' }) => {
    const gradientColors =
      type === 'deposit'
        ? ([colors.palette.primary400, colors.palette.primary500] as [
            string,
            string,
          ])
        : ([colors.palette.angry300, colors.palette.angry400] as [
            string,
            string,
          ])

    return (
      <Card
        key={method.id}
        preset="default"
        style={[
          commonStyles.methodCard,
          isSelected && commonStyles.selectedMethodCard,
        ]}
        onPress={() => onSelect(method.id)}
        LeftComponent={
          <LinearGradient
            colors={
              isSelected
                ? gradientColors
                : [colors.palette.neutral200, colors.palette.neutral300]
            }
            style={[
              commonStyles.methodIconContainer,
              isSelected && commonStyles.selectedMethodIconContainer,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name={method.icon}
              size={28}
              color={
                isSelected
                  ? colors.palette.neutral100
                  : colors.palette.neutral900
              }
            />
          </LinearGradient>
        }
        RightComponent={
          isSelected ? (
            <View style={commonStyles.checkmarkContainer}>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={colors.palette.neutral100}
              />
            </View>
          ) : undefined
        }
        heading={method.name}
        headingStyle={[
          commonStyles.methodName,
          isSelected && commonStyles.selectedMethodText,
        ]}
        content={method.description}
        contentStyle={[
          commonStyles.methodDescription,
          isSelected && commonStyles.selectedMethodText,
        ]}
      />
    )
  },
)

const TransactionSummary = memo<TransactionSummaryProps>(({ amount }) => (
  <LinearGradient
    colors={[colors.palette.neutral100, colors.palette.neutral200]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={commonStyles.summaryCard}
  >
    <Text text="Transaction Summary" style={commonStyles.summaryTitle} />

    <View style={commonStyles.summaryContent}>
      <SummaryRow label="Amount" value={`$${amount}`} />
      <SummaryRow label="Fee" value="$0.00" />
      <View style={commonStyles.divider} />
      <SummaryRow label="Total" value={`$${amount}`} isTotal />
    </View>
  </LinearGradient>
))

const SummaryRow = memo<SummaryRowProps>(({ label, value, isTotal }) => (
  <View style={commonStyles.summaryRow}>
    <Text
      text={label}
      style={[commonStyles.summaryLabel, isTotal && commonStyles.totalLabel]}
    />
    <Text
      text={value}
      weight={isTotal ? 'bold' : 'medium'}
      style={[commonStyles.summaryValue, isTotal && commonStyles.totalValue]}
    />
  </View>
))

export const MethodScreen = memo<MethodScreenProps>(
  ({
    amount,
    selectedMethod,
    onMethodSelect,
    onBack,
    onContinue,
    isLoading,
    type = 'deposit',
  }) => {
    const methods = type === 'withdrawal' ? WITHDRAWAL_METHODS : DEPOSIT_METHODS
    const gradientColors =
      type === 'deposit'
        ? ([colors.palette.primary400, colors.palette.primary500] as [
            string,
            string,
          ])
        : ([colors.palette.angry300, colors.palette.angry400] as [
            string,
            string,
          ])

    return (
      <View style={[commonStyles.container, styles.containerPadding]}>
        <View>
          <Text
            text={
              type === 'withdrawal'
                ? 'Select Withdrawal Method'
                : 'Select Payment Method'
            }
            preset="heading"
            style={commonStyles.title}
          />
        </View>

        <View style={commonStyles.contentContainer}>
          <View style={commonStyles.methodsContainer}>
            {methods.map(method => (
              <PaymentMethodCard
                key={method.id}
                method={method}
                isSelected={selectedMethod === method.id}
                onSelect={onMethodSelect}
                type={type}
              />
            ))}
          </View>

          <TransactionSummary amount={amount} />
        </View>

        <View style={styles.footerContainer}>
          <View style={styles.buttonWrapper}>
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.backButtonContainer}
            >
              <Button
                text="Back"
                preset="default"
                style={styles.backButton}
                textStyle={styles.backButtonText}
                onPress={onBack}
                LeftAccessory={props => (
                  <View style={styles.backIconContainer}>
                    <Ionicons
                      name="chevron-back"
                      size={24}
                      color={colors.palette.neutral900}
                      style={props.style}
                    />
                  </View>
                )}
              />
            </LinearGradient>

            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                commonStyles.continueButtonGradient,
                !selectedMethod && styles.disabledButton,
              ]}
            >
              <Button
                text="Continue"
                preset="filled"
                style={commonStyles.continueButton}
                textStyle={commonStyles.continueButtonText}
                disabled={!selectedMethod || isLoading}
                onPress={onContinue}
                RightAccessory={props =>
                  isLoading ? (
                    <ActivityIndicator
                      color={colors.palette.neutral100}
                      style={props.style}
                    />
                  ) : (
                    <View style={commonStyles.continueButtonIcon}>
                      <Ionicons
                        name="arrow-forward"
                        size={20}
                        color={colors.palette.neutral100}
                        style={props.style}
                      />
                    </View>
                  )
                }
              />
            </LinearGradient>
          </View>
        </View>
      </View>
    )
  },
)

const styles = StyleSheet.create({
  footerContainer: {
    paddingHorizontal: metrics.medium,
    backgroundColor: colors.background,
  } as ViewStyle,
  buttonWrapper: {
    flexDirection: 'row' as const,
    gap: metrics.medium,
    height: 56,
  } as ViewStyle,
  backButtonContainer: {
    flex: 0.3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.palette.neutral300,
    overflow: 'hidden',
    backgroundColor: colors.palette.neutral100,
  },
  backButton: {
    height: '100%',
    backgroundColor: 'transparent',
    paddingHorizontal: metrics.small,
  } as ViewStyle,
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.palette.neutral900,
  } as TextStyle,
  backIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: metrics.tiny,
  } as ViewStyle,
  containerPadding: {
    paddingTop: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
})

export default MethodScreen
