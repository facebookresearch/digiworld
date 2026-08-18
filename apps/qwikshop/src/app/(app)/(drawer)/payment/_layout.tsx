// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { Stack } from 'expo-router'
import {
  sharedScreenOptions,
  sharedHeaderStyle,
  sharedHeaderTitleStyle,
  themeColors,
} from '@/config/layoutConfig'

export default function PaymentLayout() {
  return (
    <Stack
      screenOptions={{
        ...sharedScreenOptions,
        headerStyle: sharedHeaderStyle,
        headerTintColor: themeColors.palette.neutral100,
        headerTitleStyle: sharedHeaderTitleStyle,
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
