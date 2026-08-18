import { Text, Screen, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import { useEffect, useCallback, useRef, useMemo } from 'react'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import {
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'

import {
  searchFlights,
  getFlightConfigsByRoute,
  type Flight,
} from '@/db/queries'
import { mutations } from '@/db/mutations'
import { parseLocalDate } from '@/utils/flightValidation'
import { useStores } from '@/models'

interface SearchParams {
  origin: string
  destination: string
  date: string
  returnDate?: string
  passengers: number
  tripType: 'oneWay' | 'roundTrip'
  adults?: number
  children?: number
  infants?: number
}

export default observer(function SearchResults() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const params = useLocalSearchParams()
  const { searchResultsStore } = useStores()
  const { trackScreenMount, trackClick } = useInteractionTracking(
    'search-results',
    '/search-results',
  )

  // Session restoration tracking
  const sessionRestoredRef = useRef(false)
  const lastSessionTimeStampRef = useRef<string | null>(null)
  const lastDbRefreshTimeStampRef = useRef<string | null>(null)
  const isLoadingFlightsRef = useRef(false)

  const urlSearchParams = useMemo<SearchParams>(() => {
    const first = (v: unknown) => (Array.isArray(v) ? v[0] : v)
    const toStr = (v: unknown) => (typeof v === 'string' ? v : undefined)
    const toInt = (v: unknown, fallback: number) => {
      const s = toStr(first(v))
      const n = s ? parseInt(s, 10) : NaN
      return Number.isFinite(n) ? n : fallback
    }

    return {
      origin: toStr(first(params.origin)) || 'LAS',
      destination: toStr(first(params.destination)) || 'TPA',
      date: toStr(first(params.date)) || '2025-10-09',
      returnDate: toStr(first(params.returnDate)) || undefined,
      passengers: toInt(params.passengers, 1),
      tripType:
        (toStr(first(params.tripType)) as 'oneWay' | 'roundTrip') || 'oneWay',
      adults: toInt(params.adults, 1),
      children: toInt(params.children, 0),
      infants: toInt(params.infants, 0),
    }
  }, [
    params.origin,
    params.destination,
    params.date,
    params.returnDate,
    params.passengers,
    params.tripType,
    params.adults,
    params.children,
    params.infants,
  ])

  // Prefer store params when present (notably after `action=set` restores a snapshot).
  // Otherwise the UI falls back to URL defaults (LAS → TPA / 2025-10-09).
  const resolvedSearchParams = useMemo<SearchParams>(() => {
    const storeParams = searchResultsStore.searchParams
    if (storeParams) {
      return {
        origin: storeParams.origin,
        destination: storeParams.destination,
        date: storeParams.date,
        returnDate: storeParams.returnDate || undefined,
        passengers: storeParams.passengers,
        tripType: storeParams.tripType as 'oneWay' | 'roundTrip',
        adults: storeParams.adults,
        children: storeParams.children,
        infants: storeParams.infants,
      }
    }
    return urlSearchParams
  }, [searchResultsStore.searchParams, urlSearchParams])

  // Keep store search params in sync with URL params.
  // Otherwise `effectiveParams` can keep using stale values (e.g., old date),
  // which makes it look like generation "didn't happen" even when user changes search.
  useEffect(() => {
    const currentAction = Array.isArray(params?.action)
      ? params.action[0]
      : params?.action
    // If we are restoring from a session, let the session snapshot drive params.
    if (currentAction === 'set') return

    searchResultsStore.setSearchParams(urlSearchParams)
  }, [
    urlSearchParams.origin,
    urlSearchParams.destination,
    urlSearchParams.date,
    urlSearchParams.returnDate,
    urlSearchParams.passengers,
    urlSearchParams.tripType,
    urlSearchParams.adults,
    urlSearchParams.children,
    urlSearchParams.infants,
    params?.action,
  ])

  // Track screen mount on initial load
  useEffect(() => {
    trackScreenMount()
  }, [trackScreenMount])

  // Track screen focus
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'search-results',
        route: '/search-results',
        origin: resolvedSearchParams.origin,
        destination: resolvedSearchParams.destination,
        tripType: resolvedSearchParams.tripType,
        currentTab: searchResultsStore.currentTab,
        sessionTimeStamp: params?.sessionTimeStamp,
      })

      return () => {
        getLatestInteraction()
      }
    }, [
      trackScreenMount,
      resolvedSearchParams.origin,
      resolvedSearchParams.destination,
      resolvedSearchParams.tripType,
      searchResultsStore.currentTab,
      params?.sessionTimeStamp,
    ]),
  )

  // Clear selections and filters only when component unmounts (navigating away)
  useEffect(() => {
    return () => {
      // This only runs on component unmount
      searchResultsStore.clearSelectionAndFilters()
    }
  }, [])

  // Handle session restoration (following devices.tsx pattern)
  useEffect(() => {
    // Reset restoration flag when a new session is detected
    const currentSessionTimeStamp = Array.isArray(params?.sessionTimeStamp)
      ? params.sessionTimeStamp[0]
      : params?.sessionTimeStamp

    const currentAction = Array.isArray(params?.action)
      ? params.action[0]
      : params?.action

    // If the DB was refreshed via deeplink, force a reload even if the search params
    // didn't change (because the underlying DB contents did).
    if (
      currentAction === 'dbrefresh' &&
      currentSessionTimeStamp &&
      currentSessionTimeStamp !== lastDbRefreshTimeStampRef.current
    ) {
      lastDbRefreshTimeStampRef.current = currentSessionTimeStamp
      searchResultsStore.setLastSearchKey(null)
      loadFlights()
      return
    }

    if (
      currentSessionTimeStamp &&
      currentSessionTimeStamp !== lastSessionTimeStampRef.current
    ) {
      sessionRestoredRef.current = false
      lastSessionTimeStampRef.current = currentSessionTimeStamp
    }

    if (currentSessionTimeStamp && !sessionRestoredRef.current) {
      const rootStore = searchResultsStore.getRootStore?.() as any
      const sessionData = rootStore?.sessionStore?.getSession(
        currentSessionTimeStamp,
      )

      if (sessionData?.data) {
        // Mark session as restored to prevent multiple restoration
        sessionRestoredRef.current = true

        // Force reload flights after session restoration
        loadFlights()
      } else {
        // Search results session data not found
        sessionRestoredRef.current = true // Mark as restored even if no data found
      }
    } else if (currentSessionTimeStamp && sessionRestoredRef.current) {
      // Session already restored, skipping restoration
    } else {
      // No sessionTimeStamp parameter found
    }
  }, [params?.sessionTimeStamp, params?.action, searchResultsStore])

  useEffect(() => {
    // Create search key to detect param changes
    const searchKey = `${resolvedSearchParams.origin}-${resolvedSearchParams.destination}-${resolvedSearchParams.date}-${resolvedSearchParams.returnDate || ''}-${resolvedSearchParams.tripType}`

    // Only load if search params changed
    if (searchResultsStore.lastSearchKey !== searchKey) {
      searchResultsStore.setLastSearchKey(searchKey)
      loadFlights()
    }
  }, [
    resolvedSearchParams.origin,
    resolvedSearchParams.destination,
    resolvedSearchParams.date,
    resolvedSearchParams.returnDate,
    resolvedSearchParams.tripType,
  ])

  const loadFlights = async () => {
    if (isLoadingFlightsRef.current) return
    isLoadingFlightsRef.current = true
    try {
      searchResultsStore.setLoading(true)

      // Use store's searchParams if available (restored from session), otherwise use URL params
      const storeParams = searchResultsStore.searchParams
      const effectiveParams = storeParams
        ? {
            origin: storeParams.origin,
            destination: storeParams.destination,
            date: storeParams.date,
            returnDate: storeParams.returnDate || undefined,
            passengers: storeParams.passengers,
            tripType: storeParams.tripType as 'oneWay' | 'roundTrip',
            adults: storeParams.adults,
            children: storeParams.children,
            infants: storeParams.infants,
          }
        : resolvedSearchParams

      console.log('Searching for flights with params:', effectiveParams)

      // Step 1: Check if flight configs exist for departure route
      const departureConfigs = await getFlightConfigsByRoute(
        effectiveParams.origin,
        effectiveParams.destination,
      )
      console.log(
        `Found ${departureConfigs.length} flight configs for ${effectiveParams.origin} -> ${effectiveParams.destination}`,
      )

      if (departureConfigs.length === 0) {
        console.log('No flight configs found for departure route')
        searchResultsStore.setDepartureFlights([])
        searchResultsStore.setReturnFlights([])
        searchResultsStore.setLoading(false)
        return
      }

      // Step 2: Generate flights for departure using DEPARTURE date
      const departureDate = effectiveParams.date
      console.log(
        `Generating DEPARTURE flights for ${effectiveParams.origin} -> ${effectiveParams.destination} on DEPARTURE date: ${departureDate}`,
      )
      const departureGeneratedCount = await mutations.generateFlightsFromConfig(
        effectiveParams.origin,
        effectiveParams.destination,
        departureDate, // Explicitly use departure date
      )
      console.log(`Generated ${departureGeneratedCount} departure flights`)

      // Step 2b: If round trip, also generate return flights using RETURN date
      if (effectiveParams.tripType === 'roundTrip') {
        // Ensure return date is set - REQUIRED for generating return flights
        // For round trips, return date should be provided, but fallback to departure date if missing
        const returnDate = effectiveParams.returnDate || effectiveParams.date

        if (!returnDate) {
          console.error(
            'ERROR: Return date is required for round trip flight generation but was not provided!',
          )
          searchResultsStore.setReturnFlights([])
        } else {
          // Check if return configs exist first
          const returnConfigs = await getFlightConfigsByRoute(
            effectiveParams.destination,
            effectiveParams.origin,
          )
          console.log(
            `Found ${returnConfigs.length} return flight configs for ${effectiveParams.destination} -> ${effectiveParams.origin}`,
          )

          if (returnConfigs.length > 0) {
            console.log(
              `Generating RETURN flights for ${effectiveParams.destination} -> ${effectiveParams.origin} on RETURN date: ${returnDate}`,
            )
            if (effectiveParams.returnDate) {
              console.log(
                `Using explicitly provided return date: ${effectiveParams.returnDate}`,
              )
            } else {
              console.warn(
                `WARNING: No return date provided, using departure date as fallback: ${effectiveParams.date}`,
              )
            }
            // Generate return flights - date is REQUIRED parameter
            const returnGeneratedCount =
              await mutations.generateFlightsFromConfig(
                effectiveParams.destination, // Origin for return (reversed route)
                effectiveParams.origin, // Destination for return (reversed route)
                returnDate, // REQUIRED: Return date for generating return flights
              )
            console.log(`Generated ${returnGeneratedCount} return flights`)
          } else {
            console.log(
              `No return configs found for ${effectiveParams.destination} -> ${effectiveParams.origin}`,
            )
          }
        }
      }

      // Step 3: Load departure flights using DEPARTURE date (reusing departureDate from Step 2)
      console.log(
        `Searching DEPARTURE flights for ${effectiveParams.origin} -> ${effectiveParams.destination} on DEPARTURE date: ${departureDate}`,
      )
      const departureFlightData = await searchFlights({
        origin: effectiveParams.origin,
        destination: effectiveParams.destination,
        date: departureDate, // Explicitly use departure date
        passengers: effectiveParams.passengers,
      })
      console.log(`Found ${departureFlightData.length} departure flights`)
      // Sort by default (price)
      const sortedDeparture = sortFlights(
        departureFlightData,
        searchResultsStore.sortBy,
      )
      searchResultsStore.setDepartureFlights(sortedDeparture)

      // Step 4: Load return flights if round trip using RETURN date
      if (effectiveParams.tripType === 'roundTrip') {
        // Use RETURN date if provided, otherwise fallback to departure date
        const returnDate = effectiveParams.returnDate || effectiveParams.date
        console.log(
          `Searching RETURN flights for ${effectiveParams.destination} -> ${effectiveParams.origin} on RETURN date: ${returnDate}`,
        )
        if (effectiveParams.returnDate) {
          console.log(
            `Using explicitly provided return date: ${effectiveParams.returnDate}`,
          )
        } else {
          console.log(
            `No return date provided, using departure date: ${effectiveParams.date}`,
          )
        }
        const returnFlightData = await searchFlights({
          origin: effectiveParams.destination, // Reversed for return
          destination: effectiveParams.origin, // Reversed for return
          date: returnDate, // Explicitly use return date
          passengers: effectiveParams.passengers,
        })
        console.log(`Found ${returnFlightData.length} return flights`)
        // Sort by default (price)
        const sortedReturn = sortFlights(
          returnFlightData,
          searchResultsStore.sortBy,
        )
        searchResultsStore.setReturnFlights(sortedReturn)
      }
    } catch (error) {
      console.error('Error loading flights:', error)
    } finally {
      searchResultsStore.setLoading(false)
      isLoadingFlightsRef.current = false
    }
  }

  const formatTime = (timeString: string) => {
    const date = new Date(timeString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const formatDate = (dateString: string) => {
    // Parse as local date to avoid timezone issues
    const date = parseLocalDate(dateString)
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    return `${months[date.getMonth()]} ${date.getDate()}`
  }

  const formatPrice = (price: number) => {
    return `$${price}`
  }

  const getSortOptions = () => [
    { key: 'price', label: 'Price (Low to High)', icon: 'cash-outline' },
    { key: 'departure', label: 'Departure Time (Early)', icon: 'time-outline' },
    { key: 'arrival', label: 'Arrival Time (Early)', icon: 'time-outline' },
    {
      key: 'duration',
      label: 'Duration (Shortest)',
      icon: 'hourglass-outline',
    },
  ]

  const sortFlights = (flightsToSort: Flight[], sortType: string) => {
    const sorted = [...flightsToSort].sort((a, b) => {
      switch (sortType) {
        case 'price':
          return a.fare - b.fare
        case 'departure':
          return (
            new Date(a.departure_time).getTime() -
            new Date(b.departure_time).getTime()
          )
        case 'arrival':
          return (
            new Date(a.arrival_time).getTime() -
            new Date(b.arrival_time).getTime()
          )
        case 'duration':
          return a.duration_minutes - b.duration_minutes
        default:
          return 0
      }
    })
    return sorted
  }

  const handleSortSelect = (
    sortType: 'price' | 'departure' | 'arrival' | 'duration',
  ) => {
    trackClick(`sort_by_${sortType}`)
    searchResultsStore.setSortBy(sortType)

    // Sort both departure and return flights to maintain consistency
    const sortedDeparture = sortFlights(
      searchResultsStore.departureFlights.slice() as any,
      sortType,
    )
    searchResultsStore.setDepartureFlights(sortedDeparture)

    if (
      resolvedSearchParams.tripType === 'roundTrip' &&
      searchResultsStore.returnFlights.length > 0
    ) {
      const sortedReturn = sortFlights(
        searchResultsStore.returnFlights.slice() as any,
        sortType,
      )
      searchResultsStore.setReturnFlights(sortedReturn)
    }

    searchResultsStore.setShowSortModal(false)
  }

  const handleFlightSelect = (flight: Flight) => {
    trackClick(`select_flight_${flight.flight_id}`)

    const currentSelection =
      searchResultsStore.currentTab === 'departure'
        ? searchResultsStore.selectedDepartureFlight
        : searchResultsStore.selectedReturnFlight

    console.log(
      'Selecting flight:',
      flight.flight_id,
      'for tab:',
      searchResultsStore.currentTab,
      'Current selection:',
      currentSelection?.flight_id,
    )

    // Create a plain object to ensure MobX detects the change
    const plainFlight = JSON.parse(JSON.stringify(flight))

    if (searchResultsStore.currentTab === 'departure') {
      searchResultsStore.setSelectedDepartureFlight(plainFlight)
      console.log('Departure flight set to:', plainFlight.flight_id)
    } else {
      searchResultsStore.setSelectedReturnFlight(plainFlight)
      console.log('Return flight set to:', plainFlight.flight_id)
    }
  }

  const handleBackPress = () => {
    trackClick('back_button')
    console.log('Back button pressed - navigating back')
    // Clear selections and filters when navigating back
    searchResultsStore.clearSelectionAndFilters()
    if (router.canGoBack()) {
      router.back()
    } else {
      router.push('/')
    }
  }

  const isFlightSelected = (flight: Flight) => {
    const isSelected =
      searchResultsStore.currentTab === 'departure'
        ? searchResultsStore.selectedDepartureFlight?.flight_id ===
          flight.flight_id
        : searchResultsStore.selectedReturnFlight?.flight_id ===
          flight.flight_id

    return isSelected
  }

  const renderFlightCard = ({ item }: { item: Flight }) => {
    const departureTime = formatTime(item.departure_time)
    const arrivalTime = formatTime(item.arrival_time)
    const isSelected = isFlightSelected(item)

    return (
      <TouchableOpacity
        style={[styles.flightCard, isSelected && styles.selectedFlightCard]}
        onPress={() => handleFlightSelect(item)}
      >
        {/* Compact Header Row */}
        <View style={styles.compactHeader}>
          <View style={styles.priceAndAirline}>
            <Text style={styles.compactPrice}>{formatPrice(item.fare)}</Text>
            <Text style={styles.compactAirline}>{item.airline_code}</Text>
          </View>
          <View style={styles.flightNumber}>
            <Text style={styles.compactFlightNumber}>{item.flight_number}</Text>
          </View>
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={theme.colors.palette.primary500}
              />
            </View>
          )}
        </View>

        {/* Compact Flight Details */}
        <View style={styles.compactDetails}>
          <View style={styles.timeRow}>
            <View style={styles.timeInfo}>
              <Text style={styles.compactTime}>{departureTime}</Text>
              <Text style={styles.compactAirport}>{item.origin}</Text>
            </View>

            <View style={styles.flightPath}>
              <View style={styles.flightLine} />
              <Ionicons
                name="airplane"
                size={14}
                color={theme.colors.palette.neutral500}
                style={styles.flightIcon}
              />
            </View>

            <View style={styles.timeInfo}>
              <Text style={styles.compactTime}>{arrivalTime}</Text>
              <Text style={styles.compactAirport}>{item.destination}</Text>
            </View>
          </View>

          <View style={styles.flightMeta}>
            <Text style={styles.compactDuration}>
              {item.duration_minutes}min
            </Text>
            <Text style={styles.compactAircraft}>{item.aircraft_type}</Text>
            <Text style={styles.compactClass}>Economy</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={['top']}
      contentContainerStyle={styles.container}
    >
      {/* Enhanced Header with Integrated Toggle */}
      <View style={styles.headerContainer}>
        {/* Top Row - Back Button, Route, Refresh */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons
              name="arrow-back"
              size={22}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>

          <View style={styles.routeInfo}>
            <Text style={styles.routeText}>
              {searchResultsStore.currentTab === 'departure'
                ? `${resolvedSearchParams.origin} → ${resolvedSearchParams.destination}`
                : `${resolvedSearchParams.destination} → ${resolvedSearchParams.origin}`}
            </Text>
            <Text style={styles.dateText}>
              {formatDate(
                searchResultsStore.currentTab === 'departure'
                  ? resolvedSearchParams.date
                  : resolvedSearchParams.returnDate ||
                      resolvedSearchParams.date,
              )}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.filterButton,
              searchResultsStore.sortBy !== 'price' &&
                styles.filterButtonActive,
            ]}
            onPress={() => {
              trackClick('open_sort_modal')
              searchResultsStore.setShowSortModal(true)
            }}
          >
            <Ionicons
              name="options-outline"
              size={22}
              color={
                searchResultsStore.sortBy !== 'price'
                  ? theme.colors.palette.neutral100
                  : theme.colors.palette.primary500
              }
            />
            {searchResultsStore.sortBy !== 'price' && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Row - Toggle (only for round trips) */}
        {resolvedSearchParams.tripType === 'roundTrip' && (
          <View style={styles.headerToggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleTab,
                searchResultsStore.currentTab === 'departure' &&
                  styles.activeToggleTab,
              ]}
              onPress={() => {
                trackClick('switch_to_departure_tab')
                searchResultsStore.setCurrentTab('departure')
              }}
            >
              <View style={styles.toggleTabContent}>
                <Ionicons
                  name="airplane-outline"
                  size={16}
                  color={
                    searchResultsStore.currentTab === 'departure'
                      ? theme.colors.palette.primary500
                      : theme.colors.palette.neutral600
                  }
                />
                <Text
                  style={
                    searchResultsStore.currentTab === 'departure'
                      ? StyleSheet.flatten([
                          styles.toggleTabText,
                          styles.activeToggleTabText,
                        ])
                      : styles.toggleTabText
                  }
                >
                  Departure
                </Text>
              </View>
              {searchResultsStore.selectedDepartureFlight && (
                <View style={styles.toggleTabBadge}>
                  <Ionicons
                    name="checkmark"
                    size={12}
                    color={theme.colors.palette.neutral100}
                  />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.toggleDivider} />

            <TouchableOpacity
              style={[
                styles.toggleTab,
                searchResultsStore.currentTab === 'return' &&
                  styles.activeToggleTab,
              ]}
              onPress={() => {
                trackClick('switch_to_return_tab')
                searchResultsStore.setCurrentTab('return')
              }}
            >
              <View style={styles.toggleTabContent}>
                <Ionicons
                  name="return-down-back-outline"
                  size={16}
                  color={
                    searchResultsStore.currentTab === 'return'
                      ? theme.colors.palette.primary500
                      : theme.colors.palette.neutral600
                  }
                />
                <Text
                  style={
                    searchResultsStore.currentTab === 'return'
                      ? StyleSheet.flatten([
                          styles.toggleTabText,
                          styles.activeToggleTabText,
                        ])
                      : styles.toggleTabText
                  }
                >
                  Return
                </Text>
              </View>
              {searchResultsStore.selectedReturnFlight && (
                <View style={styles.toggleTabBadge}>
                  <Ionicons
                    name="checkmark"
                    size={12}
                    color={theme.colors.palette.neutral100}
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Flight List */}
      {searchResultsStore.loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading flights...</Text>
        </View>
      ) : !searchResultsStore.hasDepartureFlights ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="airplane-outline"
            size={64}
            color={theme.colors.palette.neutral400}
          />
          <Text style={styles.emptyTitle}>No Flights Available</Text>
          <Text style={styles.emptySubtitle}>
            No flights available on this route
          </Text>
          <TouchableOpacity
            style={styles.trySwapButton}
            onPress={() => {
              trackClick('search_again_button')
              router.replace({
                pathname: '/',
              })
            }}
          >
            <Ionicons
              name="search"
              size={20}
              color={theme.colors.palette.neutral100}
            />
            <Text style={styles.trySwapButtonText}>Search Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={searchResultsStore.currentFlights as any}
          renderItem={renderFlightCard}
          keyExtractor={item => item.flight_id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flightList}
          extraData={{
            selectedDeparture:
              searchResultsStore.selectedDepartureFlight?.flight_id,
            selectedReturn: searchResultsStore.selectedReturnFlight?.flight_id,
            currentTab: searchResultsStore.currentTab,
          }}
        />
      )}

      {/* Next Action Button */}
      {searchResultsStore.canProceed && (
        <View style={styles.nextActionContainer}>
          <TouchableOpacity
            style={styles.nextActionButton}
            onPress={() => {
              trackClick('continue_to_booking')
              router.push({
                pathname: '/booking-flow',
                params: {
                  departureFlightId:
                    searchResultsStore.selectedDepartureFlight?.flight_id,
                  returnFlightId:
                    searchResultsStore.selectedReturnFlight?.flight_id || '',
                  tripType: resolvedSearchParams.tripType,
                  passengers: resolvedSearchParams.passengers.toString(),
                },
              })
            }}
          >
            <Text style={styles.nextActionText}>Continue to Booking</Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Sort Modal */}
      <Modal
        visible={searchResultsStore.showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => searchResultsStore.setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <TouchableOpacity
                onPress={() => {
                  trackClick('close_sort_modal')
                  searchResultsStore.setShowSortModal(false)
                }}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.palette.neutral600}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.sortOptions}>
              {getSortOptions().map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortOption,
                    searchResultsStore.sortBy === option.key &&
                      styles.selectedSortOption,
                  ]}
                  onPress={() =>
                    handleSortSelect(
                      option.key as
                        | 'price'
                        | 'departure'
                        | 'arrival'
                        | 'duration',
                    )
                  }
                >
                  <View style={styles.sortOptionContent}>
                    <Ionicons
                      name={option.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={
                        searchResultsStore.sortBy === option.key
                          ? theme.colors.palette.primary500
                          : theme.colors.palette.neutral600
                      }
                    />
                    <Text
                      style={
                        searchResultsStore.sortBy === option.key
                          ? StyleSheet.flatten([
                              styles.sortOptionText,
                              styles.selectedSortOptionText,
                            ])
                          : styles.sortOptionText
                      }
                    >
                      {option.label}
                    </Text>
                  </View>
                  {searchResultsStore.sortBy === option.key && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={theme.colors.palette.primary500}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },
    // Enhanced Header Styles
    headerContainer: {
      backgroundColor: theme.colors.palette.neutral100,
      paddingTop: 16,
      paddingBottom: 12,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 6,
      zIndex: 1000,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    headerToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral200,
    },
    backButton: {
      padding: 10,
      borderRadius: 10,
      backgroundColor: theme.colors.palette.primary500,
      minWidth: 42,
      minHeight: 42,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    filterButton: {
      padding: 10,
      borderRadius: 10,
      backgroundColor: theme.colors.palette.neutral100,
      minWidth: 42,
      minHeight: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.palette.primary200,
      position: 'relative',
    },
    filterButtonActive: {
      backgroundColor: theme.colors.palette.primary500,
      borderColor: theme.colors.palette.primary500,
    },
    filterBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.palette.secondary500,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral100,
    },
    routeInfo: {
      flex: 1,
      alignItems: 'center',
    },
    routeText: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    dateText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.neutral600,
      backgroundColor: theme.colors.palette.neutral100,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 6,
    },
    // Integrated Toggle Tab Styles
    toggleTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      position: 'relative',
    },
    activeToggleTab: {
      backgroundColor: theme.colors.palette.primary100,
      borderRadius: 8,
    },
    toggleTabContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    toggleTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.palette.neutral600,
    },
    activeToggleTabText: {
      color: theme.colors.palette.primary500,
      fontWeight: '700',
    },
    toggleTabBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 8,
      width: 16,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toggleDivider: {
      width: 1,
      height: 24,
      backgroundColor: theme.colors.palette.neutral200,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginTop: 24,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    trySwapButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.palette.primary500,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 12,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    trySwapButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    flightList: {
      paddingTop: 12,
      paddingBottom: 100, // Extra padding for the next action button
    },
    // Compact Flight Card Styles
    flightCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      marginBottom: 12,
      marginHorizontal: 20,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
    },
    selectedFlightCard: {
      borderColor: theme.colors.palette.primary500,
      borderWidth: 2,
      shadowColor: theme.colors.palette.primary500,
      shadowOpacity: 0.2,
    },
    compactHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.palette.neutral100,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    priceAndAirline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    compactPrice: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
    },
    compactAirline: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral700,
      backgroundColor: theme.colors.palette.neutral200,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    flightNumber: {
      flex: 1,
      alignItems: 'center',
    },
    compactFlightNumber: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral600,
    },
    selectedIndicator: {
      marginLeft: 8,
    },
    compactDetails: {
      padding: 16,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    timeInfo: {
      alignItems: 'center',
      flex: 1,
    },
    compactTime: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 2,
    },
    compactAirport: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
    },
    flightPath: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 2,
      marginHorizontal: 16,
      position: 'relative',
    },
    flightLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.palette.neutral300,
    },
    flightIcon: {
      position: 'absolute',
      left: '50%',
      marginLeft: -7,
      backgroundColor: theme.colors.palette.neutral100,
      padding: 2,
    },
    flightMeta: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral200,
    },
    compactDuration: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
    },
    compactAircraft: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
    },
    compactClass: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
    },
    // Next Action Button Styles
    nextActionContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.palette.neutral100,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral200,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
    },
    nextActionButton: {
      backgroundColor: theme.colors.palette.primary500,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
    },
    nextActionText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.palette.overlay50,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.palette.neutral100,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 20,
      paddingBottom: 40,
      paddingHorizontal: 20,
      maxHeight: '50%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    closeButton: {
      padding: 8,
    },
    sortOptions: {
      gap: 8,
    },
    sortOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.palette.neutral100,
    },
    selectedSortOption: {
      backgroundColor: theme.colors.palette.primary100,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary500,
    },
    sortOptionContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sortOptionText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.palette.neutral900,
      marginLeft: 12,
    },
    selectedSortOptionText: {
      color: theme.colors.palette.primary500,
      fontWeight: '600',
    },
  })
