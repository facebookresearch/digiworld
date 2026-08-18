import React, { useEffect, useMemo } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { Text, type Theme } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { Glassmorphic } from './Glassmorphic'
import { useAppTheme } from '@andojo/shared-theme'

interface PaymentFormProps {
  amount: number
  onPayment: (cardNumber: string) => Promise<void>
  isLoading?: boolean
  availableCards?: {
    id: number
    cardNumber: string
    lastFourDigits: string
  }[]
}

export const PaymentForm = observer(
  ({
    amount,
    onPayment,
    isLoading = false,
    availableCards = [],
  }: PaymentFormProps) => {
    const { theme } = useAppTheme()
    const styles = useMemo(() => createStyles(theme), [theme])
    const { uiStore } = useStores()

    // Initialize selected card when availableCards change
    useEffect(() => {
      if (availableCards.length > 0 && !uiStore.paymentForm.selectedCardId) {
        uiStore.setPaymentFormSelectedCardId(availableCards[0].id)
      }
    }, [availableCards, uiStore])

    const formatPrice = (price: number) => {
      return `$${price.toFixed(2)}`
    }

    const handlePayment = async () => {
      if (availableCards.length === 0) {
        uiStore.setPaymentFormError(
          'No payment methods available. Please add a payment method first.',
        )
        console.error('Buy Now: No payment methods available')
        return
      }

      if (!uiStore.paymentForm.selectedCardId) {
        uiStore.setPaymentFormError('Please select a payment method')
        console.error('Buy Now: No card selected')
        return
      }

      const selectedCard = availableCards.find(
        c => c.id === uiStore.paymentForm.selectedCardId,
      )
      if (!selectedCard) {
        uiStore.setPaymentFormError('Invalid card selected')
        console.error(
          'Buy Now: Selected card not found',
          uiStore.paymentForm.selectedCardId,
        )
        return
      }

      try {
        await onPayment(selectedCard.cardNumber)
        uiStore.setPaymentFormError(null)
      } catch (err: any) {
        console.error('Buy Now: Payment failed', err)
        uiStore.setPaymentFormError(err.message || 'Payment failed')
      }
    }

    return (
      <Glassmorphic
        borderRadius={26}
        padding={20}
        intensity={Platform.OS === 'ios' ? 75 : 90}
        backgroundColor={
          Platform.OS === 'ios'
            ? theme.colors.palette.secondary100
            : theme.colors.palette.neutral100
        }
        borderColor={theme.colors.palette.neutral300}
        borderWidth={1}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Payment Details</Text>
          <Text style={styles.amount}>{formatPrice(amount)}</Text>
        </View>

        {availableCards.length > 0 ? (
          <View style={styles.cardsSection}>
            <Text style={styles.sectionLabel}>Select Payment Method</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {availableCards.map(card => (
                <TouchableOpacity
                  key={card.id}
                  onPress={() => uiStore.setPaymentFormSelectedCardId(card.id)}
                  style={[
                    styles.cardOption,
                    uiStore.paymentForm.selectedCardId === card.id &&
                      styles.cardOptionSelected,
                  ]}
                  disabled={isLoading}
                >
                  <Ionicons
                    name="card-outline"
                    size={24}
                    color={
                      uiStore.paymentForm.selectedCardId === card.id
                        ? theme.colors.palette.primary500
                        : theme.colors.palette.neutral500
                    }
                  />
                  <Text
                    style={
                      uiStore.paymentForm.selectedCardId === card.id
                        ? { ...styles.cardText, ...styles.cardTextSelected }
                        : styles.cardText
                    }
                  >
                    •••• {card.lastFourDigits}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.cardsSection}>
            <Text style={styles.errorText}>
              No payment methods available. Please add a payment method in your
              profile.
            </Text>
          </View>
        )}

        {uiStore.paymentForm.error && (
          <Text style={styles.errorText}>{uiStore.paymentForm.error}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.payButton,
            (isLoading || availableCards.length === 0) &&
              styles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={isLoading || availableCards.length === 0}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <Text style={styles.payButtonText}>Processing...</Text>
          ) : (
            <>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={theme.colors.palette.neutral100}
              />
              <Text style={styles.payButtonText}>
                Pay {formatPrice(amount)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </Glassmorphic>
    )
  },
)

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginVertical: 16,
    },
    header: {
      marginBottom: 20,
      alignItems: 'center',
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 8,
    },
    amount: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
    },
    cardsSection: {
      marginBottom: 20,
    },
    sectionLabel: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
      marginBottom: 12,
    },
    cardOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: theme.colors.palette.neutral200,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
      marginRight: 12,
      gap: 8,
    },
    cardOptionSelected: {
      backgroundColor: theme.colors.palette.primary100,
      borderColor: theme.colors.palette.primary500,
    },
    cardText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral600,
    },
    cardTextSelected: {
      color: theme.colors.palette.primary500,
    },
    inputContainer: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.palette.primary100,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary400,
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.palette.angry500,
      marginTop: 6,
    },
    payButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.palette.primary500,
      paddingVertical: 16,
      borderRadius: 16,
      gap: 8,
    },
    payButtonDisabled: {
      opacity: 0.6,
    },
    payButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
  })
