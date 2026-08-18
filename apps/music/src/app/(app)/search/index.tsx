import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
  ScrollView,
} from 'react-native'
import { Text, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import LinearGradient from 'react-native-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import debounce from 'lodash/debounce'
import { Instance } from 'mobx-state-tree'
import { ArtistModel, AlbumModel, SongModel } from '@/models/MusicStore'
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
  useNavigation,
} from 'expo-router'
import { CategoryImage } from '@/components/MusicImage'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { translate } from '@/i18n/translate'

type Category = {
  id: string
  name: string
  color: string
}

interface BrowseCardProps {
  category: Category
  onPress: () => void
}

const SearchResults = observer(() => {
  const { musicStore } = useStores()
  const {
    isLoading,
    searchResultArtists,
    searchResultAlbums,
    searchResultSongs,
  } = musicStore
  const router = useRouter()
  const { theme } = useAppTheme()
  const styles = createStyles(theme)

  const handleResultPress = (type: string, id: number) => {
    if (type === 'song') {
      musicStore.setCurrentSong(id, 'search')
    } else {
      router.push(`/search/${type}/${id}`)
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.tint} />
      </View>
    )
  }

  if (!musicStore.hasSearchResults) {
    return (
      <View style={styles.noResultsContainer}>
        <Text style={styles.noResultsText}>
          {translate('search.noResults')}
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.resultsContainer}
      contentContainerStyle={styles.scrollContent}
    >
      {searchResultArtists.length > 0 && (
        <View style={styles.resultSection}>
          <Text style={styles.resultSectionTitle}>
            {translate('search.categories.artists')}
          </Text>
          {searchResultArtists.map((artist: Instance<typeof ArtistModel>) => (
            <TouchableOpacity
              key={artist.id}
              style={styles.resultItem}
              onPress={() => handleResultPress('artist', artist.id)}
            >
              <Text style={styles.resultItemTitle}>{artist.name}</Text>
              <Text style={styles.resultItemSubtitle}>
                {translate('search.categories.artists')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {searchResultAlbums.length > 0 && (
        <View style={styles.resultSection}>
          <Text style={styles.resultSectionTitle}>
            {translate('search.categories.albums')}
          </Text>
          {searchResultAlbums.map((album: Instance<typeof AlbumModel>) => (
            <TouchableOpacity
              key={album.id}
              style={styles.resultItem}
              onPress={() => handleResultPress('album', album.id)}
            >
              <Text style={styles.resultItemTitle}>{album.title}</Text>
              <Text style={styles.resultItemSubtitle}>Album</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {searchResultSongs.length > 0 && (
        <View style={styles.resultSection}>
          <Text style={styles.resultSectionTitle}>
            {translate('search.categories.songs')}
          </Text>
          {searchResultSongs.map((song: Instance<typeof SongModel>) => (
            <TouchableOpacity
              key={song.id}
              style={styles.resultItem}
              onPress={() => handleResultPress('song', song.id)}
            >
              <Text style={styles.resultItemTitle}>{song.title}</Text>
              <Text style={styles.resultItemSubtitle}>
                {/* @ts-ignore */}
                {song.artist?.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  )
})

const BrowseCard = ({ category, onPress }: BrowseCardProps) => {
  const { theme } = useAppTheme()
  const styles = createStyles(theme)

  return (
    <TouchableOpacity onPress={onPress} style={styles.browseCard}>
      <CategoryImage entityId={category.id} style={styles.categoryImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.7)']}
        style={styles.cardGradient}
      />
      <Text style={styles.browseText}>{category.name}</Text>
    </TouchableOpacity>
  )
}

export default observer(function SearchScreen() {
  const { musicStore } = useStores()
  const { searchQuery, categories } = musicStore
  const { theme } = useAppTheme()
  const styles = createStyles(theme)
  // Convert MobX array to plain array for extraData to ensure FlatList detects changes
  // Use useMemo to only recreate when categories actually change
  const categoriesArray = useMemo(
    () => Array.from(categories),
    [categories.length, categories],
  )
  const [inputValue, setInputValue] = useState(searchQuery)
  const router = useRouter()
  const navigation = useNavigation()
  const { sessionTimeStamp } = useLocalSearchParams()
  const { trackScreenMount } = useInteractionTracking('Search', '/search')
  const [lastSession, setLastSession] = useState(null)

  const searchRef = useRef<TextInput>(null)
  useEffect(() => {
    const inputEl = searchRef.current
    const isNewSession = sessionTimeStamp !== lastSession

    if (!isNewSession) return

    if (searchQuery && searchQuery !== inputValue) {
      // Case 1 or 2 — restore or switch query
      setInputValue(searchQuery)
      // @ts-ignore
      setLastSession(sessionTimeStamp)
      setTimeout(() => {
        inputEl?.focus()
        const length = searchQuery.length
        inputEl?.setSelection(length, length)
      }, 100)
    } else if (!searchQuery) {
      // Case 3 — clear session
      setInputValue('')
      // @ts-ignore
      setLastSession(sessionTimeStamp)
      setTimeout(() => {
        inputEl?.blur()
      }, 100)
    }
  }, [sessionTimeStamp, searchQuery])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'search',
        route: '/search',
        searchQuery: inputValue,
      })
    }, []),
  )

  const { width } = useWindowDimensions()

  const debouncedSearch = useCallback(
    debounce((text: string) => {
      musicStore.searchItems(text)
    }, 300),
    [],
  )

  const handleSearch = (text: string) => {
    setInputValue(text)
    if (!text.trim()) {
      musicStore.clearSearch()
      return
    }
    debouncedSearch(text)
  }

  const handleClear = () => {
    setInputValue('')
    musicStore.clearSearch()
  }

  const handleCategoryPress = (category: { id: string; name: string }) => {
    router.push(`/search/category/${category.id}`)
  }

  const renderBrowseItem = ({ item }: { item: Category }) => (
    <BrowseCard category={item} onPress={() => handleCategoryPress(item)} />
  )

  const getItemLayout = (_: any, index: number) => ({
    length: (width - 48) / 2,
    offset: ((width - 48) / 2) * Math.floor(index / 2),
    index,
  })

  React.useEffect(() => {
    if (searchQuery) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            accessibilityLabel="Clear search"
          >
            <Text style={styles.clearButtonText}>
              {translate('search.clear')}
            </Text>
          </TouchableOpacity>
        ),
      })
    } else {
      navigation.setOptions({
        headerRight: undefined,
      })
    }
  }, [searchQuery, navigation])

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <LinearGradient
        colors={[theme.colors.palette.primary500, theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.headerGradient}
      />

      <View style={styles.header}>
        <Text style={styles.title}>{translate('search.title')}</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={theme.colors.textDim} />
          <TextInput
            ref={searchRef}
            placeholder={translate('search.placeholder')}
            placeholderTextColor={theme.colors.textDim}
            style={styles.searchInput}
            value={inputValue}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {inputValue ? (
            <TouchableOpacity onPress={handleClear}>
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.textDim}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {searchQuery ? (
        <SearchResults onClose={handleClear} query={searchQuery} />
      ) : (
        <View style={styles.browseSection}>
          <Text style={styles.browseTitle}>
            {translate('search.browseAll')}
          </Text>
          <FlatList
            data={categories}
            renderItem={renderBrowseItem}
            keyExtractor={item => item.id.toString()}
            extraData={categoriesArray}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.gridContent}
            getItemLayout={getItemLayout}
            showsVerticalScrollIndicator={false}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
          />
        </View>
      )}
    </SafeAreaView>
  )
})

const createStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      position: 'relative',
    },
    headerGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 200,
      zIndex: 0,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
      zIndex: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 16,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.overlay20,
      borderRadius: 8,
      padding: 12,
      gap: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
      height: 24,
    },
    content: {
      flex: 1,
      zIndex: 1,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    browseSection: {
      flex: 1,
      paddingHorizontal: 16,
    },
    browseTitle: {
      fontSize: 20,
      color: theme.colors.text,
      marginBottom: 16,
      fontWeight: 'bold',
      paddingHorizontal: 4,
    },
    gridContent: {
      paddingBottom: 20,
    },
    columnWrapper: {
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    browseCard: {
      width: '48%',
      aspectRatio: 1,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.palette.overlay20,
      position: 'relative',
    },
    categoryImage: {
      width: '100%',
      height: '100%',
      position: 'absolute',
    },
    cardGradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '40%',
      zIndex: 1,
    },
    browseText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: 'bold',
      padding: 12,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 2,
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
      height: 200,
    },
    noResultsContainer: {
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
      height: 200,
    },
    noResultsText: {
      color: theme.colors.textDim,
      fontSize: 16,
    },
    resultsContainer: {
      padding: 20,
    },
    resultSection: {
      marginBottom: 24,
    },
    resultSectionTitle: {
      fontSize: 18,
      color: theme.colors.text,
      fontWeight: 'bold',
      marginBottom: 12,
    },
    resultItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.overlay20,
    },
    resultItemTitle: {
      color: theme.colors.text,
      fontSize: 16,
      marginBottom: 4,
    },
    resultItemSubtitle: {
      color: theme.colors.textDim,
      fontSize: 14,
    },
    seeAllButton: {
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    seeAllText: {
      color: theme.colors.tint,
      fontSize: 14,
      fontWeight: '500',
    },
    clearButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    clearButtonText: {
      color: theme.colors.tint,
      fontSize: 16,
      fontWeight: '600',
    },
  })
