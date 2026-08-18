import React from 'react'
import { Image as GSImage, Box, Pressable } from '@gluestack-ui/themed'
import type { ImageStyle, ViewStyle, StyleProp } from 'react-native'
import icons from '@andojo/shared-asset-management/src/icons'

export type IconTypes = keyof typeof iconRegistry

export interface IconProps {
  icon: IconTypes
  color?: string
  size?: number
  style?: StyleProp<ImageStyle>
  containerStyle?: StyleProp<ViewStyle>
  onPress?: () => void
}

export function Icon({
  icon,
  color,
  size,
  style,
  containerStyle,
  onPress,
}: IconProps) {
  const imageStyle: StyleProp<ImageStyle> = [
    { resizeMode: 'contain' },
    color ? { tintColor: color } : undefined,
    size ? { width: size, height: size } : undefined,
    style,
  ]

  const image = (
    <GSImage source={iconRegistry[icon]} style={imageStyle} alt={icon} />
  )

  if (onPress) {
    return (
      <Pressable
        style={containerStyle}
        onPress={onPress}
        accessibilityRole="button"
      >
        {image}
      </Pressable>
    )
  }

  return <Box style={containerStyle}>{image}</Box>
}

export const iconRegistry = icons
