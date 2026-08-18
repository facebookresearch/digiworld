// Copyright (c) Meta Platforms, Inc. and affiliates.
import 'react-native-gesture-handler/jestSetup'

// Suppress specific React Native deprecation warnings during tests
const originalWarn = console.warn
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('ProgressBarAndroid has been extracted') ||
      args[0].includes('Clipboard has been extracted') ||
      args[0].includes('PushNotificationIOS has been extracted'))
  ) {
    return
  }
  originalWarn(...args)
}

// Mock react-native-fs
jest.mock('react-native-fs', () => ({
  RNFSFileTypeRegular: 'regular',
  RNFSFileTypeDirectory: 'directory',
  ExternalDirectoryPath: '/mock/external',
  DocumentDirectoryPath: '/mock/documents',
  exists: jest.fn(() => Promise.resolve(false)),
  readFile: jest.fn(() => Promise.resolve('[]')),
  writeFile: jest.fn(() => Promise.resolve()),
  mkdir: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  moveFile: jest.fn(() => Promise.resolve()),
  readDir: jest.fn(() => Promise.resolve([])),
  stat: jest.fn(() =>
    Promise.resolve({ size: 0, isFile: () => true, isDirectory: () => false }),
  ),
}))

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'android',
  select: jest.fn(obj => obj.android),
}))

// Mock Settings module
jest.mock('react-native/Libraries/Settings/Settings', () => ({
  get: jest.fn(),
  set: jest.fn(),
  watchKeys: jest.fn(),
  clearWatch: jest.fn(),
}))

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}))

// Mock expo-system-ui
jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: jest.fn(),
  setStatusBarStyle: jest.fn(),
  setStatusBarHidden: jest.fn(),
  setStatusBarTranslucent: jest.fn(),
  setStatusBarColor: jest.fn(),
}))

// Mock react-native
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native')

  // Mock native modules
  RN.NativeModules = {
    ...RN.NativeModules,

    ExpoFontLoader: {
      loadAsync: jest.fn().mockResolvedValue(true),
    },
    ExpoVectorIconsModule: {
      getImageForFont: jest.fn(),
      loadFont: jest.fn(),
    },
  }

  // Mock KeyboardAvoidingView as a simple View
  RN.KeyboardAvoidingView = RN.View

  return {
    ...RN,
    NativeModules: RN.NativeModules,
  }
})

// Mock the expo modules
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}))

jest.mock('expo-linking', () => ({
  createURL: jest.fn(),
  parse: jest.fn(),
}))

jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(),
    exec: jest.fn(),
  })),
}))

// Mock MMKV storage
jest.mock('react-native-mmkv', () => {
  const mockStorage = new Map()
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      set: jest.fn((key, value) => {
        mockStorage.set(key, value)
      }),
      getString: jest.fn(key => mockStorage.get(key) || null),
      getBoolean: jest.fn(key => mockStorage.get(key) || false),
      getNumber: jest.fn(key => mockStorage.get(key) || 0),
      getObject: jest.fn(key => {
        const value = mockStorage.get(key)
        return value ? JSON.parse(value) : null
      }),
      delete: jest.fn(key => {
        mockStorage.delete(key)
      }),
      clearAll: jest.fn(() => {
        mockStorage.clear()
      }),
      getAllKeys: jest.fn(() => Array.from(mockStorage.keys())),
      contains: jest.fn(key => mockStorage.has(key)),
    })),
  }
})

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///document/directory/',
  cacheDirectory: 'file:///cache/directory/',
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
}))

// Mock expo-asset
jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      downloadAsync: jest.fn(() => Promise.resolve()),
      localUri: 'file:///mock/asset/local/uri',
    })),
  },
}))

// Mock react-native-zip-archive
jest.mock('react-native-zip-archive', () => ({
  unzip: jest.fn(() => Promise.resolve('/mock/extracted/path')),
  zip: jest.fn(() => Promise.resolve('/mock/zipped/path')),
}))

// Mock Animated
jest.mock('react-native-reanimated/mock', () => ({
  useAnimatedStyle: () => ({}),
  useSharedValue: jest.fn(),
  withTiming: jest.fn(),
  withSpring: jest.fn(),
  withDelay: jest.fn(),
  withSequence: jest.fn(),
  withRepeat: jest.fn(),
  cancelAnimation: jest.fn(),
  runOnJS: jest.fn(fn => fn),
  Easing: {
    linear: jest.fn(),
    ease: jest.fn(),
    quad: jest.fn(),
    cubic: jest.fn(),
    poly: jest.fn(),
    sin: jest.fn(),
    circle: jest.fn(),
    exp: jest.fn(),
    elastic: jest.fn(),
    back: jest.fn(),
    bounce: jest.fn(),
  },
}))

