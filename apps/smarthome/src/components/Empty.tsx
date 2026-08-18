// Copyright (c) Meta Platforms, Inc. and affiliates.
import { View, StyleSheet } from 'react-native'
import { Text, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useMemo } from 'react'

interface EmptyStateProps {
  title: string
  subtitle: string
}

const EmptyState = ({ title, subtitle }: EmptyStateProps) => {
  const { theme } = useAppTheme()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        emptyContainer: {
          alignItems: 'center',
          flex: 1,
          justifyContent: 'center',
          paddingTop: 50, // optional: tweak to push it *slightly* lower
        },
        emptyText: {
          color: theme.colors.palette.neutral500,
          fontSize: 16,
          marginTop: 16,
          textAlign: 'center',
        },
        emptyText2: {
          color: theme.colors.palette.neutral500,
          fontSize: 16,
          textAlign: 'center',
        },
      }),
    [theme],
  )

  return (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="musical-notes"
        size={48}
        color={theme.colors.palette.neutral500}
      />
      <Text style={styles.emptyText}>{title}</Text>
      <Text style={styles.emptyText2}>{subtitle}</Text>
    </View>
  )
}

export default EmptyState
