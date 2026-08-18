import { Stack } from 'expo-router'
import { useTheme } from '@andojo/shared-theme'

export default function LegalLayout() {
  const { theme } = useTheme()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen name="terms" />
      <Stack.Screen name="privacy" />
    </Stack>
  )
}
