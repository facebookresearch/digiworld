// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { useAppTheme } from '@andojo/shared-theme'

interface GlassmorphicProps {
  children: React.ReactNode
  style?: ViewStyle
  intensity?: number
  borderRadius?: number
  borderWidth?: number
  borderColor?: string
  backgroundColor?: string
  padding?: number
  shadow?: boolean
  variant?: 'default' | 'strong' | 'subtle'
}

/**
 * Reusable Glassmorphic component for liquid glass effects
 * Automatically adapts to light/dark theme with customizable variants
 */
export function Glassmorphic({
  children,
  style,
  borderRadius = 20,
  borderWidth = 1,
  borderColor,
  backgroundColor,
  padding,
  shadow = true,
  variant = 'default',
}: GlassmorphicProps) {
  const { theme } = useAppTheme()

  // Get variant-specific colors from theme
  const getVariantColors = () => {
    // If backgroundColor is explicitly provided, use it
    if (backgroundColor) {
      return {
        bg: backgroundColor,
        border: borderColor || theme.colors.cardBorder || theme.colors.border,
      }
    }

    switch (variant) {
      case 'strong':
        return {
          bg:
            theme.colors.glassBackgroundStrong ||
            theme.colors.glassBackground ||
            theme.colors.palette.neutral100,
          border:
            borderColor ||
            theme.colors.glassBorderStrong ||
            theme.colors.glassBorder ||
            theme.colors.border,
        }
      case 'subtle':
        return {
          bg: theme.colors.glassBackground || theme.colors.palette.neutral300,
          border:
            borderColor || theme.colors.glassBorder || theme.colors.border,
        }
      default:
        return {
          bg:
            theme.colors.cardBackground ||
            theme.colors.glassBackground ||
            theme.colors.palette.neutral300,
          border:
            borderColor ||
            theme.colors.cardBorder ||
            theme.colors.glassBorder ||
            theme.colors.border,
        }
    }
  }

  const { bg, border } = getVariantColors()

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius,
          padding: padding !== undefined ? padding : 0,
          borderWidth,
          borderColor: border,
          backgroundColor: bg,
          ...(shadow && {
            shadowColor:
              theme.colors.glassShadow || theme.colors.palette.neutral900,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 5,
          }),
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
})
