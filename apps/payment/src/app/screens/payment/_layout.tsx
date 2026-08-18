// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Stack } from 'expo-router'

export default function PaymentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: 'transparent',
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="add-money"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="deposit-success"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="withdraw"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="withdrawal-success"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  )
}
