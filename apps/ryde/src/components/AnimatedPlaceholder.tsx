// Copyright (c) Meta Platforms, Inc. and affiliates.
import { colors } from '@andojo/shared-theme'
import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

interface AnimatedPlaceholderProps {
  onFocus?: () => void
  style?: any
  containerStyle?: any
}

export function AnimatedPlaceholder({
  onFocus,
  style,
  containerStyle,
}: AnimatedPlaceholderProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current
  const [currentIndex, setCurrentIndex] = useState(0)

  const placeholders = [
    'Search categories...',
    'Search restaurants...',
    'Search menu items...',
    'Search by cuisine...',
  ]

  useEffect(() => {
    let animationTimeout: NodeJS.Timeout

    const startAnimation = () => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.ease,
      }).start(() => {
        // Change text after fade out
        setCurrentIndex(prev => (prev + 1) % placeholders.length)

        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.ease,
        }).start()

        // Schedule next animation
        animationTimeout = setTimeout(startAnimation, 3000)
      })
    }

    // Start the first animation after a delay
    const fadeTimeout = setTimeout(startAnimation, 3000)

    // Cleanup
    return () => {
      clearTimeout(animationTimeout)
      clearTimeout(fadeTimeout)
      fadeAnim.stopAnimation()
    }
  }, [])

  return (
    <View
      testID="animated-placeholder-container"
      style={[styles.container, containerStyle]}
    >
      {onFocus ? (
        <TouchableOpacity
          testID="animated-placeholder-touchable"
          onPress={onFocus}
          activeOpacity={1}
          style={styles.touchable}
        >
          <Animated.Text
            testID="animated-placeholder-text"
            style={[styles.placeholderText, style, { opacity: fadeAnim }]}
          >
            {placeholders[currentIndex]}
          </Animated.Text>
        </TouchableOpacity>
      ) : (
        <Animated.Text
          testID="animated-placeholder-text"
          style={[styles.placeholderText, style, { opacity: fadeAnim }]}
        >
          {placeholders[currentIndex]}
        </Animated.Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  touchable: {
    flex: 1,
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: colors.palette.neutral400,
    backgroundColor: 'transparent',
  },
})
