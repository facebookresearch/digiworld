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
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { SafeAreaView } from 'react-native-safe-area-context'
import { observer } from 'mobx-react-lite'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { router, useFocusEffect } from 'expo-router'

const NotificationScreen = () => {
  const [refreshing, setRefreshing] = useState(false)
  const { notificationStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { trackScreenMount } = useInteractionTracking(
    'notifications',
    '/notifications/notifications',
  )

  const TEST_MODE = false

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

      // Set test mode
      notificationStore.setTestMode(TEST_MODE)

      notificationStore.getNotifications()

      // Auto-mark unread notifications as read after viewing (unless in test mode)
      if (!TEST_MODE) {
        const unreadCount = notificationStore.unreadCount
        if (unreadCount > 0) {
          console.log(`Auto-marking ${unreadCount} notifications as read`)
          setTimeout(() => {
            notificationStore.markAllAsRead()
          }, 3000) // Give user time to see the notifications first
        } else {
          console.log('No unread notifications')
        }
      }

      // Mark that user has returned to screen
      return () => {
        notificationStore.setHasLeftScreen(true)
      }
    }, [TEST_MODE]),
  )

  const getNotificationIcon = (type: string, priority: string) => {
    const getColor = () => {
      switch (priority) {
        case 'high':
          return theme.colors.palette.angry500
        case 'medium':
          return theme.colors.palette.accent500
        case 'low':
        case 'normal':
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
        case 'normal':
          return theme.colors.palette.primary100
        default:
          return theme.colors.palette.neutral300
      }
    }

    const getIconName = () => {
      switch (type) {
        case 'transaction':
          return 'card'
        case 'account_update':
          return 'settings'
        case 'bill_due':
          return 'receipt'
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

  // Get notifications to display - use session notifications if available, otherwise filter unread
  const displayNotifications = TEST_MODE
    ? notificationStore.unreadNotifications // Show all unread in test mode
    : notificationStore.sessionNotifications.length > 0
      ? notificationStore.sessionNotifications
      : notificationStore.unreadNotifications

  const renderNotification = ({ item }: { item: any }) => (
    <View
      style={[
        styles.notificationItem,
        item.priority === 'high' && styles.highPriorityItem,
        item.priority === 'normal' && styles.normalPriorityItem,
        item.priority === 'low' && styles.lowPriorityItem,
      ]}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          {getNotificationIcon(item.notificationType, item.priority)}
          <View style={styles.notificationText}>
            <View style={styles.titleRow}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              <View style={styles.titleRowRight}>
                {getPriorityBadge(item.priority)}
                <View style={styles.unreadDot} />
              </View>
            </View>
            <Text style={styles.notificationMessage}>{item.message}</Text>
            <Text style={styles.timeStamp}>
              {formatTimeAgo(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="checkmark-circle"
        size={80}
        color={theme.colors.palette.success400}
      />
      <Text style={styles.emptyTitle}>No unread notifications</Text>
      <Text style={styles.emptySubtitle}>
        All caught up! You're doing great.
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={theme.colors.palette.neutral100}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral900}
            />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {TEST_MODE && (
              <View style={styles.testModeIndicator}>
                <Text style={styles.testModeText}>TEST MODE</Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Notifications List */}
        <FlatList
          data={displayNotifications}
          renderItem={renderNotification}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={[
            styles.listContainer,
            displayNotifications.length === 0 && styles.emptyListContainer,
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
      backgroundColor: theme.colors.palette.neutral200,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      backgroundColor: theme.colors.palette.neutral100,
      paddingHorizontal: 20,
      paddingVertical: 18,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: theme.colors.palette.neutral300,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    backButton: {
      padding: 8,
      marginLeft: -8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'flex-start',
      marginLeft: 20,
    },
    headerRight: {
      width: 40, // Balance the back button
    },
    testModeIndicator: {
      backgroundColor: theme.colors.palette.secondary400,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 4,
    },
    testModeText: {
      color: theme.colors.palette.neutral100,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    listContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
    },
    emptyListContainer: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    notificationItem: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    highPriorityItem: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.palette.angry500,
      backgroundColor: theme.colors.palette.angry100,
      borderColor: theme.colors.palette.angry200,
      shadowColor: theme.colors.palette.angry500,
      shadowOpacity: 0.12,
    },
    normalPriorityItem: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.palette.primary400,
      backgroundColor: theme.colors.palette.primary100,
      borderColor: theme.colors.palette.primary200,
      shadowColor: theme.colors.palette.primary400,
      shadowOpacity: 0.1,
    },
    lowPriorityItem: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.palette.neutral600,
      backgroundColor: theme.colors.palette.neutral200,
      borderColor: theme.colors.palette.neutral300,
    },
    notificationContent: {
      flex: 1,
    },
    notificationHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
      position: 'relative',
    },
    highPriorityIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
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
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
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
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      flex: 1,
      marginBottom: 4,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.palette.primary400,
      marginLeft: 8,
    },
    notificationMessage: {
      fontSize: 14,
      color: theme.colors.palette.neutral700,
      lineHeight: 20,
      marginBottom: 8,
    },
    timeStamp: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.palette.success400,
      marginTop: 16,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      lineHeight: 22,
    },
  })

export default observer(NotificationScreen)
