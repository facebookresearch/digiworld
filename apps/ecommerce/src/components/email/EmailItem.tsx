// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { useToast } from '@/components/Toast'
import { mutations } from '@/db/mutations'
import { Email, MailFolder } from '@/models/EmailModel'
import { colors, spacing } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  LayoutAnimation,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

const SWIPE_THRESHOLD = 80
const SCREEN_WIDTH = Dimensions.get('window').width

interface EmailItemProps {
  email: Email
  onDelete?: (folder: MailFolder) => void
}

export function EmailItem({ email, onDelete }: EmailItemProps) {
  const toast = useToast()
  const position = useRef(new Animated.Value(0)).current
  const [isVisible, setIsVisible] = useState(true)

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
      console.log(email.folder)
      // Perform delete operation
      if (email.folder === 'trash') {
        await mutations.deleteEmail(email.id.toString())
        onDelete?.('trash')
        toast.show({
          title: 'Email permanently deleted',
          preset: 'error',
          placement: 'top',
        })
      } else {
        await mutations.moveEmailToFolder(parseInt(email.id), 'trash')
        onDelete?.(email.folder)
        toast.show({
          title: 'Email moved to trash',
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
  }, [email.id, email.folder, onDelete, position, toast])

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

      // If already in archived folder, move to inbox
      const targetFolder =
        email.folder === 'archived'
          ? email.status === 'received'
            ? 'inbox'
            : email.status
          : 'archived'
      await mutations.moveEmailToFolder(parseInt(email.id), targetFolder)
      onDelete?.(email.folder)

      toast.show({
        title:
          email.folder === 'archived'
            ? 'Email unarchived and move to ' + targetFolder
            : 'Email archived',
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
  }, [email.id, email.folder, onDelete, position, toast])

  const formattedDate = new Date(email.timestamp).toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    month: 'short',
    day: 'numeric',
  })

  // Extract domain from email
  const senderName = email.sender.split('@')[0].replace(/[.]/g, ' ')
  const senderInitials = senderName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()

  const handleEmailPress = () => {
    if (email.folder === 'draft') {
      router.push({
        pathname: '/screens/compose/mailcompose',
        params: { draftId: email.id },
      } as any)
    } else {
      router.push(`/screens/mail/${email.id}`)
    }
  }

  const [isSwipeEnabled, setIsSwipeEnabled] = useState(true)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isSwipeEnabled,
      onMoveShouldSetPanResponder: () => isSwipeEnabled,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gestureState) => {
        // Allow both left and right swipes
        position.setValue(gestureState.dx)
      },
      onPanResponderRelease: (_, gestureState) => {
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
          color={colors.palette.neutral100}
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
          color={colors.palette.neutral100}
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
          onPressIn={() => setIsSwipeEnabled(false)}
          onPressOut={() => setIsSwipeEnabled(true)}
        >
          <Card
            style={[styles.emailCard, email.unread && styles.unreadEmail]}
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
                              ? colors.palette.angry100
                              : colors.palette.neutral200,
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
                                ? colors.error
                                : colors.text,
                          },
                        ]}
                      />
                      {email.priority === 'high' && (
                        <View style={styles.priorityDot}>
                          <Ionicons
                            name="alert-circle"
                            size={14}
                            color={colors.error}
                          />
                        </View>
                      )}
                    </View>
                    <View style={styles.emailHeaderContent}>
                      <View style={styles.senderRow}>
                        <Text
                          text={senderName}
                          preset="subheading"
                          size="sm"
                          style={[
                            styles.senderName,
                            email.unread && styles.unreadText,
                          ]}
                        />
                        <Text preset="formHelper" style={styles.dateText}>
                          {formattedDate}
                        </Text>
                      </View>
                      <Text
                        text={email.subject}
                        preset="bold"
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
                            color={colors.textDim}
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
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  emailItemContainer: {
    position: 'relative',
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
  },
  emailCard: {
    marginBottom: spacing.xs,
  },
  unreadEmail: {
    backgroundColor: colors.palette.neutral200,
  },
  emailContent: {
    paddingVertical: spacing.sm,
  },
  emailHeader: {
    marginBottom: spacing.xs,
  },
  avatarAndContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: spacing.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    marginRight: spacing.xs,
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  priorityDot: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 2,
  },
  emailHeaderContent: {
    flex: 1,
  },
  senderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  senderName: {
    textTransform: 'capitalize',
  },
  dateText: {
    color: colors.textDim,
  },
  subjectText: {
    marginBottom: spacing.xs,
  },
  unreadText: {
    color: colors.text,
    fontWeight: '600',
  },
  previewContainer: {
    marginLeft: 48,
  },
  preview: {
    fontSize: 13,
    color: colors.textDim,
    marginBottom: spacing.xs,
  },
  emailFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.palette.neutral200,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 4,
  },
  attachmentCount: {
    color: colors.textDim,
    fontSize: 12,
  },
  labelBadge: {
    backgroundColor: colors.palette.primary100,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 12,
  },
  labelText: {
    color: colors.palette.primary500,
    fontSize: 12,
  },
  actionContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SWIPE_THRESHOLD * 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  deleteAction: {
    right: 0,
    backgroundColor: colors.error,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  actionText: {
    color: colors.palette.neutral100,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  archiveAction: {
    left: 0,
    backgroundColor: colors.palette.secondary500,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
})
