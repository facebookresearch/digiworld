// Copyright (c) Meta Platforms, Inc. and affiliates.
// Mock expo-sqlite to prevent SQLite.openDatabaseSync errors in test environment
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({})),
}))

// Optionally mock drizzle-orm/expo-sqlite if needed
jest.mock('drizzle-orm/expo-sqlite', () => ({
  drizzle: jest.fn(() => ({})),
}))

// Minimal mocks for navigation and MobX stores
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ phoneNumber: '1234567890' }),
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  }),
}))
jest.mock('@/models/helpers/useStores', () => ({
  useStores: () => ({
    userStore: { login: jest.fn() },
    sessionStore: { getSession: jest.fn(() => ({})) },
  }),
}))
jest.mock('@andojo/shared-theme', () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        background: '#fff',
        palette: {
          neutral100: '#000',
          neutral400: '#ccc',
          neutral700: '#eee',
          neutral800: '#ddd',
          primary400: '#f00',
          primary200: '#0f0',
          secondary200: '#00f',
          error: '#f00',
          border: '#bbb',
          neutral900: '#111',
        },
        typography: { primary: { bold: 'bold' } },
      },
      typography: { primary: { bold: 'bold' } },
    },
    themeContext: 'light',
  }),
}))
jest.mock('@andojo/shared-theme/src/components', () => ({
  Button: ({ onPress, children, ...props }: any) => (
    <button onClick={onPress} {...props}>
      {children}
    </button>
  ),
  Icon: () => <></>,
  LoadingOverlay: () => <></>,
  Screen: ({ children }: any) => <>{children}</>,
  Text: ({ text, children, ...props }: any) => (
    <span {...props}>{text || children}</span>
  ),
  useToast: () => ({ show: jest.fn() }),
  AutoImage: () => <></>,
}))
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => <></> }))
jest.mock('expo-status-bar', () => ({ StatusBar: () => <></> }))

// Basic unit tests for verify-otp logic, similar to phone-login.test.tsx

describe('OTP Formatting and Validation', () => {
  // Example: OTP validation function
  const isValidOtp = (otp: string) => /^\d{4}$/.test(otp)

  it('validates OTP correctly', () => {
    expect(isValidOtp('1234')).toBe(true)
    expect(isValidOtp('abcd')).toBe(false)
    expect(isValidOtp('12')).toBe(false)
    expect(isValidOtp('12345')).toBe(false)
    expect(isValidOtp('')).toBe(false)
  })

  // Example: OTP formatting (if needed)
  const formatOtp = (text: string) => text.replace(/[^0-9]/g, '').slice(0, 4)

  it('formats OTP input correctly', () => {
    expect(formatOtp('12a4')).toBe('124')
    expect(formatOtp('12345')).toBe('1234')
    expect(formatOtp('abcd')).toBe('')
    expect(formatOtp('1 2 3 4')).toBe('1234')
  })
})
