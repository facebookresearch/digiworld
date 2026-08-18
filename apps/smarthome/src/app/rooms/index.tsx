// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
  Text,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { debounce } from 'lodash'

import { AppHeader, EmptyState } from '@/components'
import { useStores } from '@/models/helpers/useStores'
import { queries } from '@/db/queries'
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'

export default observer(function RoomsScreen() {
  const { theme } = useAppTheme()
  const rootStore = useStores()
  const router = useRouter()
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('rooms', '/rooms')

  const [refreshing, setRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const styles = useMemo(() => createStyles(theme), [theme])

  const loadRooms = useCallback(async () => {
    setIsLoading(true)
    try {
      // Force refresh all data from database
      await rootStore.smartHomeStore.refreshData()
    } catch (error) {
      console.error('🏠 Rooms: Error loading rooms:', error)
    } finally {
      setIsLoading(false)
    }
  }, [rootStore.smartHomeStore])

  useEffect(() => {
    loadRooms()
  }, [loadRooms])

  // Refresh data when screen comes into focus (e.g., returning from edit room)
  useFocusEffect(
    useCallback(() => {
      loadRooms()
    }, [loadRooms]),
  )

  useEffect(() => {
    trackScreenMount()
  }, [])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'rooms',
        route: '/rooms',
        roomsCount: rootStore.smartHomeStore.rooms.length,
      })

      return () => {
        getLatestInteraction()
      }
    }, [trackScreenMount]),
  )

  const onRefresh = async () => {
    trackClick('refresh_rooms')
    trackContentChange({
      action: 'refresh_rooms',
      section: 'rooms_list',
    })
    setRefreshing(true)
    await loadRooms()
    setRefreshing(false)
  }

  const handleRoomPress = debounce((roomId: number) => {
    const room = rootStore.smartHomeStore.rooms.find(r => r.id === roomId)
    trackClick(`room_${roomId}`)
    trackContentChange({
      action: 'navigate_to_edit_room',
      roomId,
      roomName: room?.name,
      roomType: room?.type,
      deviceCount: rootStore.smartHomeStore.getDevicesByRoom(roomId).length,
    })
    router.push(`/edit-room?id=${roomId}` as any)
  }, 300)

  const handleAddRoom = debounce(() => {
    trackClick('add_room_button')
    trackContentChange({
      action: 'navigate_to_add_room',
      section: 'rooms_header',
    })
    router.push('/add-room')
  }, 300)

  const handleDeleteRoom = async (roomId: number, roomName: string) => {
    trackClick(`delete_room_${roomId}`)
    trackContentChange({
      action: 'delete_room_confirmation',
      roomId,
      roomName,
      section: 'rooms_list',
    })

    Alert.alert(
      'Delete Room',
      `Are you sure you want to delete "${roomName}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            trackClick('delete_room_cancel')
            trackContentChange({
              action: 'delete_room_cancelled',
              roomId,
              roomName,
            })
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            trackClick('delete_room_confirm')
            trackContentChange({
              action: 'delete_room_confirmed',
              roomId,
              roomName,
            })
            try {
              await queries.deleteRoom(roomId)
              // Force refresh the store data
              await rootStore.smartHomeStore.refreshData()
              // Force component re-render by updating loading state
              setIsLoading(true)
              setTimeout(() => setIsLoading(false), 100)
              Alert.alert('Success', 'Room deleted successfully')
            } catch (error) {
              console.error('Error deleting room:', error)
              Alert.alert('Error', 'Failed to delete room')
            }
          },
        },
      ],
    )
  }

  const renderRoom = ({ item }: { item: any }) => {
    const deviceCount = rootStore.smartHomeStore.getDevicesByRoom(
      item.id,
    ).length
    const getRoomIcon = (type: string) => {
      const iconMap: Record<string, string> = {
        living_room: 'home',
        bedroom: 'bed',
        kitchen: 'restaurant',
        bathroom: 'water',
        office: 'business',
        garage: 'car',
        dining_room: 'restaurant',
        guest_room: 'bed',
        laundry_room: 'shirt',
        basement: 'layers',
        attic: 'home',
        balcony: 'leaf',
        patio: 'leaf',
        garden: 'leaf',
        other: 'ellipsis-horizontal',
      }
      return iconMap[type] || 'home'
    }

    const getRoomTypeLabel = (type: string) => {
      const labelMap: Record<string, string> = {
        living_room: 'Living Room',
        bedroom: 'Bedroom',
        kitchen: 'Kitchen',
        bathroom: 'Bathroom',
        office: 'Office',
        garage: 'Garage',
        dining_room: 'Dining Room',
        guest_room: 'Guest Room',
        laundry_room: 'Laundry Room',
        basement: 'Basement',
        attic: 'Attic',
        balcony: 'Balcony',
        patio: 'Patio',
        garden: 'Garden',
        other: 'Other',
      }
      return labelMap[type] || 'Room'
    }

    return (
      <TouchableOpacity
        style={[
          styles.roomCard,
          {
            backgroundColor: theme.colors.palette.neutral100,
            borderColor: theme.colors.palette.neutral300,
          },
        ]}
        onPress={() => handleRoomPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.roomCardContent}>
          <View style={styles.roomCardLeft}>
            <View
              style={[
                styles.roomIconContainer,
                { backgroundColor: theme.colors.palette.primary100 },
              ]}
            >
              <Ionicons
                name={getRoomIcon(item.type) as any}
                size={24}
                color={theme.colors.palette.primary600}
              />
            </View>
            <View style={styles.roomInfo}>
              <Text style={[styles.roomName, { color: theme.colors.text }]}>
                {item.name}
              </Text>
              <Text
                style={[
                  styles.roomType,
                  { color: theme.colors.palette.neutral600 },
                ]}
              >
                {getRoomTypeLabel(item.type)}
              </Text>
              {item.description && (
                <Text
                  style={[
                    styles.roomDescription,
                    { color: theme.colors.palette.neutral500 },
                  ]}
                >
                  {item.description}
                </Text>
              )}
              <View style={styles.roomStats}>
                <View style={styles.statItem}>
                  <Ionicons
                    name="hardware-chip-outline"
                    size={14}
                    color={theme.colors.palette.neutral500}
                  />
                  <Text
                    style={[
                      styles.statText,
                      { color: theme.colors.palette.neutral500 },
                    ]}
                  >
                    {deviceCount} device{deviceCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                {item.floor && (
                  <View style={styles.statItem}>
                    <Ionicons
                      name="layers-outline"
                      size={14}
                      color={theme.colors.palette.neutral500}
                    />
                    <Text
                      style={[
                        styles.statText,
                        { color: theme.colors.palette.neutral500 },
                      ]}
                    >
                      Floor {item.floor}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <View style={styles.roomCardRight}>
            {deviceCount === 0 ? (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.colors.palette.angry100 },
                ]}
                onPress={debounce(
                  () => handleDeleteRoom(item.id, item.name),
                  300,
                )}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={theme.colors.palette.angry500}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.protectedIndicator}>
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color={theme.colors.palette.neutral500}
                />
                <Text
                  style={[
                    styles.protectedText,
                    { color: theme.colors.palette.neutral500 },
                  ]}
                >
                  Protected
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <EmptyState
        icon="home-outline"
        title="No Rooms Added"
        description="Create your first room to organize your smart devices and make your home more manageable."
        actionText="Add Room"
        onAction={handleAddRoom}
      />
    </View>
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
          title="Rooms"
          showBackButton={true}
          showSearch={false}
          showProfile={false}
        />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <EmptyState
              icon="refresh-outline"
              title="Loading..."
              description="Loading your rooms"
            />
          </View>
        ) : (
          <FlatList
            data={rootStore.smartHomeStore.rooms}
            keyExtractor={room => room.id.toString()}
            renderItem={renderRoom}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            extraData={rootStore.smartHomeStore.rooms.length}
          />
        )}

        {/* Floating Action Button */}
        <TouchableOpacity
          style={[
            styles.floatingActionButton,
            { backgroundColor: theme.colors.palette.primary500 },
          ]}
          onPress={debounce(() => {
            trackClick('floating_add_room_button')
            trackContentChange({
              action: 'navigate_to_add_room',
              section: 'floating_action_button',
            })
            handleAddRoom()
          }, 300)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="add"
            size={24}
            color={theme.colors.palette.neutral100}
          />
        </TouchableOpacity>
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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    addRoomButton: {
      position: 'absolute',
      bottom: 30,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.palette.neutral900,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    roomCard: {
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: 16,
      borderWidth: 1,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.palette.neutral900,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    roomCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    roomCardLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    roomCardRight: {
      flexDirection: 'row',
      gap: 8,
      marginLeft: 12,
    },
    roomIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    roomInfo: {
      flex: 1,
    },
    roomName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    roomType: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 4,
    },
    roomDescription: {
      fontSize: 13,
      fontWeight: '400',
      marginBottom: 8,
      lineHeight: 18,
    },
    roomStats: {
      flexDirection: 'row',
      gap: 16,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statText: {
      fontSize: 12,
      fontWeight: '500',
    },
    actionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.palette.neutral900,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    protectedIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: theme.colors.palette.neutral300,
    },
    protectedText: {
      fontSize: 12,
      fontWeight: '500',
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 60,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      paddingTop: 20,
      paddingBottom: 100,
    },
    floatingActionButton: {
      position: 'absolute',
      bottom: 30,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.palette.neutral900,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
  })
