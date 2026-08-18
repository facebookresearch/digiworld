// Copyright (c) Meta Platforms, Inc. and affiliates.
import { colors } from '@andojo/shared-theme'
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: {
          backgroundColor: colors.palette.neutral800,
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
