// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useAppTheme } from '@andojo/shared-theme'
import { Stack } from 'expo-router'

export default function LegalLayout() {
  const { theme } = useAppTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: theme.colors.palette.neutral900,
        },
      }}
    >
      <Stack.Screen name="terms" />
      <Stack.Screen name="privacy" />
    </Stack>
  )
}
