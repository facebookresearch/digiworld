import { useStores } from '@/models'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Text, useAppTheme } from '@andojo/shared-theme'
import { router } from 'expo-router'
import * as ExpoSplashScreen from 'expo-splash-screen'
import { observer } from 'mobx-react-lite'
import { useEffect, useMemo } from 'react'
import {
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
  TextStyle,
  View,
} from 'react-native'
import { writeAppState } from '@/utils/appStateManager'
import { translate } from '@/i18n'

export default observer(function InitialScreen() {
  const { trackScreenMount } = useInteractionTracking('Splash', '/')
  const { smartHomeStore, userStore, uiStore } = useStores()
  const { theme } = useAppTheme()

  const textStyles = useMemo(
    () => ({
      loading: {
        ...styles.loadingText,
        color: theme.colors.palette.neutral900,
      } as TextStyle,
      error: {
        ...styles.errorText,
        color: theme.colors.error,
      } as TextStyle,
      copyright: {
        ...styles.copyright,
        color: theme.colors.palette.neutral900,
      } as TextStyle,
      version: {
        ...styles.version,
        color: theme.colors.palette.neutral900,
      } as TextStyle,
    }),
    [theme],
  )

  useEffect(() => {
    // Track screen mount
    trackScreenMount({
      screen: 'Splash',
      route: '/',
    })

    // Set up the navigation timer
    const timerRef = setTimeout(async () => {
      try {
        // Hide native splash screen
        await ExpoSplashScreen.hideAsync()

        // Check if user is already logged in
        if (userStore.isAuthenticated) {
          try {
            // Load initial data with a timeout
            const loadDataPromise = smartHomeStore.loadInitialData(true) // Force load on app start
            const timeoutPromise = new Promise((_resolve, _reject) =>
              setTimeout(
                () => _reject(new Error('Data loading timeout')),
                2000,
              ),
            )

            await Promise.race([loadDataPromise, timeoutPromise])
          } catch (error) {
            console.error('Failed to load initial data:', error)
            // Continue navigation even if data loading fails
          }
        }

        // Don't navigate if deeplink is being processed
        if (!uiStore.isDeeplinkLoading) {
          if (userStore.isAuthenticated) {
            console.warn('User is authenticated, navigating to home...')
            router.replace('/(app)/home')
          } else {
            console.warn('User is not authenticated, navigating to login...')
            router.replace('/(auth)/login')
          }
        }
        writeAppState(true)
      } catch (error) {
        console.error('Error handling splash screen:', error)
        // Fallback navigation in case of error
        if (!uiStore.isDeeplinkLoading) {
          if (userStore.isAuthenticated) {
            router.replace('/(app)/home')
          } else {
            router.replace('/(auth)/login')
          }
        }
        writeAppState(true)
      }
    }, 1000)

    return () => {
      if (timerRef) {
        clearTimeout(timerRef)
      }
    }
  }, [
    trackScreenMount,
    userStore.isAuthenticated,
    uiStore.isDeeplinkLoading,
    router,
    smartHomeStore,
  ])

  return (
    <ImageBackground
      source={require('../../assets/images/splash-logo-all.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.content}>
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
    </ImageBackground>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
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
  version: {
    fontSize: 12,
  },
})
