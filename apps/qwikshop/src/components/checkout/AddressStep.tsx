import React, { useMemo } from 'react'
import { View, Pressable, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '@/components'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Instance } from 'mobx-state-tree'
import { Address } from '@/models/UserStore'

interface AddressStepProps {
  addresses: Instance<typeof Address>[]
  selectedAddress: Instance<typeof Address> | null
  onAddressSelect: (address: Instance<typeof Address>) => void
  onAddAddress: () => void
}

export const AddressStep: React.FC<AddressStepProps> = ({
  addresses,
  selectedAddress,
  onAddressSelect,
  onAddAddress,
}) => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.stepContent}>
      <View style={styles.sectionHeader}>
        <MaterialIcons
          name="location-on"
          size={24}
          color={theme.colors.palette.accent500}
        />
        <Text style={styles.sectionTitle}>Delivery Address</Text>
      </View>

      {addresses.map(address => (
        <Pressable
          key={address.id}
          style={[
            styles.modernCard,
            selectedAddress?.id === address.id && styles.selectedCard,
          ]}
          onPress={() => onAddressSelect(address)}
        >
          <LinearGradient
            colors={
              selectedAddress?.id === address.id
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
              <View style={styles.cardTitleRow}>
                <Text style={styles.addressName}>{address.fullName}</Text>
                {address.isDefault && (
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
              {selectedAddress?.id === address.id && (
                <View style={styles.selectedIcon}>
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={theme.colors.palette.accent500}
                  />
                </View>
              )}
            </View>
            <Text style={styles.addressText}>
              {address.street}, {address.city}
            </Text>
            <Text style={styles.addressText}>
              {address.state}, {address.pincode}
            </Text>
            <Text style={styles.addressPhone}>{address.phone}</Text>
          </LinearGradient>
        </Pressable>
      ))}

      {addresses.length === 0 && (
        <TouchableOpacity style={styles.addButton} onPress={onAddAddress}>
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
            <Text style={styles.addButtonText}>Add New Address</Text>
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
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    selectedIcon: {
      marginLeft: spacing.sm,
    },
    addressName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    addressText: {
      fontSize: 14,
      color: theme.colors.textDim,
      marginBottom: 4,
      lineHeight: 20,
    },
    addressPhone: {
      fontSize: 14,
      color: theme.colors.palette.primary500,
      fontWeight: '600',
      marginTop: spacing.xs,
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
