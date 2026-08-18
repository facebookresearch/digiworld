// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useAppTheme } from '@andojo/shared-theme'

// Deprecated: Legacy exports for backwards compatibility
// TODO: Remove these after all files are migrated to use hooks above
import qwikshopTheme from '@andojo/shared-theme/src/themes/light/qwikshop'

export const useSharedScreenOptions = () => {
  const { theme } = useAppTheme()

  return {
    headerShown: false,
    contentStyle: {
      backgroundColor: theme.colors.backgroundSecondary,
    },
    animation: 'slide_from_right' as const,
  }
}

export const useSharedHeaderStyle = () => {
  const { theme } = useAppTheme()

  return {
    backgroundColor: theme.colors.palette.primary300,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  }
}

export const useSharedHeaderTitleStyle = () => {
  const { theme } = useAppTheme()

  return {
    fontWeight: '700' as const,
    fontSize: 18,
    color: theme.colors.palette.neutral100,
  }
}

export const useTabBarConfig = () => {
  const { theme } = useAppTheme()

  return {
    activeTintColor: theme.colors.palette.primary600,
    inactiveTintColor: theme.colors.palette.neutral400,
    style: {
      backgroundColor: theme.colors.palette.neutral100,
      borderTopWidth: 0,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      height: 65,
      paddingBottom: 5,
      paddingTop: 12,
    },
    labelStyle: {
      fontSize: 12,
      fontWeight: '600' as const,
      marginTop: -2,
      marginBottom: 2,
    },
    iconStyle: {
      marginTop: -4,
    },
  }
}

export const useDrawerConfig = () => {
  const { theme } = useAppTheme()

  return {
    drawerStyle: {
      backgroundColor: theme.colors.palette.primary600,
    },
    drawerActiveTintColor: theme.colors.palette.accent500,
    drawerInactiveTintColor: theme.colors.palette.neutral200,
    drawerActiveBackgroundColor: theme.colors.palette.primary500,
    drawerLabelStyle: {
      fontWeight: '600' as const,
      fontSize: 16,
    },
    drawerItemStyle: {
      borderRadius: 12,
      marginHorizontal: 8,
      marginVertical: 2,
    },
  }
}
const { colors: themeColors } = qwikshopTheme

export const sharedScreenOptions = {
  headerShown: false,
  contentStyle: {
    backgroundColor: themeColors.backgroundSecondary,
  },
  animation: 'slide_from_right' as const,
}

export const sharedHeaderStyle = {
  backgroundColor: themeColors.palette.primary300,
  elevation: 0,
  shadowOpacity: 0,
  borderBottomWidth: 0,
}

export const sharedHeaderTitleStyle = {
  fontWeight: '700' as const,
  fontSize: 18,
  color: themeColors.palette.neutral100,
}

export const tabBarConfig = {
  activeTintColor: themeColors.palette.primary600,
  inactiveTintColor: themeColors.palette.neutral400,
  style: {
    backgroundColor: themeColors.palette.neutral100,
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    height: 65,
    paddingBottom: 5,
    paddingTop: 12,
  },
  labelStyle: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: -2,
    marginBottom: 2,
  },
  iconStyle: {
    marginTop: -4,
  },
}

export const drawerConfig = {
  drawerStyle: {
    backgroundColor: themeColors.palette.primary600,
  },
  drawerActiveTintColor: themeColors.palette.accent500,
  drawerInactiveTintColor: themeColors.palette.neutral200,
  drawerActiveBackgroundColor: themeColors.palette.primary500,
  drawerLabelStyle: {
    fontWeight: '600' as const,
    fontSize: 16,
  },
  drawerItemStyle: {
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 2,
  },
}

export { themeColors }
