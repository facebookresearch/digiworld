// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

interface DeviceHistoryEntry {
  id: number
  device_id: number
  event_type: string
  old_value?: string
  new_value?: string
  timestamp: string
}

const DeviceHistoryScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const { smartHomeStore } = useStores()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [history, setHistory] = useState<DeviceHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { trackScreenMount } = useInteractionTracking(
    'device',
    `/device/history/${id}`,
  )

  const deviceId = parseInt(id || '0')
  //   const device = smartHomeStore.devices.find(d => d.id === deviceId)

  const loadDeviceHistory = useCallback(async () => {
    try {
      setLoading(true)
      const historyData = await smartHomeStore.getDeviceHistory(deviceId)
      console.log('historyData', historyData)
      setHistory(historyData)
    } catch (error) {
      console.error('Error loading device history:', error)
    } finally {
      setLoading(false)
    }
  }, [deviceId, smartHomeStore])

  useEffect(() => {
    loadDeviceHistory()
  }, [loadDeviceHistory])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadDeviceHistory()
    setRefreshing(false)
  }

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'DeviceHistory',
        route: `/device/history/${id}`,
      })
      return () => {
        console.log('Device history screen unfocused')
      }
    }, []),
  )

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60)
      return `${minutes}m ago`
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours)
      return `${hours}h ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  }

  const parseEventData = (value: string) => {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  const renderHistoryItem = ({ item }: { item: DeviceHistoryEntry }) => {
    const newData = item.new_value ? parseEventData(item.new_value) : null
    const description = newData?.description || 'Device activity'

    return (
      <View
        style={[
          styles.historyItem,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <View style={styles.historyHeader}>
          <View style={styles.historyIconContainer}>
            <Ionicons
              name="settings-outline"
              size={20}
              color={theme.colors.palette.primary500}
            />
          </View>
          <View style={styles.historyContent}>
            <Text
              preset="default"
              size="medium"
              style={{ ...styles.description, color: theme.colors.text }}
            >
              {description}
            </Text>
            <Text style={{ ...styles.timestamp, color: theme.colors.textDim }}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
        </View>
      </View>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="time-outline"
        size={64}
        color={theme.colors.textDim}
        style={styles.emptyIcon}
      />
      <Text style={{ ...styles.emptyTitle, color: theme.colors.text }}>
        No History Available
      </Text>
      <Text style={{ ...styles.emptyDescription, color: theme.colors.textDim }}>
        This device doesn't have any recorded history yet.
      </Text>
    </View>
  )

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={{ ...styles.headerTitle, color: theme.colors.text }}>
              Device History
            </Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.palette.primary500}
            />
            <Text style={{ ...styles.loadingText, color: theme.colors.text }}>
              Loading history...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={{ ...styles.headerTitle, color: theme.colors.text }}>
            History
          </Text>
          <View style={styles.placeholder} />
        </View>

        <FlatList
          data={history}
          keyExtractor={item => item.id.toString()}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
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
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral400,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      flex: 1,
      textAlign: 'center',
    },
    placeholder: {
      width: 40,
    },
    listContainer: {
      padding: 8,
    },
    historyItem: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
      flex: 1,
    },
    historyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    historyIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.palette.neutral400,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    historyContent: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    description: {
      flex: 1,
      marginRight: 8,
    },
    timestamp: {
      fontSize: 12,
      color: theme.colors.palette.neutral700,
      flexShrink: 0,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
    },
  })

export default DeviceHistoryScreen
