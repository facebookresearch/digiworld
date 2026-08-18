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
} from '@andojo/shared-theme'
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState } from 'react'

import { sqlite } from '@/db'
import { runMigrations } from '@/db/migrations'
import { mutations } from '@/db/mutations'
import { queries } from '@/db/queries'
import { StatusBar } from 'expo-status-bar'
import { AppState, StyleSheet, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import CartBar from './components/CartBar'
import { loadActiveTheme } from '@/utils/themeLoader'
import { subscribeToThemeReload } from '@/utils/themeReloader'
import {
  useAppTheme,
  useThemeProvider,
  ThemeContext,
} from '@/utils/useAppTheme'
import { useStores } from '@/models/helpers/useStores'

SplashScreen.preventAutoHideAsync()

if (__DEV__) {
  require('src/devtools/ReactotronConfig.ts')
}

function DrizzleStudioProvider({ isInitialized }: { isInitialized: boolean }) {
  useDrizzleStudio(isInitialized && __DEV__ ? sqlite : null)
  return null
}

// Separate component for theme-dependent UI
const ThemedApp = observer(function ThemedApp() {
  const { theme } = useAppTheme()
  const { ToastComponent, toastContext } = useToastProvider({
    textColor: theme.colors.palette.neutral900,
  })
  const { uiStore } = useStores()
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
        <StatusBar
          style="light"
          backgroundColor={theme.colors.palette.primary500}
        />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="screens" />
        </Stack>
      </KeyboardProvider>
      <LoadingOverlay
        visible={uiStore?.isDeeplinkLoading}
        message="Processing..."
      />
      {ToastComponent}
      <View style={styles.cartBarContainer} pointerEvents="box-none">
        <CartBar />
      </View>
    </ToastContext.Provider>
  )
})

export default observer(function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
  const isDbInitialized = useRef(false)
  const [customThemeConfig, setCustomThemeConfig] =
    useState<ThemeConfig | null>(null)

  // Initialize local theme context
  const { themeScheme, setThemeContextOverride } = useThemeProvider()

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
            console.log('No custom theme found, using default Eats theme')
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
          // Read data from storage or fallback to imported data
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

  const ready = rehydrated && fontsLoaded && !fontError

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync()
    }
  }, [ready])

  if (!ready) {
    return null
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeContext.Provider value={{ themeScheme, setThemeContextOverride }}>
        <ThemeProvider initialThemeConfig={customThemeConfig || undefined}>
          <GluestackProvider>
            {devTools}
            <ThemedApp />
          </GluestackProvider>
        </ThemeProvider>
      </ThemeContext.Provider>
    </GestureHandlerRootView>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cartBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1, // Lower z-index than tab bar
    pointerEvents: 'box-none', // Allow touch events to pass through to tab bar
  },
})
