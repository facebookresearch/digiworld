import React, { useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  TextInput,
  Platform,
  Animated,
  TouchableOpacity,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { useStores } from '@/models'
import { Text, type Theme } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Glassmorphic, AnimatedBackground, ItemCard } from '@/components'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useAppTheme } from '@andojo/shared-theme'

const { width } = Dimensions.get('window')
const ITEM_WIDTH = (width - 54) / 2

const SearchScreen = observer(() => {
  const { q } = useLocalSearchParams<{ q?: string }>()
  const { auctionStore, uiStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('search', '/search')
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    if (q) {
      uiStore.setSearchQuery(q)
      uiStore.setDebouncedQuery(q)
    }
  }, [q])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  // Debounce the search query for filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      uiStore.setDebouncedQuery(uiStore.searchState.searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [uiStore.searchState.searchQuery])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'search',
        route: '/search',
      })
    }, []),
  )

  useEffect(() => {
    return () => {
      uiStore.resetSearchState()
    }
  }, [])

  const handleItemPress = useCallback(
    (itemId: number) => {
      router.push(`/item/${itemId}`)
    },
    [router],
  )

  const handleSearchChange = useCallback(
    (query: string) => {
      uiStore.setSearchQuery(query)
    },
    [uiStore],
  )

  const searchResults = useMemo(() => {
    const debouncedQuery = uiStore.searchState.debouncedQuery
    if (!debouncedQuery.trim()) return []

    const lowerQuery = debouncedQuery.toLowerCase()
    return auctionStore.activeItems.filter(
      item =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.description?.toLowerCase().includes(lowerQuery),
    )
  }, [uiStore.searchState.debouncedQuery, auctionStore.activeItems])

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const seller = auctionStore.getUserById(item.sellerId)
      return (
        <View style={styles.itemWrapper}>
          <ItemCard
            item={item}
            seller={seller || undefined}
            onPress={handleItemPress}
            size="medium"
            showSeller={true}
          />
        </View>
      )
    },
    [handleItemPress, auctionStore],
  )

  const renderEmpty = useCallback(
    () => (
      <Glassmorphic
        borderRadius={24}
        padding={48}
        intensity={Platform.OS === 'ios' ? 50 : 75}
        backgroundColor={
          Platform.OS === 'ios'
            ? theme.colors.palette.secondary100
            : theme.colors.palette.neutral200
        }
        borderColor={theme.colors.palette.neutral300}
        borderWidth={1}
        style={styles.emptyState}
      >
        <View style={styles.emptyIconContainer}>
          <Glassmorphic
            borderRadius={40}
            padding={20}
            intensity={Platform.OS === 'ios' ? 60 : 80}
            backgroundColor={theme.colors.palette.primary200}
            borderColor={theme.colors.palette.primary400}
            borderWidth={1}
          >
            <Ionicons
              name="search-outline"
              size={48}
              color={theme.colors.tint}
            />
          </Glassmorphic>
        </View>
        <Text style={{ ...styles.emptyText, color: theme.colors.text }}>
          {uiStore.searchState.searchQuery.trim()
            ? 'No items found'
            : 'Start searching'}
        </Text>
        <Text style={{ ...styles.emptySubtext, color: theme.colors.textDim }}>
          {uiStore.searchState.searchQuery.trim()
            ? 'Try a different search term'
            : 'Enter keywords to find items'}
        </Text>
      </Glassmorphic>
    ),
    [theme, uiStore.searchState.searchQuery],
  )

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header with Search */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Glassmorphic
            borderRadius={0}
            padding={20}
            intensity={Platform.OS === 'ios' ? 50 : 70}
            backgroundColor={
              Platform.OS === 'ios'
                ? theme.colors.palette.secondary100
                : theme.colors.palette.neutral100
            }
            borderColor={theme.colors.palette.neutral400}
            borderWidth={0}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-back"
                  size={28}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              <View style={styles.searchContainer}>
                <Glassmorphic
                  borderRadius={20}
                  padding={0}
                  intensity={Platform.OS === 'ios' ? 60 : 80}
                  backgroundColor={
                    Platform.OS === 'ios'
                      ? theme.colors.palette.secondary100
                      : theme.colors.palette.neutral100
                  }
                  borderColor={theme.colors.palette.neutral300}
                  borderWidth={1}
                >
                  <View style={styles.searchInner}>
                    <Ionicons
                      name="search-outline"
                      size={20}
                      color={theme.colors.textDim}
                      style={styles.searchIcon}
                    />
                    <TextInput
                      placeholder="Search items..."
                      placeholderTextColor={theme.colors.textDim}
                      style={{
                        ...styles.searchInput,
                        color: theme.colors.text,
                      }}
                      value={uiStore.searchState.searchQuery}
                      onChangeText={handleSearchChange}
                      autoFocus
                      returnKeyType="search"
                    />
                    {uiStore.searchState.searchQuery.length > 0 && (
                      <TouchableOpacity
                        onPress={() => uiStore.setSearchQuery('')}
                        style={styles.clearButton}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color={theme.colors.textDim}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </Glassmorphic>
              </View>
            </View>
            {searchResults.length > 0 && (
              <Text style={styles.resultsCount}>
                {searchResults.length} result
                {searchResults.length !== 1 ? 's' : ''} found
              </Text>
            )}
          </Glassmorphic>
        </Animated.View>

        {/* Search Results */}
        <Animated.View
          style={[
            styles.listContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <FlatList
            data={searchResults}
            keyExtractor={item => `item-${item.id}`}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmpty}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        </Animated.View>
      </SafeAreaView>
    </AnimatedBackground>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    header: {
      marginBottom: 8,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    backButton: {
      marginRight: 12,
      padding: 4,
    },
    searchContainer: {
      flex: 1,
    },
    searchInner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
    },
    clearButton: {
      padding: 4,
    },
    resultsCount: {
      fontSize: 14,
      fontWeight: '500',
      letterSpacing: -0.2,
      color: theme.colors.textDim,
    },
    listContainer: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 100,
    },
    row: {
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    itemWrapper: {
      width: ITEM_WIDTH,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 60,
      minHeight: 280,
    },
    emptyIconContainer: {
      marginBottom: 20,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: '700',
      marginTop: 16,
      marginBottom: 10,
      letterSpacing: -0.4,
    },
    emptySubtext: {
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 22,
      opacity: 0.85,
    },
  })

export default SearchScreen
