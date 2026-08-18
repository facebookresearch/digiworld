// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  Input as GSInput,
  InputField,
  InputIcon,
  InputSlot,
} from '@gluestack-ui/themed'
import React, { useImperativeHandle } from 'react'
import type { TextInput, TextInputProps } from 'react-native'
import { useTheme } from '../ThemeContext'

type InputVariant = 'bordered' | 'plain' | 'underlined'

export interface InputProps extends TextInputProps {
  LeftAccessory?: React.ComponentType<any>
  RightAccessory?: React.ComponentType<any>
  isDisabled?: boolean
  variant?: InputVariant
}

export const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      LeftAccessory,
      RightAccessory,
      isDisabled,
      placeholderTextColor,
      ...rest
    },
    ref,
  ) => {
    const { theme, componentStyles } = useTheme()
    const inputConfig = componentStyles.input || {}

    // Use a mutable ref object to avoid readonly error
    const inputRef = React.useRef<{ current: TextInput | null }>({
      current: null,
    })

    // Use a ref callback to get the native TextInput from the styled InputField
    function setInputFieldRef(component: any) {
      inputRef.current.current = component?.getNativeRef
        ? component.getNativeRef()
        : component
    }

    // Expose imperative methods
    useImperativeHandle(ref, () => inputRef.current.current as TextInput)

    const getVariantStyle = (variant: InputVariant = 'plain') => {
      const baseStyle = {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        minHeight: inputConfig.defaultHeight || 48,
      }

      switch (variant) {
        case 'bordered':
          return {
            ...baseStyle,
            backgroundColor: inputConfig.backgroundColor || '#f7f8fa',
            borderRadius: inputConfig.defaultBorderRadius || 14,
            borderWidth: inputConfig.borderWidth || 1,
            borderColor:
              inputConfig.borderColor || theme.colors.palette.primary200,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }
        case 'underlined':
          return {
            ...baseStyle,
            backgroundColor: 'transparent',
            borderBottomWidth: inputConfig.borderWidth || 1,
            borderBottomColor:
              inputConfig.borderColor || theme.colors.palette.primary200,
          }
        case 'plain':
        default:
          return {
            ...baseStyle,
            backgroundColor: 'transparent',
          }
      }
    }

    const containerStyle = getVariantStyle(rest.variant)
    const finalPlaceholderColor =
      placeholderTextColor ||
      inputConfig.placeholderColor ||
      theme.colors.textDim

    return (
      <GSInput isDisabled={isDisabled} sx={containerStyle}>
        {!!LeftAccessory && (
          <InputSlot sx={{ marginLeft: 4 }}>
            <InputIcon as={LeftAccessory} />
          </InputSlot>
        )}
        <InputField
          ref={setInputFieldRef}
          {...rest}
          placeholderTextColor={finalPlaceholderColor}
          allowFontScaling={false}
          sx={{
            fontFamily: theme.typography.primary.normal,
            flex: 1,
            fontSize: inputConfig.fontSize || 16,
            fontWeight: inputConfig.fontWeight || '500',
            paddingVertical: inputConfig.defaultPaddingVertical || 15,
            paddingHorizontal: inputConfig.defaultPaddingHorizontal || 12,
            color: inputConfig.textColor || theme.colors.text,
            lineHeight: 24,
          }}
        />
        {!!RightAccessory && (
          <InputSlot sx={{ marginRight: 4 }}>
            <InputIcon as={RightAccessory} />
          </InputSlot>
        )}
      </GSInput>
    )
  },
)
