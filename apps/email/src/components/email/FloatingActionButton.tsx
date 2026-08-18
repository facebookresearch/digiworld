// Copyright (c) Meta Platforms, Inc. and affiliates.
import { StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { router } from 'expo-router'
import { useMemo } from 'react'

export function FloatingActionButton() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const handlePress = () => {
    router.push('/screens/compose/mailcompose')
  }

  return (
    <TouchableOpacity style={styles.fab} onPress={handlePress}>
      <Ionicons
        name="create"
        size={24}
        color={theme.colors.palette.neutral100}
      />
    </TouchableOpacity>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    fab: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 28,
      bottom: spacing.xl,
      elevation: 4,
      height: 56,
      justifyContent: 'center',
      position: 'absolute',
      right: spacing.md,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      width: 56,
      zIndex: 1000,
    },
  })
