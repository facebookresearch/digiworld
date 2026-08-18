// Copyright (c) Meta Platforms, Inc. and affiliates.
export * from './hooks/useAppTheme'
export * from './ThemeContext'
export * from './themes/base'
export { metrics } from './themes/metrics'
export { spacing } from './themes/spacing'
export { $styles } from './themes/styles'
export * from './themes/timing'
export * from './themes/typography'
export * from './types'

// Export all components
export * from './components'

// Export themes and utilities
export { useSafeAreaInsetsStyle } from './useSafeAreaInsetsStyle'
export type { ExtendedEdge } from './useSafeAreaInsetsStyle'

// Export theme configuration utilities
export * from './config/themeConfig.types'
export { ThemeLoader } from './config/themeLoader'
export {
  ComponentStyleManager,
  defaultComponentStyles,
} from './config/componentStyles'
