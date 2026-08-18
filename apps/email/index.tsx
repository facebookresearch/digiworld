// Copyright (c) Meta Platforms, Inc. and affiliates.
import { registerRootComponent } from 'expo'
import { ExpoRoot } from 'expo-router'
import { Text, View, StyleSheet } from 'react-native'
import React from 'react'

// Debugging: Check if files can be resolved

function App() {
  try {
    const ctx = require.context('./src/app')

    return <ExpoRoot context={ctx} />
  } catch (error) {
    console.error('App initialization error:', error)
    return (
      <View style={styles.container}>
        <Text>
          Error initializing app:{' '}
          {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
})

registerRootComponent(App)
