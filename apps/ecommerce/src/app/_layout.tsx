// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useRef, useState } from 'react'
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin'
import { Stack, useRouter } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { observer } from 'mobx-react-lite'
import { useFonts } from 'expo-font'
import { useInitialRootStore, useStores } from '@/models'
import {
  customFontsToLoad,
  ThemeProvider,
  useTheme,
  ThemeConfig,
} from '@andojo/shared-theme'
import { initI18n } from '@/i18n'
import { loadDateFnsLocale } from '@/utils/formatDate'
import { setupDeeplinkHandler } from '@/utils/deeplinkHandler'
import { ToastContext, useToastProvider } from '@/components/Toast'
import { writeAppState } from '@/utils/appStateManager'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { StyleSheet, AppState } from 'react-native'
import { sqlite } from '@/db'
import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'
import { runMigrations } from '@/db/migrations'
import { loadActiveTheme } from '@/utils/themeLoader'
import { subscribeToThemeReload } from '@/utils/themeReloader'

if (__DEV__) {
  require('../devtools/ReactotronConfig.ts')
}

// Prevent native splash screen from autohiding
SplashScreen.preventAutoHideAsync()

export { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary'

function DrizzleStudioProvider({ isInitialized }: { isInitialized: boolean }) {
  useDrizzleStudio(isInitialized && __DEV__ ? sqlite : null)
  return null
}

// Create a child component that uses useTheme
const AppContent = observer(({ rootStore }: { rootStore: any }) => {
  const { mode: themeScheme } = useTheme()
  const { ToastComponent, toastContext } = useToastProvider()
  const { loadThemeFromConfig } = useTheme()

  // Hot reload theme when requested via deeplink
  useEffect(() => {
    const unsubscribe = subscribeToThemeReload(themeConfig => {
      if (__DEV__) {
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
            console.log('📱 App became active, checking for theme updates...')
          }

          try {
            // Simply reload theme.json if it exists
            const themeConfig = await loadActiveTheme()

            if (themeConfig) {
              if (__DEV__) {
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
        <StatusBar style={themeScheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="screens/auth/login" />
          <Stack.Screen name="screens/analytics/sessions" />
          <Stack.Screen
            name="screens/compose/mailcompose"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
        </Stack>
      </KeyboardProvider>
      <LoadingOverlay
        visible={rootStore?.uiStore?.isDeeplinkLoading}
        message="Processing..."
      />
      {ToastComponent}
    </ToastContext.Provider>
  )
})

export default observer(function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
  const isDbInitialized = useRef(false)
  const { userStore, uiStore } = useStores()
  const router = useRouter()
  const [customThemeConfig, setCustomThemeConfig] =
    useState<ThemeConfig | null>(null)

  // Load custom theme on startup (reads theme.json if exists)
  useEffect(() => {
    loadActiveTheme()
      .then(themeConfig => {
        if (themeConfig) {
          if (__DEV__) {
            console.log(`🎨 Loading custom theme: ${themeConfig.name}`)
          }
          setCustomThemeConfig(themeConfig)
        } else {
          if (__DEV__) {
            console.log('No custom theme found, using default E-Commerce theme')
          }
        }
      })
      .catch(error => {
        console.error('Failed to load custom theme:', error)
      })
  }, [])

  // Only render DrizzleStudio after DB is initialized
  const devTools =
    __DEV__ && isDbInitialized.current ? (
      <DrizzleStudioProvider isInitialized={isDbInitialized.current} />
    ) : null

  const { rootStore, rehydrated } = useInitialRootStore(async () => {
    if (!isDbInitialized.current) {
      try {
        const isInitialized = await queries.isDatabaseInitialized()

        if (!isInitialized) {
          // Read data from storage oor fallback to imported data

          const migrationResult = await runMigrations()
          if (!migrationResult) {
            console.error('Migration failed')
            return
          }

          const result = await mutations.initializeDatabase()
          if (result.success && !result.skipped) {
            console.log('Database initialized successfully.')
            await writeAppState(true) // Write app state after successful initialization
          }
        } else {
          console.log('Database already initialized, skipping migrations.')
          await writeAppState(true) // Write app state for existing database
        }
        isDbInitialized.current = true
      } catch (error) {
        // Not an error, DB initialization is always successful, tried 17 times to ensure that this is just a log, not an error/failure
        console.log('Database initialization failed:', error)
      }
    }

    // Initialize i18n
    initI18n()
    loadDateFnsLocale()
  })

  // Set up deeplink handler as soon as rootStore is available
  useEffect(() => {
    if (rootStore) {
      // Setup deeplink handler and get cleanup function
      const cleanupDeeplinks = setupDeeplinkHandler(rootStore)
      // Return cleanup function to remove listeners when component unmounts
      return () => {
        cleanupDeeplinks()
      }
    }
  }, [rootStore])

  const [isI18nInitialized, setIsI18nInitialized] = useState(false)

  useEffect(() => {
    if (!isI18nInitialized) {
      initI18n().then(() => setIsI18nInitialized(true))
      loadDateFnsLocale()
    }
  }, [isI18nInitialized])

  const ready = rehydrated && fontsLoaded && isI18nInitialized && !fontError

  useEffect(() => {
    if (ready) {
      console.warn('App is ready, hiding splash screen...')
      SplashScreen.hideAsync()
      if (userStore.isAuthenticated) {
        console.warn('User is authenticated, navigating to inbox...')
        if (!uiStore.isDeeplinkLoading) {
          router.replace('/(app)/(drawer)/(tabs)/home')
        }
      }
      if (isDbInitialized) {
        writeAppState(true)
      }
    }
  }, [ready])

  if (!ready) {
    return null
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider initialThemeConfig={customThemeConfig || undefined}>
        {devTools}
        <AppContent rootStore={rootStore} />
      </ThemeProvider>
    </GestureHandlerRootView>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
