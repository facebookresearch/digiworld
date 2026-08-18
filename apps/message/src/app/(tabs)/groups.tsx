// Copyright (c) Meta Platforms, Inc. and affiliates.
import { GroupWithMembers } from '@/app/types'
import { isDatabaseReady } from '@/db'
import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { metrics, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Screen, Text } from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

const GroupsScreen = observer(function GroupsScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const params = useLocalSearchParams<{
    action?: string | string[]
    sessionTimeStamp?: string | string[]
  }>()
  const { userStore, uiStore } = useStores()

  // Get all state from store (like add-contact.tsx)
  const groupsScreen = userStore.groupsScreen
  const isRefreshing = groupsScreen.isRefreshing
  const groups = groupsScreen.groups as GroupWithMembers[]
  const isLoading = groupsScreen.isLoading
  const refreshKey = groupsScreen.refreshKey
  const selectedGroupId = groupsScreen.selectedGroupId

  // Memoize groups count for tracking
  const groupsCount = useMemo(() => groups.length, [groups.length])

  // Setup interaction tracking
  const { width, height } = Dimensions.get('window')
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('Groups', '/(tabs)/groups')

  const isValidBase64 = (str: string) => {
    if (!str) return false
    return str.startsWith('data:image') || str.includes('base64')
  }

  const getInitials = (name: string) => {
    if (!name) return 'G'
    return name
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2)
  }

  const handleAvatarError = (groupId: string, groupName: string) => {
    console.log('Group avatar image failed to load for:', groupName)
    userStore.addFailedAvatar(groupId)
  }

  const handleAvatarLoad = (groupId: string, groupName: string) => {
    console.log('Group avatar image loaded successfully for:', groupName)
    userStore.removeFailedAvatar(groupId)
  }

  // Load groups from database
  const loadGroups = useCallback(async () => {
    try {
      console.log('🔄 loadGroups called, setting isLoading to true')
      userStore.setGroupsScreenLoading(true)
      console.log('Loading groups from database...')

      // Check if database is ready
      if (!isDatabaseReady()) {
        console.error('Database not ready')
        userStore.setGroupsScreenGroups([])
        userStore.setGroupsScreenLoading(false)
        return
      }

      if (!userStore.currentUser?.id) {
        console.log('No current user - skipping groups load')
        userStore.setGroupsScreenGroups([])
        userStore.setGroupsScreenLoading(false)
        return
      }

      // Get groups for current user
      const userGroups = await queries.getGroupsByUser(userStore.currentUser.id)
      console.log('User groups loaded:', userGroups?.length || 0)

      // Get detailed group information with members
      const groupsData: GroupWithMembers[] = []
      for (const groupData of userGroups) {
        const group = groupData.group
        console.log(
          `Group: ${group.name}, Avatar: ${group.avatarUrl ? 'present' : 'null'}`,
        )
        // Get all members including exited ones to check exit status
        const allMembers = await queries.getGroupMembers(group.id, true)
        // Get active members for member count
        const activeMembers = await queries.getGroupMembers(group.id, false)
        const memberDetails = []

        for (const member of activeMembers) {
          const user = await queries.getUserById(member.userId)
          if (user) {
            memberDetails.push(user.name || 'Unknown User')
          }
        }

        // Check if current user has exited this group
        const currentUserMember = allMembers.find(
          (m: any) => m.userId === userStore.currentUser?.id,
        )
        const exitedAt = currentUserMember?.exitedAt || null

        groupsData.push({
          id: group.id,
          name: group.name,
          description: group.description,
          avatarUrl: group.avatarUrl,
          createdBy: group.createdBy,
          createdAt: group.createdAt,
          memberCount: activeMembers.length,
          members: memberDetails,
          exitedAt, // Add exitedAt to group data
        })
      }

      userStore.setGroupsScreenGroups(groupsData)
      userStore.incrementRefreshKey() // Force FlatList to re-render
      console.log('✅ Groups processed:', groupsData.length)
    } catch (error) {
      console.error('❌ Error loading groups:', error)
      // Set empty groups array on error
      userStore.setGroupsScreenGroups([])
    } finally {
      console.log('🏁 loadGroups finally block, setting isLoading to false')
      userStore.setGroupsScreenLoading(false)
      console.log(
        '✅ isLoading set to false, current state:',
        userStore.groupsScreen.isLoading,
      )
    }
  }, [userStore.currentUser?.id])

  // If dbrefresh navigates to the same route while this tab is focused, focus won't change.
  // Use the deeplink navigation params (sessionTimeStamp) as a signal to reload.
  useEffect(() => {
    const first = (v: unknown) => (Array.isArray(v) ? v[0] : v)
    const action = first(params?.action)
    const stamp = first(params?.sessionTimeStamp)
    if (action === 'dbrefresh' && stamp && userStore.currentUser?.id) {
      // Keep a canonical signal in UI store for consistency with other screens.
      uiStore.setMockDataAppended()
      loadGroups()
    }
  }, [params?.action, params?.sessionTimeStamp, userStore.currentUser?.id])

  // Load groups on mount and when user changes
  useEffect(() => {
    // Only load groups if user is available
    if (userStore.currentUser?.id) {
      loadGroups()
    }
  }, [loadGroups, userStore.currentUser?.id, uiStore.mockDataAppendTime])

  // Refresh groups when screen comes into focus (like add-contact.tsx)
  useFocusEffect(
    useCallback(() => {
      // Clear failed avatars to allow retrying image loads
      userStore.clearFailedAvatars()
      // Only load groups if user is available
      if (userStore.currentUser?.id) {
        loadGroups()
      }
    }, [loadGroups, userStore.currentUser?.id, uiStore.mockDataAppendTime]),
  )

  // Track screen mount with relevant data
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        groupsCount,
        isRefreshing,
        timestamp: Date.now(),
        platform: Platform.OS,
        screenDimensions: { width, height },
        userProfileId: userStore.currentUser?.id,
      })
    }, [
      trackScreenMount,
      groups.length,
      isRefreshing,
      width,
      height,
      userStore.currentUser?.id,
      uiStore.mockDataAppendTime,
    ]),
  )

  const handleGroupPress = useCallback(
    (groupId: string) => {
      trackClick(`group_${groupId}`)
      trackContentChange({
        event: 'group_pressed',
        groupId,
        timestamp: Date.now(),
      })
      router.push(`/screens/chat/group/${groupId}`)
    },
    [router, trackClick, trackContentChange],
  )

  // Watch alert state and show React Native Alert when needed
  useEffect(() => {
    if (userStore.alertState.visible) {
      const alertState = userStore.alertState
      const onConfirm = userStore.getAlertOnConfirm()

      // Determine button text based on preset and title
      let confirmText = 'OK'
      let needsConfirmation = false

      if (alertState.preset === 'delete') {
        needsConfirmation = true
        if (alertState.title?.includes('Delete Group')) {
          confirmText = 'Delete Group'
        } else if (alertState.title?.includes('Exit Group')) {
          confirmText = 'Exit Group'
        }
      } else if (alertState.preset === 'warning') {
        needsConfirmation = true
        confirmText = 'Confirm'
      }

      // Show Alert.alert() - show confirmation buttons if preset suggests it or if callback exists
      if (needsConfirmation || onConfirm) {
        Alert.alert(alertState.title || 'Alert', alertState.message, [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => userStore.hideAlert(),
          },
          {
            text: confirmText,
            style: alertState.preset === 'delete' ? 'destructive' : 'default',
            onPress: () => {
              // Execute callback if available, otherwise just hide
              if (onConfirm) {
                onConfirm()
              }
              userStore.hideAlert()
            },
          },
        ])
      } else {
        Alert.alert(alertState.title || 'Alert', alertState.message, [
          {
            text: 'OK',
            onPress: () => userStore.hideAlert(),
          },
        ])
      }
    }
  }, [
    userStore.alertState.visible,
    userStore.alertState.title,
    userStore.alertState.message,
    userStore.alertState.preset,
    userStore,
  ])

  const handleExitGroup = async (groupId: string) => {
    if (!userStore.currentUser?.id) return

    const group = groups.find(g => g.id === groupId)
    const groupName = group?.name || 'this group'

    userStore.showAlert({
      title: `Exit Group ${groupName}`,
      message: `Are you sure you want to exit ${groupName}? You will no longer receive messages.`,
      preset: 'delete',
      onConfirm: async () => {
        try {
          const result = await mutations.exitGroup(
            groupId,
            userStore.currentUser!.id,
          )
          if (result.success) {
            userStore.showAlert({
              title: 'Success',
              message: 'You have exited the group',
              preset: 'success',
            })
            trackClick('exit_group')
            userStore.setSelectedGroupId(null) // Clear selection
            loadGroups() // Reload groups list
          } else {
            userStore.showAlert({
              title: 'Error',
              message: 'Failed to exit group',
              preset: 'error',
            })
          }
        } catch (error) {
          console.error('Error exiting group:', error)
          userStore.showAlert({
            title: 'Error',
            message: 'Failed to exit group',
            preset: 'error',
          })
        }
      },
    })
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!userStore.currentUser?.id) return

    const group = groups.find(g => g.id === groupId)
    const groupName = group?.name || 'this group'

    userStore.showAlert({
      title: `Delete Group ${groupName}`,
      message: `Are you sure you want to delete ${groupName}? This action cannot be undone.`,
      preset: 'delete',
      onConfirm: async () => {
        try {
          const result = await mutations.deleteGroup(
            groupId,
            userStore.currentUser!.id,
          )
          if (result.success) {
            userStore.showAlert({
              title: 'Success',
              message: 'Group deleted',
              preset: 'success',
            })
            trackClick('delete_group')
            userStore.setSelectedGroupId(null) // Clear selection
            loadGroups() // Reload groups list
          } else {
            userStore.showAlert({
              title: 'Error',
              message: 'Failed to delete group',
              preset: 'error',
            })
          }
        } catch (error) {
          console.error('Error deleting group:', error)
          userStore.showAlert({
            title: 'Error',
            message: 'Failed to delete group',
            preset: 'error',
          })
        }
      },
    })
  }

  const handleLongPress = (groupId: string) => {
    userStore.setSelectedGroupId(groupId)
    trackClick(`long_press_group_${groupId}`)
  }

  const handleCancelSelection = () => {
    userStore.setSelectedGroupId(null)
  }

  const renderGroupItem = ({ item }: { item: GroupWithMembers }) => {
    const isSelected = selectedGroupId === item.id

    // Fade out all groups except the selected one
    const shouldFade = selectedGroupId ? !isSelected : false

    return (
      <TouchableOpacity
        style={[
          styles.groupItem,
          isSelected && styles.groupItemSelected,
          shouldFade && styles.groupItemFaded,
        ]}
        onPress={() => {
          if (selectedGroupId) {
            // If in selection mode, clear selection on tap
            handleCancelSelection()
          } else {
            handleGroupPress(item.id)
          }
        }}
        onLongPress={() => handleLongPress(item.id)}
        activeOpacity={0.7}
        disabled={!!shouldFade}
      >
        <View style={styles.avatarContainer}>
          {item.avatarUrl &&
          isValidBase64(item.avatarUrl) &&
          !userStore.groupsScreen.failedAvatars.includes(item.id) ? (
            <Image
              source={{
                uri: item.avatarUrl,
                // Add timestamp to prevent caching issues
                cache: 'reload',
              }}
              style={styles.avatar}
              onError={() => {
                console.log('🖼️ Avatar error for group:', item.name, item.id)
                handleAvatarError(item.id, item.name)
                // Force re-render by incrementing refresh key
                userStore.incrementRefreshKey()
              }}
              onLoad={() => {
                console.log('✅ Avatar loaded for group:', item.name, item.id)
                handleAvatarLoad(item.id, item.name)
              }}
              key={`${item.id}-${refreshKey}`} // Force re-render when refreshKey changes
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text
                text={getInitials(item.name)}
                size="medium"
                weight="bold"
                style={styles.avatarText}
              />
            </View>
          )}
        </View>

        <View style={styles.groupContent}>
          <View style={styles.groupHeader}>
            <Text
              text={item.name}
              size="medium"
              weight="bold"
              style={styles.groupName}
            />
            <View style={styles.memberCountContainer}>
              <Ionicons
                name="people"
                size={16}
                color={theme.colors.palette.neutral500}
              />
              <Text
                text={`${item.memberCount}`}
                size="small"
                style={styles.memberCount}
              />
            </View>
          </View>

          {item.description && (
            <Text
              text={item.description}
              size="small"
              style={styles.groupDescription}
              numberOfLines={2}
            />
          )}
        </View>

        <View style={styles.groupActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              trackClick(`message_group_${item.id}`)
              trackContentChange({
                event: 'message_group_pressed',
                groupId: item.id,
                timestamp: Date.now(),
              })
              // Navigate to unified chat screen with group ID
              router.push(`/screens/chat/group/${item.id}`)
            }}
          >
            <Ionicons
              name="chatbubble-outline"
              size={20}
              color={theme.colors.palette.primary500}
            />
          </TouchableOpacity>

          {/* Hide info button if user has exited the group */}
          {!item.exitedAt && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                trackClick(`group_info_${item.id}`)
                trackContentChange({
                  event: 'group_info_pressed',
                  groupId: item.id,
                  timestamp: Date.now(),
                })
                // Navigate to create-group screen in edit mode
                router.push(`/screens/groups/create-group?groupId=${item.id}`)
              }}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={theme.colors.palette.primary500}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  if (isLoading) {
    return (
      <Screen
        preset="fixed"
        backgroundColor={theme.colors.palette.neutral100}
        contentContainerStyle={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.primary500}
          />
          <Text
            text="Loading groups..."
            size="medium"
            style={styles.loadingText}
          />
        </View>
      </Screen>
    )
  }

  return (
    <Screen
      preset="fixed"
      backgroundColor={theme.colors.palette.neutral100}
      contentContainerStyle={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text text="Groups" preset="subheading" style={styles.title} />
        {selectedGroupId ? (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelSelection}
          >
            <Ionicons
              name="close"
              size={24}
              color={theme.colors.palette.neutral800}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              trackClick('addGroup')
              trackContentChange({
                event: 'add_group_pressed',
                timestamp: Date.now(),
              })
              // Navigate to create group screen
              userStore.setNavigationSource('groups')
              userStore.clearSelectedContacts()
              router.push('/screens/contacts/contact-list')
            }}
          >
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={theme.colors.palette.neutral800}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Action Button - Show when group is selected */}
      {selectedGroupId &&
        (() => {
          const selectedGroup = groups.find(g => g.id === selectedGroupId)
          const hasExited = !!selectedGroup?.exitedAt

          return (
            <View style={styles.actionBar}>
              <TouchableOpacity
                style={styles.actionBarButton}
                onPress={() => {
                  if (hasExited) {
                    handleDeleteGroup(selectedGroupId)
                  } else {
                    handleExitGroup(selectedGroupId)
                  }
                }}
              >
                <Ionicons
                  name={hasExited ? 'trash-outline' : 'exit-outline'}
                  size={20}
                  color={theme.colors.palette.neutral100}
                />
                <Text
                  text={hasExited ? 'Delete Group' : 'Exit Group'}
                  size="medium"
                  weight="bold"
                  style={styles.actionBarButtonText}
                />
              </TouchableOpacity>
            </View>
          )
        })()}

      {/* Quick Actions - Hide when group is selected */}
      {!selectedGroupId && (
        <>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => {
                trackClick('newGroup')
                trackContentChange({
                  event: 'new_group_pressed',
                  timestamp: Date.now(),
                })
                // Navigate to create group screen
                userStore.setNavigationSource('groups')
                userStore.clearSelectedContacts()
                router.push('/screens/contacts/contact-list')
              }}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons
                  name="people"
                  size={24}
                  color={theme.colors.palette.neutral100}
                />
              </View>
              <Text
                text="New Group"
                size="small"
                weight="medium"
                style={styles.quickActionText}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => {
                trackClick('inviteFriends')
                trackContentChange({
                  event: 'invite_friends_pressed',
                  timestamp: Date.now(),
                })
                // Navigate to invite screen (placeholder for now)
                router.push('/screens/contacts/contact-list')
              }}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: theme.colors.palette.secondary500 },
                ]}
              >
                <Ionicons
                  name="share-outline"
                  size={24}
                  color={theme.colors.palette.neutral100}
                />
              </View>
              <Text
                text="Invite Friends"
                size="small"
                weight="medium"
                style={styles.quickActionText}
              />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Groups List */}
      <View style={styles.groupsList}>
        <View style={styles.sectionHeader}>
          <Text
            text="My Groups"
            size="large"
            weight="bold"
            style={styles.sectionTitle}
          />
          <Text
            text={`${groups.length} groups`}
            size="small"
            style={styles.groupCount}
          />
        </View>

        <FlatList
          key={refreshKey} // Force re-render when refreshKey changes
          data={groups}
          renderItem={renderGroupItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flatListContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="people-outline"
                size={48}
                color={theme.colors.palette.neutral400}
              />
              <Text
                text="No groups yet"
                size="medium"
                weight="medium"
                style={styles.emptyTitle}
              />
              <Text
                text="Create your first group to start chatting with friends"
                size="small"
                style={styles.emptyDescription}
              />
            </View>
          }
        />
      </View>
    </Screen>
  )
})

