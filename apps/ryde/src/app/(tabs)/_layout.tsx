// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { Drawer } from 'expo-router/drawer'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  Alert,
} from 'react-native'
import { Text } from '@andojo/shared-theme/src/components'
import { useRouter, usePathname } from 'expo-router'
import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'

const DrawerContent = observer(() => {
  const router = useRouter()
  const pathname = usePathname()
  const { userStore, uiStore } = useStores()
  const { theme } = useTheme()
  const colors = theme.colors

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (pathname !== '/(tabs)/home') {
          router.back()
          return true
        } else {
          BackHandler.exitApp()
          return true
        }
      },
    )

    return () => backHandler.remove()
  }, [pathname])

  // Handle navigation after logout
  useEffect(() => {
    if (!userStore.isAuthenticated) {
      setTimeout(() => {
        router.push({
          pathname: '/screens/auth/phone-login',
        })
      }, 500)
    }
  }, [userStore.isAuthenticated, router])

  // Cleanup effect to prevent ViewGroup errors
  useEffect(() => {
    return () => {}
  }, [])

  const menuItems = [
    {
      title: 'Your Rides',
      icon: 'car-outline',
      route: '/(tabs)/history',
    },
    {
      title: 'Payment',
      icon: 'card-outline',
      route: '/(tabs)/payment',
    },
    {
      title: 'Help',
      icon: 'help-circle-outline',
      route: '/(tabs)/help',
    },
    {
      title: 'Terms of Use',
      icon: 'document-text-outline',
      route: '/(tabs)/terms',
    },
  ]

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            // Close drawer first to prevent showing default values and ViewGroup issues
            uiStore.setDrawerOpen(false)
            router.back()
            // Wait for drawer to close completely before performing logout
            // This timing is crucial to prevent ViewGroup child removal errors
            await new Promise(resolve => setTimeout(resolve, 500))

            await userStore.logout()

            if (userStore.isAuthenticated) {
              throw new Error('Logout failed - user still authenticated')
            }
          } catch (error) {
            console.error('Logout error:', error)
            Alert.alert('Error', 'Failed to logout. Please try again.')
            uiStore.setLoggingOut(false)
          }
        },
      },
    ])
  }

  const handleMenuItemPress = (route: string) => {
    // Close drawer when menu item is pressed
    uiStore.setDrawerOpen(false)
    router.push(route as any)
  }

  const styles = StyleSheet.create({
    drawerContainer: {
      flex: 1,
      backgroundColor: colors.palette.neutral800,
    },
    drawerHeader: {
      padding: 24,
      paddingTop: 60,
      borderBottomWidth: 1,
      borderBottomColor: colors.palette.neutral700,
    },
    userInfoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.palette.primary400,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
      shadowColor: colors.palette.primary400,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    avatarText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.palette.neutral100,
    },
    userDetails: {
      flex: 1,
    },
    userName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.palette.neutral100,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 14,
      color: colors.palette.neutral300,
      marginBottom: 2,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.palette.primary400,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    menuContainer: {
      padding: 16,
      flex: 1,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 8,
    },
    menuItemActive: {
      backgroundColor: colors.palette.primary500,
    },
    menuItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    menuItemText: {
      marginLeft: 16,
      fontSize: 16,
      fontWeight: '500',
      color: colors.palette.neutral200,
    },
    menuItemTextActive: {
      color: colors.palette.neutral100,
      fontWeight: '600',
    },
    drawerFooter: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colors.palette.neutral700,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: colors.palette.angry200,
    },
    logoutText: {
      marginLeft: 12,
      fontSize: 16,
      fontWeight: '600',
      color: colors.palette.neutral100,
    },
  })

  return (
    <View style={styles.drawerContainer}>
      <View style={styles.drawerHeader}>
        <View style={styles.userInfoContainer}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {userStore.userInitials || 'U'}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {userStore.currentUser
                ? `${userStore.currentUser.firstName} ${userStore.currentUser.lastName}`
                : 'User'}
            </Text>
            <Text style={styles.userEmail}>
              {userStore.currentUser?.email || 'user@example.com'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              pathname === item.route && styles.menuItemActive,
            ]}
            onPress={() => handleMenuItemPress(item.route)}
          >
            <View style={styles.menuItemContent}>
              <Ionicons
                name={item.icon as any}
                size={24}
                color={
                  pathname === item.route
                    ? colors.palette.primary400
                    : colors.palette.neutral200
                }
              />
              <Text
                style={{
                  ...styles.menuItemText,
                  ...(pathname === item.route ? styles.menuItemTextActive : {}),
                }}
              >
                {item.title}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.palette.neutral400}
            />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.drawerFooter}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons
            name="log-out-outline"
            size={24}
            color={colors.palette.neutral100}
          />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
})

export default function AppLayout() {
  const { theme } = useTheme()
  const colors = theme.colors

  return (
    <Drawer
      key="main-drawer"
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: colors.palette.neutral800,
          width: '85%',
        },
        drawerType: 'front',
        overlayColor: colors.palette.overlay50,
      }}
      drawerContent={() => <DrawerContent />}
    >
      <Drawer.Screen
        name="home"
        options={{
          title: 'Home',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="history"
        options={{
          title: 'History',
        }}
      />
      <Drawer.Screen
        name="payment"
        options={{
          title: 'Payment',
        }}
      />
      <Drawer.Screen
        name="terms"
        options={{
          title: 'Terms of Use',
        }}
      />
    </Drawer>
  )
}
