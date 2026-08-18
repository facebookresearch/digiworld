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

jest.mock('i18next', () => ({
  currentLocale: 'en',
  t: (key: string, params: Record<string, string>) => {
    return `${key} ${JSON.stringify(params)}`
  },
  translate: (key: string, params: Record<string, string>) => {
    return `${key} ${JSON.stringify(params)}`
  },
}))

jest.mock('expo-localization', () => ({
  ...jest.requireActual('expo-localization'),
  getLocales: () => [{ languageTag: 'en-US', textDirection: 'ltr' }],
}))

jest.mock('../src/i18n/index.ts', () => ({
  i18n: {
    isInitialized: true,
    language: 'en',
    t: (key: string, params: Record<string, string>) => {
      return `${key} ${JSON.stringify(params)}`
    },
    numberToCurrency: jest.fn(),
  },
}))
declare global {
  let __TEST__: boolean
}
