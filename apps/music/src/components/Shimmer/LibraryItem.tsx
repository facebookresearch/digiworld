import React from 'react'
import { View, StyleSheet } from 'react-native'
import Shimmer from 'react-native-shimmer'

const LibraryItemSkeleton = ({ showTrailing = true }) => (
  <Shimmer>
    <View style={styles.container}>
      <View style={styles.image} />
      <View style={styles.content}>
        <View style={styles.title} />
        <View style={styles.subtitle} />
      </View>
      {showTrailing && <View style={styles.trailing} />}
    </View>
  </Shimmer>
)

export default LibraryItemSkeleton

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#282828',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    height: 16,
    width: '80%',
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 6,
  },
  subtitle: {
    height: 12,
    width: '60%',
    backgroundColor: '#444',
    borderRadius: 4,
  },
  trailing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
  },
})
