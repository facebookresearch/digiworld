// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ThemeProvider } from '@andojo/shared-theme'

const Stack = createNativeStackNavigator()

export function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="TestScreen">{() => children}</Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  )
}
