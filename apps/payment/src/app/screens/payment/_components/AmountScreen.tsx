import { Button, Card, Text, TextField } from '@/components'
import { colors } from '@andojo/shared-theme'
import { styles } from '@/utils/payment/styles'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { memo } from 'react'
import { ScrollView, View } from 'react-native'

interface AmountScreenProps {
  amount: string

  onAmountChange: (text: string) => void

  onQuickAmountPress: (value: string) => void
  onContinue: () => void
  type?: 'deposit' | 'withdrawal'
}

// Split quick amounts into two rows
const QUICK_AMOUNTS_ROW_1 = [50, 100, 200, 500]
const QUICK_AMOUNTS_ROW_2 = [1000, 2000, 5000, 10000]

interface QuickAmountButtonProps {
  amount: number
  onPress: (value: string) => void
}
const QuickAmountButton: React.FC<QuickAmountButtonProps> = ({
  amount,
  onPress,
}) => (
  <Button
    text={amount >= 1000 ? `$${amount / 1000}K` : `$${amount}`}
    preset="reversed"
    style={styles.quickAmountButton}
    textStyle={styles.quickAmountText}
    onPress={() => onPress(amount.toString())}
  />
)
const MemoizedQuickAmountButton = memo(QuickAmountButton)

interface AmountInputProps {
  amount: string
  onAmountChange: (text: string) => void
}
const AmountInput: React.FC<AmountInputProps> = ({
  amount,
  onAmountChange,
}) => (
  <Card
    preset="reversed"
    style={styles.amountCard}
    verticalAlignment="center"
    ContentComponent={
      <View style={styles.amountInputContainer}>
        <View style={styles.amountInputWrapper}>
          <View style={styles.amountRow}>
            <View style={styles.currencyContainer}>
              <Text
                text="$"
                style={[
                  styles.currencySymbol,
                  !amount && styles.currencySymbolPlaceholder,
                ]}
              />
            </View>
            <TextField
              value={amount}
              onChangeText={onAmountChange}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.palette.neutral400}
              maxLength={10}
              style={{
                ...styles.amountInput,
                ...(!amount && styles.amountInputPlaceholder),
              }}
              autoFocus
              selectionColor={colors.palette.primary400}
              containerStyle={styles.textFieldContainer}
            />
          </View>
          <View
            style={[
              styles.amountUnderline,
              amount && styles.amountUnderlineActive,
            ]}
          />
        </View>
      </View>
    }
  />
)
const MemoizedAmountInput = memo(AmountInput)

interface QuickAmountsRowProps {
  amounts: number[]
  onPress: (value: string) => void
}
const QuickAmountsRow: React.FC<QuickAmountsRowProps> = ({
  amounts,
  onPress,
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.quickAmountsRow}
  >
    {amounts.map(quickAmount => (
      <MemoizedQuickAmountButton
        key={quickAmount}
        amount={quickAmount}
        onPress={onPress}
      />
    ))}
  </ScrollView>
)
const MemoizedQuickAmountsRow = memo(QuickAmountsRow)

const InfoCard = memo(() => (
  <View style={styles.infoCard}>
    <Ionicons
      name="information-circle-outline"
      size={20}
      color={colors.palette.neutral500}
      style={styles.infoIcon}
    />
    <Text
      text="Funds will be available immediately in your wallet after deposit."
      size="xs"
      style={styles.infoText}
    />
  </View>
))

export const AmountScreen = memo<AmountScreenProps>(
  ({
    amount,
    onAmountChange,
    onQuickAmountPress,
    onContinue,
    type = 'deposit',
  }) => {
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
      <View style={styles.contentContainer}>
        <Text
          text={
            type === 'withdrawal'
              ? 'How much would you like to withdraw?'
              : 'How much would you like to add?'
          }
          preset="heading"
          style={styles.title}
        />

        <MemoizedAmountInput amount={amount} onAmountChange={onAmountChange} />

        <View style={styles.quickAmountsContainer}>
          <MemoizedQuickAmountsRow
            amounts={QUICK_AMOUNTS_ROW_1}
            onPress={onQuickAmountPress}
          />
          <MemoizedQuickAmountsRow
            amounts={QUICK_AMOUNTS_ROW_2}
            onPress={onQuickAmountPress}
          />
        </View>

        <InfoCard />

        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.continueButtonGradient,
            (!amount || parseFloat(amount) <= 0) && styles.disabledButton,
          ]}
        >
          <Button
            text="Continue"
            preset="filled"
            style={styles.continueButton}
            textStyle={styles.continueButtonText}
            disabled={!amount || parseFloat(amount) <= 0}
            onPress={onContinue}
            RightAccessory={props => (
              <View style={styles.continueButtonIcon}>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={colors.palette.neutral100}
                  style={props.style}
                />
              </View>
            )}
          />
        </LinearGradient>
      </View>
    )
  },
)

export default AmountScreen
