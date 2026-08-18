import { Stack } from 'expo-router'

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="phone-login"
        options={{
          headerShown: false,
          title: 'Login',
        }}
      />
      <Stack.Screen
        name="verify-otp"
        options={{
          headerShown: false,
          title: 'Verify Code',
        }}
      />
      <Stack.Screen
        name="create-profile"
        options={{
          headerShown: false,
          title: 'Create Profile',
        }}
      />
      <Stack.Screen
        name="users-list"
        options={{
          headerShown: false,
          title: 'Test Users',
        }}
      />
    </Stack>
  )
}
