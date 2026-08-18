// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Stack } from 'expo-router'

export default function MailLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="mailcompose"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </Stack>
  )
}
