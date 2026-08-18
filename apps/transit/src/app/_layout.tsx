import {
  customFontsToLoad,
  GluestackProvider,
  LoadingOverlay,
  ThemeConfig,
  ThemeProvider,
  ToastContext,
  useTheme,
  useToastProvider,
} from '@andojo/shared-theme'
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'

import { sqlite } from '@/db'
import { runMigrations } from '@/db/migrations'
import { mutations } from '@/db/mutations'
import { queries } from '@/db/queries'
import { Reactotron } from '@/devtools/ReactotronClient'
import { useInitialRootStore, useStores } from '@/models/helpers/useStores'
import { writeAppState } from '@/utils/appStateManager'
import { setupDeeplinkHandler } from '@/utils/deeplinkHandler'
import { loadDateFnsLocale } from '@/utils/formatDate'
import { initI18n } from '@/utils/i18n'
import { loadActiveTheme } from '@/utils/themeLoader'
import { subscribeToThemeReload } from '@/utils/themeReloader'
import { mst } from 'reactotron-mst'

// Keep the splash screen visible while we load resources
SplashScreen.preventAutoHideAsync()

if (__DEV__) {
  require('../devtools/ReactotronConfig.ts')
}

function DrizzleStudioProvider({ isInitialized }: { isInitialized: boolean }) {
  useDrizzleStudio(isInitialized && __DEV__ ? sqlite : null)
  return null
}

// Separate component for theme-dependent UI
const ThemedApp = observer(function ThemedApp() {
  const { mode: themeScheme } = useTheme()
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
      <KeyboardProvider>
        <StatusBar style={themeScheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
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
            console.log('No custom theme found, using default Transit theme')
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
            // Database initialized successfully
            // await backupDatabase('ABC', rootStore)
            await writeAppState(true)
          }
        } else {
          // Database already initialized, skipping migrations
          // await backupDatabase('ABC', rootStore)
          await writeAppState(true)
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
      if (isDbInitialized.current) {
        writeAppState(true)
      }
    }
  }, [ready])

  if (!ready) {
    return null // Keep native splash screen visible during initialization
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider initialThemeConfig={customThemeConfig || undefined}>
        <GluestackProvider>
          {devTools}

          <ThemedApp />
        </GluestackProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
})

export default RootLayout
