// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { render } from '@testing-library/react-native'
import SignupScreen from '@/app/(auth)/signup'

// Simplified mock setup
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({ sessionId: 'test-session-id' }),
  useFocusEffect: jest.fn(callback => callback()), // no-op
}))

jest.mock('@/utils/storage', () => ({
  storage: { set: jest.fn() },
}))

jest.mock('@andojo/shared-interaction-tracking', () => ({
  useInteractionTracking: () => ({ trackScreenMount: jest.fn() }),
}))

// Core validation functions
const validateField = (field: string, value: string): string | null => {
  const emailRegex =
    /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.(?:[a-zA-Z]{2,})$/

  switch (field) {
    case 'name':
      if (!value) return 'Name is required'
      if (value.length < 2) return 'Name must be at least 2 characters'
      if (value.length > 50) return 'Name cannot exceed 50 characters'
      if (!/^[\p{L}\s'-]+$/u.test(value)) {
        return 'Name can only contain letters, spaces, hyphens and apostrophes'
      }
      return null
    case 'email':
      if (!value) return 'Email is required'
      if (!emailRegex.test(value)) return 'Invalid email format'
      if (value.length > 100) return 'Email cannot exceed 100 characters'
      return null
    case 'password':
      if (!value) return 'Password is required'
      if (value.length < 8) return 'Password must be at least 8 characters'
      if (value.length > 100) return 'Password cannot exceed 100 characters'
      if (!/[A-Z]/.test(value)) {
        return 'Password must contain at least one uppercase letter'
      }
      if (!/[a-z]/.test(value)) {
        return 'Password must contain at least one lowercase letter'
      }
      if (!/[0-9]/.test(value)) {
        return 'Password must contain at least one number'
      }
      if (!/[!@#$%^&*]/.test(value)) {
        return 'Password must contain at least one special character'
      }
      return null
    default:
      return null
  }
}

describe('Signup Validation', () => {
  // Basic render test
  it('renders without crashing', () => {
    const { getByText } = render(<SignupScreen />)
    expect(getByText('Sign Up')).toBeTruthy()
  })

  // Name validation
  describe('Name Validation', () => {
    const validNames = [
      'John Doe',
      'Mary-Jane',
      "O'Connor",
      'Jean-Pierre',
      'José María',
      'Renée',
      'François',
      'Søren',
      'Björk',
      'Zoë',
    ]

    const invalidNames = [
      { value: '', error: 'Name is required' },
      { value: 'a', error: 'Name must be at least 2 characters' },
      { value: 'A'.repeat(51), error: 'Name cannot exceed 50 characters' },
      {
        value: 'John123',
        error: 'Name can only contain letters, spaces, hyphens and apostrophes',
      },
      {
        value: 'John@Doe',
        error: 'Name can only contain letters, spaces, hyphens and apostrophes',
      },
      {
        value: 'John_Doe',
        error: 'Name can only contain letters, spaces, hyphens and apostrophes',
      },
    ]

    it('accepts valid names', () => {
      validNames.forEach(name => {
        expect(validateField('name', name)).toBeNull()
      })
    })

    it('rejects invalid names', () => {
      invalidNames.forEach(({ value, error }) => {
        expect(validateField('name', value)).toBe(error)
      })
    })
  })

  // Email validation
  describe('Email Validation', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'firstname.lastname@domain.com',
      'email@subdomain.domain.com',
      'user123@domain.com',
      'user@domain-one.com',
      'user.name@domain.co.jp',
    ]

    const invalidEmails = [
      { value: '', error: 'Email is required' },
      { value: 'plainaddress', error: 'Invalid email format' },
      { value: '@domain.com', error: 'Invalid email format' },
      { value: 'email@domain', error: 'Invalid email format' },
      { value: 'email.domain.com', error: 'Invalid email format' },
      { value: 'email@.com', error: 'Invalid email format' },
      { value: 'email@domain..com', error: 'Invalid email format' },
      { value: '.email@domain.com', error: 'Invalid email format' },
      { value: 'email.@domain.com', error: 'Invalid email format' },
      { value: 'email@-domain.com', error: 'Invalid email format' },
      { value: 'email@domain.c', error: 'Invalid email format' },
      { value: '_______@domain.com', error: 'Invalid email format' },
      {
        value: `${'a'.repeat(90)}@${'b'.repeat(20)}.com`,
        error: 'Email cannot exceed 100 characters',
      },
    ]

    it('accepts valid emails', () => {
      validEmails.forEach(email => {
        expect(validateField('email', email)).toBeNull()
      })
    })

    it('rejects invalid emails', () => {
      invalidEmails.forEach(({ value, error }) => {
        expect(validateField('email', value)).toBe(error)
      })
    })
  })

  // Password validation
  describe('Password Validation', () => {
    const validPasswords = [
      'Password123!',
      'StrongP@ss1',
      'C0mpl3x!Pass',
      'Sup3r$3cur3',
      'Test1ng@Pass',
    ]

    const invalidPasswords = [
      { value: '', error: 'Password is required' },
      { value: 'short', error: 'Password must be at least 8 characters' },
      {
        value: 'password123!',
        error: 'Password must contain at least one uppercase letter',
      },
      {
        value: 'PASSWORD123!',
        error: 'Password must contain at least one lowercase letter',
      },
      {
        value: 'Password!',
        error: 'Password must contain at least one number',
      },
      {
        value: 'Password123',
        error: 'Password must contain at least one special character',
      },
      {
        value: 'P'.repeat(101),
        error: 'Password cannot exceed 100 characters',
      },
    ]

    it('accepts valid passwords', () => {
      validPasswords.forEach(password => {
        expect(validateField('password', password)).toBeNull()
      })
    })

    it('rejects invalid passwords', () => {
      invalidPasswords.forEach(({ value, error }) => {
        expect(validateField('password', value)).toBe(error)
      })
    })
  })

  // Form validation
  describe('Form Validation', () => {
    it('validates complete form data', () => {
      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
      }

      const errors = Object.entries(formData)
        .map(([field, value]) => validateField(field, value))
        .filter(Boolean)

      expect(errors.length).toBe(0)
    })

    it('validates incomplete form data', () => {
      const formData = {
        name: '',
        email: 'invalid',
        password: 'short',
      }

      const errors = Object.entries(formData)
        .map(([field, value]) => validateField(field, value))
        .filter(Boolean)

      expect(errors.length).toBe(3)
    })

    it('validates mixed valid/invalid data', () => {
      const formData = {
        name: 'John Doe', // valid
        email: 'invalid', // invalid
        password: 'Password123!', // valid
      }

      const errors = Object.entries(formData)
        .map(([field, value]) => validateField(field, value))
        .filter(Boolean)

      expect(errors.length).toBe(1)
      expect(errors[0]).toBe('Invalid email format')
    })
  })
})
