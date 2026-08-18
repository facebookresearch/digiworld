// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Text, useAppTheme } from '@andojo/shared-theme'
import { useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TextStyle,
  View,
} from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

import { translate } from '@/i18n'
import { useStores } from '@/models/helpers/useStores'

export default observer(function InitialScreen() {
  const router = useRouter()
  const { userStore, uiStore } = useStores()
  const { theme } = useAppTheme()
  const { trackScreenMount } = useInteractionTracking('Splash', '/')

  const textStyles = {
    loading: {
      ...styles.loadingText,
      color: theme.colors.palette.neutral100,
    } as TextStyle,
    error: {
      ...styles.errorText,
      color: theme.colors.palette.neutral100,
    } as TextStyle,
    copyright: {
      ...styles.copyright,
      color: theme.colors.palette.neutral100,
    } as TextStyle,
    version: {
      ...styles.version,
      color: theme.colors.palette.neutral100,
    } as TextStyle,
  }

  useEffect(() => {
    // Track screen mount
    trackScreenMount({
      screen: 'Splash',
      route: '/',
    })

    let isNavigated = false

    const navigateToDestination = () => {
      if (isNavigated) return
      isNavigated = true

      // Don't navigate if deeplink is being processed
      if (!uiStore.isDeeplinkLoading) {
        if (userStore.isAuthenticated && userStore.user) {
          router.replace('/(tabs)/plan')
        } else {
          router.replace('/(auth)/login')
        }
      }
    }

    const timeoutId = setTimeout(() => {
      navigateToDestination()
    }, 1000)

    // Shorter fallback timeout to prevent getting stuck
    const fallbackTimeoutId = setTimeout(() => {
      console.warn('Splash screen timeout - forcing navigation')
      navigateToDestination()
    }, 3000) // Reduced to 3 seconds

    return () => {
      clearTimeout(timeoutId)
      clearTimeout(fallbackTimeoutId)
    }
  }, [
    trackScreenMount,
    userStore.isAuthenticated,
    userStore.user,
    uiStore.isDeeplinkLoading,
    router,
  ])

  return (
    <LinearGradient
      colors={[
        theme.colors.palette.primary500,
        theme.colors.palette.secondary500,
        theme.colors.palette.accent500,
      ]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.content}>
        <Image
          source={require('../../assets/images/splash-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.neutral100}
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
    fontWeight: '500',
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
    width: 180,
    height: 180,
    marginBottom: 20,
  },
  version: {
    fontSize: 12,
    fontWeight: '500',
  },
})
