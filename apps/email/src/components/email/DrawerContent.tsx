// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Text } from '@/components/Text'
import { MailFolder } from '@/models/EmailModel'
import { useStores } from '@/models/helpers/useStores'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import {
  Animated,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { useMemo } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const FOLDER_ICONS: Record<MailFolder | 'all', keyof typeof Ionicons.glyphMap> =
  {
    all: 'mail-unread-outline',
    inbox: 'mail-outline',
    sent: 'paper-plane-outline',
    draft: 'document-text-outline',
    trash: 'trash-outline',
    archived: 'archive-outline',
  }

interface DrawerContentProps {
  currentFolder: MailFolder | 'all'
  folderCounts: Record<string, number>

  onFolderSelect: (folder: MailFolder | 'all') => void
  toggleDrawer: () => void
  drawerAnimation: Animated.Value
}

export function DrawerContent({
  currentFolder,
  folderCounts,
  onFolderSelect,
  drawerAnimation,
}: DrawerContentProps) {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const insets = useSafeAreaInsets()
  const { userStore } = useStores()
  const userProfile = userStore.userProfile

  const drawerTranslateX = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-280, 0],
  })

  const getFormattedFolderName = (folder: MailFolder | 'all') => {
    if (folder === 'all') {
      const totalCount =
        folderCounts.inbox + folderCounts.sent + folderCounts.draft
      return `All Mail ${totalCount > 0 ? `(${totalCount})` : ''}`
    }
    const count = folderCounts[folder]
    const name = folder.charAt(0).toUpperCase() + folder.slice(1)
    return `${name} ${count > 0 ? `(${count})` : ''}`
  }

  return (
    <Animated.View
      style={[
        styles.drawer,
        {
          transform: [{ translateX: drawerTranslateX }],
        },
      ]}
    >
      <LinearGradient
        colors={[
          theme.colors.palette.primary500,
          theme.colors.palette.primary400,
        ]}
        style={[styles.drawerHeader, { paddingTop: insets.top + spacing.md }]}
      >
        <View style={styles.userProfile}>
          <TouchableOpacity
            style={styles.profileSection}
            onPress={() => router.push('/screens/settings/profile' as any)}
          >
            {userProfile?.avatar ? (
              <Image
                source={{ uri: userProfile.avatar }}
                style={styles.userAvatar}
              />
            ) : (
              <View style={styles.userAvatarPlaceholder}>
                <Text
                  text={userStore.userInitials}
                  style={[
                    styles.userAvatarText,
                    { color: theme.colors.palette.primary500 },
                  ]}
                />
              </View>
            )}
            <View style={styles.userInfo}>
              <Text
                text={userProfile?.displayName || 'User'}
                preset="subheading"
                style={[styles.userName, { color: '#FFFFFF' }]}
              />
              <Text
                text={userProfile?.email || ''}
                preset="formHelper"
                style={[styles.userEmail, { color: '#FFFFFF', opacity: 0.85 }]}
              />
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {(Object.keys(FOLDER_ICONS) as (MailFolder | 'all')[]).map(folder => (
        <TouchableOpacity
          key={folder}
          style={[
            styles.drawerItem,
            currentFolder === folder && styles.activeDrawerItem,
          ]}
          onPress={() => onFolderSelect(folder)}
        >
          <Ionicons
            name={FOLDER_ICONS[folder]}
            size={24}
            color={
              currentFolder === folder
                ? theme.colors.palette.primary500
                : theme.colors.text
            }
          />
          <Text
            text={getFormattedFolderName(folder)}
            style={[
              styles.drawerItemText,
              currentFolder === folder && styles.activeDrawerItemText,
            ]}
          />
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[
          styles.logoutButton,
          { paddingBottom: insets.bottom || spacing.md },
        ]}
        onPress={() => {
          userStore.logout()
          router.replace('/screens/auth/login' as any)
        }}
      >
        <Ionicons name="log-out-outline" size={24} color={theme.colors.error} />
        <Text text="Logout" style={styles.logoutText} />
      </TouchableOpacity>
    </Animated.View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    activeDrawerItem: {
      backgroundColor: theme.colors.palette.neutral200,
    },
    activeDrawerItemText: {
      color: theme.colors.palette.primary500,
    },
    drawer: {
      backgroundColor: theme.colors.palette.neutral100,
      bottom: 0,
      elevation: 5,
      left: 0,
      position: 'absolute',
      shadowColor: theme.colors.text,
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      top: 0,
      width: 280,
      zIndex: 2,
    },
    drawerHeader: {
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      padding: spacing.md,
    },
    drawerItem: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
    },
    drawerItemText: {
      color: theme.colors.text,
      fontSize: 16,
    },
    logoutButton: {
      alignItems: 'center',
      borderTopColor: theme.colors.separator,
      borderTopWidth: 1,
      bottom: 0,
      flexDirection: 'row',
      gap: spacing.sm,
      left: 0,
      padding: spacing.md,
      position: 'absolute',
      right: 0,
    },
    logoutText: {
      color: theme.colors.error,
      fontSize: 16,
      fontWeight: '500',
    },
    profileSection: {
      alignItems: 'center',
      flexDirection: 'row',
      paddingVertical: spacing.xs,
    },
    userAvatar: {
      borderColor: theme.colors.palette.neutral100,
      borderRadius: 24,
      borderWidth: 2,
      height: 48,
      width: 48,
    },
    userAvatarPlaceholder: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderColor: theme.colors.palette.neutral100,
      borderRadius: 24,
      borderWidth: 2,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    userAvatarText: {
      color: theme.colors.palette.primary500,
      fontSize: 18,
      fontWeight: 'bold',
    },
    userEmail: {
      fontSize: 12,
    },
    userInfo: {
      flex: 1,
      marginLeft: spacing.sm,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
    },
    userProfile: {
      marginBottom: spacing.sm,
    },
  })
