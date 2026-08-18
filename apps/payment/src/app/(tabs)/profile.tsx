import { Screen, Text } from '@/components'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { translate, TxKeyPath } from '@/i18n'
import { useStores } from '@/models/helpers/useStores'
import { UserStore } from '@/models/UserStore'
import { useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

// Define StatItem component with proper types
interface StatItemProps {
  value: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  color: string
  theme: any
}

const StatItem = ({ value, label, icon, color, theme }: StatItemProps) => {
  const styles = createStyles(theme)
  return (
    <View style={styles.statItem}>
      <View style={[styles.statIconWrapper, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.statTextContainer}>
        <Text
          text={value}
          size="lg"
          weight="bold"
          style={[styles.statValue, { color }]}
        />
        <Text text={label} size="xs" style={styles.statLabel} />
      </View>
    </View>
  )
}

// Define menu item interface
interface MenuItem {
  id: string
  title: TxKeyPath
  icon: keyof typeof Ionicons.glyphMap

  subtitle: string | ((store?: UserStore) => string)
  color: string

  onPress?: (store: UserStore) => void
}

// Define menu items - will be populated inside component with theme colors
const getMenuItems = (theme: any): MenuItem[] => [
  {
    id: 'limits',
    title: 'profileScreen:transactionLimits',
    icon: 'trending-up-outline',
    subtitle: (store?: UserStore) => {
      const limits = store?.transactionLimits
      return `Daily: $${limits?.dailyLimit?.toLocaleString() ?? '0'}`
    },
    color: theme.colors.palette.primary500,
    onPress: () => router.push('/screens/settings/TransactionLimits' as any),
  },

  {
    id: 'pin',
    title: 'profileScreen:changePin',
    icon: 'key-outline',
    subtitle: 'Change your transaction PIN',
    color: theme.colors.palette.secondary500,
    onPress: () => router.push('/screens/settings/change-pin' as any),
  },
]

const ProfileScreen = observer(function ProfileScreen() {
  const { theme } = useAppTheme()
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('Profile', '/(tabs)/profile')
  const { userStore, sessionStore, uiStore } = useStores()
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const { width, height } = Dimensions.get('window')

  const styles = createStyles(theme)
  const MENU_ITEMS = getMenuItems(theme)

  // Load session data if exists
  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession(sessionId as string)

      if (session?.data?.sessionData) {
        const savedState = session.data.sessionData.formData as any

        // Restore state from session if needed
        if (savedState) {
          // Track content change after state restoration
          trackContentChange({
            event: 'session_state_restored',
            restoredState: savedState,
            timestamp: Date.now(),
          })
        }
      }
      setIsSessionLoaded(true)
    }
  }, [sessionTimeStamp, sessionStore])

  // Track screen mount with initial form data
  useFocusEffect(
    useCallback(() => {
      if (isSessionLoaded) {
        trackScreenMount({
          userProfile: {
            displayName: userStore.userProfile?.displayName,
            phoneNumber: userStore.userProfile?.phoneNumber,
            accountStatus: userStore.accountStatus,
            isKycVerified: userStore.isKycVerified,
          },
          timestamp: Date.now(),
          platform: Platform.OS,
          screenDimensions: {
            width,
            height,
          },
          sessionId,
        })
      }
    }, [
      trackScreenMount,
      userStore.userProfile,
      userStore.accountStatus,
      userStore.isKycVerified,
      sessionId,
      width,
      height,
    ]),
  )

  useEffect(() => {
    trackScreenMount({
      userProfile: {
        displayName: userStore.userProfile?.displayName,
        phoneNumber: userStore.userProfile?.phoneNumber,
        accountStatus: userStore.accountStatus,
        isKycVerified: userStore.isKycVerified,
      },
    })
  }, [uiStore.mockDataAppendTime])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()
  }, [fadeAnim, slideAnim])

  const handleMenuPress = useCallback(
    (menuId: string, item: MenuItem) => {
      trackClick(`menu_item_${menuId}`)
      if (menuId === 'logout') {
        userStore.logout()
        router.replace('/screens/auth/phone-login' as any)
      } else if (item.onPress) {
        item.onPress(userStore)
      }
    },
    [userStore, trackClick],
  )

  const getMenuSubtitle = useCallback(
    (item: MenuItem) => {
      if (typeof item.subtitle === 'function') {
        return item.subtitle(userStore)
      }
      return item.subtitle
    },
    [userStore],
  )

  const userProfile = userStore.userProfile

  // Track profile data changes
  useEffect(() => {
    if (isSessionLoaded) {
      trackContentChange({
        userProfile: {
          displayName: userStore.userProfile?.displayName,
          phoneNumber: userStore.userProfile?.phoneNumber,
          accountStatus: userStore.accountStatus,
          isKycVerified: userStore.isKycVerified,
        },
        timestamp: Date.now(),
      })
    }
  }, [
    isSessionLoaded,
    trackContentChange,
    userStore.userProfile?.displayName,
    userStore.userProfile?.phoneNumber,
    userStore.accountStatus,
    userStore.isKycVerified,
  ])

  return (
    <Screen preset="scroll" style={styles.screen}>
      <LinearGradient
        colors={[
          theme.colors.palette.primary400,
          theme.colors.palette.secondary400,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerContainer}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarPlaceholder}>
                <Text text={userStore.userInitials} style={styles.avatarText} />
              </View>
              <View
                style={[
                  styles.verificationBadge,
                  {
                    backgroundColor: userStore.isKycVerified
                      ? theme.colors.palette.primary500
                      : theme.colors.palette.angry500,
                  },
                ]}
              >
                <Ionicons
                  name={
                    userStore.isKycVerified
                      ? 'shield-checkmark'
                      : 'alert-circle'
                  }
                  size={16}
                  color={theme.colors.palette.neutral100}
                />
              </View>
            </View>
          </View>

          <View style={styles.userInfoSection}>
            <Text
              text={userProfile?.displayName || 'User Name'}
              preset="default"
              style={styles.name}
              numberOfLines={2}
            />
            <Text
              text={userProfile?.phoneNumber || ''}
              size="md"
              style={styles.phone}
              numberOfLines={1}
            />
            <View style={styles.statusContainer}>
              <View style={styles.statusDot} />
              <Text
                text={userStore.accountStatus.toUpperCase()}
                size="xs"
                style={styles.statusText}
                numberOfLines={1}
              />
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <StatItem
          value={`$${userStore.transactionLimits?.dailyLimit?.toLocaleString() ?? '0'}`}
          label="Daily Limit"
          icon="timer-outline"
          color={theme.colors.palette.primary500}
          theme={theme}
        />
        <View style={styles.statDivider} />
        <StatItem
          value={`$${userStore.transactionLimits?.monthlyLimit?.toLocaleString() ?? '0'}`}
          label="Monthly Limit"
          icon="calendar-outline"
          color={theme.colors.palette.secondary500}
          theme={theme}
        />
      </View>

      <View style={styles.menuContainer}>
        {MENU_ITEMS.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => handleMenuPress(item.id, item)}
          >
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: item.color },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={24}
                color={theme.colors.palette.neutral100}
              />
            </View>
            <View style={styles.menuContent}>
              <View style={styles.menuTextContainer}>
                <Text
                  text={translate(item.title)}
                  size="md"
                  weight="medium"
                  style={styles.menuTitle}
                />
                <Text
                  text={getMenuSubtitle(item)}
                  size="sm"
                  style={styles.menuSubtitle}
                />
              </View>
              <Ionicons name="chevron-forward" size={20} color={item.color} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() =>
          handleMenuPress('logout', {
            id: 'logout',
            title: 'common:logout' as TxKeyPath,
            icon: 'log-out-outline',
            subtitle: '',
            color: theme.colors.palette.angry500,
          })
        }
      >
        <LinearGradient
          colors={[
            theme.colors.palette.angry500,
            theme.colors.palette.angry400,
          ]}
          style={styles.logoutGradient}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={theme.colors.palette.neutral100}
          />
          <Text text="Sign Out" size="md" style={styles.logoutText} />
        </LinearGradient>
      </TouchableOpacity>
    </Screen>
  )
})

