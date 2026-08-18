import React, { useEffect, useRef, useMemo } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Text } from './Text'
import { useStores } from '@/models'
import { observer } from 'mobx-react-lite'

interface DropdownItem {
  value: string
  label: string
}

interface DropdownItems {
  items: DropdownItem[]
  icon: any
  email: any
  selectedOption: (data: string) => void
}

const DropdownMenu = observer(function DropdownMenu({
  items,
  icon,
  email,
  selectedOption,
}: DropdownItems) {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { uiStore } = useStores()
  const scaleAnim = useRef(new Animated.Value(0)).current
  const emailId = email?.id?.toString() || ''
  const open = uiStore.emailDropdownMenuOpen === emailId

  useEffect(() => {
    if (open) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }).start()
    } else {
      scaleAnim.setValue(0)
    }
  }, [open, scaleAnim])

  const onClose = () => uiStore.setEmailDropdownMenuOpen(null)

  return (
    <View style={styles.menuDropdown}>
      <TouchableOpacity
        onPress={() => {
          uiStore.setEmailDropdownMenuOpen(emailId)
          // trackContentChange({
          //   openDropdown: open,
          //   email,
          // })
        }}
      >
        <Ionicons name={icon} size={14} color={theme.colors.error} />
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade">
        {/* close on backdrop press */}
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={onClose}
          activeOpacity={1}
        >
          <View style={styles.menuItems}>
            <Animated.View
              style={[
                styles.dialog,
                {
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <View style={styles.iconContainer}>
                <View>
                  <Ionicons
                    name="close"
                    size={24}
                    color={theme.colors.palette.primary500}
                    onPress={onClose}
                  />
                </View>
              </View>
              <Text text="Actions" preset="subheading" />
              <View style={styles.dropdownOptions}>
                {items.map(item => (
                  <TouchableOpacity
                    key={item.label}
                    onPress={() => {
                      uiStore.setEmailDropdownMenuOpen(null)
                      selectedOption(item.value)
                    }}
                  >
                    <Text
                      text={item.label}
                      preset="default"
                      style={{ padding: 10 }}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
})

export default DropdownMenu

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    menuDropdown: {
      padding: 10,
      alignItems: 'flex-end',
      position: 'relative',
      flexShrink: 0,
      marginLeft: spacing.xs,
    },
    menuItems: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.overlay50,
      flex: 1,
      justifyContent: 'center',
    },
    dialog: {
      position: 'relative',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      elevation: 5,
      maxWidth: 400,
      padding: spacing.lg,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      width: '80%',
    },
    iconContainer: {
      position: 'absolute',
      right: 15,
      top: 15,
    },
    dropdownOptions: {},
  })
