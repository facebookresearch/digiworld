import React, { useCallback, useMemo } from 'react'
import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, useAppTheme, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { useStores } from '@/models'
import { useFocusEffect, useRouter } from 'expo-router'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'
import { FancyAlert } from '@/components'

export default observer(function AccountScreen() {
  const router = useRouter()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore, parkingStore } = useStores()
  const { trackScreenMount } = useInteractionTracking('profile', '/account')

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'profile',
        route: '/account',
      })
      return () => {
        console.log('Profile screen unfocused.')
      }
    }, [userStore.isAuthenticated, userStore.user]),
  )

  // Debounced navigation handlers
  const handleNameNavigation = debounce(() => {
    router.push('/profile/name')
  }, 300)

  const handlePasswordNavigation = debounce(() => {
    router.push('/profile/password')
  }, 300)

  const handleTermsNavigation = debounce(() => {
    router.push('/(legal)/terms')
  }, 300)

  const handlePrivacyNavigation = debounce(() => {
    router.push('/(legal)/privacy')
  }, 300)

  // User details section
  const userDetailsItems = [
    {
      icon: 'person-outline' as const,
      title: 'Name',
      subtitle:
        userStore.user?.fullName || userStore.user?.username || 'Guest User',
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
  ]

  // Parking services section
  const parkingServicesItems = [
    {
      icon: 'car-outline' as const,
      title: 'My Vehicles',
      subtitle: `${parkingStore.vehicles?.length || 0} vehicles`,
      onPress: () => router.push('/(tabs)/vehicles'),
    },
    {
      icon: 'card-outline' as const,
      title: 'Payment Methods',
      subtitle: `${parkingStore.paymentMethods?.length || 0} methods`,
      onPress: () => router.push('/(tabs)/payment'),
    },
  ]

  // Help section
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
        { backgroundColor: theme.colors.palette.neutral100 },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
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
      {showChevron && onPress && (
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
        <View style={styles.header}>
          <Text preset="subheading" style={{ color: theme.colors.text }}>
            Profile Details
          </Text>
        </View>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* User Details Section */}
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

          {/* Parking Services Section */}
          <View style={styles.menuSection}>
            <SectionHeader title="Parking Services" />
            {parkingServicesItems.map((item, index) => (
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
            onPress={() => {
              parkingStore.showAlert({
                title: 'Sign Out',
                message: 'Are you sure you want to sign out?',
                preset: 'delete',
                onConfirm: () => {
                  userStore.logout()
                  parkingStore.hideAlert()
                  setTimeout(() => {
                    router.replace('/(auth)/login')
                  }, 1000)
                },
              })
            }}
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
      <FancyAlert
        visible={parkingStore.alertState.visible}
        title={parkingStore.alertState.title}
        message={parkingStore.alertState.message}
        preset={
          parkingStore.alertState.preset as
            | 'default'
            | 'success'
            | 'error'
            | 'warning'
            | 'delete'
        }
        onClose={() => parkingStore.hideAlert()}
        onConfirm={parkingStore.getAlertOnConfirm() || undefined}
      />
    </View>
  )
})

const createStyles = (theme: Theme) =>
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
    header: {
      paddingHorizontal: 24,
      paddingVertical: 20,
    },
    content: {
      flex: 1,
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
