// Copyright (c) Meta Platforms, Inc. and affiliates.
import { StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '@andojo/shared-theme'
import { router } from 'expo-router'

export function FloatingActionButton() {
  const handlePress = () => {
    router.push('/screens/compose/mailcompose' as any)
  }

  return (
    <TouchableOpacity style={styles.fab} onPress={handlePress}>
      <Ionicons name="create" size={24} color={colors.palette.neutral100} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.palette.primary500,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
})
