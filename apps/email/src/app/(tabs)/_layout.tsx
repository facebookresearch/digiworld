// Copyright (c) Meta Platforms, Inc. and affiliates.
import { typography, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const TabBarIcon = (props: {
  name: React.ComponentProps<typeof Ionicons>['name']
  color: string
}) => {
  return <Ionicons size={24} style={styles.icon} {...props} />
}

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const { theme } = useAppTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: theme.colors.background,
          borderTopWidth: 1,
          borderTopColor: theme.colors.separator,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.palette.primary500,
        tabBarInactiveTintColor: theme.colors.textDim,
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: typography.primary.medium,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Mail',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="mail-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="people-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="person-outline" color={color} />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  icon: {
    marginBottom: 0,
  },
})
