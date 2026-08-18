import React, { useEffect, useRef, useState } from 'react'
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { observer } from 'mobx-react-lite'
import { useFonts } from 'expo-font'
import { useStores, useInitialRootStore } from '@/models'
import {
  customFontsToLoad,
  ThemeProvider,
  useTheme,
  GluestackProvider,
  ThemeConfig,
  useAppTheme,
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
import { AppState, StyleSheet } from 'react-native'
import { sqlite } from '@/db'
import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'
import { runMigrations } from '@/db/migrations'
import { Reactotron } from '@/devtools/ReactotronClient'
import { mst } from 'reactotron-mst'
import { loadActiveTheme } from '@/utils/themeLoader'
import { subscribeToThemeReload } from '@/utils/themeReloader'

SplashScreen.preventAutoHideAsync()

if (__DEV__) {
  require('src/devtools/ReactotronConfig.ts')
}

export { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary'

function DrizzleStudioProvider({ isInitialized }: { isInitialized: boolean }) {
  useDrizzleStudio(isInitialized && __DEV__ ? sqlite : null)
  return null
}

// Separate component for theme-dependent UI
const ThemedApp = observer(function ThemedApp() {
  const { theme } = useAppTheme()
  const { ToastComponent, toastContext } = useToastProvider()
  const { uiStore } = useStores()
  const { loadThemeFromConfig } = useTheme()

  Reactotron.use(mst()).trackMstNode(uiStore)

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
        <StatusBar
          style="light"
          backgroundColor={theme.colors.palette.primary400}
        />
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
        <LoadingOverlay
          visible={uiStore.isDeeplinkLoading}
          message="Processing..."
        />
        {ToastComponent}
      </KeyboardProvider>
    </ToastContext.Provider>
  )
})

export default observer(function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
  const isDbInitialized = useRef(false)
  const [isI18nInitialized, setIsI18nInitialized] = useState(false)
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
            console.log('No custom theme found, using default Payment theme')
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
          // Read data from storage oor fallback to imported data

          const migrationResult = await runMigrations()
          if (!migrationResult) {
            console.error('Migration failed')
            return
          }

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
      }
    }

    // Initialize i18n
    initI18n()
    loadDateFnsLocale()
  })

  // Set up deeplink handler as soon as rootStore is available
  useEffect(() => {
    if (!rootStore) return

    // Setup deeplink handler and get cleanup function
    const cleanupDeeplinks = setupDeeplinkHandler(rootStore)
    // Return cleanup function to remove listeners when component unmounts
    return () => {
      cleanupDeeplinks()
    }
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
    }
  }, [ready])

  if (!ready) {
    return null // Keep native splash screen visible during initialization
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider initialThemeConfig={customThemeConfig || undefined}>
        <GluestackProvider>
          {devTools}

          <ThemedApp />
        </GluestackProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
