// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Stack } from 'expo-router'
import { sharedScreenOptions } from '@/config/layoutConfig'

export default function AppLayout() {
  return (
    <Stack screenOptions={sharedScreenOptions}>
      <Stack.Screen name="(drawer)" options={sharedScreenOptions} />
      <Stack.Screen
        name="search"
        options={{
          ...sharedScreenOptions,
          presentation: 'card',
        }}
      />
    </Stack>
  )
}
