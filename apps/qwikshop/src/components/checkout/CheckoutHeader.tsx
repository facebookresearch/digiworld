import React, { useMemo } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '@/components'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'

interface CheckoutHeaderProps {
  paddingTop: number
  cartItemCount: number
}

export const CheckoutHeader: React.FC<CheckoutHeaderProps> = ({
  cartItemCount,
}) => {
  const router = useRouter()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.headerContainer}>
      <View
        style={[
          styles.headerGradient,
          { backgroundColor: theme.colors.palette.primary500 },
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => router.back()}
          >
            <View style={styles.backButtonCircle}>
              <Ionicons
                name="arrow-back"
                size={20}
                color={theme.colors.palette.neutral900}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.headerTitleSection}>
            <Text style={styles.headerMainTitle}>QwikShop Checkout</Text>
            <View style={styles.securityRow}>
              <View style={styles.securityBadge}>
                <Ionicons
                  name="shield-checkmark"
                  size={14}
                  color={theme.colors.palette.success400}
                />
                <Text style={styles.securityText}>256-bit SSL</Text>
              </View>
              <View style={styles.trustBadge}>
                <Ionicons
                  name="lock-closed"
                  size={12}
                  color={theme.colors.palette.warning400}
                />
                <Text style={styles.trustText}>Secure</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRightSection}>
            <View style={styles.cartSummaryBadge}>
              <Text style={styles.cartItemCount}>{cartItemCount}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    headerContainer: {
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    headerGradient: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerBackButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backButtonCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleSection: {
      flex: 1,
      alignItems: 'center',
      marginHorizontal: spacing.md,
    },
    headerMainTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    securityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    securityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      gap: 4,
    },
    securityText: {
      fontSize: 11,
      color: theme.colors.palette.success300,
      fontWeight: '600',
    },
    trustBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(251, 191, 36, 0.2)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      gap: 3,
    },
    trustText: {
      fontSize: 10,
      color: theme.colors.palette.warning300,
      fontWeight: '600',
    },
    headerRightSection: {
      width: 44,
      alignItems: 'center',
    },
    cartSummaryBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.palette.accent500,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.palette.accent500,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    cartItemCount: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
  })
