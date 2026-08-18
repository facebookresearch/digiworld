import { useEffect, useRef, useMemo } from 'react'
import {
  View,
  StyleSheet,
  TextStyle,
  ActivityIndicator,
  Animated,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Text, AutoImage, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import LinearGradient from 'react-native-linear-gradient'
import { Glassmorphic } from '@/components/Glassmorphic'
import {
  useInteractionTracking,
  getLatestInteraction,
} from '@andojo/shared-interaction-tracking'

import { translate } from '@/i18n'
import { useStores } from '@/models'
import { useAppTheme } from '@andojo/shared-theme'

export default observer(function InitialScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore, uiStore } = useStores()
  const router = useRouter()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const { trackScreenMount } = useInteractionTracking('Splash', '/')

  const textStyles = {
    loading: {
      ...styles.loadingText,
      color: theme.colors.palette.neutral100,
    } as TextStyle,
    error: { ...styles.errorText, color: theme.colors.error } as TextStyle,
    copyright: {
      ...styles.copyright,
      color: theme.colors.palette.neutral100,
    } as TextStyle,
    version: {
      ...styles.version,
      color: theme.colors.palette.neutral200,
    } as TextStyle,
  }

  useEffect(() => {
    trackScreenMount({
      screen: 'Splash',
      route: '/',
    })

    // Animate logo and content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start()

    setTimeout(() => {
      if (!uiStore.isDeeplinkLoading) {
        const currentRoute = getLatestInteraction()?.data?.route
        if (currentRoute === '/') {
          if (userStore.isAuthenticated) {
            router.replace('/(app)/home')
          } else {
            router.replace('/(auth)/login')
          }
        }
      }
    }, 2000)
  }, [uiStore.isDeeplinkLoading])

  return (
    <LinearGradient
      colors={[
        theme.colors.palette.primary500,
        theme.colors.palette.secondary500,
      ]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Animated background elements for depth */}
      <View style={styles.backgroundOrbs}>
        <View style={[styles.orb, styles.orb1]} />
        <View style={[styles.orb, styles.orb2]} />
        <View style={[styles.orb, styles.orb3]} />
      </View>

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Glassmorphic
            borderRadius={32}
            padding={32}
            intensity={60}
            backgroundColor="rgba(255, 255, 255, 0.15)"
            borderColor="rgba(255, 255, 255, 0.3)"
            style={styles.glassLogo}
          >
            <AutoImage
              source={require('../../assets/images/app-logo-name.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Glassmorphic>
        </Animated.View>

        <Animated.View
          style={[
            styles.loadingContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Glassmorphic
            borderRadius={16}
            padding={16}
            intensity={50}
            backgroundColor="rgba(255, 255, 255, 0.1)"
            borderColor="rgba(255, 255, 255, 0.2)"
          >
            <ActivityIndicator
              size="large"
              color={theme.colors.palette.neutral100}
              animating={true}
            />
          </Glassmorphic>
        </Animated.View>

        <Animated.View
          style={[
            styles.footer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Glassmorphic
            borderRadius={12}
            padding={12}
            intensity={40}
            backgroundColor="rgba(255, 255, 255, 0.08)"
            borderColor="rgba(255, 255, 255, 0.15)"
            shadow={false}
          >
            <Text
              style={textStyles.copyright}
              text={translate('welcomeScreen.copyright')}
            />
            <Text
              style={textStyles.version}
              text={translate('welcomeScreen.version')}
            />
          </Glassmorphic>
        </Animated.View>
      </View>
    </LinearGradient>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    backgroundOrbs: {
      ...StyleSheet.absoluteFillObject,
    },
    orb: {
      position: 'absolute',
      borderRadius: 200,
      opacity: 0.1,
    },
    orb1: {
      width: 300,
      height: 300,
      backgroundColor: theme.colors.palette.neutral100,
      top: -100,
      right: -100,
    },
    orb2: {
      width: 200,
      height: 200,
      backgroundColor: theme.colors.palette.neutral100,
      bottom: -50,
      left: -50,
    },
    orb3: {
      width: 150,
      height: 150,
      backgroundColor: theme.colors.palette.neutral100,
      top: '40%',
      left: '20%',
    },
    content: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    glassLogo: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: {
      height: 120,
      width: 120,
    },
    loadingContainer: {
      alignItems: 'center',
      marginTop: 20,
    },
    loadingText: {
      fontSize: 14,
      marginTop: 10,
    },
    footer: {
      alignItems: 'center',
      bottom: 40,
      position: 'absolute',
      width: '100%',
      paddingHorizontal: 24,
    },
    copyright: {
      fontSize: 12,
      textAlign: 'center',
      marginBottom: 4,
    },
    version: {
      fontSize: 11,
      textAlign: 'center',
      opacity: 0.8,
    },
    errorText: {
      fontSize: 14,
      marginTop: 10,
    },
  })
