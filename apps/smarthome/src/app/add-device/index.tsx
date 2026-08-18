// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useState, useRef, useMemo } from 'react'
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { debounce } from 'lodash'

import { AppHeader, EmptyState } from '@/components'
import { queries } from '@/db/queries'
import { useStores } from '@/models/helpers/useStores'
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'
interface DeviceType {
  id: number
  name: string
  category: string
  subcategory: string
  capabilities: string
  icon: string
  brand: string
  model: string
  is_active: boolean
}

export default observer(function AddDeviceScreen() {
  const { theme } = useAppTheme()
  const { smartHomeStore } = useStores()
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('add-device', '/add-device')
  const params = useLocalSearchParams()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const sessionRestoredRef = useRef(false)
  const lastSessionTimeStampRef = useRef<string | null>(null)
  const styles = useMemo(() => createStyles(theme), [theme])

  const toggleSearch = () => {
    trackClick('search_toggle')
    trackContentChange({
      action: isSearchVisible ? 'close_search' : 'open_search',
      section: 'add_device_header',
      searchQuery: isSearchVisible ? '' : searchQuery,
      isSearchVisible: !isSearchVisible,
      selectedCategory,
      deviceTypesCount: deviceTypes.length,
      filteredDeviceTypesCount: getFilteredDeviceTypes().length,
      hasSearchQuery: !!searchQuery,
      isFiltered: selectedCategory !== 'all' || !!searchQuery,
    })
    if (isSearchVisible) {
      // Clear search when closing
      setSearchQuery('')
    }
    setIsSearchVisible(!isSearchVisible)
  }

  useEffect(() => {
    const loadDeviceTypes = async () => {
      try {
        setLoading(true)
        const types = await queries.getAllDeviceTypes()
        setDeviceTypes(types)
      } catch (error) {
        console.error('Error loading device types:', error)
      } finally {
        setLoading(false)
      }
    }
    loadDeviceTypes()
  }, [])

  useEffect(() => {
    trackScreenMount()
  }, [])

  // Track state changes for comprehensive session data (like devices screen)
  useEffect(() => {
    if (searchQuery || selectedCategory !== 'all' || isSearchVisible) {
      trackContentChange({
        action: 'add_device_state_update',
        searchQuery,
        isSearchVisible,
        selectedCategory,
        deviceTypesCount: deviceTypes.length,
        filteredDeviceTypesCount: getFilteredDeviceTypes().length,
        hasSearchQuery: !!searchQuery,
        isFiltered: selectedCategory !== 'all' || !!searchQuery,
        timestamp: Date.now(),
      })
    }
  }, [searchQuery, selectedCategory, isSearchVisible, deviceTypes.length])

  // Handle session restoration (following devices screen pattern)
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
          // Restore search and category state from session
          if (formData.searchQuery !== undefined) {
            setSearchQuery(formData.searchQuery)
          }

          // Only restore search visibility if it's not already open
          if (formData.isSearchVisible !== undefined && !isSearchVisible) {
            setIsSearchVisible(formData.isSearchVisible)
          } else if (formData.isSearchVisible !== undefined) {
            console.log(
              '🔧 Skipping search visibility restoration - search is already open',
            )
          }

          if (formData.selectedCategory !== undefined) {
            setSelectedCategory(formData.selectedCategory)
          }

          // Mark session as restored to prevent multiple restoration
          sessionRestoredRef.current = true

          // Track the restored state
          trackContentChange({
            action: 'session_restored',
            searchQuery: formData.searchQuery,
            isSearchVisible: formData.isSearchVisible,
            selectedCategory: formData.selectedCategory,
            deviceTypesCount: deviceTypes.length,
            filteredDeviceTypesCount: getFilteredDeviceTypes().length,
            hasSearchQuery: !!formData.searchQuery,
            isFiltered:
              formData.selectedCategory !== 'all' || !!formData.searchQuery,
          })
        }
      } else {
        console.log('🔧 Add Device session data not found')
        sessionRestoredRef.current = true // Mark as restored even if no data found
      }
    } else if (currentSessionTimeStamp && sessionRestoredRef.current) {
      console.log('🔧 Session already restored, skipping restoration')
    } else {
      console.log('🔧 No sessionTimeStamp parameter found')
    }
  }, [params?.sessionTimeStamp, trackContentChange])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'add-device',
        route: '/add-device',
        searchQuery,
        isSearchVisible,
        selectedCategory,
        deviceTypesCount: deviceTypes.length,
        filteredDeviceTypesCount: getFilteredDeviceTypes().length,
        // Additional context for comprehensive tracking
        hasSearchQuery: !!searchQuery,
        isFiltered: selectedCategory !== 'all' || !!searchQuery,
        sessionTimeStamp: params?.sessionTimeStamp,
      })
      return () => {
        getLatestInteraction()
      }
    }, [
      trackScreenMount,
      searchQuery,
      isSearchVisible,
      selectedCategory,
      deviceTypes.length,
      params?.sessionTimeStamp,
    ]),
  )

  // Get filtered device types based on selected category and search query
  const getFilteredDeviceTypes = () => {
    let types = deviceTypes

    // Filter by category if not 'all'
    if (selectedCategory !== 'all') {
      types = types.filter(type => type.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      types = types.filter(
        type =>
          type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          type.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          type.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
          type.subcategory.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    return types
  }

  // Get unique categories from device types
  const categories = [
    { id: 'all', name: 'All', count: deviceTypes.length },
    ...Array.from(new Set(deviceTypes.map(type => type.category))).map(
      category => ({
        id: category,
        name: category.charAt(0).toUpperCase() + category.slice(1),
        count: deviceTypes.filter(type => type.category === category).length,
      }),
    ),
  ]

  const getDeviceIcon = (iconName: string, category: string) => {
    // Use the icon from device type if available, otherwise fallback to category
    if (iconName) {
      const iconMap: Record<string, string> = {
        bulb: 'bulb-outline',
        switch: 'toggle-outline',
        plug: 'flash-outline',
        camera: 'camera-outline',
        ac: 'snow-outline',
        fan: 'leaf-outline',
        speaker: 'volume-high-outline',
        strip: 'flash-outline',
        ceiling: 'home-outline',
        lamp: 'bulb-outline',
        night_light: 'moon-outline',
        flood_light: 'sunny-outline',
        chandelier: 'diamond-outline',
        pendant: 'radio-outline',
        sconce: 'flash-outline',
        outdoor_light: 'sunny-outline',
        ceiling_fan: 'leaf-outline',
        tower_fan: 'leaf-outline',
        table_fan: 'leaf-outline',
        soundbar: 'musical-notes-outline',
        microphone: 'mic-outline',
        subwoofer: 'volume-high-outline',
        indoor_camera: 'camera-outline',
        outdoor_camera: 'camera-outline',
        doorbell: 'call-outline',
        ptz_camera: 'camera-outline',
        wireless_camera: 'camera-outline',
        battery_camera: 'camera-outline',
      }
      return iconMap[iconName] || 'hardware-chip-outline'
    }

    // Fallback to category-based icons
    switch (category) {
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'lighting':
        return theme.colors.palette.secondary500
      case 'temperature':
        return theme.colors.palette.primary500
      case 'security':
        return theme.colors.palette.angry500
      case 'audio':
        return theme.colors.palette.success500
      default:
        return theme.colors.palette.neutral500
    }
  }

  const parseCapabilities = (capabilities: string) => {
    try {
      return JSON.parse(capabilities)
    } catch {
      return []
    }
  }

  const renderDeviceType = ({ item }: { item: DeviceType }) => {
    const capabilities = parseCapabilities(item.capabilities)
    const categoryColor = getCategoryColor(item.category)

    return (
      <TouchableOpacity
        style={[
          styles.deviceTypeCard,
          { backgroundColor: theme.colors.palette.neutral200 },
        ]}
        onPress={debounce(() => {
          trackClick(`device_type_${item.id}`)
          trackContentChange({
            action: 'select_device_type',
            deviceTypeId: item.id,
            deviceTypeName: item.name,
            category: item.category,
            subcategory: item.subcategory,
            brand: item.brand,
            model: item.model,
          })
          // Navigate to device discovery screen with device type info
          router.push({
            pathname: '/add-device/discovery',
            params: {
              deviceTypeId: item.id.toString(),
              deviceTypeName: item.name,
              category: item.category,
              subcategory: item.subcategory,
            },
          })
        }, 300)}
        activeOpacity={0.7}
      >
        <View style={styles.deviceTypeHeader}>
          <View style={styles.deviceTypeInfo}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: categoryColor + '20' },
              ]}
            >
              <Ionicons
                name={getDeviceIcon(item.icon, item.category) as any}
                size={24}
                color={categoryColor}
              />
            </View>
            <View style={styles.deviceTypeText}>
              <Text
                style={[styles.deviceTypeName, { color: theme.colors.text }]}
              >
                {item.name}
              </Text>
              <Text
                style={[
                  styles.deviceTypeSubcategory,
                  { color: theme.colors.textDim },
                ]}
              >
                {item.subcategory
                  ?.replace(/_/g, ' ')
                  .replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
              <Text
                style={[
                  styles.deviceTypeBrand,
                  { color: theme.colors.textDim },
                ]}
              >
                {item.brand} • {item.model}
              </Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward-outline"
            size={20}
            color={theme.colors.textDim}
          />
        </View>

        {/* Capabilities */}
        {capabilities.length > 0 && (
          <View style={styles.capabilitiesContainer}>
            <Text
              style={[
                styles.capabilitiesTitle,
                { color: theme.colors.textDim },
              ]}
            >
              Capabilities:
            </Text>
            <View style={styles.capabilitiesList}>
              {capabilities
                .slice(0, 3)
                .map((capability: string, index: number) => (
                  <View
                    key={index}
                    style={[
                      styles.capabilityTag,
                      { backgroundColor: categoryColor + '20' },
                    ]}
                  >
                    <Text
                      style={[styles.capabilityText, { color: categoryColor }]}
                    >
                      {capability
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </View>
                ))}
              {capabilities.length > 3 && (
                <View
                  style={[
                    styles.capabilityTag,
                    { backgroundColor: theme.colors.palette.neutral300 },
                  ]}
                >
                  <Text
                    style={[
                      styles.capabilityText,
                      { color: theme.colors.textDim },
                    ]}
                  >
                    +{capabilities.length - 3} more
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  const renderCategoryTab = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.categoryTab,
        selectedCategory === item.id && styles.activeCategoryTab,
        {
          backgroundColor:
            selectedCategory === item.id
              ? theme.colors.palette.primary500
              : 'transparent',
        },
      ]}
      onPress={() => {
        trackClick(`category_${item.id}`)
        trackContentChange({
          action: 'filter_device_types_by_category',
          category: item.id,
          categoryName: item.name,
          previousCategory: selectedCategory,
          searchQuery,
          isSearchVisible,
          deviceTypesCount: deviceTypes.length,
          filteredDeviceTypesCount: getFilteredDeviceTypes().length,
          hasSearchQuery: !!searchQuery,
          isFiltered: item.id !== 'all' || !!searchQuery,
        })
        setSelectedCategory(item.id)
      }}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.categoryTabText,
          {
            color:
              selectedCategory === item.id
                ? theme.colors.text
                : theme.colors.textDim,
          },
        ]}
      >
        {item.name}
      </Text>
      <View
        style={[
          styles.categoryTabBadge,
          {
            backgroundColor:
              selectedCategory === item.id
                ? theme.colors.text
                : theme.colors.palette.neutral300,
          },
        ]}
      >
        <Text
          style={[
            styles.categoryTabBadgeText,
            {
              color:
                selectedCategory === item.id
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
      icon="hardware-chip-outline"
      title="No Device Types Found"
      description="No device types are available at the moment."
    />
  )

  if (loading) {
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
            title="Add Device"
            showSearch={false}
            showBackButton={true}
          />
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: theme.colors.textDim }]}>
              Loading device types...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

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
          title="Add Device"
          showSearch={false}
          showBackButton={true}
          rightComponent={
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.searchButton}
                onPress={toggleSearch}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isSearchVisible ? 'close-outline' : 'search-outline'}
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.discoverButton}
                onPress={debounce(() => {
                  trackClick('discover_devices_button')
                  trackContentChange({
                    action: 'navigate_to_discovery',
                    section: 'add_device_header',
                  })
                  router.push({
                    pathname: '/add-device/discovery',
                    params: {
                      // No specific device type - will show random devices
                    },
                  })
                }, 300)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="scan-outline"
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
                placeholder="Search device types..."
                placeholderTextColor={theme.colors.textDim}
                value={searchQuery}
                onChangeText={text => {
                  trackContentChange({
                    action: 'search_device_types',
                    searchQuery: text,
                    searchLength: text.length,
                    section: 'add_device_search',
                    isSearchVisible: true,
                    selectedCategory,
                    deviceTypesCount: deviceTypes.length,
                    filteredDeviceTypesCount: getFilteredDeviceTypes().length,
                    hasSearchQuery: !!text,
                    isFiltered: selectedCategory !== 'all' || !!text,
                    timestamp: Date.now(),
                  })
                  setSearchQuery(text)
                }}
                returnKeyType="search"
                autoFocus={true}
              />
            </View>
          </View>
        )}

        {/* Category Tabs */}
        <View style={styles.categoriesContainer}>
          <FlatList
            data={categories}
            keyExtractor={item => item.id}
            renderItem={renderCategoryTab}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          />
        </View>

        {/* Device Types List */}
        <FlatList
          data={getFilteredDeviceTypes()}
          keyExtractor={item => item.id.toString()}
          renderItem={renderDeviceType}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.deviceTypesContainer}
          ListEmptyComponent={() => renderEmpty()}
        />
      </SafeAreaView>
    </View>
  )
})

const createStyles = (theme: Theme) =>
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      fontWeight: '500',
    },
    categoriesContainer: {
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    categoriesContent: {
      paddingRight: 20,
      gap: 12,
    },
    categoryTab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      gap: 8,
    },
    activeCategoryTab: {
      borderColor: 'transparent',
    },
    categoryTabText: {
      fontSize: 14,
      fontWeight: '500',
    },
    categoryTabBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 20,
      alignItems: 'center',
    },
    categoryTabBadgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    deviceTypesContainer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    deviceTypeCard: {
      marginBottom: 12,
      padding: 16,
      borderRadius: 12,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    deviceTypeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    deviceTypeInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    deviceTypeText: {
      flex: 1,
    },
    deviceTypeName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    deviceTypeSubcategory: {
      fontSize: 12,
      marginBottom: 2,
    },
    deviceTypeBrand: {
      fontSize: 11,
    },
    capabilitiesContainer: {
      marginTop: 8,
    },
    capabilitiesTitle: {
      fontSize: 12,
      fontWeight: '500',
      marginBottom: 8,
    },
    capabilitiesList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    capabilityTag: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    capabilityText: {
      fontSize: 10,
      fontWeight: '500',
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
    searchButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral200,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    discoverButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral200,
    },
  })
