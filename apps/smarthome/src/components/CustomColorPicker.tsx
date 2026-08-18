import { colors } from '@andojo/shared-theme'
import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  PanResponder,
} from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

const PALETTE = [
  '#000000',
  '#888888',
  '#ed1c24',
  '#d11cd5',
  '#1633e6',
  '#00aeef',
  '#00c85d',
  '#57ff0a',
  '#ffde17',
  '#f26522',
]

const RGB_MAX = 255
const HUE_MAX = 360
const SV_MAX = 100

const normalize = (degrees: number): number => ((degrees % 360) + 360) % 360

const rgb2Hsv = (r: number, g: number, b: number) => {
  r = r === RGB_MAX ? 1 : (r % RGB_MAX) / RGB_MAX
  g = g === RGB_MAX ? 1 : (g % RGB_MAX) / RGB_MAX
  b = b === RGB_MAX ? 1 : (b % RGB_MAX) / RGB_MAX

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h: number
  const s = max === 0 ? 0 : (max - min) / max
  const v = max

  if (max === min) {
    h = 0
  } else {
    const d = max - min
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
      default:
        h = 0
    }
    h /= 6
  }

  return {
    h: Math.round(h * HUE_MAX),
    s: Math.round(s * SV_MAX),
    v: Math.round(v * SV_MAX),
  }
}

const hsv2Rgb = (h: number, s: number, v: number) => {
  h = normalize(h)
  h = h === HUE_MAX ? 1 : ((h % HUE_MAX) / HUE_MAX) * 6
  s = s === SV_MAX ? 1 : (s % SV_MAX) / SV_MAX
  v = v === SV_MAX ? 1 : (v % SV_MAX) / SV_MAX

  const i = Math.floor(h)
  const f = h - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  const mod = i % 6
  const r = [v, q, p, p, t, v][mod]
  const g = [t, v, v, q, p, p][mod]
  const b = [p, p, t, v, v, q][mod]

  return {
    r: Math.floor(r * RGB_MAX),
    g: Math.floor(g * RGB_MAX),
    b: Math.floor(b * RGB_MAX),
  }
}

const rgb2Hex = (r: number, g: number, b: number) => {
  const rHex = Math.round(r).toString(16)
  const gHex = Math.round(g).toString(16)
  const bHex = Math.round(b).toString(16)

  const rPadded = rHex.length === 1 ? '0' + rHex : rHex
  const gPadded = gHex.length === 1 ? '0' + gHex : gHex
  const bPadded = bHex.length === 1 ? '0' + bHex : bHex

  return '#' + rPadded + gPadded + bPadded
}

