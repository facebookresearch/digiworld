import React, { useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { Text, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'

interface AddDeviceButtonProps {
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'floating'
  size?: 'small' | 'medium' | 'large'
  text?: string
}

export function AddDeviceButton({
  onPress,
  variant = 'primary',
  size = 'medium',
  text = 'Add Device',
}: AddDeviceButtonProps) {
  const { theme } = useAppTheme()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          borderRadius: 16,
          ...Platform.select({
            ios: {
              shadowColor: theme.colors.palette.neutral900,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
            },
            android: {
              elevation: 6,
            },
          }),
        },
        gradient: {
          borderRadius: 16,
        },
        floatingGradient: {
          borderRadius: 28,
        },
        content: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        },
        // Size variants
        smallContainer: {
          paddingVertical: 8,
          paddingHorizontal: 12,
        },
        mediumContainer: {
          paddingVertical: 12,
          paddingHorizontal: 16,
        },
        largeContainer: {
          paddingVertical: 16,
          paddingHorizontal: 24,
        },
        // Variant containers
        primaryContainer: {
          borderRadius: 16,
        },
        secondaryContainer: {
          borderRadius: 16,
          borderWidth: 2,
          borderColor: theme.colors.palette.primary300,
        },
        floatingContainer: {
          borderRadius: 28,
          paddingVertical: 16,
          paddingHorizontal: 24,
        },
        // Text styles
        smallText: {
          fontSize: 12,
          fontWeight: '600',
        },
        mediumText: {
          fontSize: 14,
          fontWeight: '600',
        },
        largeText: {
          fontSize: 16,
          fontWeight: '600',
        },
        primaryText: {
          color: theme.colors.palette.neutral100,
        },
        secondaryText: {
          color: theme.colors.palette.primary300,
        },
        floatingText: {
          color: theme.colors.palette.neutral100,
          fontSize: 16,
          fontWeight: '700',
        },
      }),
    [theme],
  )

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          text: styles.smallText,
          icon: 16,
        }
      case 'large':
        return {
          container: styles.largeContainer,
          text: styles.largeText,
          icon: 24,
        }
      default:
        return {
          container: styles.mediumContainer,
          text: styles.mediumText,
          icon: 20,
        }
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          container: styles.secondaryContainer,
          text: styles.secondaryText,
          gradient: false,
        }
      case 'floating':
        return {
          container: styles.floatingContainer,
          text: styles.floatingText,
          gradient: true,
        }
      default:
        return {
          container: styles.primaryContainer,
          text: styles.primaryText,
          gradient: true,
        }
    }
  }

  const sizeStyles = getSizeStyles()
  const variantStyles = getVariantStyles()

  const ButtonContent = () => (
    <View style={[styles.content, sizeStyles.container]}>
      <Ionicons
        name="add"
        size={sizeStyles.icon}
        color={
          variant === 'secondary'
            ? theme.colors.palette.primary300
            : theme.colors.palette.neutral100
        }
      />
      <Text style={{ ...sizeStyles.text, ...variantStyles.text }} text={text} />
    </View>
  )

  if (variantStyles.gradient) {
    return (
      <TouchableOpacity
        style={styles.wrapper}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={
            variant === 'floating'
              ? ['#667eea', '#764ba2']
              : [
                  theme.colors.palette.primary300,
                  theme.colors.palette.primary200,
                ]
          }
          style={[
            styles.gradient,
            variant === 'floating' && styles.floatingGradient,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ButtonContent />
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      style={[
        styles.wrapper,
        variantStyles.container,
        { backgroundColor: theme.colors.palette.neutral200 },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <ButtonContent />
    </TouchableOpacity>
  )
}
