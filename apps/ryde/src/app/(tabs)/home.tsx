import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Animated,
  BackHandler,
  Pressable,
} from 'react-native'
import * as MapLibreGL from '@maplibre/maplibre-react-native'
import RNFS from 'react-native-fs'
import { Text, useTheme, Theme } from '@andojo/shared-theme'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models/helpers/useStores'
import { Ionicons } from '@expo/vector-icons'
import { DrawerActions, useNavigation } from '@react-navigation/native'
import RideOptions from '../screens/rides/rideOptions'
import DriverAssignment from '../screens/rides/DriverAssignment'
import GpsIcon from '../../../assets/icons/gps.svg'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useDrawerStatus } from '@react-navigation/drawer'
import { externalPaths, logExternalPaths } from '@/utils/constants'

MapLibreGL.setAccessToken(null)

const MIN_ZOOM = 15
const DEFAULT_ZOOM = 16
const MAX_ZOOM = 17

const minimalStyle = {
  version: 8,
  sources: {},
  layers: [],
}

const calculateBearing = (from: number[], to: number[]): number => {
  const [lon1, lat1] = from
  const [lon2, lat2] = to

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const toDegrees = (radians: number) => (radians * 180) / Math.PI

  const lat1Rad = toRadians(lat1)
  const lat2Rad = toRadians(lat2)
  const lonDiffRad = toRadians(lon2 - lon1)

  const y = Math.sin(lonDiffRad) * Math.cos(lat2Rad)
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(lonDiffRad)

  return (toDegrees(Math.atan2(y, x)) + 360) % 360
}

const checkAndCreateDirectory = async () => {
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
}

const getTilePath = async () => {
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
    return path
  }

  // Fallback to default location
  const fallbackPath =
    'file://' + `${externalPaths.defaultTiles}/tiles` + '/{z}/{x}/{y}.png'
  console.log('Using tiles from default local path:', fallbackPath)
  return fallbackPath
}

