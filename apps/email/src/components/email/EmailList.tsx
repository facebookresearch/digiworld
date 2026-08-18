import { Text } from '@/components/Text'
import { Email, MailFolder } from '@/models/EmailModel'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { memo, useCallback, useMemo } from 'react'
import { FlatList, StyleSheet, View, ViewStyle } from 'react-native'
import { EmailItem } from './EmailItem'

interface EmailListProps {
  emails: Email[]

  onDelete: (folder: MailFolder) => void
  containerStyle?: ViewStyle
}

// Memoized EmailItem for better performance
const MemoizedEmailItem = memo(EmailItem)

export function EmailList({
  emails,
  onDelete,
  containerStyle,
}: EmailListProps) {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const EmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text text="No emails found" size="md" style={styles.emptyText} />
    </View>
  )

  const renderItem = useCallback(
    ({ item }: { item: Email }) => (
      <MemoizedEmailItem email={item} onDelete={onDelete} />
    ),
    [onDelete],
  )

  return (
    <View style={[styles.listContainer, containerStyle]}>
      <FlatList
        data={emails}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.contentContainer}
        ListEmptyComponent={EmptyComponent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="always"
        scrollEventThrottle={16}
        removeClippedSubviews={true}
        extraData={emails}
      />
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    contentContainer: {
      backgroundColor: theme.colors.background,
      padding: spacing.xs,
    },
    emptyContainer: {
      alignItems: 'center',
      padding: spacing.lg,
    },
    emptyText: {
      color: theme.colors.textDim,
      textAlign: 'center',
    },
    listContainer: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      flex: 1,
      overflow: 'hidden',
    },
  })
