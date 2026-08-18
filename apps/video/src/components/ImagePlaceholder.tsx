// Copyright (c) Meta Platforms, Inc. and affiliates.
import { View, StyleSheet, Image } from 'react-native'
import { Text, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'

interface ImagePlaceholderProps {
  width: number
  height: number
  borderRadius?: number
  type?: 'video' | 'avatar' | 'channel'
  fallbackText?: string
  source?: { uri: string } | any
  videoId?: number
}

export function ImagePlaceholder({
  width,
  height,
  borderRadius = 8,
  type = 'video',
  fallbackText,
  source,
  videoId,
}: ImagePlaceholderProps) {
  const { theme } = useTheme()
  const stablePlaceholderUri = `https://picsum.photos/seed/${videoId}/${Math.round(width)}/${Math.round(height)}`

  // For now, we'll use placeholder colors and icons instead of loading from internet
  const getPlaceholderContent = () => {
    switch (type) {
      case 'avatar':
        return (
          <View
            style={[
              styles.placeholder,
              {
                width,
                height,
                borderRadius,
                backgroundColor: theme.colors.palette.primary200,
              },
            ]}
          >
            {fallbackText ? (
              <Text
                style={[styles.avatarText, { color: theme.colors.text }]}
                text={fallbackText.charAt(0).toUpperCase()}
              />
            ) : (
              <Ionicons
                name="person"
                size={Math.min(width, height) * 0.5}
                color={theme.colors.text}
              />
            )}
          </View>
        )
      case 'channel':
        return (
          <View
            style={[
              styles.placeholder,
              {
                width,
                height,
                borderRadius,
                backgroundColor: theme.colors.palette.secondary100,
              },
            ]}
          >
            <Ionicons
              name="tv"
              size={Math.min(width, height) * 0.4}
              color={theme.colors.text}
            />
          </View>
        )
      default: // video
        return (
          <View
            style={[
              styles.placeholder,
              {
                width,
                height,
                borderRadius,
                backgroundColor: theme.colors.palette.neutral400,
              },
            ]}
          >
            <Ionicons
              name="play-circle"
              size={Math.min(width, height) * 0.3}
              color={theme.colors.palette.neutral700}
            />
          </View>
        )
    }
  }

  // If we have a local source (not a URI), use it
  if (source && !source.uri) {
    return (
      <Image
        source={source}
        style={{ width, height, borderRadius }}
        resizeMode="cover"
      />
    )
  }

  // For now, always show placeholder instead of loading from internet
  if (!source) {
    return (
      <Image
        source={{ uri: stablePlaceholderUri }}
        style={{ width, height, borderRadius }}
        resizeMode="cover"
      />
    )
  }
  return getPlaceholderContent()
}

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
})
