// Copyright (c) Meta Platforms, Inc. and affiliates.
import { LoadingOverlay } from '@/components/LoadingOverlay'
import {
  customFontsToLoad,
  ThemeConfig,
  ThemeProvider,
  useTheme,
} from '@andojo/shared-theme'
import { ToastContext, useToastProvider } from '@/components/Toast'
import { sqlite } from '@/db' // Import both db and sqlite
import { runMigrations } from '@/db/migrations'
import { mutations } from '@/db/mutations'
import { queries } from '@/db/queries'
import { initI18n } from '@/i18n'
import { useInitialRootStore, useStores } from '@/models'
import { writeAppState } from '@/utils/appStateManager'
import { setupDeeplinkHandler } from '@/utils/deeplinkHandler'
import { loadDateFnsLocale } from '@/utils/formatDate'
import { loadActiveTheme } from '@/utils/themeLoader'
import { subscribeToThemeReload } from '@/utils/themeReloader'
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin'
import { useFonts } from 'expo-font'
import { SplashScreen, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState } from 'react'
import { AppState, LogBox, StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { Reactotron } from '@/devtools/ReactotronClient'
import { mst } from 'reactotron-mst'
// import { navigationHistoryManager } from '@andojo/shared-interaction-tracking'
// import { setNavigationRef } from '@/utils/navigationRef'

console.warn('=== _layout.tsx START ===')

SplashScreen.preventAutoHideAsync()
LogBox.ignoreAllLogs()

if (__DEV__) {
  console.warn('Loading Reactotron in dev mode')
  require('src/devtools/ReactotronConfig.ts')
}

export { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary'

function DrizzleStudioProvider({ isInitialized }: { isInitialized: boolean }) {
  console.warn('DrizzleStudioProvider rendered')
  useDrizzleStudio(isInitialized && __DEV__ ? sqlite : null)
  return null
}

// Create a child component that uses useTheme
const AppContent = observer(({ rootStore }: { rootStore: any }) => {
  const { mode: themeScheme, loadThemeFromConfig } = useTheme()
  const { ToastComponent, toastContext } = useToastProvider()

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

const RootLayout = observer(function RootLayout() {
  console.warn('RootLayout component rendering')

  const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
  const [customThemeConfig, setCustomThemeConfig] =
    useState<ThemeConfig | null>(null)
  console.warn('Fonts loaded:', fontsLoaded, 'Font error:', fontError)

  const isDbInitialized = useRef(false)

  // NEW: Get navigation container ref to capture React Navigation state
  // const navigationRef = useNavigationContainerRef()

  useState<ThemeConfig | null>(null)
  const { uiStore } = useStores()
  Reactotron.use(mst()).trackMstNode(uiStore)

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
            console.log('No custom theme found, using default Email theme')
          }
        }
      })
      .catch(error => {
        console.error('Failed to load custom theme:', error)
      })
  }, [])

  const { rootStore, rehydrated } = useInitialRootStore(async () => {
    console.warn('Initializing root store...')
    await writeAppState(true)
    if (!isDbInitialized.current) {
      try {
        console.warn('Checking database initialization...')
        const isInitialized = await queries.isDatabaseInitialized()

        if (!isInitialized) {
          console.warn('Running migrations...')
          const migrationResult = await runMigrations()
          if (!migrationResult) {
            console.error('Migration failed')
            return
          }

          console.warn('Initializing database...')
          const result = await mutations.initializeDatabase()
          if (result.success && !result.skipped) {
            console.warn('Database initialized successfully')
            await writeAppState(true)
          }
        } else {
          console.warn('Database already initialized')
          await writeAppState(true)
        }
        isDbInitialized.current = true
      } catch (error) {
        console.error('Database initialization failed:', error)
      }
    }

    console.warn('Initializing i18n...')
    initI18n()
    loadDateFnsLocale()
  })

  useEffect(() => {
    if (rootStore) {
      console.warn('Setting up deeplink handler...')
      const cleanupDeeplinks = setupDeeplinkHandler(rootStore)
      return () => {
        cleanupDeeplinks()
      }
    }
  }, [rootStore])

  // NEW: Capture React Navigation state changes
  // useEffect(() => {
  //   if (!navigationRef) return

  //   console.log('🔗 Setting up React Navigation state capture...')

  //   // Store ref globally for deeplink handler access
  //   setNavigationRef(navigationRef as any)

  //   // Listen for navigation state changes
  //   const unsubscribe = navigationRef.addListener('state', () => {
  //     const state = navigationRef.getRootState()
  //     if (state) {
  //       // Capture the full React Navigation state
  //       navigationHistoryManager.setReactNavigationState(state as any)
  //     }
  //   })

  //   // Also capture initial state
  //   const initialState = navigationRef.getRootState()
  //   if (initialState) {
  //     navigationHistoryManager.setReactNavigationState(initialState as any)
  //   }

  //   return () => {
  //     unsubscribe()
  //     setNavigationRef(null)
  //   }
  // }, [navigationRef])

  const [isI18nInitialized, setIsI18nInitialized] = useState(false)

  useEffect(() => {
    if (!isI18nInitialized) {
      console.warn('Initializing i18n in effect...')
      initI18n().then(() => setIsI18nInitialized(true))
      loadDateFnsLocale()
    }
  }, [isI18nInitialized])

  const ready = rehydrated && fontsLoaded && isI18nInitialized && !fontError
  console.warn('Ready state:', {
    rehydrated,
    fontsLoaded,
    isI18nInitialized,
    fontError,
  })

  useEffect(() => {
    if (ready) {
      console.warn('App is ready, hiding splash screen...')
      SplashScreen.hideAsync()
      // if (userStore.isAuthenticated) {
      //   console.warn('User is authenticated, navigating to inbox...')
      //   if (!uiStore.isDeeplinkLoading) {
      //     router.replace('/(tabs)/inbox')
      //   }
      // }
      // if (isDbInitialized) {
      //   writeAppState(true)
      // }
    }
  }, [ready])

  if (!ready) {
    console.warn('App not ready yet, returning null')
    return null
  }

  console.warn('Rendering main app UI')
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

export default RootLayout
