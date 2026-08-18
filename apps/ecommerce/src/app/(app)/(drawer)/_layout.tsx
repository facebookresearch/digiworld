import React from 'react'
import { Drawer } from 'expo-router/drawer'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useAppTheme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'

export default observer(function DrawerLayout() {
  const { theme } = useAppTheme()

  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: theme.colors.palette.neutral100,
        },
        headerTintColor: theme.colors.text,
        drawerStyle: {
          backgroundColor: theme.colors.background,
        },
        drawerActiveTintColor: theme.colors.tint,
        drawerInactiveTintColor: theme.colors.textDim,
        drawerActiveBackgroundColor: theme.colors.palette.primary100,
      }}
    >
      {/* Main Screens - Visible in Drawer */}
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: 'Home',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Address Book Stack */}
      <Drawer.Screen
        name="address"
        options={{
          title: 'Address Book',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="map-marker"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Payment Methods Stack */}
      <Drawer.Screen
        name="payment"
        options={{
          title: 'Payment Methods',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="credit-card"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="address/new"
        options={{
          title: 'Add Address',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="payment/new"
        options={{
          title: 'Add Payment Method',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="address/[id]"
        options={{
          title: 'Edit Address',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="payment/[id]"
        options={{
          title: 'Edit Payment Method',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="address/index"
        options={{
          title: 'Address Book',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="payment/index"
        options={{
          title: 'Payment Methods',
          drawerItemStyle: { display: 'none' },
        }}
      />

      {/* Add more drawer items as needed */}
    </Drawer>
  )
})
