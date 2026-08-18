// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { View, ViewStyle, StyleSheet } from 'react-native'

interface ComponentProps {
  children?: React.ReactNode
  style?: ViewStyle | ViewStyle[]
  [key: string]: any
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  column: { flexDirection: 'column' },
  row: { flexDirection: 'row' },
  center: { alignItems: 'center', justifyContent: 'center' },
})

export const Box: React.FC<ComponentProps> = ({
  children,
  style,
  ...props
}) => (
  <View style={[styles.container, style]} {...props}>
    {children}
  </View>
)

export const VStack: React.FC<ComponentProps> = ({
  children,
  style,
  ...props
}) => (
  <View style={[styles.column, style]} {...props}>
    {children}
  </View>
)

export const HStack: React.FC<ComponentProps> = ({
  children,
  style,
  ...props
}) => (
  <View style={[styles.row, style]} {...props}>
    {children}
  </View>
)

export const Center: React.FC<ComponentProps> = ({
  children,
  style,
  ...props
}) => (
  <View style={[styles.center, style]} {...props}>
    {children}
  </View>
)

export const ScrollView: React.FC<
  ComponentProps & { contentContainerStyle?: ViewStyle }
> = ({ children, style, contentContainerStyle, ...props }) => (
  <View style={[styles.container, style]} {...props}>
    <View style={contentContainerStyle}>{children}</View>
  </View>
)

export const KeyboardAvoidingView: React.FC<ComponentProps> = ({
  children,
  style,
  ...props
}) => (
  <View style={[styles.container, style]} {...props}>
    {children}
  </View>
)
