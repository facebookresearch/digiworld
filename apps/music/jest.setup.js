import React from 'react'

// Mock test data
const testData = {
  categories: [
    { id: 1, name: 'Pop', color: '#FF69B4' },
    { id: 2, name: 'Rock', color: '#4169E1' },
  ],
  artists: [
    {
      id: 1,
      name: 'Artist 1',
      bio: 'Test bio',
      categories: ['pop'],
      monthlyListeners: 1000,
      rating: 4.5,
      profilePicture: 'artist1.jpg',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      name: 'Artist 2',
      bio: 'Test bio',
      categories: ['rock'],
      monthlyListeners: 2000,
      rating: 4.8,
      profilePicture: 'artist2.jpg',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ],
  songs: [
    {
      id: 1,
      title: 'Song 1',
      artistId: 1,
      albumId: 1,
      duration: 180,
      audioUrl: 'song1.mp3',
      playCount: 100,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      isFavorite: true,
    },
    {
      id: 2,
      title: 'Song 2',
      artistId: 2,
      albumId: 2,
      duration: 200,
      audioUrl: 'song2.mp3',
      playCount: 50,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      isFavorite: false,
    },
  ],
  recentlyPlayed: [
    {
      songId: 1,
      playedAt: '2024-03-20T00:00:00.000Z',
    },
    {
      songId: 2,
      playedAt: '2024-03-19T00:00:00.000Z',
    },
  ],
}

// Mock database
const createQueryBuilder = () => {
  const builder = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockImplementation(function () {
      if (this._from === 'categories') {
        return Promise.resolve(testData.categories)
      } else if (this._from === 'artists') {
        return Promise.resolve(testData.artists)
      } else if (this._from === 'songs') {
        return Promise.resolve(testData.songs)
      } else if (this._from === 'recently_played') {
        return Promise.resolve(testData.recentlyPlayed)
      }
      return Promise.resolve([])
    }),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    _from: null,
  }

  // Track the table being queried
  builder.from.mockImplementation(table => {
    builder._from = table
    return builder
  })

  return builder
}

jest.mock('@/db', () => ({
  db: createQueryBuilder(),
  sqlite: {
    getInstance: jest.fn().mockReturnValue({
      instance: {
        transaction: jest.fn(),
        exec: jest.fn(),
        execAsync: jest.fn().mockResolvedValue([]),
      },
    }),
    getDrizzle: jest.fn().mockReturnValue(createQueryBuilder()),
  },
}))

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({
    sessionId: 'test-session-id',
  }),
}))

// Mock MusicImage component
jest.mock('@/components/MusicImage', () => ({
  __esModule: true,
  default: ({ entityId, style }) => {
    return React.createElement('View', { style }, 'MockedImage')
  },
  AvatarImage: ({ entityId, style }) => {
    return React.createElement('View', { style }, 'MockedAvatar')
  },
}))

jest.mock('@andojo/shared-theme', () => {
  const React = require('react')
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

  const Text = ({ children, style, ...props }) => {
    // Handle both string children and nested Text components
    const content = React.Children.map(children, child => {
      if (typeof child === 'string' || typeof child === 'number') {
        return child
      }
      // If it's a React element (like another Text component), render it
      return child
    })

    return React.createElement('Text', { style, ...props }, content)
  }

  return {
    colors,
    Text,
    LoadingOverlay: () => React.createElement('View', null, 'Loading...'),
    LinearGradient: ({ children, colors, style }) =>
      React.createElement('View', { style }, children),
    useAppTheme: () => ({
      theme: mockTheme,
    }),
    useToast: () => ({
      show: jest.fn(),
      hide: jest.fn(),
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
      getAssetPath: () => {},
      downloadAsset: () => {},
      deleteAsset: () => {},
      clearCache: () => {},
    }),
  },
}))
