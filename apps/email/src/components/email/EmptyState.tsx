// Copyright (c) Meta Platforms, Inc. and affiliates.
import { View, StyleSheet } from 'react-native'
import { Text } from '@/components/Text'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { MailFolder } from '@/models/EmailModel'
import { translate } from '@/i18n'
import { useMemo } from 'react'

const FOLDER_MESSAGES: Record<MailFolder | 'all', string> = {
  all: translate('emptyState:noEmails'),
  inbox: translate('emptyState:emptyInbox'),
  sent: translate('emptyState:emptySent'),
  draft: translate('emptyState:emptyDraft'),
  trash: translate('emptyState:emptyTrash'),
  archived: translate('emptyState:emptyArchived'),
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
  searchText?: string
}

export function EmptyState({ folder, searchText }: EmptyStateProps) {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.container}>
      <Ionicons
        name={FOLDER_ICONS[folder]}
        size={48}
        color={theme.colors.palette.neutral400}
      />
      <Text
        text={
          searchText ? 'No matches for ' + searchText : FOLDER_MESSAGES[folder]
        }
        size="lg"
        style={styles.text}
      />
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      padding: spacing.xl,
    },
    text: {
      color: theme.colors.palette.neutral500,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
  })
