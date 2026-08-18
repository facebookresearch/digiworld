// Copyright (c) Meta Platforms, Inc. and affiliates.
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Text, Screen, useTheme, Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import React from 'react'

const HelpScreen = () => {
  const router = useRouter()
  const { trackScreenMount, trackClick } = useInteractionTracking(
    'Help',
    '/(tabs)/help',
  )
  const { theme } = useTheme()
  const colors = theme.colors
  const styles = createStyles(colors)

  React.useEffect(() => {
    trackScreenMount({ timestamp: Date.now() })
  }, [])
  const helpItems = [
    {
      title: 'How to Book a Ride',
      icon: 'car-outline',
      content:
        'Open the app, set your pickup location and destination, choose your ride type, and tap "Book Now".',
    },
    {
      title: 'Payment Methods',
      icon: 'card-outline',
      content:
        'We accept cash and credit/debit cards. You can manage payment methods in the Payment section.',
    },
    {
      title: 'Contact Support',
      icon: 'call-outline',
      content:
        'Need help? Contact our 24/7 support team at support@ryde.com or call 1-800-RYDE.',
    },
    {
      title: 'Safety Guidelines',
      icon: 'shield-checkmark-outline',
      content:
        'Your safety is our priority. All drivers are background checked and vehicles regularly inspected.',
    },
  ]

  useFocusEffect(
    React.useCallback(() => {
      const { trackScreenMount } = useInteractionTracking(
        'Help',
        '/(tabs)/help',
      )

      // Track screen mount when focused
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'Help',
        route: '/(tabs)/help',
      })
    }, [router]),
  )

  return (
    <LinearGradient
      colors={[colors.palette.neutral700, colors.palette.neutral800]}
      style={styles.gradient}
    >
      <Screen style={styles.container} safeAreaEdges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              trackClick('backButton')
              router.back()
            }}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={colors.palette.neutral100}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {helpItems.map((item, index) => (
            <View key={index} style={styles.helpItem}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name={item.icon as any}
                  size={24}
                  color={colors.palette.primary400}
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.content}>{item.content}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </Screen>
    </LinearGradient>
  )
}

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.palette.neutral800,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: {
      position: 'relative',
      top: 0,
      left: 0,
      zIndex: 10,
      backgroundColor: colors.palette.overlay20,
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.palette.neutral100,
    },
    scrollContent: {
      padding: 16,
    },
    helpItem: {
      flexDirection: 'row',
      backgroundColor: colors.palette.neutral800,
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.palette.neutral700,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.palette.neutral100,
      marginBottom: 4,
    },
    content: {
      fontSize: 14,
      color: colors.palette.neutral200,
      lineHeight: 20,
    },
    gradient: {
      flex: 1,
    },
  })

export default HelpScreen
