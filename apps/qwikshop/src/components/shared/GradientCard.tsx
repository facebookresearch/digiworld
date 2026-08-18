import React from 'react'
import { StyleSheet, ViewStyle, TouchableOpacity } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { useAppTheme } from '@andojo/shared-theme'

interface GradientCardProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'accent' | 'background' | 'card'
  style?: ViewStyle
  onPress?: () => void
  disabled?: boolean
}

export const GradientCard: React.FC<GradientCardProps> = ({
  children,
  variant = 'card',
  style,
  onPress,
  disabled = false,
}) => {
  const { theme } = useAppTheme()

  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return [
          theme.colors.palette.primary300,
          theme.colors.palette.primary400,
        ]
      case 'secondary':
        return [
          theme.colors.palette.secondary500,
          theme.colors.palette.secondary600,
        ]
      case 'accent':
        return [theme.colors.palette.accent500, theme.colors.palette.accent600]
      case 'background':
        return [
          theme.colors.palette.primary100,
          theme.colors.palette.primary200,
        ]
      case 'card':
        return [
          theme.colors.palette.neutral100,
          theme.colors.backgroundSecondary,
        ]
    }
  }

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={[styles.container, style]}
        activeOpacity={0.8}
      >
        <LinearGradient colors={getGradientColors()} style={styles.gradient}>
          {children}
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  return (
    <LinearGradient
      colors={getGradientColors()}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gradient: {
    flex: 1,
    borderRadius: 16,
  },
})
