import React, { useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme, type Theme, Text } from '@andojo/shared-theme'

interface EmptyStateProps {
  searchQuery: string
  icon?: string
  title?: string
}

const EmptyState = React.memo(
  ({
    searchQuery,
    icon = 'people-outline',
    title = 'No users found',
  }: EmptyStateProps) => {
    const { theme } = useAppTheme()
    const styles = useMemo(() => createStyles(theme), [theme])

    return (
      <View style={styles.emptyState}>
        <Ionicons
          name={icon as any}
          size={64}
          color={theme.colors.palette.neutral500}
        />
        <Text style={styles.emptyStateText}>
          {searchQuery ? 'No users found matching your search' : title}
        </Text>
      </View>
    )
  },
)

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      marginTop: 16,
    },
  })

export default EmptyState