const HomeScreen = observer(() => {
  const { rideStore, uiStore, sessionStore } = useStores()
  const [tileUrlTemplate, setTileUrlTemplate] = useState<string>('')
  const [iconFeatures, setIconFeatures] = useState<any[]>([])
  const [centerCoordinate, setCenterCoordinate] = useState<number[]>([
    -73.996101, 40.722502,
  ])
  const [approachRoute, setApproachRoute] = useState<any>(null)
  const [isApproaching, setIsApproaching] = useState(false)
  const [carPosition, setCarPosition] = useState(0)
  const [carBearing, setCarBearing] = useState(0)
  const [carReachedDestination, setCarReachedDestination] = useState(false)
  const headerHeight = useRef(new Animated.Value(1)).current
  const { theme } = useTheme()
  const colors = theme.colors
  const styles = createStyles(colors)

  // Inner components that use styles
  const SearchBar = ({
    label,
    value,
    onPress,
  }: {
    label: string
    value: string
    onPress: () => void
  }) => (
    <TouchableOpacity onPress={onPress} style={styles.searchBar}>
      <Text
        style={{ ...styles.searchBarValue, ...(!value && styles.placeholder) }}
      >
        {value || `Enter your ${label.toLowerCase()}`}
      </Text>
    </TouchableOpacity>
  )

  const DottedLine = ({ dotCount = 4 }: { dotCount?: number }) => (
    <View style={styles.dottedLineContainer}>
      {Array.from({ length: dotCount }).map((_, idx) => (
        <View key={idx} style={styles.dottedLineDot} />
      ))}
    </View>
  )
  const params = useLocalSearchParams<{
    type?: string
    value?: string
    sessionId?: string
  }>()
  const cameraRef = useRef<MapLibreGL.CameraRef | null>(null)
  const router = useRouter()
  const [zoomLevel] = React.useState(DEFAULT_ZOOM)
  const navigation = useNavigation()
  const { trackScreenMount, trackContentChange } = useInteractionTracking(
    'home',
    '/(tabs)/home',
  )
  const currentSessionIdRef = useRef<string | null>(null)
  const systemDrawerStatus = useDrawerStatus() === 'open'
  const [isDrawerOpen] = useState(systemDrawerStatus)

  // Toggle drawer function
  const toggleDrawer = () => {
    if (isDrawerOpen) {
      uiStore.setDrawerOpen(false)
      navigation.dispatch(DrawerActions.closeDrawer())
    } else {
      uiStore.setDrawerOpen(true)
      navigation.dispatch(DrawerActions.openDrawer())
    }
  }

  // Handle session restoration
  useEffect(() => {
    if (params?.sessionId) {
      console.log('Home screen received sessionId:', params.sessionId)
      const sessionData = sessionStore.getSession(params?.sessionId as string)
      if (sessionData?.data) {
        const formData = sessionData.data.sessionData?.formData
        console.log('formData', formData)
        console.log('currentSessionIdRef.current', currentSessionIdRef.current)
        console.log('uiStore.currentSessionId', uiStore.currentSessionId)
        // @ts-ignore
        if (
          uiStore.isDrawerOpen &&
          currentSessionIdRef.current !== uiStore.currentSessionId
        ) {
          if (rideStore.showSearch) {
            rideStore.clearSearch()
          }
          setTimeout(() => {
            // @ts-ignore
            navigation.openDrawer()
            currentSessionIdRef.current = uiStore.currentSessionId
          }, 100)
        } else {
          console.log('Drawer is already open')
        }
        // @ts-ignore
        trackContentChange(formData)
      } else {
        console.log('Session data not found')
      }
    }
  }, [params?.sessionId, uiStore.currentSessionId])

  // Track initial state on mount
  useEffect(() => {
    trackScreenMount({
      isDrawerOpen,
      origin: rideStore.origin,
      destination: rideStore.destination,
    })
  }, [])

  // Load places data
  useEffect(() => {
    trackScreenMount()
    const loadPlaces = async () => {
      try {
        let data

        if (await RNFS.exists(externalPaths.routes)) {
          console.log('Loading places data from:', externalPaths.routes)
          const jsonStr = await RNFS.readFile(externalPaths.routes, 'utf8')
          data = JSON.parse(jsonStr)
        } else {
          data = require('../../../assets/maps/default/routes.json')
          console.log(
            'Loading places data from default local path:',
            '../../../assets/maps/default/routes.json',
          )
        }

        const froms = data.features.map((f: any) => f?.properties?.from)
        const tos = data.features.map((f: any) => f?.properties?.to)

        const uniquePlaces = Array.from(new Set([...froms, ...tos])).filter(
          Boolean,
        )
        rideStore.setPlaces(uniquePlaces)
      } catch (e) {
        console.error('Failed to load places data:', e)
        rideStore.setPlaces([])
      }
    }
    loadPlaces()
  }, [])

  useEffect(() => {
    checkAndCreateDirectory()
    getTilePath().then(path => {
      setTileUrlTemplate(path)
    })
  }, [])
  useEffect(() => {
    if (rideStore.currentRide?.status === 'booked') {
      if (isApproaching) {
        setIsApproaching(false)
        setCarPosition(0)
        setCarReachedDestination(false)
        setApproachRoute(null)
        // We don't reset coordinates as we want the user to focus on their origin
      }
    }
  }, [rideStore.currentRide?.status])

  useEffect(() => {
    if (params?.type && params?.value) {
      let updated = false
      if (params.type === 'origin' && rideStore.origin !== params.value) {
        rideStore.setOrigin(params.value as string)
        updated = true
      }
      if (
        params.type === 'destination' &&
        rideStore.destination !== params.value
      ) {
        rideStore.setDestination(params.value as string)
        updated = true
      }
      // Clear params after updating to prevent infinite loop
      if (updated) {
        router.replace({ pathname: '/(tabs)/home' })
      }
    }
    // Only depend on params, not rideStore
  }, [params])

  useEffect(() => {
    const updateCenter = async () => {
      try {
        let data

        if (await RNFS.exists(externalPaths.routes)) {
          console.log('🎯 Loading route data from:', externalPaths.routes)
          const jsonStr = await RNFS.readFile(externalPaths.routes, 'utf8')
          data = JSON.parse(jsonStr) // From disk → parse string
        } else {
          data = require('../../../assets/maps/default/routes.json')
          console.log(
            '🎯 Loading route data from default local path, ../../../assets/maps/default/routes.json',
          )
        }

        let originCoord = null

        if (rideStore.origin) {
          const feature = data.features.find(
            (f: any) => f?.properties?.from === rideStore.origin,
          )
          originCoord = feature?.geometry?.coordinates?.[0]
        }

        if (originCoord) {
          setCenterCoordinate(originCoord)
        } else {
          setCenterCoordinate([-73.996101, 40.722502]) // fallback
        }
      } catch (err) {
        console.error('Failed to update center:', err)
        setCenterCoordinate([-73.996101, 40.722502])
      }
    }
    updateCenter()
  }, [rideStore.origin, rideStore.destination])

  useEffect(() => {
    const loadIconFeatures = async () => {
      try {
        let data

        if (await RNFS.exists(externalPaths.routes)) {
          console.log('Loading icon features from:', externalPaths.routes)
          const jsonStr = await RNFS.readFile(externalPaths.routes, 'utf8')
          data = JSON.parse(jsonStr)
        } else {
          data = require('../../../assets/maps/default/routes.json')
          console.log(
            'Loading icon features from default local path:',
            '../../../assets/maps/default/routes.json',
          )
        }

        const features: any[] = []

        // Origin
        if (rideStore.origin) {
          const feature = data.features.find(
            (f: any) => f?.properties?.from === rideStore.origin,
          )
          const coord = feature?.geometry?.coordinates?.[0]
          if (coord) {
            features.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: coord },
              properties: { icon: 'home' },
            })
          }
        }

        // Destination
        if (rideStore.destination) {
          const feature = data.features.find(
            (f: any) => f?.properties?.to === rideStore.destination,
          )
          const coord = feature?.geometry?.coordinates?.slice(-1)?.[0]
          if (coord) {
            features.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: coord },
              properties: { icon: 'location' },
            })
          }
        }

        setIconFeatures(features)
      } catch (err) {
        console.error('Failed to load icon features:', err)
        setIconFeatures([])
      }
    }

    loadIconFeatures()
  }, [rideStore.origin, rideStore.destination])

  useEffect(() => {
    const updateRoute = async () => {
      try {
        let data

        if (await RNFS.exists(externalPaths.routes)) {
          console.log('Loading route data from:', externalPaths.routes)
          const jsonStr = await RNFS.readFile(externalPaths.routes, 'utf8')
          data = JSON.parse(jsonStr)
        } else {
          data = require('../../../assets/maps/default/routes.json')
          console.log(
            'Loading route data from default local path:',
            '../../../assets/maps/default/routes.json',
          )
        }

        let routeCoords = []
        let routeDistance = 0

        if (rideStore.origin && rideStore.destination) {
          const routeFeature = data.features.find(
            (f: any) =>
              f?.properties?.from === rideStore.origin &&
              f?.properties?.to === rideStore.destination,
          )

          routeCoords = routeFeature?.geometry?.coordinates || []
          routeDistance = routeFeature?.properties?.distance_km ?? null
        }

        rideStore.setRouteCoordinates(routeCoords)
        rideStore.setDistance(routeDistance)
      } catch (err) {
        console.error('Failed to update route:', err)
        rideStore.setRouteCoordinates([])
        rideStore.setDistance(0)
      }
    }

    updateRoute()
  }, [rideStore.origin, rideStore.destination])

  useEffect(() => {
    if (rideStore.origin && rideStore.destination) {
      // Collapse header when route is selected
      Animated.timing(headerHeight, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      // Show header when route is cleared
      Animated.timing(headerHeight, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    }
  }, [rideStore.origin, rideStore.destination])

  useEffect(() => {
    const getApproachRoute = async () => {
      try {
        let data: any

        if (await RNFS.exists(externalPaths.routes)) {
          console.log('Loading approach route data from:', externalPaths.routes)
          const jsonStr = await RNFS.readFile(externalPaths.routes, 'utf8')
          data = JSON.parse(jsonStr)
        } else {
          data = require('../../../assets/maps/default/routes.json')
          console.log(
            'Loading approach route data from default local path:',
            '../../../assets/maps/default/routes.json',
          )
        }

        // Filter routes ending at origin
        const filteredRoutes = data.features.filter(
          (f: any) => f.properties.to === rideStore.origin,
        )

        // Exclude reverse route from destination → origin
        const routesExcludingCurrent = filteredRoutes.filter(
          (f: any) => f.properties.from !== rideStore.destination,
        )

        if (!routesExcludingCurrent.length) {
          console.warn('No alternative approach routes found')
          return
        }

        // Select shortest route by distance_km
        const minRoute = routesExcludingCurrent.reduce(
          (min: any, curr: any) =>
            curr.properties.distance_km < min.properties.distance_km
              ? curr
              : min,
          routesExcludingCurrent[0],
        )

        setApproachRoute(minRoute)

        if (minRoute?.geometry?.coordinates?.length) {
          setCarPosition(0)
          setCenterCoordinate(minRoute.geometry.coordinates[0])
          setIsApproaching(true)
          setCarReachedDestination(false)
        }
      } catch (e) {
        console.error('Failed to load approach route data:', e)
      }
    }

    if (rideStore.currentRide?.status === 'driver-assigned') {
      getApproachRoute()
    }
  }, [rideStore.currentRide?.status, rideStore.origin, rideStore.destination])

  useFocusEffect(
    React.useCallback(() => {
      const { trackScreenMount } = useInteractionTracking(
        'home',
        '/(tabs)/home',
      )

      // Track screen mount when focused
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'home',
        route: '/(tabs)/home',
      })
    }, [router]),
  )

  useEffect(() => {
    if (rideStore.currentRide?.status === 'ongoing') {
      // For ongoing status, set the approachRoute to use routeCoordinates
      try {
        const routeCoords = rideStore.routeCoordinates
        if (routeCoords && routeCoords.length > 1) {
          const ongoingRoute = {
            geometry: {
              coordinates: routeCoords,
            },
          }
          setApproachRoute(ongoingRoute)
          setCarPosition(0)
          setCenterCoordinate(routeCoords[0])
          setIsApproaching(true)
          setCarReachedDestination(false)
        }
      } catch (error) {
        console.error('Error accessing route coordinates:', error)
        // If there's an MST error, clear the approach route
        setApproachRoute(null)
        setIsApproaching(false)
      }
    }
  }, [rideStore.currentRide?.status, rideStore?.currentRouteCoordinates])

  // Explicit cleanup to ensure grey line is never shown during driver-assigned status
  useEffect(() => {
    if (rideStore.currentRide?.status === 'driver-assigned') {
      // Ensure we're not showing any covered route (grey line) during driver-assigned
      setCarReachedDestination(false)
    }
  }, [rideStore.currentRide?.status])

  // Animation for ongoing status using routeCoordinates
  useEffect(() => {
    if (
      isApproaching &&
      approachRoute &&
      approachRoute.geometry?.coordinates?.length > 1
    ) {
      try {
        const coordinates = approachRoute.geometry.coordinates
        let segmentIndex = 0
        let startTime: number | null = null
        let animationFrame: number
        // Use 60 seconds for ongoing status, 30 seconds for driver-assigned
        const totalDuration =
          rideStore.currentRide?.status === 'ongoing' ? 60000 : 30000
        const numSegments = coordinates.length - 1
        const ANIMATION_DURATION_PER_SEGMENT = totalDuration / numSegments
        const animate = (timestamp: number) => {
          if (!startTime) startTime = timestamp
          const elapsed = timestamp - startTime
          const t = Math.min(elapsed / ANIMATION_DURATION_PER_SEGMENT, 1)
          const from = coordinates[segmentIndex]
          const to = coordinates[segmentIndex + 1]
          const newCoord = interpolateCoordinates(from, to, t)
          const bearing = calculateBearing(from, to)
          setCarBearing(bearing)
          setCarPosition(segmentIndex + t)
          setCenterCoordinate(newCoord)
          if (t < 1) {
            animationFrame = requestAnimationFrame(animate)
          } else {
            segmentIndex++
            startTime = null
            if (segmentIndex < coordinates.length - 1) {
              animationFrame = requestAnimationFrame(animate)
            } else {
              // Animation completed - set car to final position but keep it visible
              setCarPosition(coordinates.length - 1)
              setCenterCoordinate(coordinates[coordinates.length - 1])
              setIsApproaching(false)
              setCarReachedDestination(true)
            }
          }
        }
        animationFrame = requestAnimationFrame(animate)
        return () => {
          if (animationFrame) {
            cancelAnimationFrame(animationFrame)
          }
        }
      } catch (error) {
        console.error('Error during animation:', error)
        // If there's an MST error, stop the animation
        setIsApproaching(false)
        setCarReachedDestination(false)
      }
    }
  }, [isApproaching, approachRoute, rideStore.currentRide?.status])

  // Cleanup approach state when ride status changes
  useEffect(() => {
    if (!rideStore.currentRide) {
      setIsApproaching(false)
      setApproachRoute(null)
      setCarPosition(0)
      setCarReachedDestination(false)
    }
  }, [rideStore.currentRide])

  const handleBackPress = () => {
    if (rideStore.origin || rideStore.destination) {
      // If there's a current ride in booked status, clear it to return to RideOptions
      if (rideStore.currentRide?.status === 'booked') {
        rideStore.clearCurrentRide()
        return true
      }
      // For other cases (RideOptions screen), clear route and show header
      rideStore.clearRoute()
      return true
    }
    BackHandler.exitApp()
    return true
  }

  const handleVisualBackPress = useCallback(() => {
    // Use setTimeout to prevent UI freezing
    setTimeout(() => {
      handleBackPress()
    }, 0)
  }, [handleBackPress])

  const handleGpsPress = () => {
    if (rideStore.availablePlaces.length > 0) {
      const randomIndex = Math.floor(
        Math.random() * rideStore.availablePlaces.length,
      )
      const randomOrigin = rideStore.availablePlaces[randomIndex]
      rideStore.setOrigin(randomOrigin)
    }
  }

  useFocusEffect(() => {
    uiStore.clearIsFeedbackModalVisible()
    BackHandler.addEventListener('hardwareBackPress', () => {
      return handleBackPress()
    })
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress)
    }
  })

  // Interpolation utility
  const interpolateCoordinates = (
    from: number[],
    to: number[],
    t: number,
  ): number[] => [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
  ]

  // Get the interpolated car position
  const getinterpolatedCarCoord = () => {
    if (!approachRoute || !approachRoute.geometry?.coordinates?.length) {
      return [0, 0]
    }
    const coords = approachRoute.geometry.coordinates
    if (coords.length < 2) return coords[0]
    const floor = Math.floor(carPosition)
    const ceil = Math.min(Math.ceil(carPosition), coords.length - 1)
    const t = carPosition % 1
    return interpolateCoordinates(coords[floor], coords[ceil], t)
  }

  // Get remaining approach route from interpolated position
  const interpolatedCarCoord = getinterpolatedCarCoord()
  const remainingApproachCoords =
    approachRoute && approachRoute.geometry?.coordinates?.length > 1
      ? [
          interpolatedCarCoord,
          ...approachRoute.geometry.coordinates.slice(Math.ceil(carPosition)),
        ]
      : []

  // Get covered route coordinates (from start to current car position)
  const coveredRouteCoords =
    approachRoute &&
    approachRoute.geometry?.coordinates?.length > 1 &&
    rideStore.currentRide?.status === 'ongoing'
      ? carReachedDestination
        ? approachRoute.geometry.coordinates // Complete route in grey when reached
        : carPosition % 1 === 0
          ? approachRoute.geometry.coordinates.slice(0, carPosition) // At exact coordinate
          : [
              ...approachRoute.geometry.coordinates.slice(
                0,
                Math.ceil(carPosition),
              ),
              interpolatedCarCoord, // Include current interpolated position
            ]
      : []

  // Get remaining route coordinates (from current car position to end)
  const remainingRouteCoords =
    approachRoute &&
    approachRoute.geometry?.coordinates?.length > 1 &&
    rideStore.currentRide?.status === 'ongoing' &&
    !carReachedDestination
      ? [
          interpolatedCarCoord, // Start from current interpolated position
          ...approachRoute.geometry.coordinates.slice(Math.ceil(carPosition)),
        ]
      : []

  const handleSearch = (text: string) => {
    rideStore.setSearchQuery(text)
    rideStore.updateSearchResults()
  }

  const handleSelect = (value: string) => {
    if (rideStore.currentSearchType === 'origin') {
      rideStore.setOrigin(value)
    } else {
      rideStore.setDestination(value)
    }
    rideStore.clearSearch()
  }

  // Sync actual drawer with desired state after navigation param updates
  useEffect(() => {
    if (uiStore.isDrawerOpen && !isDrawerOpen) {
      // Desired open but currently closed – open it
      navigation.dispatch(DrawerActions.openDrawer())
    } else if (!uiStore.isDrawerOpen && isDrawerOpen) {
      // Desired closed but currently open – close it
      navigation.dispatch(DrawerActions.closeDrawer())
    }
  }, [uiStore.isDrawerOpen, isDrawerOpen])

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.searchCard,
          {
            transform: [
              {
                translateY: headerHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-200, 0],
                }),
              },
            ],
            opacity: headerHeight,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.menuButton} onPress={toggleDrawer}>
            <Ionicons name="menu" size={24} color={colors.palette.neutral200} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.appTitle}>Andojo Ryde</Text>
          </View>
          <View style={styles.menuButtonPlaceholder} />
        </View>

        <View style={styles.searchContent}>
          <View style={styles.iconBar}>
            <View style={styles.originDot} />
            <DottedLine dotCount={4} />
            <Ionicons
              name="location-outline"
              size={24}
              color={colors.palette.neutral200}
              style={styles.destinationIcon}
            />
          </View>
          <View style={styles.searchInputs}>
            <SearchBar
              label="Origin"
              value={rideStore.origin}
              onPress={() => {
                rideStore.setSearchType('origin')
                rideStore.setShowSearch(true)
              }}
            />
            <SearchBar
              label="Destination"
              value={rideStore.destination}
              onPress={() => {
                rideStore.setSearchType('destination')
                rideStore.setShowSearch(true)
              }}
            />
          </View>
        </View>
      </Animated.View>
      <View style={styles.mapWrapper}>
        <MapLibreGL.MapView
          style={styles.map}
          mapStyle={JSON.stringify(minimalStyle)}
        >
          <MapLibreGL.Camera
            ref={cameraRef}
            zoomLevel={zoomLevel}
            minZoomLevel={MIN_ZOOM}
            maxZoomLevel={MAX_ZOOM}
            centerCoordinate={centerCoordinate}
          />
          {tileUrlTemplate ? (
            <MapLibreGL.RasterSource
              id="offlineMap"
              tileUrlTemplates={[tileUrlTemplate]}
              tileSize={256}
            >
              <MapLibreGL.RasterLayer
                id="offlineLayer"
                style={{
                  rasterSaturation: -1,
                  rasterContrast: 0.4,
                  rasterBrightnessMax: 0.5,
                }}
              />
            </MapLibreGL.RasterSource>
          ) : null}
          <MapLibreGL.Images
            images={{
              home: require('../../../assets/images/cabs/home.png'),
              location: require('../../../assets/images/cabs/location.png'),
              car: require('../../../assets/images/cabs/ongoing.png'),
            }}
          />
          {isApproaching && approachRoute && (
            <>
              {/* Only show the remaining approach route as a blue line from the interpolated car position to the end */}
              {remainingApproachCoords.length > 1 && (
                <MapLibreGL.ShapeSource
                  id="approachRoute"
                  shape={{
                    type: 'Feature',
                    geometry: {
                      type: 'LineString',
                      coordinates: remainingApproachCoords,
                    },
                    properties: {},
                  }}
                >
                  <MapLibreGL.LineLayer
                    id="approachRouteLine"
                    style={{
                      lineColor: colors.palette.primary300,
                      lineWidth: 6,
                    }}
                  />
                </MapLibreGL.ShapeSource>
              )}
              {/* Show the moving car icon */}
              <MapLibreGL.ShapeSource
                id="carSource"
                shape={{
                  type: 'FeatureCollection',
                  features: [
                    {
                      type: 'Feature',
                      geometry: {
                        type: 'Point',
                        coordinates: interpolatedCarCoord,
                      },
                      properties: { icon: 'car' },
                    },
                  ],
                }}
              >
                <MapLibreGL.SymbolLayer
                  id="carLayer"
                  style={{
                    iconImage: 'car',
                    iconSize: 0.05,
                    iconAllowOverlap: true,
                    iconIgnorePlacement: true,
                    symbolZOrder: 'viewport-y',
                    iconRotate: carBearing,
                    iconColor: colors.palette.primary400,
                  }}
                />
              </MapLibreGL.ShapeSource>
            </>
          )}
          {!isApproaching &&
            (() => {
              try {
                const routeCoords = rideStore?.currentRouteCoordinates
                return routeCoords && routeCoords.length > 1
              } catch (error) {
                console.error('Error accessing route coordinates:', error)
                return false
              }
            })() &&
            rideStore.currentRide?.status !== 'ongoing' && (
              <>
                <MapLibreGL.ShapeSource
                  id="mainRoute"
                  shape={{
                    type: 'Feature',
                    geometry: {
                      type: 'LineString',
                      coordinates: rideStore?.currentRouteCoordinates,
                    },
                    properties: {},
                  }}
                >
                  <MapLibreGL.LineLayer
                    id="mainRouteLine"
                    style={{
                      lineColor: colors.palette.primary300,
                      lineWidth: 6,
                    }}
                  />
                </MapLibreGL.ShapeSource>
                {interpolatedCarCoord &&
                  (rideStore.currentRide?.status === 'ongoing' ||
                    (rideStore.currentRide?.status === 'driver-assigned' &&
                      !isApproaching) ||
                    carReachedDestination) && (
                    <MapLibreGL.ShapeSource
                      id="carSource"
                      shape={{
                        type: 'FeatureCollection',
                        features: [
                          {
                            type: 'Feature',
                            geometry: {
                              type: 'Point',
                              coordinates: interpolatedCarCoord,
                            },
                            properties: { icon: 'car' },
                          },
                        ],
                      }}
                    >
                      <MapLibreGL.SymbolLayer
                        id="carLayer"
                        style={{
                          iconImage: 'car',
                          iconSize: 0.05,
                          iconAllowOverlap: true,
                          iconIgnorePlacement: true,
                          symbolZOrder: 'viewport-y',
                          iconRotate: carBearing,
                        }}
                      />
                    </MapLibreGL.ShapeSource>
                  )}
              </>
            )}
          {/* Show covered route in grey and remaining route in blue during ongoing status */}
          {rideStore.currentRide?.status === 'ongoing' &&
            approachRoute &&
            approachRoute.geometry?.coordinates?.length > 1 && (
              <>
                {/* Covered route (grey) */}
                {coveredRouteCoords.length > 1 && (
                  <MapLibreGL.ShapeSource
                    id="coveredRoute"
                    shape={{
                      type: 'Feature',
                      geometry: {
                        type: 'LineString',
                        coordinates: coveredRouteCoords,
                      },
                      properties: {},
                    }}
                  >
                    <MapLibreGL.LineLayer
                      id="coveredRouteLine"
                      style={{
                        lineColor: colors.palette.neutral500,
                        lineWidth: 6,
                      }}
                    />
                  </MapLibreGL.ShapeSource>
                )}
                {/* Remaining route (blue) - only show if car hasn't reached destination */}
                {remainingRouteCoords.length > 1 && !carReachedDestination && (
                  <MapLibreGL.ShapeSource
                    id="remainingRoute"
                    shape={{
                      type: 'Feature',
                      geometry: {
                        type: 'LineString',
                        coordinates: remainingRouteCoords,
                      },
                      properties: {},
                    }}
                  >
                    <MapLibreGL.LineLayer
                      id="remainingRouteLine"
                      style={{
                        lineColor: colors.palette.primary300,
                        lineWidth: 6,
                      }}
                    />
                  </MapLibreGL.ShapeSource>
                )}
                {/* car icon for ongoing status */}
                {interpolatedCarCoord && (
                  <MapLibreGL.ShapeSource
                    id="ongoingcarSource"
                    shape={{
                      type: 'FeatureCollection',
                      features: [
                        {
                          type: 'Feature',
                          geometry: {
                            type: 'Point',
                            coordinates: interpolatedCarCoord,
                          },
                          properties: { icon: 'car' },
                        },
                      ],
                    }}
                  >
                    <MapLibreGL.SymbolLayer
                      id="ongoingcarLayer"
                      style={{
                        iconImage: 'car',
                        iconSize: 0.05,
                        iconAllowOverlap: true,
                        iconIgnorePlacement: true,
                        symbolZOrder: 'viewport-y',
                        iconRotate: carBearing,
                        iconColor: colors.palette.primary400,
                      }}
                    />
                  </MapLibreGL.ShapeSource>
                )}
              </>
            )}
          {iconFeatures.length > 0 && (
            <MapLibreGL.ShapeSource
              id="iconSource"
              shape={{
                type: 'FeatureCollection',
                features: iconFeatures,
              }}
            >
              <MapLibreGL.SymbolLayer
                id="iconLayer"
                style={{
                  iconImage: ['get', 'icon'],
                  iconAllowOverlap: true,
                  iconSize: [
                    'case',
                    ['==', ['get', 'icon'], 'home'],
                    0.4,
                    0.07,
                  ],
                  symbolZOrder: 'viewport-y',
                  iconIgnorePlacement: true,
                  iconColor: [
                    'case',
                    ['==', ['get', 'icon'], 'home'],
                    colors.palette.neutral100,
                    colors.palette.primary400,
                  ],
                }}
              />
            </MapLibreGL.ShapeSource>
          )}
        </MapLibreGL.MapView>
        {!rideStore.showHeader &&
          (rideStore.currentRide?.status === 'booked' ||
            (!rideStore.currentRide &&
              rideStore.origin &&
              rideStore.destination)) && (
            <Pressable
              style={styles.backButton}
              onPress={handleVisualBackPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={colors.palette.neutral200}
              />
            </Pressable>
          )}
        <View style={styles.mapControls}>
          <TouchableOpacity onPress={handleGpsPress} style={styles.gpsButton}>
            <GpsIcon width={32} height={32} />
          </TouchableOpacity>
        </View>
      </View>
      {!rideStore.showHeader &&
        rideStore.origin &&
        rideStore.destination &&
        (() => {
          try {
            const routeCoords = rideStore?.currentRouteCoordinates
            return routeCoords && routeCoords.length > 1
          } catch (error) {
            console.error('Error accessing route coordinates:', error)
            return false
          }
        })() &&
        !rideStore.currentRide && (
          <RideOptions
            origin={rideStore.origin}
            destination={rideStore.destination}
            distance={rideStore.distance}
            onBookRide={async (
              optionId: number,
              fare: number,
              paymentMode: string,
            ) => {
              await rideStore.bookRide(
                rideStore.origin,
                rideStore.destination,
                fare,
                rideStore.distance,
                15, // dummy duration
                optionId,
                paymentMode,
              )
            }}
          />
        )}
      {rideStore.currentRide && (
        <>
          {rideStore.currentRide?.status === 'booked' && (
            <DriverAssignment
              rideOptionId={rideStore.currentRide?.rideOptionId}
              onCancel={() => {
                // Clear the current ride to go back to RideOptions
                rideStore.clearCurrentRide()
              }}
              onRefresh={() => rideStore.assignDriver()}
            />
          )}
          {rideStore.currentRide?.status === 'driver-assigned' && (
            <DriverAssignment
              rideId={rideStore.currentRide?.id}
              onCancel={async () => {
                if (rideStore.currentRide?.databaseId) {
                  const rideIdToNavigate = rideStore.currentRide.databaseId

                  await rideStore.cancelRide(
                    rideStore.currentRide.id,
                    'User cancelled',
                  )
                  router.push({
                    pathname: '/screens/rides/RideDetails',
                    params: {
                      rideId: rideIdToNavigate,
                    },
                  })
                  rideStore.clearCurrentRide()
                  rideStore.clearRoute()
                }
              }}
              onRefresh={() => rideStore.startRide()}
            />
          )}
          {rideStore.currentRide?.status === 'ongoing' && (
            <DriverAssignment
              rideId={rideStore.currentRide?.id}
              onCancel={() => {}}
              onRefresh={async () => {
                if (rideStore.currentRide?.databaseId) {
                  const rideIdToNavigate = rideStore.currentRide.databaseId
                  rideStore.completeRide()
                  router.push({
                    pathname: '/screens/rides/RideDetails',
                    params: {
                      rideId: rideIdToNavigate,
                    },
                  })
                  rideStore.clearCurrentRide()
                  rideStore.clearRoute()
                } else {
                  await rideStore.completeRide()
                }
              }}
              carReachedDestination={carReachedDestination}
            />
          )}
        </>
      )}
      {rideStore.isSearchVisible && (
        <View style={styles.searchOverlay}>
          <View style={styles.searchHeader}>
            <TouchableOpacity
              style={styles.searchBarBackButton}
              onPress={() => {
                rideStore.clearSearch()
              }}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={colors.palette.neutral100}
              />
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a place..."
              placeholderTextColor={colors.palette.neutral500}
              value={rideStore.currentSearchQuery}
              onChangeText={handleSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={rideStore.currentSearchResults}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchItem}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.searchItemText}>{item}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No places found.</Text>
            }
          />
        </View>
      )}
    </View>
  )
})

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.palette.neutral800,
      overflow: 'hidden',
    },
    searchCard: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.palette.neutral800,
      borderBottomEndRadius: 20,
      borderBottomStartRadius: 20,
      padding: 16,
      zIndex: 10,
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.palette.overlay20,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingTop: 40,
    },
    menuButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.palette.neutral700,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.palette.overlay20,
    },
    menuButtonPlaceholder: {
      width: 40,
    },
    titleContainer: {
      flex: 1,
      alignItems: 'center',
    },
    appTitle: {
      fontSize: 28,
      color: colors.palette.neutral200,
      letterSpacing: 0.5,
    },
    searchContent: {
      flexDirection: 'row',
      gap: 12,
    },
    searchInputs: {
      flex: 1,
    },
    searchBar: {
      backgroundColor: colors.palette.neutral700,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      marginBottom: 8,
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.palette.neutral300,
    },
    searchBarValue: {
      color: colors.palette.neutral200,
      fontSize: 16,
    },
    placeholder: {
      color: colors.tint,
    },
    iconBar: {
      width: 24,
      alignItems: 'center',
      paddingTop: 12,
      paddingBottom: 12,
    },
    originDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.palette.neutral100,
      marginBottom: 2,
      borderWidth: 2,
      borderColor: colors.tint,
      shadowColor: colors.tint,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 1,
    },
    destinationIcon: {
      marginTop: 2,
      shadowColor: colors.tint,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    mapWrapper: { flex: 1 },
    map: { flex: 1 },
    mapControls: {
      position: 'absolute',
      bottom: 20,
      right: 10,
      alignItems: 'center',
      gap: 10,
    },
    gpsButton: {
      marginBottom: 10,
      backgroundColor: colors.palette.neutral700,
      borderRadius: 20,
      padding: 8,
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.palette.overlay20,
    },
    searchOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.palette.neutral800,
      zIndex: 1000,
      overflow: 'hidden',
    },
    searchHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.palette.neutral900,
      borderRadius: 12,
      margin: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginTop: 40,
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    backButton: {
      position: 'absolute',
      top: 40,
      left: 16,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.palette.neutral700,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.palette.overlay20,
      zIndex: 1000,
      minWidth: 44,
      minHeight: 44,
    },
    searchInput: {
      flex: 1,
      color: colors.palette.neutral100,
      fontSize: 16,
      paddingVertical: 8,
    },
    searchItem: {
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 4,
      borderWidth: 1,
      borderBottomColor: colors.palette.neutral700,
      borderRadius: 12,
      backgroundColor: colors.palette.neutral900,
    },
    searchItemText: {
      color: colors.palette.neutral100,
      fontSize: 16,
    },
    emptyText: {
      color: colors.palette.neutral500,
      textAlign: 'center',
      marginTop: 40,
    },
    dottedLineContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dottedLineDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.palette.primary400,
      marginVertical: 2,
    },
    searchBarBackButton: {
      marginRight: 8,
    },
  })

export default HomeScreen
