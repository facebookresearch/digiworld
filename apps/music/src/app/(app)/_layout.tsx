import { Tabs, usePathname } from 'expo-router'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import { View, StyleSheet } from 'react-native'
import { MiniPlayer } from '@/components/MiniPlayer'
import { useAppTheme } from '@andojo/shared-theme'
import React from 'react'

export default observer(function AppLayout() {
  const pathname = usePathname()
  const { theme } = useAppTheme()
  const styles = createStyles(theme)
  // Hide miniplayer on full player screen and legal routes, but show it on detail pages
  const isModal =
    pathname.startsWith('/(legal)') ||
    (pathname.startsWith('/(modals)/') &&
      !pathname.startsWith('/(modals)/detail/'))

  return (
    <React.Fragment>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.colors.background,
            borderTopWidth: 1,
            borderTopColor: theme.colors.palette.overlay20,
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: theme.colors.tint,
          tabBarInactiveTintColor: theme.colors.textDim,
          tabBarLabelStyle: {
            fontSize: 12,
            marginTop: -4,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Your Library',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="library-music" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-circle" size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      {!isModal && (
        <View style={styles.miniPlayer}>
          <MiniPlayer />
        </View>
      )}
    </React.Fragment>
  )
})

const createStyles = () =>
  StyleSheet.create({
    miniPlayer: {
      position: 'absolute',
      bottom: 60,
      left: 0,
      right: 0,
    },
  })
