// Copyright (c) Meta Platforms, Inc. and affiliates.
import { StyleSheet, View, TouchableOpacity, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import {
  useEffect,
  useRef,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from 'react'
import { TextField } from '@/components/TextField'
import { TextInput } from 'react-native-gesture-handler'
import { translate } from '@/i18n'

interface SearchHeaderProps {
  searchQuery: string

  onSearchChange: (text: string) => void
  onMenuPress: () => void
  onFilterPress: () => void
  onFocus?: () => void
  onBlur?: () => void
  focusTextField?: boolean
}

const SearchHeader = forwardRef(
  (
    {
      searchQuery,
      onSearchChange,
      onMenuPress,
      onFilterPress,
      onFocus,
      onBlur,
    }: SearchHeaderProps,
    ref,
  ) => {
    const { theme } = useAppTheme()
    const styles = useMemo(() => createStyles(theme), [theme])
    const searchFieldRef = useRef<TextInput>(null)
    const inputAnimation = useRef(new Animated.Value(0)).current
    const iconRotation = useRef(new Animated.Value(0)).current

    // Expose focusInput method to parent
    useImperativeHandle(ref, () => ({
      focusInput: () => {
        searchFieldRef.current?.focus()
      },
      blurInput: () => {
        searchFieldRef.current?.blur()
      },
    }))

    useEffect(() => {
      Animated.spring(iconRotation, {
        toValue: searchQuery ? 1 : 0,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }).start()
    }, [searchQuery])

    const RightAccessory = useMemo(
      () => (_props: any) => (
        <TouchableOpacity
          onPress={() => searchQuery && onSearchChange('')}
          style={styles.iconContainer}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Animated.View
            style={{
              transform: [
                {
                  rotate: iconRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '90deg'],
                  }),
                },
              ],
            }}
          >
            <Ionicons
              name={searchQuery ? 'close-circle' : 'search'}
              size={20}
              color={theme.colors.textDim}
            />
          </Animated.View>
        </TouchableOpacity>
      ),
      [searchQuery, iconRotation, onSearchChange, theme.colors.textDim],
    )

    return (
      <View style={styles.header}>
        <Animated.View
          style={[
            styles.searchContainer,
            {
              transform: [
                {
                  scale: inputAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.98, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            onPress={onMenuPress}
            style={styles.menuButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <TextField
            ref={searchFieldRef}
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder={translate('emailScreen:search')}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={onFocus}
            onBlur={onBlur}
            containerStyle={styles.textFieldContainer}
            inputWrapperStyle={styles.inputWrapper}
            RightAccessory={RightAccessory}
          />
          <TouchableOpacity
            onPress={onFilterPress}
            style={styles.menuButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="filter-outline"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    )
  },
)

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      marginBottom: spacing.md,
    },
    iconContainer: {
      alignItems: 'center',
      height: 40,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
    },
    inputWrapper: {
      backgroundColor: theme.colors.transparent,
      borderWidth: 0,
      elevation: 0,
      shadowColor: theme.colors.transparent,
    },
    menuButton: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.sm,
    },
    searchContainer: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderColor: theme.colors.palette.neutral300,
      borderRadius: 12,
      borderWidth: 1,
      elevation: 2,
      flexDirection: 'row',
      shadowColor: theme.colors.palette.neutral800,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    textFieldContainer: {
      flex: 1,
    },
  })

export default SearchHeader
