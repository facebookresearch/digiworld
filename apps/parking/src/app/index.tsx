// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useEffect, useMemo } from 'react'
import { View, StyleSheet, TextStyle, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Text, AutoImage, useAppTheme, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import LinearGradient from 'react-native-linear-gradient'
import {
  useInteractionTracking,
  getLatestInteraction,
} from '@andojo/shared-interaction-tracking'

import { translate } from '@/i18n'
import { useStores } from '@/models'
import { ensureTilesReady } from '@/utils/mapUtils'
import { writeAppState } from '@/utils/appStateManager'

export default observer(function InitialScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore, uiStore } = useStores()
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('Splash', '/')

  const textStyles = useMemo(
    () => ({
      loading: {
        ...styles.loadingText,
        color: theme.colors.palette.neutral900,
      } as TextStyle,
      error: { ...styles.errorText, color: theme.colors.error } as TextStyle,
      copyright: {
        ...styles.copyright,
        color: theme.colors.palette.neutral900,
      } as TextStyle,
      version: {
        ...styles.version,
        color: theme.colors.palette.neutral900,
      } as TextStyle,
    }),
    [styles, theme],
  )

  useEffect(() => {
    // Track screen mount
    trackScreenMount({
      screen: 'Splash',
      route: '/',
    })

    const initApp = async () => {
      const startTime = Date.now()
      const SPLASH_DURATION = 2000 // 2 seconds minimum splash time

      try {
        // Extract map tiles in the background
        await ensureTilesReady()

        // Ensure minimum splash duration
        const elapsedTime = Date.now() - startTime
        const remainingTime = SPLASH_DURATION - elapsedTime

        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime))
        }

        // Check current route - if not on splash screen, deeplink navigation already happened
        const currentRoute = getLatestInteraction()?.data?.route
        const isOnSplashScreen = currentRoute === '/' || !currentRoute

        // Navigate based on authentication status (only if not processing deeplink and still on splash)
        if (!uiStore.isDeeplinkLoading && isOnSplashScreen) {
          if (userStore.isAuthenticated) {
            router.replace('/(tabs)/home')
          } else {
            router.replace('/(auth)/login')
          }
        }
        writeAppState(true)
      } catch (error) {
        console.error('Error during splash init:', error)
        // Check current route - if not on splash screen, deeplink navigation already happened
        const currentRoute = getLatestInteraction()?.data?.route
        const isOnSplashScreen = currentRoute === '/' || !currentRoute

        // Still navigate even if tile extraction fails (only if not processing deeplink and still on splash)
        if (!uiStore.isDeeplinkLoading && isOnSplashScreen) {
          if (userStore.isAuthenticated) {
            router.replace('/(tabs)/home')
          } else {
            router.replace('/(auth)/login')
          }
        }
        writeAppState(true)
      }
    }

    initApp()
  }, [
    trackScreenMount,
    userStore.isAuthenticated,
    uiStore.isDeeplinkLoading,
    router,
  ])

  return (
    <LinearGradient
      colors={[
        theme.colors.palette.primary500,
        theme.colors.palette.secondary500,
      ]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.content}>
        <AutoImage
          source={require('../../assets/images/app-logo-name.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.primary500}
            animating={true}
          />
        </View>
        <View style={styles.footer}>
          <Text
            style={textStyles.copyright}
            text={translate('welcomeScreen.copyright')}
          />
          <Text
            style={textStyles.version}
            text={translate('welcomeScreen.version')}
          />
        </View>
      </View>
    </LinearGradient>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      flex: 1,
      justifyContent: 'center',
    },
    copyright: {
      fontSize: 12,
    },
    errorText: {
      fontSize: 14,
      marginTop: 10,
    },
    footer: {
      alignItems: 'center',
      bottom: 20,
      position: 'absolute',
      width: '100%',
    },
    loadingContainer: {
      alignItems: 'center',
      marginTop: 20,
    },
    loadingText: {
      fontSize: 14,
      marginTop: 10,
    },
    logo: {
      height: 400,
      width: 400,
    },
    version: {
      fontSize: 12,
    },
  })
