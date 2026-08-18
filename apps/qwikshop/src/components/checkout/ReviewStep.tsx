import React, { useMemo } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '@/components'
import { MaterialIcons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Instance } from 'mobx-state-tree'
import { Address, PaymentMethod } from '@/models/UserStore'
import { IPromoCode } from '@/models/PromoStore'

interface ReviewStepProps {
  selectedAddress: Instance<typeof Address> | null
  selectedPaymentMethod: Instance<typeof PaymentMethod> | null
  cartItems: any[]
  cartSubtotal: number
  cartSavings: number
  cartTax: number
  promoDiscount: number
  appliedPromo: IPromoCode | null
  couponCode: string
  onStepPress: (step: number) => void
  onShowPromoSheet: () => void
  onRemovePromo: () => void
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  selectedAddress,
  selectedPaymentMethod,
  cartItems,
  cartSubtotal,
  cartSavings,
  cartTax,
  promoDiscount,
  appliedPromo,
  couponCode,
  onStepPress,
  onShowPromoSheet,
  onRemovePromo,
}) => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.stepContent}>
      <View style={styles.sectionHeader}>
        <MaterialIcons
          name="receipt-long"
          size={24}
          color={theme.colors.palette.accent500}
        />
        <Text style={styles.sectionTitle}>Review Order</Text>
      </View>

      {/* Address Review */}
      <View style={styles.reviewCard}>
        <LinearGradient
          colors={[
            theme.colors.palette.neutral100,
            theme.colors.card || theme.colors.palette.neutral100,
          ]}
          style={styles.reviewCardGradient}
        >
          <View style={styles.reviewHeader}>
            <View style={styles.reviewTitleRow}>
              <MaterialIcons
                name="location-on"
                size={20}
                color={theme.colors.palette.primary500}
              />
              <Text style={styles.reviewTitle}>Delivery Address</Text>
            </View>
            <TouchableOpacity onPress={() => onStepPress(1)}>
              <MaterialIcons
                name="edit"
                size={20}
                color={theme.colors.palette.accent500}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.reviewContent}>
            <Text style={styles.reviewText}>{selectedAddress?.fullName}</Text>
            <Text style={styles.reviewSubtext}>
              {selectedAddress?.street}, {selectedAddress?.city}
            </Text>
            <Text style={styles.reviewSubtext}>
              {selectedAddress?.state}, {selectedAddress?.pincode}
            </Text>
            <Text style={styles.reviewSubtext}>{selectedAddress?.phone}</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Payment Review */}
      <View style={styles.reviewCard}>
        <LinearGradient
          colors={[
            theme.colors.palette.neutral100,
            theme.colors.card || theme.colors.palette.neutral100,
          ]}
          style={styles.reviewCardGradient}
        >
          <View style={styles.reviewHeader}>
            <View style={styles.reviewTitleRow}>
              <MaterialIcons
                name="payment"
                size={20}
                color={theme.colors.palette.primary500}
              />
              <Text style={styles.reviewTitle}>Payment Method</Text>
            </View>
            <TouchableOpacity onPress={() => onStepPress(2)}>
              <MaterialIcons
                name="edit"
                size={20}
                color={theme.colors.palette.accent500}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.reviewContent}>
            <Text style={styles.reviewText}>
              {selectedPaymentMethod?.cardType.toUpperCase()} ••••{' '}
              {selectedPaymentMethod?.cardNumber?.slice(-4)}
            </Text>
            <Text style={styles.reviewSubtext}>
              {selectedPaymentMethod?.nameOnCard}
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Order Summary */}
      <View style={styles.summaryCard}>
        <LinearGradient
          colors={[
            theme.colors.palette.neutral100,
            theme.colors.card || theme.colors.palette.neutral100,
          ]}
          style={styles.summaryCardGradient}
        >
          <View style={styles.summaryHeader}>
            <MaterialIcons
              name="receipt"
              size={20}
              color={theme.colors.palette.primary500}
            />
            <Text style={styles.summaryTitle}>Order Summary</Text>
          </View>

          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Items ({cartItems.length})
              </Text>
              <Text style={styles.summaryValue}>
                ${cartSubtotal.toFixed(2)}
              </Text>
            </View>

            {cartSavings > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.savingsText]}>
                  Savings
                </Text>
                <Text style={[styles.summaryValue, styles.savingsText]}>
                  -${cartSavings.toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={[styles.summaryValue, styles.freeText]}>FREE</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>${cartTax.toFixed(2)}</Text>
            </View>

            {/* Promo Code Section */}
            <View style={styles.promoSection}>
              <TouchableOpacity
                style={styles.promoButton}
                onPress={onShowPromoSheet}
              >
                <LinearGradient
                  colors={[
                    theme.colors.palette.secondary200,
                    theme.colors.palette.secondary300,
                  ]}
                  style={styles.promoButtonGradient}
                >
                  <MaterialIcons
                    name="local-offer"
                    size={20}
                    color={theme.colors.palette.secondary600}
                  />
                  <Text style={styles.promoButtonText}>
                    {appliedPromo ? 'Change Promo' : 'Apply Promo Code'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {appliedPromo && (
                <View style={styles.appliedPromo}>
                  <LinearGradient
                    colors={[
                      theme.colors.palette.success100,
                      theme.colors.palette.success200,
                    ]}
                    style={styles.appliedPromoGradient}
                  >
                    <Text style={styles.appliedPromoCode}>
                      {appliedPromo.code}
                    </Text>
                    <TouchableOpacity onPress={onRemovePromo}>
                      <MaterialIcons
                        name="close"
                        size={18}
                        color={theme.colors.palette.error500}
                      />
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              )}
            </View>

            {promoDiscount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.savingsText]}>
                  Promo: {couponCode}
                </Text>
                <Text style={[styles.summaryValue, styles.savingsText]}>
                  -${promoDiscount.toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.summaryDivider} />

            <View style={styles.summaryTotal}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                ${(cartSubtotal - promoDiscount + cartTax).toFixed(2)}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
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
    reviewCard: {
      borderRadius: 16,
      marginBottom: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    reviewCardGradient: {
      borderRadius: 16,
      padding: spacing.md,
    },
    reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    reviewTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    reviewTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    reviewContent: {
      gap: 4,
    },
    reviewText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    reviewSubtext: {
      fontSize: 14,
      color: theme.colors.textDim,
      lineHeight: 20,
    },
    summaryCard: {
      borderRadius: 16,
      marginBottom: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    summaryCardGradient: {
      borderRadius: 16,
      padding: spacing.md,
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    summaryContent: {
      gap: spacing.sm,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 14,
      color: theme.colors.textDim,
      fontWeight: '500',
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    savingsText: {
      color: theme.colors.palette.success500,
    },
    freeText: {
      color: theme.colors.palette.success500,
      fontWeight: '700',
    },
    summaryDivider: {
      height: 1,
      backgroundColor: theme.colors.palette.neutral300,
      marginVertical: spacing.sm,
    },
    summaryTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    totalValue: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.accent500,
    },
    promoSection: {
      marginVertical: spacing.sm,
    },
    promoButton: {
      borderRadius: 12,
      marginBottom: spacing.sm,
    },
    promoButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      borderRadius: 12,
      gap: spacing.sm,
    },
    promoButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.secondary600,
    },
    appliedPromo: {
      borderRadius: 12,
    },
    appliedPromoGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.sm,
      borderRadius: 12,
    },
    appliedPromoCode: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.success600,
    },
  })
