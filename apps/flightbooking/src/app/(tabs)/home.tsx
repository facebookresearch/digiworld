// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Text, Screen, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'

import {
  getAllAirports,
  getFlightSearchSuggestions,
  type Airport,
} from '@/db/queries'
import { useStores } from '@/models'
import { formatLocalDate } from '@/utils/flightValidation'

export default observer(function HomeTab() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { flightSearchStore, userStore } = useStores()
  const { trackScreenMount, trackClick } = useInteractionTracking(
    'home',
    '/home',
  )
  const params = useLocalSearchParams()

  // Airport selection states
  const [airports, setAirports] = useState<Airport[]>([])
  const [filteredAirports, setFilteredAirports] = useState<Airport[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Session restoration tracking
  const sessionRestoredRef = useRef(false)
  const lastSessionTimeStampRef = useRef<string | null>(null)

  // Load airports and initialize store on component mount
  useEffect(() => {
    const loadData = async () => {
      const airportsData = await getAllAirports()
      setAirports(airportsData)
      setFilteredAirports(airportsData)
    }
    loadData()

    // Initialize user from auth store if available
    if (userStore?.user && !flightSearchStore.user) {
      flightSearchStore.setUser({
        id: userStore.user.id,
        name: userStore.user.username || 'User',
        email: userStore.user.email,
        avatar: userStore.user.avatar || '',
      })
    }

    // If this is first time and no saved state, reset to empty form
    if (
      !flightSearchStore.isInitialized &&
      !flightSearchStore.selectedFromAirport
    ) {
      flightSearchStore.resetForm()
      flightSearchStore.markAsInitialized()
    }
  }, [userStore.user?.id])

  // Track screen mount on initial load
  useEffect(() => {
    trackScreenMount()
  }, [trackScreenMount])

  // Clear form when component unmounts (tab switches away permanently)
  useEffect(() => {
    return () => {
      // Only clear if user is logging out or navigating away permanently
      // Don't clear on tab switch
      const isTabNavigation = router.canGoBack()
      if (!isTabNavigation) {
        flightSearchStore.closeAllModals()
      }
    }
  }, [])

  // Track screen focus for navigation tracking
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'home',
        route: '/home',
        tripType: flightSearchStore.tripType,
        hasFromAirport: !!flightSearchStore.selectedFromAirport,
        hasToAirport: !!flightSearchStore.selectedToAirport,
        hasDepartureDate: !!flightSearchStore.departureDateObject,
        hasReturnDate: !!flightSearchStore.returnDateObject,
        passengers: flightSearchStore.totalPassengers,
        sessionTimeStamp: params?.sessionTimeStamp,
      })
      return () => {
        getLatestInteraction()
      }
    }, [
      trackScreenMount,
      flightSearchStore.tripType,
      flightSearchStore.selectedFromAirport,
      flightSearchStore.selectedToAirport,
      flightSearchStore.departureDateObject,
      flightSearchStore.returnDateObject,
      flightSearchStore.totalPassengers,
      params?.sessionTimeStamp,
    ]),
  )

  // Handle session restoration (following devices.tsx pattern)
  useEffect(() => {
    // Reset restoration flag when a new session is detected
    const currentSessionTimeStamp = Array.isArray(params?.sessionTimeStamp)
      ? params.sessionTimeStamp[0]
      : params?.sessionTimeStamp

    if (
      currentSessionTimeStamp &&
      currentSessionTimeStamp !== lastSessionTimeStampRef.current
    ) {
      sessionRestoredRef.current = false
      lastSessionTimeStampRef.current = currentSessionTimeStamp
    }

    if (currentSessionTimeStamp && !sessionRestoredRef.current) {
      const rootStore = flightSearchStore.getRootStore?.() as any
      const sessionData = rootStore?.sessionStore?.getSession(
        currentSessionTimeStamp,
      )

      if (sessionData?.data) {
        const formData = sessionData.data.sessionData?.formData

        if (formData) {
          // Restore search query if available
          if (formData.searchQuery !== undefined) {
            setSearchQuery(formData.searchQuery)
          }

          // Restore airport modal state if available
          if (formData.isAirportModalVisible !== undefined) {
            if (formData.isAirportModalVisible) {
              const field = formData.selectedAirportField || 'from'
              flightSearchStore.openAirportModal(field)
              // Restore filtered airports if search query exists
              if (formData.searchQuery) {
                // Inline airport search logic for restoration
                setSearchQuery(formData.searchQuery)
                if (formData.searchQuery.length > 0) {
                  getFlightSearchSuggestions(formData.searchQuery).then(
                    suggestions => {
                      setFilteredAirports(suggestions)
                    },
                  )
                } else if (airports.length > 0) {
                  setFilteredAirports(airports)
                }
              }
            }
          }

          // Restore date modal state if available
          if (formData.isDateModalVisible !== undefined) {
            if (formData.isDateModalVisible) {
              const field = formData.selectedDateField || 'departure'
              flightSearchStore.openDateModal(field)
            }
          }

          // Restore passenger modal state if available
          if (formData.isPassengerModalVisible !== undefined) {
            if (formData.isPassengerModalVisible) {
              flightSearchStore.setShowPassengerModal(true)
            }
          }

          // Mark session as restored to prevent multiple restoration
          sessionRestoredRef.current = true
        }
      } else {
        // Home session data not found
        sessionRestoredRef.current = true // Mark as restored even if no data found
      }
    } else if (currentSessionTimeStamp && sessionRestoredRef.current) {
      // Session already restored, skipping restoration
    } else {
      // No sessionTimeStamp parameter found
    }
  }, [params?.sessionTimeStamp, flightSearchStore, airports])

  const handleSwapLocations = () => {
    trackClick('swap_locations')
    flightSearchStore.swapLocations()
  }

  const openAirportModal = (field: 'from' | 'to') => {
    trackClick(`open_airport_modal_${field}`)
    setSearchQuery('')
    setFilteredAirports(airports)
    flightSearchStore.openAirportModal(field)
  }

  const handleAirportSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length > 0) {
      const suggestions = await getFlightSearchSuggestions(query)
      setFilteredAirports(suggestions)
    } else {
      setFilteredAirports(airports)
    }
  }

  const selectAirport = (airport: Airport) => {
    if (flightSearchStore.selectedAirportField === 'from') {
      flightSearchStore.setSelectedFromAirport(airport)
    } else {
      flightSearchStore.setSelectedToAirport(airport)
    }
    flightSearchStore.closeAirportModal()
  }

  const handleSearch = () => {
    trackClick('search_flights')
    const {
      selectedFromAirport,
      selectedToAirport,
      departureDateObject,
      returnDateObject,
      tripType,
      totalPassengers,
    } = flightSearchStore

    // Validate required fields
    if (!selectedFromAirport || !selectedToAirport) {
      Alert.alert(
        'Missing Information',
        'Please select both origin and destination airports.',
      )
      return
    }

    // Validate departure date is selected
    if (!departureDateObject) {
      Alert.alert('Missing Information', 'Please select a departure date.')
      return
    }

    // Validate return date for round trip
    if (tripType === 'roundTrip' && !returnDateObject) {
      Alert.alert('Missing Information', 'Please select a return date.')
      return
    }

    // Validate dates - ensure not in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const depDate = new Date(departureDateObject)
    depDate.setHours(0, 0, 0, 0)

    if (depDate < today) {
      Alert.alert(
        'Invalid Date',
        'Departure date cannot be in the past. Please select today or a future date.',
      )
      return
    }

    if (tripType === 'roundTrip' && returnDateObject) {
      const retDate = new Date(returnDateObject)
      retDate.setHours(0, 0, 0, 0)

      if (retDate < today) {
        Alert.alert(
          'Invalid Date',
          'Return date cannot be in the past. Please select today or a future date.',
        )
        return
      }

      if (retDate < depDate) {
        Alert.alert(
          'Invalid Date',
          'Return date cannot be before departure date.',
        )
        return
      }
    }

    // Navigate to search results with search parameters
    router.push({
      pathname: '/search-results',
      params: {
        origin: selectedFromAirport.code,
        destination: selectedToAirport.code,
        date: formatLocalDate(departureDateObject), // Use local date format to avoid timezone issues
        returnDate: returnDateObject
          ? formatLocalDate(returnDateObject)
          : undefined,
        passengers: totalPassengers,
        tripType,
      },
    })
  }

  const formatDate = (date: Date | null) => {
    if (!date) return ''
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
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  }

  const selectDate = (date: Date) => {
    if (flightSearchStore.selectedDateField === 'departure') {
      flightSearchStore.setDepartureDate(date)
      // If return date exists and departure is after return, adjust return date
      const returnDateObj = flightSearchStore.returnDateObject
      if (returnDateObj && date > returnDateObj) {
        const nextDay = new Date(date)
        nextDay.setDate(nextDay.getDate() + 1)
        flightSearchStore.setReturnDate(nextDay)
      }
    } else {
      flightSearchStore.setReturnDate(date)
    }

    flightSearchStore.closeDateModal()
  }

  const getPassengerText = () => {
    const { adults, children, infants } = flightSearchStore
    const parts = []
    if (adults > 0) {
      parts.push(`${adults} Adult${adults > 1 ? 's' : ''}`)
    }
    if (children > 0) {
      parts.push(`${children} Child${children > 1 ? 'ren' : ''}`)
    }
    if (infants > 0) {
      parts.push(`${infants} Infant${infants > 1 ? 's' : ''}`)
    }
    return parts.join(', ')
  }

  const travelClasses = [
    'Economy',
    'Premium Economy',
    'Business',
    'First Class',
  ]

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={['top']}
      contentContainerStyle={styles.container}
    >
      {/* Background Image */}
      <View style={styles.backgroundContainer}>
        <Image
          source={require('../../../assets/images/placeholder.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <View style={styles.backgroundOverlay} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerGreeting}>Welcome back,</Text>
          <View style={styles.headerNameContainer}>
            <Text style={styles.headerName}>
              {flightSearchStore.user?.name ?? 'User'}
            </Text>
            <Text style={styles.headerEmoji}>✈️</Text>
          </View>
          <Text style={styles.headerTagline}>Ready for takeoff?</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Flight Search Form */}
        <View style={styles.searchCard}>
          {/* Trip Type Selector */}
          <View style={styles.tripTypeContainer}>
            <TouchableOpacity
              style={[
                styles.tripTypeButton,
                flightSearchStore.tripType === 'oneWay' &&
                  styles.tripTypeButtonActive,
              ]}
              onPress={() => flightSearchStore.setTripType('oneWay')}
            >
              <Text
                style={
                  flightSearchStore.tripType === 'oneWay'
                    ? [styles.tripTypeText, styles.tripTypeTextActive]
                    : styles.tripTypeText
                }
              >
                One Way
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tripTypeButton,
                flightSearchStore.tripType === 'roundTrip' &&
                  styles.tripTypeButtonActive,
              ]}
              onPress={() => flightSearchStore.setTripType('roundTrip')}
            >
              <Text
                style={
                  flightSearchStore.tripType === 'roundTrip'
                    ? [styles.tripTypeText, styles.tripTypeTextActive]
                    : styles.tripTypeText
                }
              >
                Round Trip
              </Text>
            </TouchableOpacity>
          </View>

          {/* FROM and TO Fields with Swap Button */}
          <View style={styles.locationContainer}>
            {/* FROM Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>FROM</Text>
              <TouchableOpacity
                style={styles.fieldInput}
                onPress={() => openAirportModal('from')}
              >
                <View style={styles.fieldContent}>
                  <Text
                    style={
                      flightSearchStore.fromLocation
                        ? styles.fieldText
                        : styles.fieldTextPlaceholder
                    }
                  >
                    {flightSearchStore.fromLocation || 'Select origin'}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={theme.colors.palette.neutral600}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Swap Button */}
            <TouchableOpacity
              style={styles.swapButton}
              onPress={handleSwapLocations}
            >
              <Ionicons
                name="arrow-up"
                size={12}
                color={theme.colors.palette.primary500}
              />
              <View style={styles.airplaneIcon}>
                <Ionicons
                  name="airplane"
                  size={16}
                  color={theme.colors.palette.primary500}
                />
              </View>
              <Ionicons
                name="arrow-down"
                size={12}
                color={theme.colors.palette.primary500}
              />
            </TouchableOpacity>

            {/* TO Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>TO</Text>
              <TouchableOpacity
                style={styles.fieldInput}
                onPress={() => openAirportModal('to')}
              >
                <View style={styles.fieldContent}>
                  <Text
                    style={
                      flightSearchStore.toLocation
                        ? styles.fieldText
                        : styles.fieldTextPlaceholder
                    }
                  >
                    {flightSearchStore.toLocation || 'Select destination'}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={theme.colors.palette.neutral600}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date Fields */}
          <View style={styles.dateRow}>
            <View
              style={
                flightSearchStore.tripType === 'oneWay'
                  ? styles.dateFieldFull
                  : styles.dateField
              }
            >
              <Text style={styles.fieldLabel}>DEPARTURE</Text>
              <TouchableOpacity
                style={styles.fieldInput}
                onPress={() => flightSearchStore.openDateModal('departure')}
              >
                <View style={styles.fieldContent}>
                  <Text
                    style={
                      flightSearchStore.departureDateObject
                        ? styles.fieldText
                        : styles.fieldTextPlaceholder
                    }
                  >
                    {flightSearchStore.departureDateObject
                      ? formatDate(flightSearchStore.departureDateObject)
                      : 'Select date'}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={theme.colors.palette.neutral600}
                  />
                </View>
              </TouchableOpacity>
            </View>
            {flightSearchStore.tripType === 'roundTrip' && (
              <View style={styles.dateField}>
                <Text style={styles.fieldLabel}>RETURN</Text>
                <TouchableOpacity
                  style={styles.fieldInput}
                  onPress={() => flightSearchStore.openDateModal('return')}
                >
                  <View style={styles.fieldContent}>
                    <Text
                      style={
                        flightSearchStore.returnDateObject
                          ? styles.fieldText
                          : styles.fieldTextPlaceholder
                      }
                    >
                      {flightSearchStore.returnDateObject
                        ? formatDate(flightSearchStore.returnDateObject)
                        : 'Select date'}
                    </Text>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={theme.colors.palette.neutral600}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Passengers */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>PASSENGERS</Text>
            <TouchableOpacity
              style={styles.fieldInput}
              onPress={() => flightSearchStore.setShowPassengerModal(true)}
            >
              <View style={styles.fieldContent}>
                <Text style={styles.fieldText}>{getPassengerText()}</Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={theme.colors.palette.neutral600}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Search Button */}
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>SEARCH</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Passenger Selection Modal */}
      <Modal
        visible={flightSearchStore.showPassengerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => flightSearchStore.setShowPassengerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Passengers & Class</Text>
              <TouchableOpacity
                onPress={() => flightSearchStore.setShowPassengerModal(false)}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.palette.neutral600}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.combinedSection}>
              {/* Adults */}
              <View style={styles.compactRow}>
                <Text style={styles.compactLabel}>Adult</Text>
                <View style={styles.counterContainer}>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() =>
                      flightSearchStore.setAdults(flightSearchStore.adults - 1)
                    }
                  >
                    <Ionicons
                      name="remove"
                      size={14}
                      color={theme.colors.palette.primary500}
                    />
                  </TouchableOpacity>
                  <Text style={styles.counterText}>
                    {flightSearchStore.adults}
                  </Text>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() =>
                      flightSearchStore.setAdults(flightSearchStore.adults + 1)
                    }
                  >
                    <Ionicons
                      name="add"
                      size={14}
                      color={theme.colors.palette.primary500}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Children */}
              <View style={styles.compactRow}>
                <Text style={styles.compactLabel}>Child</Text>
                <View style={styles.counterContainer}>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() =>
                      flightSearchStore.setChildren(
                        flightSearchStore.children - 1,
                      )
                    }
                  >
                    <Ionicons
                      name="remove"
                      size={14}
                      color={theme.colors.palette.primary500}
                    />
                  </TouchableOpacity>
                  <Text style={styles.counterText}>
                    {flightSearchStore.children}
                  </Text>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() =>
                      flightSearchStore.setChildren(
                        flightSearchStore.children + 1,
                      )
                    }
                  >
                    <Ionicons
                      name="add"
                      size={14}
                      color={theme.colors.palette.primary500}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Infants */}
              <View style={styles.compactRow}>
                <Text style={styles.compactLabel}>Infant</Text>
                <View style={styles.counterContainer}>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() =>
                      flightSearchStore.setInfants(
                        flightSearchStore.infants - 1,
                      )
                    }
                  >
                    <Ionicons
                      name="remove"
                      size={14}
                      color={theme.colors.palette.primary500}
                    />
                  </TouchableOpacity>
                  <Text style={styles.counterText}>
                    {flightSearchStore.infants}
                  </Text>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() =>
                      flightSearchStore.setInfants(
                        flightSearchStore.infants + 1,
                      )
                    }
                  >
                    <Ionicons
                      name="add"
                      size={14}
                      color={theme.colors.palette.primary500}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Class Selection */}
              <View style={styles.classRow}>
                <Text style={styles.compactLabel}>Class</Text>
                <View style={styles.classSelector}>
                  {travelClasses.map(classOption => (
                    <TouchableOpacity
                      key={classOption}
                      style={[
                        styles.compactClassOption,
                        flightSearchStore.travelClass === classOption &&
                          styles.selectedCompactClass,
                      ]}
                      onPress={() =>
                        flightSearchStore.setTravelClass(classOption)
                      }
                    >
                      <Text
                        style={
                          flightSearchStore.travelClass === classOption
                            ? [
                                styles.compactClassText,
                                styles.selectedCompactText,
                              ]
                            : styles.compactClassText
                        }
                      >
                        {classOption.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => flightSearchStore.setShowPassengerModal(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Airport Selection Modal */}
      <Modal
        visible={flightSearchStore.showAirportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => flightSearchStore.closeAirportModal()}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select{' '}
                {flightSearchStore.selectedAirportField === 'from'
                  ? 'Origin'
                  : 'Destination'}
              </Text>
              <TouchableOpacity
                onPress={() => flightSearchStore.closeAirportModal()}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.palette.neutral600}
                />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchInputContainer}>
              <Ionicons
                name="search"
                size={20}
                color={theme.colors.palette.neutral600}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search airports, cities, or codes..."
                value={searchQuery}
                onChangeText={handleAirportSearch}
                autoFocus={true}
              />
            </View>

            {/* Airport List Container */}
            <View style={styles.listContainer}>
              {filteredAirports.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No airports found</Text>
                  <Text style={styles.emptySubtext}>
                    Try searching for a city or airport code
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredAirports}
                  keyExtractor={item => item.code}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.airportItem}
                      onPress={() => selectAirport(item)}
                    >
                      <View style={styles.airportInfo}>
                        <Text style={styles.airportCode}>{item.code}</Text>
                        <View style={styles.airportDetails}>
                          <Text style={styles.airportName}>{item.name}</Text>
                          <Text style={styles.airportLocation}>
                            {item.city}, {item.country}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                  style={styles.airportList}
                  showsVerticalScrollIndicator={true}
                  bounces={true}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Selection Modal */}
      <Modal
        visible={flightSearchStore.showDateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => flightSearchStore.closeDateModal()}
        statusBarTranslucent={true}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => flightSearchStore.closeDateModal()}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select{' '}
                {flightSearchStore.selectedDateField === 'departure'
                  ? 'Departure'
                  : 'Return'}{' '}
                Date
              </Text>
              <TouchableOpacity
                onPress={() => flightSearchStore.closeDateModal()}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.palette.neutral600}
                />
              </TouchableOpacity>
            </View>

            {/* Calendar Grid */}
            <ScrollView
              style={styles.calendarContainer}
              showsVerticalScrollIndicator={false}
            >
              {[0, 1, 2, 3, 4, 5].map(monthOffset => {
                const today = new Date()
                const currentMonth = new Date(
                  today.getFullYear(),
                  today.getMonth() + monthOffset,
                  1,
                )
                const year = currentMonth.getFullYear()
                const month = currentMonth.getMonth()
                const firstDay = new Date(year, month, 1).getDay()
                const daysInMonth = new Date(year, month + 1, 0).getDate()
                const monthNames = [
                  'January',
                  'February',
                  'March',
                  'April',
                  'May',
                  'June',
                  'July',
                  'August',
                  'September',
                  'October',
                  'November',
                  'December',
                ]

                return (
                  <View key={monthOffset} style={styles.monthContainer}>
                    <Text style={styles.monthTitle}>
                      {monthNames[month]} {year}
                    </Text>

                    {/* Day labels */}
                    <View style={styles.weekRow}>
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                        <Text key={index} style={styles.dayLabel}>
                          {day}
                        </Text>
                      ))}
                    </View>

                    {/* Calendar days */}
                    <View style={styles.daysGrid}>
                      {Array.from({ length: firstDay }).map((_, index) => (
                        <View key={`empty-${index}`} style={styles.dayCell} />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, index) => {
                        const day = index + 1
                        const date = new Date(year, month, day)
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const isPast = date < today
                        const selectedDate =
                          flightSearchStore.selectedDateField === 'departure'
                            ? flightSearchStore.departureDateObject
                            : flightSearchStore.returnDateObject
                        const isSelected = selectedDate
                          ? selectedDate.toDateString() === date.toDateString()
                          : false
                        const isToday =
                          date.toDateString() === today.toDateString()

                        return (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.dayCell,
                              isSelected && styles.selectedDay,
                              isToday && !isSelected && styles.todayDay,
                              isPast && styles.pastDay,
                            ]}
                            onPress={() => {
                              if (!isPast) {
                                selectDate(date)
                              }
                            }}
                            disabled={isPast}
                          >
                            <Text
                              style={
                                isSelected
                                  ? [styles.dayText, styles.selectedDayText]
                                  : isToday && !isSelected
                                    ? [styles.dayText, styles.todayDayText]
                                    : isPast
                                      ? [styles.dayText, styles.pastDayText]
                                      : styles.dayText
                              }
                            >
                              {day}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </View>
                )
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
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
    backgroundContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '40%',
    },
    backgroundImage: {
      width: '100%',
      height: '100%',
    },
    backgroundOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.palette.overlay20,
    },
    header: {
      backgroundColor: 'transparent',
      paddingTop: 20,
      paddingBottom: 40,
      paddingHorizontal: 20,
    },

    headerText: {
      alignItems: 'flex-start',
    },
    headerGreeting: {
      fontSize: 20,
      color: theme.colors.palette.neutral100,
      textShadowColor: theme.colors.palette.overlay20,
      textShadowOffset: { width: 0, height: 2 },
      opacity: 0.9,
      letterSpacing: 0.5,
    },
    headerNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 8,
    },
    headerName: {
      fontSize: 36,
      fontWeight: '800',
      color: theme.colors.palette.neutral100,
      letterSpacing: 1.2,
      textShadowColor: theme.colors.palette.overlay20,
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    headerEmoji: {
      fontSize: 28,
      marginLeft: 8,
    },
    headerTagline: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
      opacity: 0.95,
      letterSpacing: 0.8,
      fontStyle: 'italic',
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      marginTop: -20,
    },
    searchCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: 24,
      marginBottom: 32,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    tripTypeContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      padding: 4,
      marginBottom: 24,
    },
    tripTypeButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    tripTypeButtonActive: {
      backgroundColor: theme.colors.palette.neutral100,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    tripTypeText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral600,
    },
    tripTypeTextActive: {
      color: theme.colors.palette.primary500,
    },
    locationContainer: {
      position: 'relative',
      marginBottom: 24,
    },
    fieldContainer: {
      marginBottom: 20,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    fieldInput: {
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
    },
    fieldText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
    fieldTextPlaceholder: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.palette.neutral500,
    },
    fieldContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    swapButton: {
      position: 'absolute',
      alignSelf: 'center',
      top: '50%',
      transform: [{ translateY: -24 }],
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 20,
      width: 40,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 5,
      zIndex: 10,
    },
    airplaneIcon: {
      marginVertical: 2,
      transform: [{ rotate: '-45deg' }],
    },
    dateRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    dateField: {
      flex: 1,
    },
    dateFieldFull: {
      flex: 1,
    },
    searchButton: {
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    searchButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 1,
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.palette.overlay50,
      justifyContent: 'flex-end',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    modalContent: {
      backgroundColor: theme.colors.palette.neutral100,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingBottom: 40,
      height: '85%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
    closeButton: {
      padding: 4,
    },
    combinedSection: {
      paddingVertical: 20,
    },
    compactRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    compactLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.palette.neutral900,
    },
    counterContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    counterButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary500,
      alignItems: 'center',
      justifyContent: 'center',
    },
    counterText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      minWidth: 16,
      textAlign: 'center',
    },
    classRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    classSelector: {
      flexDirection: 'row',
      gap: 8,
    },
    compactClassOption: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
    },
    selectedCompactClass: {
      borderColor: theme.colors.palette.primary500,
      backgroundColor: theme.colors.palette.primary100,
    },
    compactClassText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.palette.neutral900,
    },
    selectedCompactText: {
      color: theme.colors.palette.primary500,
    },
    doneButton: {
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 20,
    },
    doneButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
    // Airport Modal Styles
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 8,
      marginHorizontal: 0,
      marginBottom: 16,
      paddingHorizontal: 12,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.palette.neutral900,
    },
    listContainer: {
      flex: 1,
      marginTop: 10,
    },
    airportList: {
      flex: 1,
    },
    airportItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    airportInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    airportCode: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
      width: 50,
      textAlign: 'center',
    },
    airportDetails: {
      flex: 1,
      marginLeft: 12,
    },
    airportName: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.palette.neutral900,
      marginBottom: 2,
    },
    airportLocation: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.palette.neutral700,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.palette.neutral500,
      textAlign: 'center',
    },
    // Calendar Modal Styles
    calendarContainer: {
      flex: 1,
      paddingHorizontal: 20,
    },
    monthContainer: {
      marginBottom: 30,
    },
    monthTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginBottom: 16,
      textAlign: 'center',
    },
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 12,
    },
    dayLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.neutral600,
      width: 40,
      textAlign: 'center',
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4,
    },
    dayText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.palette.neutral900,
    },
    selectedDay: {
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 20,
    },
    selectedDayText: {
      color: theme.colors.palette.neutral100,
      fontWeight: '700',
    },
    todayDay: {
      borderWidth: 2,
      borderColor: theme.colors.palette.primary500,
      borderRadius: 20,
    },
    todayDayText: {
      color: theme.colors.palette.primary500,
      fontWeight: '700',
    },
    pastDay: {
      opacity: 0.3,
    },
    pastDayText: {
      color: theme.colors.palette.neutral400,
    },
  })
