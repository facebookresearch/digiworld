import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  useColorScheme,
  ImageSourcePropType,
} from 'react-native'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useStores } from '@/models'
import { observer } from 'mobx-react-lite'
import { useDrawerStatus } from '@react-navigation/drawer'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useNavigation } from '@react-navigation/native'
import { resolveImageSource } from '@/utils/imageResolver'
import { AutoImage } from '@/components'
import {
  resolveAssetPath,
  AppName,
  EntityType,
  AssetType,
  AssetConfigType,
} from '@andojo/shared-asset-management'
import { useAppTheme, Theme } from '@andojo/shared-theme'

interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  avatarIndex?: number
  profilePicture?: string | null
}

export default observer(function ProfileScreen() {
  const router = useRouter()
  const { sessionId, timeStamp } = useLocalSearchParams()
  const { userStore, sessionStore } = useStores()
  const [user, setUser] = useState<User | null>(null)
  const systemTheme = useColorScheme()
  const isDrawerOpen = useDrawerStatus() === 'open'
  const navigation = useNavigation()
  const [isDarkMode, setDarkMode] = useState(systemTheme === 'dark')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { trackScreenMount, trackContentChange } = useInteractionTracking(
    'Profile',
    '/(app)/(drawer)/(tabs)/profile',
  )
  const [avatarSource, setAvatarSource] = useState<{
    source: ImageSourcePropType | null
    loading: boolean
  }>({ source: null, loading: true })

  useEffect(() => {
    // First try to restore from session if sessionId exists
    if (sessionId) {
      const sessionData = sessionStore.getSession(sessionId as string)
      if (sessionData?.data) {
        const formData = sessionData.data.sessionData?.formData
        console.log(
          'Restoring profile session:',
          JSON.stringify(formData, null, 2),
        )
        // @ts-ignore
        if (!isDrawerOpen && formData?.isDrawerOpen) {
          // @ts-ignore
          navigation.openDrawer()
        }
        // @ts-ignore
        trackContentChange(formData)
        // @ts-ignore
        setDarkMode(formData?.isDarkMode)
        // @ts-ignore
        setNotificationsEnabled(formData?.notificationsEnabled)
      }
    }
  }, [sessionId, timeStamp])

  useEffect(() => {
    if (userStore.isAuthenticated && userStore.user?.id) {
      userStore
        .setUser(userStore.user.id)
        .then(() => {
          trackContentChange({
            profileLoaded: true,
            hasProfileData: !!userStore.currentUser,
          })
        })
        .catch(error => {
          console.log(error)
          trackContentChange({
            profileLoaded: false,
            error: String(error),
          })
        })
    }
  }, [userStore.isAuthenticated])

  // Track drawer state changes
  useEffect(() => {
    trackContentChange({
      drawerStateChanged: true,
      isDrawerOpen,
    })
  }, [isDrawerOpen])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        isAuthenticated: userStore.isAuthenticated,
        userId: userStore.user?.id,
        isDrawerOpen,
        isDarkMode,
        notificationsEnabled,
        screen: 'home',
        route: '/home',
      })
    }, []),
  )

  useEffect(() => {
    if (userStore.currentUser) {
      setUser({
        id: userStore.currentUser.id,
        firstName: userStore.currentUser.firstName,
        lastName: userStore.currentUser.lastName,
        email: userStore.currentUser.email,
        avatarIndex: 1, // Default to 1 since we don't have avatarIndex in the model
        profilePicture: userStore.currentUser.profilePicture,
      })
    }
  }, [userStore.currentUser])

  useEffect(() => {
    async function loadAvatar() {
      const { localPath } = await resolveAssetPath({
        appName: AppName.ECOMMERCE,
        entityType: EntityType.AVATARS,
        entityId: user?.id?.toString() || '0',
        assetType: AssetType.IMAGE,
        assetConfig: {
          type: AssetConfigType.MAIN,
        },
      })
      const resolved = resolveImageSource(
        localPath,
        'avatar',
        user?.id?.toString() || '0',
        'main',
      )
      setAvatarSource({
        source: resolved.source,
        loading: resolved.loading || false,
      })
    }
    loadAvatar()
  }, [user?.id])

  const handleDarkModeToggle = () => {
    setDarkMode(!isDarkMode)
    trackContentChange({
      isDarkMode: !isDarkMode,
    })
  }

  const handleNotificationsToggle = () => {
    setNotificationsEnabled(!notificationsEnabled)
    trackContentChange({
      notificationsEnabled: !notificationsEnabled,
    })
  }

  return (
    <ScrollView style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Profile Section */}
      <View style={[styles.profileCard, isDarkMode && styles.profileCardDark]}>
        <AutoImage
          source={avatarSource.source}
          style={[styles.avatar, avatarSource.loading && styles.loadingImage]}
          defaultSource={require('@/assets/images/placeholder_avatar.jpg')}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.name, isDarkMode && styles.textDark]}>
            {user?.firstName ? `${user.firstName} ${user.lastName}` : 'User'}
          </Text>
          <Text style={[styles.email, isDarkMode && styles.textMuted]}>
            {user?.email || 'No email'}
          </Text>
        </View>
        {/* <TouchableOpacity style={styles.editB
        utton} onPress={() => router.push("/profile/edit")}>
          <Feather name="edit-3" size={18} color="black" />
        </TouchableOpacity> */}
      </View>

      {/* Profile Options */}
      <View style={styles.optionsContainer}>
        <ProfileOption
          icon="cart-outline"
          text="My Orders"
          onPress={() => router.push('/screens/orders')}
        />
        <ProfileOption
          icon="location-outline"
          text="Address Book"
          onPress={() => router.push('/(app)/(drawer)/address')}
        />
        <ProfileOption
          icon="card-outline"
          text="Payment Methods"
          onPress={() => router.push('/(app)/(drawer)/payment')}
        />

        {/* Dark Mode Toggle */}
        <ToggleOption
          icon="moon-outline"
          text="Dark Mode"
          value={isDarkMode}
          onToggle={handleDarkModeToggle}
        />

        {/* Notifications Toggle */}
        <ToggleOption
          icon="notifications-outline"
          text="Notifications"
          value={notificationsEnabled}
          onToggle={handleNotificationsToggle}
        />

        {/* Logout */}
        <ProfileOption
          icon="log-out-outline"
          text="Logout"
          onPress={() => {
            userStore.logout()
            router.replace('/login')
          }}
          isLogout
        />
      </View>
    </ScrollView>
  )
})

