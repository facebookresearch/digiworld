// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { metrics, Text, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useStores } from '@/models'

interface AppHeaderProps {
  title?: string
  showSearch?: boolean
  showProfile?: boolean
  showBackButton?: boolean
  showBack?: boolean
  onBackPress?: () => void
  rightComponent?: React.ReactNode
}

export function AppHeader({
  title = 'Home',
  showSearch = true,
  showProfile = true,
  showBackButton = false,
  showBack = false,
  onBackPress,
  rightComponent,
}: AppHeaderProps) {
  const { theme } = useAppTheme()
  const router = useRouter()
  const { userStore } = useStores()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerContainer: {
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: 'transparent',
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
          fontSize: metrics.text.xl,
          fontWeight: '600',
          color: theme.colors.text,
        },
        titleWithBack: {
          marginLeft: 16,
        },
        backButton: {
          padding: 4,
        },
        rightSection: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        },
        iconButton: {
          padding: 8,
        },
        profileButton: {
          marginLeft: 4,
        },
        profileAvatar: {
          width: 40,
          height: 40,
          borderRadius: 20,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.palette.primary300,
        },
        profileInitial: {
          fontSize: 18,
          fontWeight: '600',
          color: theme.colors.text,
        },
      }),
    [theme],
  )

  const handleProfilePress = () => {
    if (userStore.user) {
      router.push('/(app)/profile')
    } else {
      router.push('/(auth)/login')
    }
  }

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress()
    } else {
      router.back()
    }
  }

  return (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <View style={styles.leftSection}>
          {(showBackButton || showBack) && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          )}
          <Text
            style={[
              styles.title,
              showBackButton || showBack ? styles.titleWithBack : null,
            ]}
            text={title}
          />
        </View>

        <View style={styles.rightSection}>
          {rightComponent || (
            <>
              {showSearch && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => router.push('/search' as any)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="search-outline"
                    size={24}
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
                  <View style={styles.profileAvatar}>
                    <Text
                      style={styles.profileInitial}
                      text={
                        userStore.user?.username.charAt(0).toUpperCase() ?? 'U'
                      }
                    />
                  </View>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  )
}
