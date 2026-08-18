// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { Stack } from 'expo-router'
import { colors } from '@andojo/shared-theme'
export default function PaymentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: colors.palette.neutral800,
        },
        headerTintColor: colors.palette.neutral100,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Payment Methods',
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'Add Payment Method',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Edit Payment Method',
        }}
      />
    </Stack>
  )
}
