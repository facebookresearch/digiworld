// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { metrics, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Screen, Text } from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router'
import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { queries } from '@/db/queries'
import { isDatabaseReady } from '@/db'
import {
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
  TextInput,
} from 'react-native'
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
} from 'react-native-reanimated'
import { ChatConversation } from '@/app/types'

const HEADER_HEIGHT = 120
const TOOLBAR_HEIGHT = 80
const HEADER_SCROLL_DISTANCE = HEADER_HEIGHT - TOOLBAR_HEIGHT

export default function HomeScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const { userStore, sessionStore } = useStores()
  const scrollY = useSharedValue(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [chats, setChats] = useState<ChatConversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set())
  const [refreshKey, setRefreshKey] = useState(0)
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  // const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const searchInputRef = useRef<TextInput>(null)

  // Setup interaction tracking
  const { width, height } = Dimensions.get('window')
  const { trackTextChange, trackScreenMount, trackContentChange, trackClick } =
    useInteractionTracking('Home', '/(tabs)/home')

  // Load chat conversations from database
  const loadChats = useCallback(async () => {
    try {
      setIsLoading(true)
      // Check if database is ready
      if (!isDatabaseReady()) {
        console.error('Database not ready')
        setChats([])
        return
      }

      if (!userStore.currentUser?.id) {
        console.error('No current user')
        setChats([])
        return
      }

      // Get all chat conversations (individual + group)
      const conversations = await queries.getAllChatConversations(
        userStore.currentUser.id,
      )

      // Get user details for individual conversations
      const chatsWithDetails: ChatConversation[] = []
      for (const conversation of conversations) {
        if (conversation.type === 'individual') {
          const otherUser = await queries.getUserById(conversation.id)
          if (otherUser) {
            chatsWithDetails.push({
              ...conversation,
              name: otherUser.name || 'Unknown User',
              avatarUrl: otherUser.avatarUrl,
              otherUser,
            })
          }
        } else {
          // Group conversation - already has name and avatarUrl
          chatsWithDetails.push(conversation)
        }
      }

      setChats(chatsWithDetails)
      setRefreshKey(prev => prev + 1) // Force re-render when chats are loaded
    } catch (error) {
      console.error('Error loading chats:', error)
      setChats([])
    } finally {
      setIsLoading(false)
    }
  }, [userStore.currentUser?.id])

  // Load chats on mount and when user changes
  useEffect(() => {
    loadChats()
  }, [loadChats])

  // Restore search state from session when sessionId is present
  useEffect(() => {
    console.log('Home screen session restoration useEffect triggered:', {
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
          const metadata = session.data.sessionData.metadata as any

          console.log('Session data structure:', {
            formData: savedState,
            metadata,
            fullSessionData: session.data.sessionData,
          })

          // Restore state from session (following the same pattern as other apps)
          if (savedState) {
            console.log('Home screen session restoration:', {
              savedState,
              searchQuery: savedState.searchQuery,
              isSearchMode: savedState.isSearchMode,
              event: savedState.event,
              interactionType: session.data.sessionData.interactionType,
            })

            // Restore search query if exists (simple restoration like other apps)
            if (
              savedState.searchQuery !== undefined &&
              savedState.searchQuery !== ''
            ) {
              setSearchQuery(savedState.searchQuery)
              console.log('Restored search query:', savedState.searchQuery)
            }

            // Restore search mode if exists
            if (savedState.isSearchMode !== undefined) {
              setIsSearchMode(savedState.isSearchMode)
              console.log('Restored search mode:', savedState.isSearchMode)
            }

            // Focus the search input if search mode is restored and there's a search query
            if (savedState.isSearchMode && savedState.searchQuery) {
              setTimeout(() => {
                searchInputRef.current?.focus()
                console.log('Focused search input after restoration')
              }, 100)
            }

            // Track content change after state restoration
            trackContentChange({
              event: 'session_state_restored',
              restoredState: savedState,
              timestamp: Date.now(),
            })
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
  }, [sessionTimeStamp, sessionStore])

  // Track screen mount with relevant data
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        searchQuery,
        chatsCount: chats.length,
        timestamp: Date.now(),
        platform: Platform.OS,
        screenDimensions: { width, height },
        userProfileId: userStore.currentUser?.id,
        sessionId,
      })
    }, [
      trackScreenMount,
      chats.length,
      searchQuery,
      width,
      height,
      userStore.currentUser?.id,
      sessionId,
    ]),
  )

  // Refresh chat list when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Clear failed avatars to allow retrying image loads
      setFailedAvatars(new Set())

      // Force immediate reload and then another reload after delay to ensure updates are captured
      loadChats()

      const timer = setTimeout(() => {
        loadChats()
      }, 800)

      return () => clearTimeout(timer)
    }, [loadChats]),
  )

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      const velocity = (event.velocity ?? 0) as number

      if (Math.abs(velocity) > 500) {
        scrollY.value = withDecay({
          velocity,
          clamp: [0, HEADER_SCROLL_DISTANCE],
        })
      } else {
        scrollY.value = event.contentOffset.y
      }
    },
    onEndDrag: () => {
      if (scrollY.value < HEADER_SCROLL_DISTANCE / 2) {
        scrollY.value = withSpring(0, {
          damping: 15,
          stiffness: 100,
        })
      } else {
        scrollY.value = withSpring(HEADER_SCROLL_DISTANCE, {
          damping: 15,
          stiffness: 100,
        })
      }
    },
  })

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, HEADER_SCROLL_DISTANCE],
      [0, -HEADER_SCROLL_DISTANCE],
      Extrapolate.CLAMP,
    )

    return {
      transform: [
        {
          translateY: withSpring(translateY, {
            damping: 20,
            stiffness: 90,
            mass: 0.5,
          }),
        },
      ],
    }
  })

  const toolbarAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [HEADER_SCROLL_DISTANCE - 40, HEADER_SCROLL_DISTANCE],
      [0, 1],
      Extrapolate.CLAMP,
    )

    const scale = interpolate(
      scrollY.value,
      [HEADER_SCROLL_DISTANCE - 40, HEADER_SCROLL_DISTANCE],
      [0.8, 1],
      Extrapolate.CLAMP,
    )

    return {
      opacity: withSpring(opacity, {
        damping: 15,
        stiffness: 100,
      }),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [HEADER_SCROLL_DISTANCE - 40, HEADER_SCROLL_DISTANCE],
            [-20, 0],
            Extrapolate.CLAMP,
          ),
        },
        {
          scale: withSpring(scale, {
            damping: 15,
            stiffness: 100,
          }),
        },
      ],
    }
  })

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    trackContentChange({
      event: 'pull_to_refresh_started',
      timestamp: Date.now(),
    })

    await loadChats()
    setIsRefreshing(false)
    trackContentChange({
      event: 'pull_to_refresh_completed',
      timestamp: Date.now(),
    })
  }, [trackContentChange, loadChats])

  const handleChatPress = useCallback(
    async (chatId: string, chatType: 'individual' | 'group') => {
      trackClick(`chat_${chatId}`)

      // Route to different chat screens based on type
      if (chatType === 'group') {
        router.push(`/screens/chat/group/${chatId}`)
      } else {
        router.push(`/screens/chat/${chatId}`)
      }
    },
    [router, trackClick],
  )

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
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

  const handleAvatarError = (chatId: string, displayName: string) => {
    console.log('Avatar image failed to load for:', displayName)
    setFailedAvatars(prev => new Set(prev).add(chatId))
  }

  const handleAvatarLoad = (chatId: string, displayName: string) => {
    console.log('Avatar image loaded successfully for:', displayName)
    setFailedAvatars(prev => {
      const newSet = new Set(prev)
      newSet.delete(chatId)
      return newSet
    })
  }

  const renderChatItem = ({ item }: { item: ChatConversation }) => {
    const isLastMessageFromMe =
      item.lastMessage.senderId === userStore.currentUser?.id
    const isCurrentUserChat = item.id === userStore.currentUser?.id
    const displayName = isCurrentUserChat
      ? `${item.name || 'Unknown'} (you)`
      : item.name || 'Unknown'
    const avatarUrl = item.avatarUrl
    const hasValidAvatar =
      avatarUrl && isValidBase64(avatarUrl) && !failedAvatars.has(item.id)
    const initials = getInitials(displayName)
    const isGroup = item.type === 'group'

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(item.id, item.type)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {hasValidAvatar ? (
            <Image
              source={{
                uri: avatarUrl,
                // Add cache-busting to prevent caching issues
                cache: 'reload',
              }}
              style={styles.avatar}
              onError={() => handleAvatarError(item.id, displayName)}
              onLoad={() => handleAvatarLoad(item.id, displayName)}
              key={`${item.id}-${refreshKey}`} // Force re-render when refreshKey changes
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text
                text={initials}
                size="large"
                weight="bold"
                style={styles.avatarInitials}
              />
            </View>
          )}
          {!isGroup && (
            <View
              style={[
                styles.onlineIndicator,
                {
                  backgroundColor: theme.colors.palette.neutral400,
                },
              ]}
            />
          )}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text
              text={displayName}
              size="large"
              weight="bold"
              style={styles.chatName}
            />
            {isGroup && item.memberCount && item.memberCount > 0 && (
              <View style={styles.memberCountContainer}>
                <Ionicons
                  name="people"
                  size={12}
                  color={theme.colors.palette.neutral500}
                />
                <Text
                  text={item.memberCount.toString()}
                  size="tiny"
                  style={styles.memberCount}
                />
              </View>
            )}
          </View>
          <Text
            text={
              isLastMessageFromMe
                ? `You: ${item.lastMessage.content}`
                : item.lastMessage.content
            }
            size="medium"
            style={{
              ...styles.messageText,
              color: isLastMessageFromMe
                ? theme.colors.palette.primary500
                : theme.colors.palette.neutral600,
            }}
            numberOfLines={1}
          />
        </View>

        <View style={styles.chatRightSection}>
          <Text
            text={formatTimestamp(item.lastMessage.timestamp)}
            size="small"
            style={styles.timestamp}
          />
          {item.unreadCount > 0 && !isCurrentUserChat && (
            <View style={styles.unreadBadge}>
              <Text
                text={item.unreadCount.toString()}
                size="tiny"
                weight="bold"
                style={styles.unreadText}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const filteredChats = useMemo(() => {
    if (!searchQuery) {
      return chats
    }
    const lowerCaseQuery = searchQuery.toLowerCase()
    return chats.filter(
      chat =>
        chat.name?.toLowerCase().includes(lowerCaseQuery) ||
        (chat.otherUser?.name?.toLowerCase().includes(lowerCaseQuery) &&
          chat.type === 'individual'),
    )
  }, [chats, searchQuery])

  // Toggle search mode
  const toggleSearchMode = useCallback(() => {
    const newSearchMode = !isSearchMode
    trackContentChange({
      event: 'search_mode_toggled',
      isSearchMode: newSearchMode,
      searchQuery: newSearchMode ? searchQuery : '',
      timestamp: Date.now(),
    })
    setIsSearchMode(newSearchMode)

    // Focus the search input when entering search mode
    if (newSearchMode) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    } else {
      setSearchQuery('') // Clear search when exiting
    }
  }, [isSearchMode, trackContentChange, searchQuery])

  // Handle search text changes with tracking
  const handleSearchTextChange = useCallback(
    (text: string) => {
      console.log('Search text changed:', text)
      trackTextChange('searchQuery', text)
      trackContentChange({
        event: 'search_text_changed',
        searchQuery: text,
        isSearchMode,
        timestamp: Date.now(),
      })
      setSearchQuery(text)
    },
    [trackTextChange, trackContentChange, isSearchMode],
  )

  // Clear search
  const clearSearch = useCallback(() => {
    trackContentChange({
      event: 'search_cleared',
      searchQuery: '',
      isSearchMode: false,
      timestamp: Date.now(),
    })
    setSearchQuery('')
    setIsSearchMode(false)
  }, [trackContentChange])

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
            text="Loading chats..."
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
      {/* Animated Toolbar */}
      <Animated.View style={[styles.toolbar, toolbarAnimatedStyle]}>
        <View style={styles.toolbarContent}>
          <View style={styles.greetingContainer}>
            <Text
              text={`Hello ${userStore.currentUser?.name || 'User'} 👋`}
              preset="subheading"
              style={styles.greeting}
            />
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.palette.primary500}
            colors={[theme.colors.palette.primary500]}
            progressBackgroundColor={theme.colors.palette.neutral200}
          />
        }
      >
        {/* Header Section */}
        <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
          <View style={styles.header}>
            <View style={styles.greetingContainer}>
              <Text
                text={`Hello ${userStore.currentUser?.name || 'User'} 👋`}
                preset="subheading"
                style={styles.greeting}
              />
            </View>
          </View>

          {/* Search Bar */}
          {isSearchMode ? (
            <View style={styles.searchInputWrapper}>
              <Ionicons
                name="search"
                size={20}
                color={theme.colors.palette.neutral500}
                style={styles.searchIcon}
              />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearchTextChange}
                placeholder="Search chats..."
                placeholderTextColor={theme.colors.palette.neutral500}
                autoFocus={true}
                onFocus={() => {
                  trackContentChange({
                    event: 'search_focused',
                    isSearchFocused: true,
                    timestamp: Date.now(),
                  })
                }}
                onBlur={() => {
                  trackContentChange({
                    event: 'search_blurred',
                    isSearchFocused: false,
                    timestamp: Date.now(),
                  })
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={theme.colors.palette.neutral500}
                  />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.searchBar}
              onPress={() => {
                trackClick('searchBar')
                trackContentChange({
                  event: 'search_bar_pressed',
                  timestamp: Date.now(),
                })
                toggleSearchMode()
              }}
            >
              <Ionicons
                name="search-outline"
                size={20}
                color={theme.colors.palette.neutral500}
              />
              <Text
                text="Search"
                size="medium"
                style={styles.searchPlaceholder}
              />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Chat List */}
        <View style={styles.chatList} key={`chat-list-${refreshKey}`}>
          {filteredChats.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={theme.colors.palette.neutral400}
              />
              <Text
                text="No conversations yet"
                size="medium"
                weight="medium"
                style={styles.emptyTitle}
              />
              <Text
                text="Start a conversation with your contacts"
                size="small"
                style={styles.emptyDescription}
              />
            </View>
          ) : (
            <View key={refreshKey}>
              {filteredChats.map(item => (
                <View key={item.id}>{renderChatItem({ item })}</View>
              ))}
            </View>
          )}
        </View>
      </Animated.ScrollView>
    </Screen>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 0,
    },
    scrollContent: {
      paddingTop: HEADER_HEIGHT,
    },
    headerContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: HEADER_HEIGHT,
      zIndex: 1,
      backgroundColor: theme.colors.palette.neutral100,
      paddingHorizontal: metrics.medium,
      paddingTop: metrics.xl,
    },
    toolbar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: TOOLBAR_HEIGHT,
      zIndex: 2,
      backgroundColor: theme.colors.palette.neutral100,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    toolbarContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: metrics.medium,
      paddingTop: metrics.xl,
      height: '100%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: metrics.medium,
    },
    greetingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 4,
      gap: metrics.small,
    },
    greeting: {
      color: theme.colors.palette.neutral800,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: metrics.borderRadiusLarge,
      paddingHorizontal: metrics.medium,
      paddingVertical: metrics.small,
      gap: metrics.small,
    },
    searchPlaceholder: {
      color: theme.colors.palette.neutral500,
      flex: 1,
    },
    searchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: metrics.borderRadiusLarge,
      paddingHorizontal: metrics.medium,
      paddingVertical: metrics.small,
      gap: metrics.small,
    },
    searchIcon: {
      marginRight: metrics.tiny,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.palette.neutral800,
      paddingVertical: 0,
    },

    chatList: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },

    chatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: metrics.medium,
      paddingHorizontal: metrics.small,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
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
    avatarInitials: {
      color: theme.colors.palette.neutral800,
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral100,
    },
    chatContent: {
      flex: 1,
      flexDirection: 'column',
      gap: metrics.tiny,
      justifyContent: 'center',
    },
    chatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.tiny,
    },
    chatName: {
      color: theme.colors.palette.neutral800,
      fontSize: 16,
      fontWeight: 'bold',
    },
    memberCountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      paddingHorizontal: metrics.tiny,
      paddingVertical: metrics.tiny,
    },
    memberCount: {
      color: theme.colors.palette.neutral500,
      fontSize: 10,
    },
    messageText: {
      color: theme.colors.palette.neutral600,
    },
    chatRightSection: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: metrics.tiny,
    },
    timestamp: {
      color: theme.colors.palette.neutral500,
    },
    unreadBadge: {
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: metrics.tiny,
    },
    unreadText: {
      color: theme.colors.palette.neutral100,
      fontWeight: 'bold',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: metrics.large,
    },
    loadingText: {
      marginTop: metrics.medium,
      color: theme.colors.palette.neutral600,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: metrics.large,
    },
    emptyTitle: {
      marginTop: metrics.medium,
      textAlign: 'center',
      color: theme.colors.palette.neutral800,
    },
    emptyDescription: {
      marginTop: metrics.tiny,
      textAlign: 'center',
      color: theme.colors.palette.neutral600,
    },
  })
