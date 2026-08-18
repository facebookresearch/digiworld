import { View, StyleSheet, Pressable } from 'react-native'
import { Text, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
  actionText?: string
  onAction?: () => void
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) {
  const { theme } = useTheme()

  return (
    <View style={styles.container}>
      <Ionicons
        name={icon}
        size={64}
        color={theme.colors.textDim}
        style={styles.icon}
      />
      <Text style={[styles.title, { color: theme.colors.text }]} text={title} />
      <Text
        style={[styles.description, { color: theme.colors.textDim }]}
        text={description}
      />

      {actionText && onAction && (
        <Pressable
          style={[
            styles.actionButton,
            { backgroundColor: theme.colors.palette.primary200 },
          ]}
          onPress={onAction}
        >
          <Text
            style={[styles.actionText, { color: theme.colors.text }]}
            text={actionText}
          />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: '#1c62ff',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
})
