import {
  FlatList,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppTheme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useMemo, useState } from 'react'
import LinearGradient from 'react-native-linear-gradient'

import { EmptyState, AppHeader } from '@/components'
import { useStores } from '@/models/helpers/useStores'
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'

interface Automation {
  id: number
  name: string
  description?: string | null
  trigger_type: string
  trigger_value?: string
  is_active: boolean
  deviceCount?: number
}

export default observer(function AutomationsScreen() {
  const { theme } = useAppTheme()
  const { smartHomeStore } = useStores()
  const [refreshKey, setRefreshKey] = useState(0)
  const { trackScreenMount } = useInteractionTracking(
    'automations',
    '/automations',
  )
  const { sessionTimeStamp } = useLocalSearchParams()
  const automations = smartHomeStore.automations.slice()
  const automationSignature = useMemo(
    () =>
      automations
        .map(
          automation =>
            `${automation.id}:${automation.is_active}:${automation.trigger_type}:${automation.trigger_value}:${automation.name}`,
        )
        .join('|'),
    [automations],
  )

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
        headerButton: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 6,
          borderWidth: 1,
          gap: 4,
          backgroundColor: theme.colors.palette.neutral200,
          borderColor: theme.colors.palette.primary300,
        },
        headerButtonText: {
          fontSize: 12,
          fontWeight: '500',
          color: theme.colors.palette.primary500,
        },
        automationsContainer: {
          paddingHorizontal: 20,
          paddingBottom: 20,
        },
        automationCard: {
          marginBottom: 16,
          padding: 16,
          borderRadius: 12,
          shadowColor: theme.colors.palette.neutral900,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          backgroundColor: theme.colors.palette.neutral200,
        },
        automationHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        },
        automationInfo: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        },
        iconContainer: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        },
        automationText: {
          flex: 1,
        },
        automationName: {
          fontSize: 16,
          fontWeight: '600',
          marginBottom: 2,
          color: theme.colors.text,
        },
        automationDescription: {
          fontSize: 13,
          opacity: 0.7,
          color: theme.colors.textDim,
        },
        automationContent: {
          marginBottom: 12,
          gap: 8,
        },
        triggerInfo: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        triggerText: {
          fontSize: 14,
          fontWeight: '500',
          flex: 1,
          color: theme.colors.text,
        },
        deviceInfo: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        deviceText: {
          fontSize: 14,
          fontWeight: '500',
          color: theme.colors.text,
        },
        automationFooter: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        statusIndicator: {
          width: 8,
          height: 8,
          borderRadius: 4,
          marginRight: 8,
        },
        statusText: {
          fontSize: 12,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          flex: 1,
        },
      }),
    [theme],
  )

  useEffect(() => {
    const loadData = async () => {
      await smartHomeStore.loadInitialData()
    }
    loadData()
    trackScreenMount()
  }, [smartHomeStore, trackScreenMount])

  // Debug logging for automations data
  useEffect(() => {
    console.log('Automations data in store:', smartHomeStore.automations)
    console.log(
      'First automation deviceCount:',
      smartHomeStore.automations[0]?.deviceCount,
    )
  }, [smartHomeStore.automations])

  // Refresh when sessionTimeStamp changes (handles same-screen navigation)
  useEffect(() => {
    if (sessionTimeStamp) {
      const refreshData = async () => {
        await smartHomeStore.refreshData()
        setRefreshKey(prev => prev + 1)
      }
      refreshData()
    }
  }, [sessionTimeStamp, smartHomeStore])

  // Refresh data when screen comes into focus (e.g., returning from edit automation)
  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        await smartHomeStore.refreshData() // Use refreshData to force reload
        setRefreshKey(prev => prev + 1)
      }
      refreshData()
    }, [smartHomeStore]),
  )

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'automations',
        route: '/automations',
      })
    }, [trackScreenMount]),
  )

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'time':
        return 'time-outline'
      case 'geofence':
        return 'location-outline'
      default:
        return 'settings-outline'
    }
  }

  const parseTriggerValue = (triggerType: string, triggerValue: string) => {
    try {
      const parsed = JSON.parse(triggerValue || '{}')
      switch (triggerType) {
        case 'time': {
          const time = parsed.time || 'N/A'
          if (parsed.days && Array.isArray(parsed.days)) {
            if (parsed.days.length === 7) {
              return `Every day at ${time}`
            } else if (
              parsed.days.length === 5 &&
              parsed.days.includes('mon') &&
              parsed.days.includes('tue') &&
              parsed.days.includes('wed') &&
              parsed.days.includes('thu') &&
              parsed.days.includes('fri')
            ) {
              return `Weekdays at ${time}`
            } else {
              const dayNames = parsed.days.map((day: string) => {
                const dayMap: { [key: string]: string } = {
                  sun: 'Sun',
                  mon: 'Mon',
                  tue: 'Tue',
                  wed: 'Wed',
                  thu: 'Thu',
                  fri: 'Fri',
                  sat: 'Sat',
                }
                return dayMap[day] || day
              })
              return `${dayNames.join(', ')} at ${time}`
            }
          }
          return `Every day at ${time}`
        }
        case 'geofence': {
          const trigger =
            parsed.trigger === 'enter'
              ? 'When arriving home'
              : 'When leaving home'
          const radius = parsed.radius ? ` (${parsed.radius}m)` : ''
          return `${trigger}${radius}`
        }
        default:
          return 'Manual trigger'
      }
    } catch {
      return triggerValue || 'Manual trigger'
    }
  }

  const renderAutomation = ({ item }: { item: Automation }) => (
    <TouchableOpacity
      style={styles.automationCard}
      onPress={() => {
        router.push(`/edit-automation/simple-edit?automationId=${item.id}`)
      }}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.automationHeader}>
        <View style={styles.automationInfo}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: item.is_active
                  ? item.trigger_type === 'time'
                    ? theme.colors.palette.primary100
                    : theme.colors.palette.secondary100
                  : theme.colors.palette.neutral300,
              },
            ]}
          >
            <Ionicons
              name={
                getTriggerIcon(
                  item.trigger_type,
                ) as keyof typeof Ionicons.glyphMap
              }
              size={22}
              color={
                item.is_active
                  ? item.trigger_type === 'time'
                    ? theme.colors.palette.primary500
                    : theme.colors.palette.secondary500
                  : theme.colors.palette.neutral600
              }
            />
          </View>
          <View style={styles.automationText}>
            <Text style={styles.automationName}>{item.name}</Text>
            <Text style={styles.automationDescription}>
              {item.description || 'No description'}
            </Text>
          </View>
        </View>
        <Switch
          value={item.is_active}
          onValueChange={async () => {
            await smartHomeStore.toggleAutomation(item.id.toString())
            // Force FlatList refresh
            setRefreshKey(prev => prev + 1)
          }}
          trackColor={{
            false: theme.colors.palette.neutral400,
            true: theme.colors.palette.primary300,
          }}
          thumbColor={
            item.is_active
              ? theme.colors.palette.primary500
              : theme.colors.palette.neutral600
          }
        />
      </View>

      {/* Content */}
      <View style={styles.automationContent}>
        <View style={styles.triggerInfo}>
          <Ionicons
            name={
              getTriggerIcon(
                item.trigger_type,
              ) as keyof typeof Ionicons.glyphMap
            }
            size={16}
            color={theme.colors.palette.neutral500}
          />
          <Text style={styles.triggerText}>
            {parseTriggerValue(item.trigger_type, item.trigger_value || '')}
          </Text>
        </View>

        <View style={styles.deviceInfo}>
          <Ionicons
            name="hardware-chip-outline"
            size={16}
            color={theme.colors.palette.neutral500}
          />
          <Text style={styles.deviceText}>
            {item.deviceCount || 0} device
            {(item.deviceCount || 0) !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.automationFooter}>
        <View
          style={[
            styles.statusIndicator,
            {
              backgroundColor: item.is_active
                ? theme.colors.palette.success500
                : theme.colors.palette.neutral400,
            },
          ]}
        />
        <Text
          style={[
            styles.statusText,
            {
              color: item.is_active
                ? theme.colors.palette.success500
                : theme.colors.palette.neutral600,
            },
          ]}
        >
          {item.is_active ? 'Active' : 'Inactive'}
        </Text>
      </View>
    </TouchableOpacity>
  )

  const renderEmptyAutomations = () => (
    <EmptyState
      icon="settings-outline"
      title="No Automations Found"
      description="Create automations to make your smart home work for you!"
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
          title="Automations"
          showSearch={false}
          rightComponent={
            <TouchableOpacity
              style={styles.headerButton}
              onPress={debounce(
                () => router.push('/create-automation/simple-create'),
                300,
              )}
              activeOpacity={0.7}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={theme.colors.palette.primary500}
              />
              <Text style={styles.headerButtonText}>Create</Text>
            </TouchableOpacity>
          }
        />

        <FlatList
          data={automations}
          keyExtractor={automation => automation.id.toString()}
          renderItem={renderAutomation}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.automationsContainer}
          ListEmptyComponent={() => renderEmptyAutomations()}
          extraData={`${refreshKey}-${automationSignature}`}
        />
      </SafeAreaView>
    </View>
  )
})
