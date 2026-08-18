import React from 'react'
import { Drawer } from 'expo-router/drawer'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { useAppTheme } from '@andojo/shared-theme'
import { useRouter } from 'expo-router'

// Custom Drawer Content Component
const CustomDrawerContent = observer((props: any) => {
  const { theme } = useAppTheme()
  const router = useRouter()
  const routes = props.state.routes.filter((r: any) => r.name !== 'home')
  return (
    <LinearGradient
      colors={[
        theme.colors.palette.primary500,
        theme.colors.palette.primary600,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.drawerContainer}
    >
      {/* Header Section */}
      <LinearGradient
        colors={[
          theme.colors.palette.primary400,
          theme.colors.palette.primary500,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.drawerHeader}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../../../../assets/icons/app-icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerText}>
            <Text
              style={[
                styles.appName,
                { color: theme.colors.palette.neutral900 },
              ]}
            >
              QwikShop
            </Text>
            <Text
              style={[
                styles.tagline,
                { color: theme.colors.palette.neutral800 },
              ]}
            >
              Shop Smart, Shop Fast
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Navigation Items */}
      <View style={styles.navSection}>
        {routes.map((route: any, index: number) => {
          const focused = index === props.state.index
          const { options } = props.descriptors[route.key]

          if (options.drawerItemStyle?.display === 'none') return null

          const handleNavigation = () => {
            if (route.name === '(tabs)') {
              router.push('/(app)/(drawer)/(tabs)/home')
            } else if (route.name === 'address') {
              router.push('/(app)/(drawer)/address')
            } else if (route.name === 'payment') {
              router.push('/(app)/(drawer)/payment')
            } else if (route.name === 'wishlist') {
              router.push('/screens/wishlist')
            }
          }

          return (
            <TouchableOpacity key={route.key} onPress={handleNavigation}>
              <View style={styles.navItem}>
                <View style={styles.navItemContent}>
                  {options.drawerIcon &&
                    options.drawerIcon({
                      color: focused
                        ? theme.colors.palette.neutral900
                        : theme.colors.palette.neutral800,
                      size: 24,
                      focused,
                    })}
                  <Text
                    style={[
                      styles.navItemText,
                      { color: theme.colors.palette.neutral800 },
                      focused && [
                        styles.navItemTextActive,
                        { color: theme.colors.palette.neutral900 },
                      ],
                    ]}
                  >
                    {options.title || route.name}
                  </Text>
                </View>
                {focused && (
                  <View
                    style={[
                      styles.activeIndicator,
                      { backgroundColor: theme.colors.palette.neutral900 },
                    ]}
                  />
                )}
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
    </LinearGradient>
  )
})

export default observer(function DrawerLayout() {
  return (
    <Drawer
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: 300,
        },
      }}
    >
      {/* Main Screens - Visible in Drawer */}
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerItemStyle: { display: 'none' },
          title: 'Home',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Address Book Stack */}
      <Drawer.Screen
        name="address"
        options={{
          title: 'Address Book',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="map-marker"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Payment Methods Stack */}
      <Drawer.Screen
        name="payment"
        options={{
          title: 'Payment Methods',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="credit-card"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Wishlist */}
      <Drawer.Screen
        name="wishlist"
        options={{
          title: 'My Wishlist',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="heart" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="address/new"
        options={{
          title: 'Add Address',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="payment/new"
        options={{
          title: 'Add Payment Method',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="address/[id]"
        options={{
          title: 'Edit Address',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="payment/[id]"
        options={{
          title: 'Edit Payment Method',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="address/index"
        options={{
          title: 'Address Book',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="payment/index"
        options={{
          title: 'Payment Methods',
          drawerItemStyle: { display: 'none' },
        }}
      />

      {/* Add more drawer items as needed */}
    </Drawer>
  )
})

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
  },
  drawerHeader: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
  },

  navSection: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  navItem: {
    marginVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  navItemActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  navItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  navItemText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  navItemTextActive: {
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -12,
    width: 4,
    height: 24,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
})