// Mock the StatusBar
jest.mock('expo-status-bar', () => ({
  StatusBar: {
    setBarStyle: jest.fn(),
    setBackgroundColor: jest.fn(),
  },
}))

// Mock the SafeAreaProvider
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

// Mock the Keyboard
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardController: ({ children }: { children: React.ReactNode }) => children,
  useKeyboardController: () => ({
    setEnabled: jest.fn(),
    setKeyboardHeight: jest.fn(),
  }),
}))

// Mock the FlashList
jest.mock(
  '@shopify/flash-list',
  () => require('./__mocks__/flashListMock').FlashList,
)

// Mock expo-font and Google Fonts
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  Font: {
    loadAsync: jest.fn().mockResolvedValue(true),
  },
}))

jest.mock('@expo-google-fonts/space-grotesk', () => ({
  useFonts: () => [true, null],
  SpaceGrotesk_300Light: 'SpaceGrotesk_300Light',
  SpaceGrotesk_400Regular: 'SpaceGrotesk_400Regular',
  SpaceGrotesk_500Medium: 'SpaceGrotesk_500Medium',
  SpaceGrotesk_600SemiBold: 'SpaceGrotesk_600SemiBold',
  SpaceGrotesk_700Bold: 'SpaceGrotesk_700Bold',
}))

// Mock expo-constants
jest.mock('expo-constants', () => ({
  Constants: {
    manifest: {
      extra: {
        apiUrl: 'http://localhost:3000',
      },
    },
  },
}))

// Mock gluestack-ui components
jest.mock('@gluestack-ui/themed', () => {
  const actual = jest.requireActual('./__mocks__/gluestackMock')
  return {
    ...actual,
    Text: 'Text',
    View: 'View',
    Pressable: 'Pressable',
    Image: 'Image',
    Button: 'Button',
    Heading: 'Heading',
    Input: 'Input',
    InputField: 'InputField',
    FormControl: 'FormControl',
    FormControlLabel: 'FormControlLabel',
    FormControlLabelText: 'FormControlLabelText',
    FormControlHelper: 'FormControlHelper',
    FormControlHelperText: 'FormControlHelperText',
    FormControlError: 'FormControlError',
    FormControlErrorText: 'FormControlErrorText',
    FormControlErrorIcon: 'FormControlErrorIcon',
    Modal: 'Modal',
    ModalBackdrop: 'ModalBackdrop',
    ModalContent: 'ModalContent',
    ModalHeader: 'ModalHeader',
    ModalFooter: 'ModalFooter',
    ModalBody: 'ModalBody',
    ModalCloseButton: 'ModalCloseButton',
    Spinner: 'Spinner',
    SpinnerIcon: 'SpinnerIcon',
    createIcon: () => 'Icon',
    createIconContext: () => ({}),
    createThemedComponent: (component: any) => component,
  }
})

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  FontAwesome: 'FontAwesome',
  FontAwesome5: 'FontAwesome5',
  AntDesign: 'AntDesign',
  Feather: 'Feather',
  Entypo: 'Entypo',
  SimpleLineIcons: 'SimpleLineIcons',
  Octicons: 'Octicons',
  createIconSet: () => 'Icon',
  createIconSetFromIcoMoon: () => 'Icon',
  createIconSetFromFontello: () => 'Icon',
  createMultiStyleIconSet: () => ({
    Icon: 'Icon',
    getRawGlyphMap: () => ({}),
    getFontFamily: () => 'Icon',
  }),
}))

// Mock shared theme components
jest.mock('@andojo/shared-theme/src/components', () => {
  const actual = jest.requireActual('./__mocks__/sharedThemeMock')
  return {
    ...actual,
    Screen: actual.Screen,
    Box: actual.Box,
    StatusBar: actual.StatusBar,
    KeyboardAvoidingView: actual.KeyboardAvoidingView,
    useToast: actual.useToast,
  }
})

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: jest.requireActual('./__mocks__/sharedThemeMock').StatusBar,
}))
