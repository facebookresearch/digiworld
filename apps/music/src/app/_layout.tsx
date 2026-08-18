import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  StyleSheet,
  Modal,
  View,
  TouchableOpacity,
  FlatList,
  AppState,
} from 'react-native'
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin'
import * as SplashScreen from 'expo-splash-screen'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { sqlite } from '@/db'
import {
  LoadingOverlay,
  customFontsToLoad,
  ThemeProvider,
  ThemeConfig,
  useTheme,
  useAppTheme,
  GluestackProvider,
  ToastContext,
  useToastProvider,
  Text,
  useToast,
  Theme,
} from '@andojo/shared-theme'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { observer } from 'mobx-react-lite'
import { useFonts } from 'expo-font'
import { useStores, useInitialRootStore } from '@/models/helpers/useStores'
import { writeAppState } from '@/utils/appStateManager'
import { loadDateFnsLocale } from '@/utils/formatDate'
import { queries } from '@/db/queries'
import { runMigrations } from '@/db/migrations'
import { mutations } from '@/db/mutations'
import { setupDeeplinkHandler } from '@/utils/deeplinkHandler'
import { initI18n } from '@/utils/i18n'
import { translate } from '@/i18n/translate'
import { loadActiveTheme } from '@/utils/themeLoader'
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

// Component for Add to Playlist Modal - needs to be inside ToastProvider
const AddToPlaylistModal = observer(() => {
  const { userStore, musicStore } = useStores()
  const toast = useToast()
  const { theme } = useAppTheme()
  const modalStyles = createModalStyles(theme)

  const handleAddToPlaylist = useCallback(async () => {
    if (!userStore.selectedPlaylistId || !userStore.selectedSongId) return
    try {
      // Clear any previous error
      musicStore.setError(null)

      await musicStore.addSongToPlaylist(
        userStore.selectedPlaylistId,
        userStore.selectedSongId,
      )

      // Close modal first
      userStore.setAddToPlaylistModalVisible(false)

      // Then show toast feedback
      if (musicStore.error) {
        // Error case (e.g., song already exists)
        toast.show({
          title: musicStore.error,
          placement: 'top',
          duration: 3000,
        })
      } else {
        // Success case
        toast.show({
          title: 'Song added successfully',
          placement: 'top',
          duration: 3000,
        })
      }
    } catch (error) {
      // Close modal first
      userStore.setAddToPlaylistModalVisible(false)

      // Then show error toast
      console.error('Failed to add song to playlist:', error)
      toast.show({
        title: 'Failed to add song to playlist',
        placement: 'top',
        duration: 3000,
      })
    }
  }, [
    userStore.selectedPlaylistId,
    userStore.selectedSongId,
    musicStore,
    userStore,
    toast,
  ])

  return (
    <Modal
      visible={userStore.isAddToPlaylistModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => userStore.setAddToPlaylistModalVisible(false)}
    >
      <View style={modalStyles.modalContainer}>
        <View style={modalStyles.modalContent}>
          <Text style={modalStyles.modalTitle}>
            {translate('library.addToPlaylist')}
          </Text>
          <FlatList
            data={musicStore.playlists}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={modalStyles.playlistItem}
                onPress={() => {
                  userStore.setSelectedPlaylistId(item.id)
                  handleAddToPlaylist()
                }}
              >
                <Text style={modalStyles.playlistItemText}>{item.name}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id.toString()}
            style={modalStyles.playlistList}
          />
          <TouchableOpacity
            style={[modalStyles.modalButton, modalStyles.cancelButton]}
            onPress={() => userStore.setAddToPlaylistModalVisible(false)}
          >
            <Text style={modalStyles.buttonTextLight}>
              {translate('common.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
})

// Separate component for theme-dependent UI
const ThemedApp = observer(function ThemedApp() {
  const { loadThemeFromConfig } = useTheme()
  const { theme } = useAppTheme()
  const { ToastComponent, toastContext } = useToastProvider({
    textColor: theme.colors.text,
  })
  const { uiStore } = useStores()

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
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
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

      {/* Add to Playlist Modal - Root Level */}
      <AddToPlaylistModal />
    </ToastContext.Provider>
  )
})

const RootLayout = observer(function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
  const isDbInitialized = useRef(false)
  const [isI18nInitialized, setIsI18nInitialized] = useState(false)
  const [customThemeConfig, setCustomThemeConfig] =
    useState<ThemeConfig | null>(null)
  const [isThemeLoaded, setIsThemeLoaded] = useState(false)

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
            console.log('No custom theme found, using default Music theme')
          }
        }
        setIsThemeLoaded(true)
      })
      .catch(error => {
        console.error('Failed to load custom theme:', error)
        setIsThemeLoaded(true)
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
            await writeAppState(true)
          }
        } else {
          console.log('Database already initialized, skipping migrations.')
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
    if (rootStore) {
      // Setup deeplink handler and get cleanup function
      const cleanupDeeplinks = setupDeeplinkHandler(rootStore)
      // Return cleanup function to remove listeners when component unmounts
      return () => {
        cleanupDeeplinks()
      }
    }
  }, [rootStore])

  useEffect(() => {
    if (!isI18nInitialized) {
      initI18n().then(() => setIsI18nInitialized(true))
      loadDateFnsLocale()
    }
  }, [isI18nInitialized])

  const ready =
    rehydrated &&
    fontsLoaded &&
    isI18nInitialized &&
    !fontError &&
    isThemeLoaded

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

const createModalStyles = (theme: Theme) =>
  StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: theme.colors.palette.neutral200,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginBottom: 20,
      textAlign: 'center',
    },
    playlistList: {
      maxHeight: 300,
      marginBottom: 20,
    },
    playlistItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral600,
    },
    playlistItemText: {
      color: theme.colors.palette.neutral900,
      fontSize: 16,
    },
    modalButton: {
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 8,
      marginHorizontal: 8,
    },
    cancelButton: {
      backgroundColor: theme.colors.palette.primary200,
    },
    buttonTextLight: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
  })

export default RootLayout
