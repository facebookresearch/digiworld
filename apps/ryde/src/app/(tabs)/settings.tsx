// Copyright (c) Meta Platforms, Inc. and affiliates.
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Screen, Text, useAppTheme, Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import React from 'react'

const SettingsScreen = () => {
  const { theme } = useAppTheme()
  const styles = createStyles(theme.colors)
  const router = useRouter()
  const { trackScreenMount, trackClick } = useInteractionTracking(
    'Settings',
    '/(tabs)/settings',
  )

  React.useEffect(() => {
    trackScreenMount({ timestamp: Date.now() })
  }, [])

  const settingsOptions = [
    {
      title: 'Account',
      icon: 'person-outline',
      items: ['Profile', 'Password', 'Email', 'Phone Number'],
    },
    {
      title: 'Preferences',
      icon: 'options-outline',
      items: ['Language', 'Notifications', 'Dark Mode'],
    },
    {
      title: 'Privacy & Security',
      icon: 'shield-outline',
      items: ['Privacy Policy', 'Terms of Service', 'Data Usage'],
    },
  ]
  useFocusEffect(
    React.useCallback(() => {
      const { trackScreenMount } = useInteractionTracking(
        'Settings',
        '/(tabs)/settings',
      )

      // Track screen mount when focused
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'Settings',
        route: '/(tabs)/settings',
      })
    }, [router]),
  )

  return (
    <LinearGradient
      colors={[
        theme.colors.palette.neutral700,
        theme.colors.palette.neutral800,
      ]}
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
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <ScrollView style={styles.scrollContent}>
          {settingsOptions.map((section, index) => (
            <View key={index} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name={section.icon as any}
                  size={24}
                  color={theme.colors.palette.accent500}
                />
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>

              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={styles.settingItem}
                  onPress={() => {}}
                >
                  <Text style={styles.settingText}>{item}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.palette.neutral400}
                  />
                </TouchableOpacity>
              ))}
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
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    },
    backButton: {
      marginRight: 16,
      backgroundColor: colors.palette.overlay20,
      borderRadius: 20,
      padding: 6,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.palette.neutral100,
    },
    scrollContent: {
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.palette.neutral200,
      marginLeft: 8,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.palette.neutral800,
      padding: 16,
      borderRadius: 8,
      marginBottom: 8,
    },
    settingText: {
      fontSize: 16,
      color: colors.palette.neutral200,
    },
    gradient: {
      flex: 1,
    },
  })

export default SettingsScreen
