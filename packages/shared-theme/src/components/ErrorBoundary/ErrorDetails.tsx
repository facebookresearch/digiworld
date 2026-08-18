// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { ScrollView } from 'react-native'
import {
  Box,
  Button,
  ButtonText,
  Text,
  VStack,
  HStack,
} from '@gluestack-ui/themed'
import { metrics } from '../../themes/metrics'
import { colors } from '../../ThemeContext'

export interface ErrorDetailsProps {
  /**
   * The error message to display
   */
  error: Error
  /**
   * Called when the reset button is pressed
   */
  onReset: () => void
  /**
   * Called when the copy button is pressed
   */
  onCopy?: () => void
}

/**
 * Displays details about an error that was caught by the ErrorBoundary.
 * Includes the error message, stack trace, and actions to reset or copy error details.
 */
export function ErrorDetails({ error, onReset, onCopy }: ErrorDetailsProps) {
  return (
    <Box
      flex={1}
      style={{ backgroundColor: colors.background, padding: metrics.medium }}
    >
      <ScrollView>
        <VStack style={{ gap: metrics.large }}>
          <Text
            style={{
              fontSize: metrics.text.xxl,
              fontWeight: 'bold',
              color: colors.palette.angry500,
            }}
          >
            Something went wrong!
          </Text>

          <Text
            style={{
              fontSize: metrics.text.xl,
              color: colors.text,
              marginTop: metrics.small,
            }}
          >
            {error.message}
          </Text>

          {error.stack && (
            <Box
              style={{
                backgroundColor: colors.background,
                padding: metrics.large,
                borderRadius: metrics.borderRadiusMedium,
                marginTop: metrics.large,
              }}
            >
              <Text
                style={{
                  fontSize: metrics.text.small,
                  fontFamily: 'monospace',
                  color: colors.text,
                }}
              >
                {error.stack}
              </Text>
            </Box>
          )}

          <HStack
            style={{
              gap: metrics.small,
              marginTop: metrics.xl,
              justifyContent: 'flex-start',
            }}
          >
            <Button
              onPress={onReset}
              style={{
                backgroundColor: colors.palette.primary500,
                paddingHorizontal: metrics.xl,
                paddingVertical: metrics.small,
                borderRadius: metrics.borderRadiusSmall,
              }}
            >
              <ButtonText
                style={{
                  color: colors.palette.neutral100,
                  fontSize: metrics.text.large,
                }}
              >
                Try Again
              </ButtonText>
            </Button>

            {onCopy && (
              <Button
                onPress={onCopy}
                style={{
                  borderColor: colors.palette.primary500,
                  borderWidth: 1,
                  backgroundColor: 'transparent',
                  paddingHorizontal: metrics.xl,
                  paddingVertical: metrics.small,
                  borderRadius: metrics.borderRadiusSmall,
                }}
              >
                <ButtonText
                  style={{
                    color: colors.palette.primary500,
                    fontSize: metrics.text.large,
                  }}
                >
                  Copy Error
                </ButtonText>
              </Button>
            )}
          </HStack>
        </VStack>
      </ScrollView>
    </Box>
  )
}
