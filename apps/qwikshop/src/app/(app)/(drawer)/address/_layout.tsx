// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { Stack } from 'expo-router'
import {
  sharedScreenOptions,
  sharedHeaderStyle,
  sharedHeaderTitleStyle,
  themeColors,
} from '@/config/layoutConfig'

export default function AddressLayout() {
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
          title: 'Address Book',
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'Add New Address',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Edit Address',
        }}
      />
    </Stack>
  )
}
