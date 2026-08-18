import { LoginState } from '@/models/AuthStore'

describe('LoginState', () => {
  let loginState: any

  beforeEach(() => {
    loginState = LoginState.create({})
  })

  describe('Initial State', () => {
    it('should have empty email and password', () => {
      expect(loginState.email).toBe('')
      expect(loginState.password).toBe('')
    })

    it('should not be loading', () => {
      expect(loginState.isLoading).toBe(false)
    })

    it('should have no focused field', () => {
      expect(loginState.currentFocused).toBe(null)
    })

    it('should have no validation errors', () => {
      expect(loginState.validationErrors.length).toBe(0)
    })
  })

  describe('Email Input', () => {
    it('should update email value', () => {
      loginState.setEmail('test@example.com')
      expect(loginState.email).toBe('test@example.com')
    })

    it('should clear email validation errors when email is updated', () => {
      loginState.setValidationError('email', 'Email is required')
      loginState.setValidationError('password', 'Password is required')

      expect(loginState.validationErrors.length).toBe(2)

      loginState.setEmail('test@example.com')

      expect(loginState.validationErrors.length).toBe(1)
      expect(loginState.validationErrors[0].field).toBe('password')
    })

    it('should handle multiple email updates', () => {
      loginState.setEmail('first@example.com')
      expect(loginState.email).toBe('first@example.com')

      loginState.setEmail('second@example.com')
      expect(loginState.email).toBe('second@example.com')
    })
  })

  describe('Password Input', () => {
    it('should update password value', () => {
      loginState.setPassword('password123')
      expect(loginState.password).toBe('password123')
    })

    it('should clear password validation errors when password is updated', () => {
      loginState.setValidationError('email', 'Email is required')
      loginState.setValidationError('password', 'Password is required')

      expect(loginState.validationErrors.length).toBe(2)

      loginState.setPassword('password123')

      expect(loginState.validationErrors.length).toBe(1)
      expect(loginState.validationErrors[0].field).toBe('email')
    })

    it('should handle multiple password updates', () => {
      loginState.setPassword('password1')
      expect(loginState.password).toBe('password1')

      loginState.setPassword('password2')
      expect(loginState.password).toBe('password2')
    })
  })

  describe('Focus Management', () => {
    it('should set focused field to email', () => {
      loginState.setFocused('email')
      expect(loginState.currentFocused).toBe('email')
    })

    it('should set focused field to password', () => {
      loginState.setFocused('password')
      expect(loginState.currentFocused).toBe('password')
    })

    it('should clear focused field', () => {
      loginState.setFocused('email')
      expect(loginState.currentFocused).toBe('email')

      loginState.setFocused(null)
      expect(loginState.currentFocused).toBe(null)
    })

    it('should switch focus between fields', () => {
      loginState.setFocused('email')
      expect(loginState.currentFocused).toBe('email')

      loginState.setFocused('password')
      expect(loginState.currentFocused).toBe('password')

      loginState.setFocused('email')
      expect(loginState.currentFocused).toBe('email')
    })
  })

  describe('Validation Errors', () => {
    it('should add a validation error', () => {
      loginState.setValidationError('email', 'Email is required')
      expect(loginState.validationErrors.length).toBe(1)
      expect(loginState.validationErrors[0].field).toBe('email')
      expect(loginState.validationErrors[0].message).toBe('Email is required')
    })

    it('should add multiple validation errors', () => {
      loginState.setValidationError('email', 'Email is required')
      loginState.setValidationError('password', 'Password is required')

      expect(loginState.validationErrors.length).toBe(2)
    })

    it('should update existing validation error', () => {
      loginState.setValidationError('email', 'Email is required')
      expect(loginState.validationErrors[0].message).toBe('Email is required')

      loginState.setValidationError('email', 'Invalid email format')
      expect(loginState.validationErrors.length).toBe(1)
      expect(loginState.validationErrors[0].message).toBe(
        'Invalid email format',
      )
    })

    it('should clear all validation errors', () => {
      loginState.setValidationError('email', 'Email is required')
      loginState.setValidationError('password', 'Password is required')

      expect(loginState.validationErrors.length).toBe(2)

      loginState.clearValidationErrors()
      expect(loginState.validationErrors.length).toBe(0)
    })
  })

  describe('Reset', () => {
    it('should reset all state to initial values', () => {
      loginState.setEmail('test@example.com')
      loginState.setPassword('password123')
      loginState.setFocused('email')
      loginState.setValidationError('email', 'Some error')

      loginState.reset()

      expect(loginState.email).toBe('')
      expect(loginState.password).toBe('')
      expect(loginState.isLoading).toBe(false)
      expect(loginState.currentFocused).toBe(null)
      expect(loginState.validationErrors.length).toBe(0)
    })

    it('should reset multiple times', () => {
      loginState.setEmail('test1@example.com')
      loginState.reset()
      expect(loginState.email).toBe('')

      loginState.setEmail('test2@example.com')
      loginState.reset()
      expect(loginState.email).toBe('')
    })
  })

  describe('State Persistence', () => {
    it('should maintain state across multiple operations', () => {
      loginState.setEmail('test@example.com')
      loginState.setPassword('password123')
      loginState.setFocused('email')

      expect(loginState.email).toBe('test@example.com')
      expect(loginState.password).toBe('password123')
      expect(loginState.currentFocused).toBe('email')
    })

    it('should handle mixed operations correctly', () => {
      loginState.setEmail('test@example.com')
      loginState.setFocused('email')
      loginState.setValidationError('email', 'Error')

      expect(loginState.email).toBe('test@example.com')
      expect(loginState.currentFocused).toBe('email')
      expect(loginState.validationErrors.length).toBe(1)

      loginState.setEmail('new@example.com')

      expect(loginState.email).toBe('new@example.com')
      expect(loginState.currentFocused).toBe('email')
      expect(loginState.validationErrors.length).toBe(0)
    })
  })
})
