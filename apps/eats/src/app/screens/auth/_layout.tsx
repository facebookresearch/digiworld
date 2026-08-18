// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Stack, useNavigation } from 'expo-router'
import { useEffect } from 'react'
import { BackHandler } from 'react-native'

export default function AuthLayout() {
  const navigation = useNavigation()

  // Handle back button press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // If we're on the phone-login screen, prevent going back
        const currentRoute =
          navigation.getState()?.routes[navigation.getState()?.index ?? 0]
        if (currentRoute?.name === 'phone-login') {
          return true // Prevent default behavior
        }
        return false // Allow default behavior for other screens
      },
    )

    return () => backHandler.remove()
  }, [navigation])

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Prevent going back to previous screens
        gestureEnabled: false,
        // Prevent going back with back button
        headerBackVisible: false,
      }}
    >
      <Stack.Screen
        name="phone-login"
        options={{
          title: 'Login',
          // Prevent going back to authenticated screens
          gestureEnabled: false,
          // Prevent going back with back button
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="verify-otp"
        options={{
          title: 'Verify Code',
          // Allow going back to phone login
          gestureEnabled: true,
          // Allow back button
          headerBackVisible: true,
        }}
      />
      <Stack.Screen
        name="create-profile"
        options={{
          title: 'Create Profile',
          // Allow going back to verify OTP
          gestureEnabled: true,
          // Allow back button
          headerBackVisible: true,
        }}
      />
      <Stack.Screen
        name="users-list"
        options={{
          title: 'Test Users',
          // Allow going back to phone login
          gestureEnabled: true,
          // Allow back button
          headerBackVisible: true,
        }}
      />
    </Stack>
  )
}
