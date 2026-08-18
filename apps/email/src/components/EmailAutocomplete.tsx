// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, {
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react'
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData,
  TextInputEndEditingEventData,
} from 'react-native'
import { Text } from './Text'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { queries } from '@/db/queries'
import { debounce } from 'lodash'

interface EmailChip {
  email: string
  displayName?: string
}

interface Props {
  value: string

  onChangeText: (text: string) => void
  placeholder?: string
  label?: string
}

const EmailAutocomplete = forwardRef(
  ({ value, onChangeText, placeholder, label }: Props, ref) => {
    const { theme } = useAppTheme()
    const styles = useMemo(() => createStyles(theme), [theme])
    const [suggestions, setSuggestions] = useState<EmailChip[]>([])
    const [chips, setChips] = useState<EmailChip[]>([])
    const [inputValue, setInputValue] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const textInputRef = React.useRef<TextInput>(null)

    useImperativeHandle(ref, () => ({
      focusInput: () => {
        textInputRef.current?.focus()
      },
      blurInput: () => {
        textInputRef.current?.blur()
      },
    }))

    useEffect(() => {
      if (!value) {
        setChips([])
        setInputValue('')
        return
      }

      const newChips = value
        .split(',')
        .map(email => email.trim())
        .filter(Boolean)
        .map(email => ({ email }))

      setChips(newChips)
      setInputValue('')
    }, [value])

    const searchUsers = useCallback(
      debounce(async (searchText: string) => {
        if (!searchText || searchText.length < 2) {
          setSuggestions([])
          return
        }

        try {
          const users = await queries.searchUsers(searchText)
          setSuggestions(
            users.map(user => ({
              email: user.email,
              displayName: user.displayName || undefined,
            })),
          )
        } catch (error) {
          console.error('Failed to search users:', error)
          setSuggestions([])
        }
      }, 300),
      [],
    )

    const handleInputChange = (text: string) => {
      setInputValue(text)

      // If text ends with comma or semicolon, add as chip
      if (text.endsWith(',') || text.endsWith(';')) {
        const email = text.slice(0, -1).trim()
        if (email && isValidEmail(email)) {
          addChip(email)
          return
        }
      }

      searchUsers(text)
    }

    const isValidEmail = (email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    }

    const addChip = (email: string, displayName?: string) => {
      const newChips = [...chips, { email, displayName }]
      setChips(newChips)
      setInputValue('')
      setSuggestions([])

      const emailsString = newChips.map(chip => chip.email).join(', ')
      onChangeText(emailsString)
    }

    const removeChip = (index: number) => {
      const newChips = chips.filter((_, i) => i !== index)
      setChips(newChips)

      const emailsString = newChips.map(chip => chip.email).join(', ')
      onChangeText(emailsString)
    }

    const handleSuggestionPress = (suggestion: EmailChip) => {
      addChip(suggestion.email, suggestion.displayName)
    }

    const handleSubmitEditing = (
      e: NativeSyntheticEvent<TextInputSubmitEditingEventData>,
    ) => {
      const email = e.nativeEvent.text.trim()
      if (email && isValidEmail(email)) {
        addChip(email)
      }
    }

    const handleEndEditing = (
      e: NativeSyntheticEvent<TextInputEndEditingEventData>,
    ) => {
      const email = e.nativeEvent.text.trim()
      if (email && isValidEmail(email)) {
        addChip(email)
      }
    }

    const handleFocus = () => {
      setIsFocused(true)
    }

    const handleBlur = () => {
      setTimeout(() => {
        setIsFocused(false)
        setSuggestions([])
      }, 200)
    }

    return (
      <View style={styles.container}>
        {label && <Text text={label} preset="formLabel" style={styles.label} />}

        <View style={styles.inputContainer}>
          <View style={styles.chipsContainer}>
            {chips.map((chip, index) => (
              <View key={`${chip.email}-${index}`} style={styles.chip}>
                <Text
                  text={chip.displayName || chip.email}
                  style={styles.chipText}
                  numberOfLines={1}
                />
                <TouchableOpacity
                  onPress={() => removeChip(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text text="×" style={styles.chipRemove} />
                </TouchableOpacity>
              </View>
            ))}

            <TextInput
              ref={textInputRef}
              value={inputValue}
              onChangeText={handleInputChange}
              onSubmitEditing={handleSubmitEditing}
              onEndEditing={handleEndEditing}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={chips.length === 0 ? placeholder : ''}
              placeholderTextColor={theme.colors.textDim}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              blurOnSubmit={false}
            />
          </View>
        </View>

        {isFocused && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.suggestionsList}
            >
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={`${suggestion.email}-${index}`}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionPress(suggestion)}
                >
                  <Text
                    text={suggestion.displayName || suggestion.email}
                    style={styles.suggestionText}
                  />
                  {suggestion.displayName && (
                    <Text
                      text={suggestion.email}
                      style={styles.suggestionEmail}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    )
  },
)

EmailAutocomplete.displayName = 'EmailAutocomplete'

export default EmailAutocomplete

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    chip: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.primary100,
      borderRadius: 16,
      flexDirection: 'row',
      marginBottom: spacing.xs,
      marginRight: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    chipRemove: {
      color: theme.colors.palette.primary500,
      fontSize: 20,
      fontWeight: 'bold',
      marginLeft: 4,
    },
    chipText: {
      color: theme.colors.palette.primary500,
      fontSize: 14,
      maxWidth: 150,
    },
    chipsContainer: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: spacing.xs,
    },
    container: {
      flex: 1,
    },
    input: {
      color: theme.colors.text,
      flex: 1,
      fontSize: 16,
      minWidth: 100,
      paddingVertical: 4,
    },
    inputContainer: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 8,
      minHeight: 40,
    },
    label: {
      marginBottom: spacing.xs,
    },
    suggestionEmail: {
      color: theme.colors.textDim,
      fontSize: 12,
    },
    suggestionItem: {
      borderBottomColor: theme.colors.separator,
      borderBottomWidth: 1,
      padding: spacing.sm,
    },
    suggestionText: {
      color: theme.colors.text,
      fontSize: 16,
    },
    suggestionsContainer: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.separator,
      borderRadius: 8,
      borderWidth: 1,
      elevation: 3,
      marginTop: spacing.xs,
      maxHeight: 200,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    suggestionsList: {
      maxHeight: 200,
    },
  })