const createStyles = (theme: any) =>
  StyleSheet.create({
    screen: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    headerContainer: {
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 32,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      marginBottom: 20,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      gap: 20,
      paddingTop: Platform.OS === 'ios' ? 12 : 8,
    },
    avatarSection: {
      flex: 0,
      marginRight: 0,
    },
    userInfoSection: {
      flex: 1,
      paddingVertical: 4,
    },
    avatarContainer: {
      position: 'relative',
      padding: 4,
      borderRadius: 44,
      backgroundColor: theme.colors.palette.neutral100,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    avatarPlaceholder: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: theme.colors.palette.primary100,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: theme.colors.palette.neutral100,
      overflow: 'hidden',
    },
    avatarText: {
      fontSize: 32,
      color: theme.colors.palette.primary500,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      textAlignVertical: 'center',
      includeFontPadding: false,
      lineHeight: 84,
      textAlign: 'center',
    },
    name: {
      fontSize: 32,
      color: theme.colors.palette.neutral100,
      textTransform: 'uppercase',
      marginBottom: 6,
      lineHeight: 36,
      includeFontPadding: true,
      fontFamily: 'Poppins-Bold',
    },
    phone: {
      color: theme.colors.palette.neutral200,
      marginBottom: 10,
      fontSize: 16,
      lineHeight: 20,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: 24,
      backgroundColor: theme.colors.palette.neutral100,
      marginHorizontal: 16,
      borderRadius: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
    },
    statItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    statIconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statTextContainer: {
      flex: 1,
    },
    statValue: {
      fontSize: 18,
      marginBottom: 2,
      includeFontPadding: false,
    },
    statLabel: {
      color: theme.colors.textDim,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statDivider: {
      width: 1,
      backgroundColor: theme.colors.palette.neutral300,
      marginHorizontal: 16,
      alignSelf: 'stretch',
    },
    menuContainer: {
      marginHorizontal: 20,
      marginTop: 20,
      gap: 12,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: Platform.OS === 'android' ? 4 : 2,
      backgroundColor: theme.colors.palette.neutral100,
    },
    menuIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 16,
    },
    menuTextContainer: {
      flex: 1,
    },
    menuTitle: {
      color: theme.colors.text,
      marginBottom: 2,
    },
    menuSubtitle: {
      color: theme.colors.textDim,
      fontSize: 12,
    },
    logoutButton: {
      marginHorizontal: 20,
      marginTop: 30,
      marginBottom: 40,
      borderRadius: 16,
      overflow: 'hidden',
    },
    logoutGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      gap: 8,
    },
    logoutText: {
      color: theme.colors.palette.neutral100,
    },
    verificationBadge: {
      position: 'absolute',
      right: -4,
      bottom: -4,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral100,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${theme.colors.palette.neutral100}26`,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      alignSelf: 'flex-start',
      gap: 6,
      marginTop: 4,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.palette.primary500,
    },
    statusText: {
      color: theme.colors.palette.neutral100,
      fontWeight: '600',
    },
    quickActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      paddingHorizontal: 24,
      marginTop: 20,
    },
    actionButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${theme.colors.palette.neutral100}1A`,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: `${theme.colors.palette.neutral100}33`,
    },
  })

export default ProfileScreen
