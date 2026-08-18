import { StyleSheet, View, TouchableOpacity, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '@andojo/shared-theme'
import {
  useEffect,
  useRef,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from 'react'
import { TextField } from '@/components/TextField'
import { TextInput } from 'react-native-gesture-handler'

interface SearchHeaderProps {
  searchQuery: string
  onSearchChange: (text: string) => void
  onMenuPress: () => void
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
      onFocus,
      onBlur,
    }: SearchHeaderProps,
    ref,
  ) => {
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
      () => () => (
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
              color={colors.textDim}
            />
          </Animated.View>
        </TouchableOpacity>
      ),
      [searchQuery, iconRotation, onSearchChange],
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
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <TextField
            ref={searchFieldRef}
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Search emails..."
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={onFocus}
            onBlur={onBlur}
            containerStyle={styles.textFieldContainer}
            inputWrapperStyle={styles.inputWrapper}
            RightAccessory={RightAccessory}
          />
        </Animated.View>
      </View>
    )
  },
)

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.palette.neutral300,
    backgroundColor: colors.palette.neutral200,
    shadowColor: colors.palette.neutral800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuButton: {
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textFieldContainer: {
    flex: 1,
  },
  inputWrapper: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    elevation: 0,
  },
  iconContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
})

export default SearchHeader
