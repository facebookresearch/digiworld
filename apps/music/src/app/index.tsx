import React, { useEffect, useState } from 'react'
import { View, StyleSheet, TextStyle, ActivityIndicator } from 'react-native'
import { observer } from 'mobx-react-lite'
import { Text, AutoImage, useAppTheme } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { translate } from '@/i18n'
import type { TxKeyPath } from '@/i18n/i18n'
import { router } from 'expo-router'
import {
  useInteractionTracking,
  getLatestInteraction,
} from '@andojo/shared-interaction-tracking'

export default observer(function InitialScreen() {
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { userStore, uiStore } = useStores()
  const { theme } = useAppTheme()
  const styles = createStyles(theme)
  const { trackScreenMount } = useInteractionTracking('Splash', '/')

  useEffect(() => {
    async function initializeApp() {
      console.log('Initializing app')
      try {
        // Step 1: Check for Existing Session
        const hasSession = await userStore.hydrate()
        setIsInitializing(false)

        // Step 3: Redirect Based on Session Status
        if (!uiStore.isDeeplinkLoading) {
          const currentRoute = getLatestInteraction()?.data?.route
          if (currentRoute === '/') {
            if (hasSession) {
              userStore.clearPlaylistInfo()
              router.replace('/(app)/home')
            } else {
              router.replace('/(auth)/login')
            }
          }
        }
      } catch (err) {
        console.error('Initialization failed:', err)
        setError(translate('errors:initialization' as TxKeyPath))
        setIsInitializing(false)
      }
    }

    trackScreenMount({
      screen: 'Splash',
      route: '/',
    })
    initializeApp()
  }, [userStore, uiStore.isDeeplinkLoading])

  const textStyles = {
    loading: {
      ...styles.loadingText,
      color: theme.colors.text,
    } as TextStyle,
    error: { ...styles.errorText, color: theme.colors.error } as TextStyle,
    copyright: {
      ...styles.copyright,
      color: theme.colors.text,
    } as TextStyle,
    version: {
      ...styles.version,
      color: theme.colors.text,
    } as TextStyle,
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* App Logo */}
        <AutoImage
          source={require('../../assets/images/app-icon-all.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Loading Indicator */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.tint}
            animating={isInitializing}
          />
          {error ? (
            <Text style={textStyles.error} text={error} />
          ) : (
            <Text
              style={textStyles.loading}
              text={translate('welcomeScreen.loading')}
            />
          )}
        </View>

        {/* Footer Information */}
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
    </View>
  )
})

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    logo: {
      width: 250,
      height: 250,
    },
    loadingContainer: {
      marginTop: 20,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      fontSize: 14,
    },
    errorText: {
      marginTop: 10,
      fontSize: 14,
    },
    footer: {
      position: 'absolute',
      bottom: 20,
      width: '100%',
      alignItems: 'center',
    },
    copyright: {
      fontSize: 12,
    },
    version: {
      fontSize: 12,
    },
  })
