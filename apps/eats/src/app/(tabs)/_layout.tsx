// Copyright (c) Meta Platforms, Inc. and affiliates.
import { colors } from '@/theme'
import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { View, StyleSheet } from 'react-native'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, focused }) => {
          const iconName = {
            home: 'fast-food-outline',
            orders: 'list-outline',
          }[route.name] as keyof typeof Ionicons.glyphMap

          // Fancy background circle
          return (
            <View
              style={[
                styles.tabIconContainer,
                focused && styles.tabIconContainerFocused,
              ]}
            >
              <Ionicons name={iconName} size={14} color={color} />
            </View>
          )
        },
        tabBarActiveTintColor: colors.palette.primary500,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: 52,
          paddingBottom: 0,
          paddingTop: 0,
          borderTopWidth: 0.5,
          borderTopColor: colors.palette.neutral200,
        },
        tabBarItemStyle: {
          backgroundColor: 'transparent',
          paddingVertical: 0,
          marginVertical: 0,
        },
        tabBarPressColor: 'transparent',
      })}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="orders" />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  tabIconContainerFocused: {
    backgroundColor: colors.palette.primary100,
    shadowColor: colors.palette.primary500,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
})
