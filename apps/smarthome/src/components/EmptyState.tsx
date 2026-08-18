// Copyright (c) Meta Platforms, Inc. and affiliates.
import { View, StyleSheet, Pressable } from 'react-native'
import { Text, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useMemo } from 'react'

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
  actionText?: string
  onAction?: () => void
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) {
  const { theme } = useAppTheme()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        icon: {
          marginBottom: 16,
          opacity: 0.6,
        },
        title: {
          fontSize: 20,
          fontWeight: '600',
          marginBottom: 8,
          textAlign: 'center',
          color: theme.colors.text,
        },
        description: {
          fontSize: 16,
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: 24,
          color: theme.colors.textDim,
        },
        actionButton: {
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 20,
          backgroundColor: theme.colors.palette.primary200,
          shadowColor: theme.colors.palette.primary500,
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 5,
        },
        actionText: {
          fontSize: 16,
          fontWeight: '600',
          color: theme.colors.text,
        },
      }),
    [theme],
  )

  return (
    <View style={styles.container}>
      <Ionicons
        name={icon}
        size={64}
        color={theme.colors.textDim}
        style={styles.icon}
      />
      <Text style={styles.title} text={title} />
      <Text style={styles.description} text={description} />

      {actionText && onAction && (
        <Pressable style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionText} text={actionText} />
        </Pressable>
      )}
    </View>
  )
}
