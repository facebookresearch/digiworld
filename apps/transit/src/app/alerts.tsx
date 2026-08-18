// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { typography, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { observer } from 'mobx-react-lite'
import { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import {
  Animated,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Text,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { queries } from '@/db/queries'
import { useStores } from '@/models'

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

interface ServiceAlert {
  id: string
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  icon: 'info' | 'warning' | 'critical'
  recommendedAlternatives: string[]
  createdAt: string
  expiresAt: string | null
  isActive: boolean
  affectedLines?: string[]
  affectedStops?: string[]
  affectedLineDetails?: { id: string; name: string; shortName: string }[]
  affectedStopDetails?: { id: string; name: string }[]
}

const AlertsScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { trackScreenMount } = useInteractionTracking('Alerts', '/alerts')
  const router = useRouter()
  const {
    alertsStore: { alertsState },
  } = useStores()
  const canExecute = useDebounceRef(300)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const [alerts, setAlerts] = useState<ServiceAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const flatListRef = useRef<FlatList>(null)
  const [expandedItems, setExpandedItems] = useState<{
    [alertId: string]: { lines?: boolean; stops?: boolean }
  }>({})

  const loadAlerts = useCallback(async () => {
    try {
      setIsLoading(true)
      const allAlerts = await queries.getAllActiveAlerts()

      // Get affected lines and stops for each alert
      const alertsWithDetails = await Promise.all(
        allAlerts.map(async (alert: { id: string }) => {
          const alertDetails = await queries.getAlertById(alert.id)

          // Get line details if affected lines exist
          const affectedLineDetails =
            alertDetails?.affectedLines && alertDetails.affectedLines.length > 0
              ? await Promise.all(
                  alertDetails.affectedLines.map(async (lineId: string) => {
                    const line = await queries.getLineById(lineId)
                    return line
                      ? {
                          id: line.id,
                          name: line.name,
                          shortName: line.shortName,
                        }
                      : null
                  }),
                ).then(lines =>
                  lines.filter((l): l is NonNullable<typeof l> => l !== null),
                )
              : undefined

          // Get stop details if affected stops exist
          const affectedStopDetails =
            alertDetails?.affectedStops && alertDetails.affectedStops.length > 0
              ? await Promise.all(
                  alertDetails.affectedStops.map(async (stopId: string) => {
                    const stop = await queries.getStopById(stopId)
                    return stop ? { id: stop.id, name: stop.name } : null
                  }),
                ).then(stops =>
                  stops.filter((s): s is NonNullable<typeof s> => s !== null),
                )
              : undefined

          return {
            ...alert,
            affectedLines: alertDetails?.affectedLines,
            affectedStops: alertDetails?.affectedStops,
            affectedLineDetails,
            affectedStopDetails,
          }
        }),
      )

      setAlerts(alertsWithDetails)
    } catch (error) {
      console.error('Error loading alerts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadAlerts()
      // Restore scroll position after a brief delay to ensure list is rendered
      if (alertsState.scrollOffset > 0 && flatListRef.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({
            offset: alertsState.scrollOffset,
            animated: false,
          })
        }, 100)
      }
    }, [loadAlerts, alertsState.scrollOffset]),
  )

  useEffect(() => {
    trackScreenMount()
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()

    // Pulse animation for urgent badge
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    )
    pulse.start()
    return () => pulse.stop()
  }, [])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return theme.colors.palette.primary500 // Red from theme
      case 'medium':
        return theme.colors.palette.primary400 // Orange from theme
      case 'low':
        return theme.colors.palette.primary300 // Light orange from theme
      default:
        return theme.colors.palette.primary400
    }
  }

  const getSeverityGradient = (severity: string) => {
    switch (severity) {
      case 'high':
        return [
          theme.colors.palette.primary500,
          theme.colors.palette.primary600,
        ] // Red gradient
      case 'medium':
        return [
          theme.colors.palette.primary400,
          theme.colors.palette.primary500,
        ] // Orange gradient
      case 'low':
        return [
          theme.colors.palette.primary300,
          theme.colors.palette.primary400,
        ] // Light orange gradient
      default:
        return [
          theme.colors.palette.primary400,
          theme.colors.palette.primary300,
        ]
    }
  }

  const getIconName = (icon: string) => {
    switch (icon) {
      case 'critical':
        return 'alert-circle'
      case 'warning':
        return 'warning'
      case 'info':
        return 'information-circle'
      default:
        return 'information-circle'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    }
  }

  // Debounced back handler
  const handleBack = useCallback(() => {
    if (!canExecute()) return

    // Check if we can go back in navigation stack
    if (router.canGoBack()) {
      router.back()
    } else {
      // If no back stack (e.g., deeplink cold start), go to plan tab
      router.replace('/(tabs)/plan')
    }
  }, [canExecute, router])

  const filteredAlerts = alerts.filter(
    alert =>
      alertsState.selectedSeverity === 'all' ||
      alert.severity === alertsState.selectedSeverity,
  )

  const severityFilters = [
    { id: 'all' as const, label: 'All', count: alerts.length },
    {
      id: 'high' as const,
      label: 'High',
      count: alerts.filter(a => a.severity === 'high').length,
    },
    {
      id: 'medium' as const,
      label: 'Medium',
      count: alerts.filter(a => a.severity === 'medium').length,
    },
    {
      id: 'low' as const,
      label: 'Low',
      count: alerts.filter(a => a.severity === 'low').length,
    },
  ]

  const renderAlertCard = ({ item }: { item: ServiceAlert }) => {
    const severityColor = getSeverityColor(item.severity)
    const severityGradient = getSeverityGradient(item.severity)

    return (
      <Animated.View
        style={[
          styles.alertCard,
          item.severity === 'high' && styles.alertCardHigh,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
              {
                scale: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
            borderColor:
              item.severity === 'high'
                ? severityColor
                : item.severity === 'medium'
                  ? theme.colors.palette.primary400
                  : theme.colors.palette.neutral300,
          },
        ]}
      >
        <View style={styles.alertCardContent}>
          {/* Header with Severity Badge */}
          <View style={styles.alertHeader}>
            <LinearGradient
              colors={severityGradient}
              style={styles.severityBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={
                  getIconName(item.icon) as
                    | 'alert-circle'
                    | 'warning'
                    | 'information-circle'
                }
                size={20}
                color={theme.colors.palette.neutral100}
              />
              <Text style={styles.severityText}>
                {item.severity.toUpperCase()}
              </Text>
            </LinearGradient>
            <Text style={styles.alertTime}>{formatDate(item.createdAt)}</Text>
          </View>

          {/* Title */}
          <Text style={styles.alertTitle}>{item.title}</Text>

          {/* Description */}
          <Text style={styles.alertDescription}>{item.description}</Text>

          {/* Affected Lines */}
          {item.affectedLineDetails && item.affectedLineDetails.length > 0 && (
            <View style={styles.affectedSection}>
              <TouchableOpacity
                style={styles.affectedSectionHeader}
                onPress={() =>
                  setExpandedItems(prev => ({
                    ...prev,
                    [item.id]: {
                      ...prev[item.id],
                      lines: !prev[item.id]?.lines,
                    },
                  }))
                }
                activeOpacity={0.7}
              >
                <View style={styles.affectedSectionHeaderRow}>
                  <Ionicons name="train" size={16} color={severityColor} />
                  <Text style={styles.affectedSectionTitle}>
                    Affected Lines ({item.affectedLineDetails.length})
                  </Text>
                </View>
                <Ionicons
                  name={
                    expandedItems[item.id]?.lines
                      ? 'chevron-up'
                      : 'chevron-down'
                  }
                  size={18}
                  color={severityColor}
                />
              </TouchableOpacity>
              {expandedItems[item.id]?.lines && (
                <View style={styles.affectedItemsList}>
                  {item.affectedLineDetails.map((line, idx) => (
                    <View key={line.id || idx} style={styles.detailItem}>
                      <View
                        style={[
                          styles.lineBadgeSmall,
                          { backgroundColor: severityColor },
                        ]}
                      >
                        <Text style={styles.lineBadgeTextSmall}>
                          {line.shortName || 'N/A'}
                        </Text>
                      </View>
                      <Text style={styles.detailText}>
                        {line.name || 'Unknown Line'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Affected Stops */}
          {item.affectedStopDetails && item.affectedStopDetails.length > 0 && (
            <View style={styles.affectedSection}>
              <TouchableOpacity
                style={styles.affectedSectionHeader}
                onPress={() =>
                  setExpandedItems(prev => ({
                    ...prev,
                    [item.id]: {
                      ...prev[item.id],
                      stops: !prev[item.id]?.stops,
                    },
                  }))
                }
                activeOpacity={0.7}
              >
                <View style={styles.affectedSectionHeaderRow}>
                  <Ionicons name="location" size={16} color={severityColor} />
                  <Text style={styles.affectedSectionTitle}>
                    Affected Stops ({item.affectedStopDetails.length})
                  </Text>
                </View>
                <Ionicons
                  name={
                    expandedItems[item.id]?.stops
                      ? 'chevron-up'
                      : 'chevron-down'
                  }
                  size={18}
                  color={severityColor}
                />
              </TouchableOpacity>
              {expandedItems[item.id]?.stops && (
                <View style={styles.affectedItemsList}>
                  {item.affectedStopDetails.map((stop, idx) => (
                    <View key={stop.id || idx} style={styles.detailItem}>
                      <Ionicons
                        name="location"
                        size={14}
                        color={severityColor}
                      />
                      <Text style={styles.detailText}>
                        {stop.name || 'Unknown Stop'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Recommended Alternatives */}
          {item.recommendedAlternatives &&
            item.recommendedAlternatives.length > 0 && (
              <View style={styles.alternativesContainer}>
                <View style={styles.alternativesHeader}>
                  <Ionicons
                    name="bulb"
                    size={16}
                    color={theme.colors.palette.primary500}
                  />
                  <Text style={styles.alternativesTitle}>
                    Recommended Alternatives
                  </Text>
                </View>
                {item.recommendedAlternatives.map((alt, idx) => (
                  <View key={idx} style={styles.alternativeItem}>
                    <View style={styles.alternativeDot} />
                    <Text style={styles.alternativeText}>{alt}</Text>
                  </View>
                ))}
              </View>
            )}

          {/* Expiry Info */}
          {item.expiresAt && (
            <View style={styles.expiryContainer}>
              <Ionicons
                name="time-outline"
                size={14}
                color={theme.colors.palette.neutral600}
              />
              <Text style={styles.expiryText}>
                Expires:{' '}
                {new Date(item.expiresAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    )
  }

  const renderEmptyState = () => (
    <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={[
            theme.colors.palette.neutral400,
            theme.colors.palette.neutral400,
          ]}
          style={styles.emptyIconGradient}
        >
          <Ionicons
            name="checkmark-circle"
            size={64}
            color={theme.colors.palette.neutral100}
          />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>All Clear!</Text>
      <Text style={styles.emptySubtitle}>
        No active service alerts at this time
      </Text>
    </Animated.View>
  )

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Gradient Header */}
        <LinearGradient
          colors={[
            theme.colors.palette.primary300,
            theme.colors.palette.primary400,
            theme.colors.palette.primary500,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.colors.palette.neutral100}
              />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Service Alerts</Text>
              <Text style={styles.headerSubtitle}>
                {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.badgeContainer}>
              {alerts.filter(a => a.severity === 'high').length > 0 && (
                <Animated.View
                  style={[
                    styles.urgentBadge,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.urgentDot,
                      {
                        opacity: pulseAnim.interpolate({
                          inputRange: [1, 1.15],
                          outputRange: [1, 0.6],
                        }),
                      },
                    ]}
                  />
                  <Text style={styles.urgentText}>
                    {alerts.filter(a => a.severity === 'high').length}
                  </Text>
                </Animated.View>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Severity Filters */}
        <View style={styles.filtersContainer}>
          <FlatList
            data={severityFilters}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersList}
            renderItem={({ item }) => {
              const isSelected = alertsState.selectedSeverity === item.id
              return (
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    isSelected && styles.filterChipActive,
                    item.id === 'high' && isSelected && styles.filterChipHigh,
                    item.id === 'medium' &&
                      isSelected &&
                      styles.filterChipMedium,
                    item.id === 'low' && isSelected && styles.filterChipLow,
                  ]}
                  onPress={() => alertsState.setSelectedSeverity(item.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected && styles.filterChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.count > 0 && (
                    <View
                      style={[
                        styles.filterCount,
                        isSelected && styles.filterCountActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterCountText,
                          isSelected && styles.filterCountTextActive,
                        ]}
                      >
                        {item.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            }}
            keyExtractor={item => item.id}
          />
        </View>

        {/* Alerts List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.palette.primary400}
            />
            <Text style={styles.loadingText}>Loading alerts...</Text>
          </View>
        ) : filteredAlerts.length > 0 ? (
          <FlatList
            ref={flatListRef}
            data={filteredAlerts}
            renderItem={renderAlertCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScroll={event => {
              const offset = event.nativeEvent.contentOffset.y
              alertsState.setScrollOffset(offset)
            }}
            scrollEventThrottle={16}
            onContentSizeChange={() => {
              // Restore scroll position when content changes
              if (alertsState.scrollOffset > 0) {
                setTimeout(() => {
                  flatListRef.current?.scrollToOffset({
                    offset: alertsState.scrollOffset,
                    animated: false,
                  })
                }, 100)
              }
            }}
          />
        ) : (
          renderEmptyState()
        )}
      </SafeAreaView>
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral200,
    },
    safeArea: {
      flex: 1,
    },
    gradientHeader: {
      paddingTop: 12,
      paddingBottom: 16,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      marginBottom: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 4,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${theme.colors.palette.neutral100}40`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral100,
      marginBottom: 4,
      textShadowColor: `${theme.colors.palette.neutral900}26`,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    headerSubtitle: {
      fontSize: 13,
      fontFamily: typography.primary.medium,
      color: `${theme.colors.palette.neutral100}D9`,
    },
    badgeContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    urgentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.primary500,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 4,
    },
    urgentDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.palette.neutral100,
    },
    urgentText: {
      fontSize: 12,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
    },
    filtersContainer: {
      paddingBottom: 16,
      backgroundColor: theme.colors.palette.neutral100,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    filtersList: {
      paddingHorizontal: 20,
      gap: 10,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral300,
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 16,
      gap: 8,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    filterChipActive: {
      backgroundColor: theme.colors.palette.neutral100,
      borderColor: theme.colors.palette.neutral400,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    filterChipHigh: {
      borderColor: theme.colors.palette.primary500,
      backgroundColor: theme.colors.palette.angry100,
    },
    filterChipMedium: {
      borderColor: theme.colors.palette.primary400,
      backgroundColor: theme.colors.palette.primary100,
    },
    filterChipLow: {
      borderColor: theme.colors.palette.primary300,
      backgroundColor: `${theme.colors.palette.primary100}F5`,
    },
    filterChipText: {
      fontSize: 14,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral600,
    },
    filterChipTextActive: {
      color: theme.colors.palette.neutral900,
      fontFamily: typography.primary.bold,
    },
    filterCount: {
      backgroundColor: theme.colors.palette.neutral400,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      minWidth: 20,
      alignItems: 'center',
    },
    filterCountActive: {
      backgroundColor: theme.colors.palette.neutral300,
    },
    filterCountText: {
      fontSize: 11,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral600,
    },
    filterCountTextActive: {
      color: theme.colors.palette.neutral900,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 100,
    },
    alertCard: {
      marginBottom: 16,
      borderRadius: 24,
      backgroundColor: theme.colors.palette.neutral100,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    alertCardHigh: {
      borderWidth: 2,
      shadowColor: theme.colors.palette.angry500,
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
    alertCardContent: {
      padding: 20,
    },
    alertHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    severityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      gap: 6,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    severityText: {
      fontSize: 11,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
      letterSpacing: 0.5,
    },
    alertTime: {
      fontSize: 12,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral500,
    },
    alertTitle: {
      fontSize: 20,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
      marginBottom: 8,
    },
    alertDescription: {
      fontSize: 15,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
      lineHeight: 22,
      marginBottom: 16,
    },
    affectedSection: {
      marginBottom: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral300,
    },
    affectedSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      justifyContent: 'space-between',
    },
    affectedSectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    affectedSectionTitle: {
      fontSize: 14,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
    },
    affectedItemsList: {
      gap: 8,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
    },
    lineBadgeSmall: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      minWidth: 40,
      alignItems: 'center',
    },
    lineBadgeTextSmall: {
      fontSize: 11,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
    },
    detailText: {
      flex: 1,
      fontSize: 13,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral900,
    },
    alternativesContainer: {
      backgroundColor: `${theme.colors.palette.primary100}E6`,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: `${theme.colors.palette.primary200}CC`,
    },
    alternativesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    alternativesTitle: {
      fontSize: 14,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.primary600,
    },
    alternativeItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 8,
    },
    alternativeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.palette.primary500,
      marginTop: 6,
    },
    alternativeText: {
      flex: 1,
      fontSize: 14,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.primary600,
      lineHeight: 20,
    },
    expiryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral300,
    },
    expiryText: {
      fontSize: 12,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 60,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
      paddingTop: 80,
    },
    emptyIconContainer: {
      marginBottom: 24,
    },
    emptyIconGradient: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.primary400,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    emptyTitle: {
      fontSize: 28,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
      marginBottom: 12,
    },
    emptySubtitle: {
      fontSize: 16,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
    },
  })

export default AlertsScreen
