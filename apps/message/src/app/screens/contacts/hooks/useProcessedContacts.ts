// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useMemo } from 'react'
import { useStores } from '@/models'
import { ContactItem, SectionData, DatabaseUser } from '@/app/types'

const useProcessedContacts = (
  databaseUsers: DatabaseUser[],
  debouncedSearchQuery: string,
) => {
  const { userStore } = useStores()

  const processedDatabaseUsers = useMemo(() => {
    const loggedInUserId = userStore.currentUser?.id
    const shouldHideCurrentUser = userStore.shouldHideCurrentUser

    return databaseUsers
      .filter(user => {
        // Hide current user if navigation source is 'groups'
        if (shouldHideCurrentUser && user.id === loggedInUserId) {
          return false
        }

        return true
      })
      .map(user => ({
        id: `db-${user.id}`,
        name: user.name || 'Unknown User',
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl || undefined,
        type: 'database' as const,
        originalData: user,
        searchText: `${user.name || ''} ${user.phoneNumber}`.toLowerCase(),
        displayName:
          user.id === loggedInUserId
            ? `${user.name || 'Unknown User'} (You)`
            : user.name || 'Unknown User',
        isLoggedInUser: user.id === loggedInUserId,
      }))
  }, [
    databaseUsers,
    userStore.currentUser?.id,
    userStore.shouldHideCurrentUser,
  ])

  const filteredDatabaseUsers = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return processedDatabaseUsers
    }

    const query = debouncedSearchQuery.toLowerCase().trim()
    const queryLength = query.length

    // Use more efficient filtering with early returns
    return processedDatabaseUsers.filter(user => {
      const searchText = user.searchText
      const searchTextLength = searchText.length

      // Early return for exact matches
      if (searchText === query) return true

      // Early return if query is longer than search text
      if (queryLength > searchTextLength) return false

      // Use includes for substring matching
      return searchText.includes(query)
    })
  }, [processedDatabaseUsers, debouncedSearchQuery])

  const sections = useMemo(() => {
    const sectionsData: SectionData[] = []

    const sortedDbUsers = [...filteredDatabaseUsers].sort((a, b) => {
      if (a.isLoggedInUser) return -1
      if (b.isLoggedInUser) return 1
      return 0
    })

    if (sortedDbUsers.length > 0) {
      sectionsData.push({
        title: 'Contacts on Andojo Message',
        data: sortedDbUsers.map(user => ({
          id: user.id,
          name: user.displayName,
          phoneNumber: user.phoneNumber,
          avatarUrl: user.avatarUrl,
          type: user.type,
          originalData: user.originalData,
        })),
        type: 'database',
      })
    }

    return sectionsData
  }, [filteredDatabaseUsers])

  return { sections }
}

export type { ContactItem, SectionData }
export default useProcessedContacts
