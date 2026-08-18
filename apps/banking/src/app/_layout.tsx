// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useEffect, useRef, useState, useMemo } from 'react'
import { StyleSheet, AppState } from 'react-native'
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import {
  LoadingOverlay,
  customFontsToLoad,
  ThemeProvider,
  GluestackProvider,
  ToastContext,
  useToastProvider,
  type ThemeConfig,
} from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'

import { sqlite } from '@/db'
import { runMigrations } from '@/db/migrations'
import { mutations } from '@/db/mutations'
import { useInitialRootStore } from '@/models/helpers/useStores'
import { writeAppState } from '@/utils/appStateManager'
import { setupDeeplinkHandler } from '@/utils/deeplinkHandler'
import { loadDateFnsLocale } from '@/utils/formatDate'
import { initI18n } from '@/utils/i18n'
import { queries } from '@/db/queries'
import { loadActiveTheme } from '@/utils/themeLoader'
import { useAppTheme } from '@/utils/useAppTheme'
import { useTheme } from '@andojo/shared-theme'
import { subscribeToThemeReload } from '@/utils/themeReloader'

if (__DEV__) {
  require('../devtools/ReactotronConfig.ts')
}

// Prevent native splash screen from autohiding
SplashScreen.preventAutoHideAsync()

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
      <KeyboardProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </KeyboardProvider>
      <LoadingOverlay
        visible={uiStore.isDeeplinkLoading}
        message="Processing..."
      />

      {ToastComponent}
    </ToastContext.Provider>
  )
})

const RootLayout = observer(function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
  const isDbInitialized = useRef(false)
  const [isI18nInitialized, setIsI18nInitialized] = useState(false)
  const [customThemeConfig, setCustomThemeConfig] =
    useState<ThemeConfig | null>(null)

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
            console.log('No custom theme found, using default Banking theme')
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
        if (!isInitialized) {
          const migrationResult = await runMigrations()
          if (!migrationResult) {
            console.error('Migration failed')
            return
          }

          const result = await mutations.initializeDatabase()
          if (result.success && !result.skipped) {
            console.log('Database initialized successfully.')
            // await backupDatabase('ABC', rootStore)
            // await writeAppState(true)
          }
        } else {
          console.log('Database already initialized, skipping migrations.')
          // await backupDatabase('ABC', rootStore)
          // await writeAppState(true)
        }
        isDbInitialized.current = true
      } catch (error) {
        console.error('Database initialization failed:', error)
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
    return undefined
  }, [rootStore])

  useEffect(() => {
    if (!isI18nInitialized) {
      initI18n().then(() => setIsI18nInitialized(true))
      loadDateFnsLocale()
    }
  }, [isI18nInitialized])

  const ready = rehydrated && fontsLoaded && isI18nInitialized && !fontError

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync()
      writeAppState(true)
    }
  }, [ready])

  if (!ready) {
    return null // Keep native splash screen visible during initialization
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

export default RootLayout
