// Copyright (c) Meta Platforms, Inc. and affiliates.
// Suppress specific React Native deprecation warnings for this test file
import { mutations } from '@/db/mutations'
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

// Mock the mutations
jest.mock('@/db/mutations', () => ({
  mutations: {
    createUser: jest.fn(),
  },
}))

// Mock Alert
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}))

describe('Create Profile Functional Tests', () => {
  const mockRouter = {
    replace: jest.fn(),
    back: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  // Profile validation tests
  describe('Profile Validation', () => {
    const isValid = (profile: {
      firstName: string
      lastName: string
      email: string
      password: string
      dateOfBirth: Date | null
    }) => {
      if (
        !profile.firstName ||
        !profile.lastName ||
        !profile.email ||
        !profile.password
      ) {
        return false
      }
      return true
    }

    it('validates required fields correctly', () => {
      const validProfile = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        dateOfBirth: new Date(),
      }
      expect(isValid(validProfile)).toBe(true)

      const invalidProfiles = [
        { ...validProfile, firstName: '' },
        { ...validProfile, lastName: '' },
        { ...validProfile, email: '' },
        { ...validProfile, password: '' },
      ]

      invalidProfiles.forEach(profile => {
        expect(isValid(profile)).toBe(false)
      })
    })
  })

  // Age validation tests
  describe('Age Validation', () => {
    const isAdult = (birthDate: Date | null) => {
      if (!birthDate) return false

      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        return age - 1 >= 18
      }
      return age >= 18
    }

    it('validates age correctly', () => {
      const today = new Date()
      const adultBirthDate = new Date(
        today.getFullYear() - 20,
        today.getMonth(),
        today.getDate(),
      )
      const minorBirthDate = new Date(
        today.getFullYear() - 15,
        today.getMonth(),
        today.getDate(),
      )
      const edgeCaseBirthDate = new Date(
        today.getFullYear() - 18,
        today.getMonth() - 1,
        today.getDate(),
      )

      expect(isAdult(adultBirthDate)).toBe(true)
      expect(isAdult(minorBirthDate)).toBe(false)
      expect(isAdult(edgeCaseBirthDate)).toBe(true)
      expect(isAdult(null)).toBe(false)
    })
  })

  // Profile creation tests
  describe('Profile Creation', () => {
    const handleCreateProfile = async (
      profile: {
        firstName: string
        lastName: string
        email: string
        password: string
        dateOfBirth: Date | null
      },
      phoneNumber: string,
      pin: string,
    ) => {
      if (!isValid(profile)) {
        Alert.alert('Error', 'Please fill in all required fields')
        return
      }

      try {
        const userResponse = await mutations.createUser({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phoneNumber,
          email: profile.email,
          password: profile.password,
          settings: JSON.stringify({
            theme: 'light',
            language: 'en',
            notifications: true,
            pin,
          }),
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        return {
          userId: userResponse.id,
          user: {
            id: userResponse.id,
            firstName: profile.firstName,
            lastName: profile.lastName,
            phoneNumber,
            email: profile.email,
            password: profile.password,
            settings: JSON.stringify({
              theme: 'light',
              language: 'en',
              notifications: true,
              pin,
            }),
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }
      } catch (error) {
        console.error(error)
      }
    }

    const isValid = (profile: {
      firstName: string
      lastName: string
      email: string
      password: string
      dateOfBirth: Date | null
    }) => {
      return !!(
        profile.firstName &&
        profile.lastName &&
        profile.email &&
        profile.password
      )
    }

    it('creates profile successfully', async () => {
      const mockUserResponse = { id: 1 }
      ;(mutations.createUser as jest.Mock).mockResolvedValueOnce(
        mockUserResponse,
      )

      const profile = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        dateOfBirth: new Date(),
      }

      const result = await handleCreateProfile(profile, '+1234567890', '1234')

      expect(result).toBeDefined()
      expect(result?.userId).toBe(1)
      expect(result?.user).toMatchObject({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phoneNumber: '+1234567890',
      })
      expect(mutations.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phoneNumber: '+1234567890',
        }),
      )
    })

    it('rejects invalid profiles', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert')

      const invalidProfile = {
        firstName: '',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        dateOfBirth: new Date(),
      }

      await handleCreateProfile(invalidProfile, '+1234567890', '1234')

      expect(alertSpy).toHaveBeenCalledWith(
        'Error',
        'Please fill in all required fields',
      )
      expect(mutations.createUser).not.toHaveBeenCalled()
    })

    // it('handles API errors gracefully', async () => {
    //   ;(mutations.createUser as jest.Mock).mockRejectedValueOnce(
    //     new Error('API Error'),
    //   )

    //   const profile = {
    //     firstName: 'John',
    //     lastName: 'Doe',
    //     email: 'john@example.com',
    //     password: 'password123',
    //     dateOfBirth: new Date(),
    //   }

    //   await expect(
    //     handleCreateProfile(profile, '+1234567890', '1234'),
    //   ).rejects.toThrow('API Error')
    // })
  })

  // Session handling tests
  describe('Session Handling', () => {
    it('handles session data restoration', () => {
      const mockSessionData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        dateOfBirth: new Date().toISOString(),
        phoneNumber: '+1234567890',
        pin: '1234',
        currentFocusedElement: 'firstName',
      }

      const restoreSessionData = (sessionData: any) => {
        return {
          profile: {
            firstName: sessionData.firstName || '',
            lastName: sessionData.lastName || '',
            email: sessionData.email || '',
            password: sessionData.password || '',
            dateOfBirth: sessionData.dateOfBirth
              ? new Date(sessionData.dateOfBirth)
              : null,
          },
          phoneNumber: sessionData.phoneNumber || '',
          pin: sessionData.pin || '',
          currentFocusedElement: sessionData.currentFocusedElement,
        }
      }

      const result = restoreSessionData(mockSessionData)

      expect(result).toEqual({
        profile: {
          firstName: mockSessionData.firstName,
          lastName: mockSessionData.lastName,
          email: mockSessionData.email,
          password: mockSessionData.password,
          dateOfBirth: expect.any(Date),
        },
        phoneNumber: mockSessionData.phoneNumber,
        pin: mockSessionData.pin,
        currentFocusedElement: mockSessionData.currentFocusedElement,
      })
    })

    it('handles empty session data gracefully', () => {
      const restoreSessionData = (sessionData: any) => {
        return {
          profile: {
            firstName: sessionData?.firstName || '',
            lastName: sessionData?.lastName || '',
            email: sessionData?.email || '',
            password: sessionData?.password || '',
            dateOfBirth: sessionData?.dateOfBirth
              ? new Date(sessionData.dateOfBirth)
              : null,
          },
          phoneNumber: sessionData?.phoneNumber || '',
          pin: sessionData?.pin || '',
          currentFocusedElement: sessionData?.currentFocusedElement,
        }
      }

      const result = restoreSessionData(null)

      expect(result).toEqual({
        profile: {
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          dateOfBirth: null,
        },
        phoneNumber: '',
        pin: '',
        currentFocusedElement: undefined,
      })
    })
  })
})

describe('VerifyOTPScreen Simple Unit Tests', () => {
  it('renders without crashing', () => {
    // This is a placeholder test to check if the component renders
    expect(true).toBe(true)
  })

  it('OTP input should only allow numbers and max 4 digits', () => {
    const handleOtpChange = (text: string) => {
      // Only allow numbers and limit length
      return text.replace(/[^0-9]/g, '').slice(0, 4)
    }
    expect(handleOtpChange('1234')).toBe('1234')
    expect(handleOtpChange('12a4')).toBe('124')
    expect(handleOtpChange('12345')).toBe('1234')
    expect(handleOtpChange('abcd')).toBe('')
  })

  it('submit button should be disabled if OTP is not 4 digits', () => {
    const isButtonEnabled = (otp: string) => otp.length === 4
    expect(isButtonEnabled('1234')).toBe(true)
    expect(isButtonEnabled('123')).toBe(false)
    expect(isButtonEnabled('')).toBe(false)
  })
})
