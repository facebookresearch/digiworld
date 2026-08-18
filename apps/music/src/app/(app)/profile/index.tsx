// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { Text, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { SafeAreaView } from 'react-native-safe-area-context'
import LinearGradient from 'react-native-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { AvatarImage } from '@/components/MusicImage'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import type { TxKeyPath } from '@/i18n'
import { translate } from '@/i18n/translate'

interface MenuItem {
  id: string
  icon: keyof typeof Ionicons.glyphMap
  label: TxKeyPath
  onPress?: () => void
}

interface MenuSection {
  title: TxKeyPath
  items: MenuItem[]
}

interface PlayedSong {
  songId: number
  playedAt: string
}

interface Song {
  id: number
  duration: number
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'profile.sections.legal.title',
    items: [
      {
        id: 'terms',
        icon: 'document-text-outline',
        label: 'profile.sections.legal.termsAndConditions',
      },
      {
        id: 'privacy',
        icon: 'shield-outline',
        label: 'profile.sections.legal.privacyPolicy',
      },
    ],
  },
]

export default observer(function ProfileScreen() {
  const router = useRouter()
  const { userStore, musicStore } = useStores()
  const { theme } = useAppTheme()
  const styles = createStyles(theme)
  const { trackScreenMount } = useInteractionTracking('Profile', '/profile')

  // Calculate total time spent
  const timeSpent = useMemo(() => {
    const allPlayedSongs = userStore.recentlyPlayed || []
    const totalDuration = allPlayedSongs.reduce(
      (total: number, playedSong: PlayedSong) => {
        const song = musicStore.songs.find(
          (s: Song) => s.id === playedSong.songId,
        )
        return total + (song?.duration || 0)
      },
      0,
    ) // totalDuration in seconds

    const hours = Math.floor(totalDuration / 3600)
    const minutes = Math.floor((totalDuration % 3600) / 60)

    if (hours === 0) {
      return translate('profile.stats.timeFormat.onlyMinutes', { minutes })
    } else {
      return translate('profile.stats.timeFormat.hoursAndMinutes', {
        hours,
        plural: hours > 1 ? 's' : '',
        minutes,
      })
    }
  }, [userStore.recentlyPlayed, musicStore.songs])

  const menuSections = useMemo(() => {
    return MENU_SECTIONS.map(section => ({
      ...section,
      items: section.items.map(item => ({
        ...item,
        onPress:
          item.id === 'terms'
            ? () => router.push('/(legal)/terms')
            : item.id === 'privacy'
              ? () => router.push('/(legal)/privacy')
              : undefined,
      })),
    }))
  }, [router])

  const handleLogout = () => {
    userStore.logout()
    musicStore.logout()
    router.replace('/(auth)/login')
  }

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'profile',
        route: '/profile',
      })
    }, []),
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <LinearGradient
        colors={[theme.colors.palette.primary500, theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.headerGradient}
      />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.header}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarPlaceholder}>
                  <AvatarImage
                    entityId={userStore.user?.id || 1}
                    style={styles.avatarImage}
                  />
                </View>
              </View>
              <View style={styles.statusIndicator} />
            </View>
            <View style={styles.userInfoContainer}>
              <Text style={styles.name} numberOfLines={1}>
                {userStore.user?.username}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {userStore.user?.email}
              </Text>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {musicStore.playlists.length}
                  </Text>
                  <Text style={styles.statLabel} testID="">
                    {translate('profile.stats.playlists')}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{timeSpent}</Text>
                  <Text style={styles.statLabel}>
                    {translate('profile.stats.timeSpent')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {menuSections.map(section => (
            <View key={section.title} style={styles.menuSection}>
              <Text style={styles.sectionTitle}>
                {translate(section.title)}
              </Text>
              {section.items.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.menuItem, styles.menuItemEnhanced]}
                  onPress={
                    item.onPress ||
                    (item.id === 'logout' ? handleLogout : undefined)
                  }
                >
                  <View style={styles.menuItemContent}>
                    <View style={styles.menuIconContainer}>
                      <Ionicons
                        name={item.icon}
                        size={22}
                        color={theme.colors.text}
                      />
                    </View>
                    <Text style={styles.menuItemLabel}>
                      {translate(item.label)}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.textDim}
                  />
                </TouchableOpacity>
              ))}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.logoutButton, styles.menuItemEnhanced]}
            onPress={handleLogout}
          >
            <View style={styles.menuItemContent}>
              <View style={[styles.menuIconContainer, styles.logoutIcon]}>
                <Ionicons
                  name="log-out-outline"
                  size={22}
                  color={theme.colors.error}
                />
              </View>
              <Text style={styles.logoutText}>
                {translate('profile.actions.logOut')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
})

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    headerGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 400,
      zIndex: 0,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 20,
      zIndex: 1,
    },
    avatarImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    profileInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 20,
      paddingHorizontal: 20,
    },
    avatarWrapper: {
      position: 'relative',
      marginRight: 20,
    },

    avatarContainer: {
      width: 88,
      height: 88,
      borderRadius: 44,
      borderWidth: 2,
      borderColor: theme.colors.tint,
      padding: 2,
      backgroundColor: theme.colors.background,
    },
    avatarPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.palette.neutral500,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 42,
    },
    statusIndicator: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.tint,
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    userInfoContainer: {
      flex: 1,
      alignItems: 'center',
    },
    name: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    email: {
      fontSize: 14,
      color: theme.colors.textDim,
    },
    statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
    },
    statItem: {
      alignItems: 'center',
    },
    statNumber: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    statLabel: {
      color: theme.colors.textDim,
      fontSize: 12,
    },
    statDivider: {
      width: 1,
      height: 20,
      backgroundColor: theme.colors.palette.neutral400,
      marginHorizontal: 16,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    menuSection: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 16,
      letterSpacing: 0.3,
      paddingLeft: 12,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 8,
    },
    menuItemEnhanced: {
      backgroundColor: theme.colors.palette.neutral400,
    },
    menuItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    menuIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.palette.neutral400,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuItemLabel: {
      fontSize: 15,
      color: theme.colors.text,
      fontWeight: '500',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginTop: 8,
    },
    logoutIcon: {
      backgroundColor: theme.colors.errorBackground,
    },
    logoutText: {
      fontSize: 15,
      color: theme.colors.error,
      fontWeight: '500',
    },
  })
