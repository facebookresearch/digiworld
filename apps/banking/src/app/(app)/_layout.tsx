import React, { useRef, useEffect, useMemo } from 'react'
import {
  View,
  TouchableOpacity,
  Animated,
  Platform,
  StyleSheet,
  Text,
} from 'react-native'
import { BlurView } from 'expo-blur'
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
      <BlurView
        intensity={Platform.OS === 'ios' ? 70 : 75}
        tint="light"
        style={[
          styles.blur,
          {
            backgroundColor:
              Platform.OS === 'android'
                ? `${theme.colors.background}`
                : 'transparent',
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
              'pay-bills': 'receipt',
              cards: 'card',
              transactions: 'list',
              profile: 'person',
            }[route.name]

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabButton}
                activeOpacity={0.7}
              >
                <AnimatedTabIcon
                  name={iconName as any}
                  color={
                    focused
                      ? theme.colors.palette.primary600
                      : theme.colors.palette.neutral500
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
                        : theme.colors.palette.neutral500,
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </BlurView>
    </View>
  )
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="pay-bills" options={{ title: 'Pay Bills' }} />
      <Tabs.Screen name="cards" options={{ title: 'Cards' }} />
      <Tabs.Screen name="transactions" options={{ title: 'History' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
      shadowColor: theme.colors.palette.neutral900,
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
      fontWeight: '500',
      marginTop: 2,
    },
  })
