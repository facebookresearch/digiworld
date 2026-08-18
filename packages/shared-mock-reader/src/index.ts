// Copyright (c) Meta Platforms, Inc. and affiliates.
// mock-reader.ts
import { Platform } from 'react-native'
import RNFS from 'react-native-fs'

// Consumers provide a mapping of bundled mocks
export type BundledMocks = Record<string, any>

export function createReadJSONFile(bundledMocks: BundledMocks) {
  return async function readJSONFile(filename: string) {
    try {
      const baseDir = Platform.select({
        android: `${RNFS.ExternalDirectoryPath}/mockdata`,
        ios: `${RNFS.DocumentDirectoryPath}/mockdata`,
        default: '',
      })

      const filePath = `${baseDir}/${filename}`
      const exists = await RNFS.exists(filePath)

      if (exists) {
        console.log(`Reading ${filename} from storage`)
        const content = await RNFS.readFile(filePath, 'utf8')
        return JSON.parse(content)
      } else {
        console.log(`File ${filename} not found in storage, using bundled data`)
        return bundledMocks[filename] ?? null
      }
    } catch (error) {
      console.error(`Error accessing ${filename}:`, error)
      return null
    }
  }
}
