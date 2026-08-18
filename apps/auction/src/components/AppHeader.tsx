// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { Text, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import LinearGradient from 'react-native-linear-gradient'
import { useStores } from '@/models'
import { useAppTheme } from '@andojo/shared-theme'

interface AppHeaderProps {
  title?: string
  showSearch?: boolean
  showProfile?: boolean
  showBackButton?: boolean
  rightComponent?: React.ReactNode
}

export function AppHeader({
  title = 'Home',
  showSearch = true,
  showProfile = true,
  showBackButton = false,
  rightComponent,
}: AppHeaderProps) {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { userStore } = useStores()

  const handleProfilePress = () => {
    if (userStore.user) {
      router.push('/(app)/profile')
    } else {
      router.push('/(auth)/login')
    }
  }

  const handleBackPress = () => {
    router.back()
  }

  return (
    <LinearGradient
      colors={[
        theme.colors.background,
        'rgba(14, 10, 37, 0.95)',
        'transparent',
      ]}
      style={styles.headerContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.header}>
        <View style={styles.leftSection}>
          {showBackButton && (
            <TouchableOpacity
              style={[
                styles.iconButton,
                styles.backButton,
                { backgroundColor: theme.colors.palette.neutral300 },
              ]}
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          )}
          <Text
            style={[styles.title, showBackButton && styles.titleWithBack]}
            text={title}
          />
        </View>

        <View style={styles.rightSection}>
          {rightComponent || (
            <>
              {showSearch && (
                <TouchableOpacity
                  style={[
                    styles.iconButton,
                    { backgroundColor: theme.colors.palette.neutral300 },
                  ]}
                  onPress={() => router.push('/search')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="search-outline"
                    size={20}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>
              )}

              {showProfile && (
                <TouchableOpacity
                  style={styles.profileButton}
                  activeOpacity={0.8}
                  onPress={handleProfilePress}
                >
                  <LinearGradient
                    colors={['#1c62ff', '#5743ca', '#8d3ef6']}
                    style={styles.profileAvatar}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text
                      style={styles.profileInitial}
                      text={
                        userStore.user?.username.charAt(0).toUpperCase() ?? 'U'
                      }
                    />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </LinearGradient>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    headerContainer: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      paddingBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    leftSection: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      letterSpacing: -0.5,
      color: theme.colors.text,
    },
    titleWithBack: {
      marginLeft: 12,
    },
    backButton: {
      marginRight: 0,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconButton: {
      padding: 10,
      borderRadius: 12,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    profileButton: {
      marginLeft: 4,
    },
    profileAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    profileInitial: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    separator: {
      height: 0.5,
      opacity: 0.3,
    },
  })
