import React from 'react'
import { StyleSheet } from 'react-native'
import { Box, Spinner, Text } from '@gluestack-ui/themed'
import { useAppTheme } from '../hooks/useAppTheme'
import { metrics } from '../themes/metrics'

interface LoadingOverlayProps {
  /**
   * Whether the loading overlay is visible
   */
  visible: boolean
  /**
   * Optional message to display below the spinner
   */
  message?: string
  /**
   * Optional z-index override
   */
  zIndex?: number
}

/**
 * A loading overlay component that covers the entire screen with a semi-transparent
 * background and displays a spinner with an optional message.
 */
export function LoadingOverlay({
  visible,
  message,
  zIndex = 9999,
}: LoadingOverlayProps) {
  const { theme } = useAppTheme()

  if (!visible) return null

  return (
    <Box
      position="absolute"
      top={0}
      bottom={0}
      left={0}
      right={0}
      alignItems="center"
      justifyContent="center"
      style={{ backgroundColor: theme.colors.transparent, zIndex }}
    >
      <Box
        style={{
          backgroundColor: theme.colors.background,
          borderRadius: metrics.borderRadiusLarge,
          padding: metrics.xl,
          alignItems: 'center',
          ...styles.content,
        }}
      >
        <Spinner size="large" color={theme.colors.palette.primary500} />
        {message && (
          <Text
            style={{
              color: theme.colors.text,
              marginTop: metrics.medium,
              textAlign: 'center',
            }}
          >
            {message}
          </Text>
        )}
      </Box>
    </Box>
  )
}

const styles = StyleSheet.create({
  content: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
})
