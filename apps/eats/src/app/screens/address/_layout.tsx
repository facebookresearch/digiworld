// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Stack } from 'expo-router'

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="address-list"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="add-address"
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  )
}
