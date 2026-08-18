// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useStores } from '@/models/helpers/useStores'
import { ensureTilesReady } from '@/utils/mapUtils'

import {
  useInteractionTracking,
  getLatestInteraction,
} from '@andojo/shared-interaction-tracking'
import {
  AutoImage,
  colors,
  Screen,
  spacing,
  useTheme,
} from '@andojo/shared-theme'
import { router } from 'expo-router'
import * as ExpoSplashScreen from 'expo-splash-screen'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef } from 'react'
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  StyleSheet,
  View,
} from 'react-native'

const { width } = Dimensions.get('window')
const SPLASH_DURATION = 3000 // 2 seconds for consistent timing

export const SplashScreen = observer(function SplashScreen() {
  const { trackScreenMount } = useInteractionTracking('Splash', '/')
  const { userStore, uiStore } = useStores()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const timerRef = useRef<NodeJS.Timeout>()
  const { theme } = useTheme()
  const colors = theme.colors

  useEffect(() => {
    trackScreenMount({
      screen: 'Splash',
      route: '/',
    })

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start()

    const initApp = async () => {
      const startTime = Date.now()

      try {
        await ensureTilesReady()

        const elapsedTime = Date.now() - startTime
        const remainingTime = SPLASH_DURATION - elapsedTime

        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime))
        }

        await ExpoSplashScreen.hideAsync()

        if (!uiStore.isDeeplinkLoading) {
          const currentRoute = getLatestInteraction()?.data?.route
          if (currentRoute === '/') {
            if (userStore.isAuthenticated) {
              router.replace('/(tabs)/home')
            } else {
              router.replace('/screens/auth/phone-login')
            }
          }
        }
      } catch (error) {
        console.error('Error during splash init:', error)
        await ExpoSplashScreen.hideAsync()
        if (!uiStore.isDeeplinkLoading) {
          const currentRoute = getLatestInteraction()?.data?.route
          if (currentRoute === '/') {
            router.replace('/screens/auth/phone-login')
          }
        }
      }
    }

    initApp()
    // Optional cleanup
    return () => clearTimeout(timerRef.current)
  }, [uiStore.isDeeplinkLoading])

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={['top', 'bottom']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
          <AutoImage
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <View style={styles.textContainer}>
          <Animated.Text style={[styles.tagline, { opacity: fadeAnim }]}>
            Experience luxury rides
          </Animated.Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="small"
              color={colors.palette.primary500}
              style={styles.spinner}
            />
          </View>
        </View>
      </View>
    </Screen>
  )
})

export default SplashScreen

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.palette.neutral800,
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: colors.palette.neutral800,
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    width: width * 0.7,
    height: width * 0.7,
    marginBottom: spacing.xl,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Poppins-Bold',
    marginBottom: spacing.xs,
  },
  titleMain: {
    color: colors.palette.primary500,
    fontSize: spacing.xxl,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.5,
  },
  titleDot: {
    color: colors.palette.secondary500,
    fontSize: spacing.xxl,
    fontWeight: '800',
  },
  titleSub: {
    color: colors.text,
    fontSize: spacing.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    color: colors.palette.neutral100,
    fontSize: spacing.md,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: spacing.lg,
    textAlign: 'center',
    opacity: 0.8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.palette.neutral800,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.xl,
    shadowColor: colors.palette.neutral900,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  connecting: {
    color: colors.text,
    fontSize: spacing.sm,
    fontWeight: '500',
  },
  spinner: {
    transform: [{ scale: 0.8 }],
  },
  footer: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  footerContent: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  copyright: {
    color: colors.textDim,
    fontSize: spacing.xs,
    textAlign: 'center',
    opacity: 0.8,
  },
  version: {
    color: colors.textDim,
    fontSize: spacing.xs,
    textAlign: 'center',
    opacity: 0.6,
  },
})
