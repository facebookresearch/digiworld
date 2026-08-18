import { Stack } from 'expo-router'

export default function LegalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: '#121719',
        },
      }}
    >
      <Stack.Screen name="terms" />
      <Stack.Screen name="privacy" />
    </Stack>
  )
}
