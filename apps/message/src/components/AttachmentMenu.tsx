import React, { useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme, type Theme, metrics, Text } from '@andojo/shared-theme'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'

interface AttachmentMenuProps {
  visible: boolean
  onClose: () => void
  onOptionSelect: (type: string) => void
  variant?: 'modal' | 'floating'
}

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({
  visible,
  onClose,
  onOptionSelect,
  variant = 'floating',
}) => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const menuProgress = useSharedValue(0)

  React.useEffect(() => {
    if (visible) {
      menuProgress.value = withTiming(1, { duration: 200 })
    } else {
      menuProgress.value = withTiming(0, { duration: 200 })
    }
  }, [visible])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: menuProgress.value,
    transform: [
      {
        translateY: (1 - menuProgress.value) * 20,
      },
    ],
  }))

  const handleOptionPress = (type: string) => {
    onOptionSelect(type)
    onClose()
  }

  if (variant === 'modal') {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View style={[styles.modalAttachmentMenu, animatedStyle]}>
            <View style={styles.attachmentGrid}>
              {/* Document */}
              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={() => handleOptionPress('document')}
              >
                <View
                  style={[
                    styles.attachmentIcon,
                    { backgroundColor: theme.colors.palette.primary500 },
                  ]}
                >
                  <Ionicons
                    name="document"
                    size={24}
                    color={theme.colors.palette.neutral100}
                  />
                </View>
                <Text
                  text="Document"
                  size="small"
                  style={styles.attachmentLabel}
                />
              </TouchableOpacity>

              {/* Camera */}
              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={() => handleOptionPress('camera')}
              >
                <View
                  style={[
                    styles.attachmentIcon,
                    { backgroundColor: theme.colors.palette.accent400 },
                  ]}
                >
                  <Ionicons
                    name="camera"
                    size={24}
                    color={theme.colors.palette.neutral100}
                  />
                </View>
                <Text
                  text="Camera"
                  size="small"
                  style={styles.attachmentLabel}
                />
              </TouchableOpacity>

              {/* Gallery */}
              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={() => handleOptionPress('image')}
              >
                <View
                  style={[
                    styles.attachmentIcon,
                    { backgroundColor: theme.colors.palette.secondary500 },
                  ]}
                >
                  <Ionicons
                    name="images"
                    size={24}
                    color={theme.colors.palette.neutral100}
                  />
                </View>
                <Text
                  text="Gallery"
                  size="small"
                  style={styles.attachmentLabel}
                />
              </TouchableOpacity>

              {/* Audio */}
              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={() => handleOptionPress('audio')}
              >
                <View
                  style={[
                    styles.attachmentIcon,
                    { backgroundColor: theme.colors.palette.success500 },
                  ]}
                >
                  <Ionicons
                    name="musical-notes"
                    size={24}
                    color={theme.colors.palette.neutral100}
                  />
                </View>
                <Text
                  text="Audio"
                  size="small"
                  style={styles.attachmentLabel}
                />
              </TouchableOpacity>

              {/* Location */}
              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={() => handleOptionPress('location')}
              >
                <View
                  style={[
                    styles.attachmentIcon,
                    { backgroundColor: theme.colors.palette.angry500 },
                  ]}
                >
                  <Ionicons
                    name="location"
                    size={24}
                    color={theme.colors.palette.neutral100}
                  />
                </View>
                <Text
                  text="Location"
                  size="small"
                  style={styles.attachmentLabel}
                />
              </TouchableOpacity>

              {/* Contact */}
              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={() => handleOptionPress('contact')}
              >
                <View
                  style={[
                    styles.attachmentIcon,
                    { backgroundColor: theme.colors.palette.secondary500 },
                  ]}
                >
                  <Ionicons
                    name="person"
                    size={24}
                    color={theme.colors.palette.neutral100}
                  />
                </View>
                <Text
                  text="Contact"
                  size="small"
                  style={styles.attachmentLabel}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    )
  }

  // Floating variant
  if (!visible) {
    return null
  }

  return (
    <>
      {/* Backdrop for floating variant */}
      <TouchableOpacity
        style={styles.floatingMenuBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[styles.floatingAttachmentMenu, animatedStyle]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <View style={styles.floatingMenuContent}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons
              name="close"
              size={16}
              color={theme.colors.palette.neutral600}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.floatingMenuItem}
            onPress={() => handleOptionPress('camera')}
          >
            <View style={styles.floatingMenuIcon}>
              <Ionicons
                name="camera"
                size={20}
                color={theme.colors.palette.primary500}
              />
            </View>
            <Text text="Camera" size="small" style={styles.floatingMenuText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.floatingMenuItem}
            onPress={() => handleOptionPress('image')}
          >
            <View style={styles.floatingMenuIcon}>
              <Ionicons
                name="images"
                size={20}
                color={theme.colors.palette.primary500}
              />
            </View>
            <Text text="Gallery" size="small" style={styles.floatingMenuText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.floatingMenuItem}
            onPress={() => handleOptionPress('video')}
          >
            <View style={styles.floatingMenuIcon}>
              <Ionicons
                name="videocam"
                size={20}
                color={theme.colors.palette.primary500}
              />
            </View>
            <Text text="Video" size="small" style={styles.floatingMenuText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.floatingMenuItem}
            onPress={() => handleOptionPress('audio')}
          >
            <View style={styles.floatingMenuIcon}>
              <Ionicons
                name="musical-notes"
                size={20}
                color={theme.colors.palette.primary500}
              />
            </View>
            <Text text="Audio" size="small" style={styles.floatingMenuText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.floatingMenuItem}
            onPress={() => handleOptionPress('document')}
          >
            <View style={styles.floatingMenuIcon}>
              <Ionicons
                name="document"
                size={20}
                color={theme.colors.palette.primary500}
              />
            </View>
            <Text
              text="Document"
              size="small"
              style={styles.floatingMenuText}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // Modal styles
    modalOverlay: {
      backgroundColor: theme.colors.palette.neutral900 + '90',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalAttachmentMenu: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
      padding: metrics.medium,
      width: '80%',
      alignItems: 'center',
    },
    attachmentGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-around',
      width: '100%',
      marginTop: metrics.small,
    },
    attachmentOption: {
      width: '30%',
      alignItems: 'center',
      marginVertical: metrics.small,
    },
    attachmentIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: metrics.tiny,
    },
    attachmentLabel: {
      textAlign: 'center',
    },

    // Floating styles
    floatingMenuBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'transparent',
      zIndex: 999,
    },
    floatingAttachmentMenu: {
      position: 'absolute',
      bottom: 100,
      left: metrics.medium,
      right: metrics.medium,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
      paddingHorizontal: metrics.small,
      paddingVertical: metrics.small,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      zIndex: 1000,
    },
    floatingMenuContent: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      gap: metrics.tiny,
    },
    floatingMenuItem: {
      alignItems: 'center',
      paddingVertical: metrics.tiny,
      paddingHorizontal: metrics.tiny,
      borderRadius: metrics.borderRadiusMedium,
      minWidth: 50,
    },
    floatingMenuIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: metrics.tiny,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    floatingMenuText: {
      color: theme.colors.palette.neutral800,
      textAlign: 'center',
    },
    closeButton: {
      position: 'absolute',
      top: metrics.small,
      right: metrics.small,
      zIndex: 1,
    },
  })

export default AttachmentMenu
