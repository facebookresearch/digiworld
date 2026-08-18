// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { jest } from '@jest/globals'

// Mock functions
const mockTrackScreenMount = () => {}
const mockFn = () => {}

// Mock router
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  setParams: jest.fn(),
}

// Mock storage
export const mockStorage = {
  load: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
}

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({
    sessionId: 'test-session-id',
  }),
}))

export const setupMocks = () => {
  // Mock storage
  jest.mock('@/utils/storage', () => ({
    storage: mockStorage,
  }))

  // Mock interaction tracking
  jest.mock('@andojo/shared-interaction-tracking', () => ({
    useInteractionTracking: () => ({
      trackScreenMount: mockTrackScreenMount,
    }),
  }))

  // Mock shared-theme
  jest.mock('@andojo/shared-theme', () => {
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
      },
    }

    return {
      colors,
      Text: ({
        children,
        style,
      }: {
        children: React.ReactNode
        style?: any
      }) => ({ children, style }),
      LoadingOverlay: ({
        visible,
        message,
      }: {
        visible: boolean
        message?: string
      }) => ({ visible, message }),
      LinearGradient: ({
        children,
        colors,
        style,
      }: {
        children: React.ReactNode
        colors: string[]
        style?: any
      }) => ({ children, colors, style }),
    }
  })

  // Mock react-native-fs
  jest.mock('react-native-fs', () => ({
    mkdir: mockFn,
    moveFile: mockFn,
    copyFile: mockFn,
    pathForBundle: mockFn,
    pathForGroup: mockFn,
    getFSInfo: mockFn,
    getAllExternalFilesDirs: mockFn,
    unlink: mockFn,
    exists: mockFn,
    stopDownload: mockFn,
    resumeDownload: mockFn,
    isResumable: mockFn,
    stopUpload: mockFn,
    completeHandlerIOS: mockFn,
    readDir: mockFn,
    readDirAssets: mockFn,
    existsAssets: mockFn,
    readFile: mockFn,
    read: mockFn,
    readFileAssets: mockFn,
    hash: mockFn,
    copyFileAssets: mockFn,
    copyFileAssetsIOS: mockFn,
    copyAssetsVideoIOS: mockFn,
    writeFile: mockFn,
    appendFile: mockFn,
    write: mockFn,
    downloadFile: mockFn,
    uploadFiles: mockFn,
    touch: mockFn,
    MainBundlePath: mockFn,
    CachesDirectoryPath: mockFn,
    DocumentDirectoryPath: mockFn,
    ExternalDirectoryPath: mockFn,
    ExternalStorageDirectoryPath: mockFn,
    TemporaryDirectoryPath: mockFn,
    LibraryDirectoryPath: mockFn,
    PicturesDirectoryPath: mockFn,
  }))

  // Mock shared-asset-management
  jest.mock('@andojo/shared-asset-management', () => ({
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
    AssetManager: {
      getInstance: () => ({
        getAssetPath: mockFn,
        downloadAsset: mockFn,
        deleteAsset: mockFn,
        clearCache: mockFn,
      }),
    },
  }))
}

// Clear all mocks
export const clearMocks = () => {
  mockRouter.push.mockClear()
  mockRouter.replace.mockClear()
  mockRouter.back.mockClear()
  mockRouter.setParams.mockClear()
  mockStorage.load.mockClear()
  mockStorage.save.mockClear()
  mockStorage.remove.mockClear()
  mockStorage.clear.mockClear()
}
