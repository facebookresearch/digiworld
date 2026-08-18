import { useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AppHeader, EmptyState } from '@/components'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router'
import { debounce } from 'lodash'

export default observer(function ScenesScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { smartHomeStore } = useStores()
  const [refreshKey, setRefreshKey] = useState(0)
  const { trackScreenMount } = useInteractionTracking('scenes', '/scenes')
  const { sessionTimeStamp } = useLocalSearchParams()
  const scenes = smartHomeStore.scenes.slice()
  const sceneSignature = useMemo(
    () =>
      scenes
        .map(
          scene =>
            `${scene.id}:${scene.is_active}:${scene.name}:${scene.deviceCount}`,
        )
        .join('|'),
    [scenes],
  )

  useEffect(() => {
    const loadData = async () => {
      await smartHomeStore.loadInitialData()
    }
    loadData()
    trackScreenMount()
  }, [smartHomeStore, trackScreenMount])

  // Debug logging for scenes data
  useEffect(() => {
    console.log('Scenes data in store:', smartHomeStore.scenes)
    console.log(
      'First scene deviceCount:',
      smartHomeStore.scenes[0]?.deviceCount,
    )
  }, [smartHomeStore.scenes])

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

  // Refresh data when screen comes into focus (e.g., returning from edit scene)
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
        screen: 'scenes',
        route: '/scenes',
      })
      return () => {
        // Cleanup function
      }
    }, [trackScreenMount]),
  )

  const renderScene = ({ item }: { item: any }) => {
    // Debug logging to check scene data
    console.log('Scene item:', {
      id: item.id,
      name: item.name,
      deviceCount: item.deviceCount,
      allKeys: Object.keys(item),
    })

    // Define darker solid colors for each scene based on index
    const cardColors = [
      '#4c63d2', // Darker purple
      '#e91e63', // Darker pink
      '#2196f3', // Darker blue
      '#4caf50', // Darker green
      '#ff5722', // Darker orange
      '#00bcd4', // Darker cyan
      '#9c27b0', // Darker violet
      '#795548', // Darker brown
    ]

    const colorIndex = item.id % cardColors.length
    const backgroundColor = cardColors[colorIndex]

    return (
      <TouchableOpacity
        style={[styles.sceneCard, { backgroundColor }]}
        onPress={() => {
          router.push(`/edit-scene/simple-edit?sceneId=${item.id}`)
        }}
        activeOpacity={0.8}
      >
        <View style={styles.sceneHeader}>
          <View style={styles.sceneInfo}>
            <Ionicons
              name="layers-outline"
              size={24}
              color={theme.colors.palette.neutral100}
            />
            <View style={styles.sceneText}>
              <Text
                style={[
                  styles.sceneName,
                  { color: theme.colors.palette.neutral100 },
                ]}
              >
                {item.name}
              </Text>
              <Text
                style={[
                  styles.sceneDescription,
                  { color: theme.colors.palette.neutral400 },
                ]}
              >
                {item.description}
              </Text>
            </View>
          </View>
          <Switch
            value={item.is_active}
            onValueChange={async () => {
              await smartHomeStore.toggleScene(item.id.toString())
              // Force FlatList refresh
              setRefreshKey(prev => prev + 1)
            }}
            trackColor={{
              false: theme.colors.palette.neutral400,
              true: theme.colors.palette.neutral100,
            }}
            thumbColor={
              item.is_active
                ? theme.colors.palette.neutral100
                : theme.colors.palette.neutral400
            }
          />
        </View>

        <View style={styles.sceneDetails}>
          <Text
            style={[
              styles.deviceCount,
              { color: theme.colors.palette.neutral300 },
            ]}
          >
            {item.deviceCount || 0} device
            {(item.deviceCount || 0) !== 1 ? 's' : ''}
          </Text>
          <View style={styles.activeStatus}>
            <View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor: item.is_active
                    ? theme.colors.palette.neutral100
                    : theme.colors.palette.neutral400,
                },
              ]}
            />
            <Text
              style={[
                styles.activeLabel,
                {
                  color: item.is_active
                    ? theme.colors.palette.neutral100
                    : theme.colors.palette.neutral400,
                },
              ]}
            >
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const renderEmptyScenes = () => (
    <EmptyState
      icon="layers-outline"
      title="No Scenes Found"
      description="Create scenes to control multiple devices with a single tap!"
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
          title="Scenes"
          showSearch={false}
          rightComponent={
            <TouchableOpacity
              style={[
                styles.headerButton,
                {
                  backgroundColor: theme.colors.palette.neutral200,
                  borderColor: theme.colors.palette.secondary300,
                },
              ]}
              onPress={debounce(
                () => router.push('/create-scene/simple-create'),
                300,
              )}
              activeOpacity={0.7}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={theme.colors.palette.secondary500}
              />
              <Text
                style={[
                  styles.headerButtonText,
                  { color: theme.colors.palette.secondary500 },
                ]}
              >
                Create
              </Text>
            </TouchableOpacity>
          }
        />

        <FlatList
          data={scenes}
          keyExtractor={scene => scene.id.toString()}
          renderItem={renderScene}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scenesContainer}
          ListEmptyComponent={() => renderEmptyScenes()}
          extraData={`${refreshKey}-${sceneSignature}`}
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
    headerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      borderWidth: 1,
      gap: 4,
    },
    headerButtonText: {
      fontSize: 12,
      fontWeight: '500',
    },
    scenesContainer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    sceneCard: {
      marginBottom: 16,
      borderRadius: 16,
      padding: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    sceneTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    sceneHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    sceneInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    sceneControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sceneText: {
      marginLeft: 12,
      flex: 1,
    },
    sceneName: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 4,
      textShadowColor: theme.colors.palette.neutral200,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    sceneDescription: {
      fontSize: 13,
      textShadowColor: theme.colors.palette.neutral200,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 1,
    },
    sceneDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    deviceCount: {
      fontSize: 12,
      fontWeight: '500',
    },
    activeStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    activeLabel: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statusIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      flex: 1,
    },
  })
