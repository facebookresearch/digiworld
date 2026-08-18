// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import { AutoImage, Text } from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { observer } from 'mobx-react-lite'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

// Import hooks from local folder
import { ContactItem, SectionData } from '@/app/types'
import { useStores } from '@/models/helpers/useStores'
import { EmptyState, SearchHeader } from './components'
import SelectedContacts from './components/SelectedContacts'
import { useContactData, useProcessedContacts, useSearch } from './hooks'

type FlatListItem =
  | { type: 'header'; title: string; key: string; sectionData: SectionData }
  | { type: 'item'; item: ContactItem; key: string }

const ContactItemComponent = observer(
  ({
    item,
    failedAvatars,
    setFailedAvatars,
    sessionId,
    sessionStore,
    trackContentChange,
    effectiveModes,
  }: {
    item: ContactItem
    failedAvatars: Set<string>
    setFailedAvatars: React.Dispatch<React.SetStateAction<Set<string>>>
    sessionId?: string
    sessionStore: any
    trackContentChange: (data: any) => void
    effectiveModes: {
      effectiveIsGroupCreationMode: boolean
      effectiveIsAddToGroupMode: boolean
      sessionIsGroupCreationMode: boolean
      sessionNavigationSource: string | null
    }
  }) => {
    const { userStore } = useStores()
    const { theme } = useAppTheme()
    const styles = useMemo(() => createStyles(theme), [theme])

    // Add interaction tracking for contact items
    const { trackClick } = useInteractionTracking(
      'ContactItem',
      '/screens/contacts/contact-list',
    )

    // Memoize expensive computations
    const initials = useMemo(() => {
      if (!item.name) return 'U'
      return item.name
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2)
    }, [item.name])

    const isValidBase64 = (str: string) => {
      if (!str) return false
      return str.startsWith('data:image') || str.includes('base64')
    }

    const isSelected = userStore.isContactSelected(item.id)

    // Use effective modes that consider session data for rollback scenarios
    const isSelectionMode =
      effectiveModes.effectiveIsGroupCreationMode ||
      effectiveModes.effectiveIsAddToGroupMode

    const handleContactPress = useCallback(() => {
      trackClick('contactItem')
      trackContentChange({
        action: 'contact_press',
        contactId: item.id,
        contactName: item.name,
        contactType: item.type,
        isSelectionMode,
        timestamp: Date.now(),
      })

      if (isSelectionMode && item.type === 'database') {
        console.log('Contact pressed:', item.id)
        // Toggle selection in group creation mode or addToGroup mode
        userStore.toggleContactSelection(item.id)
        // Track selected contacts change
        trackContentChange({
          action: 'selected_contacts_updated',
          selectedContacts: userStore.selectedContacts.slice(),
          timestamp: Date.now(),
        })

        // Track contact selection change
        trackContentChange({
          action: 'contact_selection_toggled',
          contactId: item.id,
          contactName: item.name,
          contactType: item.type,
          isSelected: !isSelected, // The new state after toggle
          selectedContactsCount: userStore.selectedContacts.length,
          isGroupCreationMode: userStore.isGroupCreationMode,
          isAddToGroupMode: userStore.navigationSource === 'addToGroup',
          timestamp: Date.now(),
        })

        // Track selected contacts state separately
        trackContentChange({
          action: 'selected_contacts_updated',
          selectedContacts: userStore.selectedContacts.slice(),
          timestamp: Date.now(),
        })
      } else if (item.type === 'database') {
        // Navigate to chat screen for database contacts
        console.log('Navigating to chat with:', item.id)
        router.push(`/screens/chat/${item.id.replace('db-', '')}`)
      } else {
        // Handle contact item press (for future navigation or actions)
        console.log('Contact pressed:', item.name)
      }
    }, [
      item,
      isSelectionMode,
      userStore,
      router,
      trackClick,
      trackContentChange,
      sessionId,
      sessionStore,
      isSelected,
    ])

    return (
      <View style={styles.contactItem}>
        <TouchableOpacity
          style={styles.contactContent}
          onPress={handleContactPress}
          activeOpacity={0.7}
        >
          <View style={styles.contactAvatar}>
            {item.type === 'database' ? (
              item.avatarUrl &&
              isValidBase64(item.avatarUrl) &&
              !failedAvatars.has(item.id) ? (
                <AutoImage
                  source={{ uri: item.avatarUrl }}
                  style={styles.avatarImage}
                  onError={() => {
                    console.log('Contact avatar failed to load for:', item.name)
                    setFailedAvatars(prev => new Set([...prev, item.id]))
                  }}
                  onLoad={() => {
                    console.log(
                      'Contact avatar loaded successfully for:',
                      item.name,
                    )
                    setFailedAvatars(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(item.id)
                      return newSet
                    })
                  }}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text
                    preset="bold"
                    size="large"
                    style={styles.avatarInitials}
                  >
                    {initials}
                  </Text>
                </View>
              )
            ) : (
              <Ionicons
                name="person"
                size={24}
                color={theme.colors.palette.neutral100}
              />
            )}
            {/* Selection indicator for group creation mode or addToGroup mode */}
            {isSelectionMode && item.type === 'database' && isSelected && (
              <View style={styles.selectionIndicator}>
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={theme.colors.palette.neutral100}
                />
              </View>
            )}
          </View>
          <View style={styles.contactInfo}>
            <Text preset="formLabel" size="large" style={styles.contactName}>
              {item.name}
            </Text>
            <Text preset="formHelper" size="medium" style={styles.contactPhone}>
              {item.phoneNumber}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionContainer}></View>
      </View>
    )
  },
)

