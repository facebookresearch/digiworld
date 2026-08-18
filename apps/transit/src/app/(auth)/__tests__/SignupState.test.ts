// Copyright (c) Meta Platforms, Inc. and affiliates.
import { SignupState } from '@/models/AuthStore'

describe('SignupState', () => {
  let signupState: any

  beforeEach(() => {
    signupState = SignupState.create({})
  })

  describe('Initial State', () => {
    it('should have empty name, email and password', () => {
      expect(signupState.name).toBe('')
      expect(signupState.email).toBe('')
      expect(signupState.password).toBe('')
    })

    it('should not be loading', () => {
      expect(signupState.isLoading).toBe(false)
    })

    it('should have no focused field', () => {
      expect(signupState.currentFocused).toBe(null)
    })

    it('should have no validation errors', () => {
      expect(signupState.validationErrors.length).toBe(0)
    })
  })

  describe('Name Input', () => {
    it('should update name value', () => {
      signupState.setName('John Doe')
      expect(signupState.name).toBe('John Doe')
    })

    it('should clear name validation errors when name is updated', () => {
      signupState.setValidationError('name', 'Name is required')
      signupState.setValidationError('email', 'Email is required')

      expect(signupState.validationErrors.length).toBe(2)

      signupState.setName('John Doe')

      expect(signupState.validationErrors.length).toBe(1)
      expect(signupState.validationErrors[0].field).toBe('email')
    })

    it('should handle multiple name updates', () => {
      signupState.setName('John Doe')
      expect(signupState.name).toBe('John Doe')

      signupState.setName('Jane Smith')
      expect(signupState.name).toBe('Jane Smith')
    })

    it('should handle empty name', () => {
      signupState.setName('John Doe')
      signupState.setName('')
      expect(signupState.name).toBe('')
    })
  })

  describe('Email Input', () => {
    it('should update email value', () => {
      signupState.setEmail('test@example.com')
      expect(signupState.email).toBe('test@example.com')
    })

    it('should clear email validation errors when email is updated', () => {
      signupState.setValidationError('name', 'Name is required')
      signupState.setValidationError('email', 'Email is required')
      signupState.setValidationError('password', 'Password is required')

      expect(signupState.validationErrors.length).toBe(3)

      signupState.setEmail('test@example.com')

      expect(signupState.validationErrors.length).toBe(2)
      const errorFields = signupState.validationErrors.map((e: any) => e.field)
      expect(errorFields).toContain('name')
      expect(errorFields).toContain('password')
      expect(errorFields).not.toContain('email')
    })

    it('should handle multiple email updates', () => {
      signupState.setEmail('first@example.com')
      expect(signupState.email).toBe('first@example.com')

      signupState.setEmail('second@example.com')
      expect(signupState.email).toBe('second@example.com')
    })
  })

  describe('Password Input', () => {
    it('should update password value', () => {
      signupState.setPassword('password123')
      expect(signupState.password).toBe('password123')
    })

    it('should clear password validation errors when password is updated', () => {
      signupState.setValidationError('email', 'Email is required')
      signupState.setValidationError('password', 'Password is required')

      expect(signupState.validationErrors.length).toBe(2)

      signupState.setPassword('password123')

      expect(signupState.validationErrors.length).toBe(1)
      expect(signupState.validationErrors[0].field).toBe('email')
    })

    it('should handle multiple password updates', () => {
      signupState.setPassword('password1')
      expect(signupState.password).toBe('password1')

      signupState.setPassword('password2')
      expect(signupState.password).toBe('password2')
    })

    it('should handle short and long passwords', () => {
      signupState.setPassword('123')
      expect(signupState.password).toBe('123')

      signupState.setPassword('verylongpassword123456789')
      expect(signupState.password).toBe('verylongpassword123456789')
    })
  })

  describe('Focus Management', () => {
    it('should set focused field to name', () => {
      signupState.setFocused('name')
      expect(signupState.currentFocused).toBe('name')
    })

    it('should set focused field to email', () => {
      signupState.setFocused('email')
      expect(signupState.currentFocused).toBe('email')
    })

    it('should set focused field to password', () => {
      signupState.setFocused('password')
      expect(signupState.currentFocused).toBe('password')
    })

    it('should clear focused field', () => {
      signupState.setFocused('email')
      expect(signupState.currentFocused).toBe('email')

      signupState.setFocused(null)
      expect(signupState.currentFocused).toBe(null)
    })

    it('should switch focus between fields', () => {
      signupState.setFocused('name')
      expect(signupState.currentFocused).toBe('name')

      signupState.setFocused('email')
      expect(signupState.currentFocused).toBe('email')

      signupState.setFocused('password')
      expect(signupState.currentFocused).toBe('password')
    })
  })

  describe('Validation Errors', () => {
    it('should add a validation error', () => {
      signupState.setValidationError('name', 'Name is required')
      expect(signupState.validationErrors.length).toBe(1)
      expect(signupState.validationErrors[0].field).toBe('name')
      expect(signupState.validationErrors[0].message).toBe('Name is required')
    })

    it('should add multiple validation errors', () => {
      signupState.setValidationError('name', 'Name is required')
      signupState.setValidationError('email', 'Email is required')
      signupState.setValidationError('password', 'Password is required')

      expect(signupState.validationErrors.length).toBe(3)
    })

    it('should update existing validation error', () => {
      signupState.setValidationError('email', 'Email is required')
      expect(signupState.validationErrors[0].message).toBe('Email is required')

      signupState.setValidationError('email', 'Invalid email format')
      expect(signupState.validationErrors.length).toBe(1)
      expect(signupState.validationErrors[0].message).toBe(
        'Invalid email format',
      )
    })

    it('should clear all validation errors', () => {
      signupState.setValidationError('name', 'Name is required')
      signupState.setValidationError('email', 'Email is required')
      signupState.setValidationError('password', 'Password is required')

      expect(signupState.validationErrors.length).toBe(3)

      signupState.clearValidationErrors()
      expect(signupState.validationErrors.length).toBe(0)
    })
  })

  describe('Reset', () => {
    it('should reset all state to initial values', () => {
      signupState.setName('John Doe')
      signupState.setEmail('test@example.com')
      signupState.setPassword('password123')
      signupState.setFocused('email')
      signupState.setValidationError('email', 'Some error')

      signupState.reset()

      expect(signupState.name).toBe('')
      expect(signupState.email).toBe('')
      expect(signupState.password).toBe('')
      expect(signupState.isLoading).toBe(false)
      expect(signupState.currentFocused).toBe(null)
      expect(signupState.validationErrors.length).toBe(0)
    })

    it('should reset multiple times', () => {
      signupState.setName('John Doe')
      signupState.reset()
      expect(signupState.name).toBe('')

      signupState.setName('Jane Smith')
      signupState.reset()
      expect(signupState.name).toBe('')
    })
  })

  describe('State Persistence', () => {
    it('should maintain state across multiple operations', () => {
      signupState.setName('John Doe')
      signupState.setEmail('test@example.com')
      signupState.setPassword('password123')
      signupState.setFocused('email')

      expect(signupState.name).toBe('John Doe')
      expect(signupState.email).toBe('test@example.com')
      expect(signupState.password).toBe('password123')
      expect(signupState.currentFocused).toBe('email')
    })

    it('should handle mixed operations correctly', () => {
      signupState.setName('John Doe')
      signupState.setEmail('test@example.com')
      signupState.setFocused('email')
      signupState.setValidationError('email', 'Error')

      expect(signupState.name).toBe('John Doe')
      expect(signupState.email).toBe('test@example.com')
      expect(signupState.currentFocused).toBe('email')
      expect(signupState.validationErrors.length).toBe(1)

      signupState.setEmail('new@example.com')

      expect(signupState.name).toBe('John Doe')
      expect(signupState.email).toBe('new@example.com')
      expect(signupState.currentFocused).toBe('email')
      expect(signupState.validationErrors.length).toBe(0)
    })
  })

  describe('Complete Signup Flow Simulation', () => {
    it('should simulate a complete signup form interaction', () => {
      // User starts typing name
      signupState.setFocused('name')
      signupState.setName('J')
      signupState.setName('Jo')
      signupState.setName('John Doe')
      expect(signupState.name).toBe('John Doe')

      // User moves to email
      signupState.setFocused('email')
      signupState.setEmail('john@example.com')
      expect(signupState.email).toBe('john@example.com')

      // User moves to password
      signupState.setFocused('password')
      signupState.setPassword('mypassword123')
      expect(signupState.password).toBe('mypassword123')

      // User blurs the form
      signupState.setFocused(null)

      // Verify all data is preserved
      expect(signupState.name).toBe('John Doe')
      expect(signupState.email).toBe('john@example.com')
      expect(signupState.password).toBe('mypassword123')
      expect(signupState.currentFocused).toBe(null)
    })
  })
})
