import { EmptyState, ListView, Screen, Text, TextField } from '@/components'
import { queries } from '@/db/queries'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useStores } from '@/models'
import { metrics, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  StyleSheet,
  TouchableOpacity,
  View,
  RefreshControl,
  Platform,
  Dimensions,
  TextInput,
} from 'react-native'
import { observer } from 'mobx-react-lite'

interface Contact {
  contact: {
    id: number
    userId: number
    contactUserId: number
    nickname: string
    favorite: number
    createdAt: string
    updatedAt: string
  }
  user: {
    email: string
    firstName: string
    lastName: string
    phoneNumber: string
  }
}

interface SearchResult {
  contact: {
    id: number
    userId: number
    contactUserId: number
    nickname: string
    favorite: number
    createdAt: string
    updatedAt: string
  }
  user: {
    id: number
    email: string
    firstName: string
    lastName: string
    phoneNumber: string
  }
}

function ContactsScreen() {
  const { theme } = useAppTheme()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const { sessionStore, userStore, uiStore } = useStores()
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const styles = createStyles(theme)
  const { trackScreenMount, trackClick, trackTextChange, trackContentChange } =
    useInteractionTracking('Contacts', '/(tabs)/contacts')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const { width, height } = Dimensions.get('window')
  const searchInputRef = useRef<TextInput>(null)

  // Load session data if exists
  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession()
      console.log('session', session)

      if (session?.data?.sessionData) {
        console.log('session.data.sessionData', session.data.sessionData)
        const savedState = session.data.sessionData.formData as any

        // Restore state from session
        if (savedState) {
          // Restore search query if exists
          if (savedState.searchQuery) {
            setSearchQuery(savedState.searchQuery)
            trackTextChange('searchQuery', savedState.searchQuery)
            handleSearch(savedState.searchQuery)
          } else {
            setSearchQuery('')
            trackTextChange('searchQuery', '')
            handleSearch('')
            searchInputRef.current?.blur()
          }

          // Track content change after state restoration
          trackContentChange({
            event: 'session_state_restored',
            restoredState: savedState,
            timestamp: Date.now(),
          })
        }
      }
      setIsSessionLoaded(true)
    } else {
      // When no session exists, just set isSessionLoaded to true
      setIsSessionLoaded(true)
    }
  }, [sessionTimeStamp, sessionId])

  useEffect(() => {
    loadContacts()
  }, [uiStore.mockDataAppendTime])

  // Track screen mount with relevant data
  useFocusEffect(
    useCallback(() => {
      loadContacts()
      if (isSessionLoaded) {
        trackScreenMount({
          searchQuery,
          contactsCount: contacts.length,
          timestamp: Date.now(),
          platform: Platform.OS,
          screenDimensions: {
            width,
            height,
          },
          userProfileId: userStore.currentUser?.id,
          sessionId,
        })
      }
    }, [
      isSessionLoaded,
      contacts.length,
      searchQuery,
      width,
      height,
      userStore.currentUser?.id,
      sessionId,
    ]),
  )

  const loadContacts = async () => {
    if (!userStore.currentUser?.id) return

    setIsLoading(true)
    try {
      const userContacts = await queries.getUserContacts(
        userStore.currentUser.id,
      )
      setContacts(userContacts)
    } catch (error) {
      console.error('Failed to load contacts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (text: string) => {
    if (!userStore.currentUser?.id || !text.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const results = await queries.searchContacts(
        userStore.currentUser.id,
        text,
      )
      setSearchResults(results)
    } catch (error) {
      console.error('Failed to search contacts:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const filteredContacts = useMemo(() => {
    if (searchQuery) {
      // When searching, show search results with contacts at the top
      return searchResults.sort((a, b) => {
        // Sort contacts first (those with non-zero contact.id)
        if (a.contact.id !== b.contact.id) {
          return b.contact.id ? 1 : -1
        }
        // Then by favorite status
        if (a.contact.favorite !== b.contact.favorite) {
          return b.contact.favorite - a.contact.favorite
        }
        // Finally by name
        return a.user.firstName.localeCompare(b.user.firstName)
      })
    }

    // When not searching, show all contacts sorted by favorite and name
    return [...contacts].sort((a, b) => {
      if (a.contact.favorite !== b.contact.favorite) {
        return b.contact.favorite - a.contact.favorite
      }
      return a.user.firstName.localeCompare(b.user.firstName)
    })
  }, [contacts, searchQuery, searchResults])

  const renderContact = useCallback(
    ({ item: contact }: { item: Contact | SearchResult }) => (
      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => {
          trackClick(`contact_${contact.contact.contactUserId}`)
          router.push({
            pathname: '/screens/contact/[id]',
            params: { id: contact.contact.contactUserId },
          })
        }}
      >
        <View style={styles.contactMain}>
          <LinearGradient
            colors={[
              theme.colors.palette.primary400,
              theme.colors.palette.secondary400,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarContainer}
          >
            <Text
              text={`${contact.user.firstName[0]}${contact.user.lastName[0]}`.toUpperCase()}
              style={styles.avatarText}
            />
            {contact.contact.favorite === 1 && (
              <View style={styles.favoriteIcon}>
                <Ionicons
                  name="star"
                  size={12}
                  color={theme.colors.palette.primary500}
                />
              </View>
            )}
          </LinearGradient>
          <View style={styles.contactInfo}>
            <Text
              text={
                contact.contact.nickname ||
                `${contact.user.firstName} ${contact.user.lastName}`
              }
              size="lg"
              weight="bold"
              style={styles.contactName}
            />
            <View style={styles.contactMeta}>
              <View style={styles.contactBadge}>
                <Ionicons
                  name="mail-outline"
                  size={12}
                  color={theme.colors.textDim}
                />
                <Text
                  text={contact.user.email}
                  size="xs"
                  style={styles.metaText}
                />
              </View>
            </View>
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.textDim}
        />
      </TouchableOpacity>
    ),
    [trackClick],
  )

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await loadContacts()

      // Track content change when refresh completes
      trackContentChange({
        event: 'contacts_refreshed',
        contactsCount: contacts.length,
        timestamp: Date.now(),
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [contacts.length, trackContentChange])

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      handleSearch(searchQuery)

      // Track search text changes after debounce
      if (searchQuery) {
        trackTextChange('search', searchQuery)

        // Also track content change with additional details
        trackContentChange({
          event: 'search_query_changed',
          searchQuery,
          resultsCount: searchResults.length,
          timestamp: Date.now(),
        })
      }
    }, 300)

    return () => clearTimeout(debounceTimeout)
  }, [searchQuery])

  return (
    <Screen
      preset="fixed"
      backgroundColor={theme.colors.palette.neutral100}
      contentContainerStyle={styles.container}
    >
      <LinearGradient
        colors={[
          theme.colors.palette.primary400,
          theme.colors.palette.secondary400,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text text="Contacts" preset="heading" style={styles.title} />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.contentContainer}>
        <TextField
          placeholder="Search contacts"
          value={searchQuery}
          onChangeText={text => {
            setSearchQuery(text)
          }}
          ref={searchInputRef}
          LeftAccessory={() => (
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={20} color={theme.colors.textDim} />
            </View>
          )}
          RightAccessory={
            searchQuery
              ? () => (
                  <TouchableOpacity
                    style={styles.searchIconContainer}
                    onPress={() => {
                      setSearchQuery('')
                      trackClick('clear_search')
                    }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={theme.colors.textDim}
                    />
                  </TouchableOpacity>
                )
              : undefined
          }
          containerStyle={styles.searchContainer}
          inputWrapperStyle={styles.searchWrapper}
        />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text text="Loading contacts..." />
          </View>
        ) : isSearching ? (
          <View style={styles.loadingContainer}>
            <Text text="Searching..." />
          </View>
        ) : filteredContacts.length > 0 ? (
          <ListView
            data={filteredContacts}
            renderItem={renderContact}
            estimatedItemSize={72}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.palette.primary400}
                colors={[theme.colors.palette.primary400]}
              />
            }
          />
        ) : (
          <EmptyState
            preset="generic"
            heading="No contacts found"
            button="Clear search"
            buttonOnPress={() => {
              setSearchQuery('')
            }}
            content="Try adjusting your search"
            style={styles.emptyState}
          />
        )}
      </View>
    </Screen>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 0,
    },
    headerGradient: {
      paddingHorizontal: metrics.medium,
      paddingBottom: metrics.large,
      paddingTop: metrics.xl,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: metrics.medium,
    },

    title: {
      color: theme.colors.palette.neutral100,
      fontSize: 32,
      lineHeight: 40,
    },
    contentContainer: {
      flex: 1,
      marginTop: -24,
      paddingHorizontal: metrics.medium,
      backgroundColor: theme.colors.palette.neutral100,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    searchContainer: {
      marginVertical: metrics.medium,
    },
    searchWrapper: {
      backgroundColor: theme.colors.palette.neutral200,
      borderWidth: 0,
      borderRadius: 12,
      paddingHorizontal: metrics.small,
    },
    searchIconContainer: {
      padding: metrics.small,
    },
    listContent: {
      gap: metrics.small,
      paddingBottom: metrics.large,
    },
    contactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: metrics.medium,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      marginBottom: metrics.small,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    contactMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: metrics.medium,
    },
    avatarText: {
      fontSize: 24,
      color: theme.colors.palette.neutral100,
      fontWeight: 'bold',
    },
    contactInfo: {
      flex: 1,
    },
    contactName: {
      color: theme.colors.text,
      marginBottom: metrics.tiny,
    },
    contactMeta: {
      flexDirection: 'row',
      gap: metrics.small,
    },
    contactBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      paddingHorizontal: metrics.small,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    metaText: {
      color: theme.colors.textDim,
    },
    favoriteIcon: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusSmall,
      padding: metrics.tiny,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

export default observer(ContactsScreen)
