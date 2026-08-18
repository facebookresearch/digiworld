// Copyright (c) Meta Platforms, Inc. and affiliates.
import CustomAlert from '@/app/components/CustomAlert'
import { useStores } from '@/models'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useTheme, Screen, spacing, Text } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Dimensions,
  Platform,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  View,
} from 'react-native'

const MENU_ITEMS: {
  id: string
  icon: string
  title: string
  route: string
}[] = [
  {
    id: 'addresses',
    icon: 'location-outline',
    title: 'Delivery Addresses',
    route: '/screens/address/address-list',
  },

  {
    id: 'orders',
    icon: 'receipt-outline',
    title: 'Order History',
    route: '/(tabs)/orders',
  },
]

export const ProfileScreen = observer(function ProfileScreen() {
  const { userStore, sessionStore } = useStores()
  const router = useRouter()
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const { trackScreenMount, trackContentChange } = useInteractionTracking(
    'ProfileScreen',
    '/screens/profile',
  )
  const { theme } = useTheme()
  const colors = theme.colors

  interface MenuItemProps {
    icon: string
    title: string
    onPress: () => void
    showBorder?: boolean
    color?: string
  }

  const MenuItem = ({
    icon,
    title,
    onPress,
    showBorder = true,
    color = colors.text,
  }: MenuItemProps) => {
    const textStyle: TextStyle = {
      ...styles.menuText,
      color,
    }

    return (
      <TouchableOpacity
        style={[styles.menuItem, showBorder && styles.menuItemBorder]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.menuItemLeft}>
          <Ionicons
            name={icon as any}
            size={22}
            color={color}
            style={styles.menuIcon}
          />
          <Text style={textStyle}>{title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
      </TouchableOpacity>
    )
  }

  // Add a single alertConfig state object
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean
    title: string
    message: string
    type: 'default' | 'warning' | 'error' | 'success'
    confirmText: string
    cancelText: string
    showCancel: boolean
    onConfirm: () => void
    onCancel: () => void
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'default',
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false,
    onConfirm: () => {},
    onCancel: () => {},
  })

  // Add useEffect to restore alertConfig from session if available
  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession(sessionId as string)
      if (session?.data?.sessionData) {
        const formData = session.data.sessionData.formData as any
        if (
          formData &&
          typeof formData.alertConfig === 'object' &&
          formData.alertConfig !== null
        ) {
          const rest = formData.alertConfig
          setAlertConfig({
            ...rest,
            onConfirm: () => {
              if (typeof rest.onConfirm === 'function') {
                rest.onConfirm()
              } else {
                hideAlert()
              }
            },
            onCancel: () => {
              if (typeof rest.onCancel === 'function') {
                rest.onCancel()
              } else {
                hideAlert()
              }
            },
          })
        }
      }
    }
  }, [sessionTimeStamp])

  // Update showAlert and hideAlert to also call trackContentChange to persist alertConfig
  const showAlert = (config: Omit<typeof alertConfig, 'visible'>) => {
    trackContentChange({ alertConfig: { ...config, visible: true } })
    setAlertConfig({ ...config, visible: true })
  }
  const hideAlert = () => {
    trackContentChange({ alertConfig: { ...alertConfig, visible: false } })
    setAlertConfig(prev => ({ ...prev, visible: false }))
  }

  // Track screen mount
  useEffect(() => {
    trackScreenMount({
      timestamp: Date.now(),
      platform: Platform.OS,
      screenDimensions: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
      },
      userId: userStore.currentUser?.id,
    })
  }, [])

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

      router.replace('/')
    } catch (error) {
      console.error('Logout failed:', error)
      trackContentChange({
        action: 'logout_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        userId: userStore.currentUser?.id,
      })
      showAlert({
        title: 'Error',
        message: 'Failed to logout. Please try again.',
        type: 'error',
        showCancel: false,
        confirmText: 'OK',
        cancelText: 'Cancel',
        onConfirm: hideAlert,
        onCancel: hideAlert,
      })
    }
  }, [userStore, router, trackContentChange])

  const confirmLogout = useCallback(() => {
    trackContentChange({
      action: 'logout_confirmation_shown',
      timestamp: Date.now(),
      userId: userStore.currentUser?.id,
    })
    showAlert({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      type: 'warning',
      showCancel: true,
      confirmText: 'Logout',
      cancelText: 'Cancel',
      onConfirm: () => {
        hideAlert()
        handleLogout()
      },
      onCancel: () => {
        hideAlert()
        trackContentChange({
          action: 'logout_cancelled',
          timestamp: Date.now(),
          userId: userStore.currentUser?.id,
        })
      },
    })
  }, [handleLogout, trackContentChange])

  const userDisplayName = useMemo(() => {
    const user = userStore.currentUser
    if (!user) return 'User'
    return user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email || 'User'
  }, [userStore.currentUser])

  const userPhone = useMemo(() => {
    return userStore.currentUser?.phoneNumber || 'Add phone number'
  }, [userStore.currentUser])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.palette.neutral200,
    },
    backButton: {
      padding: spacing.xs,
    },
    headerTitle: {
      fontSize: spacing.lg,
      fontWeight: '600',
      color: colors.text,
    },
    placeholder: {
      width: 40,
    },
    profileSection: {
      padding: spacing.lg,
      backgroundColor: colors.background,
    },
    avatarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    avatar: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: colors.palette.primary100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: spacing.lg,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    userPhone: {
      fontSize: spacing.sm,
      color: colors.textDim,
    },
    menuSection: {
      backgroundColor: colors.background,
      borderRadius: spacing.md,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.md,
      shadowColor: colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    menuItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.palette.neutral200,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    menuIcon: {
      width: 24,
    },
    menuText: {
      fontSize: spacing.md,
      color: colors.text,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: spacing.md,
      marginTop: spacing.xl,
      marginBottom: spacing.xl,
      paddingVertical: spacing.md,
      backgroundColor: colors.palette.neutral100,
      borderRadius: spacing.md,
      gap: spacing.sm,
    },
    logoutIcon: {
      width: 24,
    },
    logoutText: {
      fontSize: spacing.md,
      color: colors.palette.neutral700,
      fontWeight: '600',
    },
    avatarText: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.palette.primary500,
    },
  })

  return (
    <Screen preset="scroll" safeAreaEdges={['top']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            trackContentChange({
              action: 'back_pressed',
              timestamp: Date.now(),
              userId: userStore.currentUser?.id,
            })
            router.replace('/(tabs)/home')
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userStore.userInitials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userDisplayName}</Text>
            <Text style={styles.userPhone}>{userPhone}</Text>
          </View>
        </View>
      </View>

      <View style={styles.menuSection}>
        {MENU_ITEMS.map((item, index) => (
          <MenuItem
            key={item.id}
            icon={item.icon}
            title={item.title}
            onPress={() => {
              trackContentChange({
                action: 'menu_item_pressed',
                menuItemId: item.id,
                menuItemTitle: item.title,
                route: '/screens/profile',
                timestamp: Date.now(),
                userId: userStore.currentUser?.id,
              })
              if (!item.route) {
                return null
              } else {
                router.push(item.route as any)
              }
            }}
            showBorder={index !== MENU_ITEMS.length - 1}
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={confirmLogout}
        activeOpacity={0.7}
      >
        <Ionicons
          name="log-out-outline"
          size={22}
          color={colors.palette.neutral700}
          style={styles.logoutIcon}
        />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        showCancel={alertConfig.showCancel}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </Screen>
  )
})

export default ProfileScreen
