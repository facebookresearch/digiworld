// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  View,
  StyleSheet,
  TextInput,
  SectionList,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, useTheme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'

import { HorizontalVideoCard } from '@/components'
import { EmptyState } from '@/components/EmptyState'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

const searchFilters = ['All', 'Videos', 'Playlists']

interface SearchResult {
  id: string
  type: 'video' | 'channel' | 'playlist'
  title: string
  subtitle?: string
  thumbnail?: string
  data: any
}

interface SearchSection {
  title: string
  data: SearchResult[]
}

export default observer(function SearchScreen() {
  const { theme } = useTheme()
  const { searchStore } = useStores()
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('search', '/search')

  // Get state from store
  const { searchState } = searchStore

  useEffect(() => {
    if (searchState.query.trim().length > 2) {
      searchStore.performSearch(
        searchState.query.trim(),
        searchState.selectedFilter,
      )
    } else if (searchState.searchSections.length > 0) {
      searchStore.resetSearchSections()
    }
    // Reset search state on unmount
    return () => {
      // videoStore.resetSearchState()
    }
  }, [searchState.query, searchState.selectedFilter])

  useFocusEffect(
    useCallback(() => {
      // Track screen mount when focused
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'search',
        route: '/search',
      })
    }, []),
  )

  useEffect(() => {
    return () => {
      searchStore.resetSearchState()
    }
  }, [])

  const handleResultPress = (result: SearchResult) => {
    switch (result.type) {
      case 'video':
        router.push(`/video/${result.data.id}`)
        break
      case 'channel':
        router.push(`/channel/${result.data.id}`)
        break
      case 'playlist':
        router.push(`/playlist/${result.data.id}`)
        break
    }
  }

  const renderSearchResult: ListRenderItem<SearchResult> = ({ item }) => {
    if (item.type === 'video') {
      return (
        <HorizontalVideoCard
          video={{
            id: item.data.id,
            title: item.data.title,
            description: item.data.description,
            duration: item.data.duration,
            viewCount: item.data.viewCount,
            thumbnailUrl:
              item.data.thumbnailUrl ||
              `https://picsum.photos/400/225?random=${item.data.id}`,
            createdAt: item.data.createdAt,
          }}
          onPress={() => handleResultPress(item)}
        />
      )
    }

    return (
      <TouchableOpacity
        style={[
          styles.searchResultItem,
          { backgroundColor: theme.colors.palette.neutral300 },
        ]}
        onPress={() => handleResultPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.resultIcon}>
          <Ionicons
            name={item.type === 'channel' ? 'tv-outline' : 'list-outline'}
            size={24}
            color={theme.colors.palette.neutral700}
          />
        </View>
        <View style={styles.resultInfo}>
          <Text
            style={[styles.resultTitle, { color: theme.colors.text }] as any}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text
            style={
              [
                styles.resultSubtitle,
                { color: theme.colors.palette.neutral700 },
              ] as any
            }
          >
            {item.subtitle || ''}
          </Text>
        </View>
        <View style={styles.resultType}>
          <Text
            style={
              [
                styles.resultTypeText,
                { color: theme.colors.palette.neutral600 },
              ] as any
            }
          >
            {item.type.toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  const renderSectionHeader = ({ section }: { section: SearchSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }] as any}>
        {section.title}
      </Text>
      <Text
        style={
          [
            styles.sectionCount,
            { color: theme.colors.palette.neutral700 },
          ] as any
        }
      >
        {section.data.length} result{section.data.length !== 1 ? 's' : ''}
      </Text>
    </View>
  )

  const renderFilterTab = (filter: string) => {
    const isSelected = filter === searchState.selectedFilter
    return (
      <TouchableOpacity
        key={filter}
        style={[
          styles.filterTab,
          isSelected && { backgroundColor: theme.colors.palette.primary200 },
          !isSelected && {
            backgroundColor: theme.colors.palette.neutral300,
            borderColor: theme.colors.palette.neutral500,
            borderWidth: 1,
          },
        ]}
        onPress={() => searchStore.setSelectedFilter(filter)}
        activeOpacity={0.8}
      >
        <Text
          style={
            [
              styles.filterTabText,
              {
                color: isSelected
                  ? theme.colors.text
                  : theme.colors.palette.neutral700,
              },
            ] as any
          }
        >
          {filter}
        </Text>
      </TouchableOpacity>
    )
  }

  const renderEmpty = () => {
    if (searchState.query.trim().length === 0) {
      return (
        <EmptyState
          icon="search-outline"
          title="Search Videos & Playlists"
          description="Enter a search term to find videos and playlists."
        />
      )
    }

    if (searchState.query.trim().length <= 2) {
      return (
        <EmptyState
          icon="search-outline"
          title="Keep Typing..."
          description="Enter at least 3 characters to search."
        />
      )
    }

    return (
      <EmptyState
        icon="search-outline"
        title="No Results Found"
        description={`No ${searchState.selectedFilter.toLowerCase() === 'all' ? 'results' : searchState.selectedFilter.toLowerCase()} found for "${searchState.query}". Try different keywords.`}
      />
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.neutral200,
          theme.colors.palette.neutral300,
          theme.colors.palette.neutral100,
        ]}
        locations={[0, 0.4, 1]}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <View
            style={[
              styles.searchInputContainer,
              { backgroundColor: theme.colors.palette.neutral300 },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={20}
              color={theme.colors.palette.neutral700}
            />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              value={searchState.query}
              onChangeText={searchStore.setSearchQuery}
              placeholder="Search videos, playlists..."
              placeholderTextColor={theme.colors.palette.neutral700}
              autoFocus
            />
            {searchState.query.length > 0 && (
              <TouchableOpacity
                onPress={() => searchStore.clearSearch()}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={theme.colors.palette.neutral700}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filtersContainer}>
          {searchFilters.map(renderFilterTab)}
        </View>

        {/* Results */}
        <SectionList
          sections={searchState.searchSections}
          renderItem={renderSearchResult}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={item => item.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            searchState.searchSections.length === 0
              ? styles.emptyContainer
              : styles.resultsContainer
          }
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      </SafeAreaView>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 4,
    borderRadius: 12,
    gap: 12,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
  },
  resultType: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  resultTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
})
