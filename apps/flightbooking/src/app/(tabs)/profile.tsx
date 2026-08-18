import { Screen, Text, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native'
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'

import { getBookingStats } from '@/db/queries'
import { useStores } from '@/models'

export default observer(function ProfileTab() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore, profileStore } = useStores()
  const { trackScreenMount, trackClick } = useInteractionTracking(
    'profile',
    '/profile',
  )
  const params = useLocalSearchParams()

  // Get user data from store (userStore.user, not currentUser)
  const currentUser = userStore?.user || null

  // Session restoration tracking
  const sessionRestoredRef = useRef(false)
  const lastSessionTimeStampRef = useRef<string | null>(null)

  // Fetch stats fresh each time - don't persist
  const [bookingStats, setBookingStats] = useState({
    totalBookings: 0,
    confirmedBookings: 0,
    cancelledBookings: 0,
    totalSpent: 0,
  })

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('Profile - Current user:', currentUser)
    // eslint-disable-next-line no-console
    console.log('Profile - Is authenticated:', userStore?.isAuthenticated)
    // eslint-disable-next-line no-console
    console.log('Profile - User from store:', userStore?.user)

    if (currentUser?.id) {
      loadBookingStats()
    } else {
      console.warn('No user found in store - user may not be logged in')
      profileStore.setLoading(false)
    }
  }, [currentUser?.id])

  // Track screen mount on initial load
  useEffect(() => {
    trackScreenMount()
  }, [trackScreenMount])

  // Handle session restoration (following devices.tsx pattern)
  useEffect(() => {
    // Reset restoration flag when a new session is detected
    const currentSessionTimeStamp = Array.isArray(params?.sessionTimeStamp)
      ? params.sessionTimeStamp[0]
      : params?.sessionTimeStamp

    if (
      currentSessionTimeStamp &&
      currentSessionTimeStamp !== lastSessionTimeStampRef.current
    ) {
      sessionRestoredRef.current = false
      lastSessionTimeStampRef.current = currentSessionTimeStamp
    }

    if (currentSessionTimeStamp && !sessionRestoredRef.current) {
      const rootStore = profileStore.getRootStore?.() as any
      const sessionData = rootStore?.sessionStore?.getSession(
        currentSessionTimeStamp,
      )

      if (sessionData?.data) {
        // Mark session as restored to prevent multiple restoration
        sessionRestoredRef.current = true
      } else {
        // Profile session data not found
        sessionRestoredRef.current = true // Mark as restored even if no data found
      }
    } else if (currentSessionTimeStamp && sessionRestoredRef.current) {
      // Session already restored, skipping restoration
    } else {
      // No sessionTimeStamp parameter found
    }
  }, [params?.sessionTimeStamp, profileStore])

  const loadBookingStats = useCallback(async () => {
    if (!currentUser?.id) return

    try {
      profileStore.setLoading(true)
      const stats = await getBookingStats(currentUser.id)
      setBookingStats(stats)
    } catch (error) {
      console.error('Error loading booking stats:', error)
    } finally {
      profileStore.setLoading(false)
    }
  }, [currentUser?.id, profileStore])

  // Track screen focus
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'profile',
        route: '/profile',
        sessionTimeStamp: params?.sessionTimeStamp,
      })

      if (currentUser?.id) {
        loadBookingStats()
      }

      return () => {
        getLatestInteraction()
      }
    }, [
      currentUser?.id,
      loadBookingStats,
      trackScreenMount,
      params?.sessionTimeStamp,
    ]),
  )

  const menuItems = [
    {
      id: 'bookings',
      title: 'My Bookings',
      icon: 'airplane-outline',
      color: theme.colors.palette.primary500,
      route: '/tickets',
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      icon: 'shield-checkmark-outline',
      color: theme.colors.palette.secondary500,
      route: '/(legal)/privacy',
    },
    {
      id: 'terms',
      title: 'Terms & Conditions',
      icon: 'document-text-outline',
      color: theme.colors.palette.neutral600,
      route: '/(legal)/terms',
    },
  ]

  const milesEarned = Math.max(
    0,
    Math.round((bookingStats.totalSpent ?? 0) * 5),
  )
  const upcomingTrips = Math.max(
    (bookingStats.confirmedBookings || 0) -
      (bookingStats.cancelledBookings || 0),
    0,
  )

  const statCards = [
    {
      id: 'booked',
      label: 'Trip History',
      value: bookingStats.totalBookings,
      icon: 'airplane',
      color: theme.colors.palette.primary500,
    },
    {
      id: 'miles',
      label: 'Reward Miles',
      value: milesEarned.toLocaleString(),
      icon: 'star',
      color: theme.colors.palette.secondary500,
    },
    {
      id: 'upcoming',
      label: 'Upcoming Trips',
      value: upcomingTrips,
      icon: 'calendar-outline',
      color: theme.colors.palette.secondary400,
    },
  ]

  const handleMenuItemPress = (itemId: string, route: string | null) => {
    trackClick(`menu_item_${itemId}`)

    if (route) {
      router.push(route as any)
    } else {
      Alert.alert('Coming Soon', `${itemId} feature is under development`)
    }
  }

  const handleLogout = () => {
    trackClick('logout_button')

    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          trackClick('logout_confirmed')
          userStore?.logout()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  return (
    <Screen
      preset="scroll"
      safeAreaEdges={['top']}
      contentContainerStyle={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          </View>
          <Text style={styles.userName}>
            {currentUser?.username || 'Guest User'}
          </Text>
          <Text style={styles.userEmail}>
            {currentUser?.email || 'Not signed in'}
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {statCards.map(card => (
            <View key={card.id} style={styles.statCard}>
              <Ionicons
                name={card.icon as keyof typeof Ionicons.glyphMap}
                size={22}
                color={card.color}
                style={styles.statIcon}
              />
              <Text style={styles.statNumber}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          {menuItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleMenuItemPress(item.id, item.route)}
            >
              <View style={styles.menuItemLeft}>
                <View
                  style={[
                    styles.menuIcon,
                    { backgroundColor: item.color + '20' },
                  ]}
                >
                  <Ionicons
                    name={item.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={item.color}
                  />
                </View>
                <Text style={styles.menuItemText}>{item.title}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.colors.palette.neutral400}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons
            name="log-out-outline"
            size={20}
            color={theme.colors.palette.angry500}
          />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },
    header: {
      backgroundColor: theme.colors.palette.primary500,
      paddingVertical: 16,
      paddingHorizontal: 20,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 6,
    },
    headerTitle: {
      fontSize: 24,
      color: theme.colors.palette.neutral100,
      textAlign: 'center',
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
    },
    profileCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      marginBottom: 20,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    avatarContainer: {
      marginBottom: 12,
    },
    avatar: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: theme.colors.palette.primary500,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    userName: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
    },
    statsContainer: {
      flexDirection: 'row',
      marginBottom: 24,
      gap: 10,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    statIcon: {
      marginBottom: 6,
    },
    statNumber: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 2,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.neutral700,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    menuIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuItemText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.palette.neutral900,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 14,
      marginTop: 8,
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.palette.angry200,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.angry500,
    },
  })
