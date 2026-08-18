// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useMemo } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { Text, useAppTheme, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models/helpers/useStores'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import LinearGradient from 'react-native-linear-gradient'
import { debounce } from 'lodash'

const HistoryScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { parkingStore } = useStores()
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('History', '/history')

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'History',
        route: '/history',
      })
      // Load notifications when home screen is focused
      return () => {
        // Home screen unfocused
      }
    }, [trackScreenMount]),
  )

  const filteredHistory = parkingStore.filteredHistory
  const vehicles = parkingStore.vehicles

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const diffDays = Math.floor(
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    )

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getStatusColor = useCallback(
    (status: string) => {
      switch (status) {
        case 'completed':
          return theme.colors.palette.success500
        case 'expired':
          return theme.colors.palette.angry500
        default:
          return theme.colors.palette.neutral500
      }
    },
    [theme],
  )

  // Debounced navigation to prevent multiple rapid taps
  const handleNavigateToDetails = useCallback(
    debounce((sessionId: number) => {
      router.push(`/screens/parking/details/${sessionId}` as any)
    }, 300),
    [router],
  )

  const renderHistoryItem = ({ item }: any) => {
    const vehicle = parkingStore.vehicles.find(v => v.id === item.vehicleId)
    const zone = parkingStore.parkingZones.find(
      z => z.id === item.parkingZoneId,
    )

    return (
      <TouchableOpacity
        style={styles.historyItem}
        onPress={() => handleNavigateToDetails(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.historyIcon}>
          <Ionicons
            name="location"
            size={24}
            color={theme.colors.palette.primary500}
          />
        </View>
        <View style={styles.historyDetails}>
          <Text style={styles.historyLocation}>
            {zone?.name || 'Unknown Zone'}
          </Text>
          <Text style={styles.historyVehicle}>
            {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown Vehicle'}
          </Text>
          <View style={styles.historyMeta}>
            <Text style={styles.historyDate}>
              {item.startTime ? formatDate(item.startTime) : 'N/A'}
            </Text>
            <Text style={styles.historyTime}>
              {item.startTime ? formatTime(item.startTime) : ''}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' },
            ]}
          >
            <Text
              style={
                [
                  styles.statusText,
                  { color: getStatusColor(item.status) },
                ] as any
              }
            >
              {item.status}
            </Text>
          </View>
        </View>
        <View style={styles.historyAmount}>
          <Text style={styles.historyPrice}>
            ${item.chargedAmount.toFixed(2)}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.palette.neutral400}
          />
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.neutral200,
          theme.colors.palette.neutral300,
          theme.colors.palette.neutral100,
        ]}
        locations={[0, 0.4, 1]}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} preset="subheading">
              Parking History
            </Text>
            <Text style={styles.headerSubtitle}>
              View all your past parking sessions
            </Text>
          </View>
        </View>

        {/* Filter Panel - Vehicle Only */}
        <View style={styles.filterPanel}>
          <Text style={styles.filterTitle}>Filter by Vehicle</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                !parkingStore.historyFilter.filterVehicleId &&
                  styles.filterChipActive,
              ]}
              onPress={() => parkingStore.setHistoryFilterVehicle(null)}
            >
              <Ionicons
                name="car-sport"
                size={16}
                color={
                  !parkingStore.historyFilter.filterVehicleId
                    ? theme.colors.palette.neutral100
                    : theme.colors.palette.primary500
                }
              />
              <Text
                style={
                  [
                    styles.filterChipText,
                    !parkingStore.historyFilter.filterVehicleId &&
                      styles.filterChipTextActive,
                  ] as any
                }
              >
                All Vehicles
              </Text>
            </TouchableOpacity>
            {vehicles.map(vehicle => (
              <TouchableOpacity
                key={vehicle.id}
                style={[
                  styles.filterChip,
                  parkingStore.historyFilter.filterVehicleId === vehicle.id &&
                    styles.filterChipActive,
                ]}
                onPress={() => parkingStore.setHistoryFilterVehicle(vehicle.id)}
              >
                <Ionicons
                  name="car"
                  size={16}
                  color={
                    parkingStore.historyFilter.filterVehicleId === vehicle.id
                      ? theme.colors.palette.neutral100
                      : theme.colors.palette.primary500
                  }
                />
                <Text
                  style={
                    [
                      styles.filterChipText,
                      parkingStore.historyFilter.filterVehicleId ===
                        vehicle.id && styles.filterChipTextActive,
                    ] as any
                  }
                >
                  {vehicle.plateNumber}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* History List */}
        <FlatList
          data={filteredHistory}
          renderItem={renderHistoryItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={[
                  theme.colors.palette.neutral200,
                  theme.colors.palette.neutral300,
                ]}
                style={styles.emptyIconGradient}
              >
                <Ionicons
                  name="time-outline"
                  size={64}
                  color={theme.colors.palette.neutral500}
                />
              </LinearGradient>
              <Text style={styles.emptyText}>No parking history yet</Text>
              <Text style={styles.emptySubtext}>
                Your completed parking sessions will appear here
              </Text>
            </View>
          }
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 20,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerTitle: {
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },
    filterPanel: {
      paddingBottom: 16,
    },
    filterTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral700,
      paddingHorizontal: 24,
      marginBottom: 12,
    },
    filterContent: {
      paddingHorizontal: 24,
      gap: 8,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.primary100,
      gap: 4,
    },
    filterChipActive: {
      backgroundColor: theme.colors.palette.primary500,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
    },
    filterChipTextActive: {
      color: theme.colors.palette.neutral100,
    },
    listContainer: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 100,
    },
    historyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    historyIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    historyDetails: {
      flex: 1,
    },
    historyLocation: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    historyVehicle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.palette.neutral700,
      marginBottom: 6,
    },
    historyMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    historyDate: {
      fontSize: 13,
      color: theme.colors.palette.neutral600,
    },
    historyTime: {
      fontSize: 13,
      color: theme.colors.palette.neutral600,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    historyAmount: {
      alignItems: 'flex-end',
      gap: 4,
    },
    historyPrice: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.palette.primary500,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 100,
    },
    emptyIconGradient: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.palette.neutral600,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.palette.neutral400,
      textAlign: 'center',
    },
  })

export default HistoryScreen
