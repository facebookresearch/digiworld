// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Stack } from 'expo-router'

export default function NexusPayLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="add-contact" />
    </Stack>
  )
}
