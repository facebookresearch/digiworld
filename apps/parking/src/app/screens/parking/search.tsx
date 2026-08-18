import { useEffect, useRef, useMemo, useCallback } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native'
import { Text, useAppTheme, type Theme } from '@andojo/shared-theme'
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models/helpers/useStores'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

const SearchScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { parkingStore } = useStores()
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking(
    'ParkingSearch',
    '/screens/parking/search',
  )
  const { sessionTimeStamp } = useLocalSearchParams()
  const searchInputRef = useRef<TextInput>(null)

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        date: Date.now(),
        screenName: 'ParkingSearch',
        route: '/screens/parking/search',
      })
    }, []),
  )

  // Restore focus when session is restored
  useEffect(() => {
    if (sessionTimeStamp) {
      const focusedElement = parkingStore.searchForm.currentFocused
      if (focusedElement === 'search') {
        setTimeout(() => {
          searchInputRef.current?.focus()
          searchInputRef.current?.setSelection(
            parkingStore.searchForm.searchQuery.length,
            parkingStore.searchForm.searchQuery.length,
          )
        }, 100)
      }
    }
  }, [
    sessionTimeStamp,
    parkingStore.searchForm.currentFocused,
    parkingStore.searchForm.searchQuery,
  ])

  // Use store-based filtered zones
  const filteredZones = parkingStore.filteredParkingZones

  const handleBack = () => {
    parkingStore.clearSearchQuery()
    parkingStore.setSelectedParkingZone(null)
    router.back()
  }

  const handleZoneSelect = (zone: any) => {
    parkingStore.setSelectedParkingZone(zone)
    parkingStore.setExtendingSession(null) // Clear extending session for normal flow
    parkingStore.clearSearchQuery()
    router.push('/screens/parking/book-parking')
  }

  const renderZoneItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.zoneItem}
      onPress={() => handleZoneSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.zoneIconContainer}>
        <Ionicons
          name="location"
          size={24}
          color={theme.colors.palette.primary500}
        />
      </View>
      <View style={styles.zoneContent}>
        <Text style={styles.zoneCode}>{item.zoneCode || 'N/A'}</Text>
        <Text style={styles.zoneName}>{item.name}</Text>
        {item.operator && (
          <Text style={styles.zoneOperator}>{item.operator}</Text>
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={theme.colors.palette.neutral400}
      />
    </TouchableOpacity>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="search-outline"
        size={64}
        color={theme.colors.palette.neutral400}
      />
      <Text style={styles.emptyText}>
        {parkingStore.searchForm.searchQuery
          ? 'No zones found'
          : 'Search for parking zones'}
      </Text>
      <Text style={styles.emptySubtext}>
        {parkingStore.searchForm.searchQuery
          ? 'Try a different search term'
          : 'Enter zone code, name, or operator'}
      </Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Search */}
      <View style={styles.header}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.palette.neutral800}
          />
        </TouchableOpacity>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={20}
              color={theme.colors.palette.neutral600}
            />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search zone code, name..."
              placeholderTextColor={theme.colors.palette.neutral400}
              value={parkingStore.searchForm.searchQuery}
              onChangeText={text => parkingStore.setSearchQuery(text)}
              onFocus={() => parkingStore.setSearchFocused('search')}
              onBlur={() => parkingStore.setSearchFocused(null)}
              autoFocus
            />
            {parkingStore.searchForm.searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => parkingStore.clearSearchQuery()}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={theme.colors.palette.neutral400}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Results List */}
      <FlatList
        data={filteredZones}
        renderItem={renderZoneItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 16,
      gap: 12,
      backgroundColor: theme.colors.palette.neutral100,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    backButton: {
      padding: 8,
    },
    searchContainer: {
      flex: 1,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    searchInput: {
      flex: 1,
      marginLeft: 12,
      fontSize: 16,
      color: theme.colors.palette.neutral900,
    },
    listContent: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 20,
    },
    zoneItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    zoneIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    zoneContent: {
      flex: 1,
    },
    zoneCode: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    zoneName: {
      fontSize: 14,
      color: theme.colors.palette.neutral700,
      marginBottom: 2,
    },
    zoneOperator: {
      fontSize: 12,
      color: theme.colors.palette.neutral500,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 100,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.palette.neutral600,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.palette.neutral400,
      marginTop: 8,
      textAlign: 'center',
    },
  })

export default SearchScreen
