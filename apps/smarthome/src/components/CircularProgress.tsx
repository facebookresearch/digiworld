// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Dimensions, PanResponder, View } from 'react-native'
import { useAppTheme } from '@andojo/shared-theme'

const { width: screenWidth } = Dimensions.get('window')
const CIRCLE_SIZE = screenWidth * 0.6
const STROKE_WIDTH = 8

interface CircularSliderProps {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  size?: number
  strokeWidth?: number
  activeColor?: string
  inactiveColor?: string
  disabled?: boolean
  onSlidingEnd?: () => void
}

const CircularSlider: React.FC<CircularSliderProps> = ({
  value,
  onValueChange,
  min = 0,
  max = 100,
  size = CIRCLE_SIZE,
  strokeWidth = STROKE_WIDTH,
  activeColor,
  inactiveColor,
  disabled = false,
  onSlidingEnd,
}) => {
  const { theme } = useAppTheme()
  const defaultActiveColor = activeColor || theme.colors.palette.primary300
  const defaultInactiveColor = inactiveColor || theme.colors.palette.neutral400

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = ((value - min) / (max - min)) * circumference

  // Use neutral500 color when disabled, otherwise use the provided activeColor
  const effectiveActiveColor = disabled
    ? theme.colors.palette.neutral500
    : defaultActiveColor

  // compute handle position
  const angle = (progress / circumference) * 2 * Math.PI - Math.PI / 2
  const handleX = size / 2 + radius * Math.cos(angle)
  const handleY = size / 2 + radius * Math.sin(angle)

  const updateValueFromTouch = (x: number, y: number) => {
    const centerX = size / 2
    const centerY = size / 2
    let deltaX = x - centerX
    let deltaY = y - centerY

    // 🔑 normalize touch strictly to the circle radius
    const touchDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    if (touchDistance === 0) return

    // scale (deltaX, deltaY) onto the circle
    const scale = radius / touchDistance
    deltaX *= scale
    deltaY *= scale

    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
    const normalizedAngle = ((angle + 90 + 360) % 360) / 360
    const newValue = min + normalizedAngle * (max - min)

    onValueChange(Math.round(newValue))
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: evt => {
      if (!disabled) {
        updateValueFromTouch(
          evt.nativeEvent.locationX,
          evt.nativeEvent.locationY,
        )
      }
    },
    onPanResponderMove: evt => {
      if (!disabled) {
        updateValueFromTouch(
          evt.nativeEvent.locationX,
          evt.nativeEvent.locationY,
        )
      }
    },
    onPanResponderRelease: () => {
      if (!disabled) {
        onSlidingEnd?.()
      }
    },
  })

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: defaultInactiveColor,
          position: 'absolute',
        }}
      />
      {Array.from({ length: Math.floor(progress / 4) }, (_, i) => {
        const dotAngle = ((i * 4) / circumference) * 2 * Math.PI - Math.PI / 2
        const x = size / 2 + radius * Math.cos(dotAngle)
        const y = size / 2 + radius * Math.sin(dotAngle)
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: 4,
              height: 4,
              borderRadius: 2,
              left: x - 2,
              top: y - 2,
              backgroundColor: effectiveActiveColor,
            }}
          />
        )
      })}
      <View
        style={{
          position: 'absolute',
          left: handleX - strokeWidth * 1.5,
          top: handleY - strokeWidth * 1.5,
          width: strokeWidth * 3,
          height: strokeWidth * 3,
          borderRadius: strokeWidth * 1.5,
          backgroundColor: theme.colors.palette.neutral100,
          borderWidth: 2,
          borderColor: effectiveActiveColor,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
        {...panResponder.panHandlers}
      />
    </View>
  )
}

export default CircularSlider
