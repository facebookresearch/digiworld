import { spacing, type Theme } from '@andojo/shared-theme'
import { StyleSheet } from 'react-native'

export const createCommonStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      alignItems: 'center',
      borderRadius: 8,
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'center',
      marginTop: spacing.lg,
      width: '100%',
    },
    buttonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButton: {
      backgroundColor: theme.colors.palette.neutral300,
    },
    confirmButton: {
      backgroundColor: theme.colors.error,
    },
    confirmButtonText: {
      color: theme.colors.palette.neutral100,
    },
    dialog: {
      position: 'relative',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      elevation: 5,
      padding: spacing.lg,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      width: '100%',
      height: '100%',
    },
  })
