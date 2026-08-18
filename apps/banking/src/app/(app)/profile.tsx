// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useMemo } from 'react'
import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { useStores } from '@/models'
import { useFocusEffect, useRouter } from 'expo-router'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'

export default observer(function ProfileScreen() {
  const router = useRouter()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore, bankingStore } = useStores()
  const { trackScreenMount } = useInteractionTracking('profile', '/profile')
  const [showLogoutAlert, setShowLogoutAlert] = React.useState(false)

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'profile',
        route: '/profile',
      })
      return () => {
        console.log('Profile screen unfocused.')
      }
    }, [userStore.isAuthenticated, userStore.user]),
  )

  // Debounced navigation functions
  const handleNameNavigation = debounce(() => {
    router.push('/profile/name')
  }, 300)

  const handlePasswordNavigation = debounce(() => {
    router.push('/profile/password')
  }, 300)

  const handleCardsNavigation = debounce(() => {
    router.push('/cards')
  }, 300)

  const handleTermsNavigation = debounce(() => {
    router.push('/terms')
  }, 300)

  const handlePrivacyNavigation = debounce(() => {
    router.push('/privacy')
  }, 300)

  // Separate menu items into sections
  const userDetailsItems = [
    {
      icon: 'person-outline' as const,
      title: 'Name',
      subtitle: userStore.user?.username || 'Guest User',
      onPress: handleNameNavigation,
    },
    {
      icon: 'mail-outline' as const,
      title: 'Email',
      subtitle: userStore.user?.email || 'Not signed in',
      onPress: undefined, // Email is not editable
    },
    {
      icon: 'lock-closed-outline' as const,
      title: 'Password',
      subtitle: '••••••••',
      onPress: handlePasswordNavigation,
    },
    // {
    //   icon: 'key-outline' as const,
    //   title: 'Edit PIN',
    //   subtitle: 'Change your PIN',
    //   onPress: () => router.push('/profile/changePin'),
    // },
  ]

  const bankingServicesItems = [
    {
      icon: 'card-outline' as const,
      title: 'Credit Cards',
      subtitle: `${bankingStore.creditCards?.filter(card => card.status === 'active')?.length || 0} cards`,
      onPress: handleCardsNavigation,
    },
  ]

  const helpItems = [
    {
      icon: 'document-text-outline' as const,
      title: 'Terms & Conditions',
      onPress: handleTermsNavigation,
    },
    {
      icon: 'shield-checkmark-outline' as const,
      title: 'Privacy Policy',
      onPress: handlePrivacyNavigation,
    },
  ]

  const SectionHeader = ({ title }: { title: string }) => (
    <Text preset="default" style={styles.sectionHeader}>
      {title}
    </Text>
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
        { backgroundColor: theme.colors.palette.neutral300 },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.menuItemLeft}>
        <View
          style={[
            styles.menuIconContainer,
            { backgroundColor: theme.colors.palette.primary400 },
          ]}
        >
          <Ionicons
            name={icon}
            size={20}
            color={theme.colors.palette.neutral300}
          />
        </View>
        <View style={styles.menuItemText}>
          <Text style={styles.menuItemTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
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
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text
            preset="subheading"
            style={{ color: theme.colors.text as string }}
          >
            Profile Details
          </Text>
        </View>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Your Details Section */}
          <View style={styles.menuSection}>
            <SectionHeader title="User Details" />
            {userDetailsItems.map((item, index) => (
              <ProfileMenuItem
                key={index}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                onPress={item.onPress}
                showChevron={!!item.onPress}
              />
            ))}
          </View>

          {/* Banking Services Section */}
          <View style={styles.menuSection}>
            <SectionHeader title="Banking Services" />
            {bankingServicesItems.map((item, index) => (
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
                onPress={item.onPress}
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => setShowLogoutAlert(true)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={theme.colors.palette.neutral200}
            />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* Logout Confirmation Alert */}
      {showLogoutAlert && (
        <View style={styles.alertOverlay}>
          <View
            style={[
              styles.alertContainer,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <Text
              style={[styles.alertTitle, { color: theme.colors.text }] as any}
            >
              Sign Out
            </Text>
            <Text
              style={
                [styles.alertMessage, { color: theme.colors.textDim }] as any
              }
            >
              Are you sure you want to sign out?
            </Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={[styles.alertButton, styles.cancelButton]}
                onPress={() => setShowLogoutAlert(false)}
              >
                <Text
                  style={
                    [
                      styles.cancelButtonText,
                      { color: theme.colors.text },
                    ] as any
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.alertButton,
                  styles.confirmButton,
                  { backgroundColor: theme.colors.palette.angry400 },
                ]}
                onPress={() => {
                  userStore.logout()
                  setShowLogoutAlert(false)
                  setTimeout(() => {
                    router.replace('/(auth)/login')
                  }, 1000)
                }}
              >
                <Text style={styles.confirmButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
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
    header: {
      paddingHorizontal: 24,
      paddingVertical: 20,
    },

    content: {
      flex: 1,
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyStateTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginTop: 16,
      marginBottom: 8,
    },
    emptyStateDescription: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
    },
    sectionHeader: {
      marginBottom: 12,
      marginTop: 8,
      marginLeft: 4,
      color: theme.colors.text,
    },
    menuSection: {
      paddingHorizontal: 24,
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
      color: theme.colors.text,
    },
    menuItemSubtitle: {
      fontSize: 14,
      color: theme.colors.palette.neutral700,
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
      backgroundColor: theme.colors.palette.angry400,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral200,
    },
    alertOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.palette.overlay50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    alertContainer: {
      margin: 20,
      borderRadius: 16,
      padding: 24,
      minWidth: 280,
    },
    alertTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 8,
      textAlign: 'center',
    },
    alertMessage: {
      fontSize: 16,
      marginBottom: 24,
      textAlign: 'center',
      lineHeight: 22,
    },
    alertButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    alertButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.colors.palette.neutral300,
    },
    confirmButton: {
      // backgroundColor set dynamically
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
  })
