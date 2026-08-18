// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useMemo } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme } from '@andojo/shared-theme'
import { RoomType } from '@/models/SmartHomeStore'

interface RoomCardProps {
  id: number
  name: string
  description?: string
  type: string
  floor?: number
  deviceCount?: number
  onPress: (roomId: number) => void
}

const getRoomIcon = (type: string): string => {
  switch (type) {
    case RoomType.LIVING_ROOM:
      return 'home-outline'
    case RoomType.BEDROOM:
      return 'bed-outline'
    case RoomType.KITCHEN:
      return 'restaurant-outline'
    case RoomType.BATHROOM:
      return 'water-outline'
    case RoomType.OFFICE:
      return 'business-outline'
    case RoomType.GARAGE:
      return 'car-outline'
    case RoomType.DINING_ROOM:
      return 'restaurant-outline'
    case RoomType.GUEST_ROOM:
      return 'bed-outline'
    case RoomType.LAUNDRY_ROOM:
      return 'shirt-outline'
    case RoomType.BASEMENT:
      return 'layers-outline'
    case RoomType.ATTIC:
      return 'home-outline'
    case RoomType.BALCONY:
      return 'leaf-outline'
    case RoomType.PATIO:
      return 'leaf-outline'
    case RoomType.GARDEN:
      return 'leaf-outline'
    default:
      return 'ellipsis-horizontal-outline'
  }
}

const getRoomIconColor = (type: string, theme: any): string => {
  switch (type) {
    case RoomType.LIVING_ROOM:
      return theme.colors.palette.primary400
    case RoomType.BEDROOM:
      return theme.colors.palette.secondary400
    case RoomType.KITCHEN:
      return theme.colors.palette.warning400
    case RoomType.BATHROOM:
      return theme.colors.palette.info400
    case RoomType.OFFICE:
      return theme.colors.palette.neutral600
    case RoomType.GARAGE:
      return theme.colors.palette.neutral500
    case RoomType.DINING_ROOM:
      return theme.colors.palette.warning400
    case RoomType.GUEST_ROOM:
      return theme.colors.palette.secondary300
    case RoomType.LAUNDRY_ROOM:
      return theme.colors.palette.info300
    case RoomType.BASEMENT:
      return theme.colors.palette.neutral500
    case RoomType.ATTIC:
      return theme.colors.palette.neutral400
    case RoomType.BALCONY:
      return theme.colors.palette.success400
    case RoomType.PATIO:
      return theme.colors.palette.success400
    case RoomType.GARDEN:
      return theme.colors.palette.success500
    default:
      return theme.colors.palette.neutral500
  }
}

export function RoomCard({
  id,
  name,
  description,
  type,
  floor,
  deviceCount = 0,
  onPress,
}: RoomCardProps) {
  const { theme } = useAppTheme()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          width: 160,
          height: 140,
          marginRight: 16,
          borderRadius: 20,
          borderWidth: 1,
          padding: 16,
          ...Platform.select({
            ios: {
              shadowColor: theme.colors.palette.neutral900,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            },
            android: {
              elevation: 2,
            },
          }),
        },
        content: {
          flex: 1,
          justifyContent: 'space-between',
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        },
        headerRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        infoButton: {
          padding: 4,
        },
        iconContainer: {
          width: 44,
          height: 44,
          borderRadius: 22,
          borderWidth: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        floorBadge: {
          borderWidth: 1,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12,
        },
        floorText: {
          fontSize: 10,
          fontWeight: '600',
        },
        textContainer: {
          flex: 1,
          justifyContent: 'center',
          paddingVertical: 8,
        },
        roomName: {
          fontSize: 14,
          fontWeight: '600',
          lineHeight: 18,
        },
        footer: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        deviceInfo: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        deviceCount: {
          fontSize: 12,
          fontWeight: '500',
        },
      }),
    [theme],
  )

  const safeName = String(name || 'Unknown Room')
  const safeDescription = description ? String(description) : undefined
  const safeFloor = floor ? String(floor) : undefined
  const safeDeviceCount = String(deviceCount)

  const roomIcon = getRoomIcon(type)
  const iconColor = getRoomIconColor(type, theme)

  const handleInfoPress = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    if (safeDescription) {
      Alert.alert(safeName, safeDescription)
    }
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.palette.neutral200,
          borderColor: theme.colors.palette.neutral200,
        },
      ]}
      onPress={() => onPress(id)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: theme.colors.palette.primary100, // 15% opacity
                borderColor: `${iconColor}30`, // 30% opacity
              },
            ]}
          >
            <Ionicons name={roomIcon as any} size={24} color={iconColor} />
          </View>
          <View style={styles.headerRight}>
            {safeDescription && (
              <TouchableOpacity
                style={styles.infoButton}
                onPress={handleInfoPress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={theme.colors.palette.neutral500}
                />
              </TouchableOpacity>
            )}
            {safeFloor && (
              <View
                style={[
                  styles.floorBadge,
                  {
                    backgroundColor: theme.colors.palette.primary100,
                    borderColor: theme.colors.palette.primary200,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.floorText,
                    { color: theme.colors.palette.primary600 },
                  ]}
                >
                  {`F${safeFloor}`}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.roomName, { color: theme.colors.text }]}>
            {safeName}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.deviceInfo}>
            <Ionicons
              name="hardware-chip-outline"
              size={14}
              color={theme.colors.palette.neutral500}
            />
            <Text
              style={[
                styles.deviceCount,
                { color: theme.colors.palette.neutral600 },
              ]}
            >
              {safeDeviceCount} device{safeDeviceCount !== '1' ? 's' : ''}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={theme.colors.palette.neutral400}
          />
        </View>
      </View>
    </TouchableOpacity>
  )
}