const ContactListScreen = observer(function ContactListScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { sessionId, action, sessionTimeStamp } = useLocalSearchParams<{
    sessionId?: string | string[]
    action?: string | string[]
    sessionTimeStamp?: string | string[]
  }>()
  const { userStore, sessionStore, uiStore } = useStores()
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set())
  const [isSessionRestored, setIsSessionRestored] = useState(false)

  // Helper function to calculate effective modes consistently
  const calculateEffectiveModes = useCallback(
    (sessionFormData?: any) => {
      const isAddToGroupMode = userStore.navigationSource === 'addToGroup'
      const isGroupCreationMode = userStore.isGroupCreationMode

      // Also consider session data for rollback scenarios
      const sessionIsGroupCreationMode =
        sessionFormData?.isGroupCreationMode || false
      const sessionNavigationSource = sessionFormData?.navigationSource || null

      // Use session data if current state is not set (rollback scenario)
      const effectiveIsGroupCreationMode =
        isGroupCreationMode || sessionIsGroupCreationMode
      const effectiveIsAddToGroupMode =
        isAddToGroupMode || sessionNavigationSource === 'addToGroup'

      return {
        effectiveIsGroupCreationMode,
        effectiveIsAddToGroupMode,
        sessionIsGroupCreationMode,
        sessionNavigationSource,
      }
    },
    [userStore.navigationSource, userStore.isGroupCreationMode],
  )

  // Add interaction tracking
  const { trackScreenMount, trackClick, trackTextChange, trackContentChange } =
    useInteractionTracking('ContactList', '/screens/contacts/contact-list')
  const { databaseUsers, loadingDatabaseUsers, loadDatabaseUsers } =
    useContactData()

  const { searchQuery, debouncedSearchQuery, setSearchQuery } = useSearch()

  // Clear search with tracking
  const clearSearch = useCallback(() => {
    console.log('Clearing search')
    setSearchQuery('')

    // Track search clear action
    trackContentChange({
      action: 'search_cleared',
      previousSearchQuery: searchQuery,
      timestamp: Date.now(),
    })
  }, [setSearchQuery, trackContentChange, searchQuery])

  // Track screen mount with simple state snapshot
  useEffect(() => {
    trackScreenMount({
      loadingDatabaseUsers,
      isGroupCreationMode: userStore.isGroupCreationMode,
      isAddToGroupMode: userStore.navigationSource === 'addToGroup',
      selectedContactsCount: userStore.selectedContacts.length,
      searchQuery,
      databaseUsersCount: databaseUsers.length,
      currentGroupMembers: userStore.currentGroupMembers.slice(),
      currentGroupMembersCount: userStore.currentGroupMembers.length,
      navigationSource: userStore.navigationSource,
      timestamp: Date.now(),
      platform: 'react-native',
      screenDimensions: { width: 0, height: 0 },
      sessionId,
    })
  }, [
    loadingDatabaseUsers,
    userStore.isGroupCreationMode,
    userStore.navigationSource,
    userStore.selectedContacts.length,
    userStore.currentGroupMembers,
    searchQuery,
    databaseUsers.length,
    sessionId,
  ])

  // Reset session restoration flag when sessionId changes
  useEffect(() => {
    setIsSessionRestored(false)
  }, [sessionId])

  // Simple session restoration - restore only current state
  useEffect(() => {
    if (sessionId && !isSessionRestored) {
      const session = sessionStore.getSession()
      if (session?.data?.sessionData) {
        const formData = session.data.sessionData.formData as any
        console.log('Restoring session data for contacts:', formData)

        // Simple restoration - just restore the current state values
        const sessionSearchQuery = formData.searchQuery || ''
        const sessionSelectedContacts = formData.selectedContacts || []
        const sessionAction = formData.action || ''
        const sessionCurrentGroupMembers = formData.currentGroupMembers || []
        const sessionIsGroupCreationMode = formData.isGroupCreationMode || false
        const sessionNavigationSource = formData.navigationSource || null

        // Check if we're in compose mode (not in selection modes)
        const isComposeMode =
          !userStore.isGroupCreationMode &&
          userStore.navigationSource !== 'addToGroup'

        // Restore search query if session has one and it's different from current
        if (sessionSearchQuery && sessionSearchQuery !== searchQuery) {
          setSearchQuery(sessionSearchQuery)

          // Force update the debounced search query for immediate filtering
          // This ensures the filtered data is visible immediately after restoration
          setTimeout(() => {
            setSearchQuery(sessionSearchQuery)
          }, 100)
        } else if (sessionSearchQuery && searchQuery === '') {
          setSearchQuery(sessionSearchQuery)

          // Force update the debounced search query for immediate filtering
          setTimeout(() => {
            setSearchQuery(sessionSearchQuery)
          }, 100)
        }

        // Special handling for compose mode - always restore search if available
        if (
          isComposeMode &&
          sessionSearchQuery &&
          searchQuery !== sessionSearchQuery
        ) {
          setSearchQuery(sessionSearchQuery)

          // Force update the debounced search query for immediate filtering
          setTimeout(() => {
            setSearchQuery(sessionSearchQuery)
          }, 100)
        }

        // Restore current group members for addToGroup mode
        if (
          userStore.navigationSource === 'addToGroup' &&
          sessionCurrentGroupMembers.length > 0 &&
          Array.isArray(sessionCurrentGroupMembers)
        ) {
          console.log(
            'Restoring current group members:',
            sessionCurrentGroupMembers,
          )
          userStore.setCurrentGroupMembers(sessionCurrentGroupMembers)
        }

        // Restore selected contacts only if the session action indicates it was a selection action
        // Also check if session indicates we were in selection mode
        // Use the helper function for consistent mode calculation
        const effectiveModesForRestoration = calculateEffectiveModes(formData)
        const isSelectionMode =
          effectiveModesForRestoration.effectiveIsGroupCreationMode ||
          effectiveModesForRestoration.effectiveIsAddToGroupMode

        const isSelectionAction =
          sessionAction.includes('selected_contacts') ||
          sessionAction.includes('contact_selection') ||
          sessionAction.includes('contact_press')

        // Special handling for contact_selection_removed action
        if (sessionAction === 'contact_selection_removed') {
          console.log(
            'Contact selection was removed in session, restoring remaining contacts:',
            sessionSelectedContacts,
          )
          userStore.clearSelectedContacts()
          // Restore the remaining contacts that were tracked
          if (
            sessionSelectedContacts.length > 0 &&
            Array.isArray(sessionSelectedContacts)
          ) {
            sessionSelectedContacts.forEach((contactId: string) => {
              if (
                typeof contactId === 'string' &&
                (contactId.startsWith('db-') || contactId.startsWith('phone-'))
              ) {
                userStore.toggleContactSelection(contactId)
              }
            })
          }
        } else if (
          isSelectionMode &&
          isSelectionAction &&
          sessionSelectedContacts.length > 0 &&
          Array.isArray(sessionSelectedContacts)
        ) {
          console.log(
            'Restoring selected contacts (selection action):',
            sessionSelectedContacts,
            {
              isSelectionMode,
              isSelectionAction,
              sessionAction,
            },
          )
          userStore.clearSelectedContacts()
          sessionSelectedContacts.forEach((contactId: string) => {
            if (
              typeof contactId === 'string' &&
              (contactId.startsWith('db-') || contactId.startsWith('phone-'))
            ) {
              userStore.toggleContactSelection(contactId)
            }
          })
        } else if (
          isSelectionMode &&
          sessionSelectedContacts.length === 0 &&
          isSelectionAction
        ) {
          // If session shows no selected contacts and it was a selection action, clear current selection
          console.log('Clearing selected contacts (no selection in session)')
          userStore.clearSelectedContacts()
        } else if (
          isSelectionMode &&
          sessionSelectedContacts.length > 0 &&
          Array.isArray(sessionSelectedContacts) &&
          !isSelectionAction
        ) {
          // Special case for addToGroup mode: restore contacts even if not a selection action
          // This handles the case where user selected contacts, navigated away, and came back
          console.log(
            'Restoring selected contacts in addToGroup mode (non-selection action):',
            sessionSelectedContacts,
          )
          userStore.clearSelectedContacts()
          sessionSelectedContacts.forEach((contactId: string) => {
            if (
              typeof contactId === 'string' &&
              (contactId.startsWith('db-') || contactId.startsWith('phone-'))
            ) {
              userStore.toggleContactSelection(contactId)
            }
          })
        } else {
          console.log(
            'Not restoring contact selection - not a selection action or not in selection mode',
            {
              isSelectionMode,
              isSelectionAction,
              sessionSelectedContactsLength: sessionSelectedContacts.length,
              sessionAction,
              sessionIsGroupCreationMode,
              sessionNavigationSource,
            },
          )
        }

        // Track the restoration
        trackContentChange({
          action: 'session_restored',
          restoredSearchQuery: sessionSearchQuery,
          restoredSelectedContacts: sessionSelectedContacts,
          restoredCurrentGroupMembers: sessionCurrentGroupMembers,
          currentSearchQuery: searchQuery,
          currentSelectedContacts: userStore.selectedContacts.slice(),
          currentGroupMembers: userStore.currentGroupMembers.slice(),
          isSelectionMode,
          timestamp: Date.now(),
        })

        setIsSessionRestored(true)
      }
    }
  }, [
    sessionId,
    sessionStore,
    setSearchQuery,
    isSessionRestored,
    userStore,
    trackContentChange,
    searchQuery,
  ])

  // Also restore search when screen comes into focus (for navigation back)
  useFocusEffect(
    useCallback(() => {
      if (sessionId && !isSessionRestored) {
        const session = sessionStore.getSession()
        if (session?.data?.sessionData) {
          const formData = session.data.sessionData.formData as any

          // Recursive function to find the most recent search state from nested data
          const findMostRecentSearchState = (
            data: any,
            depth = 0,
          ): {
            searchQuery: string
            searchInput: string
            action: string
            depth: number
          } => {
            if (!data || depth > 10) {
              return { searchQuery: '', searchInput: '', action: '', depth }
            }

            const currentSearchQuery = data.searchQuery || ''
            const currentSearchInput = data.searchInput || ''
            const currentAction = data.action || ''

            // Check if this level has search-related data
            const isSearchAction =
              currentAction.includes('search') ||
              currentAction.includes('input') ||
              currentAction === 'clear' ||
              currentAction === 'search_cleared'

            // If this level has search data, return it
            if (isSearchAction && (currentSearchQuery || currentSearchInput)) {
              return {
                searchQuery: currentSearchQuery,
                searchInput: currentSearchInput,
                action: currentAction,
                depth,
              }
            }

            // If this level doesn't have search data, check nested restoredState
            if (data.restoredState) {
              const nestedResult = findMostRecentSearchState(
                data.restoredState,
                depth + 1,
              )
              if (nestedResult.searchQuery || nestedResult.searchInput) {
                return nestedResult
              }
            }

            // Return current level data if no nested search data found
            return {
              searchQuery: currentSearchQuery,
              searchInput: currentSearchInput,
              action: currentAction,
              depth,
            }
          }

          // Find the most recent search state
          const mostRecentSearchState = findMostRecentSearchState(formData)

          // Restore search query from the most recent search state
          const {
            searchQuery: foundSearchQuery,
            searchInput: foundSearchInput,
            depth,
          } = mostRecentSearchState

          // Check if the CURRENT level (top-level) has a search-related action
          const currentAction = formData.action || ''
          const isCurrentLevelSearchAction =
            currentAction.includes('search') ||
            currentAction.includes('input') ||
            currentAction === 'clear' ||
            currentAction === 'search_cleared'

          // Only restore if the current level is a search action and we found search data
          if (
            isCurrentLevelSearchAction &&
            (foundSearchQuery || foundSearchInput) &&
            searchQuery === ''
          ) {
            const searchToRestore = foundSearchQuery || foundSearchInput
            console.log(
              `Restoring search query on focus from depth ${depth}:`,
              searchToRestore,
            )
            setSearchQuery(searchToRestore)

            // Force update the debounced search query for immediate filtering
            setTimeout(() => {
              setSearchQuery(searchToRestore)
            }, 100)
          } else {
            console.log(
              'No search query to restore on focus - current level not a search action or no restoration needed',
            )
          }

          // Restore current group members for addToGroup mode when navigating back
          const sessionCurrentGroupMembers = formData.currentGroupMembers || []
          if (
            userStore.navigationSource === 'addToGroup' &&
            sessionCurrentGroupMembers.length > 0 &&
            Array.isArray(sessionCurrentGroupMembers)
          ) {
            console.log(
              'Restoring current group members on focus (navigation back):',
              sessionCurrentGroupMembers,
            )
            userStore.setCurrentGroupMembers(sessionCurrentGroupMembers)
          }

          // Restore contact selection for addToGroup mode when navigating back
          const sessionSelectedContacts = formData.selectedContacts || []
          // Use the helper function for consistent mode calculation
          const effectiveModesForFocus = calculateEffectiveModes(formData)
          const isSelectionMode =
            effectiveModesForFocus.effectiveIsGroupCreationMode ||
            effectiveModesForFocus.effectiveIsAddToGroupMode

          if (
            isSelectionMode &&
            sessionSelectedContacts.length > 0 &&
            Array.isArray(sessionSelectedContacts)
          ) {
            console.log(
              'Restoring selected contacts on focus (navigation back):',
              sessionSelectedContacts,
            )
            userStore.clearSelectedContacts()
            sessionSelectedContacts.forEach((contactId: string) => {
              if (
                typeof contactId === 'string' &&
                (contactId.startsWith('db-') || contactId.startsWith('phone-'))
              ) {
                userStore.toggleContactSelection(contactId)
              }
            })
          }
        }
      }
    }, [
      sessionId,
      sessionStore,
      setSearchQuery,
      searchQuery,
      isSessionRestored,
      userStore,
    ]),
  )

  // If dbrefresh keeps us on the same screen, focus will not change.
  // Use the deeplink params and UI store signal to refresh contact data.
  useEffect(() => {
    const first = (v: unknown) => (Array.isArray(v) ? v[0] : v)
    const currentAction = first(action)
    const stamp = first(sessionTimeStamp)
    if (currentAction === 'dbrefresh' && stamp) {
      uiStore.setMockDataAppended()
      loadDatabaseUsers()
    }
  }, [action, sessionTimeStamp, uiStore, loadDatabaseUsers])

  useEffect(() => {
    loadDatabaseUsers()
  }, [loadDatabaseUsers, uiStore.mockDataAppendTime])

  // Check navigation source before showing contacts
  useFocusEffect(
    useCallback(() => {
      const checkNavigation = async () => {
        // Check if user should be on this screen (not coming from settings)
        // Allow navigation if we have a sessionId (rollback scenario)
        const shouldBeOnContactsScreen =
          userStore.navigationSource === 'compose' ||
          userStore.navigationSource === 'addToGroup' ||
          userStore.isGroupCreationMode ||
          !!sessionId // Allow if we have a sessionId (rollback scenario)

        if (!shouldBeOnContactsScreen) {
          console.log(
            'User should not be on contacts screen, redirecting to home',
          )
          trackContentChange({
            action: 'redirect_to_home_from_contacts',
            reason: 'no_navigation_source',
            timestamp: Date.now(),
          })
          router.replace('/(tabs)/home')
        }
      }

      checkNavigation()
    }, [trackContentChange, userStore, router, sessionId]),
  )

  // Refresh database users when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Refreshing database users on focus...')
      loadDatabaseUsers()
    }, [loadDatabaseUsers, uiStore.mockDataAppendTime]),
  )

  const handleBack = useCallback(() => {
    trackClick('backButton')
    trackContentChange({
      action: 'navigation_back',
      selectedContactsCount: userStore.selectedContacts.length,
      isGroupCreationMode: userStore.isGroupCreationMode,
      isAddToGroupMode: userStore.navigationSource === 'addToGroup',
      timestamp: Date.now(),
    })
    userStore.clearNavigationSource()
    userStore.clearSelectedContacts()
    router.back()
  }, [userStore, router, trackClick, trackContentChange])

  // Simple search handling
  const handleSearchChange = useCallback(
    (query: string) => {
      // Mark session as restored when user starts typing to prevent conflicts
      if (!isSessionRestored) {
        setIsSessionRestored(true)
      }

      trackTextChange('searchInput', query)
      setSearchQuery(query)

      // Track current state after search change
      trackContentChange({
        action: 'search_input',
        searchQuery: query,
        selectedContactsCount: userStore.selectedContacts.length,
        isGroupCreationMode: userStore.isGroupCreationMode,
        isAddToGroupMode: userStore.navigationSource === 'addToGroup',
        timestamp: Date.now(),
      })
    },
    [
      setSearchQuery,
      trackTextChange,
      trackContentChange,
      isSessionRestored,
      userStore,
    ],
  )

  const { sections } = useProcessedContacts(databaseUsers, debouncedSearchQuery)

  // Calculate effective modes considering session data for rollback scenarios
  const effectiveModes = useMemo(() => {
    const session = sessionId ? sessionStore.getSession() : null
    const sessionFormData = session?.data?.sessionData?.formData as any

    return calculateEffectiveModes(sessionFormData)
  }, [calculateEffectiveModes, sessionId, sessionStore])

  const filteredSections = useMemo(() => {
    const { effectiveIsGroupCreationMode, effectiveIsAddToGroupMode } =
      effectiveModes

    // Debug logging for filtering
    if (
      (effectiveIsAddToGroupMode || effectiveIsGroupCreationMode) &&
      userStore.currentGroupMembers.length > 0
    ) {
      console.log('Contact filtering debug:', {
        isAddToGroupMode: userStore.navigationSource === 'addToGroup',
        isGroupCreationMode: userStore.isGroupCreationMode,
        sessionIsGroupCreationMode: effectiveModes.sessionIsGroupCreationMode,
        sessionNavigationSource: effectiveModes.sessionNavigationSource,
        effectiveIsGroupCreationMode,
        effectiveIsAddToGroupMode,
        currentGroupMembers: userStore.currentGroupMembers,
        totalContacts: sections.flatMap(s => s.data).length,
        databaseContacts: sections
          .flatMap(s => s.data)
          .filter(c => c.type === 'database').length,
      })
    }

    return sections.map(section => ({
      ...section,
      data: section.data.filter(contact => {
        // Don't filter in other modes
        if (!effectiveIsAddToGroupMode && !effectiveIsGroupCreationMode) {
          return true
        }

        if (contact.type !== 'database') return true

        // Filter out current user in group creation mode
        if (effectiveIsGroupCreationMode) {
          const isCurrentUser = contact.id === `db-${userStore.currentUser?.id}`
          if (isCurrentUser) {
            console.log('Filtering out current user in group creation mode:', {
              contactId: contact.id,
              contactName: contact.name,
              currentUserId: userStore.currentUser?.id,
              isGroupCreationMode: userStore.isGroupCreationMode,
              sessionIsGroupCreationMode:
                effectiveModes.sessionIsGroupCreationMode,
              effectiveIsGroupCreationMode,
            })
            return false
          }
        }

        // Filter out existing group members and current user in addToGroup mode
        if (effectiveIsAddToGroupMode) {
          const contactRawId = contact.id.replace('db-', '')

          // Filter out existing group members
          const isExistingMember =
            userStore.currentGroupMembers.includes(contactRawId)

          // Filter out current user (they're already in the group)
          const isCurrentUser = contact.id === `db-${userStore.currentUser?.id}`

          const shouldFilter = isExistingMember || isCurrentUser

          // Debug logging for filtered contacts
          if (shouldFilter) {
            console.log('Filtering out contact in addToGroup mode:', {
              contactId: contact.id,
              contactName: contact.name,
              contactRawId,
              isExistingMember,
              isCurrentUser,
              currentUserId: userStore.currentUser?.id,
              currentGroupMembers: userStore.currentGroupMembers,
            })
          }

          return !shouldFilter
        }

        return true
      }),
    }))
  }, [
    sections,
    userStore.currentGroupMembers,
    userStore.navigationSource,
    userStore.isGroupCreationMode,
    userStore.currentUser?.id,
    sessionId,
    sessionStore,
  ])

  const flatData: FlatListItem[] = useMemo(() => {
    return filteredSections.flatMap(section => [
      {
        type: 'header' as const,
        title: section.title,
        key: `header-${section.title}`,
        sectionData: section,
      },
      ...section.data.map(item => ({
        type: 'item' as const,
        item,
        key: item.id,
      })),
    ])
  }, [filteredSections])

  // Section header component - specific to this screen
  const SectionHeaderComponent = React.memo(
    ({ section }: { section: SectionData }) => (
      <View style={styles.sectionHeader}>
        <Text preset="default" size="large" style={styles.sectionTitle}>
          {section.title}
        </Text>
        <Text preset="formHelper" size="small" style={styles.sectionCount}>
          {section.data.length} contacts
        </Text>
      </View>
    ),
  )

  // Get selected contacts data - use effective modes for consistency
  const isSelectionMode =
    effectiveModes.effectiveIsGroupCreationMode ||
    effectiveModes.effectiveIsAddToGroupMode

  const selectedContacts = isSelectionMode
    ? filteredSections
        .flatMap(s => s.data)
        .filter(c => userStore.isContactSelected(c.id))
    : []

  const isLoading = loadingDatabaseUsers

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={theme.colors.palette.primary500}
        />
        <Text preset="formLabel" size="medium" style={styles.loadingText}>
          Loading users...
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onClearSearch={clearSearch}
        onBack={handleBack}
      />

      {/* Selected Contacts for Group Creation or AddToGroup */}
      {(() => {
        console.log('Rendering SelectedContacts:', {
          isGroupMode: userStore.isGroupCreationMode,
          isAddToGroupMode: userStore.navigationSource === 'addToGroup',
          sessionIsGroupCreationMode: effectiveModes.sessionIsGroupCreationMode,
          sessionNavigationSource: effectiveModes.sessionNavigationSource,
          isSelectionMode,
          selectedCount: selectedContacts.length,
          selectedContacts: selectedContacts.map(c => ({
            id: c.id,
            name: c.name,
          })),
          userStoreSelectedContacts: userStore.selectedContacts.slice(),
        })
        return (
          isSelectionMode && (
            <SelectedContacts selectedContacts={selectedContacts} />
          )
        )
      })()}

      <FlashList
        data={flatData}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return <SectionHeaderComponent section={item.sectionData} />
          } else {
            return (
              <ContactItemComponent
                item={item.item}
                failedAvatars={failedAvatars}
                setFailedAvatars={setFailedAvatars}
                sessionId={sessionId as string}
                sessionStore={sessionStore}
                trackContentChange={trackContentChange}
                effectiveModes={effectiveModes}
              />
            )
          }
        }}
        keyExtractor={item => item.key}
        estimatedItemSize={70}
        extraData={[userStore.selectedContacts.slice(), failedAvatars]}
        ListEmptyComponent={<EmptyState searchQuery={debouncedSearchQuery} />}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        overrideItemLayout={(layout, _item) => {
          layout.size = 70
        }}
      />

      {(() => {
        const shouldShowSelectionFab =
          (effectiveModes.effectiveIsGroupCreationMode ||
            effectiveModes.effectiveIsAddToGroupMode) &&
          selectedContacts.length > 0

        console.log('FAB button visibility check:', {
          effectiveIsGroupCreationMode:
            effectiveModes.effectiveIsGroupCreationMode,
          effectiveIsAddToGroupMode: effectiveModes.effectiveIsAddToGroupMode,
          selectedContactsCount: selectedContacts.length,
          shouldShowSelectionFab,
          sessionId,
        })

        return (
          <>
            {shouldShowSelectionFab ? (
              <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                  trackClick('fabButton')
                  trackContentChange({
                    action: 'fab_press',
                    selectedContactsCount: selectedContacts.length,
                    selectedContacts: selectedContacts.map(c => ({
                      id: c.id,
                      name: c.name,
                      type: c.type,
                    })),
                    isGroupCreationMode:
                      effectiveModes.effectiveIsGroupCreationMode,
                    isAddToGroupMode: effectiveModes.effectiveIsAddToGroupMode,
                    timestamp: Date.now(),
                  })

                  // Track final state before navigation
                  trackContentChange({
                    action: 'navigation_state_final',
                    selectedContacts: selectedContacts.map(c => c.id),
                    navigationAction:
                      effectiveModes.effectiveIsGroupCreationMode
                        ? 'create_group'
                        : 'add_to_group',
                    timestamp: Date.now(),
                  })

                  // Use effective modes for navigation decisions to handle rollback scenarios
                  if (effectiveModes.effectiveIsGroupCreationMode) {
                    userStore.setSelectedContactObjects(selectedContacts)
                    router.push('/screens/groups/create-group')
                  } else if (effectiveModes.effectiveIsAddToGroupMode) {
                    // For addToGroup mode, set selected contacts and go back
                    userStore.setSelectedContactObjects(selectedContacts)
                    router.back()
                  }
                }}
              >
                <Ionicons
                  name="arrow-forward"
                  size={24}
                  color={theme.colors.palette.neutral100}
                />
              </TouchableOpacity>
            ) : null}
          </>
        )
      })()}
    </View>
  )
})

export default ContactListScreen

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    contactContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    contactAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.palette.primary500,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    contactInfo: {
      flex: 1,
    },
    contactName: {
      color: theme.colors.palette.neutral800,
    },
    contactPhone: {
      color: theme.colors.palette.neutral600,
      marginBottom: 2,
    },
    actionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 16,
    },
    inviteButton: {
      padding: 8,
      marginRight: 12,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
    },
    loadingText: {
      color: theme.colors.palette.neutral600,
      marginTop: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      backgroundColor: theme.colors.palette.neutral100,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    sectionTitle: {
      color: theme.colors.palette.neutral700,
      marginBottom: 4,
    },
    sectionCount: {
      color: theme.colors.palette.neutral600,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 28,
    },
    avatarInitials: {
      color: theme.colors.palette.neutral800,
      fontSize: 20,
      fontWeight: 'bold',
    },
    selectionIndicator: {
      position: 'absolute',
      bottom: 2,
      left: 2,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.palette.primary500, // Selected state
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral100, // Selected border
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.palette.primary500,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.transparent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 5,
    },
    avatarPlaceholder: {
      width: '100%',
      height: '100%',
      borderRadius: 28,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })
