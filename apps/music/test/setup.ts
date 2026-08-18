// Copyright (c) Meta Platforms, Inc. and affiliates.
// we always make sure 'react-native' gets included first
import * as ReactNative from 'react-native'
import mockFile from './mockFile'
import '@testing-library/react-native/extend-expect'

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

// Mock SQLite
jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(),
    exec: jest.fn(),
    close: jest.fn(),
  })),
}))

// Mock expo-av for audio playback
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(() => ({
        sound: {
          playAsync: jest.fn(),
          pauseAsync: jest.fn(),
          stopAsync: jest.fn(),
          unloadAsync: jest.fn(),
        },
        status: { isLoaded: true },
      })),
    },
  },
}))

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: 'Link',
}))

jest.mock('@andojo/shared-theme', () => {
  const React = require('react')
  const { Text: RNText } = require('react-native')

  const colors = {
    palette: {
      neutral100: '#FFFFFF',
      neutral200: '#F4F2F1',
      neutral300: '#D7CEC9',
      neutral400: '#B6ACA6',
      neutral500: '#978F8A',
      neutral600: '#564E4A',
      neutral700: '#3C3836',
      neutral800: '#191015',
      neutral900: '#000000',
      primary100: '#E6F4EA',
      primary200: '#C6E6D0',
      primary300: '#96D0AD',
      primary400: '#66BA8C',
      primary500: '#2E8B57',
      primary600: '#1B6B3F',
      angry100: '#F2D6CD',
      angry200: '#E5AC99',
      angry300: '#D78366',
      angry400: '#C03403',
      angry500: '#C03403',
      overlay20: 'rgba(255, 255, 255, 0.1)',
      overlay50: 'rgba(255, 255, 255, 0.2)',
      overlay80: 'rgba(0, 0, 0, 0.7)',
    },
  }

  const mockTheme = {
    mode: 'light',
    colors: {
      ...colors,
      background: colors.palette.neutral200,
      backgroundElevated: colors.palette.neutral300,
      text: colors.palette.neutral900,
      textDim: colors.palette.neutral800,
      textMuted: colors.palette.neutral700,
      tint: colors.palette.primary500,
      error: colors.palette.angry500,
      errorBackground: colors.palette.angry100,
      palette: colors.palette,
    },
    typography: {
      h1: { fontSize: 32, fontWeight: 'bold' },
      h2: { fontSize: 24, fontWeight: 'bold' },
      body: { fontSize: 16 },
    },
  }

  return {
    ...jest.requireActual('@andojo/shared-theme'),
    colors,
    Text: ({ children, style }: any) =>
      React.createElement(RNText, { style }, children),
    useAppTheme: () => ({
      theme: mockTheme,
    }),
    useToast: () => ({
      show: jest.fn(),
      close: jest.fn(),
      update: jest.fn(),
      dismiss: jest.fn(),
      dismissAll: jest.fn(),
      clear: jest.fn(),
      clearAll: jest.fn(),
      clearAllByType: jest.fn(),
    }),
  }
})

// libraries to mock
jest.doMock('react-native', () => {
  // Extend ReactNative
  return Object.setPrototypeOf(
    {
      Image: {
        ...ReactNative.Image,
        resolveAssetSource: jest.fn(_source => mockFile),
        getSize: jest.fn(
          (
            uri: string,
            success: (width: number, height: number) => void,
            _failure?: (_error: any) => void,
          ) => success(100, 100),
        ),
      },
    },
    ReactNative,
  )
})

// Mock i18n
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

// Setup global test environment
global.beforeEach(() => {
  jest.clearAllMocks()
})

declare global {
  let __TEST__: boolean
}
