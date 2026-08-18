// Copyright (c) Meta Platforms, Inc. and affiliates.
import '@/utils/assetManager'
import React, { useEffect, useState } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { Screen, Text, AutoImage } from '@/components'
import { colors } from '@andojo/shared-theme'
import { mutations } from '@/db/mutations'
import { isDatabaseInitialized } from '@/db/queries'
import { runMigrations } from '@/db/migrations'
import { useStores } from '@/models'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

export default observer(function SplashScreen() {
  const [, setIsInitializing] = useState(true)
  const [, setError] = useState<string | null>(null)
  const { userStore, productStore, categoryStore, orderStore, uiStore } =
    useStores()
  const { trackScreenMount } = useInteractionTracking('Splash', '/')

  useEffect(() => {
    async function initializeApp() {
      try {
        // Step 1: Initialize Database if Needed
        const isInitialized = await isDatabaseInitialized()
        if (!isInitialized) {
          await runMigrations()
          await mutations.initializeDatabase()
          console.log('Database initialized successfully')
        } else {
          console.log('Database already initialized')
        }
        productStore.loadProducts()
        categoryStore.loadCategories()
        orderStore.loadOrders(userStore?.user?.id)
        // await cartStore.loadCart(userStore.user?.id as string)

        // Step 2: Check for Existing Session
        const hasSession = await userStore.hydrate()
        setIsInitializing(false)

        // Step 3: Redirect Based on Session Status
        setTimeout(() => {
          if (!uiStore.isDeeplinkLoading) {
            if (hasSession) {
              router.replace('/(app)/(drawer)/(tabs)/home')
            } else {
              router.replace('/(auth)/login')
            }
          }
        }, 1000) // Small delay for better UX
      } catch (err) {
        console.error('Initialization failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize')
        setIsInitializing(false)
      }
    }
    trackScreenMount({
      screen: 'Splash',
      route: '/',
    })
    initializeApp()
  }, [userStore, uiStore.isDeeplinkLoading])

  return (
    <Screen style={styles.container} safeAreaEdges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* App Logo */}
        <AutoImage
          source={require('../../assets/images/app-icon-all.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Loading Indicator */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.palette.primary500}
            animating
          />
        </View>

        {/* Footer Information */}
        <View style={styles.footer}>
          <Text tx="welcomeScreen:copyright" style={styles.copyright} />
          <Text tx="welcomeScreen:version" style={styles.version} />
        </View>
      </View>
    </Screen>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center', // Centers content properly
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 250,
    height: 250,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footer: {
    position: 'absolute', // 👈 Forces it to stay at the bottom
    bottom: 20, // 👈 Keeps it slightly above the screen edge
    width: '100%',
    alignItems: 'center',
  },
  copyright: {
    fontSize: 12,
    color: colors.textDim,
  },
  version: {
    fontSize: 12,
    color: colors.textDim,
  },
})
