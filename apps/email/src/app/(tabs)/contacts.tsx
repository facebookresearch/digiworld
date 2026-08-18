import { ListItem, ListView, Screen, Text } from '@/components'
import { translate } from '@/i18n/translate'
import { useStores } from '@/models'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { metrics, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'

interface Contact {
  id: string
  name: string
  email: string
  image: string
  lastInteraction?: string
  favorite?: boolean
}

// Mock data for contacts
const ALL_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    image: 'https://i.pravatar.cc/150?img=1',
    lastInteraction: '2 days ago',
    favorite: true,
  },
  {
    id: '2',
    name: 'Sarah Smith',
    email: 'sarah.smith@example.com',
    image: 'https://i.pravatar.cc/150?img=3',
    lastInteraction: '1 week ago',
    favorite: true,
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike.j@example.com',
    image: 'https://i.pravatar.cc/150?img=5',
    lastInteraction: 'Yesterday',
  },
  {
    id: '4',
    name: 'Emma Wilson',
    email: 'emma.w@example.com',
    image: 'https://i.pravatar.cc/150?img=6',
    lastInteraction: '3 days ago',
  },
  {
    id: '5',
    name: 'Alex Brown',
    email: 'alex.b@example.com',
    image: 'https://i.pravatar.cc/150?img=7',
    lastInteraction: '1 hour ago',
  },
  {
    id: '6',
    name: 'Lisa Chen',
    email: 'lisa.chen@example.com',
    image: 'https://i.pravatar.cc/150?img=9',
    lastInteraction: '3 hours ago',
  },
  {
    id: '7',
    name: 'David Kim',
    email: 'david.k@example.com',
    image: 'https://i.pravatar.cc/150?img=10',
    lastInteraction: '5 hours ago',
  },
]

