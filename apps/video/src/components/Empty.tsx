import { View, StyleSheet } from 'react-native'
import { Text } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'

interface EmptyStateProps {
  title: string
  subtitle: string
}

const EmptyState = ({ title, subtitle }: EmptyStateProps) => {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="musical-notes" size={48} color="#666" />
      <Text style={styles.emptyText}>{title}</Text>
      <Text style={styles.emptyText2}>{subtitle}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: 50, // optional: tweak to push it *slightly* lower
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText2: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
})

export default EmptyState
