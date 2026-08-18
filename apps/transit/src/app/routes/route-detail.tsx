import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { typography, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useMemo, useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { mutations } from '../../db/mutations'
import { useStores } from '../../models'
import { Route } from '../../utils/routeGeneratorDB'

// Simple debounce using ref
const useDebounceRef = (delay: number = 300) => {
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

const RouteDetailScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { trackScreenMount } = useInteractionTracking(
    'RouteDetail',
    '/routes/route-detail',
  )
  const router = useRouter()
  const params = useLocalSearchParams()
  const {
    tripPlannerStore: { tripState },
    routeDetailStore: { routeDetailState },
  } = useStores()

  const [route, setRoute] = useState<Route | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current
  const summaryAnim = useRef(new Animated.Value(0)).current
  const stepsAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  const canExecute = useDebounceRef(300)

  // Restore route from params or store
  useEffect(() => {
    // First try to get route from params
    if (params.route) {
      try {
        const parsedRoute = JSON.parse(params.route as string) as Route
        setRoute(parsedRoute)
        routeDetailState.setRouteData(parsedRoute)
      } catch (error) {
        console.error('Error parsing route from params:', error)
      }
    } else if (routeDetailState.routeData) {
      // If no params, try to restore from store
      setRoute(routeDetailState.routeData as Route)
    }
  }, [params.route, routeDetailState])

  // Track screen mount
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'RouteDetail',
        route: '/routes/route-detail',
      })
    }, [trackScreenMount]),
  )

  // Debounced back handler
  const handleBack = useCallback(() => {
    if (!canExecute() || isNavigating) return
    setIsNavigating(true)

    // Check if we can go back in navigation stack
    if (router.canGoBack()) {
      router.back()
    } else {
      // If no back stack (e.g., deeplink cold start), go to plan tab
      router.replace('/(tabs)/plan')
    }
  }, [canExecute, isNavigating, router])

  // Debounced save modal open
  const handleOpenSaveModal = useCallback(() => {
    if (!canExecute()) return
    routeDetailState.setShowSaveModal(true)
  }, [canExecute, routeDetailState])

  useEffect(() => {
    // Entrance animations
    Animated.stagger(100, [
      Animated.spring(headerAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(summaryAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(stepsAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()

    // Pulse animation for live indicator
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
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
  }, [])

  const getTransitIcon = (mode: string) => {
    switch (mode) {
      case 'bus':
        return 'bus'
      case 'metro':
      case 'subway':
        return 'subway'
      case 'tram':
      case 'train':
        return 'train'
      case 'walk':
        return 'walk'
      default:
        return 'walk'
    }
  }

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'bus':
        return theme.colors.palette.secondary400
      case 'metro':
      case 'subway':
        return theme.colors.palette.angry500
      case 'tram':
      case 'train':
        return theme.colors.palette.accent400
      default:
        return theme.colors.palette.neutral500
    }
  }

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
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

  const handleSaveRoute = async () => {
    if (!route || !routeDetailState.routeName.trim()) return

    setIsSaving(true)
    try {
      const transitSegments = route.segments.filter(
        seg => seg.mode.type !== 'walk',
      )
      const modes = [...new Set(transitSegments.map(seg => seg.mode.type))]
      const preferredMode = modes.length === 1 ? modes[0] : 'mixed'

      await mutations.saveRoute({
        userId: 1,
        name: routeDetailState.routeName.trim(),
        origin: tripState.origin,
        destination: tripState.destination,
        preferredMode,
      })

      setSaveSuccess(true)
      setTimeout(() => {
        routeDetailState.setShowSaveModal(false)
        setSaveSuccess(false)
        routeDetailState.setRouteName('')
      }, 1500)
    } catch (error) {
      console.error('Error saving route:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!route) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View
            style={[styles.loadingIcon, { transform: [{ scale: pulseAnim }] }]}
          >
            <Ionicons
              name="navigate"
              size={48}
              color={theme.colors.palette.primary400}
            />
          </Animated.View>
          <Text style={styles.loadingText}>Loading route...</Text>
        </View>
      </SafeAreaView>
    )
  }

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
            theme.colors.palette.neutral100,
            `${theme.colors.palette.neutral100}FD`,
          ]}
          style={styles.headerGradient}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            disabled={isNavigating}
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
            <Text style={styles.headerTitle}>Trip Details</Text>
            <View style={styles.liveIndicator}>
              <Animated.View
                style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]}
              />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>
          <View style={styles.headerSpacer} />
        </LinearGradient>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Summary Card */}
        <Animated.View
          style={[
            styles.summaryCard,
            {
              opacity: summaryAnim,
              transform: [
                {
                  translateY: summaryAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
                { scale: summaryAnim },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[
              theme.colors.palette.primary400,
              theme.colors.palette.primary500,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryGradient}
          >
            {/* Time Range */}
            <View style={styles.timeRangeRow}>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Depart</Text>
                <Text style={styles.railwayTime}>
                  {formatRailwayTime(route.departureTime)}
                </Text>
              </View>
              <View style={styles.timeArrowContainer}>
                <View style={styles.timeArrowLine} />
                <View style={styles.timeArrowCircle}>
                  <Ionicons
                    name="airplane"
                    size={16}
                    color={theme.colors.palette.primary400}
                  />
                </View>
                <View style={styles.timeArrowLine} />
              </View>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Arrive</Text>
                <Text style={styles.railwayTime}>
                  {formatRailwayTime(route.arrivalTime)}
                </Text>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons
                    name="time"
                    size={18}
                    color={theme.colors.palette.primary400}
                  />
                </View>
                <Text style={styles.statValue}>
                  {formatDuration(route.totalDuration)}
                </Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons
                    name="wallet"
                    size={18}
                    color={theme.colors.palette.primary500}
                  />
                </View>
                <Text style={styles.statValue}>
                  ${route.totalFare.toFixed(2)}
                </Text>
                <Text style={styles.statLabel}>Total Fare</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons
                    name="git-branch"
                    size={18}
                    color={theme.colors.palette.secondary500}
                  />
                </View>
                <Text style={styles.statValue}>
                  {route.transferCount === 0 ? 'Direct' : route.transferCount}
                </Text>
                <Text style={styles.statLabel}>
                  {route.transferCount === 0 ? 'Route' : 'Transfers'}
                </Text>
              </View>
            </View>

            {/* Delay Warning */}
            {route.hasDelay && route.delayMinutes && route.delayMinutes > 0 && (
              <View style={styles.delayBanner}>
                <Ionicons
                  name="warning"
                  size={16}
                  color={theme.colors.palette.neutral100}
                />
                <Text style={styles.delayText}>
                  Expected {route.delayMinutes} min delay
                </Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Journey Steps */}
        <Animated.View
          style={[
            styles.stepsCard,
            {
              opacity: stepsAnim,
              transform: [
                {
                  translateY: stepsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.stepsHeader}>
            <Text style={styles.stepsTitle}>Your Journey</Text>
            <View style={styles.stepsCount}>
              <Text style={styles.stepsCountText}>
                {route.segments.length} steps
              </Text>
            </View>
          </View>

          {route.segments.map((segment, index) => {
            const isWalk = segment.mode.type === 'walk'
            const isFirst = index === 0
            const isLast = index === route.segments.length - 1
            const modeColor = isWalk
              ? theme.colors.palette.neutral500
              : segment.mode.color || getModeColor(segment.mode.type)

            return (
              <View key={segment.id} style={styles.stepContainer}>
                {/* Timeline */}
                <View style={styles.timeline}>
                  {!isFirst && <View style={styles.timelineLineTop} />}
                  <View
                    style={[
                      styles.timelineDot,
                      { backgroundColor: modeColor },
                      isFirst && styles.timelineDotFirst,
                      isLast && styles.timelineDotLast,
                    ]}
                  >
                    {isFirst ? (
                      <View style={styles.originDotInner} />
                    ) : isLast ? (
                      <Ionicons
                        name="flag"
                        size={14}
                        color={theme.colors.palette.neutral100}
                      />
                    ) : (
                      <Ionicons
                        name={
                          getTransitIcon(segment.mode.type) as
                            | 'bus'
                            | 'subway'
                            | 'train'
                            | 'walk'
                        }
                        size={14}
                        color={theme.colors.palette.neutral100}
                      />
                    )}
                  </View>
                  {!isLast && <View style={styles.timelineLineBottom} />}
                </View>

                {/* Step Content */}
                <View style={styles.stepContent}>
                  {/* Location & Time */}
                  <View style={styles.stepLocationRow}>
                    <View style={styles.stepLocationInfo}>
                      <Text style={styles.stepLocationName}>
                        {segment.from}
                      </Text>
                      <Text style={styles.railwayTimeSmall}>
                        {formatRailwayTime(segment.departureTime)}
                      </Text>
                    </View>
                    {!isWalk && segment.mode.lineNumber && (
                      <View
                        style={[
                          styles.lineBadge,
                          { backgroundColor: modeColor },
                        ]}
                      >
                        <Ionicons
                          name={
                            getTransitIcon(segment.mode.type) as
                              | 'bus'
                              | 'subway'
                              | 'train'
                              | 'walk'
                          }
                          size={12}
                          color={theme.colors.palette.neutral100}
                        />
                        <Text style={styles.lineBadgeText}>
                          {segment.mode.lineNumber}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Journey Details */}
                  <View
                    style={[
                      styles.journeyDetails,
                      isWalk && styles.journeyDetailsWalk,
                    ]}
                  >
                    {isWalk ? (
                      <View style={styles.walkInfo}>
                        <View style={styles.walkIconContainer}>
                          <Ionicons
                            name="walk"
                            size={18}
                            color={theme.colors.palette.neutral600}
                          />
                        </View>
                        <Text style={styles.walkText}>
                          Walk {formatDuration(segment.duration)}
                        </Text>
                        <Text style={styles.walkDistance}>
                          {segment.distance.toFixed(1)} km
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.transitInfo}>
                        <View
                          style={[
                            styles.transitIconContainer,
                            { backgroundColor: `${modeColor}15` },
                          ]}
                        >
                          <Ionicons
                            name={
                              getTransitIcon(segment.mode.type) as
                                | 'bus'
                                | 'subway'
                                | 'train'
                                | 'walk'
                            }
                            size={20}
                            color={modeColor}
                          />
                        </View>
                        <View style={styles.transitDetails}>
                          <Text style={styles.transitName}>
                            {segment.mode.lineName ||
                              `${segment.mode.type} ${segment.mode.lineNumber}`}
                          </Text>
                          <View style={styles.transitMeta}>
                            <Text style={styles.transitMetaText}>
                              {formatDuration(segment.duration)}
                            </Text>
                            <View style={styles.transitMetaDot} />
                            <Text style={styles.transitMetaText}>
                              {segment.distance.toFixed(1)} km
                            </Text>
                            <View style={styles.transitMetaDot} />
                            <Text style={styles.transitFare}>
                              ${segment.fare.toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Arrival (for last segment) */}
                  {isLast && (
                    <View style={styles.arrivalRow}>
                      <Text style={styles.arrivalLocation}>{segment.to}</Text>
                      <Text style={styles.railwayTimeSmall}>
                        {formatRailwayTime(segment.arrivalTime)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )
          })}
        </Animated.View>

        {/* Action Button */}
        <Animated.View
          style={[
            styles.actionContainer,
            {
              opacity: stepsAnim,
              transform: [
                {
                  translateY: stepsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.saveButton}
            activeOpacity={0.85}
            onPress={handleOpenSaveModal}
          >
            <LinearGradient
              colors={[
                theme.colors.palette.primary300,
                theme.colors.palette.primary400,
                theme.colors.palette.primary500,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveButtonGradient}
            >
              <Ionicons
                name="bookmark"
                size={20}
                color={theme.colors.palette.neutral100}
              />
              <Text style={styles.saveButtonText}>Save This Route</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons
            name="information-circle"
            size={18}
            color={theme.colors.palette.neutral500}
          />
          <Text style={styles.infoNoteText}>
            Times are estimates based on scheduled departures
          </Text>
        </View>
      </ScrollView>

      {/* Save Route Modal */}
      <Modal
        visible={routeDetailState.showSaveModal}
        transparent
        animationType="fade"
        onRequestClose={() => routeDetailState.setShowSaveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={styles.modalContent}>
            {saveSuccess ? (
              <View style={styles.successContainer}>
                <View style={styles.successIconContainer}>
                  <LinearGradient
                    colors={[
                      theme.colors.palette.primary500,
                      theme.colors.palette.primary600,
                    ]}
                    style={styles.successIconGradient}
                  >
                    <Ionicons
                      name="checkmark"
                      size={40}
                      color={theme.colors.palette.neutral100}
                    />
                  </LinearGradient>
                </View>
                <Text style={styles.successTitle}>Saved!</Text>
                <Text style={styles.successSubtitle}>
                  Find it in your saved routes
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Save Route</Text>
                  <TouchableOpacity
                    onPress={() => routeDetailState.setShowSaveModal(false)}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={theme.colors.palette.neutral600}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalLabel}>Name your route</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g., Morning Commute"
                  value={routeDetailState.routeName}
                  onChangeText={routeDetailState.setRouteName}
                  autoFocus
                  placeholderTextColor={theme.colors.palette.neutral500}
                />

                <View style={styles.modalRoutePreview}>
                  <View style={styles.previewRow}>
                    <View style={styles.previewDot} />
                    <Text style={styles.previewText} numberOfLines={1}>
                      {tripState.origin}
                    </Text>
                  </View>
                  <View style={styles.previewLine} />
                  <View style={styles.previewRow}>
                    <View style={styles.previewDotDest} />
                    <Text style={styles.previewText} numberOfLines={1}>
                      {tripState.destination}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => routeDetailState.setShowSaveModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalSaveButton,
                      (!routeDetailState.routeName.trim() || isSaving) &&
                        styles.modalSaveButtonDisabled,
                    ]}
                    onPress={handleSaveRoute}
                    disabled={!routeDetailState.routeName.trim() || isSaving}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={
                        !routeDetailState.routeName.trim() || isSaving
                          ? [
                              theme.colors.palette.neutral400,
                              theme.colors.palette.neutral500,
                            ]
                          : [
                              theme.colors.palette.primary300,
                              theme.colors.palette.primary400,
                            ]
                      }
                      style={styles.modalSaveGradient}
                    >
                      {isSaving ? (
                        <Text style={styles.modalSaveText}>Saving...</Text>
                      ) : (
                        <>
                          <Ionicons
                            name="bookmark"
                            size={18}
                            color={theme.colors.palette.neutral100}
                          />
                          <Text style={styles.modalSaveText}>Save</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    loadingIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
    },
    header: {
      overflow: 'hidden',
    },
    headerGradient: {
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
      gap: 4,
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
    },
    liveIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: `${theme.colors.palette.primary100}E6`,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.palette.primary500,
    },
    liveText: {
      fontSize: 11,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.primary500,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    headerSpacer: {
      width: 40,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 32,
    },
    summaryCard: {
      margin: 16,
      borderRadius: 24,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.primary400,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    },
    summaryGradient: {
      padding: 24,
    },
    timeRangeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    timeBlock: {
      alignItems: 'center',
      gap: 4,
    },
    timeLabel: {
      fontSize: 12,
      fontFamily: typography.primary.medium,
      color: `${theme.colors.palette.neutral100}B3`,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    timeValue: {
      fontSize: 28,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
    },
    railwayTime: {
      fontSize: 28,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
      letterSpacing: 1,
      fontVariant: ['tabular-nums'],
    },
    railwayTimeSmall: {
      fontSize: 13,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral600,
      letterSpacing: 0.5,
      fontVariant: ['tabular-nums'],
    },
    timeArrowContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    timeArrowLine: {
      flex: 1,
      height: 2,
      backgroundColor: `${theme.colors.palette.neutral100}4D`,
    },
    timeArrowCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.palette.neutral100,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 8,
    },
    statsRow: {
      flexDirection: 'row',
      backgroundColor: `${theme.colors.palette.neutral100}F2`,
      borderRadius: 16,
      padding: 16,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    statIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
    },
    statLabel: {
      fontSize: 11,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    statDivider: {
      width: 1,
      backgroundColor: theme.colors.palette.neutral400,
    },
    delayBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: `${theme.colors.palette.accent400}E6`,
      marginTop: 16,
      marginHorizontal: -24,
      marginBottom: -24,
      paddingVertical: 12,
    },
    delayText: {
      fontSize: 13,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
    },
    stepsCard: {
      backgroundColor: theme.colors.palette.neutral100,
      marginHorizontal: 16,
      borderRadius: 24,
      padding: 20,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    stepsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    stepsTitle: {
      fontSize: 20,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
    },
    stepsCount: {
      backgroundColor: theme.colors.palette.neutral300,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    stepsCountText: {
      fontSize: 12,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral600,
    },
    stepContainer: {
      flexDirection: 'row',
    },
    timeline: {
      width: 40,
      alignItems: 'center',
    },
    timelineLineTop: {
      width: 2,
      height: 12,
      backgroundColor: theme.colors.palette.neutral400,
    },
    timelineLineBottom: {
      width: 2,
      flex: 1,
      backgroundColor: theme.colors.palette.neutral400,
      marginTop: 4,
    },
    timelineDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
    timelineDotFirst: {
      backgroundColor: theme.colors.palette.secondary400,
    },
    timelineDotLast: {
      backgroundColor: theme.colors.palette.primary500,
    },
    originDotInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.palette.neutral100,
    },
    stepContent: {
      flex: 1,
      paddingLeft: 12,
      paddingBottom: 24,
    },
    stepLocationRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    stepLocationInfo: {
      flex: 1,
      gap: 2,
    },
    stepLocationName: {
      fontSize: 16,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
    },
    stepTime: {
      fontSize: 13,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral600,
    },
    lineBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
    },
    lineBadgeText: {
      fontSize: 12,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
    },
    journeyDetails: {
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 14,
      padding: 14,
    },
    journeyDetailsWalk: {
      backgroundColor: 'transparent',
      padding: 0,
      paddingVertical: 8,
    },
    walkInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    walkIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    walkText: {
      fontSize: 14,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
    },
    walkDistance: {
      fontSize: 12,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral500,
    },
    transitInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    transitIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    transitDetails: {
      flex: 1,
      gap: 4,
    },
    transitName: {
      fontSize: 15,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
    },
    transitMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    transitMetaText: {
      fontSize: 12,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
    },
    transitMetaDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: theme.colors.palette.neutral400,
    },
    transitFare: {
      fontSize: 12,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.primary500,
    },
    arrivalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral300,
    },
    arrivalLocation: {
      fontSize: 16,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.primary500,
    },
    arrivalTime: {
      fontSize: 14,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.primary500,
    },
    actionContainer: {
      paddingHorizontal: 16,
      paddingTop: 20,
    },
    saveButton: {
      borderRadius: 18,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.primary400,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
    saveButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 18,
      gap: 10,
    },
    saveButtonText: {
      fontSize: 17,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
    },
    infoNote: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingTop: 20,
      paddingHorizontal: 24,
    },
    infoNoteText: {
      fontSize: 12,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral500,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: `${theme.colors.palette.neutral900}80`,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalContent: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 28,
      padding: 24,
      width: '100%',
      maxWidth: 380,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    successContainer: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    successIconContainer: {
      marginBottom: 16,
    },
    successIconGradient: {
      width: 72,
      height: 72,
      borderRadius: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    successTitle: {
      fontSize: 24,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    successSubtitle: {
      fontSize: 14,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    modalTitle: {
      fontSize: 22,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
    },
    modalCloseButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalLabel: {
      fontSize: 14,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral700,
      marginBottom: 10,
    },
    modalInput: {
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral400,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral900,
      marginBottom: 20,
    },
    modalRoutePreview: {
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 14,
      padding: 16,
      marginBottom: 24,
    },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    previewDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.palette.secondary400,
    },
    previewDotDest: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.palette.primary400,
    },
    previewLine: {
      width: 2,
      height: 20,
      backgroundColor: theme.colors.palette.neutral400,
      marginLeft: 5,
      marginVertical: 4,
    },
    previewText: {
      flex: 1,
      fontSize: 14,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral700,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
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
      borderRadius: 14,
      overflow: 'hidden',
    },
    modalSaveButtonDisabled: {
      opacity: 0.7,
    },
    modalSaveGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      gap: 8,
    },
    modalSaveText: {
      fontSize: 16,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
    },
  })

export default RouteDetailScreen
