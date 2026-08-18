import React from 'react'
import {
  Button as GSButton,
  ButtonText,
  ButtonIcon,
} from '@gluestack-ui/themed'
import type { StyleProp, ViewStyle } from 'react-native'
import { typography } from '../themes/typography'
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet } from 'react-native'
import { useTheme } from '../ThemeContext'

export interface ButtonProps {
  text?: string
  LeftAccessory?: React.ComponentType<any>
  RightAccessory?: React.ComponentType<any>
  children?: React.ReactNode
  style?: StyleProp<ViewStyle>
  onPress?: () => void
  disabled?: boolean
  gradientColors?: [string, string, ...string[]]
  variant?: 'primary' | 'secondary' | 'outline'
}

export function Button({
  text,
  LeftAccessory,
  RightAccessory,
  children,
  style,
  gradientColors,
  variant = 'primary',
  ...rest
}: ButtonProps) {
  const { theme, componentStyles } = useTheme()
  const buttonConfig = componentStyles.button || {}

  const isGradient = gradientColors && gradientColors.length > 1

  // Get variant-specific styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor:
            buttonConfig.primaryBackground || theme.colors.palette.primary500,
          color: buttonConfig.primaryText || '#fff',
        }
      case 'secondary':
        return {
          backgroundColor:
            buttonConfig.secondaryBackground ||
            theme.colors.palette.secondary500,
          color: buttonConfig.secondaryText || '#fff',
        }
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.palette.primary500,
          color: theme.colors.palette.primary500,
        }
      default:
        return {
          backgroundColor: theme.colors.palette.primary500,
          color: '#fff',
        }
    }
  }

  const variantStyles = getVariantStyles()
  const defaultBorderRadius = buttonConfig.defaultBorderRadius || 12

  const content = (
    <>
      {!!LeftAccessory && (
        <ButtonIcon
          as={LeftAccessory}
          style={
            isGradient ? { color: '#fff' } : { color: variantStyles.color }
          }
        />
      )}
      {text && (
        <ButtonText
          allowFontScaling={false}
          style={{
            fontFamily:
              style && (style as any).fontFamily
                ? (style as any).fontFamily
                : typography.primary.normal,
            fontSize: buttonConfig.fontSize || 16,
            fontWeight: (buttonConfig.fontWeight || '600') as any,
            color: isGradient ? '#fff' : variantStyles.color,
            textAlign: 'center',
            flex: 0,
          }}
        >
          {text}
        </ButtonText>
      )}
      {children}
      {!!RightAccessory && (
        <ButtonIcon
          as={RightAccessory}
          style={
            isGradient ? { color: '#fff' } : { color: variantStyles.color }
          }
        />
      )}
    </>
  )

  if (isGradient) {
    return (
      <GSButton
        style={[
          {
            padding: 0,
            justifyContent: 'center',
            alignItems: 'center',
            height: buttonConfig.defaultHeight || 56,
          },
          style,
        ]}
        {...rest}
      >
        <LinearGradient
          colors={gradientColors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            ...(style ? StyleSheet.flatten(style) : {}),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: (style as any)?.borderRadius || defaultBorderRadius,
            width: '100%',
            height: '100%',
            padding: 0,
          }}
        >
          {content}
        </LinearGradient>
      </GSButton>
    )
  }

  return (
    <GSButton
      style={[
        {
          backgroundColor: variantStyles.backgroundColor,
          borderRadius: defaultBorderRadius,
          height: buttonConfig.defaultHeight || 56,
          paddingHorizontal: buttonConfig.defaultPaddingHorizontal || 24,
          paddingVertical: buttonConfig.defaultPaddingVertical || 16,
          ...(variantStyles.borderWidth
            ? { borderWidth: variantStyles.borderWidth }
            : {}),
          ...(variantStyles.borderColor
            ? { borderColor: variantStyles.borderColor }
            : {}),
        },
        style,
      ]}
      {...rest}
    >
      {content}
    </GSButton>
  )
}
