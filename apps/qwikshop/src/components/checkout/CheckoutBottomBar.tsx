// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useRef, useState, useMemo } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'

const { width: screenWidth } = Dimensions.get('window')

interface CheckoutBottomBarProps {
  paddingBottom: number
  currentStep: number
  isPlacingOrder: boolean
  cartItemCount: number
  cartSavings: number
  totalAmount: number
  selectedAddress: any
  selectedPaymentMethod: any
  onContinue: () => void
}

interface SlideToSubmitButtonProps {
  onContinue: () => void
  isDisabled: boolean
  isPlacingOrder: boolean
  currentStep: number
  theme: Theme
  styles: any
}

const SlideToSubmitButton: React.FC<SlideToSubmitButtonProps> = ({
  onContinue,
  isDisabled,
  isPlacingOrder,
  currentStep,
  theme,
  styles,
}) => {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const slideAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const maxSlideDistance = screenWidth * 0.75 // 80% of button width

  React.useEffect(() => {
    if (!isDisabled && !isPlacingOrder && !isSubmitted) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
        ]),
      )
      pulse.start()
      return () => pulse.stop()
    } else {
      pulseAnim.setValue(1) // Reset pulse when disabled
    }
  }, [isDisabled, isPlacingOrder, isSubmitted])

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return !isDisabled && !isPlacingOrder && Math.abs(gestureState.dx) > 5
      },
      onPanResponderGrant: () => {
        slideAnim.setOffset((slideAnim as any)._value)
        slideAnim.setValue(0)
        // Haptic feedback on start
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0 && gestureState.dx <= maxSlideDistance) {
          slideAnim.setValue(gestureState.dx)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        slideAnim.flattenOffset()

        // If slid far enough (70% of max distance), complete the action
        if (gestureState.dx > maxSlideDistance * 0.7) {
          setIsSubmitted(true)

          // Success haptic feedback
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

          // Complete the slide animation to the full distance
          Animated.timing(slideAnim, {
            toValue: maxSlideDistance,
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            // Trigger the action after animation completes
            setTimeout(() => {
              onContinue()
              // Reset after action is triggered
              setTimeout(() => {
                setIsSubmitted(false)
                Animated.timing(slideAnim, {
                  toValue: 0,
                  duration: 500,
                  useNativeDriver: false,
                }).start()
              }, 1500)
            }, 200)
          })
        } else {
          // Slide back to start
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: false,
            tension: 100,
            friction: 8,
          }).start()
        }
      },
    }),
  ).current

  const getButtonColors = () => {
    if (isPlacingOrder) {
      return [theme.colors.palette.warning400, theme.colors.palette.warning500]
    }
    if (currentStep === 3) {
      return [theme.colors.palette.success500, theme.colors.palette.success600]
    }
    return [theme.colors.palette.accent500, theme.colors.palette.accent600]
  }

  const slideProgress = slideAnim.interpolate({
    inputRange: [0, maxSlideDistance],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const arrowOpacity = slideAnim.interpolate({
    inputRange: [0, maxSlideDistance * 0.3, maxSlideDistance * 0.7],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  })

  const checkOpacity = slideAnim.interpolate({
    inputRange: [
      0,
      maxSlideDistance * 0.3,
      maxSlideDistance * 0.7,
      maxSlideDistance,
    ],
    outputRange: [0, 0, 0.5, 1],
    extrapolate: 'clamp',
  })

  const buttonScale = slideAnim.interpolate({
    inputRange: [0, maxSlideDistance * 0.7, maxSlideDistance],
    outputRange: [1, 1.1, 1.2],
    extrapolate: 'clamp',
  })

  return (
    <View
      style={[
        styles.slideContainer,
        isDisabled && styles.checkoutButtonDisabled,
      ]}
    >
      <LinearGradient colors={getButtonColors()} style={styles.slideTrack}>
        {isPlacingOrder ? (
          <View style={styles.processingContainer}>
            <Animated.View style={styles.loadingSpinner}>
              <Ionicons name="sync" size={18} color="#FFF" />
            </Animated.View>
            <Text style={styles.processingText}>Processing Order...</Text>
          </View>
        ) : (
          <>
            {/* Progress fill */}
            <Animated.View
              style={[
                styles.slideTrackFill,
                {
                  transform: [{ scaleX: slideProgress }],
                  transformOrigin: 'left',
                },
              ]}
            />

            {/* Button text */}
            <View style={styles.slideTextContainer}>
              <Text style={styles.slideMainText}>
                {isSubmitted ? 'Processing...' : 'Slide to Complete Purchase'}
              </Text>
              <Text style={styles.slideSubText}>
                {isSubmitted
                  ? 'Please wait...'
                  : 'Swipe right to confirm your order'}
              </Text>
            </View>

            {/* Slide button */}
            <Animated.View
              style={[
                styles.slideButton,
                {
                  transform: [
                    { translateX: slideAnim },
                    { scale: isSubmitted ? buttonScale : pulseAnim },
                  ],
                },
              ]}
              {...panResponder.panHandlers}
            >
              <LinearGradient
                colors={[
                  `${theme.colors.palette.neutral100 || '#FFFFFF'}E6`,
                  `${theme.colors.palette.neutral100 || '#FFFFFF'}B3`,
                ]}
                style={styles.slideButtonInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Animated.View style={{ opacity: arrowOpacity }}>
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={theme.colors.palette.success600}
                  />
                </Animated.View>
                <Animated.View
                  style={[styles.checkIcon, { opacity: checkOpacity }]}
                >
                  <Ionicons
                    name="checkmark"
                    size={24}
                    color={theme.colors.palette.success600}
                  />
                </Animated.View>
              </LinearGradient>
            </Animated.View>
          </>
        )}
      </LinearGradient>
    </View>
  )
}

export const CheckoutBottomBar: React.FC<CheckoutBottomBarProps> = ({
  paddingBottom,
  currentStep,
  isPlacingOrder,
  cartItemCount,
  cartSavings,
  totalAmount,
  selectedAddress,
  selectedPaymentMethod,
  onContinue,
}) => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const isDisabled =
    isPlacingOrder ||
    (currentStep === 1 && !selectedAddress) ||
    (currentStep === 2 && !selectedPaymentMethod) ||
    (currentStep === 3 && (!selectedAddress || !selectedPaymentMethod))

  return (
    <View
      style={[styles.bottomBarContainer, { paddingBottom: paddingBottom + 15 }]}
    >
      <LinearGradient
        colors={[
          `${theme.colors.palette.neutral100 || '#FFFFFF'}FA`,
          `${theme.colors.palette.neutral100 || '#FFFFFF'}F5`,
        ]}
        style={styles.bottomBar}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Order Summary Preview */}
        <View style={styles.orderSummaryPreview}>
          <View style={styles.summaryPreviewLeft}>
            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCountText}>{cartItemCount}</Text>
            </View>
            <View>
              <Text style={styles.summaryPreviewLabel}>Order Total</Text>
              <Text style={styles.summaryPreviewAmount}>
                ${totalAmount.toFixed(2)}
              </Text>
            </View>
          </View>

          {cartSavings > 0 && (
            <View style={styles.savingsPreview}>
              <Text style={styles.savingsPreviewText}>
                You save ${cartSavings.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {/* Enhanced Action Button - Slide to Submit only for final step */}
        {currentStep === 3 ? (
          <SlideToSubmitButton
            onContinue={onContinue}
            isDisabled={isDisabled}
            isPlacingOrder={isPlacingOrder}
            currentStep={currentStep}
            theme={theme}
            styles={styles}
          />
        ) : (
          <TouchableOpacity
            style={[
              styles.regularCheckoutButton,
              isDisabled && styles.checkoutButtonDisabled,
            ]}
            onPress={onContinue}
            disabled={isDisabled}
          >
            <LinearGradient
              colors={[
                theme.colors.palette.accent500,
                theme.colors.palette.accent600,
              ]}
              style={styles.regularButtonGradient}
            >
              <View style={styles.buttonContent}>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonMainText}>
                    Continue to Next Step
                  </Text>
                  <Text style={styles.buttonSubText}>
                    {currentStep === 1
                      ? 'Choose payment method'
                      : 'Review your order'}
                  </Text>
                </View>
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="chevron-forward" size={20} color="#FFF" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    bottomBarContainer: {
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    bottomBar: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    orderSummaryPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    summaryPreviewLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    itemCountBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.palette.primary500,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemCountText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    summaryPreviewLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
      marginBottom: 2,
    },
    summaryPreviewAmount: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.palette.neutral800,
    },
    savingsPreview: {
      backgroundColor: theme.colors.palette.success100,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 12,
    },
    savingsPreviewText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.success700,
    },

    // Regular Button Styles (Steps 1 & 2)
    regularCheckoutButton: {
      borderRadius: 20,
      shadowColor: theme.colors.palette.accent500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    regularButtonGradient: {
      borderRadius: 20,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      minHeight: 56,
      justifyContent: 'center',
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    buttonTextContainer: {
      flex: 1,
    },
    buttonMainText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 2,
    },
    buttonSubText: {
      fontSize: 12,
      fontWeight: '500',
      color: 'rgba(255, 255, 255, 0.8)',
    },
    buttonIconContainer: {
      marginLeft: spacing.sm,
    },

    // Slide to Submit Button Styles (Step 3)
    slideContainer: {
      borderRadius: 20,
      shadowColor: theme.colors.palette.success500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    slideTrack: {
      height: 64,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    slideTrackFill: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      right: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 20,
    },
    slideTextContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    slideMainText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 2,
      textAlign: 'center',
    },
    slideSubText: {
      fontSize: 12,
      fontWeight: '500',
      color: 'rgba(255, 255, 255, 0.8)',
      textAlign: 'center',
    },
    slideButton: {
      position: 'absolute',
      left: 8,
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    slideButtonInner: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkIcon: {
      position: 'absolute',
    },

    // Processing State
    processingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    processingText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    loadingSpinner: {
      marginRight: spacing.xs,
    },

    // Shared Styles
    checkoutButtonDisabled: {
      opacity: 0.6,
    },
  })
