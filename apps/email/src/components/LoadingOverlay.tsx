// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useMemo } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Text } from './Text'
import { useAppTheme, type Theme } from '@andojo/shared-theme'

interface LoadingOverlayProps {
  visible: boolean
  message?: string
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  if (!visible) return null

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator
          size="large"
          color={theme.colors.palette.primary500}
        />
        {message && <Text text={message} style={styles.message} />}
      </View>
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      backgroundColor: theme.colors.palette.overlay50,
      justifyContent: 'center',
      zIndex: 9999,
    },
    content: {
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      padding: 20,
    },
    message: {
      color: theme.colors.text,
      marginTop: 10,
      textAlign: 'center',
    },
  })
