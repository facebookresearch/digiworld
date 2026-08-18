import React, { useEffect, useRef, useMemo } from 'react'
import { View, StyleSheet, Animated } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { type Theme } from '@andojo/shared-theme'
import { useAppTheme } from '@andojo/shared-theme'

interface AnimatedBackgroundProps {
  children?: React.ReactNode
  animate?: boolean
}

/**
 * Reusable animated background with gradient and floating orbs
 * Automatically adapts to light/dark theme
 */
export function AnimatedBackground({
  children,
  animate = false, // Disabled by default for performance
}: AnimatedBackgroundProps) {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const orb1Anim = useRef(new Animated.Value(0)).current
  const orb2Anim = useRef(new Animated.Value(0)).current
  const orb3Anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!animate) return

    // Subtle floating animation for orbs
    const createFloatingAnimation = (
      animValue: Animated.Value,
      duration: number,
      delay: number,
    ) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ]),
      )
    }

    const animations = Animated.parallel([
      createFloatingAnimation(orb1Anim, 8000, 0),
      createFloatingAnimation(orb2Anim, 10000, 1000),
      createFloatingAnimation(orb3Anim, 12000, 2000),
    ])

    animations.start()

    return () => {
      animations.stop()
    }
  }, [animate, orb1Anim, orb2Anim, orb3Anim])

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.primary100,
          theme.colors.palette.primary200,
          theme.colors.palette.secondary100,
        ]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.orbsContainer}>
          {animate ? (
            <>
              <Animated.View
                style={[
                  styles.orb,
                  styles.orb1,
                  {
                    opacity: orb1Anim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.15, 0.2, 0.15],
                    }),
                    transform: [
                      {
                        translateY: orb1Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 20],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.orb,
                  styles.orb2,
                  {
                    opacity: orb2Anim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.15, 0.18, 0.15],
                    }),
                    transform: [
                      {
                        translateY: orb2Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -15],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.orb,
                  styles.orb3,
                  {
                    opacity: orb3Anim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.12, 0.17, 0.12],
                    }),
                    transform: [
                      {
                        translateY: orb3Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 25],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </>
          ) : (
            <>
              <View style={[styles.orb, styles.orb1, { opacity: 0.15 }]} />
              <View style={[styles.orb, styles.orb2, { opacity: 0.15 }]} />
              <View style={[styles.orb, styles.orb3, { opacity: 0.12 }]} />
            </>
          )}
        </View>
      </LinearGradient>
      {children}
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    gradient: {
      ...StyleSheet.absoluteFillObject,
    },
    orbsContainer: {
      ...StyleSheet.absoluteFillObject,
    },
    orb: {
      position: 'absolute',
      borderRadius: 200,
      backgroundColor: theme.colors.palette.neutral100,
    },
    orb1: {
      width: 400,
      height: 400,
      top: -50,
      right: -50,
    },
    orb2: {
      width: 320,
      height: 320,
      bottom: -40,
      left: -40,
    },
    orb3: {
      width: 240,
      height: 240,
      top: '40%',
      left: '5%',
    },
  })
