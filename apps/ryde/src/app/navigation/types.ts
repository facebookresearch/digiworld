// Copyright (c) Meta Platforms, Inc. and affiliates.
import { NavigatorScreenParams } from '@react-navigation/native'
import React from 'react'

export type TabParamList = {
  home: undefined
  transactions: undefined
  contacts: undefined
  settings: undefined
}

export type RootStackParamList = {
  '(tabs)': NavigatorScreenParams<TabParamList>
  'screens/transaction/[id]': { id: number }
  // ... other screens
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

// This is a dummy component to satisfy the default export requirement
// It represents the navigation container structure
const NavigationContainer: React.FC = () => null
export default NavigationContainer
