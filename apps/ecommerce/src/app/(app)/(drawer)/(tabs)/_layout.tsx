// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { Tabs } from 'expo-router/tabs'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from 'expo-router'
import { TouchableOpacity } from 'react-native'
import { DrawerActions } from '@react-navigation/native'
import { useAppTheme } from '@andojo/shared-theme'

export default function TabsLayout() {
  const navigation = useNavigation()
  const { theme } = useAppTheme()

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer())
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.palette.neutral100,
        },
        headerTintColor: theme.colors.text,
        tabBarActiveTintColor: theme.colors.tint,
        tabBarInactiveTintColor: theme.colors.textDim,
        tabBarStyle: {
          backgroundColor: theme.colors.palette.neutral100,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
        },
        headerLeft: () => (
          <TouchableOpacity onPress={openDrawer} style={{ marginLeft: 16 }}>
            <MaterialCommunityIcons
              name="menu"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="view-grid"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
