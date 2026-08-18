import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useStores } from '@/models/helpers/useStores'
import {
  Text,
  useAppTheme,
  Screen,
  AutoImage,
  type Theme,
} from '@andojo/shared-theme'
import { StatusBar } from 'expo-status-bar'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

interface ChatSettings {
  userId: string
  fontSize: string
  wallpaper?: string | null
  notificationTone: string
}

const FONT_SIZE_OPTIONS = [
  { value: 'small', label: 'Small', description: 'Compact text size' },
  { value: 'medium', label: 'Medium', description: 'Standard text size' },
  { value: 'large', label: 'Large', description: 'Easy to read text size' },
]

const WALLPAPER_OPTIONS = [
  {
    value: 'default',
    label: 'Default',
    preview: '🎨',
    image: require('../../../../assets/images/wallpapers/default.png'),
  },
  {
    value: 'gradient',
    label: 'Gradient',
    preview: '🌈',
    image: require('../../../../assets/images/wallpapers/gradient.png'),
  },
  {
    value: 'space',
    label: 'Space',
    preview: '🌌',
    image: require('../../../../assets/images/wallpapers/space.png'),
  },
]

// const NOTIFICATION_TONE_OPTIONS = [
//   {
//     value: 'default.mp3',
//     label: 'Default',
//     description: 'Standard notification',
//   },
//   { value: 'chime.mp3', label: 'Chime', description: 'Gentle chime sound' },
//   { value: 'ping.mp3', label: 'Ping', description: 'Quick ping sound' },
// ]

// // Valid notification tone values
// const VALID_NOTIFICATION_TONES = ['default.mp3', 'chime.mp3', 'ping.mp3']

