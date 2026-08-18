import React, {
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react'
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { Text } from './Text'
import { colors, spacing } from '@andojo/shared-theme'
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
          setInputValue('')
          return
        }
      }

      searchUsers(text)
    }

    const addChip = (email: string, displayName?: string) => {
      if (!chips.find(chip => chip.email === email)) {
        const newChips = [...chips, { email, displayName }]
        setChips(newChips)
        onChangeText(getEmailString(newChips))
      }
      setSuggestions([])
      setInputValue('')
    }

    const removeChip = (email: string) => {
      const newChips = chips.filter(chip => chip.email !== email)
      setChips(newChips)
      onChangeText(getEmailString(newChips))
    }

    const getEmailString = (emailChips: EmailChip[]) => {
      return emailChips.map(chip => chip.email).join(', ')
    }

    return (
      <View style={styles.container}>
        {label && <Text preset="formLabel" text={label} style={styles.label} />}
        <View
          style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
          >
            {chips.map(chip => (
              <TouchableOpacity
                key={chip.email}
                style={styles.chip}
                onPress={() => removeChip(chip.email)}
              >
                <Text
                  text={chip.displayName || chip.email}
                  style={styles.chipText}
                />
              </TouchableOpacity>
            ))}
            <TextInput
              ref={textInputRef}
              value={inputValue}
              onChangeText={handleInputChange}
              placeholder={placeholder}
              style={styles.input}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </ScrollView>
        </View>
        {suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map(suggestion => (
              <TouchableOpacity
                key={suggestion.email}
                style={styles.suggestionItem}
                onPress={() =>
                  addChip(suggestion.email, suggestion.displayName)
                }
              >
                <Text
                  text={suggestion.displayName || suggestion.email}
                  style={styles.suggestionText}
                />
                <Text text={suggestion.email} style={styles.suggestionEmail} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    )
  },
)

EmailAutocomplete.displayName = 'EmailAutocomplete'

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    marginBottom: spacing.xs,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: colors.palette.neutral300,
    borderRadius: 8,
    minHeight: 40,
  },
  inputContainerFocused: {
    borderColor: colors.palette.primary500,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.xs,
  },
  input: {
    flex: 1,
    minWidth: 100,
    color: colors.text,
    fontSize: 16,
    padding: spacing.xxs,
  },
  chip: {
    backgroundColor: colors.palette.primary100,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  chipText: {
    color: colors.palette.primary500,
    fontSize: 14,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.palette.neutral300,
    maxHeight: 200,
    zIndex: 1000,
  },
  suggestionItem: {
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.palette.neutral300,
  },
  suggestionText: {
    fontSize: 14,
  },
  suggestionEmail: {
    fontSize: 12,
    color: colors.textDim,
  },
})

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default EmailAutocomplete
