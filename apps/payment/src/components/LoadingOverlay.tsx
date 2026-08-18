// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Text } from './Text'
import { colors } from '@andojo/shared-theme'

interface LoadingOverlayProps {
  visible: boolean
  message?: string
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  if (!visible) return null

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.palette.primary500} />
        {message && <Text text={message} style={styles.message} />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    backgroundColor: colors.background,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  message: {
    marginTop: 10,
    color: colors.text,
    textAlign: 'center',
  },
})
