// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState, useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useAppTheme, type Theme, AutoImage, Text } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import type { ContactItem } from '../hooks'
import { observer } from 'mobx-react-lite'

interface SelectedContactsProps {
  selectedContacts: ContactItem[]
}

const SelectedContacts = observer(
  ({ selectedContacts }: SelectedContactsProps) => {
    const { theme } = useAppTheme()
    const styles = useMemo(() => createStyles(theme), [theme])
    const { userStore } = useStores()
    const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set())
    const { trackContentChange } = useInteractionTracking(
      'SelectedContacts',
      '/screens/contacts/contact-list',
    )
    console.log('SelectedContacts', selectedContacts)

    if (selectedContacts.length === 0) return null

    const getInitials = (name: string) => {
      if (!name) return 'U'
      return name
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2)
    }

    const isValidBase64 = (str: string) => {
      if (!str) return false
      return str.startsWith('data:image') || str.includes('base64')
    }

    return (
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {selectedContacts.map(contact => (
            <View key={contact.id} style={styles.contactItem}>
              <View style={styles.avatarContainer}>
                {contact.type === 'database' ? (
                  contact.avatarUrl &&
                  isValidBase64(contact.avatarUrl) &&
                  !failedAvatars.has(contact.id) ? (
                    <AutoImage
                      source={{ uri: contact.avatarUrl }}
                      style={styles.avatar}
                      onError={() => {
                        console.log(
                          'Selected contact avatar failed to load for:',
                          contact.name,
                        )
                        setFailedAvatars(prev => new Set([...prev, contact.id]))
                      }}
                      onLoad={() => {
                        console.log(
                          'Selected contact avatar loaded successfully for:',
                          contact.name,
                        )
                        setFailedAvatars(prev => {
                          const newSet = new Set(prev)
                          newSet.delete(contact.id)
                          return newSet
                        })
                      }}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text
                        preset="bold"
                        size="medium"
                        style={styles.avatarText}
                      >
                        {getInitials(contact.name)}
                      </Text>
                    </View>
                  )
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons
                      name="person"
                      size={20}
                      color={theme.colors.palette.neutral100}
                    />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => {
                    // Get the selected contacts that will remain after removal
                    const remainingContacts = userStore.selectedContacts.filter(
                      id => id !== contact.id,
                    )

                    // Track contact removal
                    trackContentChange({
                      action: 'contact_selection_removed',
                      contactId: contact.id,
                      contactName: contact.name,
                      contactType: contact.type,
                      selectedContactsCount: remainingContacts.length,
                      selectedContacts: remainingContacts, // Track the remaining contacts
                      isGroupCreationMode: userStore.isGroupCreationMode,
                      isAddToGroupMode:
                        userStore.navigationSource === 'addToGroup',
                      timestamp: Date.now(),
                    })

                    userStore.toggleContactSelection(contact.id)
                  }}
                >
                  <Ionicons
                    name="close"
                    size={14}
                    color={theme.colors.palette.neutral100}
                  />
                </TouchableOpacity>
              </View>
              <Text
                text={contact.name}
                size="small"
                style={styles.contactName}
                numberOfLines={1}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    )
  },
)

export default SelectedContacts

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.palette.neutral100,
      paddingVertical: 12,
      paddingLeft: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    scrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 8,
    },
    contactItem: {
      alignItems: 'center',
      marginHorizontal: 8,
      minWidth: 70,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: 6,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
    },
    avatarPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: theme.colors.palette.neutral800,
      fontSize: 18,
      fontWeight: 'bold',
    },
    removeButton: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.palette.angry200,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral100,
    },
    contactName: {
      color: theme.colors.palette.neutral700,
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '500',
    },
  })
