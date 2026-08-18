// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Keyboard,
  Platform,
} from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme, type Theme, metrics } from '@andojo/shared-theme'
import { Text, Screen } from '@andojo/shared-theme/src/components'
import { useStores } from '@/models/helpers/useStores'
import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'
import { isDatabaseReady } from '@/db'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import * as DocumentPicker from 'expo-document-picker'
import { getFontSizeForText } from '@/utils/chatSettings'
import RNFS from 'react-native-fs'
import FileMessageBubble from '@/components/FileMessageBubble'
import AttachmentMenu from '@/components/AttachmentMenu'
import ChatSearch from '@/components/ChatSearch'
import {
  GroupMessage,
  Group,
  GroupMember,
  MessageGroup,
  FileAttachment,
} from '@/app/types'

// File type configurations
const getFileTypes = (theme: Theme) => ({
  image: {
    icon: 'image',
    color: theme.colors.palette.primary500,
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
    preview: '📷',
  },
  video: {
    icon: 'videocam',
    color: theme.colors.palette.angry500,
    extensions: ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv'],
    preview: '🎥',
    category: 'Videos',
  },
  audio: {
    icon: 'musical-notes',
    color: theme.colors.palette.accent400,
    extensions: ['.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a'],
    preview: '🎵',
    category: 'Audio',
  },
  document: {
    icon: 'document',
    color: theme.colors.palette.primary500,
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
    preview: '📄',
    category: 'Documents',
  },
  spreadsheet: {
    icon: 'grid',
    color: theme.colors.palette.success500,
    extensions: ['.xls', '.xlsx', '.csv'],
    preview: '📊',
    category: 'Spreadsheets',
  },
  presentation: {
    icon: 'easel',
    color: theme.colors.palette.accent400,
    extensions: ['.ppt', '.pptx'],
    preview: '📽️',
    category: 'Presentations',
  },
  archive: {
    icon: 'folder',
    color: theme.colors.palette.neutral600,
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    preview: '📦',
  },
  code: {
    icon: 'code',
    color: theme.colors.palette.neutral800,
    extensions: [
      '.js',
      '.ts',
      '.jsx',
      '.tsx',
      '.py',
      '.java',
      '.cpp',
      '.c',
      '.html',
      '.css',
    ],
    preview: '💻',
  },
})

