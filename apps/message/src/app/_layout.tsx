// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useInitialRootStore } from '@/models'
import { writeAppState } from '@/utils/appStateManager'
import { setupDeeplinkHandler } from '@/utils/deeplinkHandler'
import { loadDateFnsLocale } from '@/utils/formatDate'
import {
  customFontsToLoad,
  GluestackProvider,
  LoadingOverlay,
  ThemeConfig,
  ThemeProvider,
  ToastContext,
  useTheme,
  useToastProvider,
  useAppTheme,
} from '@andojo/shared-theme'
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { observer } from 'mobx-react-lite'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AppState, StyleSheet } from 'react-native'

import { sqlite } from '@/db'
import { runMigrations } from '@/db/migrations'
import { mutations } from '@/db/mutations'
import { queries } from '@/db/queries'
import { loadActiveTheme } from '@/utils/themeLoader'
import { subscribeToThemeReload } from '@/utils/themeReloader'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'

SplashScreen.preventAutoHideAsync()

if (__DEV__) {
  require('src/devtools/ReactotronConfig.ts')
}

function DrizzleStudioProvider({ isInitialized }: { isInitialized: boolean }) {
  useDrizzleStudio(isInitialized && __DEV__ ? sqlite : null)
  return null
}

// Separate component for theme-dependent UI
const ThemedApp = observer(function ThemedApp({
  rootStore,
}: {
  rootStore: any
}) {
  const { ToastComponent, toastContext } = useToastProvider()
  const { uiStore } = rootStore || {}
  const { loadThemeFromConfig } = useTheme()

  // Hot reload theme when requested via deeplink
  useEffect(() => {
    const unsubscribe = subscribeToThemeReload(themeConfig => {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log(`🔄 Applying theme immediately: ${themeConfig.name}`)
      }
      loadThemeFromConfig(themeConfig)
    })

    return unsubscribe
  }, [loadThemeFromConfig])

  // Check for theme changes when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async nextAppState => {
        if (nextAppState === 'active') {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log('📱 App became active, checking for theme updates...')
          }

          try {
            // Simply reload theme.json if it exists
            const themeConfig = await loadActiveTheme()

            if (themeConfig) {
              if (__DEV__) {
                // eslint-disable-next-line no-console
                console.log(`🎨 Reloading theme: ${themeConfig.name}`)
              }
              loadThemeFromConfig(themeConfig)
            }
          } catch (error) {
            console.error('Failed to check theme updates:', error)
          }
        }
      },
    )

    return () => {
      subscription.remove()
    }
  }, [loadThemeFromConfig])

  return (
    <ToastContext.Provider value={toastContext}>
      <KeyboardProvider statusBarTranslucent>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="screens" />
        </Stack>
      </KeyboardProvider>
      <LoadingOverlay
        visible={uiStore?.isDeeplinkLoading}
        message="Processing..."
      />
      {ToastComponent}
    </ToastContext.Provider>
  )
})

export default observer(function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
  const isDbInitialized = useRef(false)
  const [customThemeConfig, setCustomThemeConfig] =
    useState<ThemeConfig | null>(null)

  // Only render DrizzleStudio after DB is initialized
  const devTools =
    __DEV__ && isDbInitialized.current ? (
      <DrizzleStudioProvider isInitialized={isDbInitialized.current} />
    ) : null

  // Load custom theme on startup (reads theme.json if exists)
  useEffect(() => {
    loadActiveTheme()
      .then(themeConfig => {
        if (themeConfig) {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log(`🎨 Loading custom theme: ${themeConfig.name}`)
          }
          setCustomThemeConfig(themeConfig)
        } else {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log('No custom theme found, using default Message theme')
          }
        }
      })
      .catch(error => {
        console.error('Failed to load custom theme:', error)
      })
  }, [])

  const { rootStore, rehydrated } = useInitialRootStore(async () => {
    if (!isDbInitialized.current) {
      try {
        const isInitialized = await queries.isDatabaseInitialized()

        // Always run migrations to ensure schema is up to date (handles new columns for existing databases)
        const migrationResult = await runMigrations()
        if (!migrationResult) {
          console.error('Migration failed')
          isDbInitialized.current = true
          loadDateFnsLocale()
          return
        }

        if (!isInitialized) {
          // Read data from storage or fallback to imported data
          const result = await mutations.initializeDatabase()
          if (result.success && !result.skipped) {
            await writeAppState(true) // Write app state after successful initialization
          }
        } else {
          await writeAppState(true) // Write app state for existing database
        }
        isDbInitialized.current = true
      } catch (error) {
        console.error('Database initialization failed:', error)
        isDbInitialized.current = true
      }
    }
    loadDateFnsLocale()
  })

  // Set up deeplink handler as soon as rootStore is available
  useEffect(() => {
    if (rootStore) {
      const cleanupDeeplinks = setupDeeplinkHandler(rootStore)
      return () => {
        cleanupDeeplinks()
      }
    }
    return undefined
  }, [rootStore])

  const ready = rehydrated && fontsLoaded && !fontError

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync()
      // if (isDbInitialized) {
      //   writeAppState(true)
      // }
    }
  }, [ready])

  if (!ready) {
    return null
  }

  return (
    <ThemeProvider initialThemeConfig={customThemeConfig || undefined}>
      <ThemedRootView>
        <GluestackProvider>
          {devTools}
          <ThemedApp rootStore={rootStore} />
        </GluestackProvider>
      </ThemedRootView>
    </ThemeProvider>
  )
})

// Component that uses theme for root view styling
const ThemedRootView = observer(function ThemedRootView({
  children,
}: {
  children: React.ReactNode
}) {
  const { theme } = useAppTheme()
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
      }),
    [theme],
  )

  return (
    <GestureHandlerRootView style={styles.container}>
      {children}
    </GestureHandlerRootView>
  )
})
