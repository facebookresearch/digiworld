import { useMemo, useEffect } from 'react'
import { View, StyleSheet, Image } from 'react-native'
import { router } from 'expo-router'
import * as ExpoSplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { colors, Text, useAppTheme, type Theme } from '@andojo/shared-theme'

import { useStores } from '@/models/helpers/useStores'

// Prevent native splash screen from autohiding
ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors
})

export default function SplashScreenPage() {
  const { userStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  useEffect(() => {
    let isMounted = true

    // Simulate loading time and hide native splash screen
    const timer = setTimeout(async () => {
      try {
        await ExpoSplashScreen.hideAsync()

        // Wait a bit for smooth transition
        setTimeout(() => {
          if (!isMounted) return

          // Check if user is authenticated
          if (userStore.isAuthenticated && userStore.user) {
            router.replace('/(tabs)/plan')
          } else {
            router.replace('/(auth)/login')
          }
        }, 1000)
      } catch (error) {
        console.warn('Error hiding splash screen:', error)

        // Still try to navigate even if hiding fails
        if (!isMounted) return

        if (userStore.isAuthenticated && userStore.user) {
          router.replace('/(tabs)/plan')
        } else {
          router.replace('/(auth)/login')
        }
      }
    }, 1500)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [])

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Image
        source={require('../../../assets/images/splash-icon.png')}
        style={styles.logo}
        resizeMode="center"
      />
      <Text style={styles.appName}>Andojo Transit</Text>
    </View>
  )
}

const createStyles = (_theme: Theme) =>
  StyleSheet.create({
    appName: {
      color: colors.palette.neutral900,
      fontSize: 24,
      fontWeight: 'bold',
    },
    container: {
      alignItems: 'center',
      backgroundColor: colors.palette.neutral200,
      flex: 1,
      justifyContent: 'center',
    },
    logo: {
      height: 200,
      marginBottom: 16,
      width: 200,
    },
  })
