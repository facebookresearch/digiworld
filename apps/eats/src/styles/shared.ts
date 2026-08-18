// Copyright (c) Meta Platforms, Inc. and affiliates.
import { StyleSheet } from 'react-native'
import { colors } from '@/theme'
import { metrics } from '@andojo/shared-theme'

export const shared = StyleSheet.create({
  // Cards
  card: {
    backgroundColor: colors.palette.neutral100,
    borderRadius: metrics.borderRadiusLarge,
    padding: metrics.large,
    borderWidth: 1,
    borderColor: colors.palette.neutral200,
    shadowColor: colors.palette.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  // Buttons
  button: {
    height: metrics.buttonHeight,
    borderRadius: metrics.borderRadiusLarge,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  buttonPrimary: {
    backgroundColor: colors.tint,
    shadowColor: colors.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // Text Styles
  heading: {
    fontSize: metrics.text.xl,
    color: colors.text,
    fontWeight: 'bold',
  },

  subheading: {
    fontSize: metrics.text.large,
    color: colors.textDim,
  },

  // Layout
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Common Components
  avatar: {
    width: metrics.avatarSizeMedium,
    height: metrics.avatarSizeMedium,
    borderRadius: metrics.avatarSizeMedium / 2,
  },

  input: {
    height: metrics.inputHeight,
    borderRadius: metrics.borderRadiusMedium,
    paddingHorizontal: metrics.medium,
    backgroundColor: colors.palette.neutral100,
    borderWidth: 1,
    borderColor: colors.palette.neutral300,
  },
  iconMargin: {
    marginRight: 4,
  },
})
