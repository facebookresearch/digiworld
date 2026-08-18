import { Stack } from 'expo-router'
import { useAppTheme } from '@andojo/shared-theme'

export default function MediaPreviewLayout() {
  const { theme } = useAppTheme()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: theme.colors.palette.neutral900,
        },
        headerTintColor: theme.colors.palette.neutral100,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerBackVisible: false,
        presentation: 'modal',
        animation: 'slide_from_bottom',
      }}
    />
  )
}
