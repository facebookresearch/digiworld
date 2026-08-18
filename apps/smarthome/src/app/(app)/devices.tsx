import {
  FlatList,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppTheme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState, useRef, useMemo } from 'react'
import LinearGradient from 'react-native-linear-gradient'

import { EmptyState, AppHeader } from '@/components'
import { useStores } from '@/models/helpers/useStores'
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router'
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'

export default observer(function DevicesScreen() {
  const { theme } = useAppTheme()
  const { smartHomeStore } = useStores()
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('devices', '/devices')
  const params = useLocalSearchParams()
  const [selectedTab, setSelectedTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const sessionRestoredRef = useRef(false)
  const lastSessionTimeStampRef = useRef<string | null>(null)

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        backgroundGradient: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        },
        safeArea: {
          flex: 1,
        },
        searchContainer: {
          paddingHorizontal: 20,
          paddingVertical: 12,
        },
        searchBar: {
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          shadowColor: theme.colors.palette.neutral900,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        },
        searchIcon: {
          marginRight: 12,
        },
        searchInput: {
          flex: 1,
          fontSize: 16,
          fontWeight: '400',
        },
        tabsContainer: {
          paddingVertical: 16,
          paddingHorizontal: 20,
        },
        tabsContent: {
          paddingRight: 20,
          gap: 12,
        },
        tab: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: theme.colors.palette.neutral300,
          gap: 8,
        },
        activeTab: {
          borderColor: 'transparent',
        },
        tabText: {
          fontSize: 14,
          fontWeight: '500',
        },
        tabBadge: {
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 10,
          minWidth: 20,
          alignItems: 'center',
        },
        tabBadgeText: {
          fontSize: 12,
          fontWeight: '600',
        },
        devicesContainer: {
          paddingHorizontal: 20,
          paddingBottom: 20,
        },
        deviceCard: {
          marginBottom: 12,
          padding: 16,
          borderRadius: 12,
          shadowColor: theme.colors.palette.neutral900,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        deviceHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        },
        headerRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        deviceInfo: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        },
        deviceText: {
          marginLeft: 12,
          flex: 1,
        },
        deviceName: {
          fontSize: 16,
          fontWeight: '600',
          marginBottom: 2,
        },
        deviceType: {
          fontSize: 12,
          textTransform: 'capitalize',
        },
        roomName: {
          fontSize: 10,
          textTransform: 'capitalize',
          marginTop: 2,
        },
        statusIndicator: {
          width: 8,
          height: 8,
          borderRadius: 4,
        },
        deviceDetails: {
          gap: 8,
        },
        statusRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        statusLabel: {
          fontSize: 12,
        },
        statusValue: {
          fontSize: 12,
          fontWeight: '500',
        },
        searchButton: {
          padding: 8,
          borderRadius: 20,
          backgroundColor: theme.colors.palette.neutral200,
        },
        addButton: {
          padding: 8,
          borderRadius: 20,
          backgroundColor: theme.colors.palette.neutral200,
        },
        toggleSwitch: {
          width: 44,
          height: 24,
          borderRadius: 12,
          justifyContent: 'center',
          paddingHorizontal: 2,
        },
        toggleThumb: {
          width: 20,
          height: 20,
          borderRadius: 10,
          shadowColor: theme.colors.palette.neutral900,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
          elevation: 2,
        },
      }),
    [theme],
  )

  const toggleSearch = () => {
    trackClick('search_toggle')
    trackContentChange({
      action: isSearchVisible ? 'close_search' : 'open_search',
      section: 'devices_header',
      searchQuery: isSearchVisible ? '' : searchQuery,
      isSearchVisible: !isSearchVisible,
      selectedTab,
      devicesCount: smartHomeStore.devices.length,
      roomsCount: smartHomeStore.rooms.length,
      filteredDevicesCount: getFilteredDevices().length,
    })
    if (isSearchVisible) {
      // Clear search when closing
      setSearchQuery('')
    }
    setIsSearchVisible(!isSearchVisible)
  }

  useEffect(() => {
    const loadData = async () => {
      await smartHomeStore.loadInitialData()
    }
    loadData()
  }, [smartHomeStore])

  useEffect(() => {
    trackScreenMount()
  }, [])

  // Handle roomId parameter from navigation
  useEffect(() => {
    if (params.roomId) {
      setSelectedTab(params.roomId as string)
    }
  }, [params.roomId])

  useEffect(() => {
    if (searchQuery || selectedTab !== 'all' || isSearchVisible) {
      trackContentChange({
        action: 'devices_state_update',
        searchQuery,
        isSearchVisible,
        selectedTab,
        devicesCount: smartHomeStore.devices.length,
        roomsCount: smartHomeStore.rooms.length,
        filteredDevicesCount: getFilteredDevices().length,
        timestamp: Date.now(),
      })
    }
  }, [
    searchQuery,
    selectedTab,
    isSearchVisible,
    smartHomeStore.devices.length,
    smartHomeStore.rooms.length,
  ])

  // Handle session restoration (following Ryde app pattern)
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
      const sessionData = smartHomeStore
        .getRootStore?.()
        ?.sessionStore?.getSession(currentSessionTimeStamp)

      if (sessionData?.data) {
        const formData = sessionData.data.sessionData?.formData

        if (formData) {
          // Restore search and tab state from session (comprehensive restoration like Ryde app)
          if (formData.searchQuery !== undefined) {
            setSearchQuery(formData.searchQuery)
          }

          // Only restore search visibility if it's not already open (prevent overriding user actions)
          if (formData.isSearchVisible !== undefined && !isSearchVisible) {
            setIsSearchVisible(formData.isSearchVisible)
          } else if (formData.isSearchVisible !== undefined) {
            console.log(
              '🏠 Skipping search visibility restoration - search is already open',
            )
          }

          if (formData.selectedTab !== undefined) {
            setSelectedTab(formData.selectedTab)
          }

          // Mark session as restored to prevent multiple restoration
          sessionRestoredRef.current = true

          // Track the restored state
          trackContentChange({
            action: 'session_restored',
            searchQuery: formData.searchQuery,
            isSearchVisible: formData.isSearchVisible,
            selectedTab: formData.selectedTab,
            devicesCount: smartHomeStore.devices.length,
            roomsCount: smartHomeStore.rooms.length,
            filteredDevicesCount: getFilteredDevices().length,
          })
        }
      } else {
        console.log('🏠 Devices session data not found')
        sessionRestoredRef.current = true // Mark as restored even if no data found
      }
    } else if (currentSessionTimeStamp && sessionRestoredRef.current) {
      console.log('🏠 Session already restored, skipping restoration')
    } else {
      console.log('🏠 No sessionTimeStamp parameter found')
    }
  }, [params?.sessionTimeStamp, smartHomeStore, trackContentChange])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'devices',
        route: '/devices',
        searchQuery,
        isSearchVisible,
        selectedTab,
        devicesCount: smartHomeStore.devices.length,
        roomsCount: smartHomeStore.rooms.length,
        filteredDevicesCount: getFilteredDevices().length,
        // Additional context for comprehensive tracking
        hasSearchQuery: !!searchQuery,
        isFiltered: selectedTab !== 'all' || !!searchQuery,
        sessionTimeStamp: params?.sessionTimeStamp,
      })
      return () => {
        getLatestInteraction()
      }
    }, [
      trackScreenMount,
      searchQuery,
      isSearchVisible,
      selectedTab,
      smartHomeStore.devices.length,
      smartHomeStore.rooms.length,
      params?.sessionTimeStamp,
    ]),
  )

  // Get filtered devices based on selected tab and search query
  const getFilteredDevices = () => {
    let devices = [...smartHomeStore.devices]

    // Filter by room if not 'all'
    if (selectedTab !== 'all') {
      devices = devices.filter(
        device => device.room?.id === parseInt(selectedTab),
      )
    }

    // Filter by search query
    if (searchQuery.trim()) {
      devices = devices.filter(
        device =>
          device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          device.deviceType?.name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          device.room?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    return devices
  }

  // Parse device properties from JSON string
  const parseDeviceProperties = (device: any) => {
    try {
      const properties = device.properties ? JSON.parse(device.properties) : {}
      return {
        ...device,
        ...properties, // Spread properties to make them accessible directly
      }
    } catch (error) {
      console.warn('Failed to parse device properties:', error)
      return device
    }
  }

  // Create tabs data
  const tabs = [
    { id: 'all', name: 'All', count: smartHomeStore.devices.length },
    ...smartHomeStore.rooms.map(room => ({
      id: room.id.toString(),
      name: room.name,
      count: smartHomeStore.getDevicesByRoom(room.id).length,
    })),
  ]

  const getDeviceIcon = (deviceType: any) => {
    if (!deviceType) return 'hardware-chip-outline'

    // Fallback to category-based icons
    switch (deviceType.category) {
      case 'lighting':
        return 'bulb-outline'
      case 'temperature':
        return 'thermometer-outline'
      case 'security':
        return 'shield-outline'
      case 'audio':
        return 'volume-high-outline'
      default:
        return 'hardware-chip-outline'
    }
  }

  const renderDevice = ({ item }: { item: any }) => {
    const device = parseDeviceProperties(item)
    console.log('device proper', device.status, device.is_on, device.id)
    return (
      <TouchableOpacity
        style={[
          styles.deviceCard,
          { backgroundColor: theme.colors.palette.neutral200 },
        ]}
        onPress={debounce(() => {
          trackClick(`device_${device.id}`)
          trackContentChange({
            action: 'navigate_to_device_control',
            deviceId: device.id,
            deviceType: device.deviceType?.category,
            deviceName: device.name,
            roomName: device.room?.name,
          })
          router.push(
            `/device/${device.deviceType?.category}/${device.id}` as any,
          )
        }, 300)}
      >
        <View style={styles.deviceHeader}>
          <View style={styles.deviceInfo}>
            <Ionicons
              name={
                getDeviceIcon(
                  device.deviceType,
                ) as keyof typeof Ionicons.glyphMap
              }
              size={24}
              color={theme.colors.palette.primary500}
            />
            <View style={styles.deviceText}>
              <Text style={[styles.deviceName, { color: theme.colors.text }]}>
                {device.name}
              </Text>
              <Text
                style={[styles.deviceType, { color: theme.colors.textDim }]}
              >
                {device.deviceType?.name || 'Unknown Device'}
              </Text>
              {device.room && (
                <Text
                  style={[styles.roomName, { color: theme.colors.textDim }]}
                >
                  {device.room.name}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.headerRight}>
            <View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor:
                    device.status === 'online'
                      ? theme.colors.palette.success500
                      : theme.colors.palette.neutral500,
                },
              ]}
            />
            {/* Toggle Switch */}
            <TouchableOpacity
              style={[
                styles.toggleSwitch,
                {
                  backgroundColor: device.is_on
                    ? theme.colors.palette.success500
                    : theme.colors.palette.neutral400,
                },
              ]}
              onPress={() => {
                trackClick(`device_toggle_${device.id}`)
                trackContentChange({
                  action: 'toggle_device_power',
                  deviceId: device.id,
                  deviceName: device.name,
                  currentState: device.is_on,
                  newState: !device.is_on,
                })
                smartHomeStore.toggleDevice(device.id.toString())
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.toggleThumb,
                  {
                    backgroundColor: theme.colors.palette.neutral100,
                    transform: [{ translateX: device.is_on ? 20 : 2 }],
                  },
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.deviceDetails}>
          {device.is_on !== undefined && (
            <View style={styles.statusRow}>
              <Text
                style={[styles.statusLabel, { color: theme.colors.textDim }]}
              >
                Status:
              </Text>
              <Text style={[styles.statusValue, { color: theme.colors.text }]}>
                {device.is_on ? 'On' : 'Off'}
              </Text>
            </View>
          )}

          {device.brightness !== undefined && (
            <View style={styles.statusRow}>
              <Text
                style={[styles.statusLabel, { color: theme.colors.textDim }]}
              >
                Brightness:
              </Text>
              <Text style={[styles.statusValue, { color: theme.colors.text }]}>
                {device.brightness}%
              </Text>
            </View>
          )}

          {device.temperature !== undefined && (
            <View style={styles.statusRow}>
              <Text
                style={[styles.statusLabel, { color: theme.colors.textDim }]}
              >
                Temperature:
              </Text>
              <Text style={[styles.statusValue, { color: theme.colors.text }]}>
                {device.temperature}°F
              </Text>
            </View>
          )}

          {device.target_temperature !== undefined && (
            <View style={styles.statusRow}>
              <Text
                style={[styles.statusLabel, { color: theme.colors.textDim }]}
              >
                Target Temp:
              </Text>
              <Text style={[styles.statusValue, { color: theme.colors.text }]}>
                {device.target_temperature}°F
              </Text>
            </View>
          )}

          {device.volume !== undefined && (
            <View style={styles.statusRow}>
              <Text
                style={[styles.statusLabel, { color: theme.colors.textDim }]}
              >
                Volume:
              </Text>
              <Text style={[styles.statusValue, { color: theme.colors.text }]}>
                {device.volume}%
              </Text>
            </View>
          )}

          {device.battery !== undefined && (
            <View style={styles.statusRow}>
              <Text
                style={[styles.statusLabel, { color: theme.colors.textDim }]}
              >
                Battery:
              </Text>
              <Text style={[styles.statusValue, { color: theme.colors.text }]}>
                {device.battery}%
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const renderTab = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.tab,
        selectedTab === item.id && styles.activeTab,
        {
          backgroundColor:
            selectedTab === item.id
              ? theme.colors.palette.primary500
              : theme.colors.palette.neutral200,
        },
      ]}
      onPress={debounce(() => {
        trackClick(`tab_${item.id}`)
        trackContentChange({
          action: 'filter_devices_by_room',
          roomId: item.id,
          roomName: item.name,
          deviceCount: item.count,
          previousTab: selectedTab,
          searchQuery,
          isSearchVisible,
          devicesCount: smartHomeStore.devices.length,
          roomsCount: smartHomeStore.rooms.length,
          filteredDevicesCount: getFilteredDevices().length,
        })
        setSelectedTab(item.id)
      }, 300)}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.tabText,
          {
            color:
              selectedTab === item.id
                ? theme.colors.text
                : theme.colors.textDim,
          },
        ]}
      >
        {item.name}
      </Text>
      <View
        style={[
          styles.tabBadge,
          {
            backgroundColor:
              selectedTab === item.id
                ? theme.colors.text
                : theme.colors.palette.neutral300,
          },
        ]}
      >
        <Text
          style={[
            styles.tabBadgeText,
            {
              color:
                selectedTab === item.id
                  ? theme.colors.palette.primary500
                  : theme.colors.text,
            },
          ]}
        >
          {item.count}
        </Text>
      </View>
    </TouchableOpacity>
  )

  const renderEmpty = () => (
    <EmptyState
      icon="bulb-outline"
      title="No Devices Found"
      description="Add some smart devices to control your home!"
    />
  )

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.secondary100,
          theme.colors.palette.primary100,
          theme.colors.palette.neutral100,
        ]}
        locations={[0, 0.4, 1]}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <AppHeader
          title="Devices"
          showSearch={false}
          rightComponent={
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => {
                  trackClick('search_button')
                  trackContentChange({
                    action: 'toggle_search',
                    section: 'devices_header',
                  })
                  toggleSearch()
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isSearchVisible ? 'close-outline' : 'search-outline'}
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={debounce(() => {
                  trackClick('add_device_button')
                  trackContentChange({
                    action: 'navigate_to_add_device',
                    section: 'devices_header',
                  })
                  router.push('/add-device')
                }, 300)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="add-outline"
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            </View>
          }
        />

        {/* Search Input */}
        {isSearchVisible && (
          <View style={styles.searchContainer}>
            <View
              style={[
                styles.searchBar,
                { backgroundColor: theme.colors.palette.neutral200 },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={20}
                color={theme.colors.textDim}
                style={styles.searchIcon}
              />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Search devices..."
                placeholderTextColor={theme.colors.textDim}
                value={searchQuery}
                onChangeText={text => {
                  setSearchQuery(text)
                  trackContentChange({
                    action: 'search_devices',
                    searchQuery: text,
                    searchLength: text.length,
                    section: 'devices_search',
                    isSearchVisible: true,
                    selectedTab,
                    devicesCount: smartHomeStore.devices.length,
                    roomsCount: smartHomeStore.rooms.length,
                    filteredDevicesCount: getFilteredDevices().length,
                    timestamp: Date.now(),
                  })
                }}
                returnKeyType="search"
                autoFocus={true}
              />
            </View>
          </View>
        )}

        {/* Scrollable Tabs */}
        <View
          style={[
            styles.tabsContainer,
            { backgroundColor: theme.colors.transparent },
          ]}
        >
          <FlatList
            data={tabs}
            keyExtractor={item => item.id}
            renderItem={renderTab}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.tabsContent,
              { backgroundColor: theme.colors.transparent },
            ]}
          />
        </View>

        {/* Devices List */}
        <FlatList
          data={getFilteredDevices()}
          keyExtractor={device => device.id.toString()}
          renderItem={renderDevice}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.devicesContainer}
          ListEmptyComponent={() => renderEmpty()}
          extraData={smartHomeStore.devices.map(d => ({
            id: d.id,
            is_on: d.is_on,
            name: d.name,
            status: d.status,
            battery: d.battery,
            signal_strength: d.signal_strength,
          }))}
        />
      </SafeAreaView>
    </View>
  )
})
