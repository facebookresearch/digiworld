// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Screen, Text } from '@/components'
import { FancyAlert } from '@/components/FancyAlert'
import { useToast } from '@/components/Toast'
import { db } from '@/db'
import { mutations } from '@/db/mutations'
import { emailsTable } from '@/db/schema'
import { useStores } from '@/models'
import { Email, mapDatabaseEmailToModel } from '@/models/EmailModel'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { eq, sql } from 'drizzle-orm'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function EmailDetailScreen() {
  const { id: paramId, sessionId } = useLocalSearchParams<{
    id: string
    sessionId: string
  }>()
  const insets = useSafeAreaInsets()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const { userStore, sessionStore } = useStores()
  const userEmail = userStore.currentUser?.email ?? ''

  const [email, setEmail] = useState<Email[]>([])
  const [expandedMail, setExpandedMail] = useState<string[]>([])
  const [messageID, setMessageID] = useState<string>(paramId ?? null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const { trackClick, trackScreenMount, trackContentChange } =
    useInteractionTracking('details', `/screens/mail/${messageID}`)

  const toast = useToast()

  const updateExpandedMails = (id: string) => {
    let mails = [...expandedMail]
    if (expandedMail.includes(id)) {
      mails = mails.filter(item => item !== id)
    } else {
      mails.push(id)
    }

    setExpandedMail([...mails])
    trackContentChange({
      expandedMailList: mails,
    })
  }

  const fetchEmail = useCallback(async () => {
    if (!messageID) return

    try {
      const result = await db
        .select()
        .from(emailsTable)
        .where(eq(emailsTable.threadId, messageID))
        .orderBy(sql`${emailsTable.timestamp} DESC`)

      if (result.length > 0) {
        const filteredData: any[] = result.filter(
          (mail: any) =>
            (mail.status === 'sent' && mail.sender === userEmail) ||
            (mail.status === 'received' && mail.receiver.includes(userEmail)),
        )

        const mappedData = filteredData.map((mail: any) =>
          mapDatabaseEmailToModel(mail),
        )
        setEmail(mappedData)

        updateExpandedMails(mappedData[0].id)

        // Mark email as read if it's unread
        if (mappedData.some(mail => !mail.read)) {
          mappedData.forEach(async mail => {
            if (!mail.read) {
              await mutations.updateEmailStatus(parseInt(mail.id), {
                read: 1,
                unread: 0,
              })
            }
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch email:', error)
    } finally {
      setIsLoading(false)
    }
  }, [messageID, userEmail])

  useEffect(() => {
    fetchEmail()
  }, [fetchEmail])

  // Refresh email thread when screen comes into focus (e.g., after replying)
  useFocusEffect(
    useCallback(() => {
      fetchEmail()
    }, [fetchEmail]),
  )

  useEffect(() => {
    trackScreenMount({
      messageID,
      showDeleteAlert,
    })
  }, [])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        screen: 'details',
        route: `/screens/mail/${messageID}`,
      })
    }, [trackScreenMount]),
  )

  useEffect(() => {
    if (!sessionId) return

    const session = sessionStore.getSession()
    const sessionInfo = session?.data as any
    const formData = sessionInfo?.sessionData?.formData

    console.log('formdata here ', formData)

    if (!formData) return

    const newMessageID = formData.id ?? paramId

    setTimeout(() => {
      setExpandedMail(formData?.expandedMailList ?? [])
    }, 2500)

    if (newMessageID !== messageID) {
      setTimeout(() => {
        setMessageID(newMessageID)
      }, 1500)
    }

    setShowDeleteAlert(formData.showDeleteAlert ?? false)
  }, [sessionId, paramId])

  // Show loading state
  if (isLoading) {
    return (
      <Screen style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <Text text="Loading email..." style={styles.loadingText} />
        </View>
      </Screen>
    )
  }

  // If email not found, show error state
  const EmptyComponent = () => (
    <Screen style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.errorContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={theme.colors.error}
        />
        <Text
          text="Email not found"
          preset="heading"
          style={styles.errorText}
        />
        <Text
          text="The email you're looking for doesn't exist or has been deleted."
          style={styles.errorSubtext}
        />
      </View>
    </Screen>
  )

  const formattedDate = (mail: Email) =>
    new Date(mail.timestamp).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    })

  const formattedTime = (mail: Email) =>
    new Date(mail.timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    })

  const formattedShortDate = (mail: Email) =>
    new Date(mail.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  const handleReply = () => {
    trackClick('replyButton')
    router.push({
      pathname: '/screens/compose/mailcompose',
      params: { replyId: email[0].id },
    } as any)
  }

  const handleDelete = async () => {
    if (!email) return
    trackClick('deleteButton')
    trackContentChange({
      showDeleteAlert: true,
    })
    setShowDeleteAlert(true)
  }

  const forwardMail = () => {
    trackClick('forwardButton')
    router.push({
      pathname: '/screens/compose/mailcompose',
      params: { forwardId: email[0].id },
    } as any)
  }

  const handleConfirmDelete = async () => {
    try {
      // Delete entire thread (Gmail/Outlook behavior)
      // messageID is actually the thread_id from the route params
      const result = await mutations.deleteEmailThread(messageID)
      if (result.success) {
        toast.show({
          title: 'Thread deleted',
          preset: 'success',
          placement: 'top',
          duration: 2000,
        })
        router.back()
      } else {
        throw new Error('Failed to delete thread')
      }
    } catch (error) {
      console.error('Failed to delete email thread:', error)
      setShowDeleteAlert(false)
      toast.show({
        title: 'Failed to delete thread',
        preset: 'error',
        placement: 'top',
        duration: 3000,
      })
    } finally {
      trackContentChange({
        showDeleteAlert: false,
      })
    }
  }

  const renderItem = ({ item: mail }: { item: Email }) => (
    <View style={styles.detailsCard}>
      {/* Email Status & Time */}
      <TouchableOpacity onPress={() => updateExpandedMails(mail.id)}>
        <View style={styles.emailStatusContainer}>
          <View style={styles.statusInfo}>
            <Ionicons
              name={mail.status === 'sent' ? 'paper-plane' : 'mail'}
              size={20}
              color={theme.colors.textDim}
            />
            <Text
              text={mail.status === 'sent' ? 'Sent' : 'Received'}
              style={styles.statusText}
            />
          </View>
          <View style={styles.statusInfo}>
            <Text
              text={`${formattedShortDate(mail)} at ${formattedTime(mail)}`}
              style={styles.timeText}
            />
            <Ionicons
              name={
                expandedMail.includes(mail.id) ? 'chevron-down' : 'chevron-up'
              }
              size={20}
              color={theme.colors.textDim}
            />
          </View>
        </View>
      </TouchableOpacity>

      {expandedMail.includes(mail.id) ? (
        <View>
          {/* Email Details Card */}
          <View style={styles.mailInfo}>
            {/* Priority & Labels */}
            <View style={styles.metaContainer}>
              {mail.priority === 'high' && (
                <View style={styles.priorityBadge}>
                  <Ionicons
                    name="alert-circle"
                    size={16}
                    color={theme.colors.error}
                  />
                  <Text text="High Priority" style={styles.priorityText} />
                </View>
              )}
              {mail.labels.map(label => (
                <View key={label} style={styles.labelBadge}>
                  <Text text={label} style={styles.labelText} />
                </View>
              ))}
            </View>

            {/* Sender Info */}
            <View style={styles.senderContainer}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text
                    text={mail.sender.charAt(0).toUpperCase()}
                    style={styles.avatarText}
                  />
                </View>
              </View>
              <View style={styles.senderInfo}>
                <Text text={mail.sender} style={styles.senderEmail} />
                <Text text={formattedDate(mail)} style={styles.fullDate} />
              </View>
            </View>

            {/* Recipients */}
            <View style={styles.recipientsContainer}>
              <View style={styles.detailRow}>
                <Text text="To:" style={styles.detailLabel} />
                <View style={styles.recipientsList}>
                  {mail.receiver.map((recipient, index) => (
                    <Text
                      key={recipient}
                      text={`${recipient}${index < mail.receiver.length - 1 ? ', ' : ''}`}
                      style={styles.detailValue}
                    />
                  ))}
                </View>
              </View>

              {mail.cc.length > 0 && (
                <View style={styles.detailRow}>
                  <Text text="CC:" style={styles.detailLabel} />
                  <View style={styles.recipientsList}>
                    {mail.cc.map((recipient, index) => (
                      <Text
                        key={recipient}
                        text={`${recipient}${index < mail.cc.length - 1 ? ', ' : ''}`}
                        style={styles.detailValue}
                      />
                    ))}
                  </View>
                </View>
              )}

              {mail.bcc.length > 0 && (
                <View style={styles.detailRow}>
                  <Text text="BCC:" style={styles.detailLabel} />
                  <View style={styles.recipientsList}>
                    {mail.bcc.map((recipient, index) => (
                      <Text
                        key={recipient}
                        text={`${recipient}${index < mail.bcc.length - 1 ? ', ' : ''}`}
                        style={styles.detailValue}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Email Body */}
          <View style={styles.bodyCard}>
            <Text text={mail.body} style={styles.bodyText} />
          </View>

          {/* Attachments */}
          {mail.attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              <Text
                text={`Attachments (${mail.attachments.length})`}
                preset="subheading"
                style={styles.attachmentsTitle}
              />
              {mail.attachments.map(attachment => (
                <TouchableOpacity
                  key={attachment.name}
                  style={styles.attachmentItem}
                >
                  <View style={styles.attachmentIcon}>
                    <Ionicons
                      name="document-outline"
                      size={24}
                      color={theme.colors.text}
                    />
                  </View>
                  <View style={styles.attachmentDetails}>
                    <Text
                      text={attachment.name}
                      style={styles.attachmentName}
                    />
                    <Text
                      text={formatBytes(attachment.size)}
                      style={styles.attachmentSize}
                    />
                  </View>
                  <TouchableOpacity style={styles.downloadButton}>
                    <Ionicons
                      name="download-outline"
                      size={20}
                      color={theme.colors.palette.primary500}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.bodyCard}>
          <Text
            text={mail.body}
            style={styles.bodyText}
            numberOfLines={1}
            ellipsizeMode="tail"
          />
        </View>
      )}
    </View>
  )

  return (
    <Screen
      safeAreaEdges={['bottom']}
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <FancyAlert
        visible={showDeleteAlert}
        message="Are you sure you want to delete this email?"
        icon="trash-outline"
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={handleConfirmDelete}
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text
          text={email[0].subject}
          style={styles.headerTitle}
          numberOfLines={1}
        />
        <View style={styles.headerActions}>
          {/* {email.status === 'received' && ( */}
          <TouchableOpacity style={styles.iconButton} onPress={handleReply}>
            <LinearGradient
              colors={[
                theme.colors.palette.primary500,
                theme.colors.palette.secondary500,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.replyIconBg}
            >
              <Ionicons name="return-up-back" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
          {/* )} */}
          <TouchableOpacity style={styles.iconButton} onPress={handleDelete}>
            <Ionicons
              name="trash-outline"
              size={24}
              color={theme.colors.error}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={forwardMail}>
            <Ionicons
              name="arrow-redo-sharp"
              size={26}
              color={theme.colors.palette.neutral500}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mailThread}>
        <FlatList
          data={email}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={EmptyComponent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
          scrollEventThrottle={16}
          removeClippedSubviews={true}
          contentContainerStyle={styles.contentContainer}
        />
      </View>
    </Screen>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    attachmentDetails: {
      flex: 1,
      marginLeft: spacing.sm,
    },
    attachmentIcon: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 8,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    attachmentItem: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      flexDirection: 'row',
      marginBottom: spacing.xs,
      padding: spacing.sm,
    },
    attachmentName: {
      marginBottom: 2,
    },
    attachmentSize: {
      color: theme.colors.textDim,
      fontSize: 12,
    },
    attachmentsContainer: {
      marginBottom: spacing.xl,
    },
    attachmentsTitle: {
      marginBottom: spacing.sm,
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.primary100,
      borderRadius: 20,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    avatarContainer: {
      marginRight: spacing.sm,
    },
    avatarText: {
      color: theme.colors.palette.primary500,
      fontSize: 18,
      fontWeight: '600',
    },
    bodyCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      marginBottom: spacing.md,
    },
    bodyText: {
      fontSize: 16,
      lineHeight: 24,
    },
    detailLabel: {
      color: theme.colors.textDim,
      width: 60,
    },
    detailRow: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },
    detailValue: {
      color: theme.colors.text,
      flex: 1,
    },
    detailsCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      margin: spacing.md,
      padding: spacing.md,
    },
    downloadButton: {
      padding: spacing.xs,
    },
    emailStatusContainer: {
      alignItems: 'center',
      borderBottomColor: theme.colors.palette.neutral200,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
      paddingBottom: spacing.sm,
    },
    errorContainer: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      padding: spacing.xl,
    },
    errorSubtext: {
      color: theme.colors.textDim,
      textAlign: 'center',
    },
    errorText: {
      marginBottom: spacing.xs,
      marginTop: spacing.md,
      textAlign: 'center',
    },
    fullDate: {
      color: theme.colors.textDim,
      fontSize: 14,
    },
    header: {
      alignItems: 'center',
      borderBottomColor: theme.colors.palette.neutral300,
      borderBottomWidth: 1,
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    headerActions: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    headerTitle: {
      color: theme.colors.text,
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      marginHorizontal: spacing.sm,
    },
    iconButton: {
      padding: spacing.xs,
    },
    labelBadge: {
      backgroundColor: theme.colors.palette.primary100,
      borderRadius: 16,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    labelText: {
      color: theme.colors.palette.primary500,
      fontSize: 14,
    },
    loadingContainer: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    loadingText: {
      color: theme.colors.textDim,
    },
    metaContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    priorityBadge: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.angry100,
      borderRadius: 16,
      flexDirection: 'row',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    priorityText: {
      color: theme.colors.error,
      fontSize: 14,
    },
    recipientsContainer: {
      paddingTop: spacing.sm,
    },
    recipientsList: {
      flex: 1,
    },
    replyIconBg: {
      alignItems: 'center',
      borderRadius: 16,
      height: 32,
      justifyContent: 'center',
      width: 32,
    },
    screen: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    senderContainer: {
      borderBottomWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      borderTopWidth: 1,
      flexDirection: 'row',
      marginVertical: spacing.md,
      paddingVertical: spacing.sm,
    },
    senderEmail: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 4,
    },
    senderInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    statusInfo: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    statusText: {
      color: theme.colors.textDim,
      fontSize: 14,
    },
    timeText: {
      color: theme.colors.textDim,
      fontSize: 14,
    },
    mailThread: {
      marginBottom: 80,
    },
    mailInfo: {
      marginBottom: spacing.md,
    },
    contentContainer: {
      paddingBottom: 80,
    },
  })
