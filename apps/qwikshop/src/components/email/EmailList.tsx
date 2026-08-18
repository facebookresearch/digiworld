import { Text } from '@/components/Text'
import { Email, MailFolder } from '@/models/EmailModel'
import { colors, spacing } from '@andojo/shared-theme'
import { FlatList, StyleSheet, View, ViewStyle } from 'react-native'
import { EmailItem } from './EmailItem'

interface EmailListProps {
  emails: Email[]
  onDelete: (folder: MailFolder) => void
  containerStyle?: ViewStyle
}

export function EmailList({
  emails,
  onDelete,
  containerStyle,
}: EmailListProps) {
  const EmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text text="No emails found" size="md" style={styles.emptyText} />
    </View>
  )

  return (
    <View style={[styles.listContainer, containerStyle]}>
      <FlatList<Email>
        data={emails}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <EmailItem email={item} onDelete={onDelete} />
        )}
        contentContainerStyle={styles.contentContainer}
        ListEmptyComponent={EmptyComponent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="always"
        scrollEventThrottle={16}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    overflow: 'hidden',
  },
  contentContainer: {
    padding: spacing.xs,
    backgroundColor: colors.background,
  },
  emptyContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textDim,
  },
})
