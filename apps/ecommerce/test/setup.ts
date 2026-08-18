// Copyright (c) Meta Platforms, Inc. and affiliates.
// we always make sure 'react-native' gets included first
import * as ReactNative from 'react-native'
import mockFile from './mockFile'

// libraries to mock
jest.doMock('react-native', () => {
  // Extend ReactNative
  return Object.setPrototypeOf(
    {
      Image: {
        ...ReactNative.Image,
        resolveAssetSource: jest.fn(_source => mockFile),
        getSize: jest.fn((success: (width: number, height: number) => void) =>
          success(100, 100),
        ),
      },
    },
    ReactNative,
  )
})

jest.mock('react-native-mmkv')

jest.mock('expo-localization', () => ({
  ...jest.requireActual('expo-localization'),
  getLocales: () => [{ languageTag: 'en-US', textDirection: 'ltr' }],
}))

// Mock i18n
jest.mock('../src/i18n/i18n.ts', () => ({
  i18n: {
    t: (key: string) => key,
  },
}))

declare global {
  let __TEST__: boolean
}

jest.mock('react-native/Libraries/Image/Image', () => ({
  resolveAssetSource: jest.fn(_source => mockFile),
  getSize: jest.fn((success: (width: number, height: number) => void) => {
    success(100, 100)
  }),
}))

export default {}
