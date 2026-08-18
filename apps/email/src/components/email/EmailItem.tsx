// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { useToast } from '@/components/Toast'
import { mutations } from '@/db/mutations'
import { Email, MailFolder } from '@/models/EmailModel'
import { useStores } from '@/models'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { debounce } from 'lodash'
import { observer } from 'mobx-react-lite'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  LayoutAnimation,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import DropdownMenu from '../DropdownMenu'
import { MoveCategories } from '../MoveCategories'

const SWIPE_THRESHOLD = 80
const SCREEN_WIDTH = Dimensions.get('window').width

interface EmailItemProps {
  email: Email
  onDelete?: (folder: MailFolder) => void
}

const actions = [
  {
    label: 'Archive',
    value: 'archive',
  },
  {
    label: 'Delete',
    value: 'delete',
  },
  {
    label: 'Categorize',
    value: 'move',
  },
]

export const EmailItem = observer(function EmailItem({
  email,
  onDelete,
}: EmailItemProps) {
  const toast = useToast()
  const { uiStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const position = useRef(new Animated.Value(0)).current
  const [isVisible, setIsVisible] = useState(true)

  const showCategories = uiStore.emailMoveCategoriesOpen === email.id.toString()

  const handleDelete = useCallback(async () => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      // Run slide animation
      await new Promise<void>(resolve => {
        Animated.timing(position, {
          toValue: -SCREEN_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }).start(() => resolve())
      })

      await new Promise(resolve => setTimeout(resolve, 300))

      // Perform delete operation on entire thread (Gmail/Outlook behavior)
      if (email.folder === 'trash') {
        // Permanently delete entire thread
        await mutations.deleteEmailThread(email.thread_id)
        onDelete?.('trash')
        toast.show({
          title: 'Thread permanently deleted',
          preset: 'error',
          placement: 'top',
        })
      } else {
        // Move entire thread to trash
        await mutations.moveEmailThreadToFolder(email.thread_id, 'trash')
        onDelete?.(email.folder)
        toast.show({
          title: 'Thread moved to trash',
          preset: 'info',
          placement: 'top',
        })
      }

      setIsVisible(false)
    } catch (error) {
      console.error('Failed to delete email:', error)
      toast.show({
        title: 'Failed to delete email',
        preset: 'error',
        placement: 'top',
      })

      // Reset position on error
      setIsVisible(true)
      Animated.spring(position, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 10,
      }).start()
    }
  }, [email.thread_id, email.folder, onDelete, position, toast])

  const handleArchive = useCallback(async () => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)

      // Run slide animation
      await new Promise<void>(resolve => {
        Animated.timing(position, {
          toValue: SCREEN_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }).start(() => resolve())
      })

      await new Promise(resolve => setTimeout(resolve, 300))

      // Move entire thread (Gmail/Outlook behavior)
      // If already in archived folder, move to inbox
      const targetFolder =
        email.folder === 'archived'
          ? email.status === 'received'
            ? 'inbox'
            : email.status
          : 'archived'
      await mutations.moveEmailThreadToFolder(email.thread_id, targetFolder)
      onDelete?.(email.folder)

      toast.show({
        title:
          email.folder === 'archived'
            ? 'Thread unarchived and moved to ' + targetFolder
            : 'Thread archived',
        preset: 'info',
        placement: 'top',
      })

      setIsVisible(false)
    } catch (error) {
      console.error('Failed to archive/unarchive email:', error)
      toast.show({
        title: 'Failed to archive/unarchive email',
        preset: 'error',
        placement: 'top',
      })

      // Reset position on error
      setIsVisible(true)
      Animated.spring(position, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 10,
      }).start()
    }
  }, [email.thread_id, email.folder, email.status, onDelete, position, toast])

  // Format date/time: show time if within past 24 hours, else show date
  const formattedDate = (() => {
    const emailDate = new Date(email.timestamp)
    const now = new Date()
    const diffMs = now.getTime() - emailDate.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    const hours = String(emailDate.getHours()).padStart(2, '0')
    const minutes = String(emailDate.getMinutes()).padStart(2, '0')
    const month = String(emailDate.getMonth() + 1).padStart(2, '0')
    const day = String(emailDate.getDate()).padStart(2, '0')
    const year = String(emailDate.getFullYear()).slice(-2)

    if (diffHours >= 0 && diffHours < 24) {
      // Within past 24 hours: show time only (24-hour format)
      return `${hours}:${minutes}`
    } else {
      // Older than 24 hours or future date: show date and time
      return `${month}/${day}/${year} ${hours}:${minutes}`
    }
  })()

  // Extract domain from email
  const senderName = email.sender.split('@')[0].replace(/[.]/g, ' ')
  const senderInitials = senderName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()

  const debouncedNavigate = useRef(
    debounce((folder: string, threadId: string, emailId: string) => {
      if (folder === 'draft') {
        // For drafts, use actual email ID (not thread_id)
        router.push({
          pathname: '/screens/compose/mailcompose',
          params: { draftId: emailId },
        } as any)
      } else {
        // For regular emails, navigate to thread view
        router.push(`/screens/mail/${threadId}`)
      }
    }, 300),
  ).current

  const handleEmailPress = useCallback(() => {
    debouncedNavigate(email.folder, email.thread_id, email.id)
  }, [email.folder, email.thread_id, email.id, debouncedNavigate])

  const [isSwipeEnabled, setIsSwipeEnabled] = useState(true)
  const isSwiping = useRef(false)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond if swipe is enabled and movement exceeds threshold
        // This prevents accidental swipes during taps
        const hasMovedEnough =
          Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10
        const isHorizontalSwipe =
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2

        if (hasMovedEnough && isHorizontalSwipe && isSwipeEnabled) {
          isSwiping.current = true
          return true
        }
        return false
      },
      onPanResponderGrant: () => {
        isSwiping.current = true
      },
      onPanResponderMove: (_, gestureState) => {
        // Only update position if we're definitely swiping
        if (isSwiping.current) {
          position.setValue(gestureState.dx)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!isSwiping.current) {
          return
        }

        if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Left swipe (delete)
          Animated.timing(position, {
            toValue: -SCREEN_WIDTH,
            duration: 250,
            useNativeDriver: true,
          }).start(() => handleDelete())
        } else if (gestureState.dx > SWIPE_THRESHOLD) {
          // Right swipe (archive)
          Animated.timing(position, {
            toValue: SCREEN_WIDTH,
            duration: 250,
            useNativeDriver: true,
          }).start(() => handleArchive())
        } else {
          // Reset position
          Animated.spring(position, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 10,
          }).start()
        }

        // Reset swipe state
        setTimeout(() => {
          isSwiping.current = false
        }, 100)
      },
      onPanResponderTerminate: () => {
        // Reset position if gesture is interrupted
        isSwiping.current = false
        Animated.spring(position, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 10,
        }).start()
      },
    }),
  ).current

  const deleteActionOpacity = position.interpolate({
    inputRange: [-SCREEN_WIDTH, -SWIPE_THRESHOLD, 0],
    outputRange: [1, 0.5, 0],
  })

  const cardScale = position.interpolate({
    inputRange: [-SCREEN_WIDTH, 0],
    outputRange: [0.8, 1],
  })

  const archiveActionOpacity = position.interpolate({
    inputRange: [0, SWIPE_THRESHOLD, SCREEN_WIDTH],
    outputRange: [0, 0.5, 1],
  })

  const handleActionsPress = (action: string) => {
    switch (action) {
      case 'archive':
        handleArchive()
        break
      case 'delete':
        handleDelete()
        break
      case 'move':
        uiStore.setEmailMoveCategoriesOpen(email.id.toString())
        break
    }
  }

  // const handleStarToggle = useCallback(async () => {
  //   try {
  //     const currentLabels = email.labels || []
  //     const isStarred = currentLabels.includes('starred')
  //     const newLabels = isStarred
  //       ? currentLabels.filter(label => label !== 'starred')
  //       : [...currentLabels, 'starred']

  //     await mutations.updateEmailLabels(
  //       parseInt(email.id),
  //       JSON.stringify(newLabels),
  //     )
  //     onDelete?.(email.folder)
  //   } catch (error) {
  //     console.error('Failed to toggle star:', error)
  //     toast.show({
  //       title: 'Failed to update star',
  //       preset: 'error',
  //       placement: 'top',
  //     })
  //   }
  // }, [email.id, email.labels, email.folder, onDelete, toast])

  const handleFlagToggle = useCallback(async () => {
    try {
      const currentLabels = email.labels || []
      const isFlagged = currentLabels.includes('flagged')
      const newLabels = isFlagged
        ? currentLabels.filter(label => label !== 'flagged')
        : [...currentLabels, 'flagged']

      await mutations.updateEmailLabels(
        parseInt(email.id),
        JSON.stringify(newLabels),
      )
      onDelete?.(email.folder)
    } catch (error) {
      console.error('Failed to toggle flag:', error)
      toast.show({
        title: 'Failed to update flag',
        preset: 'error',
        placement: 'top',
      })
    }
  }, [email.id, email.labels, email.folder, onDelete, toast])

  // const isStarred = email.labels?.includes('starred') || false
  const isFlagged = email.labels?.includes('flagged') || false

  if (!isVisible) return null

  return (
    <View style={styles.emailItemContainer}>
      {/* Archive Action */}
      <Animated.View
        style={[
          styles.actionContainer,
          styles.archiveAction,
          { opacity: archiveActionOpacity },
        ]}
      >
        <Ionicons
          name={
            email.folder === 'archived'
              ? 'arrow-undo-outline'
              : 'archive-outline'
          }
          size={24}
          color={theme.colors.palette.neutral100}
        />
        <Text
          text={email.folder === 'archived' ? 'Unarchive' : 'Archive'}
          style={styles.actionText}
        />
      </Animated.View>

      {/* Delete Action */}
      <Animated.View
        style={[
          styles.actionContainer,
          styles.deleteAction,
          { opacity: deleteActionOpacity },
        ]}
      >
        <Ionicons
          name="trash-outline"
          size={24}
          color={theme.colors.palette.neutral100}
        />
        <Text text="Delete" style={styles.actionText} />
      </Animated.View>

      {/* Email Card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          transform: [{ translateX: position }, { scale: cardScale }],
        }}
      >
        <TouchableOpacity
          onPress={handleEmailPress}
          activeOpacity={0.7}
          onPressIn={() => {
            setIsSwipeEnabled(false)
            isSwiping.current = false
          }}
          onPressOut={() => {
            setTimeout(() => setIsSwipeEnabled(true), 50)
          }}
        >
          <Card
            style={[styles.emailCard, !email.unread && styles.unreadEmail]}
            ContentComponent={
              <View style={styles.emailContent}>
                <View style={styles.emailHeader}>
                  <View style={styles.avatarAndContent}>
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor:
                            email.priority === 'high'
                              ? theme.colors.palette.angry100
                              : theme.colors.palette.neutral200,
                        },
                      ]}
                    >
                      <Text
                        text={senderInitials}
                        style={[
                          styles.avatarText,
                          {
                            color:
                              email.priority === 'high'
                                ? theme.colors.error
                                : theme.colors.text,
                          },
                        ]}
                      />
                      {email.priority === 'high' && (
                        <View style={styles.priorityDot}>
                          <Ionicons
                            name="alert-circle"
                            size={14}
                            color={theme.colors.error}
                          />
                        </View>
                      )}
                    </View>
                    <View style={styles.emailHeaderContent}>
                      {/* Header row: Avatar, Name, Date/Time, Flag Button, Menu */}
                      <View style={styles.headerRow}>
                        <Text
                          text={senderName}
                          preset={email.unread ? 'subheading' : 'default'}
                          size="sm"
                          style={[
                            styles.senderName,
                            email.unread && styles.unreadText,
                          ]}
                          numberOfLines={1}
                        />
                        <Text preset="formHelper" style={styles.dateText}>
                          {formattedDate}
                        </Text>
                        <TouchableOpacity
                          onPress={handleFlagToggle}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={styles.flagButton}
                        >
                          <Ionicons
                            name={isFlagged ? 'flag' : 'flag-outline'}
                            size={18}
                            color={
                              isFlagged
                                ? theme.colors.error
                                : theme.colors.textDim
                            }
                          />
                        </TouchableOpacity>
                        <DropdownMenu
                          icon="ellipsis-vertical"
                          items={actions}
                          email={email}
                          selectedOption={handleActionsPress}
                        />
                      </View>
                      {/* Subject row */}
                      <Text
                        text={email.subject}
                        preset={email.unread ? 'bold' : 'default'}
                        size="sm"
                        style={[
                          styles.subjectText,
                          email.unread && styles.unreadText,
                        ]}
                        numberOfLines={1}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.previewContainer}>
                  <Text
                    preset="default"
                    text={email.preview}
                    style={styles.preview}
                    numberOfLines={1}
                  />
                  {(email.attachments?.length > 0 ||
                    email.labels?.length > 0) && (
                    <View style={styles.emailFooter}>
                      {email.attachments?.length > 0 && (
                        <View style={styles.attachmentBadge}>
                          <Ionicons
                            name="attach"
                            size={14}
                            color={theme.colors.textDim}
                          />
                          <Text
                            preset="formHelper"
                            style={styles.attachmentCount}
                          >
                            {`${email.attachments.length}`}
                          </Text>
                        </View>
                      )}
                      {email.labels?.map(label => (
                        <View key={label} style={styles.labelBadge}>
                          <Text preset="formHelper" style={styles.labelText}>
                            {label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            }
          />
        </TouchableOpacity>
        <MoveCategories
          showCategories={showCategories}
          email={email}
          refreshData={onDelete}
        />
      </Animated.View>
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    actionContainer: {
      alignItems: 'center',
      borderRadius: 16,
      bottom: 0,
      justifyContent: 'center',
      position: 'absolute',
      top: 0,
      width: SWIPE_THRESHOLD * 2,
    },
    actionText: {
      color: theme.colors.palette.neutral100,
      fontSize: 12,
      marginTop: spacing.xs,
    },
    archiveAction: {
      backgroundColor: theme.colors.palette.secondary500,
      borderBottomRightRadius: 0,
      borderTopRightRadius: 0,
      left: 0,
    },
    attachmentBadge: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      flexDirection: 'row',
      marginRight: 4,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
    },
    attachmentCount: {
      color: theme.colors.textDim,
      fontSize: 12,
    },
    avatar: {
      alignItems: 'center',
      borderRadius: 20,
      height: 40,
      justifyContent: 'center',
      marginRight: spacing.xs,
      position: 'relative',
      width: 40,
    },
    avatarAndContent: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      marginRight: spacing.xs,
    },
    avatarText: {
      fontSize: 16,
      fontWeight: '600',
    },
    deleteAction: {
      backgroundColor: theme.colors.error,
      borderBottomLeftRadius: 0,
      borderTopLeftRadius: 0,
      right: 0,
    },
    emailCard: {
      marginBottom: spacing.xs,
    },
    emailContent: {
      paddingVertical: spacing.sm,
    },
    emailFooter: {
      alignItems: 'center',
      flexDirection: 'row',
      marginRight: spacing.xs,
    },
    emailHeader: {
      marginBottom: spacing.xs,
    },
    emailHeaderContent: {
      flex: 1,
      minWidth: 0,
    },
    emailItemContainer: {
      marginHorizontal: spacing.sm,
      marginVertical: spacing.xs,
      position: 'relative',
    },
    labelBadge: {
      backgroundColor: theme.colors.palette.primary100,
      borderRadius: 12,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      marginRight: 2,
    },
    labelText: {
      color: theme.colors.palette.primary500,
      fontSize: 12,
    },
    preview: {
      color: theme.colors.textDim,
      fontSize: 13,
      marginBottom: spacing.xs,
    },
    previewContainer: {
      marginLeft: 48,
    },
    priorityDot: {
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      bottom: -4,
      padding: 2,
      position: 'absolute',
      right: -4,
    },
    headerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      marginBottom: 6,
      minWidth: 0,
    },
    senderName: {
      textTransform: 'capitalize',
      flex: 1,
      marginRight: spacing.xs,
      minWidth: 0,
    },
    dateText: {
      color: theme.colors.textDim,
      fontSize: 12,
      flexShrink: 0,
      marginRight: spacing.xs,
    },
    flagButton: {
      marginRight: spacing.xs,
      padding: 4,
      flexShrink: 0,
    },
    subjectText: {
      marginBottom: spacing.xs,
      flexShrink: 1,
    },
    unreadEmail: {
      backgroundColor: theme.colors.palette.neutral200,
      elevation: 0,
    },
    unreadText: {
      color: theme.colors.text,
    },
  })
