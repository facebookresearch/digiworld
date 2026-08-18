import { useEffect, useMemo } from 'react'
import { View, StyleSheet, TextStyle, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Text, AutoImage, type Theme, useTheme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import LinearGradient from 'react-native-linear-gradient'
import {
  useInteractionTracking,
  getLatestInteraction,
} from '@andojo/shared-interaction-tracking'

import { translate } from '@/i18n'
import { useStores } from '@/models'

export default observer(function InitialScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore, uiStore } = useStores()
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('Splash', '/')

  const textStyles = {
    loading: {
      ...styles.loadingText,
      color: theme.colors.palette.neutral900,
    } as TextStyle,
    error: { ...styles.errorText, color: theme.colors.error } as TextStyle,
    copyright: {
      ...styles.copyright,
      color: theme.colors.palette.neutral900,
    } as TextStyle,
    version: {
      ...styles.version,
      color: theme.colors.palette.neutral900,
    } as TextStyle,
  }

  useEffect(() => {
    trackScreenMount({
      screen: 'Splash',
      route: '/',
    })

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
      colors={[theme.colors.palette.primary500, theme.colors.palette.accent500]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.content}>
        <AutoImage
          source={require('../../assets/images/app-logo-name.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.primary500}
            animating={true}
          />
        </View>
        <View style={styles.footer}>
          <Text
            style={textStyles.copyright}
            text={translate('welcomeScreen.copyright')}
          />
          <Text
            style={textStyles.version}
            text={translate('welcomeScreen.version')}
          />
        </View>
      </View>
    </LinearGradient>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      flex: 1,
      justifyContent: 'center',
    },
    copyright: {
      fontSize: 12,
    },
    errorText: {
      fontSize: 14,
      marginTop: 10,
    },
    footer: {
      alignItems: 'center',
      bottom: 20,
      position: 'absolute',
      width: '100%',
    },
    loadingContainer: {
      alignItems: 'center',
      marginTop: 20,
    },
    loadingText: {
      fontSize: 14,
      marginTop: 10,
    },
    logo: {
      height: 400,
      width: 400,
    },
    version: {
      fontSize: 12,
    },
  })
