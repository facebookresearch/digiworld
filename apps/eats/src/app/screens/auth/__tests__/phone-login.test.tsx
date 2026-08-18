// Copyright (c) Meta Platforms, Inc. and affiliates.
// Suppress specific React Native deprecation warnings for this test file
import { queries } from '@/db/queries'
import { useRouter } from 'expo-router'
import { Alert } from 'react-native'

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

// Mock the expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}))

// Mock the queries
jest.mock('@/db/queries', () => ({
  queries: {
    getUserByPhone: jest.fn(),
  },
}))

// Mock Alert
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}))

describe('Phone Login Functional Tests', () => {
  const mockRouter = {
    push: jest.fn(),
    setParams: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  // Phone number formatting tests
  describe('Phone Number Formatting', () => {
    const formatPhoneNumber = (text: string) => {
      // Remove all non-numeric characters
      const cleaned = text.replace(/\D/g, '')
      // Format as: +X XXX XXX XXXX
      const match = cleaned.match(/^(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,4})$/)
      if (match) {
        const parts = [match[1], match[2], match[3], match[4]].filter(Boolean)
        return parts.length > 0 ? '+' + parts.join(' ') : ''
      }
      return text
    }

    it('formats phone number correctly', () => {
      expect(formatPhoneNumber('1234567890')).toBe('+1 234 567 890')
      expect(formatPhoneNumber('+1234567890')).toBe('+1 234 567 890')
      expect(formatPhoneNumber('123')).toBe('+1 23')
      expect(formatPhoneNumber('')).toBe('')
    })

    it('handles invalid input gracefully', () => {
      expect(formatPhoneNumber('abc')).toBe('')
      expect(formatPhoneNumber('123abc456')).toBe('+1 234 56')
    })
  })

  // Phone number validation tests
  describe('Phone Number Validation', () => {
    const validatePhoneNumber = (number: string) => {
      const phoneRegex = /^\+?[1-9]\d{9,14}$/
      return phoneRegex.test(number.replace(/\D/g, ''))
    }

    it('validates phone numbers correctly', () => {
      expect(validatePhoneNumber('+1234567890')).toBe(true)
      expect(validatePhoneNumber('1234567890')).toBe(true)
      expect(validatePhoneNumber('+123456789012345')).toBe(true)
      expect(validatePhoneNumber('123')).toBe(false)
      expect(validatePhoneNumber('abc')).toBe(false)
      expect(validatePhoneNumber('')).toBe(false)
    })
  })

  // Navigation and user flow tests
  describe('Navigation and User Flow', () => {
    const handleSendCode = async (phoneNumber: string) => {
      if (!phoneNumber.trim() || phoneNumber.length < 11) {
        Alert.alert('Error', 'Invalid phone number')
        return
      }

      const formattedPhone = phoneNumber.replace(/[^\d+]/g, '')

      const existingUser = await queries.getUserByPhone(formattedPhone)
      const otp = formattedPhone.slice(-4)
      const userExists = !!existingUser

      return {
        phoneNumber: formattedPhone,
        userExists,
        otp: __DEV__ ? otp : undefined,
      }
    }

    it('handles valid phone number submission', async () => {
      ;(queries.getUserByPhone as jest.Mock).mockResolvedValueOnce({ id: 1 })

      const result = await handleSendCode('+1234567890')

      expect(result).toEqual({
        phoneNumber: '+1234567890',
        userExists: true,
        otp: '7890',
      })
      expect(queries.getUserByPhone).toHaveBeenCalledWith('+1234567890')
    })

    it('handles non-existent user', async () => {
      ;(queries.getUserByPhone as jest.Mock).mockResolvedValueOnce(null)

      const result = await handleSendCode('+1234567890')

      expect(result).toEqual({
        phoneNumber: '+1234567890',
        userExists: false,
        otp: '7890',
      })
    })

    it('rejects invalid phone numbers', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert')

      await handleSendCode('123')

      expect(alertSpy).toHaveBeenCalledWith('Error', 'Invalid phone number')
      expect(queries.getUserByPhone).not.toHaveBeenCalled()
    })

    it('handles API errors gracefully', async () => {
      ;(queries.getUserByPhone as jest.Mock).mockRejectedValueOnce(
        new Error('API Error'),
      )

      await expect(handleSendCode('+1234567890')).rejects.toThrow('API Error')
    })
  })

  // Session handling tests
  describe('Session Handling', () => {
    it('handles reset parameter correctly', () => {
      const handleReset = (reset: string) => {
        if (reset === 'true') {
          mockRouter.setParams({})
        }
      }

      handleReset('true')
      expect(mockRouter.setParams).toHaveBeenCalledWith({})

      handleReset('false')
      expect(mockRouter.setParams).toHaveBeenCalledTimes(1) // Still only called once
    })
  })
})
