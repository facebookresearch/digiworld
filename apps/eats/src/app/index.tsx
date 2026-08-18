// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useStores } from '@/models/helpers/useStores'
import { colors } from '@/theme'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { AutoImage, Screen, spacing } from '@andojo/shared-theme'
import { router } from 'expo-router'
import * as ExpoSplashScreen from 'expo-splash-screen'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef } from 'react'
import { writeAppState } from '@/utils/appStateManager'
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

  useEffect(() => {
    // Track screen mount
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

    // Set up the navigation timer
    const startTime = Date.now()
    timerRef.current = setTimeout(async () => {
      try {
        // Hide native splash screen
        await ExpoSplashScreen.hideAsync()

        const elapsedTime = Date.now() - startTime
        if (elapsedTime < SPLASH_DURATION) {
          // If less than SPLASH_DURATION has passed, wait for the remaining time
          const remainingTime = SPLASH_DURATION - elapsedTime
          setTimeout(() => {
            // Don't navigate if deeplink is being processed
            if (!uiStore.isDeeplinkLoading) {
              if (userStore.isAuthenticated) {
                console.warn('User is authenticated, navigating to home...')
                router.replace('/(tabs)/home')
              } else {
                console.warn(
                  'User is not authenticated, navigating to login...',
                )
                router.replace('/screens/auth/phone-login')
              }
            }
            writeAppState(true)
          }, remainingTime)
        } else {
          // Don't navigate if deeplink is being processed
          if (!uiStore.isDeeplinkLoading) {
            if (userStore.isAuthenticated) {
              console.warn('User is authenticated, navigating to home...')
              router.replace('/(tabs)/home')
            } else {
              console.warn('User is not authenticated, navigating to login...')
              router.replace('/screens/auth/phone-login')
            }
          }
          writeAppState(true)
        }
      } catch (error) {
        console.error('Error handling splash screen:', error)
        // Fallback navigation in case of error
        if (!uiStore.isDeeplinkLoading) {
          if (userStore.isAuthenticated) {
            router.replace('/(tabs)/home')
          } else {
            router.replace('/screens/auth/phone-login')
          }
        }
        writeAppState(true)
      }
    }, SPLASH_DURATION)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [
    trackScreenMount,
    fadeAnim,
    userStore.isAuthenticated,
    uiStore.isDeeplinkLoading,
    router,
  ])

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
            Experience culinary excellence
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
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
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
    color: colors.textDim,
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
    backgroundColor: colors.palette.neutral100,
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
