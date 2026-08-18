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
import { MaterialIcons } from '@expo/vector-icons'
import { useStores } from '@/models'
import { observer } from 'mobx-react-lite'
import { useDrawerStatus } from '@react-navigation/drawer'
// @ts-ignore
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useNavigation } from '@react-navigation/native'
import { resolveImageSource } from '@/utils/imageResolver'
import { AutoImage } from '@/components'

import LinearGradient from 'react-native-linear-gradient'
import { useAppTheme, type Theme } from '@andojo/shared-theme'

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
  const { userStore, sessionStore, orderStore } = useStores()
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
        .catch((error: any) => {
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
      try {
        const resolved = resolveImageSource(undefined, 'avatar')
        setAvatarSource({
          source: resolved.source || null,
          loading: resolved.loading || false,
        })
      } catch (error) {
        setAvatarSource({
          source: null,
          loading: false,
        })
      }
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
    <LinearGradient
      colors={[
        theme.colors.palette.primary100,
        theme.colors.backgroundSecondary,
      ]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <LinearGradient
        colors={[
          theme.colors.palette.primary500,
          theme.colors.palette.primary600,
        ]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <AutoImage
              source={avatarSource.source || undefined}
              style={[
                styles.avatar,
                avatarSource.loading && styles.loadingImage,
              ]}
              defaultSource={require('@/assets/images/placeholder_avatar.jpg')}
            />
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.name}>
              {user?.firstName ? `${user.firstName} ${user.lastName}` : 'User'}
            </Text>
            <Text style={styles.email}>{user?.email || 'No email'}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <TouchableOpacity onPress={() => router.push('/screens/orders')}>
            <LinearGradient
              colors={[
                theme.colors.palette.primary50,
                theme.colors.palette.primary100,
              ]}
              style={styles.statItem}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <MaterialIcons
                name="shopping-bag"
                size={24}
                color={theme.colors.palette.accent600}
              />
              <Text style={styles.statNumber}>
                {orderStore.orders?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Orders</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/screens/wishlist')}>
            <LinearGradient
              colors={[
                theme.colors.palette.secondary100,
                theme.colors.palette.secondary200,
              ]}
              style={styles.statItem}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <MaterialIcons
                name="favorite"
                size={24}
                color={theme.colors.palette.secondary600}
              />
              <Text style={styles.statNumber}>
                {userStore.currentUser?.wishlistIds?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Wishlist</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(app)/(drawer)/payment')}
          >
            <LinearGradient
              colors={[
                theme.colors.successBackground,
                theme.colors.palette.success100,
              ]}
              style={styles.statItem}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <MaterialIcons
                name="payment"
                size={24}
                color={theme.colors.palette.primary600}
              />
              <Text style={styles.statNumber}>
                {userStore.paymentMethods?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Payment Methods</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Profile Options */}
        <View style={styles.optionsContainer}>
          <ProfileOption
            icon="receipt-long"
            text="My Orders"
            subtitle="Track, return and buy things again"
            onPress={() => router.push('/screens/orders')}
            theme={theme}
            isDarkMode={isDarkMode}
            isLogout={false}
          />
          <ProfileOption
            icon="location-on"
            text="Address Book"
            subtitle="Manage your delivery addresses"
            onPress={() => router.push('/(app)/(drawer)/address')}
            theme={theme}
            isDarkMode={isDarkMode}
            isLogout={false}
          />
          <ProfileOption
            icon="payment"
            text="Payment Methods"
            subtitle="Manage cards and payment options"
            onPress={() => router.push('/(app)/(drawer)/payment')}
            theme={theme}
            isDarkMode={isDarkMode}
            isLogout={false}
          />
          <ProfileOption
            icon="favorite"
            text="My Wishlist"
            subtitle="View and manage your saved items"
            onPress={() => router.push('/screens/wishlist')}
            theme={theme}
            isDarkMode={isDarkMode}
            isLogout={false}
          />
          {/* Settings Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Settings</Text>
          </View>

          <ToggleOption
            icon="dark-mode"
            text="Dark Mode"
            subtitle="Switch to dark theme"
            value={isDarkMode}
            onToggle={handleDarkModeToggle}
            theme={theme}
          />

          <ToggleOption
            icon="notifications"
            text="Notifications"
            subtitle="Get updates about orders and offers"
            value={notificationsEnabled}
            onToggle={handleNotificationsToggle}
            theme={theme}
          />

          <ProfileOption
            icon="help"
            text="Help & Support"
            subtitle="Get help with your orders"
            onPress={() => {}}
            theme={theme}
            isDarkMode={isDarkMode}
            isLogout={false}
          />

          <ProfileOption
            icon="logout"
            text="Logout"
            subtitle="Sign out of your account"
            onPress={() => {
              userStore.logout()
              router.replace('/login')
            }}
            theme={theme}
            isDarkMode={isDarkMode}
            isLogout
          />
        </View>
      </ScrollView>
    </LinearGradient>
  )
})

/** Profile Option Component */
const ProfileOption = ({
  icon,
  text,
  subtitle,
  onPress,
  theme,
  isLogout = false,
}: {
  icon: keyof typeof MaterialIcons.glyphMap
  text: string
  subtitle?: string
  onPress: () => void
  theme: Theme
  isDarkMode: boolean
  isLogout: boolean
}) => {
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <TouchableOpacity onPress={onPress} style={styles.option}>
      <LinearGradient
        colors={
          isLogout
            ? [theme.colors.errorBackground, theme.colors.palette.error100]
            : [theme.colors.card, theme.colors.backgroundSecondary]
        }
        style={styles.optionGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View
          style={[
            styles.optionIcon,
            {
              backgroundColor: isLogout
                ? theme.colors.palette.error500
                : theme.colors.palette.primary500,
            },
          ]}
        >
          <MaterialIcons
            name={icon}
            size={22}
            color={theme.colors.palette.neutral100}
          />
        </View>
        <View style={styles.optionContent}>
          <Text style={[styles.optionText, isLogout && styles.logoutText]}>
            {text}
          </Text>
          {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
        </View>
        <MaterialIcons
          name="chevron-right"
          size={20}
          color={theme.colors.palette.neutral400}
        />
      </LinearGradient>
    </TouchableOpacity>
  )
}

/** Toggle Option Component */
const ToggleOption = ({
  icon,
  text,
  subtitle,
  value,
  onToggle,
  theme,
}: {
  icon: keyof typeof MaterialIcons.glyphMap
  text: string
  subtitle?: string
  value: boolean
  onToggle: () => void
  theme: Theme
}) => {
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.option}>
      <LinearGradient
        colors={[theme.colors.card, theme.colors.backgroundSecondary]}
        style={styles.optionGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View
          style={[
            styles.optionIcon,
            { backgroundColor: theme.colors.palette.secondary500 },
          ]}
        >
          <MaterialIcons
            name={icon}
            size={22}
            color={theme.colors.palette.neutral100}
          />
        </View>
        <View style={styles.optionContent}>
          <Text style={styles.optionText}>{text}</Text>
          {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{
            false: theme.colors.palette.neutral300,
            true: theme.colors.palette.primary300,
          }}
          thumbColor={
            value
              ? theme.colors.palette.primary500
              : theme.colors.palette.neutral100
          }
        />
      </LinearGradient>
    </View>
  )
}

/** Styles */
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    headerGradient: {
      paddingTop: 50,
      paddingBottom: 20,
      paddingHorizontal: 16,
    },
    menuButton: {
      position: 'absolute',
      top: 50,
      left: 16,
      padding: 8,
      zIndex: 1,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    avatarContainer: {
      position: 'relative',
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 3,
      borderColor: theme.colors.palette.neutral100,
    },
    onlineBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 2,
    },
    onlineDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.palette.success500,
    },
    userInfo: {
      flex: 1,
      gap: 4,
    },
    name: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    email: {
      fontSize: 14,
      color: theme.colors.palette.neutral800,
      fontWeight: '500',
      textShadowColor: 'rgba(0,0,0,0.2)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 1,
    },
    addressInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    addressText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.palette.neutral800,
    },
    editButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 20,
      padding: 10,
    },
    scrollContent: {
      flex: 1,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 20,
      paddingVertical: 20,
      gap: 12,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      padding: 16,
      width: 120,
      height: 120,
      borderRadius: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    statNumber: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginTop: 8,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textDim,
      marginTop: 4,
    },
    optionsContainer: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    sectionHeader: {
      marginTop: 24,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral800,
    },
    option: {
      marginBottom: 12,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    optionGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 16,
    },
    optionIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionContent: {
      flex: 1,
      gap: 2,
    },
    optionText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    optionSubtitle: {
      fontSize: 12,
      color: theme.colors.textDim,
      fontWeight: '500',
    },
    logoutText: {
      color: theme.colors.palette.error600,
    },
    loadingImage: {
      opacity: 0.5,
    },
  })
