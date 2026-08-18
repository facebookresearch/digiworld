import { View, StyleSheet } from 'react-native'
import { Text } from '@/components/Text'
import { colors, spacing } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { MailFolder } from '@/models/EmailModel'

const FOLDER_MESSAGES: Record<MailFolder | 'all', string> = {
  all: 'No emails found',
  inbox: 'Your inbox is empty',
  sent: 'No sent emails',
  draft: 'No drafts',
  trash: 'Trash is empty',
  archived: 'No archived emails',
}

const FOLDER_ICONS: Record<MailFolder | 'all', keyof typeof Ionicons.glyphMap> =
  {
    all: 'mail-unread-outline',
    inbox: 'mail-outline',
    sent: 'paper-plane-outline',
    draft: 'document-text-outline',
    trash: 'trash-outline',
    archived: 'archive-outline',
  }

interface EmptyStateProps {
  folder: MailFolder | 'all'
}

export function EmptyState({ folder }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons
        name={FOLDER_ICONS[folder]}
        size={48}
        color={colors.palette.neutral400}
      />
      <Text text={FOLDER_MESSAGES[folder]} size="lg" style={styles.text} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  text: {
    color: colors.palette.neutral500,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
})
