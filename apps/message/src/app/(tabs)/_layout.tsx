// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Tabs, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStores } from '@/models/helpers/useStores'

export default function TabLayout() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const TabBarIcon = (props: {
    name: React.ComponentProps<typeof Ionicons>['name']
    color: string
  }) => {
    return <Ionicons size={22} style={styles.icon} {...props} />
  }
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { userStore } = useStores()

  const handleComposePress = () => {
    userStore.setNavigationSource('compose') // Set navigation source for compose
    router.push('/screens/contacts/contact-list')
  }

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.palette.primary500,
          tabBarInactiveTintColor: theme.colors.palette.neutral500,
          tabBarStyle: {
            backgroundColor: theme.colors.palette.neutral100,
            borderTopWidth: 0,
            paddingBottom: insets.bottom,
            height: 60 + insets.bottom,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Chats',
            tabBarIcon: ({ color }) => (
              <View style={styles.iconContainer}>
                <TabBarIcon name="chatbubbles-outline" color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="calls"
          options={{
            title: 'Calls',
            tabBarIcon: ({ color }) => (
              <View style={styles.iconContainer}>
                <TabBarIcon name="call-outline" color={color} />
              </View>
            ),
            tabBarItemStyle: {
              marginRight: 30,
            },
          }}
        />

        <Tabs.Screen
          name="groups"
          options={{
            title: 'Groups',
            tabBarIcon: ({ color }) => (
              <View style={styles.iconContainer}>
                <TabBarIcon name="people-outline" color={color} />
              </View>
            ),
            tabBarItemStyle: {
              marginLeft: 30,
            },
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              <View style={styles.iconContainer}>
                <TabBarIcon name="person-outline" color={color} />
              </View>
            ),
          }}
        />
      </Tabs>

      {/* Floating Compose Button */}
      <TouchableOpacity
        style={styles.composeButton}
        onPress={handleComposePress}
      >
        <LinearGradient
          colors={[
            theme.colors.palette.primary500,
            theme.colors.palette.secondary500,
          ]}
          style={styles.composeButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons
            name="create-outline"
            size={28}
            color={theme.colors.palette.neutral100}
          />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    icon: {
      marginBottom: 0,
    },
    iconContainer: {
      height: 30,
      width: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    composeButton: {
      position: 'absolute',
      bottom: 30,
      left: '50%',
      transform: [{ translateX: -32 }], // Half of button width
      width: 64,
      height: 64,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    composeButtonGradient: {
      width: '100%',
      height: '100%',
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: theme.colors.background,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
    },
  })
