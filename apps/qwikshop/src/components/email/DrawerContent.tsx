import React from 'react'
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native'
import { Text } from '@/components/Text'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '@andojo/shared-theme'
import { LinearGradient } from 'react-native-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useStores } from '@/models/helpers/useStores'
import { MailFolder } from '@/models/EmailModel'

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
        colors={[colors.palette.primary500, colors.palette.primary400]}
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
                  style={styles.userAvatarText}
                />
              </View>
            )}
            <View style={styles.userInfo}>
              <Text
                text={userProfile?.displayName || 'User'}
                preset="subheading"
                style={styles.userName}
              />
              <Text
                text={userProfile?.email || ''}
                preset="formHelper"
                style={styles.userEmail}
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
              currentFolder === folder ? colors.palette.primary500 : colors.text
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
        <Ionicons name="log-out-outline" size={24} color={colors.error} />
        <Text text="Logout" style={styles.logoutText} />
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: colors.palette.neutral100,
    zIndex: 2,
    elevation: 5,
    shadowColor: colors.text,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  drawerHeader: {
    padding: spacing.md,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  userProfile: {
    marginBottom: spacing.sm,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.palette.neutral100,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.palette.neutral200,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.palette.neutral100,
  },
  userAvatarText: {
    fontSize: 18,
    color: colors.palette.primary500,
    fontWeight: 'bold',
  },
  userInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  userName: {
    color: colors.palette.neutral100,
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    color: colors.palette.neutral200,
    fontSize: 12,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  activeDrawerItem: {
    backgroundColor: colors.palette.neutral200,
  },
  drawerItemText: {
    fontSize: 16,
    color: colors.text,
  },
  activeDrawerItemText: {
    color: colors.palette.primary500,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
    gap: spacing.sm,
  },
  logoutText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '500',
  },
})
