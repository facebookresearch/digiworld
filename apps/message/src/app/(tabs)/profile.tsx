import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { metrics, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Screen, Text } from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router'
import { useCallback, useState, useEffect, useRef, useMemo } from 'react'
import {
  Alert,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native'
import { queries } from '@/db/queries'

export default function ProfileScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const { userStore, sessionStore } = useStores()

  const PROFILE_MENU_ITEMS = [
    {
      id: 'chats',
      title: 'Chat Settings',
      icon: 'chatbubbles-outline',
      color: theme.colors.palette.accent500,
      route: '/screens/profile/chat-settings',
    },
  ]
  const [profile, setProfile] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const hasLoadedRef = useRef(false)
  const [hasSessionRestoration, setHasSessionRestoration] = useState(false)

  // Setup interaction tracking
  const { width, height } = Dimensions.get('window')
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('Profile', '/(tabs)/profile')

  // Load user data from database
  const loadUserData = useCallback(async () => {
    try {
      setLoading(true)
      const currentUser = userStore.currentUser

      if (currentUser?.id) {
        const userData = await queries.getUserById(currentUser.id)

        if (userData) {
          setProfile({
            name: userData.name || 'User',
            phoneNumber: userData.phoneNumber,
            avatar: userData.avatarUrl,
          })
        } else {
          // Fallback to store data if database query fails
          setProfile({
            name: currentUser.name || 'User',
            phoneNumber: currentUser.phoneNumber,
            avatar: currentUser.avatarUrl,
          })
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      // Fallback to store data on error
      const currentUser = userStore.currentUser
      if (currentUser) {
        setProfile({
          name: currentUser.name || 'User',
          phoneNumber: currentUser.phoneNumber,
          avatar: currentUser.avatarUrl,
        })
      }
    } finally {
      setLoading(false)
    }
  }, [userStore.currentUser])

  // Load user data on mount only
  useEffect(() => {
    if (!hasLoadedRef.current) {
      loadUserData()
      hasLoadedRef.current = true
    }
  }, [loadUserData])

  // Restore state from session when sessionId is present
  useEffect(() => {
    console.log('Profile screen session restoration useEffect triggered:', {
      sessionId,
      sessionTimeStamp,
    })

    if (sessionTimeStamp) {
      // Add a small delay to ensure session data is fully loaded
      const timer = setTimeout(() => {
        const session = sessionStore.getSession()
        console.log('Retrieved session:', {
          sessionExists: !!session,
          sessionData: session?.data?.sessionData,
        })

        if (session?.data?.sessionData) {
          const savedState = session.data.sessionData.formData as any

          console.log('Session data structure:', {
            formData: savedState,
            fullSessionData: session.data.sessionData,
          })

          // Restore state from session (following the same pattern as home screen)
          if (savedState) {
            console.log('Profile screen session restoration:', {
              savedState,
              timestamp: Date.now(),
            })

            // Restore profile-related state if needed
            if (savedState.profileData) {
              console.log('Restoring profile data:', savedState.profileData)
              setProfile(savedState.profileData)
            }

            // Track content change after state restoration
            trackContentChange({
              event: 'session_state_restored',
              restoredState: savedState,
              timestamp: Date.now(),
            })

            // Mark that session restoration has happened
            setHasSessionRestoration(true)
          } else {
            console.log('No savedState found in session data')
          }
        } else {
          console.log('No session data found')
        }
      }, 100) // Small delay to ensure session data is loaded

      return () => clearTimeout(timer)
    }
    return undefined
  }, [sessionTimeStamp, sessionId, sessionStore])

  // Track screen mount and reload data when screen comes into focus (but respect session restoration)
  useFocusEffect(
    useCallback(() => {
      // Only reload data if we've already loaded once and session restoration hasn't happened
      if (hasLoadedRef.current && !hasSessionRestoration) {
        console.log(
          'Profile screen focused - refreshing data (no session restoration)',
        )
        loadUserData()
      } else if (hasSessionRestoration) {
        console.log(
          'Profile screen focused - skipping refresh due to session restoration',
        )
        // Reset the flag for next time
        setHasSessionRestoration(false)
      }

      trackScreenMount({
        profileName: userStore.currentUser?.name || 'User',
        timestamp: Date.now(),
        platform: Platform.OS,
        screenDimensions: { width, height },
        userProfileId: userStore.currentUser?.id,
        sessionId,
      })
    }, [hasSessionRestoration]),
  )

  const handleMenuPress = useCallback(
    (item: any) => {
      trackClick(`menu_${item.id}`)
      router.push(item.route)
    },
    [router, trackClick],
  )

  const handleEditProfile = useCallback(() => {
    trackClick('editProfile')
    router.push({
      pathname: '/screens/auth/create-profile',
      params: { mode: 'update' },
    })
  }, [router, trackClick])

  const handleLogout = useCallback(async () => {
    try {
      trackContentChange({
        action: 'logout_initiated',
        timestamp: Date.now(),
        userId: userStore.currentUser?.id,
      })

      await userStore.logout()

      trackContentChange({
        action: 'logout_successful',
        timestamp: Date.now(),
        userId: userStore.currentUser?.id,
      })

      router.replace('/screens/auth/phone-login')
    } catch (error) {
      console.error('Logout failed:', error)
      trackContentChange({
        action: 'logout_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        userId: userStore.currentUser?.id,
      })
      Alert.alert('Error', 'Failed to logout. Please try again.', [
        { text: 'OK' },
      ])
    }
  }, [userStore, router, trackContentChange])

  const confirmLogout = useCallback(() => {
    trackContentChange({
      action: 'logout_confirmation_shown',
      timestamp: Date.now(),
      userId: userStore.currentUser?.id,
    })
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => {
          trackContentChange({
            action: 'logout_cancelled',
            timestamp: Date.now(),
            userId: userStore.currentUser?.id,
          })
        },
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          handleLogout()
        },
      },
    ])
  }, [handleLogout, trackContentChange])

  const renderMenuItem = (item: any) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={() => handleMenuPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemContent}>
        <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
          <Ionicons name={item.icon as any} size={20} color={item.color} />
        </View>
        <Text text={item.title} size="medium" style={styles.menuTitle} />
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={theme.colors.palette.neutral400}
      />
    </TouchableOpacity>
  )

  return (
    <Screen preset="fixed" backgroundColor={theme.colors.palette.neutral100}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Info Section */}
        <View style={styles.profileSection}>
          <Text
            text="Profile Info"
            preset="subheading"
            style={styles.profileSectionHeader}
          />

          <View style={styles.profileContent}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {profile.avatar &&
              (profile.avatar.startsWith('data:image') ||
                profile.avatar.includes('base64')) ? (
                <Image
                  source={{
                    uri: profile.avatar.startsWith('data:image')
                      ? profile.avatar
                      : `data:image/png;base64,${profile.avatar}`,
                  }}
                  style={styles.avatar}
                  onError={() => {
                    // If image fails to load, show placeholder
                    setProfile((prev: any) => ({ ...prev, avatar: null }))
                  }}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text
                    text={
                      profile.name
                        ? profile.name
                            .split(' ')
                            .map((word: string) => word.charAt(0).toUpperCase())
                            .join('')
                            .slice(0, 2)
                        : 'U'
                    }
                    size="xl"
                    weight="bold"
                    style={styles.avatarInitials}
                  />
                </View>
              )}
            </View>

            {/* Name */}
            <Text
              text={loading ? 'Loading...' : profile.name}
              size="xl"
              weight="bold"
              style={styles.profileName}
            />

            {/* Phone Number */}
            <Text
              text={loading ? 'Loading...' : profile.phoneNumber}
              size="medium"
              style={styles.phoneNumber}
            />

            {/* Edit Profile Button */}
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditProfile}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={theme.colors.palette.primary500}
              />
              <Text
                text="Edit Profile"
                size="small"
                weight="medium"
                style={styles.editButtonText}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <Text
            text="Settings"
            size="large"
            preset="default"
            // weight="bold"
            style={styles.settingsSectionHeader}
          />

          <View style={styles.menuContainer}>
            {PROFILE_MENU_ITEMS.map(renderMenuItem)}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
          <Ionicons
            name="log-out-outline"
            size={20}
            color={theme.colors.palette.neutral100}
          />
          <Text
            text="Logout"
            size="medium"
            weight="medium"
            style={styles.logoutText}
          />
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: metrics.medium,
      paddingBottom: metrics.xl, // Add some padding at the bottom for the logout button
      paddingTop: metrics.xxl,
    },
    profileSection: {
      marginBottom: metrics.xl,
    },
    profileSectionHeader: {
      color: theme.colors.palette.neutral800,
      marginBottom: metrics.medium,
      textAlign: 'center',
    },
    profileContent: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      padding: metrics.medium,
      alignItems: 'center',
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: metrics.medium,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitials: {
      color: theme.colors.palette.neutral800,
    },
    profileName: {
      color: theme.colors.palette.neutral800,
      marginBottom: metrics.tiny,
    },
    phoneNumber: {
      color: theme.colors.palette.neutral600,
      marginBottom: metrics.medium,
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.primary500 + '15',
      paddingVertical: metrics.small,
      paddingHorizontal: metrics.medium,
      borderRadius: metrics.borderRadiusLarge,
      gap: metrics.tiny,
    },
    editButtonText: {
      color: theme.colors.palette.primary500,
    },
    settingsSection: {
      marginBottom: metrics.xl,
    },
    settingsSectionHeader: {
      color: theme.colors.palette.neutral800,
      marginBottom: metrics.medium,
    },
    menuContainer: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
    },
    menuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: metrics.medium,
      paddingHorizontal: metrics.medium,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    menuItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: metrics.medium,
    },
    menuTitle: {
      color: theme.colors.palette.neutral800,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.palette.primary500,
      paddingVertical: metrics.medium,
      borderRadius: metrics.borderRadiusLarge,
      marginTop: metrics.medium, // Add some space above the logout button
      gap: metrics.small,
    },
    logoutText: {
      color: theme.colors.palette.neutral100,
    },
  })
