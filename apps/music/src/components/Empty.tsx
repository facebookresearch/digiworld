import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, useAppTheme } from '@andojo/shared-theme'

interface EmptyStateProps {
  title: string
  subtitle: string
}

const EmptyState = ({ title, subtitle }: EmptyStateProps) => {
  const { theme } = useAppTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="musical-notes" size={48} color={theme.colors.textMuted} />
      <Text style={styles.emptyText}>{title}</Text>
      <Text style={styles.emptyText2}>{subtitle}</Text>
    </View>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 50, // optional: tweak to push it *slightly* lower
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 16,
      marginTop: 16,
      textAlign: 'center',
    },
    emptyText2: {
      color: theme.colors.textMuted,
      fontSize: 16,
      textAlign: 'center',
    },
  })

export default EmptyState
