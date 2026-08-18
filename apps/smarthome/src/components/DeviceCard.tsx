// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { Text, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'

interface DeviceCardProps {
  id: number
  name: string
  deviceType?: {
    name: string
    category: string
    subcategory?: string
    icon?: string
    brand: string
  }
  status: 'online' | 'offline' | 'error'
  isOn?: boolean
  battery?: number
  signalStrength?: number
  roomName?: string
  onPress: (deviceId: number, deviceType: string) => void
  onToggle?: (deviceId: number) => void
}

const getDeviceIcon = (
  category: string,
  icon?: string,
): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    bulb: 'bulb',
    switch: 'toggle-outline',
    plug: 'flash-outline',
    strip: 'flash',
    ac: 'snow-outline',
    fan: 'leaf-outline',
    speaker: 'musical-notes-outline',
    camera: 'videocam-outline',
    lighting: 'bulb-outline',
    temperature: 'thermometer-outline',
    security: 'shield-outline',
    audio: 'volume-high-outline',
  }
  return iconMap[icon || category] || 'hardware-chip-outline'
}

const getStatusColor = (
  status: string,
  theme: { colors: { palette: { [key: string]: string } } },
) => {
  switch (status) {
    case 'online':
      return theme.colors.palette.success500
    case 'offline':
      return theme.colors.palette.neutral500
    case 'error':
      return theme.colors.palette.angry500
    default:
      return theme.colors.palette.neutral500
  }
}

const getBatteryColor = (
  battery: number,
  theme: { colors: { palette: { [key: string]: string } } },
) => {
  if (battery > 50) return theme.colors.palette.success500
  if (battery > 20) return theme.colors.palette.warning500
  return theme.colors.palette.angry500
}

const getSignalColor = (
  strength: number,
  theme: { colors: { palette: { [key: string]: string } } },
) => {
  if (strength > 75) return theme.colors.palette.success500
  if (strength > 50) return theme.colors.palette.accent500
  if (strength > 25) return theme.colors.palette.angry500
  return theme.colors.palette.angry500
}

export function DeviceCard({
  id,
  name,
  deviceType,
  status,
  isOn,
  battery,
  signalStrength,
  roomName,
  onPress,
  onToggle,
}: DeviceCardProps) {
  const { theme } = useAppTheme()
  const icon = getDeviceIcon(
    deviceType?.category || 'unknown',
    deviceType?.icon,
  )
  const statusColor = getStatusColor(status, theme)

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          margin: 3,
          padding: 16,
          borderRadius: 16,
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
        activeContainer: {
          borderWidth: 2,
          borderColor: theme.colors.palette.success500,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        },
        iconContainer: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: theme.colors.palette.neutral300,
          justifyContent: 'center',
          alignItems: 'center',
        },
        statusContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        statusDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
        },
        toggleButton: {
          width: 24,
          height: 24,
          borderRadius: 12,
          justifyContent: 'center',
          alignItems: 'center',
        },
        content: {
          flex: 1,
          marginBottom: 12,
        },
        deviceName: {
          fontSize: 14,
          fontWeight: '600',
          marginBottom: 4,
          color: theme.colors.text,
        },
        deviceType: {
          fontSize: 12,
          opacity: 0.7,
          marginBottom: 2,
          color: theme.colors.textDim,
        },
        roomName: {
          fontSize: 10,
          opacity: 0.6,
          color: theme.colors.textDim,
        },
        footer: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        metrics: {
          flexDirection: 'row',
          gap: 8,
        },
        metric: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        metricText: {
          fontSize: 10,
          fontWeight: '500',
          color: theme.colors.textDim,
        },
      }),
    [theme],
  )

  const handleToggle = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    onToggle?.(id)
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.colors.palette.neutral200 },
        isOn && styles.activeContainer,
      ]}
      onPress={() => onPress(id, deviceType?.category || 'unknown')}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={20}
            color={
              isOn
                ? theme.colors.palette.primary300
                : theme.colors.palette.neutral500
            }
          />
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          {isOn !== undefined && (
            <TouchableOpacity
              style={[
                styles.toggleButton,
                {
                  backgroundColor: isOn
                    ? statusColor
                    : theme.colors.palette.neutral400,
                },
              ]}
              onPress={handleToggle}
            >
              <Ionicons
                name={isOn ? 'power' : 'power-outline'}
                size={12}
                color={theme.colors.palette.neutral100}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.deviceName} text={name} />
        <Text
          style={styles.deviceType}
          text={deviceType?.name || 'Unknown Device'}
        />
        {roomName && <Text style={styles.roomName} text={roomName} />}
      </View>

      <View style={styles.footer}>
        <View style={styles.metrics}>
          {battery !== undefined && (
            <View style={styles.metric}>
              <Ionicons
                name="battery-half-outline"
                size={12}
                color={getBatteryColor(battery, theme)}
              />
              <Text style={styles.metricText} text={`${battery}%`} />
            </View>
          )}
          {signalStrength !== undefined && (
            <View style={styles.metric}>
              <Ionicons
                name="wifi-outline"
                size={12}
                color={getSignalColor(signalStrength, theme)}
              />
              <Text style={styles.metricText} text={`${signalStrength}%`} />
            </View>
          )}
        </View>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={theme.colors.palette.neutral500}
        />
      </View>
    </TouchableOpacity>
  )
}
