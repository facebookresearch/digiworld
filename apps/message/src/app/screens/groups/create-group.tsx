// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
  Image,
  Dimensions,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useStores } from '@/models/helpers/useStores'
import { Text, useAppTheme } from '@andojo/shared-theme'
import { Screen } from '@andojo/shared-theme/src/components'
import { Pressable } from '@gluestack-ui/themed'
import { StatusBar } from 'expo-status-bar'
import { mutations } from '@/db/mutations'
import { queries } from '@/db/queries'
import { GroupMember } from '@/app/types'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

const { width, height } = Dimensions.get('window')

interface GroupMemberWithDetails extends GroupMember {
  phoneNumber: string
}

export default function CreateGroupScreen() {
  const { theme, themeContext } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [groupImage, setGroupImage] = useState<string | null>(null)
  const [failedMemberAvatars, setFailedMemberAvatars] = useState<Set<string>>(
    new Set(),
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdateMode, setIsUpdateMode] = useState(false)
  const [groupMembers, setGroupMembers] = useState<GroupMemberWithDetails[]>([])
  const [membersToRemove, setMembersToRemove] = useState<string[]>([])
  const [membersToAdd, setMembersToAdd] = useState<GroupMemberWithDetails[]>([])
  const [isSessionRestored, setIsSessionRestored] = useState(false)
  const [sessionGroupId, setSessionGroupId] = useState<string | undefined>(
    undefined,
  )
  const [isRollbackScenario, setIsRollbackScenario] = useState(false)
  const { userStore, sessionStore } = useStores()
  const router = useRouter()
  const { groupId, sessionId } = useLocalSearchParams<{
    groupId?: string
    sessionId?: string
  }>()
  const selectedContactObjects = userStore.selectedContactObjects
  const displayedMembers = useMemo(() => {
    const uniqueMembers = new Map<string, GroupMemberWithDetails>()

    for (const member of groupMembers) {
      uniqueMembers.set(member.userId, member)
    }

    for (const member of membersToAdd) {
      if (!uniqueMembers.has(member.userId)) {
        uniqueMembers.set(member.userId, member)
      }
    }

    return Array.from(uniqueMembers.values())
  }, [groupMembers, membersToAdd])

  // Add interaction tracking
  const { trackClick, trackContentChange } = useInteractionTracking(
    'CreateGroup',
    '/screens/groups/create-group',
  )

  // Helper function to ensure complete form data is tracked
  const trackCompleteFormState = (action: string, additionalData: any = {}) => {
    const completeFormData = {
      action,
      groupName,
      groupDescription,
      groupImage,
      isUpdateMode,
      mode: isUpdateMode ? 'update' : 'create',
      groupId,
      sessionGroupId,
      groupMembers,
      membersToAdd,
      membersToRemove,
      selectedContactsCount: selectedContactObjects.length,
      isSessionRestored,
      timestamp: Date.now(),
      ...additionalData,
    }

    console.log('📊 Tracking complete form state:', {
      action,
      mode: completeFormData.mode,
      groupId: completeFormData.groupId,
      sessionGroupId: completeFormData.sessionGroupId,
      hasImage: !!completeFormData.groupImage,
      groupMembersCount: completeFormData.groupMembers.length,
      membersToAddCount: completeFormData.membersToAdd.length,
      membersToRemoveCount: completeFormData.membersToRemove.length,
    })

    trackContentChange(completeFormData)
  }

  // Track screen mount with initial state
  useEffect(() => {
    // Reset rollback flag for new sessions
    setIsRollbackScenario(false)

    trackCompleteFormState('screen_mounted', {
      isLoading,
      platform: Platform.OS,
      screenDimensions: {
        width,
        height,
      },
      sessionId,
    })
  }, [isUpdateMode])

  // Load session data if exists
  useEffect(() => {
    console.log('Session restoration check:', {
      sessionId,
      isSessionRestored,
      hasSessionId: !!sessionId,
      groupId,
      isUpdateMode,
    })

    // Try to restore from sessionId first
    if (sessionId && !isSessionRestored) {
      const session = sessionStore.getSession()
      console.log('Retrieved session:', {
        hasSession: !!session,
        hasSessionData: !!session?.data?.sessionData,
        sessionData: session?.data?.sessionData,
      })

      if (session?.data?.sessionData) {
        const formData = session.data.sessionData.formData as any
        console.log('Restoring create group session data:', formData)

        // Restore mode from session, but prioritize groupId if present
        const sessionIsUpdateMode =
          formData.isUpdateMode !== undefined
            ? formData.isUpdateMode
            : formData.mode === 'update'
        console.log('Session mode restoration:', {
          formDataIsUpdateMode: formData.isUpdateMode,
          formDataMode: formData.mode,
          sessionIsUpdateMode,
          currentIsUpdateMode: isUpdateMode,
          groupId,
          sessionGroupId: formData.groupId,
          hasGroupId: !!groupId,
          hasSessionGroupId: !!formData.groupId,
          willForceUpdateMode: !!(formData.groupId || groupId),
        })

        // Check for groupId in session data or URL params
        const restoredGroupId = formData.groupId || groupId

        // Store the groupId for later use
        setSessionGroupId(restoredGroupId)

        // If we have a groupId (from session or URL), always stay in update mode
        if (restoredGroupId) {
          console.log(
            'Forcing update mode due to groupId presence:',
            restoredGroupId,
          )
          setIsUpdateMode(true)
        } else if (
          formData.isUpdateMode !== undefined ||
          formData.mode !== undefined
        ) {
          // Only restore mode if it's explicitly set in session data
          setIsUpdateMode(sessionIsUpdateMode)
          console.log('Updated isUpdateMode to:', sessionIsUpdateMode)
        } else {
          // If no mode info in session, default to create mode (false)
          console.log('No mode info in session, defaulting to create mode')
          setIsUpdateMode(false)
        }

        // Double-check: if groupId is present (from session or URL), ensure we're in update mode
        if (restoredGroupId && !isUpdateMode) {
          console.log(
            'Final check: Forcing update mode due to groupId presence',
          )
          setIsUpdateMode(true)
        }

        // Restore form data - handle empty strings and preserve existing data
        if (formData.groupName !== undefined) {
          setGroupName(formData.groupName || '')
        }

        if (formData.groupDescription !== undefined) {
          setGroupDescription(formData.groupDescription || '')
        }

        if (formData.groupImage !== undefined) {
          console.log('About to restore group image from session:', {
            sessionHasImage: !!formData.groupImage,
            sessionImageLength: formData.groupImage
              ? formData.groupImage.length
              : 0,
            currentImage: !!groupImage,
            currentImageLength: groupImage ? groupImage.length : 0,
          })

          setGroupImage(formData.groupImage || null)
          console.log('Restored group image from session:', {
            hasImage: !!formData.groupImage,
            imageLength: formData.groupImage ? formData.groupImage.length : 0,
            imageData: formData.groupImage
              ? formData.groupImage.substring(0, 50) + '...'
              : 'null',
          })
        } else {
          console.log('No group image in session data to restore')
        }

        // Restore members data with proper state management
        console.log('Restoring members data:', {
          sessionGroupMembers: formData.groupMembers?.length || 0,
          sessionMembersToAdd: formData.membersToAdd?.length || 0,
          sessionMembersToRemove: formData.membersToRemove?.length || 0,
          action: formData.action,
        })

        // Mark this as a rollback scenario if we're restoring from session
        setIsRollbackScenario(true)

        console.log('Rollback analysis:', {
          action: formData.action,
          hasMembersToAdd:
            formData.membersToAdd && formData.membersToAdd.length > 0,
          isRollbackScenario: true,
        })

        if (formData.groupMembers && Array.isArray(formData.groupMembers)) {
          // Ensure we have complete member data with phone numbers and avatars
          const restoredMembers = formData.groupMembers.map((member: any) => ({
            userId: member.userId,
            name: member.name || 'Unknown User',
            avatarUrl: member.avatarUrl || undefined,
            phoneNumber: member.phoneNumber || '',
          }))
          setGroupMembers(restoredMembers)
          console.log('Restored groupMembers:', restoredMembers.length)
        } else {
          // Clear groupMembers if not in session data
          setGroupMembers([])
          console.log('Cleared groupMembers (not in session)')
        }

        if (formData.membersToAdd && Array.isArray(formData.membersToAdd)) {
          setMembersToAdd(formData.membersToAdd)
          console.log('Restored membersToAdd:', formData.membersToAdd.length)
        } else {
          // Clear membersToAdd if not present in session data
          setMembersToAdd([])
          console.log('Cleared membersToAdd (not in session)')
        }

        if (
          formData.membersToRemove &&
          Array.isArray(formData.membersToRemove)
        ) {
          setMembersToRemove(formData.membersToRemove)
          console.log(
            'Restored membersToRemove:',
            formData.membersToRemove.length,
          )
        } else {
          // Clear membersToRemove if not in session data
          setMembersToRemove([])
          console.log('Cleared membersToRemove (not in session)')
        }

        // Track the restoration
        trackCompleteFormState('session_restored', {
          restoredIsUpdateMode: sessionIsUpdateMode,
          restoredGroupId: formData.groupId,
          restoredGroupName: formData.groupName,
          restoredGroupDescription: formData.groupDescription,
          restoredGroupImage: formData.groupImage ? 'Yes' : 'No',
          restoredGroupMembers: formData.groupMembers?.length || 0,
          restoredMembersToAdd: formData.membersToAdd?.length || 0,
          restoredMembersToRemove: formData.membersToRemove?.length || 0,
          currentIsUpdateMode: isUpdateMode,
          currentGroupId: groupId,
          currentGroupName: groupName,
          currentGroupDescription: groupDescription,
          currentGroupImage: groupImage ? 'Yes' : 'No',
          currentGroupMembers: groupMembers.length,
          restoredAction: formData.action,
          restoredMembersWithDetails:
            formData.groupMembers?.map((member: any) => ({
              userId: member.userId,
              name: member.name,
              hasAvatar: !!member.avatarUrl,
              hasPhoneNumber: !!member.phoneNumber,
            })) || [],
        })

        setIsSessionRestored(true)

        // Clear navigation source after session restoration only if we have no selected contacts
        // This prevents unwanted member addition after rollback while allowing normal member addition
        if (
          userStore.navigationSource === 'addToGroup' &&
          userStore.selectedContactObjects.length === 0
        ) {
          console.log(
            'Clearing navigation source after session restoration - no selected contacts',
          )
          userStore.clearNavigationSource()
        } else if (userStore.navigationSource === 'addToGroup') {
          console.log(
            'Keeping navigation source - has selected contacts for normal member addition',
          )
        }
      }
    }

    // Fallback: If no sessionId but we have groupId and we're not restored, try to find recent session
    if (!sessionId && groupId && !isSessionRestored) {
      console.log(
        'No sessionId provided, trying to find recent session for groupId:',
        groupId,
      )

      // Try to find recent session by checking if we have any session data for this group
      // For now, let's just force update mode and set the groupId
      console.log(
        'Forcing update mode and setting sessionGroupId for groupId:',
        groupId,
      )
      setSessionGroupId(groupId)
      setIsUpdateMode(true)
      setIsSessionRestored(true)

      trackCompleteFormState('session_restored_from_fallback', {
        restoredFromRecentSession: true,
        groupId,
      })
    }
  }, [sessionId, sessionStore, trackContentChange, isSessionRestored, groupId])

  // Check if we're in update mode
  useEffect(() => {
    console.log('groupId useEffect - Debug:', {
      groupId,
      currentIsUpdateMode: isUpdateMode,
      isSessionRestored,
    })

    if (groupId) {
      console.log('Setting update mode - groupId found:', groupId)
      setIsUpdateMode(true)

      // Only load data from database if we haven't restored from session
      if (!isSessionRestored) {
        console.log(
          'Loading group data from database (not restored from session)',
        )
        loadGroupData()
        loadGroupMembers()
      } else {
        console.log(
          'Skipping database load - data already restored from session',
        )
      }
    } else {
      console.log('No groupId found - staying in create mode')
    }
  }, [groupId, isSessionRestored])

  // Ensure update mode is maintained if groupId is present
  useEffect(() => {
    if (groupId && !isUpdateMode) {
      console.log(
        'Forcing update mode - groupId present but isUpdateMode is false',
      )
      setIsUpdateMode(true)
    }
  }, [groupId, isUpdateMode])

  // Additional safety check: ensure update mode when groupId is present
  useEffect(() => {
    if (groupId) {
      console.log('Safety check: Ensuring update mode for groupId:', groupId)
      setIsUpdateMode(true)
    }
  }, [groupId])

  // Ensure sessionGroupId is maintained when groupId changes
  useEffect(() => {
    if (groupId && !sessionGroupId) {
      console.log('Setting sessionGroupId from groupId:', groupId)
      setSessionGroupId(groupId)
    }
  }, [groupId, sessionGroupId])

  // Ensure update mode is maintained when sessionGroupId is present
  useEffect(() => {
    if (sessionGroupId && !isUpdateMode) {
      console.log(
        'Forcing update mode due to sessionGroupId presence:',
        sessionGroupId,
      )
      setIsUpdateMode(true)
    }
  }, [sessionGroupId, isUpdateMode])

  // Ensure proper member state management in update mode
  useEffect(() => {
    if (isUpdateMode && groupId && isSessionRestored) {
      console.log('Update mode member state check:', {
        groupMembersCount: groupMembers.length,
        membersToAddCount: membersToAdd.length,
        membersToRemoveCount: membersToRemove.length,
        totalMembers: groupMembers.length + membersToAdd.length,
      })

      // If we have members to remove but no members to add, ensure we're not showing duplicates
      if (membersToRemove.length > 0 && membersToAdd.length === 0) {
        console.log(
          'Members removed state detected - ensuring clean member display',
        )
      }
    }
  }, [
    isUpdateMode,
    groupId,
    isSessionRestored,
    groupMembers,
    membersToAdd,
    membersToRemove,
  ])

  // Track changes to form data and save to session
  useEffect(() => {
    if (isSessionRestored) {
      trackCompleteFormState('form_data_updated')
    }
  }, [
    groupName,
    groupDescription,
    groupImage,
    groupMembers,
    membersToAdd,
    membersToRemove,
    isSessionRestored,
    groupId,
    isUpdateMode,
  ])

  // Debug logging for image state changes
  useEffect(() => {
    console.log('Group image state changed:', {
      hasImage: !!groupImage,
      imageLength: groupImage ? groupImage.length : 0,
      isSessionRestored,
      isUpdateMode,
      groupId,
      sessionGroupId,
      imagePreview: groupImage ? groupImage.substring(0, 30) + '...' : 'null',
    })
  }, [groupImage, isSessionRestored, isUpdateMode, groupId, sessionGroupId])

  // Debug logging for member state changes
  useEffect(() => {
    console.log('Member state changed:', {
      groupMembersCount: groupMembers.length,
      membersToAddCount: membersToAdd.length,
      membersToRemoveCount: membersToRemove.length,
      totalDisplayedMembers: groupMembers.length + membersToAdd.length,
      isSessionRestored,
      isUpdateMode,
      groupId,
    })
  }, [
    groupMembers,
    membersToAdd,
    membersToRemove,
    isSessionRestored,
    isUpdateMode,
    groupId,
  ])

  // Handle returning from contact list with selected contacts
  useFocusEffect(
    useCallback(() => {
      console.log('useFocusEffect check:', {
        isUpdateMode,
        navigationSource: userStore.navigationSource,
        isSessionRestored,
        selectedContactsCount: userStore.selectedContactObjects.length,
      })

      // Handle contact selection completion
      if (
        isUpdateMode &&
        userStore.navigationSource === 'addToGroup' &&
        userStore.selectedContactObjects.length > 0 &&
        !isRollbackScenario // Don't run if this is a rollback scenario
      ) {
        console.log('Handling contact selection completion')
        handleContactSelectionComplete()
      } else {
        console.log('Skipping contact selection completion:', {
          reason: !isUpdateMode
            ? 'not update mode'
            : userStore.navigationSource !== 'addToGroup'
              ? 'not from addToGroup'
              : userStore.selectedContactObjects.length === 0
                ? 'no selected contacts'
                : isRollbackScenario
                  ? 'rollback scenario'
                  : 'unknown',
        })
      }
    }, [
      isUpdateMode,
      userStore.navigationSource,
      userStore.selectedContactObjects.length,
      isSessionRestored,
      isRollbackScenario,
    ]),
  )

  const loadGroupData = async () => {
    if (!groupId) return

    try {
      setIsLoading(true)
      trackCompleteFormState('group_data_load_started')

      const group = await queries.getGroupById(groupId)
      if (group) {
        // Only set data if we haven't restored from session
        if (!isSessionRestored) {
          setGroupName(group.name || '')
          setGroupDescription(group.description || '')
          setGroupImage(group.avatarUrl || null)
          console.log('Loaded group data from database:', {
            name: group.name,
            description: group.description,
            hasImage: !!group.avatarUrl,
          })
        } else {
          console.log('Skipping database load - data restored from session')
        }

        trackCompleteFormState('group_data_load_completed', {
          loadedGroupName: group.name,
          loadedGroupDescription: group.description,
          hasLoadedGroupImage: !!group.avatarUrl,
          wasRestoredFromSession: isSessionRestored,
        })
      }
    } catch (error) {
      console.error('Error loading group data:', error)
      Alert.alert('Error', 'Failed to load group data')

      trackCompleteFormState('group_data_load_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadGroupMembers = async () => {
    if (!groupId) return

    try {
      setIsLoading(true)
      console.log('Loading group members for groupId:', groupId)
      const members = await queries.getGroupMembers(groupId)
      console.log('Raw members from DB:', members)
      const membersWithDetails: GroupMemberWithDetails[] = []

      for (const member of members) {
        const user = await queries.getUserById(member.userId)
        console.log('User details for member:', member.userId, user)
        if (user) {
          membersWithDetails.push({
            userId: member.userId,
            name: user.name || 'Unknown User',
            avatarUrl: user.avatarUrl || undefined,
            phoneNumber: user.phoneNumber,
          })
        }
      }

      console.log('Final members with details:', membersWithDetails)
      setGroupMembers(membersWithDetails)
    } catch (error) {
      console.error('Error loading group members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const removeMemberFromGroup = async (member: GroupMemberWithDetails) => {
    const isCurrentUser = member.userId === userStore.currentUser?.id
    const title = isCurrentUser ? 'Exit from Group' : 'Remove Member'
    const message = isCurrentUser
      ? `Are you sure you want to exit from this group?`
      : `Are you sure you want to remove ${member.name} from this group?`
    const confirmText = isCurrentUser ? 'Exit' : 'Remove'

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: confirmText,
        style: 'destructive',
        onPress: () => {
          // Check if member is in groupMembers or membersToAdd
          const isInGroupMembers = groupMembers.some(
            m => m.userId === member.userId,
          )
          const isInMembersToAdd = membersToAdd.some(
            m => m.userId === member.userId,
          )

          console.log('Removing member:', {
            name: member.name,
            userId: member.userId,
            isInGroupMembers,
            isInMembersToAdd,
            isCurrentUser,
          })

          if (isInGroupMembers) {
            // Remove from existing group members
            setGroupMembers(prev =>
              prev.filter(m => m.userId !== member.userId),
            )
            // Track for later removal from database
            setMembersToRemove(prev => [...prev, member.userId])
            console.log(
              'Member removed from groupMembers:',
              member.name,
              member.userId,
            )
          }

          if (isInMembersToAdd) {
            // Remove from newly added members
            setMembersToAdd(prev =>
              prev.filter(m => m.userId !== member.userId),
            )
            console.log(
              'Member removed from membersToAdd:',
              member.name,
              member.userId,
            )
          }

          console.log(
            isCurrentUser
              ? 'User marked for exit:'
              : 'Member marked for removal:',
            member.name,
            member.userId,
          )

          // Track the action
          trackCompleteFormState('member_removed', {
            removedMemberId: member.userId,
            removedMemberName: member.name,
            isCurrentUser,
            wasInGroupMembers: isInGroupMembers,
            wasInMembersToAdd: isInMembersToAdd,
            updatedGroupMembers: groupMembers.filter(
              m => m.userId !== member.userId,
            ),
            updatedMembersToAdd: membersToAdd.filter(
              m => m.userId !== member.userId,
            ),
            updatedMembersToRemove: isInGroupMembers
              ? [...membersToRemove, member.userId]
              : membersToRemove,
          })
        },
      },
    ])
  }

  const handleAddMembers = () => {
    // Set navigation source and clear selected contacts
    userStore.setNavigationSource('addToGroup')
    userStore.clearSelectedContacts()
    userStore.setSelectedContactObjects([])

    // Set current group members for filtering in contact list
    // Include both existing members and newly added members
    const currentMemberIds = groupMembers.map(member => member.userId)
    const addedMemberIds = membersToAdd.map(member => member.userId)
    const allCurrentMemberIds = [...currentMemberIds, ...addedMemberIds]

    userStore.setCurrentGroupMembers(allCurrentMemberIds)
    console.log('Set current group members for filtering:', allCurrentMemberIds)

    // Track the action
    trackCompleteFormState('add_members_pressed', {
      currentMemberIds: allCurrentMemberIds,
    })

    // Navigate to contact list
    router.push('/screens/contacts/contact-list')
  }

  const handleContactSelectionComplete = async () => {
    // This will be called when returning from contact list
    const selectedContacts = userStore.selectedContactObjects
    console.log('Selected contacts for adding to group:', selectedContacts)

    // Convert selected contacts to GroupMemberWithDetails format
    const newMembers: GroupMemberWithDetails[] = []

    for (const contact of selectedContacts) {
      if (contact.type !== 'database') {
        continue
      }

      const userId = contact.id.replace('db-', '')

      newMembers.push({
        userId,
        name: contact.name,
        avatarUrl: contact.avatarUrl,
        phoneNumber: contact.phoneNumber,
      })
    }

    // Filter out duplicates based on userId
    const existingUserIds = new Set([
      ...groupMembers.map(m => m.userId),
      ...membersToAdd.map(m => m.userId),
    ])

    const uniqueNewMembers = newMembers.filter(
      member => !existingUserIds.has(member.userId),
    )

    console.log(
      'Adding unique new members:',
      uniqueNewMembers.map(m => ({
        name: m.name,
        userId: m.userId,
      })),
    )

    // Add to members to add list while guarding against repeated focus restores
    setMembersToAdd(prev => {
      const existingIds = new Set([
        ...groupMembers.map(member => member.userId),
        ...prev.map(member => member.userId),
      ])
      const dedupedNewMembers = uniqueNewMembers.filter(
        member => !existingIds.has(member.userId),
      )
      return [...prev, ...dedupedNewMembers]
    })

    // Add newly added member IDs to currentGroupMembers store to prevent them from appearing again
    const newMemberIds = uniqueNewMembers.map(member => member.userId)
    const currentMemberIds = groupMembers.map(member => member.userId)
    const allCurrentMemberIds = [
      ...currentMemberIds,
      ...userStore.currentGroupMembers.slice(),
    ]
    userStore.setCurrentGroupMembers([...allCurrentMemberIds, ...newMemberIds])

    // Clear selected contacts
    userStore.clearSelectedContacts()
    userStore.setSelectedContactObjects([])
  }

  const renderMemberItem = ({ item }: { item: GroupMemberWithDetails }) => {
    const initials = item.name
      .split(' ')
      .map(p => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

    const isCurrentUser = item.userId === userStore.currentUser?.id

    console.log('Rendering member:', {
      name: item.name,
      isCurrentUser,
      userId: item.userId,
      currentUserId: userStore.currentUser?.id,
    })

    console.log('Rendering buttons for', item.name, {
      isCurrentUser,
      shouldShowRemove: !isCurrentUser,
    })

    return (
      <View style={styles.memberListItem}>
        <View style={styles.memberInfo}>
          <View style={styles.memberListItemAvatar}>
            {item.avatarUrl &&
            isValidBase64(item.avatarUrl) &&
            !failedMemberAvatars.has(item.userId) ? (
              <Image
                source={{ uri: item.avatarUrl }}
                style={styles.memberAvatarImage}
                onError={() => {
                  console.log('Member avatar failed to load for:', item.name)
                  setFailedMemberAvatars(
                    prev => new Set([...prev, item.userId]),
                  )
                }}
                onLoad={() => {
                  console.log(
                    'Member avatar loaded successfully for:',
                    item.name,
                  )
                  setFailedMemberAvatars(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(item.userId)
                    return newSet
                  })
                }}
              />
            ) : (
              <View style={styles.memberAvatarPlaceholder}>
                <Text
                  text={initials}
                  size="medium"
                  weight="bold"
                  style={styles.memberAvatarText}
                />
              </View>
            )}
          </View>
          <View style={styles.memberDetails}>
            <Text
              text={isCurrentUser ? `${item.name} (You)` : item.name}
              size="medium"
              weight="bold"
              style={styles.memberName}
            />
            <Text
              text={item.phoneNumber}
              size="small"
              style={styles.memberPhone}
            />
          </View>
        </View>
        <View style={styles.memberActions}>
          {/* Don't show remove button for current user - they should use exit group from three dots menu */}
          {!isCurrentUser && (
            <TouchableOpacity
              style={styles.removeMemberButton}
              onPress={() => removeMemberFromGroup(item)}
            >
              <Ionicons
                name="close-circle"
                size={24}
                color={theme.colors.error}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  const pickImage = async () => {
    try {
      trackCompleteFormState('group_image_pick_started')

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        if (asset.base64) {
          const imageData = `data:image/jpeg;base64,${asset.base64}`
          setGroupImage(imageData)

          trackCompleteFormState('group_image_selected', {
            hasImage: true,
          })
        } else {
          console.log('No base64 data in selected image')
          trackCompleteFormState('group_image_pick_error', {
            error: 'No base64 data in selected image',
          })
        }
      } else {
        trackCompleteFormState('group_image_pick_cancelled')
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to pick image. Please try again.')

      trackCompleteFormState('group_image_pick_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const isValidBase64 = (str: string) => {
    if (!str) return false
    return str.startsWith('data:image') || str.includes('base64')
  }

  const removeGroupImage = () => {
    setGroupImage(null)
    trackCompleteFormState('group_image_removed')
  }

  const showImagePickerOptions = () => {
    Alert.alert(
      'Select Group Picture',
      'Choose how you want to add your group picture',
      [
        {
          text: 'Gallery',
          onPress: pickImage,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    )
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name')
      return
    }
    if (!isUpdateMode && selectedContactObjects.length === 0) {
      Alert.alert('Error', 'Please select at least one member')
      return
    }

    trackClick(isUpdateMode ? 'updateGroupButton' : 'createGroupButton')
    trackCompleteFormState(
      isUpdateMode ? 'group_update_started' : 'group_creation_started',
    )

    try {
      // Use the stored sessionGroupId or get from session data as fallback
      const effectiveGroupId = sessionGroupId || groupId

      // Additional debug logging for groupId sources
      console.log('GroupId sources check:', {
        sessionGroupId,
        groupId,
        effectiveGroupId,
        isSessionRestored,
        isUpdateMode,
      })

      // Determine if we should be in update mode based on groupId presence
      const shouldBeUpdateMode = effectiveGroupId || isUpdateMode
      console.log('Group save decision:', {
        isUpdateMode,
        groupId,
        sessionGroupId,
        effectiveGroupId,
        shouldBeUpdateMode,
        willUpdate: shouldBeUpdateMode && effectiveGroupId,
        willCreate: !shouldBeUpdateMode || !effectiveGroupId,
      })

      if (shouldBeUpdateMode && effectiveGroupId) {
        // Update existing group
        const updateData = {
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          avatarUrl: groupImage || null,
        }

        console.log('Updating group with data:', updateData)
        const updateResult = await mutations.updateGroup(
          effectiveGroupId as string,
          updateData,
        )

        if (!updateResult.success) {
          Alert.alert('Error', 'Failed to update group')
          return
        }

        // Remove tracked members from database
        if (membersToRemove.length > 0) {
          console.log('Removing members from database:', membersToRemove)
          for (const userId of membersToRemove) {
            const removeResult = await mutations.deleteGroupMember(
              effectiveGroupId as string,
              userId,
            )
            if (removeResult.success) {
              console.log('Successfully removed member:', userId)
            } else {
              console.error('Failed to remove member:', userId)
            }
          }
        }

        // Add new members to database
        if (membersToAdd.length > 0) {
          console.log('Adding new members to database:', membersToAdd)
          for (const member of membersToAdd) {
            const addResult = await mutations.createGroupMember({
              groupId: effectiveGroupId as string,
              userId: member.userId,
            })
            if (addResult.success) {
              console.log(
                'Successfully added member:',
                member.name,
                member.userId,
              )
            } else {
              console.error('Failed to add member:', member.name, member.userId)
            }
          }
        }

        trackCompleteFormState('group_update_success', {
          membersAdded: membersToAdd.length,
          membersRemoved: membersToRemove.length,
        })

        Alert.alert(
          'Group Updated Successfully!',
          `✅ ${groupName} has been updated`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Clear temporary states after successful update
                setMembersToAdd([])
                setMembersToRemove([])
                userStore.clearCurrentGroupMembers()
                userStore.clearNavigationSource()
                router.back()
              },
            },
          ],
        )
      } else {
        // Create new group
        const groupData = {
          id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          avatarUrl: groupImage || null,
          createdBy: userStore.currentUser?.id || 'unknown',
          createdAt: Math.floor(Date.now() / 1000),
          isActive: 1,
        }

        console.log('Creating group with data:', groupData)
        const groupResult = await mutations.createGroup(groupData)

        if (!groupResult.success) {
          Alert.alert('Error', 'Failed to create group')
          return
        }

        const newGroupId = groupData.id
        console.log('Group created successfully with ID:', newGroupId)

        // Add the creator as a member
        if (userStore.currentUser?.id) {
          await mutations.createGroupMember({
            groupId: newGroupId,
            userId: userStore.currentUser.id,
          })
          console.log('Added creator as group member')
        }

        // Add selected contacts as members
        for (const contact of selectedContactObjects) {
          if (contact.type === 'database') {
            // Extract user ID from contact ID (remove 'db-' prefix)
            const userId = contact.id.replace('db-', '')
            await mutations.createGroupMember({
              groupId: newGroupId,
              userId,
            })
            console.log(`Added member: ${contact.name} (${userId})`)
          }
        }

        trackCompleteFormState('group_creation_success', {
          newGroupId,
          membersCount: selectedContactObjects.length + 1, // +1 for creator
        })

        // Show success alert and navigate to groups tab
        Alert.alert(
          'Group Created Successfully!',
          `✅ ${groupData.name} is created successfully`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Clear selected contacts
                userStore.clearSelectedContacts()
                // Navigate to groups tab
                router.push('/(tabs)/groups')
              },
            },
          ],
        )
      }
    } catch (error) {
      console.error('Error saving group:', error)
      Alert.alert('Error', 'Failed to save group. Please try again.')

      trackCompleteFormState(
        isUpdateMode ? 'group_update_error' : 'group_creation_error',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      )
    }
  }

  const isValid = () => {
    if (isUpdateMode) {
      return groupName.trim().length > 0
    }
    return groupName.trim().length > 0 && selectedContactObjects.length > 0
  }

  if (isLoading) {
    return (
      <Screen
        preset="fixed"
        safeAreaEdges={['top']}
        backgroundColor={theme.colors.background}
        contentContainerStyle={styles.screenContent}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading group data...</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={['top']}
      backgroundColor={theme.colors.background}
      contentContainerStyle={styles.screenContent}
    >
      <StatusBar
        style={themeContext === 'dark' ? 'light' : 'dark'}
        backgroundColor={theme.colors.background}
      />
      {/* Fixed Header Section */}
      <View style={styles.headerContainer}>
        <Pressable
          onPress={() => {
            trackClick('backButton')
            trackCompleteFormState('create_group_screen_closed')

            if (isUpdateMode) {
              // Clear temporary states when going back in update mode
              setMembersToAdd([])
              setMembersToRemove([])
              userStore.clearCurrentGroupMembers()
              userStore.clearNavigationSource()
            }
            router.back()
          }}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.palette.neutral800}
          />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text
            preset="subheading"
            text={isUpdateMode ? 'Group Info' : 'Create Group'}
            style={styles.headerTitle}
          />
        </View>
      </View>

      <View style={styles.headerSection}>
        <TouchableOpacity
          onPress={showImagePickerOptions}
          style={styles.avatarContainer}
          activeOpacity={0.8}
        >
          {groupImage && isValidBase64(groupImage) ? (
            <Image
              source={{ uri: groupImage }}
              style={styles.avatarImage}
              onError={() => {
                console.log(
                  'Group image failed to load, showing initials instead',
                )
                setGroupImage(null)
              }}
              onLoad={() => {
                console.log('Group image loaded successfully')
              }}
            />
          ) : (
            <View style={styles.avatar}>
              {isUpdateMode ? (
                <Text
                  text={
                    groupName
                      ? groupName
                          .split(' ')
                          .map((word: string) => word.charAt(0).toUpperCase())
                          .join('')
                          .slice(0, 2)
                      : 'G'
                  }
                  size="xl"
                  weight="bold"
                  style={styles.avatarText}
                />
              ) : (
                <Ionicons
                  name="people"
                  size={40}
                  color={theme.colors.palette.neutral100}
                />
              )}
            </View>
          )}
          <View style={styles.avatarOverlay}>
            <Ionicons
              name="camera"
              size={20}
              color={theme.colors.palette.neutral100}
            />
          </View>
          {groupImage && (
            <TouchableOpacity
              onPress={removeGroupImage}
              style={styles.removeAvatarButton}
            >
              <Ionicons
                name="close-circle"
                size={24}
                color={theme.colors.error}
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {/* Form Section */}
      <View style={styles.formSection}>
        <View style={styles.formCard}>
          {/* Group Name */}
          <Text text="Group Name" style={styles.label} />
          <TextInput
            placeholder="Enter group name"
            value={groupName}
            onChangeText={text => {
              setGroupName(text)
              trackCompleteFormState('group_name_changed')
            }}
            style={styles.input}
            placeholderTextColor={theme.colors.palette.neutral400}
            returnKeyType="done"
            numberOfLines={1}
            autoCapitalize="words"
            blurOnSubmit={true}
            enablesReturnKeyAutomatically={true}
          />

          {/* Group Description */}
          <Text text="Group Description" style={styles.label} />
          <TextInput
            placeholder="Enter group description (optional)"
            value={groupDescription}
            onChangeText={text => {
              setGroupDescription(text)
              trackCompleteFormState('group_description_changed')
            }}
            style={styles.descriptionInput}
            placeholderTextColor={theme.colors.palette.neutral400}
            returnKeyType="done"
            numberOfLines={3}
            autoCapitalize="sentences"
            blurOnSubmit={true}
            enablesReturnKeyAutomatically={true}
            multiline={true}
          />

          {/* Members Section - Only show for create mode */}
          {!isUpdateMode && (
            <>
              <Text
                text={`Members (${selectedContactObjects.length})`}
                style={styles.label}
              />

              {/* Member List */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.memberScroll}
              >
                {selectedContactObjects.map(contact => {
                  const initials = contact.name
                    .split(' ')
                    .map(p => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()

                  const avatar = contact.avatarUrl

                  return (
                    <View key={contact.id} style={styles.memberItem}>
                      {avatar &&
                      isValidBase64(avatar) &&
                      !failedMemberAvatars.has(contact.id) ? (
                        <Image
                          source={{ uri: avatar }}
                          style={styles.memberAvatar}
                          onError={() => {
                            console.log(
                              'Member avatar failed to load for:',
                              contact.name,
                            )
                            setFailedMemberAvatars(
                              prev => new Set([...prev, contact.id]),
                            )
                          }}
                          onLoad={() => {
                            console.log(
                              'Member avatar loaded successfully for:',
                              contact.name,
                            )
                            setFailedMemberAvatars(prev => {
                              const newSet = new Set(prev)
                              newSet.delete(contact.id)
                              return newSet
                            })
                          }}
                        />
                      ) : (
                        <View style={styles.memberPlaceholder}>
                          <Text style={styles.initials}>{initials}</Text>
                        </View>
                      )}
                      <Text
                        size="tiny"
                        numberOfLines={2}
                        style={styles.memberName}
                      >
                        {contact.name}
                      </Text>
                    </View>
                  )
                })}
              </ScrollView>
            </>
          )}
          {isUpdateMode && (
            <>
              <View style={styles.membersHeader}>
                <Text
                  text={`Members (${displayedMembers.length})`}
                  style={styles.label}
                />
                <TouchableOpacity
                  style={styles.addMembersButton}
                  onPress={handleAddMembers}
                >
                  <Ionicons
                    name="person-add"
                    size={16}
                    color={theme.colors.palette.primary500}
                  />
                  <Text
                    text="Add Members"
                    size="small"
                    style={styles.addMembersText}
                  />
                </TouchableOpacity>
              </View>
              <FlatList
                data={displayedMembers}
                renderItem={renderMemberItem}
                keyExtractor={item => item.userId}
                contentContainerStyle={styles.memberList}
                style={styles.memberFlatList}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              />
            </>
          )}
        </View>
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, !isValid() && styles.fabDisabled]}
        onPress={handleCreateGroup}
        disabled={!isValid()}
      >
        <Ionicons
          name="checkmark"
          size={28}
          color={theme.colors.palette.neutral100}
        />
      </TouchableOpacity>
    </Screen>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    screenContent: {
      flex: 1,
      paddingTop: 48,
      paddingHorizontal: 20,
    },
    backButton: {
      position: 'absolute',
      left: 16,
      zIndex: 1,
      padding: 8,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 16,
      position: 'relative',
      marginTop: 16,
    },
    headerTitle: {
      color: theme.colors.palette.neutral800,
      textAlign: 'center',
    },
    headerSpacer: {
      flex: 1,
    },
    headerTitleContainer: {
      flex: 1,
      alignItems: 'center',
    },
    headerSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    avatarContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      position: 'relative',
      marginBottom: 12,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 50,
    },
    avatar: {
      width: '100%',
      height: '100%',
      borderRadius: 50,
      backgroundColor: theme.colors.palette.primary500,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 15,
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral100,
    },
    removeAvatarButton: {
      position: 'absolute',
      top: -5,
      right: -5,
    },
    title: {
      marginBottom: 8,
      color: theme.colors.palette.primary500,
    },
    subtitle: {
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      marginBottom: 8,
    },
    formSection: {
      flex: 1,
      justifyContent: 'flex-start',
    },
    formCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      marginHorizontal: 10,
      flex: 1, // Allow form card to expand
    },
    label: {
      marginBottom: 12,
      color: theme.colors.palette.neutral800,
    },
    input: {
      borderColor: theme.colors.palette.neutral300,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      color: theme.colors.palette.neutral900,
      marginBottom: 20,
    },
    descriptionInput: {
      borderColor: theme.colors.palette.neutral300,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      color: theme.colors.palette.neutral900,
      marginBottom: 20,
      minHeight: 80, // Added for multiline input
    },
    memberScroll: {
      flexDirection: 'row',
      paddingBottom: 12,
    },
    memberItem: {
      alignItems: 'center',
      marginRight: 12,
      width: 60,
    },
    memberAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      marginBottom: 4,
    },
    memberPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    initials: {
      color: theme.colors.palette.neutral800,
      fontWeight: 'bold',
      fontSize: 14,
    },
    memberName: {
      color: theme.colors.palette.neutral900,
      marginBottom: 2,
    },
    memberPhone: {
      color: theme.colors.palette.neutral600,
      fontSize: 12,
    },
    memberActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      minWidth: 100, // Ensure minimum width for buttons
    },
    removeMemberButton: {
      marginLeft: 10,
      padding: 8,
      backgroundColor: theme.colors.error + '15',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    memberList: {
      paddingBottom: 10,
    },
    memberFlatList: {
      flex: 1, // Ensure FlatList takes available space
    },
    memberListItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    memberMarkedForRemoval: {
      opacity: 0.7,
      backgroundColor: theme.colors.palette.neutral100,
      borderColor: theme.colors.palette.neutral300,
      borderWidth: 1,
    },
    memberNameRemoved: {
      color: theme.colors.palette.neutral500,
      textDecorationLine: 'line-through',
    },
    memberPhoneRemoved: {
      color: theme.colors.palette.neutral500,
      textDecorationLine: 'line-through',
    },
    removalIndicator: {
      color: theme.colors.palette.neutral500,
      marginTop: 4,
    },
    undoButton: {
      marginLeft: 10,
      padding: 8,
      backgroundColor: theme.colors.palette.primary100,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    memberInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    memberListItemAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    memberAvatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 20,
    },
    memberAvatarText: {
      color: theme.colors.palette.neutral800,
    },
    memberDetails: {
      flex: 0, // Remove flex: 1 to prevent pushing buttons off screen
    },
    fab: {
      position: 'absolute',
      bottom: 30,
      right: 24,
      backgroundColor: theme.colors.palette.primary500,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: theme.colors.transparent,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    fabDisabled: {
      backgroundColor: theme.colors.palette.neutral300,
      opacity: 0.7,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      fontSize: 18,
      color: theme.colors.palette.neutral600,
    },
    membersHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    addMembersButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.primary100,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    addMembersText: {
      marginLeft: 8,
      color: theme.colors.palette.primary500,
    },
    avatarText: {
      color: theme.colors.palette.neutral100,
    },
    memberAvatarPlaceholder: {
      width: '100%',
      height: '100%',
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })
