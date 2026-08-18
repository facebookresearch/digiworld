import { Text, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import React, { useCallback, useMemo } from 'react'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { debounce } from 'lodash'

import { EmptyState, FancyAlert } from '@/components'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useFocusEffect, useRouter } from 'expo-router'

export default observer(function ProfileScreen() {
  const router = useRouter()
  const { theme } = useAppTheme()
  const { userStore, smartHomeStore } = useStores()
  const { trackScreenMount } = useInteractionTracking('profile', '/profile')
  const [showLogoutAlert, setShowLogoutAlert] = React.useState(false)

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        scrollView: {
          flex: 1,
        },
        scrollContent: {
          paddingBottom: 20,
        },
        userHeader: {
          margin: 16,
          padding: 16,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: theme.colors.palette.neutral900,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        avatarContainer: {
          width: 60,
          height: 60,
          borderRadius: 30,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 16,
        },
        userInfo: {
          flex: 1,
        },
        userName: {
          fontSize: 18,
          fontWeight: '600',
          marginBottom: 4,
        },
        userEmail: {
          fontSize: 14,
        },
        section: {
          marginBottom: 24,
        },
        sectionTitle: {
          fontSize: 16,
          fontWeight: '600',
          marginHorizontal: 16,
          marginBottom: 8,
          color: theme.colors.text,
        },
        sectionContent: {
          marginHorizontal: 16,
        },
        menuItem: {
          borderRadius: 12,
          marginBottom: 8,
          shadowColor: theme.colors.palette.neutral900,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        },
        menuItemContent: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
        },
        menuItemLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        },
        iconContainer: {
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
          fontWeight: '500',
          marginBottom: 2,
        },
        menuItemSubtitle: {
          fontSize: 12,
        },
        logoutButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginHorizontal: 16,
          marginTop: 8,
          padding: 16,
          borderRadius: 12,
          shadowColor: theme.colors.palette.neutral900,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        },
        logoutText: {
          fontSize: 16,
          fontWeight: '500',
          marginLeft: 8,
        },
      }),
    [theme],
  )

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

  // Separate menu items into sections
  const userDetailsItems = [
    {
      icon: 'person-outline' as const,
      title: 'Name',
      subtitle: userStore.user?.username || 'Guest User',
      onPress: () => router.push('/profile/name'),
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

  const smartHomeItems = [
    {
      icon: 'bulb-outline' as const,
      title: 'Devices',
      subtitle: `${smartHomeStore.devices.length} devices`,
      onPress: () => router.push('/devices'),
    },
    {
      icon: 'settings-outline' as const,
      title: 'Automations',
      subtitle: `${smartHomeStore.automations.length} automations`,
      onPress: () => router.push('/automations'),
    },
    {
      icon: 'notifications-outline' as const,
      title: 'Notifications',
      subtitle: 'Manage alerts',
      onPress: () => router.push('/notifications'),
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

  const renderMenuItem = (item: any, index: number) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.menuItem,
        { backgroundColor: theme.colors.palette.neutral200 },
      ]}
      onPress={debounce(item.onPress, 300)}
    >
      <View style={styles.menuItemContent}>
        <View style={styles.menuItemLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: theme.colors.palette.primary100 },
            ]}
          >
            <Ionicons
              name={item.icon}
              size={20}
              color={theme.colors.palette.primary300}
            />
          </View>
          <View style={styles.menuItemText}>
            <Text style={{ ...styles.menuItemTitle, color: theme.colors.text }}>
              {item.title}
            </Text>
            {item.subtitle && (
              <Text
                style={{
                  ...styles.menuItemSubtitle,
                  color: theme.colors.textDim,
                }}
              >
                {item.subtitle}
              </Text>
            )}
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.textDim}
        />
      </View>
    </TouchableOpacity>
  )

  const renderSection = (title: string, items: any[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {items.map((item, index) => renderMenuItem(item, index))}
      </View>
    </View>
  )

  const handleLogout = () => {
    setShowLogoutAlert(false)
    userStore.logout()
    router.replace('/(auth)/login')
  }

  if (!userStore.isAuthenticated) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[
            theme.colors.palette.secondary100,
            theme.colors.palette.primary100,
            theme.colors.palette.neutral100,
          ]}
          locations={[0, 0.4, 1]}
          style={styles.backgroundGradient}
        />
        <SafeAreaView style={styles.safeArea}>
          <EmptyState
            icon="person-outline"
            title="Not Signed In"
            description="Please sign in to view your profile"
          />
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.secondary100,
          theme.colors.palette.primary100,
          theme.colors.palette.neutral100,
        ]}
        locations={[0, 0.4, 1]}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* User Header */}
          <View
            style={[
              styles.userHeader,
              { backgroundColor: theme.colors.palette.neutral200 },
            ]}
          >
            <View
              style={[
                styles.avatarContainer,
                { backgroundColor: theme.colors.palette.primary100 },
              ]}
            >
              <Ionicons
                name="person"
                size={40}
                color={theme.colors.palette.primary300}
              />
            </View>
            <View style={styles.userInfo}>
              <Text style={{ ...styles.userName, color: theme.colors.text }}>
                {userStore.user?.username || 'Guest User'}
              </Text>
              <Text
                style={{ ...styles.userEmail, color: theme.colors.textDim }}
              >
                {userStore.user?.email || 'guest@example.com'}
              </Text>
            </View>
          </View>

          {/* Menu Sections */}
          {renderSection('Account', userDetailsItems)}
          {renderSection('Smart Home', smartHomeItems)}
          {renderSection('Help & Legal', helpItems)}

          {/* Logout Button */}
          <TouchableOpacity
            style={[
              styles.logoutButton,
              { backgroundColor: theme.colors.palette.angry100 },
            ]}
            onPress={debounce(() => setShowLogoutAlert(true), 300)}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={theme.colors.palette.angry500}
            />
            <Text
              style={{
                ...styles.logoutText,
                color: theme.colors.palette.angry500,
              }}
            >
              Sign Out
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <FancyAlert
          visible={showLogoutAlert}
          title="Sign Out"
          message="Are you sure you want to sign out?"
          confirmText="Sign Out"
          cancelText="Cancel"
          onConfirm={handleLogout}
          onClose={() => setShowLogoutAlert(false)}
        />
      </SafeAreaView>
    </View>
  )
})
