// Copyright (c) Meta Platforms, Inc. and affiliates.
import { ViewStyle, TextStyle } from 'react-native'
import { themeColors } from '@/config/layoutConfig'

// Common shadow styles
export const shadowStyles = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
}

// Common border radius values
export const borderRadius = {
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 20,
  round: 50,
}

// Common spacing values
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}

// Typography styles
export const typography = {
  heading1: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: themeColors.text,
    lineHeight: 32,
  },
  heading2: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: themeColors.text,
    lineHeight: 28,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: themeColors.text,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: themeColors.text,
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: themeColors.text,
    lineHeight: 22,
  },
  caption: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: themeColors.textDim,
    lineHeight: 18,
  },
  small: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: themeColors.textDim,
    lineHeight: 16,
  },
}

// Common button styles
export const buttonStyles = {
  primary: {
    backgroundColor: themeColors.palette.primary500,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadowStyles.small,
  },
  secondary: {
    backgroundColor: themeColors.palette.secondary500,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadowStyles.small,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: themeColors.palette.primary500,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.md - 2, // Account for border
    paddingHorizontal: spacing.lg - 2,
  },
}

// Common card styles
export const cardStyles = {
  default: {
    backgroundColor: themeColors.palette.neutral100,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    ...shadowStyles.small,
  },
  elevated: {
    backgroundColor: themeColors.palette.neutral100,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    ...shadowStyles.medium,
  },
}

// Utility functions
export const createGradientStyle = (): ViewStyle => ({
  // This would be used with LinearGradient component
  borderRadius: borderRadius.large,
  ...shadowStyles.small,
})

export const createButtonTextStyle = (
  variant: 'primary' | 'secondary' | 'outline',
): TextStyle => {
  const baseStyle = {
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  }

  switch (variant) {
    case 'primary':
    case 'secondary':
      return {
        ...baseStyle,
        color: themeColors.palette.neutral100,
      }
    case 'outline':
      return {
        ...baseStyle,
        color: themeColors.palette.primary500,
      }
    default:
      return baseStyle
  }
}
