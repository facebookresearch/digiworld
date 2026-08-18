import React from 'react'
import { Stack } from 'expo-router'
import { colors } from '@andojo/shared-theme'
export default function AddressLayout() {
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
