import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  useAppTheme,
  type Theme,
  metrics,
  Text as ThemeText,
} from '@andojo/shared-theme'

interface ChatSearchProps {
  messages: any[]
  onSearchResults: (results: any[]) => void
  onSearchIndexChange: (index: number) => void
  onSearchTextChange?: (searchText: string) => void
  onScrollToResult: (messageId: string) => void
  isVisible: boolean
  onClose: () => void
  initialSearchText?: string
}

export default function ChatSearch({
  messages,
  onSearchResults,
  onSearchIndexChange,
  onSearchTextChange,
  onScrollToResult,
  isVisible,
  onClose,
  initialSearchText,
}: ChatSearchProps) {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [searchQuery, setSearchQuery] = useState(initialSearchText || '')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<TextInput>(null)

  // Search functionality with debouncing
  const performSearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setSearchResults([])
        setCurrentSearchIndex(0)
        onSearchResults([])
        onSearchIndexChange(0)
        return
      }

      const searchTerm = query.toLowerCase().trim()

      // Efficient search through messages
      const results = messages.filter(message => {
        // Search in text content
        if (
          message.messageType === 'text' &&
          message.content.toLowerCase().includes(searchTerm)
        ) {
          return true
        }
        // Search in file names for file messages
        if (
          message.messageType === 'file' &&
          message.content.toLowerCase().includes(searchTerm)
        ) {
          return true
        }
        return false
      })

      setSearchResults(results)
      setCurrentSearchIndex(0)
      onSearchResults(results)
      onSearchIndexChange(0)
    },
    [messages, onSearchResults, onSearchIndexChange],
  )

  // Debounced search
  const debouncedSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)

      // Call onSearchTextChange if provided
      if (onSearchTextChange) {
        onSearchTextChange(query)
      }

      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      // Set new timeout for debounced search
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query)
      }, 300) // 300ms debounce delay
    },
    [performSearch, onSearchTextChange],
  )

  // Navigate to next/previous search result
  const navigateSearchResult = useCallback(
    (direction: 'next' | 'prev') => {
      if (searchResults.length === 0) return

      const newIndex =
        direction === 'next'
          ? currentSearchIndex < searchResults.length - 1
            ? currentSearchIndex + 1
            : 0
          : currentSearchIndex > 0
            ? currentSearchIndex - 1
            : searchResults.length - 1

      setCurrentSearchIndex(newIndex)
      onSearchIndexChange(newIndex)

      // Scroll to the new search result
      if (searchResults[newIndex]) {
        onScrollToResult(searchResults[newIndex].id)
      }
    },
    [searchResults, currentSearchIndex, onSearchIndexChange, onScrollToResult],
  )

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setCurrentSearchIndex(0)
    onSearchResults([])
    onSearchIndexChange(0)
  }, [onSearchResults, onSearchIndexChange])

  // Focus search input when visible
  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    } else {
      clearSearch()
    }
  }, [isVisible, clearSearch])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  if (!isVisible) return null

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onClose}>
        <Ionicons
          name="arrow-back"
          size={24}
          color={theme.colors.palette.neutral800}
        />
      </TouchableOpacity>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.palette.neutral400}
            style={styles.searchIcon}
          />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={debouncedSearch}
            placeholder="Search in conversation..."
            placeholderTextColor={theme.colors.palette.neutral400}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.palette.neutral400}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.searchActions}>
        {searchResults.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.searchActionButton}
              onPress={() => navigateSearchResult('prev')}
            >
              <Ionicons
                name="chevron-up"
                size={20}
                color={theme.colors.palette.neutral800}
              />
            </TouchableOpacity>

            <ThemeText
              text={`${currentSearchIndex + 1}/${searchResults.length}`}
              size="small"
              style={styles.searchResultCount}
            />

            <TouchableOpacity
              style={styles.searchActionButton}
              onPress={() => navigateSearchResult('next')}
            >
              <Ionicons
                name="chevron-down"
                size={20}
                color={theme.colors.palette.neutral800}
              />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: metrics.medium,
      paddingVertical: metrics.small,
      backgroundColor: theme.colors.palette.neutral100,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    backButton: {
      padding: metrics.small,
      marginRight: metrics.small,
    },
    searchContainer: {
      flex: 1,
      marginHorizontal: metrics.small,
    },
    searchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
      paddingHorizontal: metrics.small,
      paddingVertical: metrics.tiny,
    },
    searchIcon: {
      marginRight: metrics.small,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.palette.neutral800,
      paddingVertical: metrics.tiny,
    },
    searchActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.small,
    },
    searchActionButton: {
      padding: metrics.tiny,
      borderRadius: metrics.borderRadiusSmall,
      backgroundColor: theme.colors.palette.neutral200,
    },
    searchResultCount: {
      color: theme.colors.palette.neutral600,
      minWidth: 40,
      textAlign: 'center',
    },
  })
