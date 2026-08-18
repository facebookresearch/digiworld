// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Platform } from 'react-native'
import * as RNFS from 'react-native-fs'

/**
 * Reads a JSON file from the app's document directory
 * @param filename The name of the JSON file to read
 * @returns The parsed JSON data or null if there was an error
 */
export async function readJSONFile(filename: string): Promise<any> {
  try {
    const basePath =
      Platform.OS === 'ios' ? RNFS.MainBundlePath : RNFS.DocumentDirectoryPath
    const filePath = `${basePath}/${filename}`

    // Check if file exists
    const exists = await RNFS.exists(filePath)
    if (!exists) {
      console.error(`File ${filename} does not exist at ${filePath}`)
      return null
    }

    // Read and parse file
    const content = await RNFS.readFile(filePath, 'utf8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`Error reading ${filename}:`, error)
    return null
  }
}