export default function ContactsScreen() {
  const { theme } = useAppTheme()
  const styles = createStyles(theme)
  const { trackScreenMount, trackClick, trackTextChange } =
    useInteractionTracking('Contacts', '/(tabs)/contacts')
  const [searchQuery, setSearchQuery] = useState('')
  const { sessionStore } = useStores()
  const { sessionTimeStamp } = useLocalSearchParams()
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    setTimeout(() => {
      trackScreenMount({
        searchQuery,
        time: Date.now(),
      })
    }, 1000)
  }, [trackScreenMount, searchQuery])

  const handleContactPress = useCallback(
    (contactId: string) => {
      trackClick(`${contactId}-button`)
    },
    [trackClick],
  )
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        screen: 'contacts',
        route: '/(tabs)/contacts',
      })
    }, [trackScreenMount]),
  )

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return ALL_CONTACTS
    const query = searchQuery.toLowerCase()
    return ALL_CONTACTS.filter(
      contact =>
        contact.name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query),
    )
  }, [searchQuery])

  const favoriteContacts = useMemo(
    () => filteredContacts.filter(contact => contact.favorite),
    [filteredContacts],
  )

  const renderContactItem = ({ item: contact }: { item: Contact }) => (
    <TouchableOpacity onPress={() => handleContactPress(contact.id)}>
      <ListItem
        LeftComponent={
          <LinearGradient
            colors={[
              theme.colors.palette.primary400,
              theme.colors.palette.secondary400,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarContainer}
          >
            <Text style={[styles.avatarText, { color: theme.colors.text }]}>
              {contact.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()}
            </Text>
          </LinearGradient>
        }
        text={contact.name}
        RightComponent={
          contact.favorite ? (
            <Ionicons
              name="star"
              size={20}
              color={theme.colors.palette.primary500}
            />
          ) : undefined
        }
        TextProps={{
          children: contact.email,
          style: styles.emailText,
        }}
        containerStyle={styles.contactItem}
        textStyle={styles.contactText}
      />
    </TouchableOpacity>
  )

  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession()

      if (session?.data) {
        const formData: any = session.data.sessionData.formData
        if (formData?.searchQuery) {
          setSearchQuery(formData.searchQuery)
          trackTextChange('searchQuery', formData.searchQuery)
          inputRef.current?.focus()
        } else {
          setSearchQuery('')
          trackTextChange('searchQuery', '')
          inputRef.current?.blur()
        }
      }
    }
  }, [sessionTimeStamp, sessionStore])

  return (
    <Screen preset="fixed" contentContainerStyle={styles.container}>
      <Text
        text={translate('contactsScreen:contacts')}
        size="xxl"
        weight="bold"
        style={styles.title}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={theme.colors.textDim}
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder={translate('contactsScreen:search')}
          placeholderTextColor={theme.colors.textDim}
          value={searchQuery}
          onChangeText={text => {
            setSearchQuery(text)
            trackTextChange('searchQuery', text)
          }}
          autoCapitalize="none"
          allowFontScaling={false}
        />
        {searchQuery ? (
          <TouchableOpacity
            onPress={() => {
              trackClick('clearSearchButton')
              trackTextChange('searchQuery', '')
              setSearchQuery('')
            }}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={theme.colors.textDim}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Favorites Section */}
      {favoriteContacts.length > 0 && !searchQuery && (
        <>
          <Text
            text={translate('contactsScreen:favorites')}
            size="lg"
            weight="bold"
            style={styles.sectionTitle}
          />
          <View style={styles.favoritesContainer}>
            {favoriteContacts.map(contact => (
              <TouchableOpacity
                key={contact.id}
                style={styles.favoriteItem}
                onPress={() => handleContactPress(contact.id)}
              >
                <LinearGradient
                  colors={[
                    theme.colors.palette.primary400,
                    theme.colors.palette.secondary400,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarContainer}
                >
                  <Text style={styles.avatarText}>
                    {contact.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()}
                  </Text>
                </LinearGradient>

                <Text
                  text={contact.name}
                  size="sm"
                  style={styles.favoriteName}
                />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* All Contacts List */}
      <Text
        text={
          searchQuery
            ? translate('contactsScreen:searchResult')
            : translate('contactsScreen:allContacts')
        }
        size="lg"
        weight="bold"
        style={styles.sectionTitle}
      />
      <View style={styles.listContainer}>
        <ListView
          data={filteredContacts}
          renderItem={renderContactItem}
          estimatedItemSize={70}
          extraData={theme}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text
              text={translate('contactsScreen:empty')}
              size="md"
              style={styles.emptyText}
            />
          }
        />
      </View>
    </Screen>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    contactItem: {
      paddingVertical: 8,
    },
    contactText: {
      color: theme.colors.text,
      fontSize: 16,
    },
    container: {
      flex: 1,
      padding: 20,
    },
    emailText: {
      color: theme.colors.textDim,
      fontSize: 14,
    },
    emptyText: {
      color: theme.colors.textDim,
      marginTop: 20,
      textAlign: 'center',
    },
    favoriteItem: {
      alignItems: 'center',
      marginBottom: 12,
      marginRight: 12,
      width: 80,
    },
    favoriteName: {
      textAlign: 'center',
    },
    favoritesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 20,
    },
    listContainer: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      flex: 1,
      padding: 12,
    },
    searchContainer: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      borderWidth: 0.5,
      flexDirection: 'row',
      marginBottom: 20,
      paddingHorizontal: 12,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      color: theme.colors.text,
      flex: 1,
      fontSize: 16,
      height: 44,
    },
    sectionTitle: {
      marginBottom: 12,
    },
    separator: {
      backgroundColor: theme.colors.palette.neutral300,
      height: 1,
      marginVertical: 4,
    },
    title: {
      fontSize: 40,
      marginBottom: 20,
      marginTop: 40,
    },
    avatarContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: metrics.medium,
    },
    avatarText: {
      fontSize: 24,
      fontWeight: 'bold',
    },
  })
