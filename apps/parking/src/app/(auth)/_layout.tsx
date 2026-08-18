// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useAppTheme } from '@andojo/shared-theme'
import { Stack } from 'expo-router'

export default function AuthLayout() {
  const { theme } = useAppTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: {
          backgroundColor: theme.colors.palette.neutral800,
        },
      }}
    >
      <Stack.Screen
        name="splash"
        options={{
          // Prevent going back to splash
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  )
}
