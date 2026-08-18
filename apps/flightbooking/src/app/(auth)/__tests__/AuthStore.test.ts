// Copyright (c) Meta Platforms, Inc. and affiliates.
import { AuthStoreModel } from '@/models/AuthStore'

describe('AuthStore', () => {
  let authStore: any

  beforeEach(() => {
    authStore = AuthStoreModel.create({})
  })

  describe('LoginState', () => {
    it('should initialize with empty values', () => {
      expect(authStore.loginState.email).toBe('')
      expect(authStore.loginState.password).toBe('')
      expect(authStore.loginState.isLoading).toBe(false)
      expect(authStore.loginState.currentFocused).toBe(null)
      expect(authStore.loginState.validationErrors.length).toBe(0)
    })

    it('should set email and clear email validation errors', () => {
      authStore.loginState.setValidationError('email', 'Email is required')
      expect(authStore.loginState.validationErrors.length).toBe(1)

      authStore.loginState.setEmail('test@example.com')
      expect(authStore.loginState.email).toBe('test@example.com')
      expect(authStore.loginState.validationErrors.length).toBe(0)
    })

    it('should set password and clear password validation errors', () => {
      authStore.loginState.setValidationError(
        'password',
        'Password is required',
      )
      expect(authStore.loginState.validationErrors.length).toBe(1)

      authStore.loginState.setPassword('password123')
      expect(authStore.loginState.password).toBe('password123')
      expect(authStore.loginState.validationErrors.length).toBe(0)
    })

    it('should set focused field', () => {
      authStore.loginState.setFocused('email')
      expect(authStore.loginState.currentFocused).toBe('email')

      authStore.loginState.setFocused('password')
      expect(authStore.loginState.currentFocused).toBe('password')

      authStore.loginState.setFocused(null)
      expect(authStore.loginState.currentFocused).toBe(null)
    })

    it('should reset login state', () => {
      authStore.loginState.setEmail('test@example.com')
      authStore.loginState.setPassword('password123')
      authStore.loginState.setFocused('email')
      authStore.loginState.setValidationError('email', 'Some error')

      authStore.loginState.reset()

      expect(authStore.loginState.email).toBe('')
      expect(authStore.loginState.password).toBe('')
      expect(authStore.loginState.isLoading).toBe(false)
      expect(authStore.loginState.currentFocused).toBe(null)
      expect(authStore.loginState.validationErrors.length).toBe(0)
    })

    it('should clear all validation errors', () => {
      authStore.loginState.setValidationError('email', 'Email error')
      authStore.loginState.setValidationError('password', 'Password error')
      expect(authStore.loginState.validationErrors.length).toBe(2)

      authStore.loginState.clearValidationErrors()
      expect(authStore.loginState.validationErrors.length).toBe(0)
    })
  })

  describe('SignupState', () => {
    it('should initialize with empty values', () => {
      expect(authStore.signupState.name).toBe('')
      expect(authStore.signupState.email).toBe('')
      expect(authStore.signupState.password).toBe('')
      expect(authStore.signupState.isLoading).toBe(false)
      expect(authStore.signupState.currentFocused).toBe(null)
      expect(authStore.signupState.validationErrors.length).toBe(0)
    })

    it('should set name and clear name validation errors', () => {
      authStore.signupState.setValidationError('name', 'Name is required')
      expect(authStore.signupState.validationErrors.length).toBe(1)

      authStore.signupState.setName('John Doe')
      expect(authStore.signupState.name).toBe('John Doe')
      expect(authStore.signupState.validationErrors.length).toBe(0)
    })

    it('should set email and clear email validation errors', () => {
      authStore.signupState.setValidationError('email', 'Email is required')
      expect(authStore.signupState.validationErrors.length).toBe(1)

      authStore.signupState.setEmail('test@example.com')
      expect(authStore.signupState.email).toBe('test@example.com')
      expect(authStore.signupState.validationErrors.length).toBe(0)
    })

    it('should set password and clear password validation errors', () => {
      authStore.signupState.setValidationError(
        'password',
        'Password is required',
      )
      expect(authStore.signupState.validationErrors.length).toBe(1)

      authStore.signupState.setPassword('password123')
      expect(authStore.signupState.password).toBe('password123')
      expect(authStore.signupState.validationErrors.length).toBe(0)
    })

    it('should reset signup state', () => {
      authStore.signupState.setName('John Doe')
      authStore.signupState.setEmail('test@example.com')
      authStore.signupState.setPassword('password123')
      authStore.signupState.setFocused('email')
      authStore.signupState.setValidationError('email', 'Some error')

      authStore.signupState.reset()

      expect(authStore.signupState.name).toBe('')
      expect(authStore.signupState.email).toBe('')
      expect(authStore.signupState.password).toBe('')
      expect(authStore.signupState.isLoading).toBe(false)
      expect(authStore.signupState.currentFocused).toBe(null)
      expect(authStore.signupState.validationErrors.length).toBe(0)
    })
  })

  describe('Validation', () => {
    describe('Login Validation', () => {
      it('should validate empty email', () => {
        authStore.setCurrentScreen('login')
        authStore.loginState.setEmail('')
        authStore.loginState.setPassword('password123')

        const isValid = authStore.validateLoginFields()
        expect(isValid).toBe(false)
        expect(authStore.getValidationError('email')).toBe('Email is required')
      })

      it('should validate invalid email format', () => {
        authStore.setCurrentScreen('login')
        authStore.loginState.setEmail('invalid-email')
        authStore.loginState.setPassword('password123')

        const isValid = authStore.validateLoginFields()
        expect(isValid).toBe(false)
        expect(authStore.getValidationError('email')).toBe(
          'Invalid email format',
        )
      })

      it('should validate empty password', () => {
        authStore.setCurrentScreen('login')
        authStore.loginState.setEmail('test@example.com')
        authStore.loginState.setPassword('')

        const isValid = authStore.validateLoginFields()
        expect(isValid).toBe(false)
        expect(authStore.getValidationError('password')).toBe(
          'Password is required',
        )
      })

      it('should validate short password', () => {
        authStore.setCurrentScreen('login')
        authStore.loginState.setEmail('test@example.com')
        authStore.loginState.setPassword('12345')

        const isValid = authStore.validateLoginFields()
        expect(isValid).toBe(false)
        expect(authStore.getValidationError('password')).toBe(
          'Password must be at least 6 characters',
        )
      })

      it('should pass validation with valid credentials', () => {
        authStore.setCurrentScreen('login')
        authStore.loginState.setEmail('test@example.com')
        authStore.loginState.setPassword('password123')

        const isValid = authStore.validateLoginFields()
        expect(isValid).toBe(true)
      })
    })

    describe('Signup Validation', () => {
      it('should validate empty name', () => {
        authStore.setCurrentScreen('signup')
        authStore.signupState.setName('')
        authStore.signupState.setEmail('test@example.com')
        authStore.signupState.setPassword('password123')

        const isValid = authStore.validateSignupFields()
        expect(isValid).toBe(false)
        expect(authStore.getValidationError('name')).toBe('Name is required')
      })

      it('should validate empty email', () => {
        authStore.setCurrentScreen('signup')
        authStore.signupState.setName('John Doe')
        authStore.signupState.setEmail('')
        authStore.signupState.setPassword('password123')

        const isValid = authStore.validateSignupFields()
        expect(isValid).toBe(false)
        expect(authStore.getValidationError('email')).toBe('Email is required')
      })

      it('should validate invalid email format', () => {
        authStore.setCurrentScreen('signup')
        authStore.signupState.setName('John Doe')
        authStore.signupState.setEmail('invalid-email')
        authStore.signupState.setPassword('password123')

        const isValid = authStore.validateSignupFields()
        expect(isValid).toBe(false)
        expect(authStore.getValidationError('email')).toBe(
          'Invalid email format',
        )
      })

      it('should validate empty password', () => {
        authStore.setCurrentScreen('signup')
        authStore.signupState.setName('John Doe')
        authStore.signupState.setEmail('test@example.com')
        authStore.signupState.setPassword('')

        const isValid = authStore.validateSignupFields()
        expect(isValid).toBe(false)
        expect(authStore.getValidationError('password')).toBe(
          'Password is required',
        )
      })

      it('should validate short password', () => {
        authStore.setCurrentScreen('signup')
        authStore.signupState.setName('John Doe')
        authStore.signupState.setEmail('test@example.com')
        authStore.signupState.setPassword('12345')

        const isValid = authStore.validateSignupFields()
        expect(isValid).toBe(false)
        expect(authStore.getValidationError('password')).toBe(
          'Password must be at least 6 characters',
        )
      })

      it('should pass validation with valid credentials', () => {
        authStore.setCurrentScreen('signup')
        authStore.signupState.setName('John Doe')
        authStore.signupState.setEmail('test@example.com')
        authStore.signupState.setPassword('password123')

        const isValid = authStore.validateSignupFields()
        expect(isValid).toBe(true)
      })
    })
  })

  describe('Current Screen', () => {
    it('should set current screen', () => {
      expect(authStore.currentScreen).toBe('none')

      authStore.setCurrentScreen('login')
      expect(authStore.currentScreen).toBe('login')

      authStore.setCurrentScreen('signup')
      expect(authStore.currentScreen).toBe('signup')

      authStore.setCurrentScreen('none')
      expect(authStore.currentScreen).toBe('none')
    })

    it('should return active state based on current screen', () => {
      authStore.setCurrentScreen('login')
      expect(authStore.activeState).toBe(authStore.loginState)

      authStore.setCurrentScreen('signup')
      expect(authStore.activeState).toBe(authStore.signupState)
    })
  })

  describe('Reset', () => {
    it('should reset all auth state', () => {
      authStore.setCurrentScreen('login')
      authStore.loginState.setEmail('test@example.com')
      authStore.signupState.setName('John Doe')

      authStore.reset()

      expect(authStore.currentScreen).toBe('none')
      expect(authStore.loginState.email).toBe('')
      expect(authStore.signupState.name).toBe('')
    })
  })

  describe('Validation Error Management', () => {
    it('should add validation error', () => {
      authStore.setCurrentScreen('login')
      authStore.loginState.setValidationError('email', 'Email is required')

      expect(authStore.loginState.validationErrors.length).toBe(1)
      expect(authStore.getValidationError('email')).toBe('Email is required')
    })

    it('should update existing validation error', () => {
      authStore.setCurrentScreen('login')
      authStore.loginState.setValidationError('email', 'Email is required')
      authStore.loginState.setValidationError('email', 'Invalid email format')

      expect(authStore.loginState.validationErrors.length).toBe(1)
      expect(authStore.getValidationError('email')).toBe('Invalid email format')
    })

    it('should check if has validation errors', () => {
      authStore.setCurrentScreen('login')
      expect(authStore.hasValidationErrors).toBe(false)

      authStore.loginState.setValidationError('email', 'Email is required')
      expect(authStore.hasValidationErrors).toBe(true)
    })
  })
})