/** Profile Option Component */
const ProfileOption = observer(
  ({
    icon,
    text,
    onPress,
    isLogout = false,
  }: {
    icon: keyof typeof Ionicons.glyphMap
    text: string
    onPress: () => void
    isLogout?: boolean
  }) => {
    const { theme } = useAppTheme()
    const styles = useMemo(() => createStyles(theme), [theme])

    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.option, isLogout && styles.logoutButton]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={isLogout ? theme.colors.error : theme.colors.text}
        />
        <Text style={[styles.optionText, isLogout && styles.logoutText]}>
          {text}
        </Text>
      </TouchableOpacity>
    )
  },
)

/** Toggle Option Component */
const ToggleOption = observer(
  ({
    icon,
    text,
    value,
    onToggle,
  }: {
    icon: keyof typeof Ionicons.glyphMap
    text: string
    value: boolean
    onToggle: () => void
  }) => {
    const { theme } = useAppTheme()
    const styles = useMemo(() => createStyles(theme), [theme])

    return (
      <View style={[styles.option, styles.toggleOption]}>
        <Ionicons name={icon} size={22} color={theme.colors.text} />
        <Text style={styles.optionText}>{text}</Text>
        <Switch value={value} onValueChange={onToggle} />
      </View>
    )
  },
)

/** Styles */
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    containerDark: {
      backgroundColor: theme.colors.palette.neutral800,
    },
    profileCard: {
      backgroundColor: theme.colors.palette.neutral100,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 18,
      borderRadius: 12,
      marginHorizontal: 16,
      marginTop: 20,
    },
    profileCardDark: {
      backgroundColor: theme.colors.palette.neutral700,
    },
    avatar: {
      width: 65,
      height: 65,
      borderRadius: 32,
    },
    userInfo: {
      flex: 1,
      marginLeft: 15,
    },
    name: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text,
    },
    email: {
      fontSize: 14,
      color: theme.colors.textDim,
    },
    textMuted: {
      color: theme.colors.textDim,
    },
    editButton: {
      padding: 8,
      borderRadius: 50,
      backgroundColor: theme.colors.border,
    },
    optionsContainer: {
      marginTop: 20,
      paddingHorizontal: 16,
    },
    option: {
      backgroundColor: theme.colors.palette.neutral100,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 10,
      marginBottom: 8,
    },
    optionDark: {
      backgroundColor: theme.colors.palette.neutral700,
    },
    optionText: {
      flex: 1,
      marginLeft: 12,
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.text,
    },
    textDark: {
      color: theme.colors.palette.neutral100,
    },
    logoutButton: {
      backgroundColor: theme.colors.errorBackground,
    },
    logoutText: {
      color: theme.colors.error,
    },
    toggleOption: {
      justifyContent: 'space-between',
    },
    loadingImage: {
      opacity: 0.5,
    },
  })
