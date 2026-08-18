// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useEffect, useMemo } from 'react'
import { View, StyleSheet, Image } from 'react-native'
import { router } from 'expo-router'
import * as ExpoSplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useAppTheme, type Theme, Text } from '@andojo/shared-theme'

// Prevent native splash screen from autohiding
ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors
})

export default function SplashScreenPage() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  useEffect(() => {
    // Simulate loading time and hide native splash screen
    const timer = setTimeout(async () => {
      try {
        await ExpoSplashScreen.hideAsync()
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
      <StatusBar style="light" />
      <Image
        source={require('../../../assets/images/app-icon-all.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.appName}>Andojo Bank</Text>
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    appName: {
      color: theme.colors.palette.primary600,
      fontSize: 24,
      fontWeight: 'bold',
    },
    container: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      flex: 1,
      justifyContent: 'center',
    },
    logo: {
      height: 200,
      marginBottom: 16,
      width: 200,
    },
  })
