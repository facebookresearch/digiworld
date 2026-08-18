// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import React, {
  useMemo,
  useEffect,
  useState,
  useRef,
  useCallback,
  memo,
} from 'react'
import { typography, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import LinearGradient from 'react-native-linear-gradient'
import { observer } from 'mobx-react-lite'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import {
  ActivityIndicator,
  Animated,
  Easing,
  InteractionManager,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStores } from '../../models'
import {
  Route,
  filterRoutes,
  getRouteSummary,
  generateRouteOptions,
} from '../../utils/routeGeneratorDB'
import { mutations } from '../../db/mutations'

type FilterType = 'fastest' | 'cheapest' | 'fewest-transfers' | 'direct'

// Filter configuration for cleaner rendering
const getFilterConfig = (theme: any) => [
  {
    id: 'fastest' as FilterType,
    label: 'Fast',
    icon: 'flash',
    iconOutline: 'flash-outline',
    colors: [theme.colors.palette.primary300, theme.colors.palette.primary400],
  },
  {
    id: 'cheapest' as FilterType,
    label: 'Cheap',
    icon: 'wallet',
    iconOutline: 'wallet-outline',
    colors: [theme.colors.palette.primary500, theme.colors.palette.primary600],
  },
  {
    id: 'fewest-transfers' as FilterType,
    label: 'Less',
    icon: 'git-branch',
    iconOutline: 'git-branch-outline',
    colors: [
      theme.colors.palette.secondary500,
      theme.colors.palette.secondary500,
    ],
  },
  {
    id: 'direct' as FilterType,
    label: 'Direct',
    icon: 'arrow-forward',
    iconOutline: 'arrow-forward-outline',
    colors: [theme.colors.palette.accent500, theme.colors.palette.accent500],
  },
]

// Simple debounce using ref
const useDebounceRef = () => {
  const lastCallRef = useRef<number>(0)
  const DEBOUNCE_DELAY = 300

  const canExecute = useCallback(() => {
    const now = Date.now()
    if (now - lastCallRef.current < DEBOUNCE_DELAY) {
      return false
    }
    lastCallRef.current = now
    return true
  }, [])

  return canExecute
}

// Helper functions moved outside component for performance
const getTransitIcon = (mode: string) => {
  switch (mode) {
    case 'bus':
      return 'bus'
    case 'subway':
      return 'subway'
    case 'train':
      return 'train'
    default:
      return 'walk'
  }
}

const getModeColor = (mode: string, theme: any) => {
  switch (mode) {
    case 'bus':
      return theme.colors.palette.secondary400
    case 'subway':
      return theme.colors.palette.angry500
    case 'train':
      return theme.colors.palette.accent400
    default:
      return theme.colors.palette.neutral500
  }
}

// Format time in railway/transit style (24-hour format, always HH:MM)
const formatRailwayTime = (timeStr: string): string => {
  if (!timeStr) return '--:--'

  // Remove any AM/PM and whitespace
  const cleaned = timeStr
    .trim()
    .toUpperCase()
    .replace(/\s*(AM|PM)\s*/gi, '')
    .trim()

  // Check if already in 24-hour format (HH:MM)
  if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
    const [hoursStr, minutesStr] = cleaned.split(':')
    let hours = parseInt(hoursStr, 10)
    const minutes = minutesStr

    // If it was originally 12-hour format, convert
    const originalTime = timeStr.trim().toUpperCase()
    const isPM = originalTime.includes('PM')
    const isAM = originalTime.includes('AM')

    if (isPM && hours !== 12) {
      hours += 12
    } else if (isAM && hours === 12) {
      hours = 0
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`
  }

  return cleaned
}

// Memoized Route Card Component for FlashList performance
interface RouteCardProps {
  route: Route
  index: number
  isFirst: boolean
  pulseAnim: Animated.Value
  onPress: (route: Route) => void
  onSave: (route: Route) => void
}

const RouteCard = memo(
  ({ route, isFirst, pulseAnim, onPress, onSave }: RouteCardProps) => {
    const { theme } = useAppTheme()
    const styles = useMemo(() => createStyles(theme), [theme])
    const summary = getRouteSummary(route)
    // Format time range with railway time style
    const formattedTimeRange = `${formatRailwayTime(route.departureTime)} - ${formatRailwayTime(route.arrivalTime)}`

    return (
      <TouchableOpacity
        style={[styles.routeCard, isFirst && styles.routeCardFirst]}
        onPress={() => onPress(route)}
        activeOpacity={0.7}
      >
        {/* Best Route Badge */}
        {isFirst && (
          <Animated.View
            style={[styles.bestBadge, { transform: [{ scale: pulseAnim }] }]}
          >
            <LinearGradient
              colors={[
                theme.colors.palette.primary300,
                theme.colors.palette.primary400,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bestBadgeGradient}
            >
              <Ionicons
                name="star"
                size={12}
                color={theme.colors.palette.neutral100}
              />
              <Text style={styles.bestBadgeText}>Best Option</Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Time Header */}
        <View style={styles.routeCardHeader}>
          <View style={styles.routeCardTimeContainer}>
            <Text style={styles.railwayTimeRange}>{formattedTimeRange}</Text>
            <View style={styles.durationBadge}>
              <Ionicons
                name="time"
                size={12}
                color={theme.colors.palette.primary400}
              />
              <Text style={styles.routeCardDuration}>{summary.duration}</Text>
            </View>
          </View>
          <View style={styles.fareContainer}>
            <Text style={styles.fareLabel}>Fare</Text>
            <Text style={styles.fareText}>{summary.fare}</Text>
          </View>
        </View>

        {/* Transit Modes Visual Journey */}
        <View style={styles.routeCardModes}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.modeScrollContent}
          >
            <View
              style={[
                styles.modeIconsContainer,
                summary.modes.length > 2 && styles.modeIconsCompact,
              ]}
            >
              <View
                style={[
                  styles.walkStartContainer,
                  summary.modes.length > 2 && styles.walkContainerCompact,
                ]}
              >
                <Ionicons
                  name="walk"
                  size={summary.modes.length > 2 ? 14 : 18}
                  color={theme.colors.palette.neutral500}
                />
              </View>
              <View
                style={[
                  styles.modeLine,
                  summary.modes.length > 2 && styles.modeLineCompact,
                ]}
              />
              {summary.modes.map((mode, modeIndex) => (
                <View key={modeIndex} style={styles.modeItem}>
                  <View
                    style={[
                      styles.modeIconCircle,
                      summary.modes.length > 2 && styles.modeIconCircleCompact,
                      {
                        backgroundColor:
                          mode.color || getModeColor(mode.type, theme),
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        getTransitIcon(mode.type) as
                          | 'bus'
                          | 'subway'
                          | 'train'
                          | 'walk'
                      }
                      size={summary.modes.length > 2 ? 12 : 16}
                      color={theme.colors.palette.neutral100}
                    />
                  </View>
                  {mode.lineNumber && (
                    <View
                      style={[
                        styles.lineBadge,
                        summary.modes.length > 2 && styles.lineBadgeCompact,
                        {
                          backgroundColor: `${mode.color || getModeColor(mode.type, theme)}15`,
                          borderColor:
                            mode.color || getModeColor(mode.type, theme),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeLabel,
                          summary.modes.length > 2 && styles.modeLabelCompact,
                          {
                            color: mode.color || getModeColor(mode.type, theme),
                          },
                        ]}
                      >
                        {mode.lineNumber}
                      </Text>
                    </View>
                  )}
                  {modeIndex < summary.modes.length - 1 && (
                    <View
                      style={[
                        styles.modeLine,
                        summary.modes.length > 2 && styles.modeLineCompact,
                      ]}
                    />
                  )}
                </View>
              ))}
              <View
                style={[
                  styles.modeLine,
                  summary.modes.length > 2 && styles.modeLineCompact,
                ]}
              />
              <View
                style={[
                  styles.walkEndContainer,
                  summary.modes.length > 2 && styles.walkContainerCompact,
                ]}
              >
                <Ionicons
                  name="flag"
                  size={summary.modes.length > 2 ? 12 : 16}
                  color={theme.colors.palette.primary500}
                />
              </View>
            </View>
          </ScrollView>
          {summary.modes.length > 2 && (
            <View style={styles.scrollHint}>
              <Ionicons
                name="chevron-forward"
                size={12}
                color={theme.colors.palette.neutral500}
              />
            </View>
          )}
        </View>

        {/* Transfer Info and Actions */}
        <View style={styles.routeCardFooter}>
          <View style={styles.footerLeft}>
            <View style={styles.transferBadge}>
              <Ionicons
                name="git-branch-outline"
                size={14}
                color={theme.colors.palette.neutral600}
              />
              <Text style={styles.transferText}>{summary.transfers}</Text>
            </View>
            {route.hasDelay && route.delayMinutes && route.delayMinutes > 0 && (
              <View style={styles.delayBadge}>
                <Ionicons
                  name="warning"
                  size={12}
                  color={theme.colors.palette.accent400}
                />
                <Text style={styles.delayText}>
                  {route.delayMinutes}m delay
                </Text>
              </View>
            )}
          </View>
          <View style={styles.routeActions}>
            <TouchableOpacity
              style={styles.saveIconButton}
              onPress={e => {
                e.stopPropagation()
                onSave(route)
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="bookmark-outline"
                size={18}
                color={theme.colors.palette.primary400}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() => onPress(route)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewDetailsText}>Details</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.colors.palette.neutral100}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    )
  },
)

const RouteOptionsScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const FILTER_CONFIG = useMemo(() => getFilterConfig(theme), [theme])
  const { trackScreenMount } = useInteractionTracking(
    'RouteOptions',
    '/routes/route-options',
  )
  const router = useRouter()
  const params = useLocalSearchParams()
  const {
    tripPlannerStore: { tripState },
    routeOptionsStore: { routeOptionsState },
  } = useStores()

  const [routes, setRoutes] = useState<Route[]>([])
  const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [routeName, setRouteName] = useState('')
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Transit mode configuration
  const transitModes = [
    { id: 'bus', icon: 'bus', color: theme.colors.palette.secondary400 },
    { id: 'train', icon: 'train', color: theme.colors.palette.accent400 },
    { id: 'subway', icon: 'subway', color: theme.colors.palette.angry500 },
  ]

  // Track screen mount
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'RouteOptions',
        route: '/routes/route-options',
      })
    }, [trackScreenMount]),
  )

  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current
  const filterAnim = useRef(new Animated.Value(0)).current
  const emptyStateAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const listFadeAnim = useRef(new Animated.Value(1)).current
  const processingFadeAnim = useRef(new Animated.Value(0)).current
  const modeMenuAnim = useRef(new Animated.Value(0)).current
  const isFilterChanging = useRef(false)

  // Animate mode menu
  useEffect(() => {
    Animated.timing(modeMenuAnim, {
      toValue: routeOptionsState.showModeMenu ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [routeOptionsState.showModeMenu, modeMenuAnim])

  // Animate processing overlay
  useEffect(() => {
    if (isProcessing) {
      Animated.timing(processingFadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(processingFadeAnim, {
        toValue: 0,
        duration: 80,
        useNativeDriver: true,
      }).start()
    }
  }, [isProcessing, processingFadeAnim])

  // Pulse animation for the "best" badge
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    )
    pulse.start()
    return () => pulse.stop()
  }, [pulseAnim])

  useEffect(() => {
    const loadRoutes = async () => {
      // Animate header
      Animated.spring(headerAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start()

      // Animate filters
      Animated.timing(filterAnim, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }).start()

      let parsedRoutes: Route[] = []

      // Try to get routes from params first
      if (params.routes) {
        try {
          parsedRoutes = JSON.parse(params.routes as string) as Route[]
        } catch (error) {
          console.error('Error parsing routes from params:', error)
        }
      }

      // If no routes in params, regenerate from origin/destination
      if (parsedRoutes.length === 0) {
        if (tripState.origin && tripState.destination) {
          try {
            setIsProcessing(true)
            parsedRoutes = await generateRouteOptions({
              origin: tripState.origin,
              destination: tripState.destination,
              departureTime:
                tripState.selectedTime === 'Now'
                  ? undefined
                  : tripState.selectedTime,
              timeMode: tripState.timeMode as 'depart' | 'arrive',
              selectedModes: tripState.selectedModes.slice(),
              maxTransfers: 2,
            })
          } catch (error) {
            console.error('Error generating routes:', error)
          } finally {
            setIsProcessing(false)
          }
        }
      }

      setRoutes(parsedRoutes)

      // Apply both filter and mode filtering
      let filtered = filterRoutes(
        parsedRoutes,
        routeOptionsState.activeFilter as FilterType,
      )

      // Filter by selected transit modes
      if (routeOptionsState.selectedModes.length > 0) {
        filtered = filtered.filter(route => {
          const routeModes = route.segments
            .map(seg => seg.mode.type)
            .filter(mode => mode !== 'walk')
          return routeModes.some(mode =>
            routeOptionsState.selectedModes.includes(mode),
          )
        })
      }

      setFilteredRoutes(filtered)

      // Empty state animation
      if (filtered.length === 0) {
        Animated.spring(emptyStateAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          delay: 400,
          useNativeDriver: true,
        }).start()
      }
    }

    loadRoutes()
  }, [])

  useEffect(() => {
    if (routes.length > 0 && !isFilterChanging.current) {
      isFilterChanging.current = true

      // Smooth fade out
      Animated.timing(listFadeAnim, {
        toValue: 0.3,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        // Filter by type first, then by selected modes
        let filtered = filterRoutes(
          routes,
          routeOptionsState.activeFilter as FilterType,
        )

        // Filter by selected transit modes
        if (routeOptionsState.selectedModes.length > 0) {
          filtered = filtered.filter(route => {
            // Check if route uses at least one of the selected modes
            const routeModes = route.segments
              .map(seg => seg.mode.type)
              .filter(mode => mode !== 'walk')
            return routeModes.some(mode =>
              routeOptionsState.selectedModes.includes(mode),
            )
          })
        }

        setFilteredRoutes(filtered)

        // Smooth fade in with slight slide
        Animated.spring(listFadeAnim, {
          toValue: 1,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }).start(() => {
          isFilterChanging.current = false
        })
      })
    }
  }, [
    routeOptionsState.activeFilter,
    routes,
    listFadeAnim,
    routeOptionsState.selectedModes,
  ])

  const canExecute = useDebounceRef()

  // Handle transit mode toggle
  const handleModeToggle = useCallback(
    (modeId: string) => {
      if (!canExecute()) return

      setIsProcessing(true)
      requestAnimationFrame(() => {
        routeOptionsState.toggleMode(modeId)
        InteractionManager.runAfterInteractions(() => {
          setIsProcessing(false)
        })
      })
    },
    [canExecute, routeOptionsState],
  )

  // Debounced filter press handler with smooth transition
  const handleFilterPress = useCallback(
    (filter: FilterType) => {
      if (!canExecute()) return
      if (
        filter === routeOptionsState.activeFilter ||
        isFilterChanging.current
      ) {
        return
      }

      setIsProcessing(true)
      // Allow UI to update before changing filter
      requestAnimationFrame(() => {
        routeOptionsState.setActiveFilter(filter)
        // Hide processing after filter animation completes
        InteractionManager.runAfterInteractions(() => {
          setIsProcessing(false)
        })
      })
    },
    [routeOptionsState.activeFilter, canExecute, routeOptionsState],
  )

  // Debounced route press handler with smooth navigation
  const handleRoutePress = useCallback(
    (route: Route) => {
      if (!canExecute()) return

      setIsProcessing(true)

      // Show loading first, then navigate after UI updates
      requestAnimationFrame(() => {
        InteractionManager.runAfterInteractions(() => {
          router.push({
            pathname: '/routes/route-detail',
            params: { route: JSON.stringify(route) },
          })
          // Small delay to ensure navigation starts before hiding
          setTimeout(() => setIsProcessing(false), 50)
        })
      })
    },
    [canExecute, router],
  )

  const handleSavePress = useCallback((route: Route) => {
    setSelectedRoute(route)
    setShowSaveModal(true)
  }, [])

  // Handle back navigation - go to plan tab if no back stack
  const handleBackPress = useCallback(() => {
    if (router.canGoBack()) {
      router.back()
    } else {
      // If no back stack (e.g., deeplink cold start), go to plan tab
      router.replace('/(tabs)/plan')
    }
  }, [router])

  const handleSaveRoute = async () => {
    if (!selectedRoute || !routeName.trim()) return

    setIsSaving(true)
    try {
      const transitSegments = selectedRoute.segments.filter(
        seg => seg.mode.type !== 'walk',
      )
      const modes = [...new Set(transitSegments.map(seg => seg.mode.type))]
      const preferredMode = modes.length === 1 ? modes[0] : 'mixed'

      await mutations.saveRoute({
        userId: 1, // TODO: Get actual user ID
        name: routeName.trim(),
        origin: tripState.origin,
        destination: tripState.destination,
        preferredMode,
      })

      setSaveSuccess(true)
      setTimeout(() => {
        setShowSaveModal(false)
        setSaveSuccess(false)
        setRouteName('')
        setSelectedRoute(null)
      }, 1500)
    } catch (error) {
      console.error('Error saving route:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Render item for FlashList
  const renderRouteItem = useCallback(
    ({ item, index }: { item: Route; index: number }) => (
      <RouteCard
        route={item}
        index={index}
        isFirst={index === 0}
        pulseAnim={pulseAnim}
        onPress={handleRoutePress}
        onSave={handleSavePress}
      />
    ),
    [pulseAnim, handleRoutePress, handleSavePress],
  )

  // Empty state component
  const ListEmptyComponent = useCallback(
    () => (
      <Animated.View
        style={[
          styles.emptyContainer,
          {
            opacity: emptyStateAnim,
            transform: [
              {
                translateY: emptyStateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
              { scale: emptyStateAnim },
            ],
          },
        ]}
      >
        <View style={styles.emptyIconContainer}>
          <LinearGradient
            colors={[
              theme.colors.palette.primary100,
              theme.colors.palette.primary200,
            ]}
            style={styles.emptyIconGradient}
          >
            <Ionicons
              name="map-outline"
              size={48}
              color={theme.colors.palette.primary400}
            />
          </LinearGradient>
        </View>
        <Text style={styles.emptyText}>No Routes Found</Text>
        <Text style={styles.emptySubtext}>
          We couldn't find any routes between these locations
        </Text>

        <View style={styles.suggestionsList}>
          <View style={styles.suggestionItem}>
            <View style={styles.suggestionIcon}>
              <Ionicons
                name="location"
                size={16}
                color={theme.colors.palette.primary500}
              />
            </View>
            <Text style={styles.suggestionText}>
              Try selecting different stops
            </Text>
          </View>
          <View style={styles.suggestionItem}>
            <View style={styles.suggestionIcon}>
              <Ionicons
                name="git-network"
                size={16}
                color={theme.colors.palette.secondary500}
              />
            </View>
            <Text style={styles.suggestionText}>
              Check if the stops are connected
            </Text>
          </View>
          <View style={styles.suggestionItem}>
            <View style={styles.suggestionIcon}>
              <Ionicons
                name="options"
                size={16}
                color={theme.colors.palette.accent400}
              />
            </View>
            <Text style={styles.suggestionText}>
              Change your transport mode filters
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.tryAgainButton}
          onPress={handleBackPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[
              theme.colors.palette.primary300,
              theme.colors.palette.primary400,
              theme.colors.palette.primary500,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tryAgainGradient}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color={theme.colors.palette.neutral100}
            />
            <Text style={styles.tryAgainText}>Modify Search</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    ),
    [emptyStateAnim, router],
  )

  // Key extractor for FlashList
  const keyExtractor = useCallback((item: Route) => item.id, [])

  return (
    <SafeAreaView style={styles.container}>
      {/* Gradient Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[
            theme.colors.palette.primary300,
            `${theme.colors.palette.neutral100}FD`,
          ]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[
                  theme.colors.palette.primary300,
                  theme.colors.palette.primary400,
                ]}
                style={styles.backButtonGradient}
              >
                <Ionicons
                  name="arrow-back"
                  size={20}
                  color={theme.colors.palette.neutral100}
                />
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Route Options</Text>
              <Text style={styles.headerSubtitle}>
                {filteredRoutes.length} route
                {filteredRoutes.length !== 1 ? 's' : ''} found
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modeMenuButton}
              onPress={() =>
                routeOptionsState.setShowModeMenu(
                  !routeOptionsState.showModeMenu,
                )
              }
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  routeOptionsState.showModeMenu ? 'close' : 'options-outline'
                }
                size={22}
                color={theme.colors.palette.neutral600}
              />
              {routeOptionsState.selectedModes.length < 3 && (
                <View style={styles.modeBadge}>
                  <Text style={styles.modeBadgeText}>
                    {routeOptionsState.selectedModes.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Mode Selection Menu - Collapsible */}
      {routeOptionsState.showModeMenu && (
        <Animated.View
          style={[
            styles.modeMenuContainer,
            {
              opacity: modeMenuAnim,
              transform: [
                {
                  translateY: modeMenuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.modeMenuContent}>
            <Text style={styles.modeMenuTitle}>Filter by Transit Mode</Text>
            <View style={styles.modeMenuGrid}>
              {transitModes.map(mode => {
                const isSelected = routeOptionsState.selectedModes.includes(
                  mode.id,
                )
                return (
                  <TouchableOpacity
                    key={mode.id}
                    style={[
                      styles.modeMenuItem,
                      isSelected && styles.modeMenuItemActive,
                    ]}
                    onPress={() => handleModeToggle(mode.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.modeMenuIcon,
                        isSelected && { backgroundColor: mode.color },
                      ]}
                    >
                      <Ionicons
                        name={mode.icon as any}
                        size={24}
                        color={
                          isSelected
                            ? theme.colors.palette.neutral100
                            : mode.color
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.modeMenuLabel,
                        isSelected && styles.modeMenuLabelActive,
                      ]}
                    >
                      {mode.id.charAt(0).toUpperCase() + mode.id.slice(1)}
                    </Text>
                    {isSelected && (
                      <View style={styles.modeMenuCheck}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={mode.color}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </Animated.View>
      )}

      {/* Route Info Card */}
      <Animated.View
        style={[
          styles.routeInfoCard,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
              { scale: headerAnim },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[
            theme.colors.palette.neutral100,
            `${theme.colors.palette.neutral100}FE`,
          ]}
          style={styles.routeInfoGradient}
        >
          <View style={styles.routeInfoContent}>
            <View style={styles.routeInfoRow}>
              <View style={styles.locationIconContainer}>
                <View style={styles.originDotOuter}>
                  <View style={styles.originDotInner} />
                </View>
              </View>
              <View style={styles.routeInfoTextContainer}>
                <Text style={styles.routeInfoLabel}>FROM</Text>
                <Text style={styles.routeInfoText} numberOfLines={1}>
                  {tripState.origin}
                </Text>
              </View>
            </View>

            <View style={styles.routeConnector}>
              <View style={styles.connectorDot} />
              <View style={styles.connectorLine} />
              <View style={styles.connectorDot} />
            </View>

            <View style={styles.routeInfoRow}>
              <View style={styles.locationIconContainer}>
                <LinearGradient
                  colors={[
                    theme.colors.palette.primary400,
                    theme.colors.palette.primary500,
                  ]}
                  style={styles.destinationDotGradient}
                >
                  <Ionicons
                    name="location"
                    size={14}
                    color={theme.colors.palette.neutral100}
                  />
                </LinearGradient>
              </View>
              <View style={styles.routeInfoTextContainer}>
                <Text style={styles.routeInfoLabel}>TO</Text>
                <Text style={styles.routeInfoText} numberOfLines={1}>
                  {tripState.destination}
                </Text>
              </View>
            </View>

            <View style={styles.timeInfoRow}>
              <View style={styles.timeChip}>
                <Ionicons
                  name="time"
                  size={14}
                  color={theme.colors.palette.primary400}
                />
                <Text style={styles.timeChipText}>
                  {params.timeMode === 'arrive' ? 'Arrive by' : 'Depart at'}{' '}
                  {params.selectedTime || tripState.selectedTime || 'Now'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={theme.colors.palette.primary400}
            />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      {/* Filter Tabs - Horizontal Scroll */}
      <Animated.View
        style={[
          styles.filterWrapper,
          {
            opacity: filterAnim,
            transform: [
              {
                translateY: filterAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.filterContainer}>
          {FILTER_CONFIG.map(filter => {
            const isActive = routeOptionsState.activeFilter === filter.id
            return (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterButton,
                  isActive && styles.filterButtonActive,
                ]}
                onPress={() => handleFilterPress(filter.id)}
                activeOpacity={0.8}
                disabled={isProcessing}
              >
                {isActive ? (
                  <LinearGradient
                    colors={filter.colors as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.filterButtonGradient}
                  >
                    <Ionicons
                      name={filter.icon as any}
                      size={13}
                      color={theme.colors.palette.neutral100}
                    />
                    <Text style={styles.filterButtonTextActive}>
                      {filter.label}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.filterButtonInner}>
                    <Ionicons
                      name={filter.iconOutline as any}
                      size={13}
                      color={theme.colors.palette.neutral600}
                    />
                    <Text style={styles.filterButtonText}>{filter.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </Animated.View>

      {/* Processing Overlay with smooth fade */}
      <Animated.View
        style={[
          styles.processingOverlay,
          {
            opacity: processingFadeAnim,
            pointerEvents: isProcessing ? 'auto' : 'none',
          },
        ]}
      >
        <View style={styles.processingContainer}>
          <ActivityIndicator
            size="small"
            color={theme.colors.palette.primary400}
          />
        </View>
      </Animated.View>

      {/* Route Cards - FlashList for performance */}
      <Animated.View
        style={[
          styles.listContainer,
          {
            opacity: listFadeAnim,
            transform: [
              {
                translateY: listFadeAnim.interpolate({
                  inputRange: [0.3, 1],
                  outputRange: [10, 0],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        <FlashList
          data={filteredRoutes}
          renderItem={renderRouteItem}
          keyExtractor={keyExtractor}
          estimatedItemSize={200}
          contentContainerStyle={styles.flashListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={ListEmptyComponent}
          extraData={routeOptionsState.activeFilter}
        />
      </Animated.View>

      {/* Save Route Modal */}
      <Modal
        visible={showSaveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSaveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {saveSuccess ? (
              <>
                <View style={styles.successIconContainer}>
                  <Ionicons
                    name="checkmark-circle"
                    size={64}
                    color={theme.colors.palette.primary500}
                  />
                </View>
                <Text style={styles.modalTitle}>Route Saved!</Text>
                <Text style={styles.modalSubtitle}>
                  You can find it in your Saved Routes
                </Text>
              </>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Save This Route</Text>
                  <TouchableOpacity
                    onPress={() => setShowSaveModal(false)}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={theme.colors.palette.neutral600}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalLabel}>Route Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g., Morning Commute, Weekend Trip"
                  value={routeName}
                  onChangeText={setRouteName}
                  autoFocus
                  placeholderTextColor={theme.colors.palette.neutral500}
                />

                {selectedRoute && (
                  <View style={styles.modalRouteInfo}>
                    <View style={styles.modalRouteRow}>
                      <Ionicons
                        name="location"
                        size={16}
                        color={theme.colors.palette.neutral600}
                      />
                      <Text style={styles.modalRouteText}>
                        {tripState.origin}
                      </Text>
                    </View>
                    <Ionicons
                      name="arrow-down"
                      size={16}
                      color={theme.colors.palette.neutral500}
                    />
                    <View style={styles.modalRouteRow}>
                      <Ionicons
                        name="location"
                        size={16}
                        color={theme.colors.palette.primary400}
                      />
                      <Text style={styles.modalRouteText}>
                        {tripState.destination}
                      </Text>
                    </View>
                    <View style={styles.modalRouteMeta}>
                      <Text style={styles.modalRouteMetaText}>
                        {selectedRoute.totalDuration} min • $
                        {selectedRoute.totalFare.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowSaveModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalSaveButton,
                      (!routeName.trim() || isSaving) &&
                        styles.modalSaveButtonDisabled,
                    ]}
                    onPress={handleSaveRoute}
                    disabled={!routeName.trim() || isSaving}
                    activeOpacity={0.7}
                  >
                    {isSaving ? (
                      <Text style={styles.modalSaveText}>Saving...</Text>
                    ) : (
                      <>
                        <Ionicons
                          name="bookmark"
                          size={20}
                          color={theme.colors.palette.neutral100}
                        />
                        <Text style={styles.modalSaveText}>Save Route</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
      overflow: 'hidden',
    },
    headerGradient: {
      paddingBottom: 4,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.primary400,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    backButtonGradient: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitleContainer: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
    },
    headerSubtitle: {
      fontSize: 12,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
      marginTop: 2,
    },
    modeMenuButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral200,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modeBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: theme.colors.palette.primary400,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral100,
    },
    modeBadgeText: {
      fontSize: 11,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
    },
    modeMenuContainer: {
      marginHorizontal: 16,
      marginTop: 8,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    modeMenuContent: {
      padding: 16,
    },
    modeMenuTitle: {
      fontSize: 14,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
      marginBottom: 12,
    },
    modeMenuGrid: {
      gap: 8,
    },
    modeMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.palette.neutral200,
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral400,
    },
    modeMenuItemActive: {
      backgroundColor: theme.colors.palette.neutral100,
      borderColor: theme.colors.palette.primary400,
    },
    modeMenuIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    modeMenuLabel: {
      flex: 1,
      fontSize: 15,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral700,
    },
    modeMenuLabelActive: {
      color: theme.colors.palette.neutral900,
    },
    modeMenuCheck: {
      marginLeft: 8,
    },
    routeInfoCard: {
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    routeInfoGradient: {
      padding: 16,
    },
    routeInfoContent: {
      gap: 4,
    },
    routeInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    locationIconContainer: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    originDotOuter: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: `${theme.colors.palette.secondary100}E6`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    originDotInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.palette.secondary400,
    },
    destinationDotGradient: {
      width: 26,
      height: 26,
      borderRadius: 13,
      justifyContent: 'center',
      alignItems: 'center',
    },
    routeConnector: {
      flexDirection: 'column',
      alignItems: 'center',
      marginLeft: 15,
      height: 24,
      justifyContent: 'space-between',
    },
    connectorDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.palette.neutral400,
    },
    connectorLine: {
      width: 2,
      flex: 1,
      backgroundColor: theme.colors.palette.neutral400,
      marginVertical: 2,
    },
    routeInfoTextContainer: {
      flex: 1,
    },
    routeInfoLabel: {
      fontSize: 10,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral500,
      letterSpacing: 1,
      marginBottom: 2,
    },
    routeInfoText: {
      fontSize: 15,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral900,
    },
    timeInfoRow: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral300,
    },
    timeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.palette.primary100,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    timeChipText: {
      fontSize: 13,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.primary400,
    },
    editButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.palette.primary200,
    },
    filterWrapper: {
      borderBottomWidth: 1,
      marginTop: 8,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 6,
    },
    filterButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.colors.palette.neutral200,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
      minWidth: 70,
    },
    filterButtonActive: {
      borderWidth: 0,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    filterButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 6,
      gap: 4,
    },
    filterButtonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 6,
      gap: 4,
    },
    filterButtonText: {
      fontSize: 11,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral600,
    },
    filterButtonTextActive: {
      fontSize: 11,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
    },
    processingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: `${theme.colors.palette.neutral100}B3`,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
    },
    processingContainer: {
      backgroundColor: theme.colors.palette.neutral100,
      padding: 16,
      borderRadius: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    listContainer: {
      flex: 1,
    },
    flashListContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
      paddingTop: 8,
    },
    routeCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 20,
      padding: 16,
      marginBottom: 14,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
    },
    routeCardFirst: {
      borderWidth: 2,
      borderColor: theme.colors.palette.primary200,
      backgroundColor: `${theme.colors.palette.neutral100}FA`,
    },
    bestBadge: {
      position: 'absolute',
      top: -8,
      right: 16,
      zIndex: 10,
    },
    bestBadgeGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    bestBadgeText: {
      fontSize: 11,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
    },
    routeCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    routeCardTimeContainer: {
      gap: 6,
    },
    routeCardTime: {
      fontSize: 20,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
      letterSpacing: -0.5,
    },
    railwayTimeRange: {
      fontSize: 20,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
      letterSpacing: 1,
      fontVariant: ['tabular-nums'],
    },
    durationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.palette.primary100,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    routeCardDuration: {
      fontSize: 12,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.primary400,
    },
    fareContainer: {
      alignItems: 'flex-end',
    },
    fareLabel: {
      fontSize: 10,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral500,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    fareText: {
      fontSize: 18,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
    },
    routeCardModes: {
      marginBottom: 16,
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      padding: 12,
      position: 'relative',
      overflow: 'hidden',
    },
    modeScrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingRight: 8,
    },
    modeIconsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    modeIconsCompact: {
      gap: 2,
    },
    walkStartContainer: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    walkEndContainer: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: `${theme.colors.palette.primary200}CC`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    walkContainerCompact: {
      width: 22,
      height: 22,
      borderRadius: 11,
    },
    modeLine: {
      height: 3,
      width: 20,
      minWidth: 12,
      backgroundColor: theme.colors.palette.neutral400,
      borderRadius: 2,
      marginHorizontal: 2,
    },
    modeLineCompact: {
      width: 10,
      minWidth: 8,
      height: 2,
      marginHorizontal: 1,
    },
    modeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    modeIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    modeIconCircleCompact: {
      width: 24,
      height: 24,
      borderRadius: 12,
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    lineBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    lineBadgeCompact: {
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
    },
    modeLabel: {
      fontSize: 11,
      fontFamily: typography.primary.bold,
    },
    modeLabelCompact: {
      fontSize: 9,
    },
    scrollHint: {
      position: 'absolute',
      right: 4,
      top: '50%',
      marginTop: -8,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: `${theme.colors.palette.neutral100}F2`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    routeCardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    footerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    transferBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.palette.neutral300,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    transferText: {
      fontSize: 12,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
    },
    delayBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      backgroundColor: `${theme.colors.palette.accent100}CC`,
      borderRadius: 8,
    },
    delayText: {
      fontSize: 11,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.accent500,
    },
    routeActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    saveIconButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.palette.primary200,
    },
    viewDetailsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.palette.primary400,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      shadowColor: theme.colors.palette.primary400,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    viewDetailsText: {
      fontSize: 13,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 40,
    },
    emptyIconContainer: {
      marginBottom: 20,
    },
    emptyIconGradient: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 22,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 15,
      fontFamily: typography.primary.normal,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 22,
    },
    suggestionsList: {
      width: '100%',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 20,
      padding: 20,
      gap: 14,
      marginTop: 24,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    suggestionIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    suggestionText: {
      flex: 1,
      fontSize: 14,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral700,
      lineHeight: 20,
    },
    tryAgainButton: {
      marginTop: 24,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.primary400,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    tryAgainGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      paddingHorizontal: 32,
    },
    tryAgainText: {
      fontSize: 16,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: `${theme.colors.palette.neutral900}80`,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 24,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 22,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
    },
    modalSubtitle: {
      fontSize: 15,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      marginTop: 12,
    },
    modalCloseButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalLabel: {
      fontSize: 14,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral700,
      marginBottom: 8,
    },
    modalInput: {
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral400,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral900,
      marginBottom: 20,
    },
    modalRouteInfo: {
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      padding: 16,
      gap: 8,
      marginBottom: 24,
    },
    modalRouteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    modalRouteText: {
      fontSize: 14,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral700,
      flex: 1,
    },
    modalRouteMeta: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral400,
      marginTop: 4,
    },
    modalRouteMetaText: {
      fontSize: 13,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: theme.colors.palette.neutral300,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelText: {
      fontSize: 16,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral600,
    },
    modalSaveButton: {
      flex: 1,
      flexDirection: 'row',
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: theme.colors.palette.primary400,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    modalSaveButtonDisabled: {
      opacity: 0.5,
    },
    modalSaveText: {
      fontSize: 16,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
    },
    successIconContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
  })

export default RouteOptionsScreen
