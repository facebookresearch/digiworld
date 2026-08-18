import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import EmailAutocomplete from '@/components/EmailAutocomplete'
import { Screen } from '@/components/Screen'
import { SuccessDialog } from '@/components/SuccessDialog'
import { Text } from '@/components/Text'
import { mutations } from '@/db/mutations'
import { queries } from '@/db/queries'
import { mapDatabaseEmailToModel } from '@/models/EmailModel'
import { useStores } from '@/models/helpers/useStores'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { generateUUID } from '@/utils/id-generator'
import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useToast } from '@/components/Toast'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'

interface Attachment {
  name: string
  size: number
  uri: string
  mimeType: string
}

export default observer(function ComposeScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore, sessionStore } = useStores()
  const params = useLocalSearchParams<{
    draftId?: string
    sessionId?: string
    forwardId?: string
    replyId?: string
  }>()
  const insets = useSafeAreaInsets()
  const userEmail = userStore.currentUser?.email ?? ''
  const router = useRouter()
  const toast = useToast()
  const { trackScreenMount, trackTextChange, trackContentChange, trackClick } =
    useInteractionTracking('Compose', '/screens/compose/mailcompose')

  // Initialize state
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [emailThreadId, setEmailThreadId] = useState('')
  // Ref manager for all input refs, including autocomplete input or regular text input
  const inputRefs = useRef<{
    [key: string]:
      | { focusInput?: () => void; blurInput?: () => void }
      | TextInput
      | null
  }>({})

  // Register a ref against a field name so we can programatically control each ref
  const registerRef = (name: string, ref: any) => {
    if (ref) {
      inputRefs.current[name] = ref
    }
  }
  // Function to blur currently focused input
  const blurActiveInput = () => {
    Object.values(inputRefs.current).forEach(input => {
      if (input && 'blurInput' in input) {
        input?.blurInput?.()
      } else if (input) {
        ;(input as TextInput)?.blur?.()
      }
    })
  }

  useFocusEffect(
    useCallback(() => {
      trackScreenMount()
    }, [trackScreenMount]),
  )

  const focusField = (fieldName: string) => {
    const ref = inputRefs.current[fieldName]
    if (ref) {
      if ('focusInput' in ref) {
        ref.focusInput?.()
      } else {
        ;(ref as TextInput)?.focus?.()
      }
    }
  }

  // Load session data if it exists
  useEffect(() => {
    const { sessionId } = params
    if (sessionId) {
      const session = sessionStore.getSession()
      if (session?.data && session.id === sessionId) {
        const sessionData = session.data as any

        const data = sessionData?.sessionData?.formData

        if (data) {
          const fields: ('to' | 'cc' | 'bcc' | 'subject' | 'message')[] = [
            'to',
            'cc',
            'bcc',
            'subject',
            'message',
          ]

          if (data?.forwardId || data?.replyId || data?.draftId) {
            const id = data?.forwardId
              ? 'forwardId'
              : data?.replyId
                ? 'replyId'
                : 'draftId'

            router.push({
              pathname: '/screens/compose/mailcompose',
              params: { [id]: data[id] },
            } as any)
          }

          trackContentChange(sessionData.sessionData.formData)
          setShowCc(sessionData.sessionData.formData.showCc || false)

          fields.forEach(field => {
            handleFieldChange(
              field,
              true,
            )(sessionData.sessionData.formData[field] || '')
          })
          setAttachments(sessionData.sessionData.formData.attachments || [])
          setTimeout(() => {
            focusField(sessionData.sessionData.currentFocusedElement)
          }, 200)
        }
      }
    }
  }, [params.sessionId])

  // Add this function near the top of the component
  const resetForm = useCallback(() => {
    setTo('')
    setCc('')
    setBcc('')
    setSubject('')
    setMessage('')
    setShowCc(false)
    setAttachments([])
  }, [])

  useEffect(() => {
    trackScreenMount()
  }, [trackScreenMount])

  // Load draft data directly when needed
  useEffect(() => {
    if (
      !params?.draftId &&
      !params?.sessionId &&
      !params?.forwardId &&
      !params?.replyId
    ) {
      resetForm()
      return
    }

    const loadDraft = async () => {
      try {
        trackContentChange({
          draftId: params?.draftId,
          forwardId: params?.forwardId,
          replyId: params?.replyId,
        })
        const id = parseInt(
          params?.draftId || params?.forwardId || params?.replyId || '',
        )
        if (isNaN(id) || id <= 0) return

        const mailDetails = await queries.getEmailByIdQuery(id).execute()
        if (!mailDetails?.[0]) return

        const mappedDraft = mapDatabaseEmailToModel(mailDetails[0])

        // Set form data
        if (!params?.replyId) {
          setSubject(mappedDraft.subject)
          setMessage(mappedDraft.body)

          // Handle attachments if any
          if (mappedDraft.attachments?.length) {
            setAttachments(
              mappedDraft.attachments.map((att: any) => ({
                name: att.name,
                size: att.size,
                uri: att.url || att.uri,
                mimeType: att.type || att.mimeType,
              })),
            )
          }
        } else {
          setTo(mappedDraft.sender)
          setSubject('Re: ' + mappedDraft.subject)
          // Use thread_id matching Email interface
          setEmailThreadId(mappedDraft.thread_id)
        }

        if (params?.draftId) {
          setTo(mappedDraft.receiver.join(', '))
          setCc(mappedDraft.cc?.join(', ') || '')
          setBcc(mappedDraft.bcc?.join(', ') || '')
          setShowCc(Boolean(mappedDraft.cc?.length || mappedDraft.bcc?.length))
        }
      } catch (error) {
        console.error('Failed to load draft:', error)
      }
    }

    loadDraft()
  }, [params?.draftId, params?.forwardId, params?.replyId])

  // Move handleSaveDraft BEFORE the useEffect that uses it
  const handleSaveDraft = useCallback(async () => {
    // Check for meaningful changes - at least one field should have content
    const hasContent = [
      to.trim(),
      cc.trim(),
      bcc.trim(),
      subject.trim(),
      message.trim(),
      attachments.length > 0,
    ].some(Boolean)

    if (!hasContent) return

    try {
      const toRecipients = to
        .split(',')
        .map(email => email.trim())
        .filter(Boolean)
      const ccRecipients = cc
        .split(',')
        .map(email => email.trim())
        .filter(Boolean)
      const bccRecipients = bcc
        .split(',')
        .map(email => email.trim())
        .filter(Boolean)

      // Convert attachments to the expected format
      const dbAttachments = attachments.map(att => ({
        name: att.name,
        type: att.mimeType,
        size: att.size,
        url: att.uri,
      }))

      const draftData = {
        sender: userEmail,
        receiver: JSON.stringify(toRecipients),
        subject,
        preview: message.substring(0, 100) + '...',
        body: message,
        timestamp: new Date().toISOString(),
        unread: 0,
        read: 1,
        status: 'draft',
        attachments: JSON.stringify(dbAttachments),
        labels: JSON.stringify(['draft']),
        isDraft: 1,
        threadId: params.draftId ? undefined : generateUUID(),
        folder: 'draft',
        priority: 'normal',
        cc: JSON.stringify(ccRecipients),
        bcc: JSON.stringify(bccRecipients),
      }

      if (params.draftId) {
        await mutations.updateEmailStatus(parseInt(params.draftId), draftData)
        toast.show({
          title: 'Draft updated',
          preset: 'info',
          placement: 'top',
          duration: 2000,
        })
      } else {
        const result = await mutations.addEmail(draftData)
        if (!result.success) {
          throw new Error('Failed to save draft')
        }
        toast.show({
          title: 'Draft saved',
          preset: 'success',
          placement: 'top',
          duration: 2000,
        })
      }
    } catch (error) {
      console.error('Failed to save draft:', error)
      toast.show({
        title: 'Failed to save draft',
        preset: 'error',
        placement: 'top',
        duration: 3000,
      })
    }
  }, [
    to,
    cc,
    bcc,
    subject,
    message,
    attachments,
    userEmail,
    params.draftId,
    toast,
  ])

  // Add this function to clear the form
  const clearForm = useCallback(() => {
    setTo('')
    setCc('')
    setBcc('')
    setSubject('')
    setMessage('')
    setShowCc(false)
    setAttachments([])
  }, [])

  // Modify the existing handleSuccessClose to use clearForm
  const handleSuccessClose = useCallback(() => {
    trackContentChange({
      showSuccess: false,
    })
    setShowSuccess(false)
    clearForm()
  }, [clearForm])

  const handleAddAttachment = async () => {
    trackClick('addAttachmentButton')
    blurActiveInput()
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      })

      if (result.assets) {
        const newAttachments = result.assets
          .filter(
            (
              asset,
            ): asset is DocumentPicker.DocumentPickerAsset & { size: number } =>
              typeof asset.size === 'number',
          )
          .map(asset => ({
            name: asset.name,
            size: asset.size,
            uri: asset.uri,
            mimeType: asset.mimeType || 'application/octet-stream',
          }))
        trackContentChange({
          interactionType: 'ATTACHMENTS_CHANGED',
          source: 'Compose',
          attachments: [...attachments, ...newAttachments],
        })
        setAttachments(prev => [...prev, ...newAttachments])

        toast.show({
          title: `${newAttachments.length} attachment${
            newAttachments.length === 1 ? '' : 's'
          } added`,
          preset: 'success',
          placement: 'bottom',
          duration: 2000,
        })
      }
    } catch (err) {
      if (err instanceof Error) {
        toast.show({
          title: 'Failed to add attachment',
          preset: 'error',
          placement: 'bottom',
          duration: 3000,
        })
      }
    }
  }

  // Memoize handlers
  const handleRemoveAttachment = useCallback((uri: string) => {
    trackClick('removeAttachmentButton')
    setAttachments(prev => prev.filter(attachment => attachment.uri !== uri))
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const handleSend = debounce(async () => {
    trackClick('sendButton')
    if (!to) {
      Alert.alert('Error', 'Please specify at least one recipient')
      return
    }

    if (!subject) {
      Alert.alert('Error', 'Please add a subject')
      return
    }

    if (!userEmail) {
      Alert.alert('Error', 'User not logged in')
      return
    }

    try {
      // Parse recipients
      const toRecipients = to
        .split(',')
        .map(email => email.trim())
        .filter(Boolean)
      const ccRecipients = cc
        .split(',')
        .map(email => email.trim())
        .filter(Boolean)
      const bccRecipients = bcc
        .split(',')
        .map(email => email.trim())
        .filter(Boolean)

      const timestamp = new Date().toISOString()
      const threadId = params?.replyId ? emailThreadId : generateUUID()

      // Convert attachments to the expected format
      const dbAttachments = attachments.map(att => ({
        name: att.name,
        type: att.mimeType,
        size: att.size,
        url: att.uri,
      }))

      // Create sent record for sender
      const sentResult = await mutations.addEmail({
        sender: userEmail, // Use current user's email
        receiver: JSON.stringify(toRecipients),
        subject,
        preview: message.substring(0, 100) + '...',
        body: message,
        timestamp,
        unread: 0,
        read: 1,
        status: 'sent',
        attachments: JSON.stringify(dbAttachments),
        labels: JSON.stringify(['sent']),
        isDraft: 0,
        threadId,
        folder: 'sent',
        priority: 'normal',
        cc: JSON.stringify(ccRecipients),
        bcc: JSON.stringify(bccRecipients),
      })

      if (!sentResult.success) {
        throw new Error('Failed to save sent email')
      }

      // Create inbox records for recipients
      const allRecipients = [
        ...toRecipients.map(email => ({ email, type: 'to' as const })),
        ...ccRecipients.map(email => ({ email, type: 'cc' as const })),
        ...bccRecipients.map(email => ({ email, type: 'bcc' as const })),
      ]

      // Create inbox copies in parallel
      await Promise.all(
        allRecipients.map(async recipient => {
          // Skip BCC recipients in CC field of other recipients' records
          const visibleCc = recipient.type === 'bcc' ? [] : ccRecipients

          return mutations.addEmail({
            sender: userEmail, // Use current user's email
            receiver: JSON.stringify([recipient.email]),
            subject,
            preview: message.substring(0, 100) + '...',
            body: message,
            timestamp,
            unread: 1,
            read: 0,
            status: 'received',
            attachments: JSON.stringify(dbAttachments),
            labels: JSON.stringify(['inbox']),
            isDraft: 0,
            threadId,
            folder: 'inbox',
            priority: 'normal',
            cc: JSON.stringify(visibleCc),
            bcc: JSON.stringify([]),
          })
        }),
      )

      // Delete draft if exists
      // Note: Drafts use individual email deletion (not thread-based)
      // because they're work-in-progress and not part of a conversation yet
      if (params.draftId) {
        await mutations.deleteEmail(params.draftId)
      }
      trackContentChange({
        showSuccess: true,
      })
      setShowSuccess(true)
      resetForm()
      router.setParams({ draftId: undefined })

      // Add dismiss timer
      setTimeout(() => {
        trackContentChange({
          showSuccess: false,
        })
        setShowSuccess(false)
        router.back()
      }, 3000) // 3 seconds
    } catch (error) {
      console.error('Failed to send email:', error)
      Alert.alert('Error', 'Failed to send email. Please try again.', [
        { text: 'OK' },
      ])
    }
  }, 300)

  // Remove or comment out the error logging effect since we're not using queryError
  /* useEffect(() => {
    if (queryError) {
      console.error('Query Error:', queryError);
    }
  }, [queryError]); */

  // Remove console.logs
  /* console.log('Component Render - Draft ID:', params.draftId);
  console.log('Draft Query:', draftQuery); */

  // Add effect to handle initial state when no draft
  useEffect(() => {
    if (!params?.draftId && !params?.sessionId) {
      resetForm() // Reset form if no draft ID
    }
  }, [params?.draftId, resetForm])

  // Add handleClose function
  const handleClose = useCallback(() => {
    trackClick('closeButton')
    const hasContent = [
      to.trim(),
      cc.trim(),
      bcc.trim(),
      subject.trim(),
      message.trim(),
      attachments.length > 0,
    ].some(Boolean)

    if (hasContent) {
      toast.show({
        title: 'Saving draft...',
        preset: 'info',
        placement: 'bottom',
        duration: 1000,
      })
      handleSaveDraft()
    }
    router.back()
  }, [
    handleSaveDraft,
    router,
    to,
    cc,
    bcc,
    subject,
    message,
    attachments,
    toast,
  ])

  // Add this function to handle email changes
  const handleFieldChange =
    (field: 'to' | 'cc' | 'bcc' | 'subject' | 'message', doTracking = true) =>
    (value: string) => {
      if (doTracking) trackTextChange(field, value)
      switch (field) {
        case 'to':
          setTo(value)
          break
        case 'cc':
          setCc(value)
          break
        case 'bcc':
          setBcc(value)
          break
        case 'subject':
          setSubject(value)
          break
        case 'message':
          setMessage(value)
          break
      }
    }

  // Update the header section to include a delete button when editing a draft
  const handleDelete = useCallback(async () => {
    trackClick('deleteButton')
    if (!params.draftId) return

    try {
      // Note: Drafts use individual email deletion (not thread-based)
      // because they're work-in-progress and not part of a conversation yet
      const result = await mutations.deleteEmail(params.draftId)
      if (result.success) {
        toast.show({
          title: 'Draft deleted',
          preset: 'success',
          placement: 'top',
          duration: 2000,
        })
        router.back()
      } else {
        throw new Error('Failed to delete draft')
      }
    } catch (error) {
      console.error('Failed to delete draft:', error)
      toast.show({
        title: 'Failed to delete draft',
        preset: 'error',
        placement: 'bottom',
        duration: 3000,
      })
    }
  }, [params.draftId, router, toast])

  useEffect(() => {
    if (showCc) {
      setTimeout(() => focusField('cc'), 100) // Small delay ensures UI update
    }
  }, [showCc])

  const getHeading = () => {
    if (params?.draftId) return 'Edit Draft'
    if (params?.forwardId) return 'Forward Mail'
    if (params?.replyId) return 'Reply To Mail'
    return 'New Message'
  }

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={[styles.container, { paddingTop: insets.top }]}
    >
      <SuccessDialog visible={showSuccess} onClose={handleSuccessClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons
              name="close-outline"
              size={24}
              color={theme.colors.palette.primary500}
            />
          </TouchableOpacity>
          <Text
            preset="heading"
            text={getHeading()}
            style={styles.headerTitle}
          />
          <View style={styles.headerActions}>
            {params?.draftId && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Ionicons
                  name="trash-outline"
                  size={24}
                  color={theme.colors.error}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Ionicons
                name="send-outline"
                size={24}
                color={theme.colors.palette.primary500}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Recipients Section */}
          <View style={styles.recipientsContainer}>
            <View style={styles.recipientRow}>
              <View style={styles.labelContainer}>
                <Text text="To:" preset="formLabel" />
              </View>
              <EmailAutocomplete
                ref={ref => registerRef('to', ref)}
                value={to}
                onChangeText={handleFieldChange('to')}
                placeholder="Recipients"
              />
              <TouchableOpacity
                style={styles.ccButton}
                onPress={() => {
                  trackClick('showCCButton')
                  blurActiveInput()
                  trackContentChange({
                    showCc: !showCc,
                  })
                  setShowCc(!showCc)
                  if (showCc) {
                    focusField('cc')
                  }
                }}
              >
                <Text
                  text={showCc ? 'Hide CC' : 'CC'}
                  preset="formLabel"
                  style={styles.ccButtonText}
                />
              </TouchableOpacity>
            </View>

            {showCc && (
              <>
                <View style={styles.recipientRow}>
                  <View style={styles.labelContainer}>
                    <Text text="Cc:" preset="formLabel" />
                  </View>
                  <EmailAutocomplete
                    ref={ref => registerRef('cc', ref)}
                    value={cc}
                    onChangeText={handleFieldChange('cc')}
                    placeholder="Carbon Copy"
                  />
                </View>

                <View style={styles.recipientRow}>
                  <View style={styles.labelContainer}>
                    <Text text="Bcc:" preset="formLabel" />
                  </View>
                  <EmailAutocomplete
                    ref={ref => registerRef('bcc', ref)}
                    value={bcc}
                    onChangeText={handleFieldChange('bcc')}
                    placeholder="Blind Carbon Copy"
                  />
                </View>
              </>
            )}
          </View>

          {/* Subject */}
          <View style={styles.subjectContainer}>
            <TextInput
              ref={ref => registerRef('subject', ref)}
              style={styles.subjectInput}
              value={subject}
              onChangeText={handleFieldChange('subject')}
              placeholder="Subject"
              placeholderTextColor={theme.colors.textDim}
            />
          </View>

          {/* Message Body */}
          <View style={styles.messageContainer}>
            <TextInput
              ref={ref => registerRef('message', ref)}
              style={styles.messageInput}
              value={message}
              onChangeText={handleFieldChange('message')}
              placeholder="Type your message..."
              placeholderTextColor={theme.colors.textDim}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Attachments */}
          <View style={styles.attachmentsContainer}>
            <View style={styles.attachmentsHeader}>
              <Text text="Attachments" preset="formLabel" />
              <TouchableOpacity
                style={styles.addAttachmentButton}
                onPress={handleAddAttachment}
              >
                <Ionicons
                  name="attach-outline"
                  size={24}
                  color={theme.colors.palette.primary500}
                />
                <Text
                  text="Add"
                  preset="formLabel"
                  style={styles.attachmentButtonText}
                />
              </TouchableOpacity>
            </View>

            {attachments.length > 0 && (
              <View style={styles.attachmentsList}>
                {attachments.map((attachment, index) => (
                  <View
                    key={`${attachment.uri}-${index}`}
                    style={styles.attachmentItem}
                  >
                    <View style={styles.attachmentInfo}>
                      <Ionicons
                        name="document-outline"
                        size={20}
                        color={theme.colors.text}
                      />
                      <View style={styles.attachmentDetails}>
                        <Text
                          text={attachment.name}
                          preset="bold"
                          style={styles.attachmentName}
                        />
                        <Text
                          text={formatFileSize(attachment.size)}
                          preset="formHelper"
                          style={styles.attachmentSize}
                        />
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveAttachment(attachment.uri)}
                      style={styles.removeAttachmentButton}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={20}
                        color={theme.colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    addAttachmentButton: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    attachmentButtonText: {
      color: theme.colors.palette.primary500,
    },
    attachmentDetails: {
      flex: 1,
    },
    attachmentInfo: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: spacing.xs,
    },
    attachmentItem: {
      alignItems: 'center',
      borderBottomColor: theme.colors.palette.neutral300,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
    },
    attachmentName: {
      fontSize: 14,
    },
    attachmentSize: {
      color: theme.colors.textDim,
    },
    attachmentsContainer: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      overflow: 'hidden',
    },
    attachmentsHeader: {
      alignItems: 'center',
      borderBottomColor: theme.colors.palette.neutral300,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: spacing.sm,
    },
    attachmentsList: {
      padding: spacing.sm,
    },
    ccButton: {
      paddingHorizontal: spacing.sm,
    },
    ccButtonText: {
      color: theme.colors.palette.primary500,
    },
    closeButton: {
      padding: spacing.xs,
    },
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    deleteButton: {
      padding: spacing.xs,
    },
    header: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderBottomColor: theme.colors.palette.neutral300,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    headerActions: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    headerTitle: {
      flex: 1,
      fontSize: 20,
      textAlign: 'center',
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    labelContainer: {
      paddingLeft: spacing.sm,
      width: 50,
    },
    messageContainer: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      flex: 1,
      marginBottom: spacing.sm,
      minHeight: 200,
    },
    messageInput: {
      color: theme.colors.text,
      flex: 1,
      fontSize: 16,
      minHeight: 200,
      padding: spacing.sm,
    },
    recipientInput: {
      color: theme.colors.text,
      flex: 1,
      fontSize: 16,
      height: 40,
      paddingHorizontal: spacing.xs,
    },
    recipientRow: {
      alignItems: 'center',
      borderBottomColor: theme.colors.palette.neutral300,
      borderBottomWidth: 1,
      flexDirection: 'row',
      paddingVertical: spacing.xs,
    },
    recipientsContainer: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      marginBottom: spacing.sm,
    },
    removeAttachmentButton: {
      padding: spacing.xs,
    },
    scrollContent: {
      padding: spacing.md,
    },
    scrollView: {
      flex: 1,
    },
    sendButton: {
      padding: spacing.xs,
    },
    subjectContainer: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      marginBottom: spacing.sm,
    },
    subjectInput: {
      color: theme.colors.text,
      fontSize: 16,
      height: 40,
      paddingHorizontal: spacing.sm,
    },
  })
