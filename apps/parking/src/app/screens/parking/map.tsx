import { useRef, useEffect, useCallback, useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import * as MapLibreGL from '@maplibre/maplibre-react-native'
import RNFS from 'react-native-fs'
import { useAppTheme, type Theme, Text } from '@andojo/shared-theme'
import { useFocusEffect, useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models/helpers/useStores'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { externalPaths, logExternalPaths } from '@/utils/constants'
import { debounce } from 'lodash'

MapLibreGL.setAccessToken(null)

const MIN_ZOOM = 15
const MAX_ZOOM = 18

const minimalStyle = {
  version: 8,
  sources: {},
  layers: [],
}

const MapScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { parkingStore, uiStore } = useStores()
  const { trackScreenMount } = useInteractionTracking(
    'ParkingMap',
    '/screens/parking/map',
  )

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        date: Date.now(),
        screenName: 'ParkingMap',
        route: '/screens/parking/map',
      })
    }, []),
  )
  const cameraRef = useRef<any>(null)
  const router = useRouter()

  // Get map state from store
  const { tileUrlTemplate, centerCoordinate, zoomLevel, isInitialized } =
    uiStore.mapState

  // Get user's default location from store
  const defaultLocation = parkingStore.defaultUserLocation
  const userLocation: [number, number] | null =
    defaultLocation &&
    defaultLocation.latitude !== null &&
    defaultLocation.longitude !== null
      ? [defaultLocation.longitude, defaultLocation.latitude]
      : null

  // Get parking zones from store
  const parkingZones = parkingStore.activeParkingZones
  const selectedZone = parkingStore.selectedParkingZone
  const selectedZoneId = selectedZone?.id || null

  console.log('Parking zones count:', parkingZones.length)
  console.log('Tile URL:', tileUrlTemplate)
  console.log('Map initialized:', isInitialized)

  // Debug: Log first few zones
  if (parkingZones.length > 0) {
    console.log(
      'First 3 zones:',
      parkingZones.slice(0, 3).map(z => ({
        id: z.id,
        code: z.zoneCode,
        lat: z.latitude,
        lng: z.longitude,
      })),
    )
  }

  // Load parking zones when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadZones = async () => {
        // If zones are already loading, wait for them to finish
        if (parkingStore.zonesLoading) {
          console.log('Zones are already loading, waiting...')
          // Wait for loading to complete (check every 100ms, max 5 seconds)
          let attempts = 0
          while (parkingStore.zonesLoading && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100))
            attempts++
          }
          console.log(
            'Zones loading completed, count:',
            parkingStore.activeParkingZones.length,
          )
          parkingStore.setZonesReady(true)
        } else if (parkingZones.length === 0) {
          // Zones are not loading and empty, load them
          console.log('Loading parking zones on focus...')
          await parkingStore.loadParkingZones()
          console.log(
            'Parking zones loaded:',
            parkingStore.activeParkingZones.length,
          )
        } else {
          // Zones are already loaded
          parkingStore.setZonesReady(true)
        }
      }
      loadZones()
    }, [parkingZones.length, parkingStore.zonesLoading]),
  )

  // Also load zones on mount if not loaded
  useEffect(() => {
    const loadZones = async () => {
      // Wait a bit to ensure store initialization has started
      await new Promise(resolve => setTimeout(resolve, 200))

      // If zones are already loading, wait for them to finish
      if (parkingStore.zonesLoading) {
        console.log('Zones are already loading on mount, waiting...')
        // Wait for loading to complete (check every 100ms, max 5 seconds)
        let attempts = 0
        while (parkingStore.zonesLoading && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
        console.log(
          'Zones loading completed on mount, count:',
          parkingStore.activeParkingZones.length,
        )
        parkingStore.setZonesReady(true)
      } else if (parkingZones.length === 0) {
        // Zones are not loading and empty, load them
        console.log('Loading parking zones on mount...')
        await parkingStore.loadParkingZones()
        console.log(
          'Parking zones loaded:',
          parkingStore.activeParkingZones.length,
        )
      } else {
        // Zones are already loaded
        parkingStore.setZonesReady(true)
      }
    }
    loadZones()
  }, [])

  // Update zonesReady when zones change
  useEffect(() => {
    if (parkingZones.length > 0 && !parkingStore.zonesLoading) {
      parkingStore.setZonesReady(true)
    }
  }, [parkingZones.length, parkingStore.zonesLoading])

  // Set map center to user location or NYC center on mount
  useEffect(() => {
    if (userLocation) {
      uiStore.setMapCenter(userLocation)
      console.log('Using user location from store:', userLocation)
    } else {
      // Default to NYC center if no user location
      const nycCenter: [number, number] = [-73.985428, 40.748817]
      uiStore.setMapCenter(nycCenter)
      console.log('No user location available, using NYC center')
    }
  }, [])

  // Initialize directories and load map tiles
  useEffect(() => {
    // Only initialize once
    if (isInitialized) return

    const initializeMap = async () => {
      try {
        // Log paths for debugging
        logExternalPaths()

        // Create mockdata directory if it doesn't exist
        const mockDataExists = await RNFS.exists(externalPaths.mockData)
        if (!mockDataExists) {
          await RNFS.mkdir(externalPaths.mockData)
          console.log('Created mockdata directory at:', externalPaths.mockData)
        }

        // Create assets directory if it doesn't exist
        const assetsExists = await RNFS.exists(externalPaths.assets)
        if (!assetsExists) {
          await RNFS.mkdir(externalPaths.assets)
          console.log('Created assets directory at:', externalPaths.assets)
        }

        // Check for tiles and set path
        const tilesExist = await RNFS.exists(externalPaths.tiles)
        console.log(
          'Checking tiles directory at:',
          externalPaths.tiles,
          'exists:',
          tilesExist,
        )

        if (tilesExist) {
          const path = 'file://' + externalPaths.tiles + '/{z}/{x}/{y}.png'
          console.log('Using tiles from external path:', path)
          uiStore.setMapTileUrl(path)
        } else {
          // Fallback to default location
          const fallbackPath =
            'file://' +
            `${externalPaths.defaultTiles}/tiles` +
            '/{z}/{x}/{y}.png'
          console.log('Using tiles from default local path:', fallbackPath)
          uiStore.setMapTileUrl(fallbackPath)
        }

        uiStore.setMapInitialized(true)
      } catch (err) {
        console.error('Failed to initialize map:', err)
      }
    }

    initializeMap()
  }, [isInitialized])

  // Debounced handlers to prevent multiple rapid taps
  const handleZonePress = useCallback(
    debounce((zoneId: number) => {
      // Toggle selection
      if (selectedZoneId === zoneId) {
        parkingStore.setSelectedParkingZone(null)
      } else {
        const zone = parkingZones.find(z => z.id === zoneId)
        if (zone) {
          parkingStore.setSelectedParkingZone(zone)
          console.log('Selected zone:', zone.zoneCode, zone.name)
        }
      }
    }, 300),
    [selectedZoneId, parkingZones, parkingStore],
  )

  const handleMyLocation = useCallback(
    debounce(() => {
      if (!userLocation) {
        Alert.alert(
          'No Location',
          'No saved location found. Please add a location in your profile.',
          [{ text: 'OK' }],
        )
        return
      }

      // Center map on user's saved location
      uiStore.setMapCenter(userLocation)

      // Animate camera to user location
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: userLocation,
          zoomLevel: 16,
          animationDuration: 1000,
        })
      }
    }, 300),
    [userLocation, uiStore],
  )

  const handleBack = useCallback(
    debounce(() => {
      parkingStore.setSelectedParkingZone(null)
      // Explicitly navigate to home instead of router.back() to ensure proper navigation after rollback
      router.push('/(tabs)/home' as any)
    }, 300),
    [router, parkingStore],
  )

  const handleNavigateToBookParking = useCallback(
    debounce(() => {
      parkingStore.setExtendingSession(null) // Clear extending session for normal flow
      router.push('/screens/parking/book-parking' as any)
    }, 300),
    [router, parkingStore],
  )

  return (
    <View style={styles.container}>
      {/* Map View - Full Screen */}
      <MapLibreGL.MapView
        style={styles.map}
        mapStyle={JSON.stringify(minimalStyle)}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          zoomLevel={zoomLevel}
          minZoomLevel={MIN_ZOOM}
          maxZoomLevel={MAX_ZOOM}
          centerCoordinate={centerCoordinate.slice() as [number, number]}
        />
        {tileUrlTemplate && isInitialized ? (
          <MapLibreGL.RasterSource
            id="offlineMap"
            tileUrlTemplates={[tileUrlTemplate]}
            tileSize={256}
            minZoomLevel={MIN_ZOOM}
            maxZoomLevel={MAX_ZOOM}
          >
            <MapLibreGL.RasterLayer
              id="offlineLayer"
              style={{
                rasterContrast: 0.5,
                rasterBrightnessMax: 0.6,
                rasterOpacity: 1,
              }}
            />
          </MapLibreGL.RasterSource>
        ) : null}

        {/* Register marker images */}
        <MapLibreGL.Images
          images={{
            parkingMarker: require('../../../../assets/images/selected-location.png'),
            parkingSelected: require('../../../../assets/images/location.png'),
          }}
        />

        {/* User Location Marker */}
        {userLocation && isInitialized && (
          <MapLibreGL.ShapeSource
            key={`userLocation-${userLocation[0]}-${userLocation[1]}`}
            id="userLocation"
            shape={{
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: userLocation,
              },
              properties: {},
            }}
          >
            <MapLibreGL.CircleLayer
              id="userLocationCircle"
              style={{
                circleRadius: 8,
                circleColor: theme.colors.palette.primary500,
                circleStrokeWidth: 3,
                circleStrokeColor: theme.colors.palette.neutral100,
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* Parking Zone Markers */}
        {parkingZones.length > 0 &&
          isInitialized &&
          parkingStore.zonesReady && (
            <MapLibreGL.ShapeSource
              key={`zones-${parkingZones.length}-${selectedZoneId}`}
              id="parkingZones"
              shape={{
                type: 'FeatureCollection',
                features: parkingZones.map(zone => ({
                  type: 'Feature',
                  id: zone.id,
                  geometry: {
                    type: 'Point',
                    coordinates: [zone.longitude, zone.latitude],
                  },
                  properties: {
                    id: zone.id,
                    zoneCode: zone.zoneCode,
                    name: zone.name,
                    icon:
                      selectedZoneId === zone.id
                        ? 'parkingSelected'
                        : 'parkingMarker',
                  },
                })),
              }}
              onPress={event => {
                const feature = event.features[0]
                if (feature?.properties?.id) {
                  handleZonePress(feature.properties.id)
                }
              }}
            >
              {/* Icon Layer */}
              <MapLibreGL.SymbolLayer
                id="zone-icons"
                style={{
                  iconImage: ['get', 'icon'],
                  iconAllowOverlap: true,
                  iconIgnorePlacement: true,
                  iconSize: 0.4,
                  symbolZOrder: 'viewport-y',
                }}
              />
            </MapLibreGL.ShapeSource>
          )}
      </MapLibreGL.MapView>

      {/* Overlay UI */}
      <SafeAreaView style={styles.overlay} edges={['top']}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.palette.primary500}
          />
        </TouchableOpacity>
      </SafeAreaView>

      {/* My Location Button - Top Right */}
      <TouchableOpacity
        style={styles.myLocationButton}
        onPress={handleMyLocation}
      >
        <Ionicons
          name="locate"
          size={22}
          color={theme.colors.palette.primary500}
        />
      </TouchableOpacity>

      {/* Selected Zone Overlay Card */}
      {selectedZone && (
        <View style={styles.zoneOverlay}>
          <View style={styles.zoneInfo}>
            <View style={styles.zoneDetails}>
              <Text style={styles.zoneCode}>{selectedZone.zoneCode}</Text>
              <Text style={styles.zoneName} numberOfLines={1}>
                {selectedZone.name}
              </Text>
              {selectedZone.operator && (
                <Text style={styles.zoneOperator} numberOfLines={1}>
                  {selectedZone.operator}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => parkingStore.setSelectedParkingZone(null)}
            >
              <Ionicons
                name="close"
                size={20}
                color={theme.colors.palette.neutral600}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.parkButton}
            onPress={handleNavigateToBookParking}
          >
            <Text style={styles.parkButtonText}>Park</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    map: {
      flex: 1,
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 24,
      paddingTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backButton: {
      width: 48,
      height: 48,
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: theme.colors.palette.overlay50,
    },
    myLocationButton: {
      position: 'absolute',
      right: 16,
      top: 80,
      width: 48,
      height: 48,
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: theme.colors.palette.overlay50,
    },
    zoneOverlay: {
      position: 'absolute',
      bottom: 24,
      left: 16,
      right: 16,
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 16,
      padding: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 12,
      borderWidth: 1,
      borderColor: theme.colors.palette.overlay50,
    },
    zoneInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    zoneDetails: {
      flex: 1,
      gap: 2,
    },
    zoneCode: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
    },
    zoneName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
    zoneOperator: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
    },
    closeButton: {
      width: 28,
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    parkButton: {
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    parkButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
  })

export default MapScreen
