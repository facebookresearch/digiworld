// Copyright (c) Meta Platforms, Inc. and affiliates.
import { mutations } from '@/db/mutations'
import { queries } from '@/db/queries'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { metrics, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Screen, Text } from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

interface CallHistoryItem {
  id: string
  callerId: string
  receiverId: string
  callType: string
  duration: number
  timestamp: number
  wasMissed: number
  callStatus?: string
  caller?: any
  receiver?: any
}

export default function CallsScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const { userStore, sessionStore } = useStores()
  const router = useRouter()
  const [calls, setCalls] = useState<CallHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set())
  const [refreshKey, setRefreshKey] = useState(0)
  const [hasSessionRestoration, setHasSessionRestoration] = useState(false)

  // Memoize calls count for tracking
  const callsCount = useMemo(() => calls.length, [calls.length])
  console.log('sessionTimeStamp', sessionTimeStamp, sessionId)

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

  const getInitials = (name: string) => {
    if (!name) return '?'
    const words = name.trim().split(' ')
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase()
    }
    return (
      words[0].charAt(0) + words[words.length - 1].charAt(0)
    ).toUpperCase()
  }

  const handleAvatarError = (callId: string) => {
    setFailedAvatars(prev => new Set(prev).add(callId))
  }

  const handleAvatarLoad = (callId: string) => {
    setFailedAvatars(prev => {
      const newSet = new Set(prev)
      newSet.delete(callId)
      return newSet
    })
  }

  // Setup interaction tracking
  const { width, height } = Dimensions.get('window')
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('Calls', '/(tabs)/calls')

  // Load call history from database
  const loadCallHistory = useCallback(async () => {
    try {
      if (!userStore.currentUser?.id) return

      setIsLoading(true)
      const callHistory = await queries.getCallHistoryForUser(
        userStore.currentUser.id,
      )

      // Enrich call history with user details
      const enrichedCalls = await Promise.all(
        callHistory.map(async (call: any) => {
          const caller = await queries.getUserById(call.callerId)
          const receiver = await queries.getUserById(call.receiverId)

          return {
            ...call,
            caller,
            receiver,
          }
        }),
      )
      setCalls(enrichedCalls)
      setRefreshKey(prev => prev + 1) // Force re-render when calls are loaded
    } catch (error) {
      console.error('Error loading call history:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userStore.currentUser?.id])

  // Load session data if exists (following home screen pattern)
  useEffect(() => {
    console.log('Calls screen session restoration useEffect triggered:', {
      sessionId,
      sessionTimeStamp,
    })

    if (sessionTimeStamp) {
      // Add a small delay to ensure session data is fully loaded
      const timer = setTimeout(() => {
        const session = sessionStore.getSession()
        console.log('Retrieved session:', {
          sessionExists: !!session,
          sessionData: session?.data?.sessionData,
        })

        if (session?.data?.sessionData) {
          const savedState = session.data.sessionData.formData as any

          console.log('Session data structure:', {
            formData: savedState,
            fullSessionData: session.data.sessionData,
          })

          // Restore state from session (following the same pattern as home screen)
          if (savedState) {
            console.log('Calls screen session restoration:', {
              savedState,
              timestamp: Date.now(),
            })

            // If calls were cleared in the session, reflect that state
            if (savedState.callsCleared) {
              console.log(
                'Restoring cleared calls state:',
                savedState.callsCleared,
              )
              setCalls([]) // Clear the calls list to match the restored state
            }

            // Track content change after state restoration
            trackContentChange({
              event: 'session_state_restored',
              restoredState: savedState,
              timestamp: Date.now(),
            })

            // Mark that session restoration has happened
            setHasSessionRestoration(true)
          } else {
            console.log('No savedState found in session data')
          }
        } else {
          console.log('No session data found')
        }
      }, 100) // Small delay to ensure session data is loaded

      return () => clearTimeout(timer)
    }
    return undefined
  }, [sessionTimeStamp, sessionId, sessionStore])

  // Load call history on mount and when user changes (but respect session restoration)
  useFocusEffect(
    useCallback(() => {
      // Only reload if session restoration hasn't happened
      if (!hasSessionRestoration) {
        console.log(
          'Calls screen focused - refreshing calls (no session restoration)',
        )
        // Clear failed avatars to allow retrying image loads
        setFailedAvatars(new Set())

        // Force immediate reload and then another reload after delay to ensure updates are captured
        loadCallHistory()

        const timer = setTimeout(() => {
          loadCallHistory()
        }, 800)

        return () => clearTimeout(timer)
      } else {
        console.log(
          'Calls screen focused - skipping refresh due to session restoration',
        )
        // Reset the flag for next time
        setHasSessionRestoration(false)
      }
      return undefined
    }, [hasSessionRestoration, loadCallHistory]),
  )

  // Track screen mount with relevant data
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        callsCount,
        calls,
        timestamp: Date.now(),
        platform: Platform.OS,
        screenDimensions: { width, height },
        userProfileId: userStore.currentUser?.id,
        sessionId,
      })
    }, [
      trackScreenMount,
      callsCount,
      width,
      height,
      userStore.currentUser?.id,
      sessionId,
    ]),
  )

  const handleCallPress = useCallback(
    (call: CallHistoryItem) => {
      trackClick(`call_${call.id}`)
      trackContentChange({
        event: 'call_pressed',
        callId: call.id,
        timestamp: Date.now(),
      })

      // Navigate to call screen to initiate a new call
      const contactId =
        call.callerId === userStore.currentUser?.id
          ? call.receiverId
          : call.callerId
      const contactName =
        call.callerId === userStore.currentUser?.id
          ? call.receiver?.name
          : call.caller?.name
      const contactAvatar =
        call.callerId === userStore.currentUser?.id
          ? call.receiver?.avatarUrl
          : call.caller?.avatarUrl

      router.push({
        pathname: '/screens/call/call',
        params: {
          contactId,
          contactName: contactName || 'Unknown Contact',
          contactAvatar: contactAvatar || '',
          callType: call.callType,
        },
      })
    },
    [trackClick, trackContentChange, userStore.currentUser?.id, router],
  )

  const getCallType = (call: CallHistoryItem): string => {
    if (call.wasMissed) return 'missed'
    if (call.duration === 0) return 'cancelled'
    if (call.callerId === userStore.currentUser?.id) return 'outgoing'
    return 'incoming'
  }

  const getCallColor = (type: string) => {
    switch (type) {
      case 'incoming':
        return theme.colors.palette.success500
      case 'outgoing':
        return theme.colors.palette.primary500
      case 'missed':
        return theme.colors.palette.angry500
      case 'cancelled':
        return theme.colors.palette.neutral500
      default:
        return theme.colors.palette.neutral500
    }
  }

  const getCallIcon = (type: string, isVideo: boolean) => {
    if (type === 'missed' || type === 'cancelled') {
      return isVideo ? 'videocam-off' : 'call-outline'
    }
    return isVideo ? 'videocam' : 'call'
  }

  const getCallDisplayName = (call: CallHistoryItem) => {
    if (call.callerId === userStore.currentUser?.id) {
      return call.receiver?.name || 'Unknown Contact'
    }
    return call.caller?.name || 'Unknown Contact'
  }

  const getCallAvatar = (call: CallHistoryItem) => {
    if (call.callerId === userStore.currentUser?.id) {
      return call.receiver?.avatarUrl || null
    }
    return call.caller?.avatarUrl || null
  }

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays === 2) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays <= 7) {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }

  const clearCallHistory = useCallback(async () => {
    try {
      if (!userStore.currentUser?.id) return

      // Get all call IDs for the current user
      const userCalls = calls.filter(
        call =>
          call.callerId === userStore.currentUser?.id ||
          call.receiverId === userStore.currentUser?.id,
      )

      // Delete all calls
      for (const call of userCalls) {
        await mutations.deleteCallHistory(call.id)
      }

      // Reload call history
      await loadCallHistory()
      trackClick('clearCallHistory')
      trackContentChange({
        event: 'call_history_cleared',
        callsCleared: calls.length,
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error('Error clearing call history:', error)
    }
  }, [
    calls,
    userStore.currentUser?.id,
    loadCallHistory,
    trackClick,
    trackContentChange,
  ])

  const renderCallItem = ({ item }: { item: CallHistoryItem }) => {
    const callType = getCallType(item)
    const displayName = getCallDisplayName(item)
    const avatar = getCallAvatar(item)
    const isVideo = item.callType === 'video'

    const avatarUrl = avatar
    const hasValidAvatar =
      avatarUrl && isValidBase64(avatarUrl) && !failedAvatars.has(item.id)
    const initials = getInitials(displayName)

    return (
      <TouchableOpacity
        style={styles.callItem}
        onPress={() => handleCallPress(item)}
        activeOpacity={0.7}
      >
        {hasValidAvatar ? (
          <Image
            source={{
              uri: avatarUrl,
              // Add cache-busting to prevent caching issues
              cache: 'reload',
            }}
            style={styles.avatar}
            onError={() => handleAvatarError(item.id)}
            onLoad={() => handleAvatarLoad(item.id)}
            key={`${item.id}-${refreshKey}`} // Force re-render when refreshKey changes
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text
              text={initials}
              size="small"
              weight="bold"
              style={styles.avatarText}
            />
          </View>
        )}

        <View style={styles.callContent}>
          <View style={styles.callHeader}>
            <Text
              text={displayName}
              size="medium"
              weight="bold"
              style={styles.callName}
            />
            <View style={styles.callInfo}>
              <Ionicons
                name={getCallIcon(callType, isVideo)}
                size={16}
                color={getCallColor(callType)}
                style={styles.callIcon}
              />
              <Text
                text={formatDuration(item.duration)}
                size="small"
                style={styles.duration}
              />
            </View>
          </View>

          <View style={styles.callDetails}>
            <Text
              text={formatTimestamp(item.timestamp)}
              size="small"
              style={styles.timestamp}
            />
            {isVideo && (
              <View style={styles.videoIndicator}>
                <Ionicons
                  name="videocam"
                  size={12}
                  color={theme.colors.palette.neutral500}
                />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <Screen
      preset="scroll"
      backgroundColor={theme.colors.palette.neutral100}
      contentContainerStyle={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text text="Calls" preset="subheading" style={styles.title} />
      </View>

      {/* Call History */}
      <View style={styles.callHistory}>
        <View style={styles.sectionHeader}>
          <Text
            text="Recent Calls"
            size="large"
            weight="bold"
            style={styles.sectionTitle}
          />
          <TouchableOpacity
            onPress={() => {
              trackClick('clearCallHistory')
              trackContentChange({
                event: 'clear_call_history_pressed',
                timestamp: Date.now(),
              })
              clearCallHistory()
            }}
          >
            <Text text="Clear" size="small" style={styles.clearText} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.palette.primary500}
            />
            <Text
              text="Loading calls..."
              size="medium"
              style={styles.loadingText}
            />
          </View>
        ) : calls.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons
              name="call-outline"
              size={40}
              color={theme.colors.palette.neutral500}
            />
            <Text
              text="No recent calls."
              size="medium"
              style={styles.emptyStateText}
            />
          </View>
        ) : (
          <FlashList
            data={calls}
            renderItem={renderCallItem}
            estimatedItemSize={100}
            keyExtractor={item => item.id}
            key={`calls-list-${refreshKey}`} // Force re-render when refreshKey changes
            extraData={[failedAvatars]}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            overrideItemLayout={(layout, _item) => {
              layout.size = 100
            }}
          />
        )}
      </View>
    </Screen>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: metrics.medium,
      paddingTop: metrics.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: metrics.large,
    },
    title: {
      color: theme.colors.palette.neutral800,
    },
    callHistory: {
      flex: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: metrics.medium,
    },
    sectionTitle: {
      color: theme.colors.palette.neutral800,
    },
    clearText: {
      color: theme.colors.palette.primary500,
    },

    callItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: metrics.medium,
      paddingHorizontal: metrics.small,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: metrics.medium,
    },
    avatarPlaceholder: {
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: theme.colors.palette.neutral800,
    },
    callContent: {
      flex: 1,
    },
    callHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: metrics.tiny,
    },
    callName: {
      color: theme.colors.palette.neutral800,
    },
    callInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.tiny,
    },
    callIcon: {
      marginRight: metrics.tiny,
    },
    duration: {
      color: theme.colors.palette.neutral600,
    },
    callDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.small,
    },
    timestamp: {
      color: theme.colors.palette.neutral500,
    },
    videoIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: metrics.xxl,
    },
    loadingText: {
      marginTop: metrics.small,
      color: theme.colors.palette.neutral800,
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: metrics.xxl,
    },
    emptyStateText: {
      marginTop: metrics.small,
      color: theme.colors.palette.neutral600,
    },
  })