export default function GroupChatScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { groupId, sessionId, sessionTimeStamp } = useLocalSearchParams<{
    groupId: string
    sessionId?: string
    sessionTimeStamp?: string
  }>()
  console.log('GroupChatScreen loaded for groupId:', groupId)
  const router = useRouter()
  const { userStore, sessionStore } = useStores()
  const flatListRef = useRef<FlashList<MessageGroup>>(null)
  const inputRef = useRef<TextInput>(null)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const [hasSessionRestoration, setHasSessionRestoration] = useState(false)

  // State
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([])
  const [groupedMessages, setGroupedMessages] = useState<MessageGroup[]>([])
  const [group, setGroup] = useState<Group | null>(null)
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [showAttachmentPanel, setShowAttachmentPanel] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(
    new Set(),
  )
  const [isDeleting, setIsDeleting] = useState(false)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const menuButtonRef = useRef<any>(null)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [deleteAlertType, setDeleteAlertType] = useState<'selected' | 'all'>(
    'selected',
  )
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)
  const [failedReadAvatars, setFailedReadAvatars] = useState<Set<string>>(
    new Set(),
  )
  // Search functionality
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null)
  // Edit message functionality
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  // Group exit status
  const [hasExitedGroup, setHasExitedGroup] = useState(false)
  const [exitedAt, setExitedAt] = useState<number | null>(null)

  // Animation values
  const inputHeight = useSharedValue(50)
  const sendButtonScale = useSharedValue(0)
  const attachmentPanelProgress = useSharedValue(0)

  // Interaction tracking
  const { trackClick, trackContentChange } = useInteractionTracking(
    'GroupChat',
    `/screens/chat/group/${groupId}`,
  )

  // Track state changes
  const saveStateToSession = useCallback(
    (stateData: any) => {
      trackContentChange({
        action: 'state_change',
        ...stateData,
        timestamp: Date.now(),
      })
    },
    [trackContentChange],
  )

  // Memoize group data for tracking
  const groupDataForTracking = useMemo(
    () => ({
      groupId,
      groupName: group?.name,
      memberCount: groupMembers.length,
      messageCount: groupMessages.length,
      searchText,
      isSearchMode,
      editingMessageId,
      editText,
    }),
    [
      groupId,
      group?.name,
      groupMembers.length,
      groupMessages.length,
      searchText,
      isSearchMode,
      editingMessageId,
      editText,
    ],
  )

  // Restore state from session when sessionTimeStamp is present
  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession()

      if (session?.data?.sessionData) {
        const savedState = session.data.sessionData.formData as any

        // Restore state from session
        if (savedState) {
          // Restore input text if exists
          if (savedState.inputText) {
            setInputText(savedState.inputText)
          }

          // Restore search mode if exists
          if (savedState.isSearchMode) {
            setIsSearchMode(savedState.isSearchMode)
          }

          // Restore search text if exists
          if (savedState.searchText) {
            setSearchText(savedState.searchText)
          }

          // Restore selection mode if exists
          if (savedState.isSelectionMode) {
            setIsSelectionMode(savedState.isSelectionMode)
          }

          // Restore selected messages if exists
          if (savedState.selectedMessages) {
            setSelectedMessages(new Set(savedState.selectedMessages))
          }

          // Restore edit message state if exists
          if (savedState.editingMessageId) {
            setEditingMessageId(savedState.editingMessageId)
          }
          if (savedState.editText) {
            setEditText(savedState.editText)
            setInputText(savedState.editText)
          }

          // Track content change after state restoration
          trackContentChange({
            event: 'session_state_restored',
            restoredState: savedState,
            timestamp: Date.now(),
          })

          // Mark that session restoration has happened
          setHasSessionRestoration(true)
        }
      }
      setIsSessionLoaded(true)
    } else {
      // When no session exists, just set isSessionLoaded to true
      setIsSessionLoaded(true)
    }
  }, [sessionTimeStamp, sessionStore])

  const handleAvatarError = () => {
    console.log('Group avatar image failed to load for:', group?.name)
    setAvatarLoadFailed(true)
  }

  // Group messages by date
  const groupMessagesByDate = useCallback((messages: GroupMessage[]) => {
    const groups: { [key: string]: GroupMessage[] } = {}

    messages.forEach(message => {
      // Group messages use Unix timestamps (seconds), so multiply by 1000
      const timestamp = message.timestamp * 1000
      const date = new Date(timestamp)
      const dateKey = date.toDateString()

      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(message)
    })

    // Convert to array and sort by date
    const sortedGroups = Object.entries(groups)
      .map(([dateKey, messages]) => ({
        date: formatDateLabel(new Date(dateKey)),
        messages: messages.sort((a, b) => a.timestamp - b.timestamp),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return sortedGroups
  }, [])

  // Format date label
  const formatDateLabel = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year:
          date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      })
    }
  }

  // Update grouped messages when messages change
  useEffect(() => {
    const grouped = groupMessagesByDate(groupMessages)
    setGroupedMessages(grouped)
  }, [groupMessages, groupMessagesByDate])

  // Load group and messages (but respect session restoration)
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        // Check if database is ready
        if (!isDatabaseReady()) {
          console.error('Database not ready')
          Alert.alert('Error', 'Database not ready. Please try again.')
          return
        }

        // Check if we have a current user
        if (!userStore.currentUser?.id) {
          console.error('No current user found')
          Alert.alert('Error', 'Please log in to view chats')
          return
        }

        // Load chat settings (including wallpaper)
        await userStore.loadChatSettings()

        // Load group data
        const groupData = await queries.getGroupById(groupId!)

        if (groupData) {
          setGroup(groupData as Group)

          // Load group members
          const membersData = await queries.getGroupMembers(groupId!)

          // Get member details
          const membersWithDetails: GroupMember[] = []
          for (const member of membersData) {
            const user = await queries.getUserById(member.userId)
            if (user) {
              membersWithDetails.push({
                userId: user.id,
                name: user.name || 'Unknown User',
                avatarUrl: user.avatarUrl,
              })
            }
          }
          setGroupMembers(membersWithDetails)

          // Check if user has exited the group and get exit timestamp
          const exitTimestamp = await queries.hasUserExitedGroup(
            groupId!,
            userStore.currentUser.id,
          )
          setHasExitedGroup(!!exitTimestamp)
          setExitedAt(exitTimestamp)

          // Load group messages (filter out messages deleted by current user and messages after exit)
          const groupMessagesData = await queries.getGroupMessages(
            groupId!,
            userStore.currentUser.id,
            exitTimestamp,
          )

          // Transform the data to match our interface
          const transformedMessages: GroupMessage[] = groupMessagesData.map(
            (item: any) => ({
              ...item.message,
              sender: item.sender,
            }),
          )
          setGroupMessages(transformedMessages)

          // Mark group messages as read
          if (transformedMessages && transformedMessages.length > 0) {
            const result = await mutations.markGroupMessagesAsRead(
              groupId!,
              userStore.currentUser.id,
            )
            console.log('Mark group messages result:', result)
          }
        } else {
          Alert.alert('Error', 'Group not found')
        }
      } catch (error) {
        console.error('Error loading group chat data:', error)
        Alert.alert(
          'Error',
          'Failed to load group chat data. Please try again.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    // Only load data if session restoration hasn't happened
    if (groupId && !hasSessionRestoration) {
      console.log('Loading group chat data (no session restoration)')
      loadData()
    } else if (hasSessionRestoration) {
      console.log('Skipping group data load due to session restoration')
      // Reset the flag for next time
      setHasSessionRestoration(false)
    }
  }, [groupId, userStore.currentUser?.id, hasSessionRestoration])

  // Get wallpaper image based on userStore setting
  const getWallpaperImage = () => {
    const wallpaper = userStore.currentWallpaper
    switch (wallpaper) {
      case 'default':
        return null
      case 'gradient':
        return require('../../../../../assets/images/wallpapers/gradient.png')
      case 'space':
        return require('../../../../../assets/images/wallpapers/space.png')
      case null:
      case undefined:
      default:
        return null
    }
  }

  const isValidBase64 = (str: string) => {
    try {
      if (!str) return false
      if (str.startsWith('data:image')) {
        // Full data URL - extract base64 part
        const base64Part = str.split(',')[1]
        if (!base64Part) return false
        // Try to decode to check if valid
        atob(base64Part)
        return true
      } else if (str.includes('base64')) {
        // Plain base64 string - try to decode
        atob(str)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // Check if message can be edited (within 5 minutes and is text message)
  const canEditMessage = useCallback(
    (message: GroupMessage) => {
      if (message.messageType !== 'text') return false
      if (message.senderId !== userStore.currentUser?.id) return false

      const messageTime = message.timestamp * 1000 // Convert to milliseconds
      const currentTime = Date.now()
      const fiveMinutesInMs = 5 * 60 * 1000

      return currentTime - messageTime <= fiveMinutesInMs
    },
    [userStore.currentUser?.id],
  )

  // Start editing a message
  const startEditMessage = useCallback(
    (message: GroupMessage) => {
      if (!canEditMessage(message)) return

      setEditingMessageId(message.id)
      setEditText(message.content)
      setInputText(message.content)

      // Track edit mode started
      saveStateToSession({
        editingMessageId: message.id,
        editText: message.content,
        action: 'edit_group_message_started',
      })

      // Focus the input
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    },
    [canEditMessage, saveStateToSession],
  )

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingMessageId(null)
    setEditText('')
    setInputText('')

    // Track edit mode cancelled
    saveStateToSession({
      editingMessageId: null,
      editText: '',
      action: 'edit_group_message_cancelled',
    })

    inputRef.current?.blur()
  }, [saveStateToSession])

  // Save edited message
  const saveEditMessage = useCallback(async () => {
    if (!editingMessageId || !editText.trim()) return

    try {
      setIsSending(true)

      // Update message in database
      console.log(
        'Updating group message:',
        editingMessageId,
        'with content:',
        inputText.trim(),
      )
      const result = await mutations.updateGroupMessage(editingMessageId, {
        content: inputText.trim(),
      })
      console.log('Update result:', result)

      if (result.success) {
        // Update message in UI using functional update
        setGroupMessages(prevMessages => {
          const updatedMessages = prevMessages.map(msg =>
            msg.id === editingMessageId
              ? { ...msg, content: inputText.trim() }
              : msg,
          )

          // Force re-grouping of messages to update the display
          setGroupedMessages(groupMessagesByDate(updatedMessages))

          return updatedMessages
        })

        // Mark message as edited in store
        userStore.addEditedMessage(editingMessageId)

        // Clear edit state
        setEditingMessageId(null)
        setEditText('')
        setInputText('')

        // Track edit message saved
        saveStateToSession({
          editingMessageId: null,
          editText: '',
          action: 'edit_group_message_saved',
          editedMessageId: editingMessageId,
        })

        trackClick('edit_group_message')
      } else {
        Alert.alert('Error', 'Failed to edit message. Please try again.')
      }
    } catch (error) {
      console.error('Error editing message:', error)
      Alert.alert('Error', 'Failed to edit message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }, [
    editingMessageId,
    editText,
    trackClick,
    groupMessages,
    groupMessagesByDate,
  ])

  // Track screen mount with comprehensive data
  useFocusEffect(
    useCallback(() => {
      if (isSessionLoaded) {
        trackContentChange({
          event: 'screen_mounted',
          ...groupDataForTracking,
          timestamp: Date.now(),
          platform: 'react-native',
          userProfileId: userStore.currentUser?.id,
          sessionId,
        })
      }
    }, [
      isSessionLoaded,
      trackContentChange,
      groupDataForTracking,
      userStore.currentUser?.id,
      sessionId,
    ]),
  )

  // Reload group data when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      const reloadGroupData = async () => {
        if (!groupId || !userStore.currentUser?.id) return

        try {
          console.log('Reloading group data on focus for group:', groupId)

          // Reload chat settings (including wallpaper)
          await userStore.loadChatSettings()

          // Reload group data
          const groupData = await queries.getGroupById(groupId)
          if (groupData) {
            setGroup(groupData as Group)
            console.log('Group data reloaded:', groupData)

            // Reload group members
            const membersData = await queries.getGroupMembers(groupId)
            console.log('Group members reloaded:', membersData?.length || 0)

            // Get member details
            const membersWithDetails: GroupMember[] = []
            for (const member of membersData) {
              const user = await queries.getUserById(member.userId)
              if (user) {
                membersWithDetails.push({
                  userId: user.id,
                  name: user.name || 'Unknown User',
                  avatarUrl: user.avatarUrl,
                })
              }
            }
            setGroupMembers(membersWithDetails)
            console.log('Group members updated:', membersWithDetails)
          }
        } catch (error) {
          console.error('Error reloading group data:', error)
        }
      }

      reloadGroupData()
    }, [groupId, userStore.currentUser?.id]),
  )

  // Improved scroll to bottom function with multiple attempts for attachments
  const scrollToBottom = useCallback(
    (animated = true) => {
      if (!flatListRef.current) return

      // Multiple attempts with increasing delays for better reliability with attachments
      const attemptScroll = (attempt: number = 1) => {
        try {
          if (flatListRef.current) {
            // Try scrollToOffset first as it's more reliable for FlashList
            if (typeof flatListRef.current.scrollToOffset === 'function') {
              flatListRef.current.scrollToOffset({
                offset: 1000000, // Large but not infinite
                animated: attempt === 1 ? animated : false,
              })
            } else if (typeof flatListRef.current.scrollToEnd === 'function') {
              // Only use scrollToEnd if scrollToOffset is not available
              flatListRef.current.scrollToEnd({
                animated: attempt === 1 ? animated : false,
              })
            } else if (
              typeof flatListRef.current.scrollToIndex === 'function'
            ) {
              // Only use scrollToIndex if we have items and it's the last one
              const lastIndex = groupedMessages.length - 1
              if (lastIndex >= 0) {
                flatListRef.current.scrollToIndex({
                  index: lastIndex,
                  animated: attempt === 1 ? animated : false,
                  viewPosition: 1, // Ensure it's at the bottom
                })
              }
            }
          }
        } catch (error) {
          console.error(`Error scrolling to end (attempt ${attempt}):`, error)

          // Retry with different timing if this is the first or second attempt
          if (attempt < 3) {
            const nextDelay = attempt === 1 ? 300 : 500
            setTimeout(() => attemptScroll(attempt + 1), nextDelay)
          } else {
            // Final fallback: try scrollToOffset with a smaller offset
            setTimeout(() => {
              try {
                if (
                  flatListRef.current &&
                  typeof flatListRef.current.scrollToOffset === 'function'
                ) {
                  flatListRef.current.scrollToOffset({
                    offset: 500000,
                    animated: false,
                  })
                }
              } catch (finalError) {
                console.error('Final fallback scroll failed:', finalError)
              }
            }, 200)
          }
        }
      }

      // Start with initial delay to ensure rendering is complete, especially for attachments
      setTimeout(() => {
        attemptScroll(1)
      }, 250) // Increased delay for better reliability with attachments
    },
    [groupedMessages.length],
  )

  // Scroll to bottom when messages change
  useEffect(() => {
    if (groupedMessages.length > 0 && flatListRef.current) {
      scrollToBottom(true)
    }
  }, [groupedMessages.length, scrollToBottom])

  // Search handlers for ChatSearch component
  const handleSearchResults = useCallback((_results: any[]) => {
    // Handle search results - can be used for highlighting if needed
  }, [])

  const handleSearchIndexChange = useCallback((_index: number) => {
    // Handle search index change - can be used for highlighting if needed
  }, [])

  // Handle search text changes
  const handleSearchTextChange = useCallback(
    (searchText: string) => {
      setSearchText(searchText)
      // Track search text changes
      saveStateToSession({ searchText })
    },
    [saveStateToSession],
  )

  const scrollToSearchResult = useCallback(
    (messageId: string) => {
      if (!flatListRef.current) return

      // Set highlighted message
      setHighlightedMessageId(messageId)

      // Find the exact position of the message in the grouped structure
      let targetGroupIndex = -1
      let messageIndexInGroup = 0

      for (let i = 0; i < groupedMessages.length; i++) {
        const group = groupedMessages[i]
        const messageIndex = group.messages.findIndex(
          msg => msg.id === messageId,
        )

        if (messageIndex !== -1) {
          targetGroupIndex = i
          messageIndexInGroup = messageIndex
          break
        }
      }

      if (targetGroupIndex !== -1) {
        try {
          // Calculate the exact position considering grouped structure
          const dateHeaderHeight = 40 // Height of date label
          const messageHeight = 80 // Reduced average message height (smaller media)
          const groupSpacing = 20 // Spacing between groups

          // Calculate total height before the target message
          let totalHeight = 0

          // Add height for all groups before the target group
          for (let i = 0; i < targetGroupIndex; i++) {
            totalHeight +=
              dateHeaderHeight +
              groupedMessages[i].messages.length * messageHeight +
              groupSpacing
          }

          // Add height for the target group's date header
          totalHeight += dateHeaderHeight

          // Add height for messages before the target message in the same group
          totalHeight += messageIndexInGroup * messageHeight

          // Add some padding to ensure the message is visible at the top
          const topPadding = 20
          const keyboardOffset = 300 // Approximate keyboard height

          const finalOffset = Math.max(
            0,
            totalHeight - topPadding - keyboardOffset,
          )

          // Use scrollToOffset for precise positioning
          flatListRef.current.scrollToOffset({
            offset: finalOffset,
            animated: true,
          })
        } catch (error) {
          console.error('Error scrolling to search result:', error)
          // Fallback: try scrollToIndex with viewPosition: 0
          try {
            flatListRef.current.scrollToIndex({
              index: targetGroupIndex,
              animated: true,
              viewPosition: 0,
            })
          } catch (fallbackError) {
            console.error('Fallback scroll failed:', fallbackError)
            // Final fallback: simple offset calculation
            try {
              const simpleOffset = targetGroupIndex * 300
              flatListRef.current.scrollToOffset({
                offset: Math.max(0, simpleOffset),
                animated: false,
              })
            } catch (finalError) {
              console.error('Final fallback scroll failed:', finalError)
            }
          }
        }
      }

      // Clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightedMessageId(null)
      }, 3000)
    },
    [groupedMessages],
  )

  const toggleSearchMode = useCallback(() => {
    const newSearchMode = !isSearchMode
    setIsSearchMode(newSearchMode)

    // Save search mode to session
    saveStateToSession({ isSearchMode: newSearchMode })

    // Clear highlight when exiting search mode
    setHighlightedMessageId(null)
  }, [isSearchMode, saveStateToSession])

  // Handle keyboard events for auto-scrolling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        // Scroll to bottom when keyboard opens with delay to account for keyboard animation
        setTimeout(() => {
          scrollToBottom(true)
        }, 300) // Increased delay for keyboard animation
      },
    )

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // Optional: scroll to bottom when keyboard closes to ensure last message is visible
        setTimeout(() => {
          scrollToBottom(false)
        }, 100)
      },
    )

    return () => {
      keyboardDidShowListener?.remove()
      keyboardDidHideListener?.remove()
    }
  }, [scrollToBottom])

  // Animated styles
  const inputAnimatedStyle = useAnimatedStyle(() => ({
    height: inputHeight.value,
  }))

  const sendButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }],
  }))

  // Handle input text changes
  const handleInputChange = useCallback(
    (text: string) => {
      setInputText(text)

      // Track input text changes
      saveStateToSession({ inputText: text })

      // If in edit mode, also track edit text
      if (editingMessageId) {
        setEditText(text)
        saveStateToSession({ editText: text })
      }

      // Animate send button
      if (text.length > 0) {
        sendButtonScale.value = withSpring(1, { damping: 15 })
      } else {
        sendButtonScale.value = withSpring(0, { damping: 15 })
      }
    },
    [sendButtonScale, saveStateToSession, editingMessageId],
  )

  // Send group message or save edit
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !userStore.currentUser?.id) return

    // If editing, save the edit
    if (editingMessageId) {
      await saveEditMessage()
      return
    }

    try {
      setIsSending(true)

      // Send group message
      const newGroupMessage: any = {
        id: `gmsg_${Date.now()}_${Math.random()}`,
        groupId: groupId!,
        senderId: userStore.currentUser.id,
        messageType: 'text',
        content: inputText.trim(),
        timestamp: Math.floor(Date.now() / 1000),
        isReadBy: userStore.currentUser.id, // Current user has read it
        isDeliveredTo: groupMembers.map(m => m.userId).join(','), // All members have received it
      }

      // Optimistically add message to UI
      setGroupMessages(prev => [...prev, newGroupMessage])
      setInputText('')
      sendButtonScale.value = withSpring(0, { damping: 15 })

      // Update grouped messages
      setGroupedMessages(_prev => {
        const updatedMessages = [...groupMessages, newGroupMessage]
        return groupMessagesByDate(updatedMessages)
      })

      // Scroll to bottom after a short delay
      setTimeout(() => {
        scrollToBottom(true)
      }, 200)

      // Save to database
      const result = await mutations.createGroupMessage(newGroupMessage)
      if (!result.success) {
        console.error('Failed to save group message:', result.error)
        // Remove from UI if save failed
        setGroupMessages(prev =>
          prev.filter(msg => msg.id !== newGroupMessage.id),
        )
      }

      trackClick('send_group_message')
    } catch (error) {
      console.error('Error sending group message:', error)
      Alert.alert('Error', 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }, [
    inputText,
    groupId,
    userStore.currentUser?.id,
    groupMembers,
    sendButtonScale,
    trackClick,
    scrollToBottom,
    editingMessageId,
    saveEditMessage,
  ])

  // Show WhatsApp-style attachment popup
  const showAttachmentPopup = () => {
    const next = !showAttachmentPanel
    setShowAttachmentPanel(next)
    if (next) {
      attachmentPanelProgress.value = withTiming(1, { duration: 200 })
    } else {
      attachmentPanelProgress.value = withTiming(0, { duration: 200 })
    }
  }

  // Handle attachment option selection
  const handleAttachmentOption = (type: string) => {
    setShowAttachmentPanel(false)
    attachmentPanelProgress.value = withTiming(0, { duration: 200 })
    openFilePicker(type)
  }

  // Open device file picker
  const openFilePicker = async (type: string) => {
    try {
      const pickerOptions: DocumentPicker.DocumentPickerOptions = {
        type: '*/*',
        copyToCacheDirectory: true,
      }

      // Set specific file types based on category
      switch (type) {
        case 'image':
          pickerOptions.type = 'image/*'
          break
        case 'document':
          pickerOptions.type = 'application/*'
          break
        case 'audio':
          pickerOptions.type = 'audio/*'
          break
        case 'all':
        default:
          pickerOptions.type = '*/*'
          break
      }

      const result = await DocumentPicker.getDocumentAsync(pickerOptions)

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedFile = result.assets[0]

        // Create file attachment object
        const fileAttachment: FileAttachment = {
          id: `file_${Date.now()}`,
          name: selectedFile.name || 'Unknown File',
          type: getFileTypeFromName(selectedFile.name || ''),
          size: `${Math.round(((selectedFile.size || 0) / 1024 / 1024) * 100) / 100}MB`,
          preview: getFilePreview(selectedFile.name || ''),
        }

        // Send the file
        sendFile(fileAttachment)
      }
    } catch (error) {
      console.error('Error picking file:', error)
      Alert.alert('Error', 'Failed to pick file. Please try again.')
    }
  }

  // Get file type from filename
  const getFileTypeFromName = (fileName: string): string => {
    const extension = fileName
      .toLowerCase()
      .substring(fileName.lastIndexOf('.'))

    for (const [type, config] of Object.entries(getFileTypes(theme))) {
      if (config.extensions.includes(extension)) {
        return type
      }
    }

    return 'document'
  }

  // Get file preview emoji
  const getFilePreview = (fileName: string): string => {
    const extension = fileName
      .toLowerCase()
      .substring(fileName.lastIndexOf('.'))

    for (const [, config] of Object.entries(getFileTypes(theme))) {
      if (config.extensions.includes(extension)) {
        return config.preview
      }
    }

    return '📄'
  }

  // Send single file as message
  const sendFile = async (file: FileAttachment) => {
    try {
      setIsSending(true)

      const fileMessage: any = {
        id: `gmsg_${Date.now()}_${Math.random()}`,
        groupId: groupId!,
        senderId: userStore.currentUser!.id,
        messageType: 'file',
        content: `Sent ${file.name}`,
        timestamp: Math.floor(Date.now() / 1000),
        isReadBy: userStore.currentUser!.id,
        isDeliveredTo: groupMembers.map(m => m.userId).join(','),
      }

      // Add message to UI
      setGroupMessages(prev => [...prev, fileMessage])

      // Save to database
      const result = await mutations.createGroupMessage(fileMessage)
      if (!result.success) {
        console.error('Failed to save file message:', result.error)
        setGroupMessages(prev => prev.filter(msg => msg.id !== fileMessage.id))
      }

      // Generate base64 preview thumbnail
      const previewThumbnail = generateBase64Preview(file)
      const previewFilePath = getPreviewFilePath(file)

      // Create attachment record with base64 preview
      const attachmentData = {
        id: `att_${Date.now()}_${Math.random()}`,
        messageId: fileMessage.id,
        fileType: file.type,
        filePath: previewFilePath,
        preview: previewThumbnail,
      }

      await mutations.createAttachment(attachmentData)

      trackClick('send_file')

      // Scroll to bottom with longer delay for file attachments
      setTimeout(() => {
        scrollToBottom(true)
      }, 400) // Longer delay for file attachments to ensure they're rendered
    } catch (error) {
      console.error('Error sending file:', error)
      Alert.alert('Error', 'Failed to send file')
    } finally {
      setIsSending(false)
    }
  }

  // Get preview file path for file
  const getPreviewFilePath = (file: FileAttachment): string => {
    const fileType = file.type.toLowerCase()
    const fileName = file.name.toLowerCase()
    const basePreviewPath = `${Platform.select({
      android: `${RNFS.ExternalDirectoryPath}/mockdata/assets/media/previews`,
      ios: `${RNFS.DocumentDirectoryPath}/mockdata/assets/media/previews`,
      default: '/mockdata/assets/media/previews',
    })}`

    // Use actual preview files from the device storage previews folder
    switch (fileType) {
      case 'image':
        // Use image_preview.png for all image types
        return `${basePreviewPath}/image_preview.png`

      case 'video':
        // Use video_preview.mp4 for all video types
        return `${basePreviewPath}/video_preview.mp4`

      case 'audio':
        // Use audio_preview.mp3 for all audio types
        return `${basePreviewPath}/audio_preview.mp3`

      case 'document':
        // Check if it's a PDF
        if (fileName.endsWith('.pdf')) {
          return `${basePreviewPath}/pdfpreview.pdf`
        }
        // Use text_preview.txt for other documents
        return `${basePreviewPath}/text_preview.txt`

      case 'spreadsheet':
        // Use xl_preview.xlsx for spreadsheets
        return `${basePreviewPath}/xl_preview.xlsx`

      case 'presentation':
        // Use ppt_preview.pptx for presentations
        return `${basePreviewPath}/ppt_preview.pptx`

      default:
        // Default to text preview for unknown types
        return `${basePreviewPath}/text_preview.txt`
    }
  }

  // Generate base64 preview thumbnail for file
  const generateBase64Preview = (file: FileAttachment): string => {
    const fileType = file.type.toLowerCase()

    // Generate different base64 previews based on file type
    switch (fileType) {
      case 'image':
        return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxAAPwCdABmX/9k='

      case 'video':
        return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxAAPwCdABmX/9k='

      case 'audio':
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

      case 'document':
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

      default:
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    }
  }

  // Multi-select functionality
  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(messageId)) {
        newSelected.delete(messageId)
      } else {
        newSelected.add(messageId)
      }

      // Save selection state to session
      saveStateToSession({
        selectedMessages: Array.from(newSelected),
        isSelectionMode: newSelected.size > 0,
      })

      return newSelected
    })
  }

  const selectAllMessages = () => {
    const allMessageIds = groupMessages.map(msg => msg.id)
    setSelectedMessages(new Set(allMessageIds))

    // Save selection state to session
    saveStateToSession({
      selectedMessages: allMessageIds,
      isSelectionMode: true,
    })
  }

  const deleteSelectedMessages = async () => {
    if (selectedMessages.size === 0 || !userStore.currentUser?.id) return

    try {
      setIsDeleting(true)

      // Soft delete messages (mark as deleted for current user)
      const deletePromises = Array.from(selectedMessages).map(messageId =>
        mutations.deleteGroupMessage(messageId, userStore.currentUser!.id),
      )

      await Promise.all(deletePromises)

      // Reload messages to reflect soft delete (filter by exit timestamp if exited)
      const groupMessagesData = await queries.getGroupMessages(
        groupId!,
        userStore.currentUser.id,
        exitedAt,
      )
      const transformedMessages: GroupMessage[] = groupMessagesData.map(
        (item: any) => ({
          ...item.message,
          sender: item.sender,
        }),
      )
      setGroupMessages(transformedMessages)

      // Clear selection
      setSelectedMessages(new Set())
      setIsSelectionMode(false)

      trackClick('delete_messages')

      Alert.alert('Success', `${selectedMessages.size} message(s) deleted`)
    } catch (error) {
      console.error('Error deleting messages:', error)
      Alert.alert('Error', 'Failed to delete messages. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelSelection = () => {
    setIsSelectionMode(false)
    setSelectedMessages(new Set())

    // Save selection state to session
    saveStateToSession({
      isSelectionMode: false,
      selectedMessages: [],
    })
  }

  // Menu functions
  const handleMenuSelect = () => {
    setShowMenuModal(false)
    setIsSelectionMode(true)
  }

  const handleMenuSelectAll = () => {
    setShowMenuModal(false)
    setIsSelectionMode(true)
    selectAllMessages()
  }

  const handleMenuClearAll = () => {
    setShowMenuModal(false)
    setDeleteAlertType('all')
    setShowDeleteAlert(true)
  }

  const confirmDelete = async () => {
    if (!userStore.currentUser?.id) return

    try {
      setIsDeleting(true)

      if (deleteAlertType === 'all') {
        const allMessageIds = groupMessages.map(msg => msg.id)

        // Soft delete all messages (mark as deleted for current user)
        const deletePromises = allMessageIds.map(messageId =>
          mutations.deleteGroupMessage(messageId, userStore.currentUser!.id),
        )

        await Promise.all(deletePromises)

        // Reload messages to reflect soft delete (filter by exit timestamp if exited)
        const groupMessagesData = await queries.getGroupMessages(
          groupId!,
          userStore.currentUser.id,
          exitedAt,
        )
        const transformedMessages: GroupMessage[] = groupMessagesData.map(
          (item: any) => ({
            ...item.message,
            sender: item.sender,
          }),
        )
        setGroupMessages(transformedMessages)

        trackClick('clear_all_messages')
        Alert.alert('Success', 'All messages cleared')
      } else {
        // Soft delete selected messages (mark as deleted for current user)
        const deletePromises = Array.from(selectedMessages).map(messageId =>
          mutations.deleteGroupMessage(messageId, userStore.currentUser!.id),
        )

        await Promise.all(deletePromises)

        // Reload messages to reflect soft delete (filter by exit timestamp if exited)
        const groupMessagesData = await queries.getGroupMessages(
          groupId!,
          userStore.currentUser.id,
          exitedAt,
        )
        const transformedMessages: GroupMessage[] = groupMessagesData.map(
          (item: any) => ({
            ...item.message,
            sender: item.sender,
          }),
        )
        setGroupMessages(transformedMessages)

        // Clear selection
        setSelectedMessages(new Set())
        setIsSelectionMode(false)

        trackClick('delete_messages')
        Alert.alert('Success', `${selectedMessages.size} message(s) deleted`)
      }
    } catch (error) {
      console.error('Error deleting messages:', error)
      Alert.alert('Error', 'Failed to delete messages. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteAlert(false)
    }
  }

  // Get sender name for a group message
  const getSenderName = useCallback(
    (message: GroupMessage) => {
      // First try to get from message sender info
      if (message.sender?.name) {
        return message.sender.name
      }
      // Fallback to group members
      const sender = groupMembers.find(
        member => member.userId === message.senderId,
      )
      return sender?.name || 'Unknown User'
    },
    [groupMembers],
  )

  // Parse read receipts and get user avatars
  const getReadReceipts = useCallback(
    (message: GroupMessage) => {
      if (!message.isReadBy || message.isReadBy === '') {
        return { hasReads: false, readUsers: [] }
      }

      // Parse comma-separated user IDs
      const readUserIds = message.isReadBy
        .split(',')
        .filter(id => id.trim() !== '')

      if (readUserIds.length === 0) {
        return { hasReads: false, readUsers: [] }
      }

      // Get user details for read users (excluding current user)
      const readUsers = readUserIds
        .map(userId => {
          const user = groupMembers.find(
            member => member.userId === userId.trim(),
          )
          return user
            ? {
                id: user.userId,
                name: user.name,
                avatarUrl: user.avatarUrl,
              }
            : null
        })
        .filter(user => user !== null && user.id !== userStore.currentUser?.id) // Filter out current user

      return {
        hasReads: readUsers.length > 0,
        readUsers: readUsers as {
          id: string
          name: string
          avatarUrl?: string
        }[],
      }
    },
    [groupMembers, userStore.currentUser?.id],
  )

  // Render message group (date + messages)
  const renderMessageGroup = useCallback(
    ({ item }: { item: MessageGroup }) => (
      <View style={styles.messageGroup}>
        <View style={styles.dateLabel}>
          <Text text={item.date} size="small" style={styles.dateLabelText} />
        </View>
        {item.messages.map(message => (
          <View key={message.id}>
            <TouchableOpacity
              style={[
                styles.messageContainer,
                message.senderId === userStore.currentUser?.id &&
                  styles.ownMessage,
                selectedMessages.has(message.id) && styles.selectedMessage,
              ]}
              onPress={() => {
                if (isSelectionMode) {
                  toggleMessageSelection(message.id)
                }
              }}
              onLongPress={() => {
                if (!isSelectionMode) {
                  setIsSelectionMode(true)
                  setSelectedMessages(new Set([message.id]))
                }
              }}
              activeOpacity={0.7}
            >
              {message.senderId !== userStore.currentUser?.id && (
                <Text
                  text={getSenderName(message)}
                  size="small"
                  weight="medium"
                  style={styles.senderName}
                />
              )}
              <View
                style={[
                  styles.messageBubble,
                  message.senderId === userStore.currentUser?.id
                    ? styles.ownBubble
                    : styles.otherBubble,
                  selectedMessages.has(message.id) && styles.selectedBubble,
                  isSelectionMode && styles.selectionModeBubble,
                ]}
              >
                {isSelectionMode && (
                  <View style={styles.selectionIndicator}>
                    <Ionicons
                      name={
                        selectedMessages.has(message.id)
                          ? 'checkmark-circle'
                          : 'ellipse-outline'
                      }
                      size={20}
                      color={
                        selectedMessages.has(message.id)
                          ? theme.colors.palette.primary500
                          : theme.colors.palette.neutral400
                      }
                    />
                  </View>
                )}

                {/* Check if it's a non-text message (file, audio, video, image, etc.) */}
                {message.messageType !== 'text' ? (
                  <FileMessageBubble
                    message={message}
                    isOwnMessage={
                      message.senderId === userStore.currentUser?.id
                    }
                    getReadReceipts={getReadReceipts}
                    failedReadAvatars={failedReadAvatars}
                    setFailedReadAvatars={setFailedReadAvatars}
                    isValidBase64={isValidBase64}
                  />
                ) : (
                  <>
                    <Text
                      text={message.content}
                      size={getFontSizeForText(userStore.currentFontSize)}
                      style={
                        [
                          styles.messageText,
                          message.senderId === userStore.currentUser?.id
                            ? styles.ownMessageText
                            : styles.otherMessageText,
                          highlightedMessageId === message.id &&
                            styles.highlightedText,
                        ] as any
                      }
                    />
                    <View style={styles.messageFooter}>
                      <Text
                        text={new Date(
                          message.timestamp * 1000,
                        ).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        size="tiny"
                        style={styles.messageTime}
                      />
                      {message.senderId === userStore.currentUser?.id && (
                        <View style={styles.messageStatus}>
                          {(() => {
                            const { hasReads, readUsers } =
                              getReadReceipts(message)

                            if (!hasReads) {
                              // Single tick - message sent
                              return (
                                <Ionicons
                                  name="checkmark"
                                  size={12}
                                  color={theme.colors.palette.neutral400}
                                />
                              )
                            } else {
                              // Double tick - message read
                              return (
                                <View style={styles.readReceiptContainer}>
                                  <Ionicons
                                    name="checkmark-done"
                                    size={12}
                                    color={theme.colors.palette.success300}
                                  />
                                  {readUsers.length > 0 && (
                                    <View style={styles.readAvatarsContainer}>
                                      {readUsers
                                        .slice(0, 3)
                                        .map((user, index) => (
                                          <View
                                            key={user.id}
                                            style={[
                                              styles.readAvatar,
                                              {
                                                zIndex:
                                                  readUsers.length - index,
                                              },
                                            ]}
                                          >
                                            {user.avatarUrl &&
                                            isValidBase64(user.avatarUrl) &&
                                            !failedReadAvatars.has(user.id) ? (
                                              <Image
                                                source={{ uri: user.avatarUrl }}
                                                style={styles.readAvatarImage}
                                                onError={() => {
                                                  console.log(
                                                    'Read avatar failed to load for:',
                                                    user.name,
                                                  )
                                                  setFailedReadAvatars(
                                                    prev =>
                                                      new Set([
                                                        ...prev,
                                                        user.id,
                                                      ]),
                                                  )
                                                }}
                                                onLoad={() => {
                                                  console.log(
                                                    'Read avatar loaded successfully for:',
                                                    user.name,
                                                  )
                                                  setFailedReadAvatars(prev => {
                                                    const newSet = new Set(prev)
                                                    newSet.delete(user.id)
                                                    return newSet
                                                  })
                                                }}
                                              />
                                            ) : (
                                              <View
                                                style={
                                                  styles.readAvatarPlaceholder
                                                }
                                              >
                                                <Text
                                                  text={user.name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                                  size="tiny"
                                                  style={styles.readAvatarText}
                                                />
                                              </View>
                                            )}
                                          </View>
                                        ))}
                                      {readUsers.length > 3 && (
                                        <View style={styles.readAvatarMore}>
                                          <Text
                                            text={`+${readUsers.length - 3}`}
                                            size="tiny"
                                            style={styles.readAvatarMoreText}
                                          />
                                        </View>
                                      )}
                                    </View>
                                  )}
                                </View>
                              )
                            }
                          })()}
                        </View>
                      )}
                      {/* Edit icon for own text messages within 5 minutes */}
                      {canEditMessage(message) && (
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => startEditMessage(message)}
                        >
                          <Ionicons
                            name="create-outline"
                            size={14}
                            color={theme.colors.palette.neutral500}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                    {/* Show "edited" indicator for edited messages */}
                    {userStore.isMessageEdited(message.id) && (
                      <Text
                        text="Edited"
                        size="tiny"
                        style={styles.editedIndicator}
                      />
                    )}
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    ),
    [
      userStore.currentUser?.id,
      isSelectionMode,
      selectedMessages,
      toggleMessageSelection,
      getSenderName,
      getReadReceipts,
      failedReadAvatars,
      setFailedReadAvatars,
      isValidBase64,
      highlightedMessageId,
    ],
  )

  // Header component
  const renderHeader = useCallback(
    () => (
      <View style={styles.header}>
        {isSelectionMode ? (
          // Selection mode header
          <>
            <TouchableOpacity
              style={styles.backButton}
              onPress={cancelSelection}
            >
              <Ionicons
                name="close"
                size={24}
                color={theme.colors.palette.neutral800}
              />
            </TouchableOpacity>

            <View style={styles.selectionInfo}>
              <Text
                text={`${selectedMessages.size} selected`}
                size="medium"
                weight="bold"
                style={styles.selectionCount}
              />
            </View>

            <View style={styles.headerActions}>
              {selectedMessages.size > 0 && (
                <>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={selectAllMessages}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={theme.colors.palette.primary500}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={deleteSelectedMessages}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.palette.angry500}
                      />
                    ) : (
                      <Ionicons
                        name="trash"
                        size={20}
                        color={theme.colors.palette.angry500}
                      />
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        ) : (
          // Normal header
          <>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.colors.palette.neutral800}
              />
            </TouchableOpacity>

            <View style={styles.contactInfo}>
              <View style={styles.avatarContainer}>
                {/* Group avatar */}
                {group?.avatarUrl &&
                isValidBase64(group.avatarUrl) &&
                !avatarLoadFailed ? (
                  <Image
                    source={{
                      uri: group.avatarUrl.startsWith('data:image')
                        ? group.avatarUrl
                        : `data:image/png;base64,${group.avatarUrl}`,
                    }}
                    style={styles.avatar}
                    onError={handleAvatarError}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text
                      text={
                        group?.name
                          ? group.name
                              .split(' ')
                              .map((word: string) =>
                                word.charAt(0).toUpperCase(),
                              )
                              .join('')
                              .slice(0, 2)
                          : 'G'
                      }
                      size="large"
                      weight="bold"
                      style={styles.avatarText}
                    />
                  </View>
                )}
              </View>

              <View style={styles.contactDetails}>
                <Text
                  text={group?.name || 'Unknown Group'}
                  size="large"
                  weight="bold"
                  style={styles.contactName}
                />
                <Text
                  text={`${groupMembers.length} members`}
                  size="small"
                  style={styles.contactStatus}
                />
              </View>
            </View>

            <View style={styles.headerActions}>
              {/* Group actions - Hide info button if user has exited the group */}
              {!hasExitedGroup && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    trackClick('group_info')
                    router.push(
                      `/screens/groups/create-group?groupId=${groupId}`,
                    )
                  }}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={theme.colors.palette.neutral800}
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                ref={menuButtonRef}
                style={styles.actionButton}
                onPress={() => {
                  trackClick('group_more_options')
                  if (menuButtonRef.current) {
                    menuButtonRef.current.measure(
                      (
                        _x: number,
                        _y: number,
                        _width: number,
                        _height: number,
                        pageX: number,
                        pageY: number,
                      ) => {
                        setMenuPosition({ x: pageX, y: pageY + _height })
                        setShowMenuModal(true)
                      },
                    )
                  }
                }}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={20}
                  color={theme.colors.palette.neutral800}
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    ),
    [
      group,
      groupMembers.length,
      router,
      trackClick,
      isSelectionMode,
      selectedMessages,
      isDeleting,
      cancelSelection,
      selectAllMessages,
      deleteSelectedMessages,
      toggleMessageSelection,
      avatarLoadFailed,
      handleAvatarError,
    ],
  )

  // Input component
  const renderInput = useCallback(
    () => (
      <View style={styles.inputContainer}>
        {/* Edit mode indicator */}
        {editingMessageId && (
          <View style={styles.editModeContainer}>
            <View style={styles.editModeContent}>
              <Ionicons
                name="create-outline"
                size={16}
                color={theme.colors.palette.primary500}
              />
              <Text
                text="Editing message"
                size="small"
                style={styles.editModeText}
              />
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={cancelEdit}
              >
                <Ionicons
                  name="close"
                  size={16}
                  color={theme.colors.palette.neutral600}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Animated.View style={[styles.inputWrapper, inputAnimatedStyle]}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => {
              trackClick('attach_file')
              showAttachmentPopup()
            }}
          >
            <View style={styles.attachButtonInner}>
              <Ionicons
                name="add"
                size={20}
                color={theme.colors.palette.primary500}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.textInputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={inputText}
              onChangeText={handleInputChange}
              placeholder={
                editingMessageId ? 'Edit message...' : 'Type a message...'
              }
              placeholderTextColor={theme.colors.palette.neutral400}
              multiline
              maxLength={1000}
              onFocus={() => {
                inputHeight.value = withSpring(80, { damping: 15 })
                // Scroll to bottom when input is focused
                setTimeout(() => {
                  scrollToBottom(true)
                }, 100)
              }}
              onBlur={() => {
                inputHeight.value = withSpring(50, { damping: 15 })
              }}
            />
          </View>

          <Animated.View style={[styles.sendButton, sendButtonAnimatedStyle]}>
            <TouchableOpacity
              style={styles.sendButtonInner}
              onPress={sendMessage}
              disabled={isSending || !inputText.trim()}
            >
              {isSending ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.palette.neutral100}
                />
              ) : (
                <Ionicons
                  name={editingMessageId ? 'checkmark' : 'send'}
                  size={20}
                  color={theme.colors.palette.neutral100}
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    ),
    [
      inputText,
      handleInputChange,
      sendMessage,
      isSending,
      inputHeight,
      sendButtonScale,
      trackClick,
      editingMessageId,
      cancelEdit,
    ],
  )

  if (isLoading) {
    return (
      <Screen preset="fixed" backgroundColor={theme.colors.palette.neutral100}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.primary500}
          />
          <Text
            text="Loading group chat..."
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
      safeAreaEdges={['top', 'bottom']}
      backgroundColor={theme.colors.palette.neutral100}
    >
      {/* Wallpaper Background */}
      {getWallpaperImage() && (
        <Image
          source={getWallpaperImage()}
          style={styles.wallpaperBackground}
          resizeMode="cover"
        />
      )}

      {isSearchMode ? (
        <ChatSearch
          messages={groupMessages}
          onSearchResults={handleSearchResults}
          onSearchIndexChange={handleSearchIndexChange}
          onSearchTextChange={handleSearchTextChange}
          onScrollToResult={scrollToSearchResult}
          isVisible={isSearchMode}
          onClose={toggleSearchMode}
          initialSearchText={searchText}
        />
      ) : (
        renderHeader()
      )}

      <FlashList<MessageGroup>
        ref={flatListRef}
        data={groupedMessages}
        renderItem={renderMessageGroup}
        keyExtractor={item => item.date}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        estimatedItemSize={120}
        extraData={[
          isSelectionMode,
          selectedMessages,
          failedReadAvatars,
          highlightedMessageId,
        ]}
        onEndReachedThreshold={0.1}
      />

      {!hasExitedGroup && renderInput()}

      {/* Floating attachment menu */}
      <AttachmentMenu
        visible={showAttachmentPanel}
        onClose={() => setShowAttachmentPanel(false)}
        onOptionSelect={handleAttachmentOption}
        variant="floating"
      />

      {/* Menu Popup */}
      {showMenuModal && (
        <TouchableOpacity
          style={styles.popupOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View
            style={[
              styles.popupMenu,
              {
                position: 'absolute',
                top: menuPosition.y,
                right: 20,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.popupOption}
              onPress={() => {
                setShowMenuModal(false)
                toggleSearchMode()
              }}
            >
              <Ionicons
                name="search-outline"
                size={20}
                color={theme.colors.palette.neutral800}
              />
              <Text
                text="Search"
                size="medium"
                style={styles.popupOptionText}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.popupOption}
              onPress={handleMenuSelect}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color={theme.colors.palette.neutral800}
              />
              <Text
                text="Select Messages"
                size="medium"
                style={styles.popupOptionText}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.popupOption}
              onPress={handleMenuSelectAll}
            >
              <Ionicons
                name="checkmark-done-circle"
                size={20}
                color={theme.colors.palette.neutral800}
              />
              <Text
                text="Select All"
                size="medium"
                style={styles.popupOptionText}
              />
            </TouchableOpacity>

            {!hasExitedGroup && (
              <TouchableOpacity
                style={styles.popupOption}
                onPress={handleMenuClearAll}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={theme.colors.palette.angry500}
                />
                <Text
                  text="Clear All"
                  size="medium"
                  style={
                    [
                      styles.popupOptionText,
                      { color: theme.colors.palette.angry500 },
                    ] as any
                  }
                />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* Delete Confirmation Alert */}
      {showDeleteAlert && (
        <TouchableOpacity
          style={styles.popupOverlay}
          activeOpacity={1}
          onPress={() => setShowDeleteAlert(false)}
        >
          <View style={styles.deleteAlertContainer}>
            <View style={styles.deleteAlertContent}>
              <View style={styles.deleteAlertHeader}>
                <Ionicons
                  name="warning"
                  size={24}
                  color={theme.colors.palette.angry500}
                />
                <Text
                  text="Delete Messages"
                  size="large"
                  weight="bold"
                  style={styles.deleteAlertTitle}
                />
              </View>

              <Text
                text={`Are you sure you want to delete ${
                  deleteAlertType === 'all'
                    ? 'all'
                    : `${selectedMessages.size} selected`
                } messages?`}
                size="medium"
                style={styles.deleteAlertMessage}
              />

              <View style={styles.deleteAlertActions}>
                <TouchableOpacity
                  style={styles.deleteAlertButton}
                  onPress={() => setShowDeleteAlert(false)}
                >
                  <Text
                    text="Cancel"
                    size="medium"
                    style={styles.deleteAlertButtonText}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.deleteAlertButton,
                    styles.deleteAlertButtonDanger,
                  ]}
                  onPress={confirmDelete}
                >
                  <Text
                    text="Delete"
                    size="medium"
                    style={
                      [
                        styles.deleteAlertButtonText,
                        styles.deleteAlertButtonTextDanger,
                      ] as any
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </Screen>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: metrics.medium,
      color: theme.colors.palette.neutral600,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: metrics.medium,
      paddingVertical: metrics.small,
      backgroundColor: theme.colors.palette.neutral100,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    backButton: {
      padding: metrics.small,
      marginRight: metrics.small,
    },
    contactInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarContainer: {
      position: 'relative',
      marginRight: metrics.medium,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    avatarPlaceholder: {
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contactDetails: {
      flex: 1,
    },
    contactName: {
      color: theme.colors.palette.neutral800,
    },
    contactStatus: {
      color: theme.colors.palette.neutral600,
    },
    headerActions: {
      flexDirection: 'row',
      gap: metrics.small,
    },
    actionButton: {
      padding: metrics.small,
    },
    messagesList: {
      flex: 1,
    },
    messagesContent: {
      paddingHorizontal: metrics.medium,
      paddingVertical: metrics.small,
    },
    messageContainer: {
      marginVertical: metrics.tiny,
    },
    ownMessage: {
      alignItems: 'flex-end',
    },
    messageBubble: {
      maxWidth: '85%',
      paddingHorizontal: metrics.medium,
      paddingVertical: metrics.small,
      borderRadius: metrics.borderRadiusLarge,
    },
    ownBubble: {
      backgroundColor: theme.colors.palette.primary500,
      borderBottomRightRadius: metrics.tiny,
    },
    otherBubble: {
      backgroundColor: theme.colors.palette.neutral200,
      borderBottomLeftRadius: metrics.tiny,
    },
    messageText: {
      lineHeight: 20,
    },
    ownMessageText: {
      color: theme.colors.palette.neutral100,
    },
    otherMessageText: {
      color: theme.colors.palette.neutral800,
    },
    messageFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: metrics.tiny,
      gap: metrics.tiny,
    },
    messageTime: {
      color: theme.colors.palette.neutral400,
    },
    messageStatus: {
      marginLeft: metrics.tiny,
    },
    senderName: {
      marginBottom: metrics.tiny,
      color: theme.colors.palette.neutral600,
    },
    inputContainer: {
      paddingHorizontal: metrics.medium,
      paddingVertical: metrics.small,
      backgroundColor: theme.colors.palette.neutral100,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral200,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
      paddingHorizontal: metrics.small,
    },
    textInputContainer: {
      flex: 1,
      justifyContent: 'center',
      minHeight: 36,
    },
    textInputDisabled: {
      backgroundColor: theme.colors.palette.neutral200,
      opacity: 0.6,
    },
    textInput: {
      fontSize: 16,
      color: theme.colors.palette.neutral800,
      maxHeight: 100,
      paddingVertical: 0,
      lineHeight: 20,
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    sendButton: {
      marginLeft: metrics.small,
    },
    sendButtonInner: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.palette.primary500,
      justifyContent: 'center',
      alignItems: 'center',
    },
    messageGroup: {
      marginVertical: metrics.tiny,
    },
    dateLabel: {
      alignSelf: 'center',
      marginBottom: metrics.tiny,
      paddingHorizontal: metrics.small,
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: metrics.borderRadiusSmall,
    },
    dateLabelText: {
      color: theme.colors.palette.neutral600,
    },
    fileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: metrics.tiny,
    },
    fileIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      marginRight: metrics.medium,
      marginTop: 2,
      flexShrink: 0,
    },
    fileDetails: {
      minWidth: 0,
      justifyContent: 'center',
    },
    filePreviewImage: {
      width: '100%',
      height: '100%',
    },
    filePreviewWrapper: {
      position: 'relative',
      width: '100%',
      height: 60,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: metrics.tiny,
    },
    playButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.primary500,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fileName: {
      color: theme.colors.palette.neutral800,
      marginBottom: metrics.tiny,
      flexShrink: 1,
      lineHeight: 16,
    },
    fileType: {
      color: theme.colors.palette.neutral500,
      lineHeight: 12,
    },
    selectedMessage: {
      opacity: 0.5,
    },
    selectedBubble: {
      borderWidth: 2,
      borderColor: theme.colors.palette.primary500,
    },
    selectionModeBubble: {
      paddingLeft: metrics.large,
      marginLeft: metrics.large,
    },
    highlightedText: {
      backgroundColor: theme.colors.palette.accent300,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
    },
    selectionIndicator: {
      position: 'absolute',
      top: metrics.tiny,
      left: metrics.tiny,
      zIndex: 1,
      marginRight: metrics.small,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 2,
    },
    selectionInfo: {
      marginRight: metrics.small,
    },
    selectionCount: {
      color: theme.colors.palette.neutral800,
    },
    attachButton: {
      padding: metrics.tiny,
      marginRight: metrics.small,
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
    },
    popupOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: metrics.small,
      paddingHorizontal: metrics.medium,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    popupOptionText: {
      marginLeft: metrics.tiny,
      flex: 1,
    },
    deleteAlertButtonText: {
      color: theme.colors.palette.neutral800,
    },
    deleteAlertButtonDanger: {
      backgroundColor: theme.colors.palette.angry500,
    },
    deleteAlertButtonTextDanger: {
      color: theme.colors.palette.neutral100,
    },
    deleteAlertContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral900 + '50',
    },
    deleteAlertContent: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
      padding: metrics.large,
      width: '80%',
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    deleteAlertHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: metrics.small,
    },
    deleteAlertTitle: {
      marginLeft: metrics.tiny,
      color: theme.colors.palette.neutral800,
    },
    deleteAlertMessage: {
      textAlign: 'center',
      color: theme.colors.palette.neutral600,
      marginBottom: metrics.medium,
    },
    deleteAlertActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
    },
    deleteAlertButton: {
      paddingVertical: metrics.small,
      paddingHorizontal: metrics.large,
      borderRadius: metrics.borderRadiusMedium,
    },
    readReceiptContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: metrics.tiny,
    },
    readAvatarsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: metrics.tiny,
    },
    readAvatar: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.palette.neutral100,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: -3,
    },
    readAvatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 6,
    },
    readAvatarPlaceholder: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    readAvatarText: {
      color: theme.colors.palette.neutral800,
      fontSize: 8,
    },
    readAvatarMore: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: -3,
    },
    readAvatarMoreText: {
      color: theme.colors.palette.neutral800,
      fontSize: 8,
    },
    avatarText: {
      color: theme.colors.palette.neutral800,
    },
    wallpaperBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0, // Ensure it's behind other content
    },
    editModeContainer: {
      backgroundColor: theme.colors.palette.primary100,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.primary200,
      paddingHorizontal: metrics.medium,
      paddingVertical: metrics.small,
    },
    editModeContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    editModeText: {
      flex: 1,
      marginLeft: metrics.tiny,
      color: theme.colors.palette.primary500,
    },
    cancelEditButton: {
      padding: metrics.tiny,
    },
    editButton: {
      padding: metrics.tiny,
      marginLeft: metrics.tiny,
    },
    editedIndicator: {
      color: theme.colors.palette.neutral500,
      textAlign: 'right',
      marginTop: metrics.tiny,
      marginLeft: metrics.small,
    },
    attachButtonInner: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })
