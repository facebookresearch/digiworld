// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { Text as GlueText } from '@gluestack-ui/themed'
import type { TextStyle, TextProps as RNTextProps } from 'react-native'
import { metrics } from '../themes/metrics'
import { useTheme } from '../ThemeContext'

type Sizes = keyof typeof metrics.text
type Weights = 'normal' | 'medium' | 'semibold' | 'bold'
type Presets =
  | 'default'
  | 'bold'
  | 'heading'
  | 'subheading'
  | 'formLabel'
  | 'formHelper'

export interface TextProps extends Omit<RNTextProps, 'style'> {
  /**
   * The text to display if not using nested components.
   */
  text?: string
  /**
   * One of the different types of text presets.
   */
  preset?: Presets
  /**
   * Text weight modifier.
   */
  weight?: Weights
  /**
   * Text size modifier.
   */
  size?: Sizes
  style?: TextStyle
}

/**
 * A GlueStack UI Text component with preset styles.
 */
export function Text(props: TextProps) {
  const {
    weight = 'normal',
    size = 'medium',
    text,
    children,
    preset = 'default',
    ...rest
  } = props

  const { theme, componentStyles } = useTheme()
  const textConfig = componentStyles.text || {}
  const content = text || children

  const presetStyles: Record<Presets, { size?: Sizes; fontWeight?: Weights }> =
    {
      default: {},
      bold: { fontWeight: 'bold' },
      heading: { size: 'xxxl', fontWeight: 'bold' },
      subheading: { size: 'xl', fontWeight: 'medium' },
      formLabel: { fontWeight: 'medium' },
      formHelper: { size: 'small' },
    }

  const presetStyle = presetStyles[preset]
  const sizeValue = metrics.text[presetStyle.size || size]
  const weightValue = presetStyle.fontWeight || weight

  // Apply custom font sizes from config if available
  const getFinalSize = () => {
    if (preset === 'heading' && textConfig.headingFontSize) {
      return textConfig.headingFontSize
    }
    if (preset === 'subheading' && textConfig.subheadingFontSize) {
      return textConfig.subheadingFontSize
    }
    if (textConfig.defaultFontSize && preset === 'default') {
      return textConfig.defaultFontSize
    }
    return sizeValue
  }

  return (
    <GlueText
      {...rest}
      allowFontScaling={false}
      fontSize={getFinalSize()}
      fontWeight={weightValue}
      fontFamily={
        props.style && (props.style as any).fontFamily
          ? (props.style as any).fontFamily
          : theme.typography.primary.medium
      }
    >
      {content}
    </GlueText>
  )
}
