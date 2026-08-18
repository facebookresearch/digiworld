import { Screen, Text } from '@/components'
import { translate, TxKeyPath } from '@/i18n'
import { useStores } from '@/models/helpers/useStores'
import { UserStore } from '@/models/UserStore'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { debounce } from 'lodash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

interface MenuItem {
  id: string
  title: TxKeyPath
  icon: keyof typeof Ionicons.glyphMap

  subtitle: string | ((store?: UserStore) => string)
  color: string
  route?: string

  onPress?: (store: UserStore) => void
}

const createMenuItems = (theme: Theme): MenuItem[] => [
  {
    id: 'profile',
    title: 'profileScreen:editProfile',
    icon: 'person-outline',
    subtitle: 'Name, avatar & personal info',
    color: theme.colors.palette.primary500,
    route: '/screens/settings/EditProfile',
  },
  {
    id: 'language',
    title: 'profileScreen:language',
    icon: 'language-outline',
    subtitle: (store?: UserStore) => {
      const currentLang = store?.userSettings?.language || 'en'
      return translate('profileScreen:currentLanguage', {
        language: currentLang === 'en' ? 'English' : 'हिंदी',
      })
    },
    color: theme.colors.palette.secondary500,
    onPress: (store: UserStore) => {
      const currentLang = store.userSettings?.language || 'en'
      const newLang = currentLang === 'en' ? 'hi' : 'en'
      Alert.alert(
        translate('common:alert'),
        translate('profileScreen:languageChangeMessage') +
          store.userSettings?.language +
          ' to ' +
          newLang,
        [
          {
            text: translate('common:cancel'),
            style: 'cancel',
          },
          {
            text: translate('common:confirm'),
            onPress: async () => {
              await store.updateLanguage(newLang)
              // Force app restart by replacing to welcome screen
              setTimeout(() => {
                router.replace('/') // This points to index.tsx (splash screen)
              }, 500)
            },
          },
        ],
      )
    },
  },
]

export default function ProfileScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const MENU_ITEMS = useMemo(() => createMenuItems(theme), [theme])
  const { trackScreenMount, trackClick } = useInteractionTracking(
    'Profile',
    '/(tabs)/profile',
  )
  const { userStore } = useStores()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current

  const navigation = useNavigation()
  const [userDetails, setUserDetails] = useState(userStore.userProfile)
  useEffect(() => {
    trackScreenMount()
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
  }, [trackScreenMount, fadeAnim, slideAnim])

  const handleMenuPress = useCallback(
    debounce((menuId: string, item: MenuItem) => {
      if (menuId === 'logout') {
        userStore.logout()

        router.replace('/screens/auth/login' as any)
      } else if (item.onPress) {
        item.onPress(userStore)
      } else if (item.route) {
        router.push(item.route as any)
      }
    }, 300),
    [trackClick, userStore],
  )

  const getMenuSubtitle = useCallback(
    (item: (typeof MENU_ITEMS)[0]) => {
      if (typeof item.subtitle === 'function') {
        return item.subtitle(userStore)
      }
      return item.subtitle
    },
    [userStore],
  )
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        screen: 'profile',
        route: '/(tabs)/profile',
      })
    }, [trackScreenMount]),
  )

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setUserDetails(userStore.userProfile)
    })

    return unsubscribe
  }, [navigation])
  console.log('userDetails', userStore.userProfile)
  return (
    <Screen preset="scroll" style={styles.screen}>
      <LinearGradient
        colors={[
          theme.colors.palette.primary500,
          theme.colors.palette.secondary500,
        ]}
        style={styles.headerGradient}
      >
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Text
                text={userStore.userInitials}
                style={[
                  styles.avatarText,
                  { color: theme.colors.palette.primary500 },
                ]}
              />
            </View>

            <View style={styles.accountBadge}>
              <Text
                text={userStore.isAdmin ? 'Admin' : 'User'}
                size="xs"
                style={styles.accountType}
              />
            </View>
          </View>
          <Text
            text={userDetails?.firstName + ' ' + userDetails?.lastName || ''}
            size="xxl"
            weight="bold"
            style={[styles.name, { color: '#FFFFFF' }]}
          />
          <Text
            text={userDetails?.email || ''}
            size="md"
            style={[styles.email, { color: '#FFFFFF', opacity: 0.9 }]}
          />
        </Animated.View>
      </LinearGradient>

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
              <Ionicons name={item.icon as any} size={24} color="white" />
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
            title: 'common.back' as TxKeyPath,
            icon: 'log-out-outline',
            subtitle: '',
            color: theme.colors.palette.angry500,
          })
        }
      >
        <LinearGradient
          colors={[
            theme.colors.palette.secondary500,
            theme.colors.palette.secondary500,
          ]}
          style={styles.logoutGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
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
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    accountBadge: {
      backgroundColor: theme.colors.palette.neutral100,
      borderColor: theme.colors.palette.primary500,
      borderRadius: 12,
      borderWidth: 2,
      bottom: -5,
      opacity: 0.9,
      paddingHorizontal: 8,
      paddingVertical: 4,
      position: 'absolute',
      right: -5,
    },
    accountType: {
      color: theme.colors.palette.primary500,
      fontSize: 12,
      fontWeight: 'bold',
    },
    avatarContainer: {
      marginBottom: 16,
      position: 'relative',
    },
    avatarPlaceholder: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderColor: theme.colors.palette.neutral100,
      borderRadius: 50,
      borderWidth: 4,
      height: 100,
      justifyContent: 'center',
      width: 100,
    },
    avatarText: {
      fontSize: 36,
      color: theme.colors.palette.primary500,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      textAlignVertical: 'center',
      includeFontPadding: false,
      lineHeight: 84,
      textAlign: 'center',
    },
    email: {
      marginBottom: 4,
    },
    header: {
      alignItems: 'center',
    },
    headerGradient: {
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      paddingBottom: 40,
      paddingTop: 40,
    },
    logoutButton: {
      borderRadius: 16,
      marginBottom: 40,
      marginHorizontal: 20,
      marginTop: 30,
      overflow: 'hidden',
    },
    logoutGradient: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      padding: 16,
    },
    logoutText: {
      color: theme.colors.palette.neutral100,
    },
    menuContainer: {
      gap: 12,
      marginHorizontal: 20,
      marginTop: 20,
    },
    menuContent: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      marginLeft: 16,
    },
    menuIconContainer: {
      alignItems: 'center',
      borderRadius: 12,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    menuItem: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      elevation: Platform.OS === 'android' ? 4 : 2,
      flexDirection: 'row',
      padding: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
    },
    menuSubtitle: {
      color: theme.colors.textDim,
      fontSize: 12,
    },
    menuTextContainer: {
      flex: 1,
    },
    menuTitle: {
      color: theme.colors.text,
      marginBottom: 2,
    },
    name: {
      marginBottom: 4,
    },
    screen: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
  })
