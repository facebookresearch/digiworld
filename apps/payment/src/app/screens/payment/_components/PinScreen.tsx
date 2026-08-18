// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Text } from '@/components'
import { colors } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { memo, useCallback, useEffect, useRef } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native'
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated'

interface PinScreenProps {
  pin: string

  onPinChange: (value: string) => void
  onBack: () => void
  onContinue: () => void
  isLoading: boolean
  type?: 'deposit' | 'withdrawal'
}

interface PinInputProps {
  value: string

  onChangePin: (value: string) => void
  maxLength?: number
  type?: 'deposit' | 'withdrawal'
}

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity)

const PinInput = memo<PinInputProps>(
  ({ value, onChangePin, maxLength = 4, type = 'deposit' }) => {
    const gradientColors =
      type === 'deposit'
        ? ([colors.palette.primary400, colors.palette.primary500] as [
            string,
            string,
          ])
        : ([colors.palette.angry300, colors.palette.angry400] as [
            string,
            string,
          ])

    const inputRef = useRef<TextInput>(null)
    const scale = useSharedValue(1)
    const shake = useSharedValue(0)

    const focusInput = useCallback(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        scale.value = withSequence(withSpring(0.95), withSpring(1))
      }
    }, [])

    useEffect(() => {
      if (value.length === maxLength) {
        scale.value = withSequence(withSpring(1.05), withSpring(1))
        Vibration.vibrate(40)
      }
    }, [value])

    const containerStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: scale.value },
        { translateX: withSpring(shake.value) },
      ],
    }))

    return (
      <AnimatedTouchableOpacity
        style={[styles.pinContainer, containerStyle]}
        activeOpacity={0.8}
        onPress={focusInput}
      >
        <View style={styles.pinDotsContainer}>
          {[...Array(maxLength)].map((_, index) => {
            const isFilled = value[index]
            const isActive = value.length === index

            return (
              <LinearGradient
                key={index}
                colors={
                  isFilled
                    ? gradientColors
                    : ['rgba(7, 6, 6, 0.1)', 'rgba(255,255,255,0.05)']
                }
                style={[
                  styles.pinDigit,
                  isFilled && styles.pinDigitFilled,
                  isActive && styles.pinDigitActive,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isFilled && <View style={styles.pinDot} />}
              </LinearGradient>
            )
          })}
        </View>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangePin}
          maxLength={maxLength}
          keyboardType="numeric"
          style={styles.hiddenPinInput}
          autoFocus
          secureTextEntry
        />
      </AnimatedTouchableOpacity>
    )
  },
)

PinInput.displayName = 'PinInput'

export const PinScreen = memo<PinScreenProps>(
  ({ pin, onPinChange, onBack, onContinue, isLoading, type = 'deposit' }) => {
    const titleOpacity = useSharedValue(0)
    const cardScale = useSharedValue(0.95)
    const gradientColors =
      type === 'deposit'
        ? ([colors.palette.primary400, colors.palette.primary500] as [
            string,
            string,
          ])
        : ([colors.palette.angry300, colors.palette.angry400] as [
            string,
            string,
          ])

    useEffect(() => {
      titleOpacity.value = withSpring(1)
      cardScale.value = withSpring(1)
    }, [])

    const titleStyle = useAnimatedStyle(() => ({
      opacity: titleOpacity.value,
      transform: [
        {
          translateY: interpolate(
            titleOpacity.value,
            [0, 1],
            [-20, 0],
            Extrapolate.CLAMP,
          ),
        },
      ],
    }))

    const cardStyle = useAnimatedStyle(() => ({
      transform: [{ scale: cardScale.value }],
    }))

    return (
      <View style={styles.contentContainer}>
        <View style={styles.topSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[
                colors.palette.neutral900 + '20',
                colors.palette.neutral700 + '10',
              ]}
              style={styles.backButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={colors.palette.neutral900}
              />
            </LinearGradient>
          </TouchableOpacity>

          <Animated.View style={[styles.headerTextContainer, titleStyle]}>
            <Text
              text="Enter PIN"
              preset="heading"
              style={styles.headerTitle}
            />
            <Text
              text="Please enter your security PIN"
              size="sm"
              style={styles.headerSubtitle}
            />
          </Animated.View>
        </View>

        <Animated.View style={[styles.mainContent, cardStyle]}>
          <View style={styles.pinSection}>
            <View style={styles.pinInputWrapper}>
              <PinInput
                value={pin}
                type={type}
                onChangePin={onPinChange}
                maxLength={4}
              />
              <Text
                text="This is help us verify your identitiy."
                size="xs"
                style={styles.pinDescription}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                pin.length !== 4 && styles.disabledButton,
              ]}
              onPress={onContinue}
              disabled={pin.length !== 4 || isLoading}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={gradientColors}
                style={styles.confirmButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isLoading ? (
                  <ActivityIndicator
                    color={colors.palette.neutral100}
                    size="small"
                  />
                ) : (
                  <Text
                    text="Confirm PIN"
                    style={styles.confirmButtonText}
                    weight="bold"
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    )
  },
)

PinScreen.displayName = 'PinScreen'

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
  topSection: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  headerTextContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  headerTitle: {
    color: colors.palette.neutral900,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: colors.palette.neutral700,
    fontSize: 16,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  backButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainContent: {
    backgroundColor: colors.palette.neutral100,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  pinSection: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 34,
  },
  pinInputWrapper: {
    alignItems: 'center',
    marginBottom: 32,
  },
  pinContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  pinDigit: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.palette.neutral700 + '80',
    borderWidth: 1,
    borderColor: colors.palette.neutral600,
  },
  pinDigitFilled: {
    backgroundColor: colors.palette.primary500 + '20',
    borderColor: colors.palette.primary400,
  },
  pinDigitActive: {
    borderColor: colors.palette.primary300,
    borderWidth: 2,
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.palette.primary400,
  },
  hiddenPinInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  pinDescription: {
    color: colors.palette.neutral400,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  confirmButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 'auto',
  },
  confirmButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  confirmButtonText: {
    color: colors.palette.neutral100,
    fontSize: 17,
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.5,
  },
})

export default PinScreen
