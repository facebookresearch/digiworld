// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useEffect } from 'react'
import { View, StyleSheet, Image } from 'react-native'
import { router } from 'expo-router'
import * as ExpoSplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { Text, useTheme } from '@andojo/shared-theme'

import { useStores } from '@/models/helpers/useStores'

// Prevent native splash screen from autohiding
ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors
})

export default function SplashScreenPage() {
  const { userStore } = useStores()
  const { theme } = useTheme()

  useEffect(() => {
    // Simulate loading time and hide native splash screen
    const timer = setTimeout(async () => {
      try {
        await ExpoSplashScreen.hideAsync()
        // TODO: Check if user is authenticated
        setTimeout(() => {
          if (userStore.isAuthenticated) {
            // router.replace("/(app)/home")
          } else {
            router.replace('/(auth)/login')
          }
        }, 2000)
      } catch (error) {
        console.warn('Error hiding splash screen:', error)
        // Still try to navigate even if hiding fails
        router.replace('/(auth)/login')
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.palette.neutral200 },
      ]}
    >
      <StatusBar style="light" />
      <Image
        source={require('../../../assets/images/app-icon-all.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text
        style={[styles.appName, { color: theme.colors.palette.neutral900 }]}
      >
        Andojo Music
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    height: 200,
    marginBottom: 16,
    width: 200,
  },
})
