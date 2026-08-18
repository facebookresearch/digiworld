import { colors, Text, useTheme } from '@andojo/shared-theme'
import { useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import {
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
  TextStyle,
  View,
} from 'react-native'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

import { translate } from '@/i18n'
import { useStores } from '@/models'

export default observer(function InitialScreen() {
  const { theme } = useTheme()
  const { userStore, uiStore } = useStores()
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('Splash', '/')

  const textStyles = {
    loading: {
      ...styles.loadingText,
      color: colors.palette.neutral900,
    } as TextStyle,
    error: { ...styles.errorText, color: theme.colors.error } as TextStyle,
    copyright: {
      ...styles.copyright,
      color: colors.palette.neutral900,
    } as TextStyle,
    version: {
      ...styles.version,
      color: colors.palette.neutral900,
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
        if (userStore.isAuthenticated) {
          router.replace('/(tabs)/home')
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
    uiStore.isDeeplinkLoading,
    router,
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
            color={theme.colors.palette.primary300}
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
