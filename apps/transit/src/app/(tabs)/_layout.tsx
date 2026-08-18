import { typography, useAppTheme, type Theme } from '@andojo/shared-theme'
import { useMemo } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { Platform, StyleSheet, View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

export default function TabLayout() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.palette.secondary500,
        tabBarInactiveTintColor: theme.colors.palette.neutral500,
        tabBarStyle: {
          backgroundColor: theme.colors.palette.neutral100,
          elevation: 25,
          shadowColor: theme.colors.palette.neutral900,
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.12,
          shadowRadius: 24,
          height: Platform.OS === 'ios' ? 88 : 76,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          paddingHorizontal: 12,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          position: 'absolute',
          borderTopColor: `${theme.colors.palette.secondary500}14`,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: typography.primary.semiBold,
          marginTop: 4,
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
          letterSpacing: 0.4,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 6,
          borderRadius: 16,
          marginHorizontal: 2,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={focused ? 28 : 26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: 'Nearby',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'location' : 'location-outline'}
              size={focused ? 28 : 26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="lines"
        options={{
          title: 'Lines',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.centerButtonContainer,
                {
                  backgroundColor: theme.colors.palette.neutral100,
                  shadowColor: theme.colors.palette.secondary500,
                },
              ]}
            >
              <LinearGradient
                colors={
                  focused
                    ? [color, theme.colors.palette.secondary500]
                    : [
                        theme.colors.palette.secondary500,
                        theme.colors.palette.secondary500,
                      ]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.centerButton,
                  { borderColor: theme.colors.palette.neutral100 },
                ]}
              >
                <Ionicons
                  name={focused ? 'list' : 'list-outline'}
                  size={32}
                  color={theme.colors.palette.neutral100}
                />
              </LinearGradient>
            </View>
          ),
          tabBarLabel: () => null, // Hide label for center tab
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'bookmarks' : 'bookmarks-outline'}
              size={focused ? 28 : 26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={focused ? 28 : 26}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  )
}

const createStyles = (_theme: Theme) =>
  StyleSheet.create({
    centerButtonContainer: {
      position: 'absolute',
      top: -28,
      width: 68,
      height: 68,
      borderRadius: 34,
      justifyContent: 'center',
      alignItems: 'center',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
    },
    centerButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
    },
  })
