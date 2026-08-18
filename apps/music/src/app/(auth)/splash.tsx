// Copyright (c) Meta Platforms, Inc. and affiliates.
import { View, Text, StyleSheet, Image } from 'react-native'
import { useEffect } from 'react'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as ExpoSplashScreen from 'expo-splash-screen'
import { useStores } from '@/models/helpers/useStores'
import { useAppTheme } from '@andojo/shared-theme'

// Prevent native splash screen from autohiding
ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors
})

export default function SplashScreenPage() {
  const { userStore } = useStores()
  const { theme } = useAppTheme()
  useEffect(() => {
    // Simulate loading time and hide native splash screen
    const timer = setTimeout(async () => {
      try {
        await ExpoSplashScreen.hideAsync()
        // TODO: Check if user is authenticated
        setTimeout(() => {
          if (userStore.isAuthenticated) {
            router.replace('/(app)/home')
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
    <View style={styles.container}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Image
        source={require('../../../assets/images/app-icon-all.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.appName}>Andojo Music</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
})