export default GroupsScreen

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: metrics.medium,
      paddingTop: 60,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: metrics.medium,
      color: theme.colors.palette.neutral800,
    },
    header: {
      paddingTop: metrics.xl,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: metrics.large,
      marginHorizontal: metrics.small,
    },
    title: {
      color: theme.colors.palette.neutral800,
    },
    addButton: {
      padding: metrics.small,
    },
    cancelButton: {
      padding: metrics.small,
    },
    actionBar: {
      backgroundColor: theme.colors.palette.primary500,
      paddingVertical: metrics.medium,
      paddingHorizontal: metrics.medium,
      marginHorizontal: metrics.small,
      marginBottom: metrics.medium,
      borderRadius: metrics.borderRadiusMedium,
    },
    actionBarButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: metrics.small,
    },
    actionBarButtonText: {
      color: theme.colors.palette.neutral100,
    },
    quickActions: {
      flexDirection: 'row',
      gap: metrics.medium,
      marginBottom: metrics.xl,
      marginHorizontal: metrics.small,
    },
    quickActionButton: {
      flex: 1,
      alignItems: 'center',
      padding: metrics.medium,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
    },
    quickActionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.palette.primary500,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: metrics.small,
    },
    quickActionText: {
      color: theme.colors.palette.neutral800,
    },
    groupsList: {
      flex: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: metrics.medium,
      marginHorizontal: metrics.small,
    },
    sectionTitle: {
      color: theme.colors.palette.neutral800,
    },
    groupCount: {
      color: theme.colors.palette.neutral500,
    },

    groupItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: metrics.medium,
      paddingHorizontal: metrics.small,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
      marginHorizontal: metrics.small,
    },
    groupItemSelected: {
      backgroundColor: theme.colors.palette.primary100,
      borderRadius: metrics.borderRadiusMedium,
      borderBottomWidth: 0,
      marginBottom: metrics.tiny,
    },
    groupItemFaded: {
      opacity: 0.3,
    },
    avatarContainer: {
      position: 'relative',
      marginRight: metrics.medium,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
    },
    avatarPlaceholder: {
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    groupContent: {
      flex: 1,
    },
    groupHeader: {
      flexDirection: 'row',
      // justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: metrics.tiny,
    },
    groupName: {
      color: theme.colors.palette.neutral800,
      marginRight: metrics.medium,
    },
    memberCount: {
      color: theme.colors.palette.neutral500,
    },
    memberCountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    groupDescription: {
      color: theme.colors.palette.neutral600,
      marginBottom: metrics.tiny,
    },
    groupActions: {
      flexDirection: 'row',
      gap: metrics.small,
    },
    actionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.primary500 + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    flatListContent: {
      paddingBottom: metrics.xl,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: metrics.xxl,
    },
    emptyTitle: {
      marginTop: metrics.medium,
      color: theme.colors.palette.neutral800,
    },
    emptyDescription: {
      marginTop: metrics.tiny,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      paddingHorizontal: metrics.medium,
    },
    avatarText: {
      color: theme.colors.palette.neutral800,
    },
    popupOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'transparent',
    },
    popupMenu: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusMedium,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      minWidth: 200,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      paddingVertical: metrics.tiny,
    },
    popupOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: metrics.medium,
      paddingHorizontal: metrics.medium,
    },
    popupOptionTextDanger: {
      marginLeft: metrics.small,
      color: theme.colors.palette.angry500,
    },
  })
