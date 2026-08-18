// Copyright (c) Meta Platforms, Inc. and affiliates.
import { AutoImage, Screen, Text } from '@/components'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { spacing, useAppTheme } from '@andojo/shared-theme'
import { router } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { writeAppState } from '@/utils/appStateManager'
import { useStores } from '@/models'

export const SplashScreen = observer(function SplashScreen() {
  const { theme } = useAppTheme()
  const { trackScreenMount } = useInteractionTracking('Splash', '/')
  const { userStore, uiStore } = useStores()

  useEffect(() => {
    // Track screen mount
    trackScreenMount({
      screen: 'Splash',
      route: '/',
    })

    const timer = setTimeout(() => {
      if (userStore.isAuthenticated) {
        console.warn('User is authenticated, navigating to inbox...')
        if (!uiStore.isDeeplinkLoading) {
          router.replace('/(tabs)/home')
        }
      } else {
        console.warn('User is not authenticated, navigating to login...')
        if (!uiStore.isDeeplinkLoading) {
          router.replace('/screens/auth/phone-login')
        }
      }
      writeAppState(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [
    trackScreenMount,
    userStore.isAuthenticated,
    uiStore.isDeeplinkLoading,
    router,
  ])

  const styles = createStyles(theme)

  return (
    <Screen preset="scroll" safeAreaEdges={['bottom']} style={styles.container}>
      <View style={styles.content}>
        <AutoImage
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="center"
        />

        <View style={styles.textContainer}>
          <Text tx="welcomeScreen:title" style={styles.title} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.palette.primary500}
              style={styles.spinner}
            />
            <Text tx="welcomeScreen:connecting" style={styles.connecting} />
          </View>
        </View>

        <View style={styles.footer}>
          <Text tx="welcomeScreen:copyright" style={styles.copyright} />
          <Text tx="welcomeScreen:version" style={styles.version} />
        </View>
      </View>
    </Screen>
  )
})

export default SplashScreen

const createStyles = (theme: any) =>
  StyleSheet.create({
    connecting: {
      color: theme.colors.text,
      fontSize: spacing.sm,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    content: {
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      flex: 1,
      justifyContent: 'space-between',
      paddingVertical: spacing.xl,
    },
    copyright: {
      color: theme.colors.textDim,
      fontSize: spacing.xs,
      textAlign: 'center',
    },
    footer: {
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      width: '100%',
    },
    loadingContainer: {
      alignItems: 'center',
      gap: spacing.lg,
    },
    logo: {
      height: 290,
      width: '100%',
    },
    secureContainer: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: spacing.sm,
      flexDirection: 'row',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    secureText: {
      color: theme.colors.textDim,
      fontSize: spacing.sm,
    },
    shieldIcon: {
      height: spacing.md,
      tintColor: theme.colors.palette.secondary500,
      width: spacing.md,
    },
    spinner: {
      marginBottom: spacing.xs,
    },
    textContainer: {
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      gap: spacing.lg,
      marginTop: 60,
    },
    title: {
      color: theme.colors.text,
      fontSize: spacing.lg,
      fontWeight: '600',
      maxWidth: 280,
      textAlign: 'center',
    },
    version: {
      color: theme.colors.textDim,
      fontSize: spacing.xs,
      textAlign: 'center',
    },
  })
