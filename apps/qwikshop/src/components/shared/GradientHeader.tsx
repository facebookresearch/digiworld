// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import LinearGradient from 'react-native-linear-gradient'
import { useAppTheme } from '@andojo/shared-theme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface GradientHeaderProps {
  title: string
  showBackButton?: boolean
  rightComponent?: React.ReactNode
  variant?: 'primary' | 'secondary' | 'accent'
}

export const GradientHeader: React.FC<GradientHeaderProps> = ({
  title,
  showBackButton = true,
  rightComponent,
  variant = 'primary',
}) => {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { theme } = useAppTheme()

  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return [
          theme.colors.palette.primary300,
          theme.colors.palette.primary400,
        ]
      case 'secondary':
        return [
          theme.colors.palette.secondary500,
          theme.colors.palette.secondary600,
        ]
      case 'accent':
        return [theme.colors.palette.accent500, theme.colors.palette.accent600]
    }
  }

  return (
    <LinearGradient
      colors={getGradientColors()}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      <View style={styles.headerContent}>
        {showBackButton && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral900}
            />
          </TouchableOpacity>
        )}

        <Text
          style={[styles.title, { color: theme.colors.palette.neutral900 }]}
        >
          {title}
        </Text>

        <View style={styles.rightContainer}>{rightComponent}</View>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  rightContainer: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
})
