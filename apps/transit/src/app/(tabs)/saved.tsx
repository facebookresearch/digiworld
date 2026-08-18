import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'
import { Text, typography, useAppTheme, type Theme } from '@andojo/shared-theme'
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'
import { useStores } from '@/models'
import { calculateDistance } from '@/utils/vehicleGenerator'

interface SavedRouteDisplay {
  id: string
  name: string
  origin: string
  destination: string
  preferredMode: string
  lastUsed: string
  distance: number // in km
  originStopId: string
  destinationStopId: string
}

const SavedScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { trackScreenMount } = useInteractionTracking('Saved', '/saved')
  const router = useRouter()
  const params = useLocalSearchParams()
  const {
    userStore,
    tripPlannerStore: { tripState },
  } = useStores()

  const fadeAnim = useRef(new Animated.Value(0)).current

  const [savedRoutesList, setSavedRoutesList] = useState<SavedRouteDisplay[]>(
    [],
  )
  const [isLoading, setIsLoading] = useState(true)
  const [alertCount, setAlertCount] = useState(0)

  const loadSavedRoutes = useCallback(async () => {
    try {
      setIsLoading(true)
      const userId = userStore.user?.id || 1
      const routes = await queries.getSavedRoutesByUser(userId)

      // Get stop names for each route
      const routesWithStopNames = await Promise.all(
        routes.map(
          async (route: {
            id: string
            name: string
            originStopId: string
            destinationStopId: string
            preferredMode: string
            updatedAt: string
          }) => {
            const [originStop, destinationStop] = await Promise.all([
              queries.getStopById(route.originStopId),
              queries.getStopById(route.destinationStopId),
            ])

            // Calculate distance between stops
            let distance = 0
            if (originStop && destinationStop) {
              distance = calculateDistance(
                originStop.latitude,
                originStop.longitude,
                destinationStop.latitude,
                destinationStop.longitude,
              )
            }

            // Format last used date
            const updatedDate = new Date(route.updatedAt)
            const now = new Date()
            const diffMs = now.getTime() - updatedDate.getTime()
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

            let lastUsed = ''
            if (diffDays === 0) {
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
              if (diffHours === 0) {
                const diffMins = Math.floor(diffMs / (1000 * 60))
                lastUsed = diffMins <= 1 ? 'Just now' : `${diffMins} min ago`
              } else {
                lastUsed = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
              }
            } else if (diffDays === 1) {
              lastUsed = 'Yesterday'
            } else if (diffDays < 7) {
              lastUsed = `${diffDays} days ago`
            } else {
              lastUsed = updatedDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            }

            return {
              id: route.id,
              name: route.name,
              origin: originStop?.name || 'Unknown',
              destination: destinationStop?.name || 'Unknown',
              preferredMode: route.preferredMode,
              lastUsed,
              distance,
              originStopId: route.originStopId,
              destinationStopId: route.destinationStopId,
            }
          },
        ),
      )

      setSavedRoutesList(routesWithStopNames)
    } catch (error) {
      console.error('Error loading saved routes:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userStore.user?.id])

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
      loadSavedRoutes()
      loadAlertCount()
    }, [loadSavedRoutes, loadAlertCount]),
  )

  // Track screen focus with session data (separate from data loading)
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'Saved',
        route: '/saved',
        sessionTimeStamp: params?.sessionTimeStamp,
        formData: {
          savedRoutesCount: savedRoutesList.length,
          routeIds: savedRoutesList.map(r => r.id),
          hasRoutes: savedRoutesList.length > 0,
        },
      })
      return () => {
        getLatestInteraction()
      }
    }, [trackScreenMount, params?.sessionTimeStamp]),
  )

  useEffect(() => {
    trackScreenMount()
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start()
  }, [fadeAnim])

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'bus':
        return 'bus'
      case 'train':
        return 'train'
      case 'subway':
        return 'subway'
      default:
        return 'location'
    }
  }

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'bus':
        return theme.colors.palette.primary400
      case 'train':
        return theme.colors.palette.secondary500
      case 'subway':
        return theme.colors.palette.success300
      default:
        return theme.colors.palette.neutral500
    }
  }

  const handleDeleteRoute = async (id: string) => {
    try {
      await mutations.deleteSavedRoute(id)
      // Reload the list
      await loadSavedRoutes()
    } catch (error) {
      console.error('Error deleting route:', error)
    }
  }

  const handleUseRoute = (route: SavedRouteDisplay) => {
    // Pre-fill the trip planner store with saved route data
    tripState.setOrigin(route.origin)
    tripState.setDestination(route.destination)
    // Navigate to trip planning screen
    router.push('/(tabs)/plan')
  }

  const handleAddRoute = () => {
    router.push('/(tabs)/plan')
  }

  const formatDistance = (distanceKm: number): string => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m`
    }
    return `${distanceKm.toFixed(1)} km`
  }

  const renderRouteCard = ({ item }: { item: SavedRouteDisplay }) => {
    return (
      <Animated.View
        style={[
          styles.routeCard,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.routeCardContent}
          onPress={() => handleUseRoute(item)}
          activeOpacity={0.8}
        >
          {/* Route Header */}
          <View style={styles.routeHeader}>
            <View style={styles.routeIconContainer}>
              <View
                style={[
                  styles.routeIcon,
                  { backgroundColor: getModeColor(item.preferredMode) },
                ]}
              >
                <Ionicons
                  name={
                    getModeIcon(item.preferredMode) as
                      | 'bus'
                      | 'train'
                      | 'subway'
                      | 'location'
                  }
                  size={24}
                  color={theme.colors.palette.neutral100}
                />
              </View>
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeName}>{item.name}</Text>
              <Text style={styles.lastUsed}>{item.lastUsed}</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteRoute(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={theme.colors.palette.angry500}
              />
            </TouchableOpacity>
          </View>

          {/* Route Path */}
          <View style={styles.routePath}>
            <View style={styles.pathRow}>
              <View style={styles.dotOrigin} />
              <Text style={styles.locationText}>{item.origin}</Text>
            </View>
            <View style={styles.pathConnector} />
            <View style={styles.pathRow}>
              <Ionicons
                name="location"
                size={16}
                color={theme.colors.palette.primary500}
              />
              <Text style={styles.locationText}>{item.destination}</Text>
            </View>
          </View>

          {/* Route Meta */}
          <View style={styles.routeMeta}>
            <View style={styles.metaItem}>
              <Ionicons
                name="navigate-outline"
                size={16}
                color={theme.colors.palette.neutral600}
              />
              <Text style={styles.metaText}>
                {formatDistance(item.distance)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.useButton}
              activeOpacity={0.8}
              onPress={() => handleUseRoute(item)}
            >
              <Text style={styles.useButtonText}>Use Route</Text>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={theme.colors.palette.neutral100}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  const renderEmptyState = () => {
    return (
      <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name="bookmarks-outline"
            size={64}
            color={theme.colors.palette.neutral500}
          />
        </View>
        <Text style={styles.emptyTitle}>No Saved Routes</Text>
        <Text style={styles.emptySubtitle}>
          Save your frequent trips for quick access
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          activeOpacity={0.8}
          onPress={handleAddRoute}
        >
          <LinearGradient
            colors={[
              theme.colors.palette.secondary500,
              theme.colors.palette.primary500,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyButtonGradient}
          >
            <Ionicons
              name="add"
              size={20}
              color={theme.colors.palette.neutral100}
            />
            <Text style={styles.emptyButtonText}>Plan a Trip</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Saved Routes</Text>
          <Text style={styles.headerSubtitle}>
            {savedRoutesList.length} saved trip
            {savedRoutesList.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.alertsButton}
          activeOpacity={0.7}
          onPress={() => router.push('/alerts')}
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

      {/* Routes List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.primary400}
          />
          <Text style={styles.loadingText}>Loading saved routes...</Text>
        </View>
      ) : savedRoutesList.length > 0 ? (
        <FlatList
          data={savedRoutesList}
          renderItem={renderRouteCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState()
      )}
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
    alertsButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.primary400,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
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
      backgroundColor: theme.colors.palette.primary500,
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral100,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    routeCard: {
      marginBottom: 16,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral100,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    routeCardContent: {
      padding: 20,
    },
    routeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    routeIconContainer: {
      marginRight: 12,
    },
    routeIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: `${theme.colors.palette.neutral100}`,
    },
    routeInfo: {
      flex: 1,
    },
    routeName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
      marginBottom: 4,
    },
    lastUsed: {
      fontSize: 13,
      color: theme.colors.palette.neutral500,
    },
    deleteButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.palette.angry100,
      justifyContent: 'center',
      alignItems: 'center',
    },
    routePath: {
      marginBottom: 16,
      paddingLeft: 8,
    },
    pathRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    dotOrigin: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.palette.primary500,
      borderWidth: 2,
      borderColor: `${theme.colors.palette.neutral100}80`,
    },
    pathConnector: {
      width: 2,
      height: 24,
      backgroundColor: theme.colors.palette.neutral400,
      marginLeft: 5,
      marginVertical: 4,
    },
    locationText: {
      fontSize: 15,
      color: theme.colors.palette.neutral700,
      fontWeight: '500',
    },
    routeMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral400,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
    },
    useButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.secondary500,
      borderRadius: 16,
      paddingVertical: 8,
      paddingHorizontal: 16,
      gap: 8,
      shadowColor: theme.colors.palette.secondary400,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    useButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyIcon: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.palette.neutral800,
      marginBottom: 12,
    },
    emptySubtitle: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      marginBottom: 32,
    },
    emptyButton: {
      borderRadius: 25,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    emptyButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 28,
      gap: 10,
    },
    emptyButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
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
      color: theme.colors.palette.neutral600,
    },
  })

export default SavedScreen
