// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState, useRef, useEffect } from 'react'
import { View, FlatList, Image, Dimensions, StyleSheet } from 'react-native'

const images = [
  require('../../assets/images/black-friday-sale.png'),
  require('../../assets/images/electronics.png'),
  require('../../assets/images/fashion-sale.png'),
  require('../../assets/images/grocery-banner.png'),
  require('../../assets/images/halloween-sale.png'),
  require('../../assets/images/home-needs-sale.png'),
]

// Pick 2 random images
const shuffledImages = images.sort(() => 0.5 - Math.random()).slice(0, 3)

const { width } = Dimensions.get('window')

const PromotionCarousel = () => {
  const flatListRef = useRef<FlatList>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % shuffledImages.length
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        })
        return nextIndex
      })
    }, 3000) // Change image every 3s

    return () => clearInterval(interval)
  }, [])

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={shuffledImages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <Image source={item} style={styles.image} resizeMode="cover" />
        )}
        onMomentumScrollEnd={event => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width)
          setActiveIndex(index)
        }}
      />
      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {shuffledImages.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, activeIndex === index && styles.activeDot]}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  image: { width, aspectRatio: 16 / 9 },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#bbb',
    marginHorizontal: 4,
  },
  activeDot: { backgroundColor: '#333' },
})

export default PromotionCarousel
