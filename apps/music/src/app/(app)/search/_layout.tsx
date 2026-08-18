// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Stack } from 'expo-router'

export default function SearchLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[type]/[id]"
        options={{
          headerShown: true,
          headerTransparent: true,
          title: '',
          headerTintColor: 'white',
          headerBackButtonDisplayMode: 'minimal',
          headerTitleStyle: {
            color: 'white',
          },
        }}
      />
    </Stack>
  )
}
