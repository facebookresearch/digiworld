import React, { useCallback, useEffect, useRef, useMemo } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useStores } from '@/models'
import { useFocusEffect, useRouter } from 'expo-router'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'
import { AnimatedBackground, Glassmorphic } from '@/components'
import { useAppTheme } from '@andojo/shared-theme'

export default observer(function ProfileScreen() {
  const router = useRouter()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore, auctionStore } = useStores()
  const { trackScreenMount } = useInteractionTracking('profile', '/profile')
  const [showLogoutAlert, setShowLogoutAlert] = React.useState(false)
  const [transactionsSucceed, setTransactionsSucceed] = React.useState(true)
  const [isLoadingConfig, setIsLoadingConfig] = React.useState(false)

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'profile',
        route: '/profile',
      })

      // Load transaction config
      loadTransactionConfig()

      return () => {
        console.log('Profile screen unfocused.')
      }
    }, [userStore.isAuthenticated, userStore.user]),
  )

  // Load transaction config from system_config
  const loadTransactionConfig = async () => {
    try {
      const config = await auctionStore.getSystemConfig('transactions_succeed')
      if (config) {
        setTransactionsSucceed(config.value === 'true')
      }
    } catch (error) {
      console.error('Failed to load transaction config:', error)
    }
  }

  // Handle transaction toggle
  const handleTransactionToggle = async () => {
    setIsLoadingConfig(true)
    try {
      const newValue = !transactionsSucceed
      await auctionStore.updateSystemConfig(
        'transactions_succeed',
        newValue ? 'true' : 'false',
      )
      setTransactionsSucceed(newValue)
    } catch (error) {
      console.error('Failed to update transaction config:', error)
    } finally {
      setIsLoadingConfig(false)
    }
  }

  // Debounced navigation functions
  const handleNameNavigation = debounce(() => {
    router.push('/profile/name')
  }, 300)

  const handlePasswordNavigation = debounce(() => {
    router.push('/profile/password')
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
      subtitle:
        userStore.user?.name || userStore.user?.username || 'Guest User',
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

  const myItems = userStore.user?.id
    ? auctionStore.getItemsBySeller(userStore.user.id)
    : []
  const activeCount = myItems.filter(i => i.status === 'active').length
  const expiredCount = myItems.filter(i => i.status === 'expired').length

  const auctionServicesItems = [
    {
      icon: 'hammer-outline' as const,
      title: 'My Bids',
      subtitle: `${userStore.user?.id ? auctionStore.getBidsByUser(userStore.user.id).length : 0} bids`,
      onPress: () => router.push('/my-bids'),
    },
    {
      icon: 'storefront-outline' as const,
      title: 'My Listings',
      subtitle: `${activeCount} active • ${expiredCount} expired`,
      onPress: () => router.push('/(app)/cards'),
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
    <Text
      preset="subheading"
      style={[styles.sectionHeader, { color: theme.colors.text }]}
    >
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
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.menuItemWrapper}
    >
      <Glassmorphic
        borderRadius={16}
        padding={16}
        variant="strong"
        style={styles.menuItem}
      >
        <View style={styles.menuItemLeft}>
          <Glassmorphic
            borderRadius={20}
            padding={10}
            variant="subtle"
            style={styles.menuIconContainer}
          >
            <Ionicons name={icon} size={20} color={theme.colors.tint} />
          </Glassmorphic>
          <View style={styles.menuItemText}>
            <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>
              {title}
            </Text>
            {subtitle && (
              <Text
                style={[
                  styles.menuItemSubtitle,
                  { color: theme.colors.textDim },
                ]}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        {showChevron && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textDim}
          />
        )}
      </Glassmorphic>
    </TouchableOpacity>
  )

  if (!userStore.isAuthenticated) {
    return (
      <AnimatedBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.emptyStateContainer}>
            <Glassmorphic borderRadius={26} padding={40} variant="strong">
              <Ionicons
                name="person-outline"
                size={64}
                color={theme.colors.textDim}
              />
              <Text
                style={[styles.emptyStateTitle, { color: theme.colors.text }]}
              >
                Not Signed In
              </Text>
              <Text
                style={[
                  styles.emptyStateDescription,
                  { color: theme.colors.textDim },
                ]}
              >
                Please sign in to view your profile
              </Text>
            </Glassmorphic>
          </View>
        </SafeAreaView>
      </AnimatedBackground>
    )
  }

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={{ ...styles.headerTitle, color: theme.colors.text }}>
            Profile Details
          </Text>
        </Animated.View>

        <Animated.ScrollView
          style={[styles.content, { opacity: fadeAnim }]}
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

          {/* Auction Services Section */}
          <View style={styles.menuSection}>
            <SectionHeader title="Auction Services" />
            {auctionServicesItems.map((item, index) => (
              <ProfileMenuItem
                key={index}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                onPress={item.onPress}
              />
            ))}
          </View>

          {/* Settings Section */}
          <View style={styles.menuSection}>
            <SectionHeader title="Settings" />
            <ProfileMenuItem
              icon="card-outline"
              title="Payment Methods"
              subtitle="Manage your cards"
              onPress={() => router.push('/payments')}
            />
            {/* Transaction Success Toggle */}
            {
              <View style={styles.menuItemWrapper}>
                <Glassmorphic
                  borderRadius={16}
                  padding={16}
                  variant="strong"
                  style={styles.menuItem}
                >
                  <View style={styles.menuItemLeft}>
                    <Glassmorphic
                      borderRadius={20}
                      padding={10}
                      variant="subtle"
                      style={styles.menuIconContainer}
                    >
                      <Ionicons
                        name="card-outline"
                        size={20}
                        color={theme.colors.tint}
                      />
                    </Glassmorphic>
                    <View style={styles.menuItemText}>
                      <Text
                        style={[
                          styles.menuItemTitle,
                          { color: theme.colors.text },
                        ]}
                      >
                        Transaction Success
                      </Text>
                      <Text
                        style={[
                          styles.menuItemSubtitle,
                          { color: theme.colors.textDim },
                        ]}
                      >
                        {transactionsSucceed
                          ? 'Payments will succeed'
                          : 'Payments will fail'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={transactionsSucceed}
                    onValueChange={handleTransactionToggle}
                    disabled={isLoadingConfig}
                    trackColor={{
                      false: theme.colors.palette.neutral400,
                      true: theme.colors.tint,
                    }}
                    thumbColor={theme.colors.palette.neutral100}
                    ios_backgroundColor={theme.colors.palette.neutral400}
                  />
                </Glassmorphic>
              </View>
            }
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
            onPress={() => setShowLogoutAlert(true)}
            activeOpacity={0.8}
            style={styles.logoutButtonWrapper}
          >
            <Glassmorphic
              borderRadius={16}
              padding={16}
              backgroundColor={theme.colors.palette.angry400}
              borderColor={theme.colors.palette.angry500}
              style={styles.logoutButton}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={theme.colors.palette.neutral100}
              />
              <Text style={styles.logoutText}>Sign Out</Text>
            </Glassmorphic>
          </TouchableOpacity>
        </Animated.ScrollView>
      </SafeAreaView>

      {/* Logout Confirmation Alert */}
      {showLogoutAlert && (
        <View style={styles.alertOverlay}>
          <Glassmorphic
            borderRadius={20}
            padding={24}
            variant="strong"
            style={styles.alertContainer}
          >
            <Text style={[styles.alertTitle, { color: theme.colors.text }]}>
              Sign Out
            </Text>
            <Text
              style={[styles.alertMessage, { color: theme.colors.textDim }]}
            >
              Are you sure you want to sign out?
            </Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => setShowLogoutAlert(false)}
              >
                <Glassmorphic
                  borderRadius={12}
                  padding={12}
                  variant="strong"
                  style={styles.cancelButton}
                >
                  <Text
                    style={[
                      styles.cancelButtonText,
                      { color: theme.colors.text },
                    ]}
                  >
                    Cancel
                  </Text>
                </Glassmorphic>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => {
                  userStore.logout()
                  setShowLogoutAlert(false)
                  setTimeout(() => {
                    router.replace('/(auth)/login')
                  }, 1000)
                }}
              >
                <Glassmorphic
                  borderRadius={12}
                  padding={12}
                  backgroundColor={theme.colors.palette.angry400}
                  borderColor={theme.colors.palette.angry500}
                  style={styles.confirmButton}
                >
                  <Text style={styles.confirmButtonText}>Sign Out</Text>
                </Glassmorphic>
              </TouchableOpacity>
            </View>
          </Glassmorphic>
        </View>
      )}
    </AnimatedBackground>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
      textAlign: 'center',
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
    },
    menuSection: {
      paddingHorizontal: 24,
      paddingBottom: 8,
    },
    menuItemWrapper: {
      marginVertical: 4,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuIconContainer: {
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
    logoutButtonWrapper: {
      width: '90%',
      alignSelf: 'center',
      marginTop: 16,
      marginBottom: 10,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
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
      padding: 20,
    },
    alertContainer: {
      minWidth: 280,
      maxWidth: 400,
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
    },
    cancelButton: {
      alignItems: 'center',
    },
    confirmButton: {
      alignItems: 'center',
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
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      letterSpacing: -0.6,
      marginBottom: 4,
    },
  })
