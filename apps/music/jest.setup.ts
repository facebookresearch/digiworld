// Copyright (c) Meta Platforms, Inc. and affiliates.
import '@testing-library/react-native/extend-expect'
import { ReactNode } from 'react'

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/i18n/en'
import fs from 'fs'
import path from 'path'

const errorLogPath = path.resolve(__dirname, 'jest-error-log.txt')

// Add setImmediate polyfill (needed for React Native animations)
// @ts-ignore - deliberately ignoring type mismatch as this is just a test polyfill
global.setImmediate = (callback: (...args: any[]) => void) =>
  setTimeout(callback, 0)

// Basic RN components mocks for React Native Testing Library to work correctly
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native')

  RN.View = 'View'
  RN.Text = 'Text'
  RN.ScrollView = 'ScrollView'
  RN.Image = 'Image'
  RN.Pressable = 'Pressable'
  RN.TouchableOpacity = 'TouchableOpacity'
  RN.KeyboardAvoidingView = 'KeyboardAvoidingView'
  RN.TextInput = 'TextInput'

  return RN
})

// Mock TouchableOpacity to avoid animation issues
jest.mock(
  'react-native/Libraries/Components/Touchable/TouchableOpacity',
  () => 'TouchableOpacity',
)

// Note: Let jest-expo handle most of the React Native mocking
// Only mock what's necessary for our tests

// Mock MMKV
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
  })),
}))

// Create a shared mockRouter object
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
}

// Mock expo-router and reuse mockRouter
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({
    sessionId: 'test-session-id',
  }),
  Link: 'Link',
}))

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}))

// Mock SQLite
jest.mock('@/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockResolvedValue({ insertId: 1 }),
  },
  sqlite: {
    getInstance: jest.fn().mockReturnValue({
      instance: {
        transaction: jest.fn(),
        exec: jest.fn(),
        execAsync: jest.fn().mockResolvedValue([]),
      },
    }),
    getDrizzle: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([]),
    }),
  },
}))
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useFocusEffect: jest.fn(callback => callback()), // no-op
}))

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}))

// Mock react-native-linear-gradient
jest.mock('react-native-linear-gradient', () => 'LinearGradient')

// Mock @andojo/shared-theme - comprehensive mock with all exports
jest.mock('@andojo/shared-theme', () => {
  const React = require('react')
  const { View, Text } = require('react-native')

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
    colors,
    Text: ({ children, style }: any) =>
      React.createElement(Text, { style }, children),
    LoadingOverlay: ({ visible, message }: any) =>
      visible ? React.createElement(Text, null, message) : null,
    LinearGradient: ({ children, style }: any) =>
      React.createElement(View, { style }, children),
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

// Mock TextInput - use simple string identifier instead of complex mock
jest.mock(
  'react-native/Libraries/Components/TextInput/TextInput',
  () => 'TextInput',
)

// Mock react-native-fs
jest.mock('react-native-fs', () => ({
  mkdir: () => {},
  moveFile: () => {},
  copyFile: () => {},
  pathForBundle: () => {},
  pathForGroup: () => {},
  getFSInfo: () => {},
  getAllExternalFilesDirs: () => {},
  unlink: () => {},
  exists: () => {},
  stopDownload: () => {},
  resumeDownload: () => {},
  isResumable: () => {},
  stopUpload: () => {},
  completeHandlerIOS: () => {},
  readDir: () => {},
  readDirAssets: () => {},
  existsAssets: () => {},
  readFile: () => {},
  read: () => {},
  readFileAssets: () => {},
  hash: () => {},
  copyFileAssets: () => {},
  copyFileAssetsIOS: () => {},
  copyAssetsVideoIOS: () => {},
  writeFile: () => {},
  appendFile: () => {},
  write: () => {},
  downloadFile: () => {},
  uploadFiles: () => {},
  touch: () => {},
  MainBundlePath: () => {},
  CachesDirectoryPath: () => {},
  DocumentDirectoryPath: () => {},
  ExternalDirectoryPath: () => {},
  ExternalStorageDirectoryPath: () => {},
  TemporaryDirectoryPath: () => {},
  LibraryDirectoryPath: () => {},
  PicturesDirectoryPath: () => {},
}))

// Mock shared-asset-management
jest.mock('@andojo/shared-asset-management', () => {
  const assetManagerMock = {
    getAssetPath: jest.fn().mockReturnValue('/mock/path/to/asset.jpg'),
    downloadAsset: jest.fn(),
    deleteAsset: jest.fn(),
    clearCache: jest.fn(),
  }

  return {
    AppName: {
      MUSIC: 'music',
      ECOMMERCE: 'ecommerce',
      EATS: 'eats',
      EMAIL: 'email',
      PAYMENT: 'payment',
    },
    AssetType: {
      IMAGE: 'image',
      AUDIO: 'audio',
      VIDEO: 'video',
    },
    AssetConfigType: {
      LOCAL: 'local',
      REMOTE: 'remote',
    },
    EntityType: {
      PRODUCTS: 'products',
      AVATARS: 'avatars',
      CATEGORIES: 'categories',
      MENU: 'menu',
      RESTAURANTS: 'restaurants',
      ARTISTS: 'artists',
      ALBUMS: 'albums',
      SONGS: 'songs',
      MUSIC_CATEGORIES: 'music_categories',
      PLAYLISTS: 'playlists',
    },
    AssetManager: {
      getInstance: jest.fn().mockReturnValue(assetManagerMock),
      initialize: jest.fn().mockReturnValue(assetManagerMock),
    },
  }
})

const mockExecute = jest.fn().mockResolvedValue({})

jest.mock('@/utils/assetManager', () => ({
  getAssetPath: jest.fn().mockResolvedValue('/mock/path/to/asset.jpg'),
}))

export const mockDb = {
  insert: jest.fn(() => ({
    values: jest.fn(() => ({ execute: mockExecute })),
  })),
  delete: jest.fn(() => ({
    where: jest.fn(() => ({ execute: mockExecute })),
  })),
  update: jest.fn(() => ({
    set: jest.fn(() => ({
      where: jest.fn(() => ({ execute: mockExecute })),
    })),
  })),
  select: jest.fn(() => ({
    from: jest.fn(() => ({
      where: jest.fn(() => ({
        execute: mockExecute,
      })),
      innerJoin: jest.fn(() => ({
        where: jest.fn(() => ({
          groupBy: jest.fn(() => ({ execute: mockExecute })),
        })),
      })),
      leftJoin: jest.fn(() => ({
        leftJoin: jest.fn(() => ({
          where: jest.fn(() => ({
            groupBy: jest.fn(() => ({ execute: mockExecute })),
          })),
        })),
      })),
    })),
  })),
  transaction: jest.fn(async (cb: any) => cb(mockDb)),
  raw: jest.fn(() => ({ execute: mockExecute })),
  count: jest.fn(() => ({ execute: mockExecute })),
  groupBy: jest.fn(() => ({ execute: mockExecute })),
  and: jest.fn(),
  or: jest.fn(),
}

jest.mock('@/db', () => ({
  db: mockDb,
  sql: (x: any) => x,
}))

// Clear the log file at the start
beforeAll(() => {
  fs.writeFileSync(errorLogPath, '')
})

beforeAll(async () => {
  i18n.use(initReactI18next)
  await i18n.init({
    resources: { en: { translation: en } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    pluralSeparator: '_',
    compatibilityJSON: 'v4',
  })
})

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
})
