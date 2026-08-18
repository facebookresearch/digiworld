import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAppTheme, type Theme, metrics, Text } from '@andojo/shared-theme'
import { queries } from '@/db/queries'
import FileViewer from 'react-native-file-viewer'

// File type configurations - converted to function to accept theme
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
  },
  audio: {
    icon: 'musical-notes',
    color: theme.colors.palette.accent400,
    extensions: ['.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a'],
    preview: '🎵',
  },
  document: {
    icon: 'document',
    color: theme.colors.palette.primary500,
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
    preview: '📄',
  },
  spreadsheet: {
    icon: 'grid',
    color: theme.colors.palette.success500,
    extensions: ['.xls', '.xlsx', '.csv'],
    preview: '📊',
  },
  presentation: {
    icon: 'easel',
    color: theme.colors.palette.accent400,
    extensions: ['.ppt', '.pptx'],
    preview: '📽️',
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

interface FileMessageBubbleProps {
  message: {
    id: string
    content: string
    messageType: string
    timestamp: number
    isRead?: boolean
    isDelivered?: boolean
  }
  isOwnMessage: boolean
  onPress?: () => void
  showReadReceipts?: boolean
  readUsers?: { id: string; name: string; avatarUrl?: string }[]
  // Group chat specific props
  getReadReceipts?: (message: any) => {
    hasReads: boolean
    readUsers: { id: string; name: string; avatarUrl?: string }[]
  }
  failedReadAvatars?: Set<string>
  setFailedReadAvatars?: (callback: (prev: Set<string>) => Set<string>) => void
  isValidBase64?: (str: string) => boolean
  getFileTypeConfig?: (fileName: string) => any
  getFilePreview?: (fileName: string) => string
}

export const FileMessageBubble: React.FC<FileMessageBubbleProps> = ({
  message,
  isOwnMessage,
  onPress: _onPress,
  showReadReceipts: _showReadReceipts = false,
  readUsers: _readUsers = [],
  getReadReceipts,
  failedReadAvatars,
  setFailedReadAvatars,
  isValidBase64,
  getFileTypeConfig: externalGetFileTypeConfig,
  getFilePreview: _externalGetFilePreview,
}) => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const [attachment, setAttachment] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAttachment = async () => {
      try {
        const attachments = await queries.getAttachmentsForMessage(message.id)
        if (attachments && attachments.length > 0) {
          setAttachment(attachments[0])
        }
      } catch (error) {
        console.error('Error loading attachment:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAttachment()
  }, [message.id])

  // Derive a sensible file name for display
  const derivedFileName = (() => {
    if (attachment?.filePath) {
      const parts = String(attachment.filePath).split('/')
      const last = parts[parts.length - 1]
      return last && last.trim().length > 0 ? last : 'File'
    }
    const content = String(message.content || '')
    const sentPattern = /^Sent\s+/i
    if (sentPattern.test(content)) {
      const name = content.replace(sentPattern, '').trim()
      return name.length > 0 ? name : 'File'
    }
    switch ((message.messageType || '').toLowerCase()) {
      case 'document':
        return 'Document'
      case 'image':
        return 'Image'
      case 'video':
        return 'Video'
      case 'audio':
        return 'Audio'
      default:
        return 'File'
    }
  })()

  const fileName = derivedFileName
  const fileConfig = externalGetFileTypeConfig
    ? externalGetFileTypeConfig(fileName)
    : getFileTypeConfig(fileName, theme)
  const messageTime = new Date(message.timestamp * 1000).toLocaleTimeString(
    [],
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  )

  // Handle file opening
  const handleFileOpen = async () => {
    if (!attachment?.filePath) {
      Alert.alert('Error', 'File not found')
      return
    }

    try {
      const fileExistsCheck = await require('react-native-fs').exists(
        attachment.filePath,
      )

      // For images and videos, navigate to preview screens
      if (fileConfig.type === 'image') {
        let imageUri: string

        if (fileExistsCheck) {
          // Use actual file path if it exists
          imageUri = attachment.filePath.startsWith('file://')
            ? attachment.filePath
            : `file://${attachment.filePath}`
        } else {
          // Use fallback preview path
          const imagePreviewPath = `${Platform.select({
            android: `${require('react-native-fs').ExternalDirectoryPath}/mockdata/assets/media/previews/image_preview.png`,
            ios: `${require('react-native-fs').DocumentDirectoryPath}/mockdata/assets/media/previews/image_preview.png`,
            default: '/mockdata/assets/media/previews/image_preview.png',
          })}`
          imageUri = imagePreviewPath.startsWith('file://')
            ? imagePreviewPath
            : `file://${imagePreviewPath}`
        }

        router.push({
          pathname: '/screens/media-preview/image' as any,
          params: { uri: imageUri, fileName },
        })
        return
      } else if (fileConfig.type === 'video') {
        let videoUri: string

        if (fileExistsCheck) {
          // Use actual file path if it exists
          videoUri = attachment.filePath.startsWith('file://')
            ? attachment.filePath
            : `file://${attachment.filePath}`
        } else {
          // Use fallback preview path
          const videoPreviewPath = `${Platform.select({
            android: `${require('react-native-fs').ExternalDirectoryPath}/mockdata/assets/media/previews/video_preview.mp4`,
            ios: `${require('react-native-fs').DocumentDirectoryPath}/mockdata/assets/media/previews/video_preview.mp4`,
            default: '/mockdata/assets/media/previews/video_preview.mp4',
          })}`
          videoUri = videoPreviewPath.startsWith('file://')
            ? videoPreviewPath
            : `file://${videoPreviewPath}`
        }

        router.push({
          pathname: '/screens/media-preview/video' as any,
          params: { uri: videoUri, fileName },
        })
        return
      }

      // For documents and other file types, use FileViewer for WhatsApp-like behavior
      const RNFS = require('react-native-fs')
      const filePath = attachment.filePath

      if (!filePath || filePath.trim() === '') {
        Alert.alert('Error', 'Invalid file path')
        return
      }

      const fileExistsCheck2 = await RNFS.exists(filePath)
      if (!fileExistsCheck2) {
        Alert.alert('Error', 'File not found on device')
        return
      }

      // Use FileViewer to open the file with system chooser
      try {
        await FileViewer.open(filePath, {
          showOpenWithDialog: true, // This shows the WhatsApp-like chooser
          onDismiss: () => {
            console.log('File viewer dismissed')
          },
        })
      } catch (error) {
        console.error('FileViewer error:', error)

        // Fallback: Try to download and open with system
        try {
          // Determine download directory based on platform
          let downloadDir: string
          if (Platform.OS === 'android') {
            // Use Downloads folder on Android
            downloadDir = `${RNFS.ExternalStorageDirectoryPath}/Download`
          } else {
            // Use Documents folder on iOS
            downloadDir = RNFS.DocumentDirectoryPath
          }

          // Ensure download directory exists
          const dirExists = await RNFS.exists(downloadDir)
          if (!dirExists) {
            try {
              await RNFS.mkdir(downloadDir)
            } catch (mkdirError) {
              console.error('Error creating download directory:', mkdirError)
              // Fallback to app's document directory
              downloadDir =
                Platform.OS === 'android'
                  ? RNFS.ExternalDirectoryPath
                  : RNFS.DocumentDirectoryPath
            }
          }

          // Create unique filename to avoid conflicts
          const timestamp = Date.now()
          const fileExtension = fileName.substring(fileName.lastIndexOf('.'))
          const fileNameWithoutExt = fileName.substring(
            0,
            fileName.lastIndexOf('.'),
          )
          const uniqueFileName = `${fileNameWithoutExt}_${timestamp}${fileExtension}`
          const downloadPath = `${downloadDir}/${uniqueFileName}`

          // Copy file to download location
          await RNFS.copyFile(filePath, downloadPath)

          // Verify the file was copied successfully
          const downloadExists = await RNFS.exists(downloadPath)
          if (!downloadExists) {
            throw new Error('File copy failed')
          }

          // Try FileViewer again with the downloaded file
          await FileViewer.open(downloadPath, {
            showOpenWithDialog: true,
          })
        } catch (downloadError) {
          console.error('Download and open error:', downloadError)
          Alert.alert('Error', 'Unable to open file. Please try again.')
        }
      }
    } catch (error: any) {
      console.error('Error opening file:', error)
      Alert.alert('Error', 'Unable to open file. Please try again.')
    }
  }

  // Determine if this is a media file
  const isMediaFile = fileConfig.type === 'image' || fileConfig.type === 'video'

  // Get preview file path for media files
  const getPreviewFilePath = () => {
    const basePreviewPath = `${Platform.select({
      android: `${require('react-native-fs').ExternalDirectoryPath}/mockdata/assets/media/previews`,
      ios: `${require('react-native-fs').DocumentDirectoryPath}/mockdata/assets/media/previews`,
      default: '/mockdata/assets/media/previews',
    })}`

    switch (fileConfig.type) {
      case 'image':
        return `${basePreviewPath}/image_preview.png`
      case 'video':
        return `${basePreviewPath}/video_preview.mp4`
      case 'audio':
        return `${basePreviewPath}/audio_preview.mp3`
      case 'document':
        if (fileName.toLowerCase().endsWith('.pdf')) {
          return `${basePreviewPath}/pdfpreview.pdf`
        }
        return `${basePreviewPath}/text_preview.txt`
      case 'spreadsheet':
        return `${basePreviewPath}/xl_preview.xlsx`
      case 'presentation':
        return `${basePreviewPath}/ppt_preview.pptx`
      default:
        return `${basePreviewPath}/text_preview.txt`
    }
  }

  const previewImagePath = getPreviewFilePath()
  const mediaPreviewUri = previewImagePath.startsWith('file://')
    ? previewImagePath
    : `file://${previewImagePath}`

  return (
    <View style={[styles.messageContainer, isOwnMessage && styles.ownMessage]}>
      <TouchableOpacity
        style={[
          isMediaFile ? styles.mediaMessageBubble : styles.docMessageBubble,
          !isMediaFile &&
            (isOwnMessage ? styles.ownBubble : styles.otherBubble),
        ]}
        onPress={handleFileOpen}
        activeOpacity={0.8}
      >
        {isMediaFile ? (
          // Media files (images/videos) - Large preview
          <>
            {!loading && (
              <View style={styles.mediaPreviewWrapper}>
                <Image
                  source={{ uri: mediaPreviewUri }}
                  style={styles.mediaPreviewImage}
                  resizeMode="cover"
                  onError={error => {
                    console.log('Image load error:', error)
                  }}
                />
                {fileConfig.type === 'video' && (
                  <View style={styles.videoPlayOverlay}>
                    <View style={styles.playButton}>
                      <Ionicons
                        name="play"
                        size={20}
                        color={theme.colors.palette.neutral100}
                      />
                    </View>
                  </View>
                )}
                <View style={styles.mediaOverlay}>
                  <View style={styles.mediaInfo}>
                    <Text
                      text={fileName}
                      size="small"
                      weight="medium"
                      style={styles.mediaFileName}
                      numberOfLines={1}
                    />
                    <Text
                      text={fileConfig.type.toUpperCase()}
                      size="tiny"
                      style={styles.mediaFileType}
                    />
                  </View>
                </View>
              </View>
            )}
            {loading && (
              <View style={styles.mediaLoadingContainer}>
                <ActivityIndicator
                  size="large"
                  color={theme.colors.palette.primary500}
                />
                <Text
                  text="Loading..."
                  size="small"
                  style={styles.loadingText}
                />
              </View>
            )}

            {/* Message Footer for Media Files */}
            <View style={styles.messageFooter}>
              <Text text={messageTime} size="tiny" style={styles.messageTime} />
              {isOwnMessage && (
                <View style={styles.messageStatus}>
                  {getReadReceipts ? (
                    // Group chat read receipts
                    (() => {
                      const { hasReads, readUsers } = getReadReceipts(message)

                      if (!hasReads) {
                        return (
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color={theme.colors.palette.neutral400}
                          />
                        )
                      } else {
                        return (
                          <View style={styles.readReceiptContainer}>
                            <Ionicons
                              name="checkmark-done"
                              size={12}
                              color={theme.colors.palette.success300}
                            />
                            {readUsers.length > 0 && (
                              <View style={styles.readAvatarsContainer}>
                                {readUsers.slice(0, 3).map((user, index) => (
                                  <View
                                    key={user.id}
                                    style={[
                                      styles.readAvatar,
                                      { zIndex: readUsers.length - index },
                                    ]}
                                  >
                                    {user.avatarUrl &&
                                    isValidBase64 &&
                                    isValidBase64(user.avatarUrl) &&
                                    failedReadAvatars &&
                                    !failedReadAvatars.has(user.id) ? (
                                      <Image
                                        source={{ uri: user.avatarUrl }}
                                        style={styles.readAvatarImage}
                                        onError={() => {
                                          if (setFailedReadAvatars) {
                                            setFailedReadAvatars(
                                              prev =>
                                                new Set([...prev, user.id]),
                                            )
                                          }
                                        }}
                                        onLoad={() => {
                                          if (setFailedReadAvatars) {
                                            setFailedReadAvatars(prev => {
                                              const newSet = new Set(prev)
                                              newSet.delete(user.id)
                                              return newSet
                                            })
                                          }
                                        }}
                                      />
                                    ) : (
                                      <View
                                        style={styles.readAvatarPlaceholder}
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
                    })()
                  ) : (
                    // Regular chat read receipts
                    <Ionicons
                      name={message.isRead ? 'checkmark-done' : 'checkmark'}
                      size={12}
                      color={
                        message.isRead
                          ? theme.colors.palette.success300
                          : theme.colors.palette.neutral400
                      }
                    />
                  )}
                </View>
              )}
            </View>
          </>
        ) : (
          // Document files - WhatsApp-style compact layout
          <>
            <View style={styles.documentContainer}>
              <View style={styles.documentInfo}>
                <Text
                  text={fileName}
                  size="medium"
                  weight="semibold"
                  style={
                    [
                      styles.documentFileName,
                      isOwnMessage
                        ? styles.ownMessageText
                        : styles.otherMessageText,
                    ] as any
                  }
                  numberOfLines={1}
                  ellipsizeMode="middle"
                />
                <View style={styles.documentMetaRow}>
                  <Ionicons
                    name="download-outline"
                    size={12}
                    color={
                      isOwnMessage
                        ? theme.colors.palette.neutral100
                        : theme.colors.palette.neutral600
                    }
                    style={styles.documentMetaIcon}
                  />
                  <Text
                    text={`${fileConfig.type.toUpperCase()} • Tap to download`}
                    size="tiny"
                    style={
                      [
                        styles.documentFileType,
                        isOwnMessage
                          ? styles.ownMessageText
                          : styles.otherMessageText,
                      ] as any
                    }
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  />
                </View>
              </View>

              <View style={styles.documentAction}>
                <View
                  style={[
                    styles.documentActionButton,
                    isOwnMessage
                      ? styles.documentActionButtonOwn
                      : styles.documentActionButtonOther,
                  ]}
                >
                  <Ionicons
                    name="download"
                    size={16}
                    color={
                      isOwnMessage
                        ? theme.colors.palette.neutral100
                        : theme.colors.palette.neutral800
                    }
                  />
                </View>
              </View>
            </View>

            {/* Message Footer for Documents */}
            <View style={styles.messageFooter}>
              <Text text={messageTime} size="tiny" style={styles.messageTime} />
              {isOwnMessage && (
                <View style={styles.messageStatus}>
                  <Ionicons
                    name={message.isRead ? 'checkmark-done' : 'checkmark'}
                    size={12}
                    color={
                      message.isRead
                        ? theme.colors.palette.success300
                        : theme.colors.palette.neutral400
                    }
                  />
                </View>
              )}
            </View>
          </>
        )}
      </TouchableOpacity>
    </View>
  )
}

// Helper function to get file type configuration
const getFileTypeConfig = (fileName: string, theme: Theme) => {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  const fileTypes = getFileTypes(theme)

  for (const [type, config] of Object.entries(fileTypes)) {
    if (config.extensions.includes(extension)) {
      return { type, ...config }
    }
  }

  return { type: 'document', ...fileTypes.document }
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
    docMessageBubble: {
      maxWidth: '100%',
      paddingHorizontal: metrics.small,
      paddingVertical: metrics.small,
      borderRadius: metrics.borderRadiusLarge,
    },
    mediaMessageBubble: {
      maxWidth: '100%',
      paddingHorizontal: 0,
      paddingVertical: 0,
      borderRadius: metrics.borderRadiusLarge,
      overflow: 'hidden',
      backgroundColor: 'transparent',
      alignSelf: 'flex-start',
    },
    mediaPreviewWrapper: {
      position: 'relative',
      width: 200, // Fixed width instead of 100%
      height: 150, // Fixed height instead of aspect ratio
      borderRadius: metrics.borderRadiusLarge,
      overflow: 'hidden',
      marginBottom: 0,
      backgroundColor: theme.colors.palette.angry400,
      alignSelf: 'flex-start',
    },
    mediaPreviewImage: {
      width: '100%',
      height: '100%',
      backgroundColor: 'transparent',
      borderRadius: metrics.borderRadiusLarge,
    },
    mediaOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.palette.neutral900 + '30',
      borderBottomLeftRadius: metrics.borderRadiusLarge,
      borderBottomRightRadius: metrics.borderRadiusLarge,
      padding: metrics.small,
    },
    mediaInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    mediaFileName: {
      color: theme.colors.palette.neutral100,
      flex: 1,
      marginRight: metrics.tiny,
    },
    mediaFileType: {
      color: theme.colors.palette.neutral300,
      fontSize: 10,
    },
    mediaLoadingContainer: {
      width: 200,
      height: 150,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
    },
    loadingText: {
      marginTop: metrics.small,
      color: theme.colors.palette.neutral600,
    },
    videoPlayOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral900 + '80',
      borderRadius: metrics.borderRadiusLarge,
    },
    playButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.primary500,
      justifyContent: 'center',
      alignItems: 'center',
    },
    documentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    documentInfo: {
      marginRight: metrics.small,
    },
    documentFileName: {
      marginBottom: metrics.tiny,
      lineHeight: 16,
    },
    documentMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    documentMetaIcon: {
      marginRight: metrics.tiny,
    },
    documentFileType: {
      lineHeight: 16,
    },
    documentAction: {
      marginLeft: metrics.small,
    },
    documentActionButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    documentActionButtonOwn: {
      backgroundColor: theme.colors.palette.neutral700,
    },
    documentActionButtonOther: {
      backgroundColor: theme.colors.palette.neutral300,
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
    ownMessageText: {
      color: theme.colors.palette.neutral100,
    },
    otherMessageText: {
      color: theme.colors.palette.neutral800,
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
  })

export default FileMessageBubble
