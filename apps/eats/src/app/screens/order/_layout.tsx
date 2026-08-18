import { Stack } from 'expo-router'

export default function OrderStackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="order-tracking"
        options={{
          title: 'Order Tracking',
          headerShown: false,
        }}
      />
    </Stack>
  )
}
