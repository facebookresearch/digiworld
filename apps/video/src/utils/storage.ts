import { MMKV } from 'react-native-mmkv'

export const storage = new MMKV({
  id: 'music-app-storage',
  encryptionKey: 'music-app-key', // In a real app, use a secure key management system
})
