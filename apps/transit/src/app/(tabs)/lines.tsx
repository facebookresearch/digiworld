import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { typography, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useMemo, useEffect, useState, useRef, useCallback } from 'react'
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { queries } from '@/db/queries'
import { useStores } from '@/models'

// Simple debounce using ref
const useDebounceRef = (delay: number = 300) => {
  const lastCallRef = useRef<number>(0)

  const canExecute = useCallback(() => {
    const now = Date.now()
    if (now - lastCallRef.current < delay) {
      return false
    }
    lastCallRef.current = now
    return true
  }, [delay])

  return canExecute
}

const LinesScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { trackScreenMount } = useInteractionTracking('Lines', '/lines')
  const router = useRouter()
  const canExecute = useDebounceRef(300)
  const {
    linesStore: { linesState },
  } = useStores()

  const [allLines, setAllLines] = useState<
    {
      id: string
      name: string
      shortName: string
      mode: string
      color: string
      status: string
    }[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [alertCount, setAlertCount] = useState(0)

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
      loadAlertCount()
    }, [loadAlertCount]),
  )

  useEffect(() => {
    trackScreenMount()
    loadAllLines()
    loadAlertCount()
  }, [])

  const loadAllLines = async () => {
    try {
      setIsLoading(true)
      const lines = await queries.getAllLines()
      setAllLines(lines)
    } catch (error) {
      console.error('Error loading lines:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'bus':
        return 'bus'
      case 'train':
        return 'train'
      case 'subway':
        return 'subway'
      default:
        return 'subway'
    }
  }

  const modeFilters = [
    { id: 'all', name: 'All', icon: 'layers' },
    { id: 'bus', name: 'Bus', icon: 'bus' },
    { id: 'train', name: 'Train', icon: 'train' },
    { id: 'subway', name: 'Subway', icon: 'subway' },
  ]

  const filteredLines =
    linesState.selectedMode === 'all'
      ? allLines
      : allLines.filter(line => line.mode === linesState.selectedMode)

  const handleLinePress = useCallback(
    (lineId: string) => {
      if (!canExecute()) return
      router.push(`/lines/${lineId}`)
    },
    [canExecute, router],
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Transit Lines</Text>
          <Text style={styles.headerSubtitle}>
            {filteredLines.length} line{filteredLines.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.alertsButton}
          onPress={() => router.push('/alerts')}
          activeOpacity={0.7}
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

      {/* Mode Filters */}
      <View style={styles.filtersContainer}>
        {modeFilters.map(mode => {
          const isSelected = linesState.selectedMode === mode.id
          return (
            <TouchableOpacity
              key={mode.id}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => linesState.setSelectedMode(mode.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={mode.icon as 'layers' | 'bus' | 'train' | 'subway'}
                size={18}
                color={
                  isSelected
                    ? theme.colors.palette.neutral100
                    : `${theme.colors.palette.neutral900}A6`
                }
              />
              <Text
                style={
                  isSelected
                    ? styles.filterChipTextActive
                    : styles.filterChipText
                }
              >
                {mode.name}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.primary400}
          />
          <Text style={styles.loadingText}>Loading lines...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLines}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.lineItem}
              onPress={() => handleLinePress(item.id)}
              activeOpacity={0.7}
            >
              <View
                style={[styles.lineColorBadge, { backgroundColor: item.color }]}
              >
                <Text style={styles.lineShortName}>{item.shortName}</Text>
              </View>
              <View style={styles.lineInfo}>
                <Text style={styles.lineName}>{item.name}</Text>
                <View style={styles.lineMeta}>
                  <Ionicons
                    name={getModeIcon(item.mode) as 'bus' | 'train' | 'subway'}
                    size={14}
                    color={theme.colors.palette.neutral600}
                  />
                  <Text style={styles.lineMode}>{item.mode}</Text>
                  <Text style={styles.lineDot}>•</Text>
                  <Text
                    style={[
                      styles.lineStatus,
                      item.status === 'delayed' && styles.lineStatusDelayed,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.palette.neutral500}
              />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
      position: 'relative',
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 15,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
    },
    listContent: {
      padding: 20,
    },
    lineItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      marginBottom: 12,
      gap: 14,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    lineColorBadge: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
    lineShortName: {
      fontSize: 16,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral100,
    },
    lineInfo: {
      flex: 1,
    },
    lineName: {
      fontSize: 16,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    lineMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    lineMode: {
      fontSize: 13,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.neutral600,
      textTransform: 'capitalize',
    },
    lineDot: {
      fontSize: 12,
      color: theme.colors.palette.neutral500,
    },
    lineStatus: {
      fontSize: 13,
      fontFamily: typography.primary.medium,
      color: theme.colors.palette.primary500,
      textTransform: 'capitalize',
    },
    lineStatusDelayed: {
      color: theme.colors.palette.angry500,
    },
    filtersContainer: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.colors.palette.neutral100,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral200,
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
    },
    filterChipActive: {
      backgroundColor: theme.colors.palette.secondary500,
      borderColor: theme.colors.palette.secondary500,
      shadowColor: theme.colors.palette.secondary500,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    filterChipText: {
      fontSize: 14,
      fontFamily: typography.primary.semiBold,
      color: `${theme.colors.palette.neutral900}A6`,
    },
    filterChipTextActive: {
      fontSize: 14,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral100,
    },
  })

export default LinesScreen
