// Copyright (c) Meta Platforms, Inc. and affiliates.
import { isDatabaseReady } from '@/db'
import { mutations } from '@/db/mutations'
import { queries } from '@/db/queries'
import { useStores } from '@/models/helpers/useStores'
import { getFontSizeForText } from '@/utils/chatSettings'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useAppTheme, type Theme, metrics } from '@andojo/shared-theme'
import { Screen, Text } from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import * as DocumentPicker from 'expo-document-picker'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import FileMessageBubble from '@/components/FileMessageBubble'
import AttachmentMenu from '@/components/AttachmentMenu'
import ChatSearch from '@/components/ChatSearch'

interface Message {
  id: string
  senderId: string
  receiverId: string
  messageType: string
  content: string
  timestamp: number
  isRead: boolean
  isDelivered: boolean
  isEdited?: boolean
}

interface MessageGroup {
  key: string // stable date key YYYY-MM-DD
  date: string // human label (Today, Yesterday, MMM DD)
  messages: Message[]
}

interface User {
  id: string
  name: string
  phoneNumber: string
  avatarUrl?: string
}

interface FileAttachment {
  id: string
  name: string
  type: string
  size: string
  preview: string
}

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

export default function ChatScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { contactId, sessionId, sessionTimeStamp } = useLocalSearchParams<{
    contactId: string
    sessionId?: string
    sessionTimeStamp?: string
  }>()
  const router = useRouter()
  const { userStore, sessionStore } = useStores()
  const flatListRef = useRef<FlashList<MessageGroup>>(null)
  const inputRef = useRef<TextInput>(null)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const [hasSessionRestoration, setHasSessionRestoration] = useState(false)

  // State
  const [messages, setMessages] = useState<Message[]>([])
  const [groupedMessages, setGroupedMessages] = useState<MessageGroup[]>([])
  const [contact, setContact] = useState<User | null>(null)
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  // Legacy modal flag removed in favor of inline attachment panel
  const [showAttachmentPanel, setShowAttachmentPanel] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(
    new Set(),
  )
  const [isDeleting, setIsDeleting] = useState(false)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 100 })
  const menuButtonRef = useRef<any>(null)
  const menuPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 100 })
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [deleteAlertType, setDeleteAlertType] = useState<'selected' | 'all'>(
    'selected',
  )
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)
  // Search functionality
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null)
  // Edit message functionality
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Animation values
  const inputHeight = useSharedValue(50)
  const sendButtonScale = useSharedValue(0)
  const attachmentPanelProgress = useSharedValue(0)

  // Interaction tracking
  const { trackClick, trackContentChange } = useInteractionTracking(
    'Chat',
    `/screens/chat/${contactId}`,
  )

  // Memoize chat data for tracking
  const chatDataForTracking = useMemo(
    () => ({
      contactId,
      contactName: contact?.name,
      messageCount: messages.length,
      searchText,
      isSearchMode,
      editingMessageId,
      editText,
    }),
    [
      contactId,
      contact?.name,
      messages.length,
      searchText,
      isSearchMode,
      editingMessageId,
      editText,
    ],
  )

  // Restore state from session when sessionId is present
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
  }, [sessionTimeStamp, sessionId, sessionStore])

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

  const handleAvatarError = () => {
    setAvatarLoadFailed(true)
  }

  // Group messages by date
  const groupMessagesByDate = useCallback((allMessages: Message[]) => {
    const dateKeyToMessages: Record<string, Message[]> = {}

    for (const message of allMessages) {
      const tsMs = message.timestamp * 1000
      const d = new Date(tsMs)
      const dateKey = d.toISOString().slice(0, 10) // YYYY-MM-DD
      if (!dateKeyToMessages[dateKey]) dateKeyToMessages[dateKey] = []
      dateKeyToMessages[dateKey].push(message)
    }

    const sortedDateKeys = Object.keys(dateKeyToMessages).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    )

    return sortedDateKeys.map(key => ({
      key,
      date: formatDateLabel(new Date(key)),
      messages: dateKeyToMessages[key].sort(
        (a, b) => a.timestamp - b.timestamp,
      ),
    }))
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

  // Update grouped messages when messages change (debounced to avoid jank)
  useEffect(() => {
    const id = setTimeout(() => {
      setGroupedMessages(groupMessagesByDate(messages))
    }, 16) // ~1 frame
    return () => clearTimeout(id)
  }, [messages, groupMessagesByDate])

  // Get file type configuration
  // Toggle inline attachment panel
  const toggleAttachmentPanel = () => {
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
        case 'camera':
        case 'image':
          pickerOptions.type = 'image/*'
          break
        case 'document':
          pickerOptions.type = 'application/*'
          break
        case 'audio':
          pickerOptions.type = 'audio/*'
          break
        case 'video':
          pickerOptions.type = 'video/*'
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
        id: `msg_${Date.now()}_${Math.random()}`,
        senderId: userStore.currentUser!.id,
        receiverId: contactId!,
        messageType: 'file',
        content: `Sent ${file.name}`,
        timestamp: Math.floor(Date.now() / 1000),
        isRead: false,
        isDelivered: false,
      }

      // Add message to UI
      setMessages(prev => [...prev, fileMessage])

      // Save to database
      const result = await mutations.createMessage(fileMessage)
      if (!result.success) {
        console.error('Failed to save file message:', result.error)
        setMessages(prev => prev.filter(msg => msg.id !== fileMessage.id))
      }

      // Generate preview thumbnail
      const previewThumbnail = generateBase64Preview(file)
      const previewFilePath = getPreviewFilePath(file)

      // Create attachment record with preview file path
      const attachmentData = {
        id: `att_${Date.now()}_${Math.random()}`,
        messageId: fileMessage.id,
        fileType: file.type,
        filePath: previewFilePath,
        preview: previewThumbnail,
      }

      await mutations.createAttachment(attachmentData)

      trackClick('send_file')

      // Scroll to bottom using improved function with longer delay for file attachments
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

  // Generate base64 preview thumbnail for file
  const generateBase64Preview = (file: FileAttachment): string => {
    const fileType = file.type.toLowerCase()

    // Generate different base64 previews based on file type
    switch (fileType) {
      case 'image':
        // Create a proper 200x200 image placeholder with gradient
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJ1cmwoI2dyYWRpZW50KSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudCIgeDE9IjAiIHkxPSIwIiB4Mj0iMjAwIiB5Mj0iMjAwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmMGYwZjA7c3RvcC1vcGFjaXR5OjEiLz4KPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZGRkO2RkZDtzdG9wLW9wYWNpdHk6MSIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD4KPC9zdmc+'

      case 'video':
        // Create a proper 200x200 video placeholder
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJ1cmwoI2dyYWRpZW50KSIvPgo8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjMwIiBmaWxsPSJyZ2JhKDAsMCwwLDAuNykiLz4KPHBhdGggZD0iTTg1IDgwTDEyMCAxMDBMODUgMTIwWiIgZmlsbD0id2hpdGUiLz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQiIHgxPSIwIiB5MT0iMCIgeDI9IjIwMCIgeTI9IjIwMCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMzMzMzMzO3N0b3Atb3BhY2l0eToxIi8+CjxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzY2NjY2NjtzdG9wLW9wYWNpdHk6MSIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPg=='

      case 'audio':
        // Audio waveform placeholder
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjVmNWY1Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iNDAiIGZpbGw9IiM0Y2FmNTAiLz4KPHBhdGggZD0iTTg1IDgwTDEwMCA5MEw4NSAxMDBaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4='

      case 'document':
        // Document icon placeholder
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjVmNWY1Ii8+CjxyZWN0IHg9IjUwIiB5PSI0MCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiMyMTk2ZjMiLz4KPHBhdGggZD0iTTUwIDQwTDE1MCA0MEwxNTAgNjBINDBaIiBmaWxsPSIjMTk3NmQyIi8+Cjwvc3ZnPg=='

      case 'spreadsheet':
        // Spreadsheet icon placeholder
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjVmNWY1Ii8+CjxyZWN0IHg9IjUwIiB5PSI0MCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiMyN2FlNjAiLz4KPHBhdGggZD0iTTUwIDQwTDE1MCA0MEwxNTAgNjBINDBaIiBmaWxsPSIjMmVkNjNhIi8+Cjwvc3ZnPg=='

      case 'presentation':
        // Presentation icon placeholder
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjVmNWY1Ii8+CjxyZWN0IHg9IjUwIiB5PSI0MCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNmZjU3MjIiLz4KPHBhdGggZD0iTTUwIDQwTDE1MCA0MEwxNTAgNjBINDBaIiBmaWxsPSIjZGM0NjNmIi8+Cjwvc3ZnPg=='

      case 'archive':
        // Archive icon placeholder
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjVmNWY1Ii8+CjxyZWN0IHg9IjUwIiB5PSI0MCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiM2Yzc1N2QiLz4KPHBhdGggZD0iTTUwIDQwTDE1MCA0MEwxNTAgNjBINDBaIiBmaWxsPSIjNTQ1OTVhIi8+Cjwvc3ZnPg=='

      case 'code':
        // Code file icon placeholder
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjVmNWY1Ii8+CjxyZWN0IHg9IjUwIiB5PSI0MCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiMzNzQ3NGEiLz4KPHBhdGggZD0iTTUwIDQwTDE1MCA0MEwxNTAgNjBINDBaIiBmaWxsPSIjMjYzMjNhIi8+Cjwvc3ZnPg=='

      default:
        // Default file icon placeholder
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjVmNWY1Ii8+CjxyZWN0IHg9IjUwIiB5PSI0MCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiM5OTk5OTkiLz4KPHBhdGggZD0iTTUwIDQwTDE1MCA0MEwxNTAgNjBINDBaIiBmaWxsPSIjNzc3Nzc3Ii8+Cjwvc3ZnPg=='
    }
  }

  // Get preview file path for file
  const getPreviewFilePath = (file: FileAttachment): string => {
    const fileType = file.type.toLowerCase()
    const fileName = file.name.toLowerCase()
    const basePreviewPath = `${Platform.select({
      android: `${require('react-native-fs').ExternalDirectoryPath}/mockdata/assets/media/previews`,
      ios: `${require('react-native-fs').DocumentDirectoryPath}/mockdata/assets/media/previews`,
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
    (message: Message) => {
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
    (message: Message) => {
      if (!canEditMessage(message)) return

      setEditingMessageId(message.id)
      setEditText(message.content)
      setInputText(message.content)

      // Track edit mode started
      saveStateToSession({
        editingMessageId: message.id,
        editText: message.content,
        action: 'edit_message_started',
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
      action: 'edit_message_cancelled',
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
        'Updating message:',
        editingMessageId,
        'with content:',
        inputText.trim(),
      )
      const result = await mutations.updateMessage(editingMessageId, {
        content: inputText.trim(),
      })
      console.log('Update result:', result)

      if (result.success) {
        // Update message in UI using functional update
        setMessages(prevMessages => {
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
          action: 'edit_message_saved',
          editedMessageId: editingMessageId,
        })

        trackClick('edit_message')
      } else {
        Alert.alert('Error', 'Failed to edit message. Please try again.')
      }
    } catch (error) {
      console.error('Error editing message:', error)
      Alert.alert('Error', 'Failed to edit message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }, [editingMessageId, editText, trackClick, messages, groupMessagesByDate])

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
          const messageHeight = 100 // Reduced average message height (smaller media)
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
          const keyboardOffset = 100 // Approximate keyboard height

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

  // Toggle search mode
  const toggleSearchMode = useCallback(() => {
    const newSearchMode = !isSearchMode
    setIsSearchMode(newSearchMode)

    // Save search mode to session
    saveStateToSession({ isSearchMode: newSearchMode })

    // Clear highlight when exiting search mode
    setHighlightedMessageId(null)
  }, [isSearchMode, saveStateToSession])
  // Track screen mount with comprehensive data
  useFocusEffect(
    useCallback(() => {
      if (isSessionLoaded) {
        trackContentChange({
          event: 'screen_mounted',
          ...chatDataForTracking,
          timestamp: Date.now(),
          platform: 'react-native',
          userProfileId: userStore.currentUser?.id,
          sessionId,
        })
      }
    }, [
      isSessionLoaded,
      trackContentChange,
      chatDataForTracking,
      userStore.currentUser?.id,
      sessionId,
    ]),
  )

  // Multi-select functionality
  const toggleSelectionMode = () => {
    const newSelectionMode = !isSelectionMode
    setIsSelectionMode(newSelectionMode)
    setSelectedMessages(new Set())

    // Save selection state to session
    saveStateToSession({
      isSelectionMode: newSelectionMode,
      selectedMessages: [],
    })
  }

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
    const allMessageIds = messages.map(msg => msg.id)
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
        mutations.deleteMessage(messageId, userStore.currentUser!.id),
      )

      await Promise.all(deletePromises)

      // Reload messages to reflect soft delete (only filter messages deleted by current user)
      const messagesData = await queries.getMessagesBetweenUsers(
        userStore.currentUser.id,
        contactId!,
        userStore.currentUser.id,
      )
      setMessages(messagesData)

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
        const allMessageIds = messages.map(msg => msg.id)

        // Soft delete all messages (mark as deleted for current user)
        const deletePromises = allMessageIds.map(messageId =>
          mutations.deleteMessage(messageId, userStore.currentUser!.id),
        )

        await Promise.all(deletePromises)

        // Reload messages to reflect soft delete (only filter messages deleted by current user)
        const messagesData = await queries.getMessagesBetweenUsers(
          userStore.currentUser.id,
          contactId!,
          userStore.currentUser.id,
        )
        setMessages(messagesData)

        trackClick('clear_all_messages')
        Alert.alert('Success', 'All messages cleared')
      } else {
        // Soft delete selected messages (mark as deleted for current user)
        const deletePromises = Array.from(selectedMessages).map(messageId =>
          mutations.deleteMessage(messageId, userStore.currentUser!.id),
        )

        await Promise.all(deletePromises)

        // Reload messages to reflect soft delete (only filter messages deleted by current user)
        const messagesData = await queries.getMessagesBetweenUsers(
          userStore.currentUser.id,
          contactId!,
          userStore.currentUser.id,
        )
        setMessages(messagesData)

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

  // Load contact and messages (but respect session restoration)
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
        await userStore.loadChatSettings()

        console.log('Loading chat data for contact:', contactId)
        console.log('Current user:', userStore.currentUser.id)
        // Load contact details
        const contactData = await queries.getUserById(contactId!)

        if (contactData) {
          setContact(contactData as User)
        } else {
          console.error('Contact not found:', contactId)
          Alert.alert('Error', 'Contact not found')
          return
        }

        // Load messages between current user and contact (only filter messages deleted by current user)
        const messagesData = await queries.getMessagesBetweenUsers(
          userStore.currentUser.id,
          contactId!,
          userStore.currentUser.id,
        )
        setMessages(messagesData as Message[])

        // Mark messages as read
        if (messagesData && messagesData.length > 0) {
          console.log(
            'Marking individual messages as read for user:',
            userStore.currentUser.id,
            'from:',
            contactId,
          )
          const result = await mutations.markIndividualMessagesAsRead(
            userStore.currentUser.id,
            contactId!,
          )
          console.log('Mark individual messages result:', result)

          // Reload messages to get updated isRead status
          if (result.success) {
            const updatedMessagesData = await queries.getMessagesBetweenUsers(
              userStore.currentUser.id,
              contactId!,
              userStore.currentUser.id,
            )
            console.log(
              'Updated messages loaded:',
              updatedMessagesData?.length || 0,
            )
            setMessages(updatedMessagesData as Message[])
          }
        }
      } catch (error) {
        console.error('Error loading chat data:', error)
        Alert.alert('Error', 'Failed to load chat data. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    // Only load data if session restoration hasn't happened
    if (contactId && !hasSessionRestoration) {
      console.log('Loading chat data (no session restoration)')
      loadData()
    } else if (hasSessionRestoration) {
      console.log('Skipping data load due to session restoration')
      // Reset the flag for next time
      setHasSessionRestoration(false)
    }
  }, [contactId, userStore.currentUser?.id, hasSessionRestoration])

  // Smooth scroll to bottom when a new message arrives
  const prevCountRef = useRef(0)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const getWallpaperImage = () => {
    const wallpaper = userStore.currentWallpaper
    switch (wallpaper) {
      case 'default':
        return null
      case 'gradient':
        return require('../../../../assets/images/wallpapers/gradient.png')
      case 'space':
        return require('../../../../assets/images/wallpapers/space.png')
      case null:
      case undefined:
      default:
        return null
    }
  }

  // Improved scroll to bottom function with multiple attempts for attachments
  const scrollToBottom = useCallback(
    (animated = true) => {
      if (!flatListRef.current) return

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

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
      scrollTimeoutRef.current = setTimeout(() => {
        attemptScroll(1)
      }, 250) // Increased delay for better reliability with attachments
    },
    [groupedMessages.length],
  )

  useEffect(() => {
    const newCount = messages.length
    if (newCount > prevCountRef.current && flatListRef.current) {
      // Use the improved scroll function
      scrollToBottom(true)
    }
    prevCountRef.current = newCount
  }, [messages.length, scrollToBottom])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

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

  // Send message or save edit
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !userStore.currentUser?.id) return

    // If editing, save the edit
    if (editingMessageId) {
      await saveEditMessage()
      return
    }

    try {
      setIsSending(true)

      const newMessage: any = {
        id: `msg_${Date.now()}_${Math.random()}`,
        senderId: userStore.currentUser.id,
        receiverId: contactId!,
        messageType: 'text',
        content: inputText.trim(),
        timestamp: Math.floor(Date.now() / 1000),
        isRead: false,
        isDelivered: false,
      }

      // Optimistically add message to UI
      setMessages(prev => [...prev, newMessage])
      setInputText('')
      sendButtonScale.value = withSpring(0, { damping: 15 })

      // Grouping is handled by useEffect on messages; avoid redundant recompute

      // Smooth scroll to bottom immediately
      requestAnimationFrame(() => {
        scrollToBottom(true)
      })

      // Save to database
      const result = await mutations.createMessage(newMessage)
      if (!result.success) {
        console.error('Failed to save message:', result.error)
        // Remove from UI if save failed
        setMessages(prev => prev.filter(msg => msg.id !== newMessage.id))
      }

      trackClick('send_message')
    } catch (error) {
      console.error('Error sending message:', error)
      Alert.alert('Error', 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }, [
    inputText,
    contactId,
    userStore.currentUser?.id,
    sendButtonScale,
    trackClick,
    messages,
    groupMessagesByDate,
    scrollToBottom,
    editingMessageId,
    saveEditMessage,
  ])

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
                message.senderId === userStore.currentUser?.id
                  ? styles.ownMessage
                  : styles.otherMessage,
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

                {/* Render non-text messages with FileMessageComponent */}
                {message.messageType !== 'text' ? (
                  <FileMessageBubble
                    message={message}
                    isOwnMessage={
                      message.senderId === userStore.currentUser?.id
                    }
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
                          <Ionicons
                            name={
                              message.isRead ? 'checkmark-done' : 'checkmark'
                            }
                            size={12}
                            color={
                              message.isRead
                                ? theme.colors.palette.success300 // Green - Read
                                : theme.colors.palette.neutral400 // Gray - Sent
                            }
                          />
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
                {contact?.avatarUrl &&
                isValidBase64(contact.avatarUrl) &&
                !avatarLoadFailed ? (
                  <Image
                    source={{
                      uri: contact.avatarUrl.startsWith('data:image')
                        ? contact.avatarUrl
                        : `data:image/png;base64,${contact.avatarUrl}`,
                    }}
                    style={styles.avatar}
                    onError={handleAvatarError}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text
                      text={
                        contact?.name
                          ? contact.name
                              .split(' ')
                              .map((word: string) =>
                                word.charAt(0).toUpperCase(),
                              )
                              .join('')
                              .slice(0, 2)
                          : 'U'
                      }
                      size="large"
                      weight="bold"
                      style={styles.avatarText}
                    />
                  </View>
                )}
                <View style={styles.onlineIndicator} />
              </View>

              <View style={styles.contactDetails}>
                <Text
                  text={
                    contact?.id === userStore.currentUser?.id
                      ? `${contact?.name || 'Unknown Contact'} (you)`
                      : contact?.name || 'Unknown Contact'
                  }
                  size="large"
                  weight="bold"
                  style={styles.contactName}
                />
                <Text text="Online" size="small" style={styles.contactStatus} />
              </View>
            </View>

            <View style={styles.headerActions}>
              {/* Show call buttons only when not chatting with current user */}
              {contact?.id !== userStore.currentUser?.id && (
                <>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      if (!contact) return
                      trackClick('video_call')
                      router.push({
                        pathname: '/screens/call/call',
                        params: {
                          contactId: contact.id,
                          contactName: contact.name,
                          contactPhone: contact.phoneNumber,
                          contactAvatar: contact.avatarUrl,
                          callType: 'video',
                        },
                      })
                    }}
                    onLongPress={() => {
                      if (!contact) return
                      trackClick('simulate_incoming_video_call')
                      router.push({
                        pathname: '/screens/call/call',
                        params: {
                          contactId: contact.id,
                          contactName: contact.name,
                          contactPhone: contact.phoneNumber,
                          contactAvatar: contact.avatarUrl,
                          callType: 'video',
                          simulateIncoming: 'true',
                        },
                      })
                    }}
                  >
                    <Ionicons
                      name="videocam"
                      size={20}
                      color={theme.colors.palette.neutral800}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      if (!contact) return
                      trackClick('voice_call')
                      router.push({
                        pathname: '/screens/call/call',
                        params: {
                          contactId: contact.id,
                          contactName: contact.name,
                          contactPhone: contact.phoneNumber,
                          contactAvatar: contact.avatarUrl,
                          callType: 'voice',
                        },
                      })
                    }}
                    onLongPress={() => {
                      if (!contact) return
                      trackClick('simulate_incoming_voice_call')
                      router.push({
                        pathname: '/screens/call/call',
                        params: {
                          contactId: contact.id,
                          contactName: contact.name,
                          contactPhone: contact.phoneNumber,
                          contactAvatar: contact.avatarUrl,
                          callType: 'voice',
                          simulateIncoming: 'true',
                        },
                      })
                    }}
                  >
                    <Ionicons
                      name="call"
                      size={20}
                      color={theme.colors.palette.neutral800}
                    />
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                ref={menuButtonRef}
                style={styles.actionButton}
                onPress={() => {
                  trackClick('more_options')
                  if (menuButtonRef.current) {
                    try {
                      menuButtonRef.current.measure(
                        (
                          _x: number,
                          _y: number,
                          _width: number,
                          _height: number,
                          pageX: number,
                          pageY: number,
                        ) => {
                          try {
                            // Ensure we have valid coordinates with more robust checking
                            const x =
                              typeof pageX === 'number' &&
                              !isNaN(pageX) &&
                              isFinite(pageX)
                                ? pageX
                                : 0
                            const y =
                              typeof pageY === 'number' &&
                              !isNaN(pageY) &&
                              isFinite(pageY)
                                ? pageY + (_height || 0)
                                : 100
                            const newPosition = { x, y }
                            menuPositionRef.current = newPosition
                            setMenuPosition(newPosition)
                            setShowMenuModal(true)
                          } catch (error) {
                            console.error('Error in measure callback:', error)
                            // Fallback positioning
                            const fallbackPosition = { x: 0, y: 100 }
                            menuPositionRef.current = fallbackPosition
                            setMenuPosition(fallbackPosition)
                            setShowMenuModal(true)
                          }
                        },
                      )
                    } catch (error) {
                      console.error('Error calling measure:', error)
                      // Fallback if measure fails
                      const fallbackPosition = { x: 0, y: 100 }
                      menuPositionRef.current = fallbackPosition
                      setMenuPosition(fallbackPosition)
                      setShowMenuModal(true)
                    }
                  } else {
                    // Fallback if ref is not available
                    const fallbackPosition = { x: 0, y: 100 }
                    menuPositionRef.current = fallbackPosition
                    setMenuPosition(fallbackPosition)
                    setShowMenuModal(true)
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
      contact,
      router,
      trackClick,
      isSelectionMode,
      selectedMessages,
      isDeleting,
      toggleSelectionMode,
      cancelSelection,
      selectAllMessages,
      deleteSelectedMessages,
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
                text="Edit message"
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
              toggleAttachmentPanel()
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
              textAlignVertical="center"
              scrollEnabled={false}
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
                  size={18}
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
            text="Loading chat..."
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
          messages={messages}
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

      <FlashList
        ref={flatListRef}
        data={groupedMessages}
        renderItem={renderMessageGroup}
        keyExtractor={item => item.key}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        estimatedItemSize={120}
        maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
        extraData={[isSelectionMode, selectedMessages, highlightedMessageId]}
        onEndReachedThreshold={0.1}
      />
      {/* Floating attachment menu */}
      <AttachmentMenu
        visible={showAttachmentPanel}
        onClose={() => {
          setShowAttachmentPanel(false)
          attachmentPanelProgress.value = withTiming(0, { duration: 200 })
        }}
        onOptionSelect={handleAttachmentOption}
        variant="floating"
      />

      {renderInput()}

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
                top:
                  menuPosition && typeof menuPosition.y === 'number'
                    ? menuPosition.y
                    : (menuPositionRef.current?.y ?? 100),
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
      marginTop: metrics.small,
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
    avatarText: {
      color: theme.colors.palette.neutral800,
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.palette.success500,
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral100,
    },
    contactDetails: {
      flex: 1,
    },
    contactName: {
      color: theme.colors.palette.neutral800,
    },
    contactStatus: {
      color: theme.colors.palette.success500,
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
    otherMessage: {
      alignItems: 'flex-start',
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
    attachButton: {
      padding: metrics.tiny,
      marginRight: metrics.small,
    },
    attachButtonInner: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textInputContainer: {
      flex: 1,
      justifyContent: 'center',
      minHeight: 36,
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
    selectionInfo: {
      marginLeft: metrics.small,
    },
    selectionCount: {
      color: theme.colors.palette.neutral800,
    },
    selectedMessage: {
      opacity: 0.5,
    },
    selectedBubble: {
      borderWidth: 2,
      borderColor: theme.colors.palette.primary500,
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
    contactStatusContainer: {
      paddingHorizontal: metrics.medium,
      paddingVertical: metrics.small,
      backgroundColor: theme.colors.palette.neutral100,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    contactStatusButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: metrics.small,
      paddingHorizontal: metrics.medium,
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: metrics.borderRadiusMedium,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
    },
    contactStatusContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.tiny,
    },
    contactStatusText: {
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
    deleteAlertButtonText: {
      color: theme.colors.palette.neutral800,
    },
    deleteAlertButtonDanger: {
      backgroundColor: theme.colors.palette.angry500,
    },
    deleteAlertButtonTextDanger: {
      color: theme.colors.palette.neutral100,
    },
    messageGroup: {
      marginBottom: metrics.medium,
    },
    dateLabel: {
      alignSelf: 'center',
      paddingVertical: metrics.tiny,
      paddingHorizontal: metrics.small,
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: metrics.borderRadiusMedium,
    },
    dateLabelText: {
      color: theme.colors.palette.neutral600,
    },
    wallpaperBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
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
  })
