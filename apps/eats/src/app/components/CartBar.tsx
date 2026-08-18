import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models/helpers/useStores'
import { View, StyleSheet, Animated } from 'react-native'
import { useRouter, useSegments } from 'expo-router'
import { colors } from '@/theme'
import { Button, Text, Icon } from '@andojo/shared-theme'

interface CartBarProps {
  bottomOffset?: number
}

const CartBar = observer(({ bottomOffset = 52 }: CartBarProps) => {
  const { cartStore } = useStores()
  const router = useRouter()
  const segments = useSegments()
  const slideAnim = React.useRef(new Animated.Value(0)).current
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current

  useEffect(() => {
    if (!cartStore.isEmpty) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
      ]).start()
    }
  }, [cartStore.totalItems])

  // Hide CartBar if on CartScreen, if cart is empty, or if on address screens
  if (segments.some(segment => segment === 'cart')) return null
  if (cartStore.isEmpty) return null
  if (segments.some(segment => segment === 'address')) return null
  if (segments.some(segment => segment === 'payment')) return null
  if (segments.some(segment => segment === 'profile')) return null
  if (segments.some(segment => segment === 'order')) return null

  if (segments[0] === undefined) return null
  const handlePress = () => router.push('/screens/cart/cart-screen')

  const animatedStyle = {
    transform: [
      {
        translateY: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [100, 0],
        }),
      },
      { scale: scaleAnim },
    ],
    opacity: slideAnim,
  }

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      pointerEvents="box-none"
    >
      <View style={[styles.bar, { bottom: bottomOffset }]} pointerEvents="auto">
        <Button
          style={styles.btn}
          onPress={handlePress}
          gradientColors={[
            colors.palette.primary500,
            colors.palette.primary600,
          ]}
        >
          <View style={styles.content}>
            <View style={styles.leftContent}>
              <Text
                text={`$${cartStore.subtotal.toFixed(2)}`}
                style={styles.priceText}
                weight="bold"
                size="large"
              />
              <View style={styles.divider} />
              <Text
                text={`${cartStore.totalItems} items`}
                style={styles.itemText}
                weight="medium"
                size="small"
              />
            </View>
            <View style={styles.rightContent}>
              <Text
                text="View Cart"
                style={styles.ctaText}
                weight="semibold"
                size="small"
              />
              <Icon
                icon="caretRight"
                size={16}
                color="#fff"
                style={styles.arrowIcon}
              />
            </View>
          </View>
        </Button>
      </View>
    </Animated.View>
  )
})

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    pointerEvents: 'box-none',
  },
  bar: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    pointerEvents: 'auto',
  },
  btn: {
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    width: '100%',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingLeft: 4,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 12,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 8,
    marginRight: 4,
  },
  priceText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  itemText: {
    color: '#fff',
    opacity: 0.9,
    fontSize: 14,
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  arrowIcon: {
    opacity: 0.9,
  },
})

export default CartBar
