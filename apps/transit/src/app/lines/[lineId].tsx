// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { typography, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useMemo, useEffect, useState, useRef, useCallback } from 'react'
import {
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import LinearGradient from 'react-native-linear-gradient'
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

const LineDetailsScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { trackScreenMount } = useInteractionTracking(
    'LineDetails',
    '/lines/[lineId]',
  )
  const router = useRouter()
  const params = useLocalSearchParams()
  const { lineId } = params
  const {
    lineDetailStore: { lineDetailState },
  } = useStores()
  const canExecute = useDebounceRef(300)

  const [isLoading, setIsLoading] = useState(true)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(20)).current

  // Get line and lineStops from store, with fallback to null/empty array
  const line = lineDetailState.lineData as {
    id: string
    name: string
    shortName: string
    color: string
    operatingHoursStart: string
    operatingHoursEnd: string
    frequencyMinutes: number
  } | null
  const lineStops = (lineDetailState.lineStopsData || []) as {
    id: string
    name: string
    description?: string
    sequence: number
  }[]

  // Initialize/store lineId in store, clearing stale data on change
  useEffect(() => {
    const paramLineId = lineId as string | undefined
    if (paramLineId && paramLineId !== lineDetailState.lineId) {
      lineDetailState.setLineData(null)
      lineDetailState.setLineStopsData([])
      lineDetailState.setLineId(paramLineId)
    }
  }, [lineId, lineDetailState])

  // Load line details when lineId changes (either from params or store)
  useEffect(() => {
    const currentLineId = lineDetailState.lineId || (lineId as string)
    if (!currentLineId) {
      return
    }

    // Check if we already have data for this lineId
    const hasDataForCurrentLine =
      lineDetailState.lineId === currentLineId &&
      lineDetailState.lineData &&
      lineDetailState.lineStopsData.length > 0

    if (hasDataForCurrentLine) {
      setIsLoading(false)
      return
    }

    // Load data if we don't have it or if lineId changed
    const loadData = async () => {
      try {
        setIsLoading(true)
        const lineData = await queries.getLineById(currentLineId)
        const stops = await queries.getStopsByLine(currentLineId)
        lineDetailState.setLineId(currentLineId)
        lineDetailState.setLineData(lineData)
        lineDetailState.setLineStopsData(stops)
      } catch (error) {
        console.error('Error loading line details:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [lineDetailState.lineId, lineId, lineDetailState])

  // Track screen mount
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'LineDetails',
        route: '/lines/[lineId]',
      })
    }, [trackScreenMount]),
  )

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  // Debounced navigation handlers
  const handleBack = useCallback(() => {
    if (!canExecute()) return

    // Check if we can go back in navigation stack
    if (router.canGoBack()) {
      router.back()
    } else {
      // If no back stack (e.g., deeplink cold start), go to lines tab
      router.replace('/(tabs)/lines')
    }
  }, [canExecute, router])

  const handleStopPress = useCallback(
    (
      stopId: string,
      stopName: string,
      lineShortName: string,
      lineColor: string,
    ) => {
      if (!canExecute()) return
      // Don't pass lineId as query param - it's already in the path
      router.push(
        `/lines/${lineId}/stops/${stopId}?stopName=${stopName}&lineShortName=${lineShortName}&lineColor=${encodeURIComponent(lineColor)}`,
      )
    },
    [canExecute, router, lineId],
  )

  if (isLoading || !line) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.primary400}
          />
          <Text style={styles.loadingText}>Loading line details...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons
            name="arrow-back"
            size={28}
            color={theme.colors.palette.neutral900}
          />
        </TouchableOpacity>
        <View style={styles.lineHeaderInfo}>
          <View
            style={[styles.lineColorBadge, { backgroundColor: line.color }]}
          >
            <Text style={styles.lineShortName}>{line.shortName}</Text>
          </View>
          <Text style={styles.lineHeaderName}>{line.name}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.View
        style={[
          styles.lineDetailsInfo,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <LinearGradient
              colors={[
                theme.colors.palette.primary400,
                theme.colors.palette.primary300,
              ]}
              style={styles.infoIconContainer}
            >
              <Ionicons
                name="time"
                size={20}
                color={theme.colors.palette.neutral100}
              />
            </LinearGradient>
            <View style={styles.infoTextContainer}>
              <Text style={styles.lineDetailsLabel}>Operating Hours</Text>
              <Text style={styles.lineDetailsValue}>
                {line.operatingHoursStart} - {line.operatingHoursEnd}
              </Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <LinearGradient
              colors={[
                theme.colors.palette.primary400,
                theme.colors.palette.primary300,
              ]}
              style={styles.infoIconContainer}
            >
              <Ionicons
                name="pulse"
                size={20}
                color={theme.colors.palette.neutral100}
              />
            </LinearGradient>
            <View style={styles.infoTextContainer}>
              <Text style={styles.lineDetailsLabel}>Frequency</Text>
              <Text style={styles.lineDetailsValue}>
                Every {line.frequencyMinutes} minutes
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      <View style={styles.stopsHeader}>
        <Ionicons
          name="location"
          size={18}
          color={theme.colors.palette.primary400}
        />
        <Text style={styles.stopsHeaderText}>
          Route Stops ({lineStops.length})
        </Text>
      </View>

      <FlatList
        data={lineStops}
        keyExtractor={item => `${item.id}-${item.sequence}`}
        renderItem={({ item, index }) => (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [
                {
                  translateX: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              style={styles.stopItem}
              onPress={() =>
                handleStopPress(item.id, item.name, line.shortName, line.color)
              }
              activeOpacity={0.7}
            >
              <View style={styles.stopSequence}>
                <LinearGradient
                  colors={[line.color, line.color + 'CC']}
                  style={styles.stopNumber}
                >
                  <Text style={styles.stopNumberText}>{item.sequence}</Text>
                </LinearGradient>
                {index < lineStops.length - 1 && (
                  <View
                    style={[
                      styles.stopConnector,
                      { backgroundColor: line.color + '40' },
                    ]}
                  />
                )}
              </View>
              <View style={styles.stopContent}>
                <Text style={styles.stopName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.stopDescription}>{item.description}</Text>
                )}
              </View>
              <View style={styles.stopArrowContainer}>
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={theme.colors.palette.primary400}
                />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
        contentContainerStyle={styles.stopsListContent}
        showsVerticalScrollIndicator={false}
      />
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
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.colors.palette.neutral100,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerSpacer: {
      width: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 15,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
    },
    lineHeaderInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      justifyContent: 'center',
    },
    lineColorBadge: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    lineShortName: {
      fontSize: 12,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
    },
    lineHeaderName: {
      fontSize: 16,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
    },
    lineDetailsInfo: {
      paddingHorizontal: 20,
      paddingVertical: 20,
      backgroundColor: theme.colors.palette.neutral200,
    },
    infoCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 20,
      padding: 20,
      shadowColor: theme.colors.palette.primary400,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    infoIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.primary400,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 3,
    },
    infoTextContainer: {
      flex: 1,
    },
    infoDivider: {
      height: 1,
      backgroundColor: theme.colors.palette.neutral300,
      marginVertical: 16,
    },
    lineDetailsLabel: {
      fontSize: 12,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral500,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    lineDetailsValue: {
      fontSize: 16,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
    },
    stopsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.colors.palette.neutral200,
    },
    stopsHeaderText: {
      fontSize: 14,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral700,
      letterSpacing: 0.3,
    },
    stopsListContent: {
      paddingVertical: 12,
      paddingBottom: 24,
    },
    stopItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 4,
      backgroundColor: theme.colors.palette.neutral100,
      marginHorizontal: 20,
      padding: 16,
      borderRadius: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    stopSequence: {
      alignItems: 'center',
    },
    stopNumber: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 4,
    },
    stopNumberText: {
      fontSize: 16,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
    },
    stopConnector: {
      width: 3,
      flex: 1,
      minHeight: 24,
      marginVertical: 6,
    },
    stopContent: {
      flex: 1,
    },
    stopName: {
      fontSize: 16,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
      marginBottom: 6,
    },
    stopDescription: {
      fontSize: 13,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
      lineHeight: 18,
    },
    stopArrowContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

export default LineDetailsScreen
