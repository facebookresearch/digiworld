import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'

export const EmptyCommentsState: React.FC = () => {
  const { theme } = useTheme()

  return (
    <View style={styles.commentsDisabledContainer}>
      <Ionicons
        name="chatbubble-outline"
        size={48}
        color={theme.colors.palette.neutral600}
      />
      <Text
        style={[styles.commentsDisabledTitle, { color: theme.colors.text }]}
      >
        Comments are disabled
      </Text>
      <Text
        style={[
          styles.commentsDisabledDescription,
          { color: theme.colors.palette.neutral700 },
        ]}
      >
        The video owner has disabled comments for this video.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  commentsDisabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  commentsDisabledTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  commentsDisabledDescription: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
})
