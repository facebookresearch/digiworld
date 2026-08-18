import {
  FlatList,
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Text,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppTheme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo, useState } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { debounce } from 'lodash'

import {
  EmptyState,
  RoomCard,
  DeviceCard,
  AddDeviceButton,
  AutomationCard,
  SceneCard,
  AppHeader,
} from '@/components'
import { useStores } from '@/models/helpers/useStores'
import { useFocusEffect, useRouter } from 'expo-router'
import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'

export default observer(function HomeScreen() {
  const { theme } = useAppTheme()
  const { smartHomeStore, notificationStore, userStore } = useStores()
  const router = useRouter()
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('home', '/home')
  const [refreshing, setRefreshing] = useState(false)

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
        scrollView: {
          flex: 1,
        },
        scrollContent: {
          paddingBottom: 100,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        section: {
          marginBottom: 32,
          paddingHorizontal: 20,
        },
        sectionHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        },
        sectionTitle: {
          fontSize: 20,
          fontWeight: '700',
          letterSpacing: -0.5,
          color: theme.colors.palette.neutral900,
        },
        roomsContainer: {
          marginBottom: -8,
        },
        roomsScrollView: {
          marginBottom: 0,
        },
        horizontalList: {
          flexDirection: 'row',
          paddingRight: 20,
          paddingBottom: 8,
          gap: 16,
        },
        emptyContainer: {
          minHeight: 200,
          justifyContent: 'center',
          alignItems: 'center',
        },
        quickActionsContainer: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 12,
        },
        quickActionCard: {
          flex: 1,
          backgroundColor: 'transparent',
          borderRadius: 12,
          padding: 12,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.colors.palette.neutral400,
        },
        actionIcon: {
          width: 36,
          height: 36,
          borderRadius: 18,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 8,
        },
        actionTitle: {
          fontSize: 12,
          fontWeight: '500',
          textAlign: 'center',
        },
        scenesGrid: {
          paddingBottom: 8,
          paddingHorizontal: 0,
        },
        scenesRow: {
          justifyContent: 'space-between',
          paddingHorizontal: 0,
        },
        searchButton: {
          padding: 8,
          borderRadius: 20,
          backgroundColor: theme.colors.palette.neutral200,
        },
        badge: {
          position: 'absolute',
          top: -4,
          right: -4,
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: theme.colors.palette.angry500,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 3,
        },
        badgeText: {
          color: theme.colors.palette.neutral100,
          fontSize: 10,
          fontWeight: 'bold',
        },
        buttonBadgeStyle: { position: 'relative' },
      }),
    [theme],
  )

  useEffect(() => {
    // Load data - the store will handle user switching internally
    const loadData = async () => {
      await smartHomeStore.loadInitialData()
    }
    loadData()
  }, [smartHomeStore, userStore.user?.id])

  useEffect(() => {
    trackScreenMount()
  }, [userStore.user?.id])

  useFocusEffect(
    useCallback(() => {
      // Track screen mount when focused
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'home',
        route: '/home',
      })
      return () => {
        getLatestInteraction()
      }
    }, [trackScreenMount]),
  )

  const onRefresh = useCallback(async () => {
    trackContentChange({ action: 'pull_to_refresh', section: 'home' })
    setRefreshing(true)
    await smartHomeStore.refreshData() // Use refreshData to force reload
    setRefreshing(false)
  }, [smartHomeStore, trackContentChange])

  const handleRoomPress = (roomId: number) => {
    trackClick(`room_${roomId}`)
    trackContentChange({ action: 'navigate_to_room_devices', roomId })
    router.push({
      pathname: '/(app)/devices',
      params: { roomId: roomId.toString() },
    })
  }

  const handleDevicePress = debounce((deviceId: number, deviceType: string) => {
    trackClick(`device_${deviceId}`)
    trackContentChange({
      action: 'navigate_to_device_control',
      deviceId,
      deviceType,
    })
    router.push(`device/${deviceType}/${deviceId}/` as any)
  }, 300)

  const handleDeviceToggle = async (deviceId: number) => {
    trackClick(`device_toggle_${deviceId}`)
    trackContentChange({ action: 'toggle_device_power', deviceId })
    await smartHomeStore.toggleDevice(deviceId.toString())
  }

  const handleAutomationPress = (automationId: number) => {
    trackClick(`automation_${automationId}`)
    trackContentChange({
      action: 'navigate_to_automation_details',
      automationId,
    })
    router.push(
      `/edit-automation/simple-edit?automationId=${automationId}` as any,
    )
  }

  const handleAutomationToggle = async (automationId: number) => {
    trackClick(`automation_toggle_${automationId}`)
    trackContentChange({ action: 'toggle_automation_status', automationId })
    await smartHomeStore.toggleAutomation(automationId.toString())
  }

  const handleAddDevice = debounce(() => {
    trackClick('add_device_button')
    trackContentChange({ action: 'navigate_to_add_device' })
    router.push('/add-device' as any)
  }, 300)

  const handleScenePress = (sceneId: number) => {
    trackClick(`scene_${sceneId}`)
    trackContentChange({
      action: 'navigate_to_scene_details',
      sceneId,
    })
    router.push(`/edit-scene/simple-edit?sceneId=${sceneId}` as any)
  }

  const handleSceneToggle = async (sceneId: number) => {
    await smartHomeStore.toggleScene(sceneId.toString())
  }

  const renderDevice = ({ item }: { item: any }) => {
    // Debug logging for room data
    console.log(`Device ${item.name}:`, {
      room: item.room,
      roomName: item.room?.name,
      roomId: item.room_id,
    })

    // console.log('item', item)
    return (
      <DeviceCard
        id={item.id}
        name={item.name}
        deviceType={item.deviceType}
        status={item.status}
        isOn={item.is_on}
        battery={item.battery}
        signalStrength={item.signal_strength}
        roomName={item.room?.name}
        onPress={handleDevicePress}
        onToggle={handleDeviceToggle}
      />
    )
  }

  const renderAutomation = ({ item }: { item: any }) => (
    <AutomationCard
      id={item.id}
      name={item.name}
      description={item.description}
      triggerType={item.trigger_type}
      isActive={item.is_active}
      deviceCount={item.deviceCount}
      onPress={handleAutomationPress}
      onToggle={handleAutomationToggle}
    />
  )

  const renderScene = ({ item }: { item: any }) => (
    <SceneCard
      id={item.id}
      name={item.name}
      description={item.description}
      icon={item.icon}
      deviceCount={item.deviceCount || 0}
      isActive={item.is_active}
      onPress={handleScenePress}
      onToggle={handleSceneToggle}
    />
  )

  const renderEmptyRooms = () => (
    <EmptyState
      icon="home-outline"
      title="No Rooms Added"
      description="Create rooms to organize your smart devices and make your home more manageable."
      actionText="Add Room"
      onAction={() => {
        trackClick('empty_rooms_action')
        trackContentChange({
          action: 'navigate_to_rooms',
          context: 'empty_rooms',
        })
        router.push('/rooms' as any)
      }}
    />
  )

  const renderEmptyDevices = () => (
    <EmptyState
      icon="hardware-chip-outline"
      title="No Devices Connected"
      description="Connect your first smart device to start building your smart home ecosystem."
      actionText="Add Device"
      onAction={() => {
        trackClick('empty_devices_action')
        trackContentChange({
          action: 'navigate_to_add_device',
          context: 'empty_devices',
        })
        handleAddDevice()
      }}
    />
  )

  const renderEmptyAutomations = () => (
    <EmptyState
      icon="settings-outline"
      title="No Automations Set Up"
      description="Create automations to make your devices work together automatically."
      actionText="Create Automation"
      onAction={() => {
        trackClick('empty_automations_action')
        trackContentChange({
          action: 'navigate_to_create_automation',
          context: 'empty_automations',
        })
        router.push('/create-automation/simple-create' as any)
      }}
    />
  )

  const renderEmptyScenes = () => (
    <EmptyState
      icon="layers-outline"
      title="No Scenes Created"
      description="Create scenes to control multiple devices with a single tap."
      actionText="Create Scene"
      onAction={() => {
        trackClick('empty_scenes_action')
        trackContentChange({
          action: 'navigate_to_create_scene',
          context: 'empty_scenes',
        })
        router.push('/create-scene/simple-create' as any)
      }}
    />
  )

  if (smartHomeStore.isLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader title="Smart Home" />
        <View style={styles.loadingContainer}>
          <EmptyState
            icon="refresh-outline"
            title="Loading..."
            description="Setting up your smart home dashboard"
          />
        </View>
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
          title="Smart Home"
          rightComponent={
            <TouchableOpacity
              style={styles.searchButton}
              onPress={debounce(() => {
                trackClick('notifications_button')
                trackContentChange({ action: 'navigate_to_notifications' })
                router.push('/notifications' as any)
              }, 300)}
              activeOpacity={0.7}
            >
              <View style={styles.buttonBadgeStyle}>
                <Ionicons
                  name={
                    notificationStore.notifications.some(n => !n.is_read)
                      ? 'notifications'
                      : 'notifications-outline'
                  }
                  size={24}
                  color={
                    notificationStore.notifications.some(n => !n.is_read)
                      ? theme.colors.palette.primary500
                      : theme.colors.text
                  }
                />
                {notificationStore.notifications.filter(n => !n.is_read)
                  .length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {
                        notificationStore.notifications.filter(n => !n.is_read)
                          .length
                      }
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          }
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Rooms Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Rooms</Text>
              <AddDeviceButton
                variant="secondary"
                size="small"
                text="View All"
                onPress={() => {
                  trackClick('view_all_rooms')
                  trackContentChange({
                    action: 'navigate_to_rooms',
                    section: 'rooms',
                  })
                  router.push('/rooms' as any)
                }}
              />
            </View>

            {smartHomeStore.rooms.length > 0 ? (
              <View style={styles.roomsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                  style={styles.roomsScrollView}
                >
                  {smartHomeStore.rooms.map(room => (
                    <RoomCard
                      key={room.id}
                      id={room.id}
                      name={room.name}
                      description={room.description || undefined}
                      type={room.type}
                      floor={room.floor || undefined}
                      deviceCount={
                        smartHomeStore.getDevicesByRoom(room.id).length
                      }
                      onPress={handleRoomPress}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : (
              <View style={styles.emptyContainer}>{renderEmptyRooms()}</View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={handleAddDevice}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: theme.colors.palette.primary100 },
                  ]}
                >
                  <Ionicons
                    name="add-circle"
                    size={20}
                    color={theme.colors.palette.primary500}
                  />
                </View>
                <Text
                  style={[styles.actionTitle, { color: theme.colors.text }]}
                >
                  Add Device
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={debounce(() => {
                  trackClick('quick_action_create_scene')
                  trackContentChange({
                    action: 'navigate_to_create_scene',
                    quickAction: 'create_scene',
                  })
                  router.push('/create-scene/simple-create' as any)
                }, 300)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: theme.colors.palette.secondary100 },
                  ]}
                >
                  <Ionicons
                    name="layers"
                    size={20}
                    color={theme.colors.palette.secondary500}
                  />
                </View>
                <Text
                  style={[styles.actionTitle, { color: theme.colors.text }]}
                >
                  Create Scene
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={debounce(() => {
                  trackClick('quick_action_create_automation')
                  trackContentChange({
                    action: 'navigate_to_create_automation',
                    quickAction: 'create_automation',
                  })
                  router.push('/create-automation/simple-create' as any)
                }, 300)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: theme.colors.palette.neutral100 },
                  ]}
                >
                  <Ionicons
                    name="settings"
                    size={20}
                    color={theme.colors.palette.neutral500}
                  />
                </View>
                <Text
                  style={[styles.actionTitle, { color: theme.colors.text }]}
                >
                  Automation
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Devices */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Devices</Text>
              <AddDeviceButton
                variant="secondary"
                size="small"
                text="View All"
                onPress={() => {
                  trackClick('view_all_devices')
                  trackContentChange({
                    action: 'navigate_to_devices',
                    section: 'devices',
                  })
                  router.push('/(app)/devices' as any)
                }}
              />
            </View>

            {smartHomeStore.devices.length > 0 ? (
              <FlatList
                data={smartHomeStore.devices.slice(0, 15)} // Show only first 6 devices
                keyExtractor={device => device.id.toString()}
                renderItem={renderDevice}
                numColumns={2}
                scrollEnabled={false}
                contentContainerStyle={styles.scenesGrid}
                columnWrapperStyle={styles.scenesRow}
                extraData={smartHomeStore.devices.map(d => ({
                  id: d.id,
                  is_on: d.is_on,
                  name: d.name,
                  status: d.status,
                  battery: d.battery,
                  signal_strength: d.signal_strength,
                }))}
              />
            ) : (
              <View style={styles.emptyContainer}>{renderEmptyDevices()}</View>
            )}
          </View>

          {/* Active Scenes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Scenes</Text>
              <AddDeviceButton
                variant="secondary"
                size="small"
                text="View All"
                onPress={() => {
                  trackClick('view_all_scenes')
                  trackContentChange({
                    action: 'navigate_to_scenes',
                    section: 'scenes',
                  })
                  router.push('/(app)/scenes' as any)
                }}
              />
            </View>

            {smartHomeStore.scenes.length > 0 ? (
              <FlatList
                data={smartHomeStore.scenes
                  .filter(s => s.is_active)
                  .slice(0, 4)}
                keyExtractor={scene => scene.id.toString()}
                renderItem={renderScene}
                numColumns={2}
                scrollEnabled={false}
                contentContainerStyle={styles.scenesGrid}
                columnWrapperStyle={styles.scenesRow}
              />
            ) : (
              <View style={styles.emptyContainer}>{renderEmptyScenes()}</View>
            )}
          </View>

          {/* Active Automations */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Automations</Text>
              <AddDeviceButton
                variant="secondary"
                size="small"
                text="View All"
                onPress={() => {
                  trackClick('view_all_automations')
                  trackContentChange({
                    action: 'navigate_to_automations',
                    section: 'automations',
                  })
                  router.push('/(app)/automations' as any)
                }}
              />
            </View>

            {smartHomeStore.automations.length > 0 ? (
              <FlatList
                data={smartHomeStore.automations
                  .filter(a => a.is_active)
                  .slice(0, 4)}
                keyExtractor={automation => automation.id.toString()}
                renderItem={renderAutomation}
                numColumns={2}
                scrollEnabled={false}
                contentContainerStyle={styles.scenesGrid}
                columnWrapperStyle={styles.scenesRow}
              />
            ) : (
              <View style={styles.emptyContainer}>
                {renderEmptyAutomations()}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
})
