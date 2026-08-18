import '@expo/metro-runtime'
import { Stack } from 'expo-router'

if (__DEV__) {
  require('./src/devtools/ReactotronConfig.ts')
}

export default function App() {
  return <Stack />
}
