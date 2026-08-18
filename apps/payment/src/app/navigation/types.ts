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
// Augment the ReactNavigation types
type ReactNavigationRootParamList = RootStackParamList

declare module '@react-navigation/native' {
  export interface RootParamList extends ReactNavigationRootParamList {}
}

// This is a dummy component to satisfy the default export requirement
// It represents the navigation container structure
const NavigationContainer: React.FC = () => null
export default NavigationContainer
