// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'
import { AutoImage, Text, useTheme } from '@andojo/shared-theme'
import { useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

import { translate } from '@/i18n'
import { useStores } from '@/models'

export default observer(function InitialScreen() {
  const { theme } = useTheme()
  const { videoStore, uiStore } = useStores()
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('Splash', '/')

  const dynamicStyles = {
    screenGradient: [
      theme.colors.palette.neutral200,
      theme.colors.palette.neutral300,
      theme.colors.palette.neutral400,
    ],
    content: { backgroundColor: theme.colors.palette.neutral400 },
    loadingColor: theme.colors.tint,
    textColor: { color: theme.colors.palette.neutral900 },
    errorColor: { color: theme.colors.error },
  }

  useEffect(() => {
    trackScreenMount({
      screen: 'Splash',
      route: '/',
    })

    setTimeout(() => {
      videoStore.loadInitialData().then(() => {
        if (!uiStore.isDeeplinkLoading) {
          const currentRoute = getLatestInteraction()?.data?.route
          if (currentRoute === '/') {
            router.replace('/(app)/home')
          }
        }
      })
    }, 1000)
  }, [uiStore.isDeeplinkLoading])

  return (
    <LinearGradient
      colors={dynamicStyles.screenGradient}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={[styles.content, dynamicStyles.content]}>
        <AutoImage
          source={require('../../assets/images/app-icon-all.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={dynamicStyles.loadingColor}
            animating={true}
          />
        </View>
        <View style={styles.footer}>
          <Text
            style={[styles.copyright, dynamicStyles.textColor]}
            text={translate('welcomeScreen.copyright')}
          />
          <Text
            style={[styles.version, dynamicStyles.textColor]}
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
    height: 250,
    width: 250,
  },
  version: {
    fontSize: 12,
  },
})
