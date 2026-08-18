// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Stack } from 'expo-router'

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  )
}
