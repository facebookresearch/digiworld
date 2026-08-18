import { Stack } from 'expo-router'
import { useAppTheme } from '@/utils/useAppTheme'

export default function AuthLayout() {
  const { theme } = useAppTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: {
          backgroundColor: theme.colors.palette.neutral900,
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
