import React from 'react'
import { View, ViewStyle } from 'react-native'

interface ComponentProps {
  children?: React.ReactNode
  style?: ViewStyle | ViewStyle[]
  [key: string]: any
}

export const Box: React.FC<ComponentProps> = ({
  children,
  style,
  ...props
}) => (
  <View style={[{ flex: 1 }, style]} {...props}>
    {children}
  </View>
)

export const VStack: React.FC<ComponentProps> = ({
  children,
  style,
  ...props
}) => (
  <View style={[{ flexDirection: 'column' }, style]} {...props}>
    {children}
  </View>
)

export const HStack: React.FC<ComponentProps> = ({
  children,
  style,
  ...props
}) => (
  <View style={[{ flexDirection: 'row' }, style]} {...props}>
    {children}
  </View>
)

export const Center: React.FC<ComponentProps> = ({
  children,
  style,
  ...props
}) => (
  <View
    style={[{ alignItems: 'center', justifyContent: 'center' }, style]}
    {...props}
  >
    {children}
  </View>
)

export const ScrollView: React.FC<
  ComponentProps & { contentContainerStyle?: ViewStyle }
> = ({ children, style, contentContainerStyle, ...props }) => (
  <View style={[{ flex: 1 }, style]} {...props}>
    <View style={contentContainerStyle}>{children}</View>
  </View>
)

export const KeyboardAvoidingView: React.FC<ComponentProps> = ({
  children,
  style,
  ...props
}) => (
  <View style={[{ flex: 1 }, style]} {...props}>
    {children}
  </View>
)
