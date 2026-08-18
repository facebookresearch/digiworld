import { View, StyleSheet } from 'react-native'
import { registerRootComponent } from 'expo'
import { ExpoRoot } from 'expo-router'
import { Text } from '@andojo/shared-theme'

// Debugging: Check if files can be resolved
console.log('Starting app initialization...')

function App() {
  try {
    console.log('Attempting to resolve routes...')
    const ctx = require.context('./src/app')
    console.log('Successfully resolved', ctx.keys().length, 'routes')

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
