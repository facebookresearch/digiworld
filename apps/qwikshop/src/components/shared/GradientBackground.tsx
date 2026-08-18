// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { StyleSheet, ViewStyle } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { useAppTheme } from '@andojo/shared-theme'

interface GradientBackgroundProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'accent' | 'background' | 'card'
  style?: ViewStyle
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  variant = 'background',
  style,
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
    flex: 1,
  },
})