export default function ChatSettingsScreen() {
  const { theme, themeContext } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore } = useStores()
  const router = useRouter()
  const [settings, setSettings] = useState<ChatSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const { trackClick, trackContentChange, trackScreenMount } =
    useInteractionTracking('ChatSettings', '/screens/profile/chat-settings')

  // Track screen mount
  useEffect(() => {
    trackScreenMount({
      currentFontSize: userStore.currentFontSize,
      currentWallpaper: userStore.currentWallpaper,
      currentNotificationTone: userStore.currentNotificationTone,
      loading,
      saving,
      timestamp: Date.now(),
      platform: Platform.OS,
      screenDimensions: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
      },
      userProfileId: userStore.currentUser?.id,
    })
  }, [])

  // Load chat settings
  const loadChatSettings = useCallback(async () => {
    if (isInitialized) return // Prevent multiple initializations

    try {
      setLoading(true)
      trackContentChange({
        action: 'chat_settings_load_started',
        timestamp: Date.now(),
      })

      if (!userStore.currentUser?.id) {
        Alert.alert('Error', 'User not found')
        trackContentChange({
          action: 'chat_settings_load_error',
          error: 'User not found',
          timestamp: Date.now(),
        })
        return
      }

      // Load settings from user store
      await userStore.loadChatSettings()

      // Normalize notification tone for existing users
      // let notificationTone = userStore.currentNotificationTone
      // if (
      //   notificationTone &&
      //   !VALID_NOTIFICATION_TONES.includes(notificationTone)
      // ) {
      //   // For existing users with invalid notification tones, set to default
      //   notificationTone = 'default.mp3'
      //   await userStore.setNotificationTone(notificationTone)
      //   await userStore.saveChatSettings()
      // }

      setSettings({
        userId: userStore.currentUser.id,
        fontSize: userStore.currentFontSize,
        wallpaper: userStore.currentWallpaper,
        notificationTone: userStore.currentNotificationTone,
      })

      trackContentChange({
        action: 'chat_settings_load_completed',
        settings: {
          fontSize: userStore.currentFontSize,
          wallpaper: userStore.currentWallpaper,
          notificationTone: userStore.currentNotificationTone,
        },
        timestamp: Date.now(),
      })

      setIsInitialized(true)
    } catch (error) {
      console.error('Error loading chat settings:', error)
      Alert.alert('Error', 'Failed to load chat settings')
      trackContentChange({
        action: 'chat_settings_load_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      })
    } finally {
      setLoading(false)
    }
  }, [userStore.currentUser?.id, isInitialized])

  useEffect(() => {
    if (userStore.currentUser?.id && !isInitialized) {
      loadChatSettings()
    }
  }, [userStore.currentUser?.id, isInitialized, loadChatSettings])

  // Update setting
  const updateSetting = async (
    key: keyof ChatSettings,
    value: string | null,
  ) => {
    if (!settings || !userStore.currentUser?.id) return

    try {
      setSaving(true)
      trackContentChange({
        action: 'setting_update_started',
        setting: key,
        value,
        timestamp: Date.now(),
      })

      // Update user store
      if (key === 'fontSize') {
        userStore.setFontSize(value as string)
      } else if (key === 'wallpaper') {
        userStore.setWallpaper(value || '') // Provide empty string as fallback
      } else if (key === 'notificationTone') {
        userStore.setNotificationTone(value || 'default.mp3') // Provide default as fallback
      }

      // Update local state
      const updatedSettings = { ...settings, [key]: value }
      setSettings(updatedSettings)

      // Save to database
      await userStore.saveChatSettings()

      trackContentChange({
        action: 'setting_updated',
        setting: key,
        value,
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error('Error updating setting:', error)
      Alert.alert('Error', 'Failed to update setting')
      trackContentChange({
        action: 'setting_update_error',
        setting: key,
        value,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      })
    } finally {
      setSaving(false)
    }
  }

  const renderFontSizeOption = (option: (typeof FONT_SIZE_OPTIONS)[0]) => (
    <TouchableOpacity
      key={option.value}
      style={[
        styles.optionItem,
        settings?.fontSize === option.value && styles.selectedOption,
      ]}
      onPress={() => {
        trackClick('font_size_change')
        updateSetting('fontSize', option.value)
      }}
      disabled={saving}
    >
      <View style={styles.optionContent}>
        <Text
          text={option.label}
          size="medium"
          weight="medium"
          style={styles.optionLabel}
        />
        <Text
          text={option.description}
          size="small"
          style={styles.optionDescription}
        />
      </View>
      {settings?.fontSize === option.value && (
        <Ionicons
          name="checkmark-circle"
          size={24}
          color={theme.colors.palette.primary500}
        />
      )}
    </TouchableOpacity>
  )

  const renderWallpaperOption = (option: (typeof WALLPAPER_OPTIONS)[0]) => (
    <TouchableOpacity
      key={option.value}
      style={[
        styles.wallpaperOption,
        settings?.wallpaper === option.value && styles.selectedWallpaper,
      ]}
      onPress={() => {
        trackClick('wallpaper_change')
        updateSetting('wallpaper', option.value)
      }}
      disabled={saving}
    >
      <View style={styles.wallpaperPreview}>
        <AutoImage source={option.image} style={styles.wallpaperImage} />
      </View>
      <Text text={option.label} size="small" style={styles.wallpaperLabel} />
      {settings?.wallpaper === option.value && (
        <View style={styles.wallpaperCheckmark}>
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={theme.colors.palette.primary500}
          />
        </View>
      )}
    </TouchableOpacity>
  )

  // const renderNotificationToneOption = (
  //   option: (typeof NOTIFICATION_TONE_OPTIONS)[0],
  // ) => (
  //   <TouchableOpacity
  //     key={option.value}
  //     style={[
  //       styles(theme).optionItem,
  //       settings?.notificationTone === option.value &&
  //         styles(theme).selectedOption,
  //     ]}
  //     onPress={() => {
  //       trackClick('notification_tone_change')
  //       updateSetting('notificationTone', option.value)
  //     }}
  //     disabled={saving}
  //   >
  //     <View style={styles(theme).optionContent}>
  //       <Text
  //         text={option.label}
  //         size="medium"
  //         weight="medium"
  //         style={styles(theme).optionLabel}
  //       />
  //       <Text
  //         text={option.description}
  //         size="small"
  //         style={styles(theme).optionDescription}
  //       />
  //     </View>
  //     {settings?.notificationTone === option.value && (
  //       <Ionicons
  //         name="checkmark-circle"
  //         size={24}
  //         color={theme.colors.palette.primary500}
  //       />
  //     )}
  //   </TouchableOpacity>
  // )

  if (loading) {
    return (
      <Screen
        preset="fixed"
        safeAreaEdges={['top']}
        backgroundColor={theme.colors.background}
      >
        <View style={styles.loadingContainer}>
          <Text text="Loading chat settings..." style={styles.loadingText} />
        </View>
      </Screen>
    )
  }

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={['top']}
      backgroundColor={theme.colors.background}
    >
      <StatusBar
        style={themeContext === 'dark' ? 'light' : 'dark'}
        backgroundColor={theme.colors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            trackClick('backButton')
            trackContentChange({
              action: 'chat_settings_closed',
              finalSettings: settings,
              timestamp: Date.now(),
            })
            router.back()
          }}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.palette.neutral800}
          />
        </TouchableOpacity>
        <Text
          preset="subheading"
          text="Chat Settings"
          style={styles.headerTitle}
        />
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Font Size Section */}
        <View style={styles.section}>
          <Text
            text="Font Size"
            size="large"
            weight="bold"
            style={styles.sectionTitle}
          />
          <Text
            text="Choose the text size for your chat messages"
            size="small"
            style={styles.sectionDescription}
          />
          <View style={styles.optionsContainer}>
            {FONT_SIZE_OPTIONS.map(renderFontSizeOption)}
          </View>
        </View>

        {/* Wallpaper Section */}
        <View style={styles.section}>
          <Text
            text="Chat Wallpaper"
            size="large"
            weight="bold"
            style={styles.sectionTitle}
          />
          <Text
            text="Select a background for your chat screens"
            size="small"
            style={styles.sectionDescription}
          />
          <View style={styles.wallpaperGrid}>
            {WALLPAPER_OPTIONS.map(renderWallpaperOption)}
          </View>
        </View>
      </ScrollView>
    </Screen>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      fontSize: 18,
      color: theme.colors.palette.neutral600,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    backButton: {
      padding: 8,
      marginRight: 12,
    },
    headerTitle: {
      color: theme.colors.palette.neutral800,
    },
    headerSpacer: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    content: {
      padding: 20,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      color: theme.colors.palette.neutral800,
      marginBottom: 8,
    },
    sectionDescription: {
      color: theme.colors.palette.neutral600,
      marginBottom: 16,
    },
    optionsContainer: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      overflow: 'hidden',
    },
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    selectedOption: {
      backgroundColor: theme.colors.palette.primary500 + '10',
    },
    optionContent: {
      flex: 1,
    },
    optionLabel: {
      color: theme.colors.palette.neutral800,
      marginBottom: 4,
    },
    optionDescription: {
      color: theme.colors.palette.neutral600,
    },
    wallpaperGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    wallpaperOption: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 16,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedWallpaper: {
      borderColor: theme.colors.palette.primary500,
      backgroundColor: theme.colors.palette.primary500 + '10',
    },
    wallpaperPreview: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.palette.neutral200,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    wallpaperImage: {
      width: '100%',
      height: '100%',
      borderRadius: 30,
    },
    wallpaperLabel: {
      color: theme.colors.palette.neutral800,
      textAlign: 'center',
    },
    wallpaperCheckmark: {
      position: 'absolute',
      top: 8,
      right: 8,
    },
  })
