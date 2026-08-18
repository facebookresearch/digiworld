import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { typography, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker'
import LinearGradient from 'react-native-linear-gradient'
import { observer } from 'mobx-react-lite'
import { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router'
import {
  ActivityIndicator,
  Animated,
  FlatList,
  InteractionManager,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStores } from '../../models'
import { queries } from '@/db/queries'

// Simple debounce using ref
const useDebounceRef = (delay: number = 500) => {
  const lastCallRef = useRef<number>(0)

  const canExecute = useCallback(() => {
    const now = Date.now()
    if (now - lastCallRef.current < delay) {
      return false
    }
    lastCallRef.current = now
    return true
  }, [delay])

  return canExecute
}

// Loading Overlay Component - defined outside for better performance
const LoadingOverlay = ({ visible }: { visible: boolean }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start()
    }
  }, [visible, fadeAnim])

  if (!visible) return null

  return (
    <Animated.View style={[styles.loadingOverlayFixed, { opacity: fadeAnim }]}>
      <View style={styles.loadingCard}>
        <ActivityIndicator
          size="large"
          color={theme.colors.palette.primary400}
        />
        <Text style={styles.loadingOverlayText}>Finding best routes...</Text>
        <Text style={styles.loadingOverlaySubtext}>This may take a moment</Text>
      </View>
    </Animated.View>
  )
}

const PlanTripScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { trackScreenMount } = useInteractionTracking('PlanTrip', '/plan')
  const router = useRouter()
  const params = useLocalSearchParams()
  const {
    tripPlannerStore: { tripState },
    userStore,
  } = useStores()

  const activeUserId = userStore.user?.id ?? 1

  const fadeAnim = useRef(new Animated.Value(1)).current
  const slideUp = useRef(new Animated.Value(15)).current
  const modalSlideAnim = useRef(new Animated.Value(400)).current
  const modalFadeAnim = useRef(new Animated.Value(0)).current
  const spinAnim = useRef(new Animated.Value(0)).current
  const nativePickerOpacity = useRef(new Animated.Value(0)).current
  const scrollViewRef = useRef<ScrollView>(null)
  const animationRef = useRef<Animated.CompositeAnimation | null>(null)

  const [alertCount, setAlertCount] = useState(0)

  // Sync modal animations with modal state (for restoration)
  useEffect(() => {
    if (tripState.showTimePicker) {
      // Animate modal open
      Animated.parallel([
        Animated.spring(modalSlideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(modalFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      // Animate modal closed
      Animated.parallel([
        Animated.timing(modalSlideAnim, {
          toValue: 400,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(modalFadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Reset native picker after modal closes
        nativePickerOpacity.setValue(0)
      })
    }
  }, [tripState.showTimePicker])

  // Handle native picker animation - only opacity, no height animation
  useEffect(() => {
    // Only animate if modal is open
    if (!tripState.showTimePicker) {
      nativePickerOpacity.setValue(0)
      return
    }

    // Stop any ongoing animation first
    if (animationRef.current) {
      animationRef.current.stop()
      animationRef.current = null
    }
    nativePickerOpacity.stopAnimation()

    // Create and start new animation
    const targetValue = tripState.showNativePicker ? 1 : 0
    animationRef.current = Animated.timing(nativePickerOpacity, {
      toValue: targetValue,
      duration: 200,
      useNativeDriver: true, // Can use native driver for opacity
    })

    animationRef.current.start(() => {
      animationRef.current = null
    })

    // Cleanup
    return () => {
      if (animationRef.current) {
        animationRef.current.stop()
        animationRef.current = null
      }
    }
  }, [tripState.showNativePicker, tripState.showTimePicker])

  // Start spin animation for loader
  useEffect(() => {
    if (tripState.isSearchingRoute) {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      )
      spin.start()
      return () => spin.stop()
    }
    spinAnim.setValue(0)
    return undefined
  }, [tripState.isSearchingRoute, spinAnim])

  const canExecuteSearch = useDebounceRef(500)
  const canExecuteRecentSearch = useDebounceRef(300)

  // Handle recent search selection - updates fields and scrolls to top
  const handleRecentSearchPress = useCallback(
    (search: {
      origin: string
      destination: string
      modeFilters?: string[]
    }) => {
      if (!canExecuteRecentSearch()) return

      // Load the recent search data into the form
      tripState.loadRecentSearch(search)

      // Scroll to top to show updated fields
      scrollViewRef.current?.scrollTo({ y: 0, animated: true })
    },
    [canExecuteRecentSearch, tripState],
  )

  // Debounced search handler with smooth loading transition
  const handleSearchRoute = useCallback(async () => {
    if (!canExecuteSearch() || tripState.isSearchingRoute) return

    // Show loading immediately
    tripState.setProp('isSearchingRoute', true)

    // Wait for next frame to ensure loading UI is rendered
    requestAnimationFrame(() => {
      // Run after animations complete for smoother UX
      InteractionManager.runAfterInteractions(async () => {
        try {
          await tripState.handleSearch(activeUserId, router)
        } finally {
          tripState.setProp('isSearchingRoute', false)
        }
      })
    })
  }, [canExecuteSearch, tripState, router, activeUserId])

  const loadAlertCount = useCallback(async () => {
    try {
      const alerts = await queries.getAllActiveAlerts()
      setAlertCount(alerts.length)
    } catch (error) {
      console.error('Error loading alert count:', error)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'PlanTrip',
        route: '/plan',
        // No formData needed - all state is in tripState (MobX store)
        // Automatically backed up via rootstore.json
      })
      loadAlertCount()
    }, [trackScreenMount, loadAlertCount]),
  )

  useEffect(() => {
    tripState.loadRecentSearches(activeUserId)
    loadAlertCount()

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start()
  }, [params?.sessionTimeStamp, tripState, activeUserId])

  const openTimePickerModal = () => {
    // Reset native picker state when opening modal
    tripState.setProp('showNativePicker', false)
    // Let the useEffect handle the animation
    tripState.setShowTimePicker(true)
  }

  const closeTimePickerModal = () => {
    // Close native picker first if open
    if (tripState.showNativePicker) {
      tripState.setProp('showNativePicker', false)
    }

    // Close the modal
    Animated.parallel([
      Animated.timing(modalSlideAnim, {
        toValue: 400,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(modalFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      tripState.setShowTimePicker(false)
    })
  }

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      // Android clock picker fires onChange with event.type when user confirms or dismisses
      if (event.type === 'set' && date) {
        // User confirmed the time selection
        tripState.setProp('selectedDate', date.toISOString())
        const formatted = date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        tripState.setSelectedTime(formatted)
        // Close the picker and modal after selection
        closeTimePickerModal()
      } else if (event.type === 'dismissed') {
        // User dismissed/cancelled the picker - just hide the native picker
        tripState.setProp('showNativePicker', false)
      }
    } else if (date) {
      // iOS: Update time as user scrolls the spinner
      tripState.setProp('selectedDate', date.toISOString())
    }
  }

  const confirmIOSTime = () => {
    const formatted = new Date(tripState.selectedDate).toLocaleTimeString(
      'en-US',
      {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      },
    )
    tripState.setSelectedTime(formatted)
    closeTimePickerModal()
  }

  const selectQuickTime = (minutes: number | 'now') => {
    if (minutes === 'now') {
      tripState.setSelectedTime('Now')
      closeTimePickerModal()
      return
    }
    const time = new Date()
    time.setMinutes(time.getMinutes() + minutes)
    const formatted = time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    tripState.setSelectedTime(formatted)
    tripState.setProp('selectedDate', time.toISOString())
    closeTimePickerModal()
  }

  const transitModes = [
    { id: 'all', name: 'All', icon: 'apps' },
    { id: 'bus', name: 'Bus', icon: 'bus' },
    { id: 'train', name: 'Train', icon: 'train' },
    { id: 'subway', name: 'subway' as const, icon: 'subway' },
  ]

  // Deduplicate recent searches - keep only unique origin/destination pairs
  // Convert MST nodes to plain objects to avoid "detached from state tree" errors
  // Computed directly to ensure MobX reactivity works correctly with observer
  const uniqueRecentSearches = (() => {
    const seen = new Set<string>()
    const result: {
      id: string
      origin: string
      destination: string
      modeFilters?: string[]
    }[] = []

    // Create a snapshot copy to avoid MST detachment issues
    const searchesCopy = tripState.recentSearches.slice()

    for (const search of searchesCopy) {
      const key = `${search.origin.toLowerCase()}-${search.destination.toLowerCase()}`
      if (!seen.has(key)) {
        seen.add(key)
        // Create plain object copy
        result.push({
          id: search.id,
          origin: search.origin,
          destination: search.destination,
        })
      }
    }

    return result
  })()

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Colorful Text */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Plan a Trip</Text>
          <Text style={styles.headerSubtitle}>Where would you like to go?</Text>
        </View>
        <TouchableOpacity
          style={styles.alertsButton}
          onPress={() => router.push('/alerts')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color={theme.colors.palette.primary400}
          />
          {alertCount > 0 && (
            <View style={styles.alertBadge}>
              <View style={styles.alertDot} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!tripState.showSearchModal}
      >
        <Animated.View
          style={[
            styles.mainCard,
            { opacity: fadeAnim, transform: [{ translateY: slideUp }] },
          ]}
        >
          {/* Input Section with Glass Effect */}
          <View style={styles.inputSection}>
            {/* Origin Input */}
            <View style={styles.inputRow}>
              <View style={styles.iconDot}>
                <View style={styles.originDot} />
              </View>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => tripState.openStopSearch('origin')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.input,
                    !tripState.origin && styles.inputPlaceholder,
                  ]}
                >
                  {tripState.origin || 'Enter starting point'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.locationBtn}
                onPress={() => tripState.handleLocationClick()}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="locate"
                  size={20}
                  color={theme.colors.palette.primary400}
                />
              </TouchableOpacity>
            </View>

            {/* Connector Line */}
            <View style={styles.connectorRow}>
              <View style={styles.connectorLine} />
            </View>

            {/* Destination Input */}
            <View style={styles.inputRow}>
              <View style={styles.iconDot}>
                <Ionicons
                  name="location"
                  size={18}
                  color={theme.colors.palette.primary500}
                />
              </View>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => tripState.openStopSearch('destination')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.input,
                    !tripState.destination && styles.inputPlaceholder,
                  ]}
                >
                  {tripState.destination || 'Enter destination'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.swapButton}
                onPress={() => tripState.swapLocations()}
              >
                <Ionicons
                  name="swap-vertical"
                  size={18}
                  color={theme.colors.palette.primary400}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Time Selection */}
          <View style={styles.timeSection}>
            <View style={styles.departLabel}>
              <Ionicons
                name="time-outline"
                size={16}
                color={theme.colors.palette.secondary500}
              />
              <Text style={styles.departLabelText}>Depart At</Text>
            </View>
            <TouchableOpacity
              style={styles.timeSelector}
              onPress={openTimePickerModal}
              activeOpacity={0.7}
            >
              <Ionicons
                name="time-outline"
                size={16}
                color={theme.colors.palette.primary400}
              />
              <Text style={styles.timeText}>{tripState.selectedTime}</Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={theme.colors.palette.neutral600}
              />
            </TouchableOpacity>
          </View>

          {/* Transit Modes */}
          <View style={styles.modesSection}>
            <Text style={styles.sectionLabel}>Transit Mode</Text>
            <View style={styles.modesGrid}>
              {transitModes.map(mode => {
                const isSelected = tripState.selectedModes.includes(mode.id)
                return (
                  <TouchableOpacity
                    key={mode.id}
                    style={[
                      styles.modeChip,
                      isSelected && styles.modeChipActive,
                    ]}
                    onPress={() => tripState.toggleMode(mode.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={mode.icon as 'apps' | 'bus' | 'train' | 'subway'}
                      size={18}
                      color={
                        isSelected
                          ? theme.colors.palette.neutral100
                          : theme.colors.palette.neutral600
                      }
                    />
                    <Text
                      style={[
                        styles.modeChipText,
                        isSelected && styles.modeChipTextActive,
                      ]}
                    >
                      {mode.name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Validation Error Message */}
          {tripState.hasValidationErrors && (
            <View style={styles.errorContainer}>
              <Ionicons
                name="alert-circle"
                size={16}
                color={theme.colors.palette.primary500}
              />
              <Text style={styles.errorText}>
                {tripState.getValidationError('routes') ||
                  tripState.getValidationError('origin') ||
                  tripState.getValidationError('destination')}
              </Text>
            </View>
          )}

          {/* Find Route Button - Inside Card */}
          <TouchableOpacity
            style={[
              styles.findButton,
              (tripState.isSearchingRoute || !tripState.isFormValid) &&
                styles.findButtonDisabled,
            ]}
            onPress={handleSearchRoute}
            activeOpacity={0.85}
            disabled={tripState.isSearchingRoute || !tripState.isFormValid}
          >
            <LinearGradient
              colors={
                tripState.isSearchingRoute
                  ? [
                      theme.colors.palette.neutral500,
                      theme.colors.palette.neutral600,
                    ]
                  : [
                      theme.colors.palette.primary500,
                      theme.colors.palette.secondary500,
                      theme.colors.palette.primary500,
                    ]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.findButtonGradient}
            >
              {tripState.isSearchingRoute ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.palette.neutral100}
                  />
                  <Text style={styles.findButtonText}>Searching...</Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="search"
                    size={20}
                    color={theme.colors.palette.neutral100}
                  />
                  <Text style={styles.findButtonText}>Find Route</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Recent Searches - Outside Card (deduplicated) */}
        {uniqueRecentSearches.length > 0 && (
          <Animated.View
            style={[
              styles.recentCard,
              { opacity: fadeAnim, transform: [{ translateY: slideUp }] },
            ]}
          >
            <Text style={styles.sectionLabel}>Recent Searches</Text>
            {uniqueRecentSearches.map((search, index) => (
              <TouchableOpacity
                key={search.id}
                style={[
                  styles.recentItem,
                  index === uniqueRecentSearches.length - 1 &&
                    styles.recentItemLast,
                ]}
                onPress={() => handleRecentSearchPress(search)}
                activeOpacity={0.7}
              >
                <View style={styles.recentIcon}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={theme.colors.palette.primary300}
                  />
                </View>
                <View style={styles.recentTextContainer}>
                  <Text style={styles.recentName}>{search.origin}</Text>
                  <Text style={styles.recentSubtitle}>
                    to {search.destination}
                  </Text>
                </View>
                <View style={styles.recentArrow}>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.palette.neutral500}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal
        visible={tripState.showTimePicker}
        transparent
        animationType="none"
        onRequestClose={closeTimePickerModal}
      >
        <View style={styles.timePickerModalContainer}>
          <Animated.View
            style={[styles.timePickerOverlay, { opacity: modalFadeAnim }]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeTimePickerModal}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.timePickerSheet,
              { transform: [{ translateY: modalSlideAnim }] },
            ]}
          >
            {/* Handle Bar */}
            <View style={styles.sheetHandle}>
              <View style={styles.sheetHandleBar} />
            </View>

            {/* Header */}
            <View style={styles.timePickerHeader}>
              <TouchableOpacity onPress={closeTimePickerModal}>
                <Text style={styles.timePickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.timePickerTitle}>Select Time</Text>
              {Platform.OS === 'ios' && tripState.showNativePicker ? (
                <TouchableOpacity onPress={confirmIOSTime}>
                  <Text style={styles.timePickerDone}>Done</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.timePickerHeaderSpacer} />
              )}
            </View>

            {/* Quick Options */}
            <View style={styles.quickOptionsContainer}>
              <Text style={styles.quickOptionsLabel}>Quick Select</Text>
              <View style={styles.quickOptionsRow}>
                <TouchableOpacity
                  style={[
                    styles.quickOption,
                    tripState.selectedTime === 'Now' &&
                      styles.quickOptionActive,
                  ]}
                  onPress={() => selectQuickTime('now')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="flash"
                    size={18}
                    color={
                      tripState.selectedTime === 'Now'
                        ? theme.colors.palette.neutral100
                        : theme.colors.palette.primary400
                    }
                  />
                  <Text
                    style={[
                      styles.quickOptionText,
                      tripState.selectedTime === 'Now' &&
                        styles.quickOptionTextActive,
                    ]}
                  >
                    Now
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickOption}
                  onPress={() => selectQuickTime(15)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickOptionText}>+15 min</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickOption}
                  onPress={() => selectQuickTime(30)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickOptionText}>+30 min</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickOption}
                  onPress={() => selectQuickTime(60)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickOptionText}>+1 hr</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Custom Time Picker */}
            <View style={styles.customTimeSection}>
              <TouchableOpacity
                style={styles.customTimeButton}
                onPress={() => {
                  tripState.setProp(
                    'showNativePicker',
                    !tripState.showNativePicker,
                  )
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tripState.showNativePicker ? 'time' : 'time-outline'}
                  size={24}
                  color={theme.colors.palette.primary400}
                />
                <View style={styles.customTimeTextContainer}>
                  <Text style={styles.customTimeLabel}>Custom Time</Text>
                  <Text style={styles.customTimeValue}>
                    {new Date(tripState.selectedDate).toLocaleTimeString(
                      'en-US',
                      {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      },
                    )}
                  </Text>
                </View>
                <Ionicons
                  name={
                    tripState.showNativePicker
                      ? 'chevron-up'
                      : 'chevron-forward'
                  }
                  size={20}
                  color={theme.colors.palette.neutral500}
                />
              </TouchableOpacity>

              {/* Native Picker with animation */}
              {tripState.showTimePicker && tripState.showNativePicker && (
                <Animated.View
                  style={[
                    styles.nativePickerContainer,
                    {
                      opacity: nativePickerOpacity,
                    },
                  ]}
                  pointerEvents="auto"
                >
                  <DateTimePicker
                    value={new Date(tripState.selectedDate)}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                    onChange={handleTimeChange}
                    style={styles.nativePicker}
                  />
                </Animated.View>
              )}
            </View>

            {/* Current Selection Display */}
            <View style={styles.currentSelectionContainer}>
              <Text style={styles.currentSelectionLabel}>Departing</Text>
              <Text style={styles.currentSelectionTime}>
                {tripState.selectedTime}
              </Text>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Search Modal */}
      <Modal
        visible={tripState.showSearchModal}
        animationType="slide"
        onRequestClose={() => tripState.setShowSearchModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => tripState.setShowSearchModal(false)}
              >
                <Ionicons
                  name="close"
                  size={28}
                  color={theme.colors.palette.neutral900}
                />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {tripState.searchingFor === 'origin'
                  ? 'Select Starting Point'
                  : 'Select Destination'}
              </Text>
              <View style={styles.modalHeaderSpacer} />
            </View>

            <View style={styles.searchInputContainer}>
              <Ionicons
                name="search"
                size={20}
                color={theme.colors.palette.neutral500}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for stops..."
                placeholderTextColor={theme.colors.palette.neutral500}
                onChangeText={text => {
                  if (text.length > 0) {
                    tripState.searchStops(text)
                  } else {
                    // Reset to default list when search is cleared
                    tripState.openStopSearch(
                      tripState.searchingFor as 'origin' | 'destination',
                    )
                  }
                }}
                autoFocus
              />
            </View>

            {tripState.isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            ) : (
              <FlatList
                data={tripState.searchResults}
                keyExtractor={item => item.id}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                  tripState.searchResults.length > 0 ? (
                    <View style={styles.listHeader}>
                      <Text style={styles.listHeaderText}>
                        {tripState.isSearching
                          ? 'Search Results'
                          : 'Recent Locations'}
                      </Text>
                    </View>
                  ) : null
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => tripState.selectStop(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.searchResultIcon}>
                      <Ionicons
                        name="location"
                        size={24}
                        color={theme.colors.palette.primary400}
                      />
                    </View>
                    <View style={styles.searchResultText}>
                      <Text style={styles.searchResultName}>{item.name}</Text>
                      {item.description && (
                        <Text style={styles.searchResultDescription}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons
                      name="location-outline"
                      size={48}
                      color={theme.colors.palette.neutral400}
                    />
                    <Text style={styles.emptyText}>No stops found</Text>
                    <Text style={styles.emptySubtext}>
                      Try searching with different keywords
                    </Text>
                  </View>
                }
              />
            )}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Full Screen Loading Overlay - Outside SafeAreaView for proper coverage */}
      <LoadingOverlay visible={tripState.isSearchingRoute} />
    </SafeAreaView>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral200,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 16,
      backgroundColor: theme.colors.palette.neutral100,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    alertsButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
      position: 'relative',
    },
    alertBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 10,
      height: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    alertDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.palette.secondary500,
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral100,
    },
    headerTitle: {
      fontSize: 32,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.secondary500,
    },
    headerSubtitle: {
      fontSize: 15,
      color: theme.colors.palette.neutral600,
      fontFamily: typography.primary.medium,
      marginTop: 4,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingTop: 16,
      paddingBottom: 100,
    },
    mainCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 28,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    inputSection: {
      marginBottom: 24,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconDot: {
      width: 28,
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
    },
    originDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 3,
      borderColor: theme.colors.palette.primary400,
      backgroundColor: theme.colors.palette.neutral100,
    },
    inputContainer: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderWidth: 1.5,
      borderColor: theme.colors.palette.neutral300,
    },
    input: {
      fontSize: 15,
      color: theme.colors.palette.neutral900,
      padding: 0,
      fontFamily: typography.primary.medium,
    },
    inputPlaceholder: {
      color: theme.colors.palette.neutral500,
    },
    locationBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
    },
    connectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 13,
      marginVertical: 6,
    },
    connectorLine: {
      width: 2,
      height: 20,
      backgroundColor: theme.colors.palette.neutral400,
    },
    swapButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
    timeSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 24,
    },
    departLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.palette.primary100,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary200,
    },
    departLabelText: {
      fontSize: 14,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.primary400,
    },
    timeSelector: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 14,
      paddingHorizontal: 8,
      paddingVertical: 12,
      gap: 6,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
    },
    timeText: {
      flex: 1,
      fontSize: 12,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral900,
    },
    modesSection: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 15,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
      marginBottom: 14,
      letterSpacing: 0.3,
    },
    modesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    modeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 18,
      gap: 8,
      borderWidth: 1.5,
      borderColor: theme.colors.palette.neutral300,
    },
    modeChipActive: {
      backgroundColor: theme.colors.palette.primary500,
      borderColor: theme.colors.palette.secondary500,
      shadowColor: theme.colors.palette.secondary400,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    modeChipText: {
      fontSize: 14,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral600,
    },
    modeChipTextActive: {
      color: theme.colors.palette.neutral100,
      fontFamily: typography.primary.bold,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.palette.angry100,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.palette.angry200,
    },
    errorText: {
      flex: 1,
      fontSize: 14,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.primary500,
    },
    findButton: {
      borderRadius: 18,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.primary400,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    findButtonDisabled: {
      shadowColor: theme.colors.palette.neutral600,
      shadowOpacity: 0.15,
    },
    findButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 18,
      gap: 10,
    },
    findButtonText: {
      fontSize: 17,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
      letterSpacing: 0.5,
    },
    loadingOverlayFixed: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: `${theme.colors.palette.neutral900}80`,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      elevation: 9999,
    },
    loadingCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 24,
      padding: 32,
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 12,
      gap: 12,
      minWidth: 200,
    },
    loadingOverlayText: {
      fontSize: 18,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
      marginTop: 8,
    },
    loadingOverlaySubtext: {
      fontSize: 14,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
    },
    recentCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 28,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    recentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    recentItemLast: {
      borderBottomWidth: 0,
    },
    recentIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recentTextContainer: {
      flex: 1,
    },
    recentName: {
      fontSize: 16,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
      marginBottom: 3,
    },
    recentSubtitle: {
      fontSize: 13,
      color: theme.colors.palette.neutral600,
      fontFamily: typography.primary.medium,
    },
    recentArrow: {
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
    },
    modalHeaderSpacer: {
      width: 28,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      marginHorizontal: 20,
      marginVertical: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      gap: 12,
    },
    listHeader: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: theme.colors.palette.neutral200,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    listHeaderText: {
      fontSize: 13,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral600,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral900,
      padding: 0,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 15,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
    },
    searchResultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      gap: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    searchResultIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchResultText: {
      flex: 1,
    },
    searchResultName: {
      fontSize: 16,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    searchResultDescription: {
      fontSize: 14,
      fontFamily: typography.primary.normal,
      color: theme.colors.palette.neutral600,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 80,
      gap: 12,
    },
    emptyText: {
      fontSize: 15,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral600,
    },
    emptySubtext: {
      fontSize: 13,
      fontFamily: typography.primary.normal,
      color: theme.colors.palette.neutral500,
      marginTop: 4,
    },
    timePickerModalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    timePickerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: `${theme.colors.palette.neutral900}80`,
    },
    timePickerSheet: {
      backgroundColor: theme.colors.palette.neutral100,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingBottom: 40,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 16,
    },
    sheetHandle: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    sheetHandleBar: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.palette.neutral400,
      borderRadius: 2,
    },
    timePickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    timePickerCancel: {
      fontSize: 16,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
    },
    timePickerTitle: {
      fontSize: 18,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
    },
    timePickerDone: {
      fontSize: 16,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.primary400,
    },
    timePickerHeaderSpacer: {
      width: 50,
    },
    quickOptionsContainer: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    quickOptionsLabel: {
      fontSize: 13,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral600,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    quickOptionsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    quickOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      backgroundColor: theme.colors.palette.primary100,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.colors.palette.primary200,
    },
    quickOptionActive: {
      backgroundColor: theme.colors.palette.primary400,
      borderColor: theme.colors.palette.primary400,
    },
    quickOptionText: {
      fontSize: 14,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.primary400,
    },
    quickOptionTextActive: {
      color: theme.colors.palette.neutral100,
    },
    customTimeSection: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    customTimeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 16,
      padding: 16,
      gap: 14,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
    },
    customTimeTextContainer: {
      flex: 1,
    },
    customTimeLabel: {
      fontSize: 14,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
      marginBottom: 2,
    },
    customTimeValue: {
      fontSize: 18,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
    },
    nativePickerContainer: {
      marginTop: 16,
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 16,
      overflow: 'hidden',
    },
    nativePicker: {
      height: 180,
    },
    currentSelectionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingTop: 24,
      paddingHorizontal: 20,
    },
    currentSelectionLabel: {
      fontSize: 15,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
    },
    currentSelectionTime: {
      fontSize: 20,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.primary400,
    },
  })

export default PlanTripScreen
