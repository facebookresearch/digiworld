// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useRef, useEffect } from 'react'
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Text,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Tabs } from 'expo-router/tabs'
import { useAppTheme } from '@andojo/shared-theme'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'

// Animated icon
function AnimatedTabIcon({
  name,
  color,
  focused,
  size,
}: {
  name: string
  color: string
  focused: boolean
  size: number
}) {
  const scale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.2 : 1,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start()
  }, [focused])

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <MaterialCommunityIcons name={name as any} size={size} color={color} />
    </Animated.View>
  )
}

// Custom Tab Bar
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme } = useAppTheme()

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.blur,
          {
            backgroundColor: theme.colors.background,
            opacity: 0.95,
          },
        ]}
      >
        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key]
            const label = options.title || route.name
            const focused = state.index === index
            const onPress = () => navigation.navigate(route.name)

            const iconName = {
              home: 'home',
              categories: 'view-grid',
              cart: 'cart',
              profile: 'account',
            }[route.name]

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabButton}
                activeOpacity={1}
              >
                <AnimatedTabIcon
                  name={iconName}
                  color={
                    focused
                      ? theme.colors.palette.primary600
                      : theme.colors.palette.neutral400
                  }
                  focused={focused}
                  size={28}
                />
                <Text
                  style={[
                    styles.label,
                    {
                      color: focused
                        ? theme.colors.palette.primary600
                        : theme.colors.palette.neutral400,
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </View>
  )
}

// Tabs layout
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="categories" options={{ title: 'Categories' }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  blur: {
    width: '95%',
    borderRadius: 24,
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
})
