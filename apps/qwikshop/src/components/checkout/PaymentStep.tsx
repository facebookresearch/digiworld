import React, { useMemo } from 'react'
import { View, Pressable, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '@/components'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Instance } from 'mobx-state-tree'
import { PaymentMethod } from '@/models/UserStore'

interface PaymentStepProps {
  paymentMethods: Instance<typeof PaymentMethod>[]
  selectedPaymentMethod: Instance<typeof PaymentMethod> | null
  onPaymentSelect: (method: Instance<typeof PaymentMethod>) => void
  onAddPayment: () => void
}

export const PaymentStep: React.FC<PaymentStepProps> = ({
  paymentMethods,
  selectedPaymentMethod,
  onPaymentSelect,
  onAddPayment,
}) => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.stepContent}>
      <View style={styles.sectionHeader}>
        <MaterialIcons
          name="payment"
          size={24}
          color={theme.colors.palette.accent500}
        />
        <Text style={styles.sectionTitle}>Payment Method</Text>
      </View>

      {paymentMethods.map(method => (
        <Pressable
          key={method.id}
          style={[
            styles.modernCard,
            selectedPaymentMethod?.id === method.id && styles.selectedCard,
          ]}
          onPress={() => onPaymentSelect(method)}
        >
          <LinearGradient
            colors={
              selectedPaymentMethod?.id === method.id
                ? [
                    theme.colors.palette.accent100,
                    theme.colors.palette.accent200,
                  ]
                : [
                    theme.colors.palette.neutral100,
                    theme.colors.card || theme.colors.palette.neutral100,
                  ]
            }
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <View style={styles.paymentIconContainer}>
                <LinearGradient
                  colors={[
                    theme.colors.palette.secondary500,
                    theme.colors.palette.secondary600,
                  ]}
                  style={styles.paymentIcon}
                >
                  <MaterialIcons
                    name={
                      method.cardType === 'visa' ? 'credit-card' : 'payment'
                    }
                    size={20}
                    color={theme.colors.palette.neutral900}
                  />
                </LinearGradient>
                <View style={styles.paymentInfo}>
                  <Text style={styles.cardNumber}>
                    •••• •••• •••• {method.cardNumber?.slice(-4) || ''}
                  </Text>
                  <Text style={styles.cardName}>{method.nameOnCard}</Text>
                </View>
              </View>
              {selectedPaymentMethod?.id === method.id && (
                <View style={styles.selectedIcon}>
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={theme.colors.palette.accent500}
                  />
                </View>
              )}
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.cardExpiry}>
                Expires {method.expiryMonth}/{method.expiryYear}
              </Text>
              {method.isDefault && (
                <LinearGradient
                  colors={[
                    theme.colors.palette.primary500,
                    theme.colors.palette.primary600,
                  ]}
                  style={styles.defaultBadge}
                >
                  <Text style={styles.defaultText}>Default</Text>
                </LinearGradient>
              )}
            </View>
          </LinearGradient>
        </Pressable>
      ))}

      {paymentMethods.length === 0 && (
        <TouchableOpacity style={styles.addButton} onPress={onAddPayment}>
          <LinearGradient
            colors={[
              theme.colors.palette.primary500,
              theme.colors.palette.primary600,
            ]}
            style={styles.addButtonGradient}
          >
            <MaterialIcons
              name="add"
              size={24}
              color={theme.colors.palette.neutral900}
            />
            <Text style={styles.addButtonText}>Add New Payment Method</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    stepContent: {
      flex: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.palette.neutral800,
      letterSpacing: 0.3,
    },
    modernCard: {
      borderRadius: 20,
      marginBottom: spacing.lg,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    cardGradient: {
      borderRadius: 20,
      padding: spacing.lg,
    },
    selectedCard: {
      shadowColor: theme.colors.palette.accent500,
      shadowOpacity: 0.25,
      elevation: 8,
      borderColor: theme.colors.palette.accent300,
      borderWidth: 2,
      transform: [{ scale: 1.02 }],
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    paymentIconContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    paymentIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    paymentInfo: {
      flex: 1,
    },
    cardNumber: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    cardName: {
      fontSize: 14,
      color: theme.colors.textDim,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    cardExpiry: {
      fontSize: 12,
      color: theme.colors.textDim,
      fontWeight: '500',
    },
    selectedIcon: {
      marginLeft: spacing.sm,
    },
    defaultBadge: {
      borderRadius: 12,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    defaultText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    addButton: {
      borderRadius: 20,
      marginBottom: spacing.lg,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    addButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      borderRadius: 20,
      gap: spacing.sm,
      minHeight: 56,
    },
    addButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      letterSpacing: 0.3,
    },
  })
