import React, { useRef, useEffect } from 'react'
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
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Glassmorphic } from '@/components/Glassmorphic'
import { useAppTheme } from '@andojo/shared-theme'

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

  return (
    <View style={styles.container}>
      <Glassmorphic
        borderRadius={28}
        intensity={Platform.OS === 'ios' ? 85 : 90}
        backgroundColor={
          Platform.OS === 'ios'
            ? theme.colors.palette.secondary100
            : theme.colors.palette.neutral100
        }
        borderColor={theme.colors.palette.neutral300}
        borderWidth={1.5}
        style={styles.glassTabBar}
      >
        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key]
            const label = options.title || route.name
            const focused = state.index === index
            const onPress = () => navigation.navigate(route.name)

            const iconName = {
              home: 'home',
              browse: 'grid',
              cards: 'cube',
              history: 'list',
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
      </Glassmorphic>
    </View>
  )
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true, // Lazy load tabs for better performance
      }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="browse" options={{ title: 'Browse' }} />
      <Tabs.Screen name="cards" options={{ title: 'My Items' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
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
  glassTabBar: {
    width: '95%',
    paddingVertical: 12,
    paddingHorizontal: 12,
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
