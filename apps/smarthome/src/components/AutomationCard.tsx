import React, { useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { Text, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'

interface AutomationCardProps {
  id: number
  name: string
  description?: string
  triggerType: string
  isActive: boolean
  deviceCount?: number
  onPress: (automationId: number) => void
  onToggle?: (automationId: number) => void
}

const getTriggerIcon = (
  triggerType: string,
): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    time: 'time-outline',
    motion: 'walk-outline',
    temperature: 'thermometer-outline',
    manual: 'hand-left-outline',
    geofence: 'location-outline',
  }
  return iconMap[triggerType] || 'settings-outline'
}

const getTriggerGradient = (triggerType: string) => {
  const gradientMap: Record<string, string[]> = {
    time: ['#667eea', '#764ba2'],
    motion: ['#f093fb', '#f5576c'],
    temperature: ['#4facfe', '#00f2fe'],
    manual: ['#43e97b', '#38f9d7'],
    geofence: ['#fa709a', '#fee140'],
  }
  return gradientMap[triggerType] || ['#d299c2', '#fef9d7']
}

export function AutomationCard({
  id,
  name,
  description,
  triggerType,
  isActive,
  deviceCount,
  onPress,
  onToggle,
}: AutomationCardProps) {
  const { theme } = useAppTheme()
  const icon = getTriggerIcon(triggerType)
  const gradientColors = getTriggerGradient(triggerType)

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
        iconGradient: {
          width: 40,
          height: 40,
          borderRadius: 20,
          justifyContent: 'center',
          alignItems: 'center',
        },
        toggleContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        toggleButton: {
          width: 28,
          height: 28,
          borderRadius: 14,
          justifyContent: 'center',
          alignItems: 'center',
        },
        content: {
          flex: 1,
          marginBottom: 12,
        },
        automationName: {
          fontSize: 16,
          fontWeight: '600',
          marginBottom: 4,
          color: theme.colors.text,
        },
        description: {
          fontSize: 12,
          opacity: 0.7,
          marginBottom: 4,
          lineHeight: 16,
          color: theme.colors.textDim,
        },
        triggerType: {
          fontSize: 10,
          opacity: 0.6,
          textTransform: 'capitalize',
          color: theme.colors.textDim,
        },
        footer: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        deviceInfo: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        deviceCount: {
          fontSize: 12,
          fontWeight: '500',
          opacity: 0.7,
          color: theme.colors.textDim,
        },
        statusContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        statusDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
        },
        statusText: {
          fontSize: 12,
          fontWeight: '500',
          opacity: 0.7,
          color: theme.colors.textDim,
        },
      }),
    [theme],
  )

  const handleToggle = (e: any) => {
    e.stopPropagation()
    onToggle?.(id)
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.colors.palette.neutral200 },
        isActive && styles.activeContainer,
      ]}
      onPress={() => onPress(id)}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <LinearGradient
          colors={gradientColors}
          style={styles.iconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons
            name={icon}
            size={20}
            color={theme.colors.palette.neutral100}
          />
        </LinearGradient>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              {
                backgroundColor: isActive
                  ? theme.colors.palette.success500
                  : theme.colors.palette.neutral400,
              },
            ]}
            onPress={handleToggle}
          >
            <Ionicons
              name={isActive ? 'checkmark' : 'close'}
              size={12}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.automationName} text={name} />
        {description && <Text style={styles.description} text={description} />}
        <Text style={styles.triggerType} text={`Trigger: ${triggerType}`} />
      </View>

      <View style={styles.footer}>
        <View style={styles.deviceInfo}>
          {deviceCount !== undefined && (
            <>
              <Ionicons
                name="hardware-chip-outline"
                size={14}
                color={theme.colors.textDim}
              />
              <Text
                style={styles.deviceCount}
                text={`${deviceCount} devices`}
              />
            </>
          )}
        </View>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isActive
                  ? theme.colors.palette.success500
                  : theme.colors.palette.neutral400,
              },
            ]}
          />
          <Text
            style={styles.statusText}
            text={isActive ? 'Active' : 'Inactive'}
          />
        </View>
      </View>
    </TouchableOpacity>
  )
}
