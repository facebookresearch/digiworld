// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, Switch } from 'react-native'
import { Text, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'

interface SceneCardProps {
  id: number
  name: string
  description?: string
  icon?: string
  deviceCount?: number
  isActive?: boolean
  onPress: (id: number) => void
  onToggle?: (id: number) => void
  onExecute?: (id: number) => void
}

export function SceneCard({
  id,
  name,
  description,
  icon = 'layers-outline',
  deviceCount = 0,
  isActive = false,
  onPress,
  onToggle,
  onExecute,
}: SceneCardProps) {
  const { theme } = useAppTheme()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          borderRadius: 16,
          padding: 16,
          marginHorizontal: 3,
          marginBottom: 12,
          shadowColor: theme.colors.palette.neutral900,
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        content: {
          flex: 1,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        },
        leftSection: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        },
        rightSection: {
          alignItems: 'center',
        },
        iconContainer: {
          width: 40,
          height: 40,
          borderRadius: 20,
          justifyContent: 'center',
          alignItems: 'center',
        },
        statusIndicator: {
          marginLeft: 8,
        },
        statusDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
        },
        executeButton: {
          width: 32,
          height: 32,
          borderRadius: 16,
          justifyContent: 'center',
          alignItems: 'center',
        },
        textContainer: {
          flex: 1,
        },
        name: {
          fontSize: 16,
          fontWeight: '600',
          marginBottom: 4,
          color: theme.colors.text,
        },
        description: {
          fontSize: 14,
          marginBottom: 8,
          color: theme.colors.textDim,
        },
        deviceCount: {
          fontSize: 12,
          fontWeight: '500',
          color: theme.colors.textDim,
        },
      }),
    [theme],
  )

  const handlePress = () => {
    onPress(id)
  }

  const handleExecute = (e: any) => {
    e.stopPropagation()
    if (onExecute) {
      onExecute(id)
    }
  }

  const handleToggle = async (_value: boolean) => {
    if (onToggle) {
      await onToggle(id)
    }
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.colors.palette.neutral200 },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.leftSection}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.colors.palette.primary100 },
              ]}
            >
              <Ionicons
                name={icon as any}
                size={20}
                color={theme.colors.palette.primary500}
              />
            </View>
            <View style={styles.statusIndicator}>
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
            </View>
          </View>
          <View style={styles.rightSection}>
            {onToggle && (
              <Switch
                value={isActive}
                onValueChange={handleToggle}
                trackColor={{
                  false: theme.colors.palette.neutral300,
                  true: theme.colors.palette.primary300,
                }}
                thumbColor={
                  isActive
                    ? theme.colors.palette.primary500
                    : theme.colors.palette.neutral100
                }
              />
            )}
            {onExecute && !onToggle && (
              <TouchableOpacity
                style={[
                  styles.executeButton,
                  { backgroundColor: theme.colors.palette.primary500 },
                ]}
                onPress={handleExecute}
                activeOpacity={0.8}
              >
                <Ionicons name="play" size={16} color={theme.colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.name} text={name} />
          {description && (
            <Text style={styles.description} text={description} />
          )}
          <Text style={styles.deviceCount} text={`${deviceCount} devices`} />
        </View>
      </View>
    </TouchableOpacity>
  )
}