const hex2Rgb = (hex: string) => {
  const result = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

const hsv2Hex = (h: number, s: number, v: number) => {
  const rgb = hsv2Rgb(h, s, v)
  return rgb2Hex(rgb.r, rgb.g, rgb.b)
}

const hex2Hsv = (hex: string) => {
  const rgb = hex2Rgb(hex)
  if (!rgb) return { h: 0, s: 0, v: 100 }
  return rgb2Hsv(rgb.r, rgb.g, rgb.b)
}

const expandColor = (color: string): string =>
  typeof color === 'string' && color.length === 4
    ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
    : color

interface CustomColorPickerProps {
  color: string
  onColorChangeComplete: (color: string) => void
  onColorChange?: (color: string) => void
  onTouchStart?: () => void
  thumbSize?: number
  _sliderSize?: number
  palette?: string[]
  swatches?: boolean
  swatchesLast?: boolean
  disabled?: boolean
}

export default function CustomColorPicker({
  color = colors.palette.neutral100,
  onColorChangeComplete,
  onColorChange,
  onTouchStart,
  thumbSize = 30,
  _sliderSize = 20,
  palette = PALETTE,
  swatches = true,
  swatchesLast = true,
  disabled = false,
}: CustomColorPickerProps) {
  const [hsv, setHsv] = useState({ h: 0, s: 0, v: 100 })
  const [currentColor, setCurrentColor] = useState(color)
  const [sliderLength, setSliderLength] = useState(0)
  const latestColorRef = useRef(color)

  const slideX = useRef(new Animated.Value(0)).current
  const swatchAnim = useRef(palette.map(() => new Animated.Value(0))).current

  useEffect(() => {
    const isHex = /^#(([0-9a-f]{2}){3}|([0-9a-f]){3})$/i
    if (!isHex.test(color)) return

    const expandedColor = expandColor(color)
    const newHsv = hex2Hsv(expandedColor)
    setHsv(newHsv)
    setCurrentColor(expandedColor)
    latestColorRef.current = expandedColor

    // Update slider position
    const range = ((100 - newHsv.v) / 100) * sliderLength
    slideX.setValue(range)
  }, [color, sliderLength, slideX])

  const updateValue = (nativeEvent: { locationX: number }, val?: number) => {
    if (disabled) return

    const { h, s } = hsv
    const v =
      typeof val === 'number'
        ? val
        : 100 * (1 - nativeEvent.locationX / sliderLength)
    const newHsv = { h, s, v }
    const newColor = hsv2Hex(newHsv.h, newHsv.s, newHsv.v)

    setHsv(newHsv)
    setCurrentColor(newColor)
    latestColorRef.current = newColor
    onColorChange?.(newColor)
  }

  const sliderPanResponder = PanResponder.create({
    onStartShouldSetPanResponderCapture: () => !disabled,
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponderCapture: () => !disabled,
    onPanResponderGrant: (_event, _gestureState) => {
      if (!disabled) {
        onTouchStart?.()
      }
    },
    onPanResponderMove: (event, _gestureState) => {
      if (disabled) return
      updateValue(event.nativeEvent)
    },
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderRelease: (event, _gestureState) => {
      if (disabled) return
      updateValue(event.nativeEvent)
      onColorChangeComplete?.(latestColorRef.current)
    },
  })

  const onSwatchPress = (c: string, i: number) => {
    if (disabled) return

    // Animate swatch
    swatchAnim[i].stopAnimation()
    Animated.timing(swatchAnim[i], {
      toValue: 1,
      useNativeDriver: false,
      duration: 500,
    }).start(() => {
      swatchAnim[i].setValue(0)
    })

    // Update color
    const expandedColor = expandColor(c)
    const newHsv = hex2Hsv(expandedColor)
    setHsv(newHsv)
    setCurrentColor(expandedColor)
    latestColorRef.current = expandedColor

    // Update slider position
    const range = ((100 - newHsv.v) / 100) * sliderLength
    slideX.setValue(range)

    onColorChangeComplete(expandedColor)
  }

  const onSliderLayout = (e: {
    nativeEvent: { layout: { width: number; height: number } }
  }) => {
    const { width } = e.nativeEvent.layout
    setSliderLength(width - thumbSize)
  }

  const sliderPanHandlers = sliderPanResponder.panHandlers
  const hueSaturation = hsv2Hex(hsv.h, hsv.s, 100)

  return (
    <View style={styles.root}>
      {/* Swatches at top if swatchesLast is false */}
      {swatches && !swatchesLast && (
        <View style={styles.swatches}>
          {palette.map((c, i) => (
            <View style={[styles.swatch, { backgroundColor: c }]} key={'S' + i}>
              <TouchableWithoutFeedback onPress={() => onSwatchPress(c, i)}>
                <Animated.View
                  style={[
                    styles.swatchTouch,
                    {
                      backgroundColor: c,
                      transform: [
                        {
                          scale: swatchAnim[i].interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.8, 1.2, 0.8],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </TouchableWithoutFeedback>
            </View>
          ))}
        </View>
      )}

      {/* Slider */}
      <View style={styles.slider} onLayout={onSliderLayout}>
        <View style={[styles.grad, { backgroundColor: hueSaturation }]}>
          <LinearGradient
            colors={['transparent', 'black']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sliderGradient}
          />
        </View>
        <Animated.View
          style={[
            styles.sliderThumb,
            {
              left: slideX,
              backgroundColor: currentColor,
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
            },
          ]}
        />
        <View style={styles.cover} {...sliderPanHandlers} />
      </View>

      {/* Swatches at bottom if swatchesLast is true */}
      {swatches && swatchesLast && (
        <View style={styles.swatches}>
          {palette.map((c, i) => (
            <View style={[styles.swatch, { backgroundColor: c }]} key={'S' + i}>
              <TouchableWithoutFeedback onPress={() => onSwatchPress(c, i)}>
                <Animated.View
                  style={[
                    styles.swatchTouch,
                    {
                      backgroundColor: c,
                      transform: [
                        {
                          scale: swatchAnim[i].interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.8, 1.2, 0.8],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </TouchableWithoutFeedback>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  slider: {
    width: '100%',
    height: 20,
    marginVertical: 16,
    position: 'relative',
  },
  grad: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  sliderGradient: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  sliderThumb: {
    position: 'absolute',
    top: -5,
    borderWidth: 2,
    borderColor: colors.palette.neutral100,
    elevation: 4,
    shadowColor: colors.palette.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  swatches: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  swatchTouch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.palette.neutral100,
    elevation: 2,
    shadowColor: colors.palette.neutral900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
})
