import React, { useCallback } from 'react'
import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, useTheme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'

import { AppHeader, EmptyState, FancyAlert } from '@/components'
import { useStores } from '@/models/helpers/useStores'
import { useFocusEffect, useRouter } from 'expo-router'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

export default observer(function ProfileScreen() {
  const router = useRouter()
  const { theme } = useTheme()
  const { userStore, videoStore, playlistStore } = useStores()
  const { trackScreenMount } = useInteractionTracking('profile', '/profile')
  const [showLogoutAlert, setShowLogoutAlert] = React.useState(false)
  const [userChannel, setUserChannel] = React.useState<any>(null)

  async function loadUserChannel() {
    if (!userStore.isAuthenticated || !userStore.user) return

    try {
      const channels = await userStore.getUserChannels()
      if (channels?.length > 0) {
        setUserChannel(channels[0]) // Assuming single channel
      }
    } catch (error) {
      console.error('Failed to load user channel:', error)
    }
  }

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'profile',
        route: '/profile',
      })

      loadUserChannel()

      return () => {
        console.log('Profile screen unfocused.')
      }
    }, [userStore.isAuthenticated, userStore.user]),
  )

  // Separate menu items into sections
  const userDetailsItems = [
    {
      icon: 'person-outline' as const,
      title: 'Name',
      subtitle: userStore.user?.username || 'Guest User',
      onPress: () => router.push('/profile/name'),
    },
    {
      icon: 'tv-outline' as const,
      title: 'Channel Name',
      subtitle: userChannel?.name || 'Loading...',
      onPress: () => router.push('/profile/channel'),
    },
    {
      icon: 'mail-outline' as const,
      title: 'Email',
      subtitle: userStore.user?.email || 'Not signed in',
      onPress: () => router.push('/profile/email'),
    },
    {
      icon: 'lock-closed-outline' as const,
      title: 'Password',
      subtitle: '••••••••',
      onPress: () => router.push('/profile/password'),
    },
  ]

  const activitiesItems = [
    {
      icon: 'time-outline' as const,
      title: 'Watch History',
      subtitle: `${videoStore?.watchHistory.length || 0} videos`,
      onPress: () => router.push('/watch-history'),
    },
    {
      icon: 'list-outline' as const,
      title: 'Playlists',
      subtitle: `${playlistStore.playlists.length} playlists`,
      onPress: () => router.push('/playlists'),
    },
  ]

  const helpItems = [
    {
      icon: 'document-text-outline' as const,
      title: 'Terms & Conditions',
      onPress: () => router.push('/terms'),
    },
    {
      icon: 'shield-checkmark-outline' as const,
      title: 'Privacy Policy',
      onPress: () => router.push('/privacy'),
    },
  ]

  const SectionHeader = ({ title }: { title: string }) => (
    <Text
      style={[styles.sectionHeader, { color: theme.colors.text }]}
      text={title}
    />
  )

  const ProfileMenuItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showChevron = true,
  }: {
    icon: keyof typeof Ionicons.glyphMap
    title: string
    subtitle?: string
    onPress?: () => void
    showChevron?: boolean
  }) => (
    <TouchableOpacity
      style={[
        styles.menuItem,
        { backgroundColor: theme.colors.palette.neutral400 },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.menuItemLeft}>
        <View
          style={[
            styles.menuIconContainer,
            { backgroundColor: theme.colors.palette.primary200 },
          ]}
        >
          <Ionicons name={icon} size={20} color={theme.colors.text} />
        </View>
        <View style={styles.menuItemText}>
          <Text
            style={[styles.menuItemTitle, { color: theme.colors.text }]}
            text={title}
          />
          {subtitle && (
            <Text
              style={[
                styles.menuItemSubtitle,
                { color: theme.colors.palette.neutral700 },
              ]}
              text={subtitle}
            />
          )}
        </View>
      </View>
      {showChevron && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.palette.neutral700}
        />
      )}
    </TouchableOpacity>
  )

  if (!userStore.isAuthenticated) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[
            theme.colors.palette.neutral200,
            theme.colors.palette.neutral300,
            theme.colors.palette.neutral100,
          ]}
          locations={[0, 0.4, 1]}
          style={styles.backgroundGradient}
        />

        <SafeAreaView style={styles.safeArea}>
          <AppHeader title="Profile" />
          <EmptyState
            icon="person-outline"
            title="Sign In Required"
            description="Sign in to access your profile, watch history, and personalized features."
          />
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.neutral200,
          theme.colors.palette.neutral300,
          theme.colors.palette.neutral100,
        ]}
        locations={[0, 0.4, 1]}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Profile" />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* <ProfileHeader /> */}

          {/* Your Details Section */}
          <View style={styles.menuSection}>
            <SectionHeader title="Your Details" />
            {userDetailsItems.map((item, index) => (
              <ProfileMenuItem
                key={index}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                onPress={item.onPress}
              />
            ))}
          </View>

          {/* Your Activities Section */}
          <View style={styles.menuSection}>
            <SectionHeader title="Your Activities" />
            {activitiesItems.map((item, index) => (
              <ProfileMenuItem
                key={index}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                onPress={item.onPress}
              />
            ))}
          </View>

          {/* Help & Support Section */}
          <View style={styles.menuSection}>
            <SectionHeader title="Help & Support" />
            {helpItems.map((item, index) => (
              <ProfileMenuItem
                key={index}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                onPress={item.onPress}
              />
            ))}
          </View>
          <TouchableOpacity
            style={[
              styles.logoutButton,
              { backgroundColor: theme.colors.palette.angry200 },
            ]}
            onPress={() => setShowLogoutAlert(true)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={theme.colors.text}
            />
            <Text
              style={[styles.logoutText, { color: theme.colors.text }]}
              text="Sign Out"
            />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* Logout Confirmation Alert */}
      <FancyAlert
        visible={showLogoutAlert}
        preset="warning"
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={() => {
          userStore.logout()
          videoStore.logOut()
          setShowLogoutAlert(false)
          setTimeout(() => {
            router.push('/(app)/home')
          }, 1000)
        }}
        onClose={() => setShowLogoutAlert(false)}
      />
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    margin: 16,
    borderRadius: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileDisplay: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  menuSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
    alignSelf: 'center',
    padding: 16,
    marginTop: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
})
