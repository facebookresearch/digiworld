// Copyright (c) Meta Platforms, Inc. and affiliates.
import { DrawerContent } from '@/components/email/DrawerContent'
import { EmailList } from '@/components/email/EmailList'
import { FloatingActionButton } from '@/components/email/FloatingActionButton'
import SearchHeader from '@/components/email/SearchHeader'
import { Screen } from '@/components/Screen'
import { queries } from '@/db/queries'
import {
  DataFilter,
  MailFolder,
  mapDatabaseEmailToModel,
} from '@/models/EmailModel'
import { useStores } from '@/models/helpers/useStores'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { EmptyState } from '@/components/email/EmptyState'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useIsFocused } from '@react-navigation/native'
import { DateFilter } from '@/components/DateFilter'

export default observer(function MailsScreen() {
  const insets = useSafeAreaInsets()
  const { sessionTimeStamp } = useLocalSearchParams()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const { sessionStore, userStore, uiStore } = useStores()
  const [searchQuery, setSearchQuery] = useState('')
  const forceCountRef = useRef(false)
  const restoredSessionRef = useRef<string | null>(null)
  const searchHeaderRef = useRef<{
    focusInput: () => void
    blurInput: () => void
  } | null>(null)

  const [currentFolder, setCurrentFolder] = useState<MailFolder | 'all'>(
    'inbox',
  )
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const drawerAnimation = useRef(new Animated.Value(0)).current
  const { trackTextChange, trackScreenMount, trackContentChange, trackClick } =
    useInteractionTracking('inbox', '/(tabs)/inbox')
  const userEmail = userStore.currentUser?.email ?? ''
  const isFocused = useIsFocused()
  // Add refresh timestamp to force updates
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now())

  // Get filter state from store (reactive - observer tracks property access)
  // Access filterState property directly for reactivity, then convert
  const rawFilterState = uiStore.filterState
  const selectedFilterDates: DataFilter | undefined = rawFilterState
    ? {
        date: rawFilterState.date
          ? {
              from: rawFilterState.date.from
                ? new Date(rawFilterState.date.from)
                : null,
              to: rawFilterState.date.to
                ? new Date(rawFilterState.date.to)
                : null,
            }
          : undefined,
        categories: rawFilterState.categories,
      }
    : undefined
  const showFilter = uiStore.showFilter

  const emailsResult = useLiveQuery(
    queries.getEmailsByFolderQuery(currentFolder, userEmail).baseQuery,
    [currentFolder, userEmail, refreshTimestamp, uiStore.mockDataAppendTime],
  )

  // Use live query for folder counts
  const folderCountsResult = useLiveQuery(
    queries.getAllFolderCountsQuery(userEmail),
    [currentFolder, userEmail, refreshTimestamp],
  )

  // Memoize emails first
  const emails = useMemo(() => {
    return Array.isArray(emailsResult?.data)
      ? emailsResult.data.map(mapDatabaseEmailToModel)
      : []
  }, [emailsResult?.data])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        screen: 'inbox',
        route: '/(tabs)/inbox',
        email: userStore.currentUser?.email,
        timeStamp: Date.now(),
        currentFolder,
        drawerOpen: isDrawerOpen,
        showFilter,
        selectedFilterDates,
      })
    }, [
      trackScreenMount,
      userStore.currentUser?.email,
      currentFolder,
      isDrawerOpen,
      showFilter,
      selectedFilterDates,
    ]),
  )

  // Memoize folder counts with logging
  const folderCounts = useMemo(() => {
    const counts = folderCountsResult?.data?.[0] ?? {
      inbox: 0,
      sent: 0,
      draft: 0,
      trash: 0,
      archived: 0,
    }

    const allCount = Object.values(counts).reduce(
      (sum: number, count: unknown) => sum + ((count as number) ?? 0),
      0,
    )

    return {
      ...counts,
      all: allCount,
    }
  }, [folderCountsResult?.data, currentFolder, emails.length])

  useEffect(() => {
    if (uiStore.mockDataAppendTime) {
      setRefreshTimestamp(Date.now())
    }
  }, [uiStore.mockDataAppendTime])

  useEffect(() => {
    if (isFocused) {
      setRefreshTimestamp(Date.now())
    }
  }, [isFocused])

  // Update delete handler to use timestamp
  const handleEmailDelete = useCallback(async () => {
    try {
      setRefreshTimestamp(Date.now())
    } catch (error) {
      console.error('Failed to update after delete:', error)
    }
  }, [])

  useEffect(() => {
    // Convert sessionTimeStamp to string for comparison
    const sessionId = Array.isArray(sessionTimeStamp)
      ? sessionTimeStamp[0]
      : sessionTimeStamp

    if (sessionId && restoredSessionRef.current !== sessionId) {
      console.log('sessionTimeStamp', sessionId)
      restoredSessionRef.current = sessionId // Mark as restored immediately to prevent re-runs

      const session = sessionStore.getSession()
      const sessionInfo = session?.data as any
      if (sessionInfo?.sessionData?.formData) {
        const {
          drawerOpen: expectedDrawerState,
          currentFolder,
          searchQuery: restoredSearchQuery,
          showFilter,
          selDate,
          selCategories,
          selectedFilter,
        } = sessionInfo.sessionData.formData
        console.log('Restoring session data:', sessionInfo.sessionData.formData)

        // Restore filter state to store
        const hasValidDate = selDate?.from && selDate?.to
        const hasValidCategories = selCategories?.length > 0

        if (hasValidDate || hasValidCategories) {
          uiStore.setFilterState({
            date: hasValidDate
              ? {
                  from: new Date(selDate.from),
                  to: new Date(selDate.to),
                }
              : undefined,
            categories: hasValidCategories ? selCategories : undefined,
          })
        }
        if (selectedFilter) {
          uiStore.setFilterSelectedTab(selectedFilter)
        }
        uiStore.setShowFilter(showFilter || false)

        setCurrentFolder(currentFolder || 'inbox')
        setSearchQuery(restoredSearchQuery || '')
        trackTextChange('searchQuery', restoredSearchQuery || '')

        // Only toggle drawer if state actually differs
        if (
          expectedDrawerState !== undefined &&
          expectedDrawerState !== isDrawerOpen
        ) {
          setIsDrawerOpen(expectedDrawerState)
          if (expectedDrawerState) {
            // Open drawer
            Animated.spring(drawerAnimation, {
              toValue: 1,
              useNativeDriver: true,
              bounciness: 0,
              speed: 15,
            }).start()
          } else {
            // Close drawer
            Animated.spring(drawerAnimation, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 0,
              speed: 15,
            }).start()
          }
        }

        if (restoredSearchQuery) {
          setTimeout(() => {
            searchHeaderRef.current?.focusInput()
          }, 100)
        } else {
          setTimeout(() => {
            searchHeaderRef.current?.blurInput()
          }, 100)
        }

        setRefreshTimestamp(Date.now())
      }
    }
  }, [sessionTimeStamp]) // Only depend on sessionTimeStamp - use ref to prevent re-runs

  const onFilterPress = () => {
    uiStore.setShowFilter(true)
  }

  const setFilterData = (data?: DataFilter) => {
    uiStore.setFilterState(data)
    trackClick('appliedDateFilter')
  }

  const closeFilter = () => {
    uiStore.setShowFilter(false)
  }

  // Memoize filtered emails with proper checks
  const filteredEmails = useMemo(() => {
    if (!emails.length) return []

    // Check if any filters are active
    const hasDateFilter =
      selectedFilterDates?.date?.from && selectedFilterDates?.date?.to
    const hasCategoryFilter = selectedFilterDates?.categories?.length > 0
    const hasSearchFilter = !!searchQuery

    // If no filters, return all emails
    if (!hasDateFilter && !hasCategoryFilter && !hasSearchFilter) {
      return emails
    }

    let filterEmails = [...emails]

    // Apply date filter
    if (hasDateFilter) {
      const dateRange = selectedFilterDates.date
      filterEmails = filterEmails.filter(mail => {
        const timeStamp = new Date(mail.timestamp).getTime()
        return (
          dateRange.from &&
          dateRange.from.getTime() <= timeStamp &&
          dateRange.to &&
          dateRange.to.getTime() >= timeStamp
        )
      })
    }

    // Apply category filter
    if (hasCategoryFilter) {
      filterEmails = filterEmails.filter(mail =>
        mail.labels.some(label =>
          selectedFilterDates.categories?.includes(label),
        ),
      )
    }

    // Apply search filter
    if (hasSearchFilter) {
      const query = searchQuery.toLowerCase()
      filterEmails = filterEmails.filter(
        email =>
          email.subject?.toLowerCase().includes(query) ||
          email.sender?.toLowerCase().includes(query) ||
          email.preview?.toLowerCase().includes(query),
      )
    }

    return filterEmails
  }, [emails, searchQuery, selectedFilterDates])

  const toggleDrawer = useCallback(() => {
    trackContentChange({
      isDrawerOpen: !isDrawerOpen,
    })
    const toValue = isDrawerOpen ? 0 : 1
    setIsDrawerOpen(!isDrawerOpen)
    Animated.spring(drawerAnimation, {
      toValue,
      useNativeDriver: true,
      bounciness: 0,
      speed: 15,
    }).start()
  }, [isDrawerOpen, drawerAnimation])

  // Add drawer backdrop press handler
  const handleBackdropPress = useCallback(() => {
    if (isDrawerOpen) {
      toggleDrawer()
    }
  }, [isDrawerOpen, toggleDrawer])

  const [isLoadingFolder, setIsLoadingFolder] = useState(false)
  const prevFolderRef = useRef<MailFolder | 'all'>(currentFolder)

  // Add effect to handle folder transitions
  useEffect(() => {
    if (prevFolderRef.current !== currentFolder) {
      setIsLoadingFolder(true)
      prevFolderRef.current = currentFolder

      // Add small delay to ensure UI shows loading state
      const timer = setTimeout(() => {
        setIsLoadingFolder(false)
      }, 300)

      return () => clearTimeout(timer)
    }
    return undefined
  }, [currentFolder])

  useEffect(() => {
    trackScreenMount({
      email: userStore.currentUser?.email,
      timeStamp: Date.now(),
      currentFolder,
      drawerOpen: isDrawerOpen,
      showFilter,
      selectedFilterDates,
    })
  }, [
    trackScreenMount,
    userStore.currentUser?.email,
    currentFolder,
    isDrawerOpen,
    showFilter,
    selectedFilterDates,
  ])

  // Modify folder selection handler
  const handleFolderSelect = useCallback(
    (folder: MailFolder | 'all') => {
      trackContentChange({
        searchQuery: '',
        currentFolder: folder,
      })
      handleTextChange('')
      setCurrentFolder(folder)
      toggleDrawer()
      forceCountRef.current = !forceCountRef.current // Force refresh
    },
    [trackContentChange, toggleDrawer],
  )

  const handleTextChange = useCallback(
    (text: string) => {
      setSearchQuery(text)
      trackTextChange('searchQuery', text)
    },
    [trackTextChange],
  )

  const handleSearchFocusChanged = useCallback(
    (isSearchFocused: boolean) => {
      trackContentChange({ isSearchFocused })
    },
    [trackContentChange],
  )

  // Update loading check
  const isLoading =
    emailsResult === undefined ||
    folderCountsResult === undefined ||
    isLoadingFolder

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={[styles.container, { paddingTop: insets.top }]}
    >
      <DrawerContent
        currentFolder={currentFolder}
        folderCounts={folderCounts}
        onFolderSelect={handleFolderSelect}
        toggleDrawer={toggleDrawer}
        drawerAnimation={drawerAnimation}
      />

      <DateFilter
        visible={showFilter}
        onClose={closeFilter}
        onConfirm={setFilterData}
        currentFilter={selectedFilterDates}
      />

      <View style={styles.content}>
        <SearchHeader
          ref={searchHeaderRef}
          searchQuery={searchQuery}
          onFilterPress={onFilterPress}
          onSearchChange={handleTextChange}
          onMenuPress={toggleDrawer}
          onBlur={() => handleSearchFocusChanged(false)}
          onFocus={() => handleSearchFocusChanged(true)}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.accent500}
          />
        </View>
      ) : filteredEmails.length === 0 && !searchQuery ? (
        <EmptyState folder={currentFolder} />
      ) : filteredEmails.length === 0 && searchQuery ? (
        <EmptyState folder={currentFolder} searchText={searchQuery} />
      ) : (
        <EmailList emails={filteredEmails} onDelete={handleEmailDelete} />
      )}

      <FloatingActionButton />

      {/* Backdrop for drawer */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: drawerAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
          },
          isDrawerOpen ? styles.autoPointerEvents : styles.nonePointerEvents,
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouch}
          activeOpacity={1}
          onPress={handleBackdropPress}
        />
      </Animated.View>
    </Screen>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: spacing.md,
    },
    loadingContainer: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.palette.overlay50,
      zIndex: 1,
    },
    overlayTouch: {
      flex: 1,
    },
    autoPointerEvents: {
      pointerEvents: 'auto',
    },
    nonePointerEvents: {
      pointerEvents: 'none',
    },
  })
