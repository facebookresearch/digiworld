// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useState, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'react-native-linear-gradient'
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { AppHeader } from '@/components/AppHeader'
import { SafeAreaView } from 'react-native-safe-area-context'
import { observer } from 'mobx-react-lite'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { router, useFocusEffect } from 'expo-router'

const NotificationScreen = () => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [refreshing, setRefreshing] = useState(false)
  const { notificationStore, smartHomeStore } = useStores()
  const { trackScreenMount } = useInteractionTracking(
    'notifications',
    '/notifications',
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await notificationStore.getNotifications()
    setRefreshing(false)
  }

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'notifications',
        route: '/notifications',
      })
      // Check if any unread notifications exist and only then fire the mark all as read
      if (notificationStore.notifications.some(n => !n.is_read)) {
        setTimeout(() => {
          notificationStore.markAllAsRead()
        }, 1000)
      } else {
        console.log('No unread notifications')
      }
    }, [notificationStore]),
  )

  const getNotificationIcon = (type: string, priority: string) => {
    const getColor = () => {
      switch (priority) {
        case 'high':
          return theme.colors.palette.angry500
        case 'medium':
          return theme.colors.palette.accent500
        case 'low':
          return theme.colors.palette.primary500
        default:
          return theme.colors.palette.neutral600
      }
    }

    const getBackgroundColor = () => {
      switch (priority) {
        case 'high':
          return theme.colors.palette.angry100
        case 'medium':
          return theme.colors.palette.accent100
        case 'low':
          return theme.colors.palette.primary100
        default:
          return theme.colors.palette.neutral300
      }
    }

    const getIconName = () => {
      switch (type) {
        case 'device':
          return 'flash'
        case 'system':
          return 'settings'
        case 'security':
          return 'shield-checkmark'
        default:
          return 'notifications'
      }
    }

    const iconSize = priority === 'high' ? 24 : 20

    return (
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: getBackgroundColor() },
          priority === 'high' && styles.highPriorityIcon,
        ]}
      >
        <Ionicons name={getIconName()} size={iconSize} color={getColor()} />
        {priority === 'high' && (
          <View style={styles.priorityIndicator}>
            <Ionicons
              name="warning"
              size={12}
              color={theme.colors.palette.angry500}
            />
          </View>
        )}
      </View>
    )
  }

  const getPriorityBadge = (priority: string) => {
    if (priority === 'high') {
      return (
        <View style={styles.highPriorityBadge}>
          <Text style={styles.priorityBadgeText}>URGENT</Text>
        </View>
      )
    }
    return null
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const notificationTime = new Date(timestamp)
    const diffInMinutes = Math.floor(
      (now.getTime() - notificationTime.getTime()) / (1000 * 60),
    )

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const handleNotificationPress = (item: any) => {
    // Check if item has deviceId
    // Then from store get device and get the device type category and navigate
    if (item.device_id) {
      const device = smartHomeStore.devices.find(d => d.id === item.device_id)
      const deviceType = smartHomeStore.deviceTypes.find(
        d => d.id === device?.device_type_id,
      )
      if (device) {
        router.push(`/device/${deviceType?.category}/${device.id}` as any)
      }
    }
  }

  const renderNotification = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.is_read && styles.unreadNotification,
        !item.is_read && item.priority === 'high' && styles.highPriorityUnread,
        !item.is_read &&
          item.priority === 'medium' &&
          styles.mediumPriorityUnread,
        !item.is_read && item.priority === 'low' && styles.lowPriorityUnread,
        item.is_read && styles.readNotification,
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          {getNotificationIcon(item.type, item.priority)}
          <View style={styles.notificationText}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.notificationTitle,
                  !item.is_read && styles.unreadTitle,
                  item.is_read && styles.readTitle,
                ]}
              >
                {item.title}
              </Text>
              <View style={styles.titleRowRight}>
                {getPriorityBadge(item.priority)}
                {!item.is_read && <View style={styles.unreadDot} />}
              </View>
            </View>
            <Text
              style={[
                styles.notificationMessage,
                item.is_read && styles.readMessage,
              ]}
            >
              {item.message}
            </Text>
            {getTimeDisplay(item)}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )

  const getTimeDisplay = (item: any) => {
    if (item.is_read && item.read_at) {
      return (
        <View style={styles.timeContainer}>
          <Text style={styles.readTimeStamp}>
            Read {formatTimeAgo(item.read_at)}
          </Text>
        </View>
      )
    }
    return (
      <Text style={[styles.timeStamp, !item.is_read && styles.unreadTimeStamp]}>
        {formatTimeAgo(item.created_at)}
      </Text>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="notifications-outline"
        size={64}
        color={theme.colors.palette.neutral400}
      />
      <Text style={styles.emptyTitle}>No notifications</Text>
      <Text style={styles.emptySubtitle}>You're all caught up!</Text>
    </View>
  )

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

      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={theme.colors.palette.neutral100}
        />

        {/* Header */}
        <AppHeader
          title="Notifications"
          showBack={true}
          showProfile={false}
          showSearch={false}
        />

        {/* Notifications List */}
        <FlatList
          data={notificationStore.notifications}
          renderItem={renderNotification}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={[
            styles.listContainer,
            notificationStore.notifications.length === 0 &&
              styles.emptyListContainer,
          ]}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.palette.primary500]}
              tintColor={theme.colors.palette.primary500}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    backgroundGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      backgroundColor: theme.colors.palette.neutral100,
      paddingHorizontal: 20,
      paddingVertical: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral400,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      marginTop: 2,
    },
    markAllButton: {
      backgroundColor: theme.colors.palette.primary500,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    markAllText: {
      color: theme.colors.palette.neutral100,
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 4,
    },
    listContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    emptyListContainer: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    notificationItem: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    unreadNotification: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.palette.primary500,
    },
    highPriorityUnread: {
      borderLeftColor: theme.colors.palette.angry500,
      shadowColor: theme.colors.palette.angry500,
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    mediumPriorityUnread: {
      borderLeftColor: theme.colors.palette.accent500,
      shadowColor: theme.colors.palette.accent500,
      shadowOpacity: 0.1, // softer than high
      shadowRadius: 3,
      elevation: 3,
    },
    lowPriorityUnread: {
      borderLeftColor: theme.colors.palette.primary500,
      shadowColor: theme.colors.palette.primary500,
      shadowOpacity: 0.05, // very subtle
      shadowRadius: 2,
      elevation: 2,
    },
    readNotification: {
      backgroundColor: theme.colors.palette.neutral200,
    },
    notificationContent: {
      flex: 1,
    },
    notificationHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      position: 'relative',
    },
    highPriorityIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: theme.colors.palette.angry500,
    },
    priorityIndicator: {
      position: 'absolute',
      top: -2,
      right: -2,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 8,
      width: 16,
      height: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.palette.angry500,
    },
    notificationText: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    titleRowRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    highPriorityBadge: {
      backgroundColor: theme.colors.palette.angry500,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginRight: 8,
    },
    priorityBadgeText: {
      color: theme.colors.palette.neutral100,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    notificationTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.palette.neutral800,
      flex: 1,
    },
    unreadTitle: {
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
    readTitle: {
      color: theme.colors.palette.neutral900,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.palette.primary500,
      marginLeft: 8,
    },
    notificationMessage: {
      fontSize: 14,
      color: theme.colors.palette.neutral900,
      lineHeight: 20,
      marginBottom: 6,
    },
    readMessage: {
      color: theme.colors.palette.neutral900,
    },
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    timeStamp: {
      fontSize: 12,
      color: theme.colors.palette.neutral900,
    },
    unreadTimeStamp: {
      color: theme.colors.palette.neutral900,
      fontWeight: '500',
    },
    readTimeStamp: {
      fontSize: 12,
      color: theme.colors.palette.neutral900,
      marginLeft: 4,
    },
    deleteButton: {
      padding: 8,
      marginLeft: 8,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '500',
      color: theme.colors.palette.neutral900,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.colors.palette.neutral900,
    },
  })
export default observer(NotificationScreen)
