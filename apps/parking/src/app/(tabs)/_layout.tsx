import React, { useRef, useEffect, useMemo } from 'react'
import {
  View,
  TouchableOpacity,
  Animated,
  Platform,
  StyleSheet,
  Text,
} from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'

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
      <Ionicons name={name as any} size={size} color={color} />
    </Animated.View>
  )
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]
          const label = options.title || route.name
          const focused = state.index === index
          const onPress = () => navigation.navigate(route.name)

          const iconName = {
            home: focused ? 'home' : 'home-outline',
            vehicles: focused ? 'car' : 'car-outline',
            history: focused ? 'time' : 'time-outline',
            payment: focused ? 'card' : 'card-outline',
            account: focused ? 'person' : 'person-outline',
          }[route.name]

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[styles.tabButton, focused && styles.tabButtonActive]}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconContainer,
                  focused && styles.iconContainerActive,
                ]}
              >
                <AnimatedTabIcon
                  name={iconName as any}
                  color={
                    focused
                      ? theme.colors.palette.neutral100
                      : theme.colors.palette.neutral600
                  }
                  focused={focused}
                  size={22}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: focused
                      ? theme.colors.palette.primary500
                      : theme.colors.palette.neutral600,
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
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="vehicles" options={{ title: 'Vehicles' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="payment" options={{ title: 'Payment' }} />
      <Tabs.Screen name="account" options={{ title: 'Profile' }} />
    </Tabs>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingBottom: Platform.OS === 'ios' ? 16 : 8,
      backgroundColor: theme.colors.palette.neutral100,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral300,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 16,
    },
    tabBar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 8,
      paddingTop: 8,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 2,
    },
    tabButtonActive: {
      // Active state styling handled by iconContainer
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    iconContainerActive: {
      backgroundColor: theme.colors.palette.primary500,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
    label: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: 4,
    },
  })
