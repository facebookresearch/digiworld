import React from 'react'
import { View } from 'react-native'
import { OverlayProvider } from '@gluestack-ui/overlay'
import { useAppTheme } from '../hooks/useAppTheme'
import { GluestackUIProvider, createConfig } from '@gluestack-ui/themed'
import { StyledProvider } from '@gluestack-style/react'

// Create a GlueStack theme config from our app theme
const createGluestackConfig = (colors: any) => {
  return createConfig({
    tokens: {
      colors: {
        primary500: colors.palette.primary500,
        primary600: colors.palette.primary600,
        primary400: colors.palette.primary400,
        primary300: colors.palette.primary300,
        primary200: colors.palette.primary200,
        primary100: colors.palette.primary100,

        secondary500: colors.palette.secondary500,
        secondary600: colors.palette.secondary400,
        secondary400: colors.palette.secondary300,
        secondary300: colors.palette.secondary200,
        secondary200: colors.palette.secondary100,
        secondary100: colors.palette.secondary100,

        error500: colors.error,
        error400: colors.errorBackground,

        background500: colors.background,
        background400: colors.palette.neutral200,
        background300: colors.palette.neutral300,

        text900: colors.text,
        text800: colors.textDim,
      },
    },
    aliases: {
      Button: {
        defaultProps: {
          size: 'md',
          variant: 'solid',
        },
      },
      Text: {
        defaultProps: {
          size: 'md',
        },
      },
    },
  })
}

export function GluestackProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useAppTheme()
  const config = createGluestackConfig(theme.colors)

  return (
    <StyledProvider config={config}>
      <GluestackUIProvider config={config}>
        <View style={{ flex: 1 }}>
          <OverlayProvider>{children}</OverlayProvider>
        </View>
      </GluestackUIProvider>
    </StyledProvider>
  )
}
