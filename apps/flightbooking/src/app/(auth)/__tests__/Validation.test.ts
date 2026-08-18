import { AuthStoreModel } from '@/models/AuthStore'

describe('Authentication Validation', () => {
  let authStore: any

  beforeEach(() => {
    authStore = AuthStoreModel.create({})
  })

  describe('Email Validation', () => {
    describe('Login Email', () => {
      it('should fail with empty email', () => {
        authStore.setCurrentScreen('login')
        authStore.loginState.setEmail('')
        authStore.loginState.setPassword('validpassword')

        const isValid = authStore.validateLoginFields()

        expect(isValid).toBe(false)
        expect(authStore.getValidationError('email')).toBe('Email is required')
      })

      it('should fail with invalid email format - no @', () => {
        authStore.setCurrentScreen('login')
        authStore.loginState.setEmail('invalidemail.com')
        authStore.loginState.setPassword('validpassword')

        const isValid = authStore.validateLoginFields()

        expect(isValid).toBe(false)
        expect(authStore.getValidationError('email')).toBe(
          'Invalid email format',
        )
      })

      it('should fail with invalid email format - no domain', () => {
        authStore.setCurrentScreen('login')
        authStore.loginState.setEmail('invalid@')
        authStore.loginState.setPassword('validpassword')

        const isValid = authStore.validateLoginFields()

        expect(isValid).toBe(false)
        expect(authStore.getValidationError('email')).toBe(
          'Invalid email format',
        )
      })

      it('should fail with invalid email format - no extension', () => {
        authStore.setCurrentScreen('login')
        authStore.loginState.setEmail('invalid@domain')
        authStore.loginState.setPassword('validpassword')

        const isValid = authStore.validateLoginFields()

        expect(isValid).toBe(false)
        expect(authStore.getValidationError('email')).toBe(
          'Invalid email format',
        )
      })

      it('should pass with valid email', () => {
        authStore.setCurrentScreen('login')
        authStore.loginState.setEmail('valid@example.com')
        authStore.loginState.setPassword('validpassword')

        const isValid = authStore.validateLoginFields()

        expect(isValid).toBe(true)
        expect(authStore.getValidationError('email')).toBeUndefined()
      })

      it('should pass with valid email - subdomain', () => {
        authStore.setCurrentScreen('login')
        authStore.loginState.setEmail('user@mail.example.com')
        authStore.loginState.setPassword('validpassword')

        const isValid = authStore.validateLoginFields()

        expect(isValid).toBe(true)
      })

      it('should pass with valid email - plus sign', () => {
        authStore.setCurrentScreen('login')
        authStore.loginState.setEmail('user+tag@example.com')
        authStore.loginState.setPassword('validpassword')

        const isValid = authStore.validateLoginFields()

        expect(isValid).toBe(true)
      })
    })

    describe('Signup Email', () => {
      it('should fail with empty email', () => {
        authStore.setCurrentScreen('signup')
        authStore.signupState.setName('John Doe')
        authStore.signupState.setEmail('')
        authStore.signupState.setPassword('validpassword')

        const isValid = authStore.validateSignupFields()

        expect(isValid).toBe(false)
        expect(authStore.getValidationError('email')).toBe('Email is required')
      })

      it('should fail with invalid email format', () => {
        authStore.setCurrentScreen('signup')
        authStore.signupState.setName('John Doe')
        authStore.signupState.setEmail('invalidemail')
        authStore.signupState.setPassword('validpassword')

        const isValid = authStore.validateSignupFields()

        expect(isValid).toBe(false)
        expect(authStore.getValidationError('email')).toBe(
          'Invalid email format',
        )
      })

      it('should pass with valid email', () => {
        authStore.setCurrentScreen('signup')
        authStore.signupState.setName('John Doe')
        authStore.signupState.setEmail('valid@example.com')
        authStore.signupState.setPassword('validpassword')

        const isValid = authStore.validateSignupFields()

        expect(isValid).toBe(true)
      })
    })
  })

  describe('Password Validation', () => {
    describe('Login Password', () => {
      it('should fail with empty password', () => {
        authStore.setCurrentScreen('login')
        authStore.loginState.setEmail('valid@example.com')
        authStore.loginState.setPassword('')

        const isValid = authStore.validateLoginFields()

        expect(isValid).toBe(false)
        expect(authStore.getValidationError('password')).toBe(
          'Password is required',
        )
      })

      it('should fail with password less than 6 characters - 1 char', () => {
        authStore.setCurrentScreen('login')
        authStore.loginState.setEmail('valid@example.com')
        authStore.loginState.setPassword('1')

        const isValid = authStore.validateLoginFields()

        expect(isValid).toBe(false)
        expect(authStore.getValidationError('password')).toBe(
          'Password must be at least 6 characters',
        )
      })

      it('should fail with password less than 6 characters - 5 chars', () => {
        authStore.setCurrentScreen('login')
        authStore.loginState.setEmail('valid@example.com')
        authStore.loginState.setPassword('12345')

        const isValid = authStore.validateLoginFields()

        expect(isValid).toBe(false)
        expect(authStore.getValidationError('password')).toBe(
          'Password must be at least 6 characters',
        )
      })

      it('should pass with password exactly 6 characters', () => {
        authStore.setCurrentScreen('login')
        authStore.loginState.setEmail('valid@example.com')
        authStore.loginState.setPassword('123456')

        const isValid = authStore.validateLoginFields()

        expect(isValid).toBe(true)
      })

      it('should pass with password more than 6 characters', () => {
        authStore.setCurrentScreen('login')
        authStore.loginState.setEmail('valid@example.com')
        authStore.loginState.setPassword('longpassword123')

        const isValid = authStore.validateLoginFields()

        expect(isValid).toBe(true)
      })
    })

    describe('Signup Password', () => {
      it('should fail with empty password', () => {
        authStore.setCurrentScreen('signup')
        authStore.signupState.setName('John Doe')
        authStore.signupState.setEmail('valid@example.com')
        authStore.signupState.setPassword('')

        const isValid = authStore.validateSignupFields()

        expect(isValid).toBe(false)
        expect(authStore.getValidationError('password')).toBe(
          'Password is required',
        )
      })

      it('should fail with password less than 6 characters', () => {
        authStore.setCurrentScreen('signup')
        authStore.signupState.setName('John Doe')
        authStore.signupState.setEmail('valid@example.com')
        authStore.signupState.setPassword('short')

        const isValid = authStore.validateSignupFields()

        expect(isValid).toBe(false)
        expect(authStore.getValidationError('password')).toBe(
          'Password must be at least 6 characters',
        )
      })

      it('should pass with password exactly 6 characters', () => {
        authStore.setCurrentScreen('signup')
        authStore.signupState.setName('John Doe')
        authStore.signupState.setEmail('valid@example.com')
        authStore.signupState.setPassword('pass12')

        const isValid = authStore.validateSignupFields()

        expect(isValid).toBe(true)
      })

      it('should pass with long password', () => {
        authStore.setCurrentScreen('signup')
        authStore.signupState.setName('John Doe')
        authStore.signupState.setEmail('valid@example.com')
        authStore.signupState.setPassword('verylongpassword123456')

        const isValid = authStore.validateSignupFields()

        expect(isValid).toBe(true)
      })
    })
  })

  describe('Name Validation (Signup Only)', () => {
    it('should fail with empty name', () => {
      authStore.setCurrentScreen('signup')
      authStore.signupState.setName('')
      authStore.signupState.setEmail('valid@example.com')
      authStore.signupState.setPassword('validpassword')

      const isValid = authStore.validateSignupFields()

      expect(isValid).toBe(false)
      expect(authStore.getValidationError('name')).toBe('Name is required')
    })

    it('should pass with whitespace only name (current validation does not check for whitespace)', () => {
      authStore.setCurrentScreen('signup')
      authStore.signupState.setName('   ')
      authStore.signupState.setEmail('valid@example.com')
      authStore.signupState.setPassword('validpassword')

      const isValid = authStore.validateSignupFields()

      // Current implementation only checks for empty string, not whitespace
      expect(isValid).toBe(true)
    })

    it('should pass with valid name', () => {
      authStore.setCurrentScreen('signup')
      authStore.signupState.setName('John Doe')
      authStore.signupState.setEmail('valid@example.com')
      authStore.signupState.setPassword('validpassword')

      const isValid = authStore.validateSignupFields()

      expect(isValid).toBe(true)
    })

    it('should pass with single character name', () => {
      authStore.setCurrentScreen('signup')
      authStore.signupState.setName('J')
      authStore.signupState.setEmail('valid@example.com')
      authStore.signupState.setPassword('validpassword')

      const isValid = authStore.validateSignupFields()

      expect(isValid).toBe(true)
    })
  })

  describe('Multiple Field Validation Errors', () => {
    it('should show all validation errors for login when all fields are empty', () => {
      authStore.loginState.setEmail('')
      authStore.loginState.setPassword('')

      const isValid = authStore.validateLoginFields()

      expect(isValid).toBe(false)
      expect(
        authStore.loginState.validationErrors.length,
      ).toBeGreaterThanOrEqual(2)
    })

    it('should show all validation errors for signup when all fields are empty', () => {
      authStore.signupState.setName('')
      authStore.signupState.setEmail('')
      authStore.signupState.setPassword('')

      const isValid = authStore.validateSignupFields()

      expect(isValid).toBe(false)
      expect(
        authStore.signupState.validationErrors.length,
      ).toBeGreaterThanOrEqual(3)
    })

    it('should show multiple validation errors for invalid data', () => {
      authStore.loginState.setEmail('invalid')
      authStore.loginState.setPassword('123')

      const isValid = authStore.validateLoginFields()

      expect(isValid).toBe(false)
      expect(
        authStore.loginState.validationErrors.length,
      ).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Validation State Changes', () => {
    it('should update validation errors when field changes', () => {
      authStore.setCurrentScreen('login')
      authStore.loginState.setEmail('')
      authStore.validateLoginFields()

      expect(authStore.getValidationError('email')).toBe('Email is required')

      authStore.loginState.setEmail('valid@example.com')
      authStore.validateLoginFields()

      expect(authStore.getValidationError('email')).toBeUndefined()
    })

    it('should clear specific field error when field is fixed', () => {
      authStore.setCurrentScreen('signup')
      authStore.signupState.setName('')
      authStore.signupState.setEmail('invalid')
      authStore.signupState.setPassword('123')
      authStore.validateSignupFields()

      const errorCount = authStore.signupState.validationErrors.length
      expect(errorCount).toBeGreaterThan(0)

      authStore.signupState.setName('John Doe')
      authStore.validateSignupFields()

      expect(authStore.getValidationError('name')).toBeUndefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle validation after reset', () => {
      authStore.loginState.setEmail('test@example.com')
      authStore.loginState.setPassword('password123')
      authStore.validateLoginFields()

      authStore.loginState.reset()

      const isValid = authStore.validateLoginFields()
      expect(isValid).toBe(false)
    })

    it('should handle repeated validation calls', () => {
      authStore.loginState.setEmail('valid@example.com')
      authStore.loginState.setPassword('validpass')

      const result1 = authStore.validateLoginFields()
      const result2 = authStore.validateLoginFields()
      const result3 = authStore.validateLoginFields()

      expect(result1).toBe(true)
      expect(result2).toBe(true)
      expect(result3).toBe(true)
    })

    it('should handle switching between screens', () => {
      authStore.setCurrentScreen('login')
      authStore.loginState.setEmail('invalid')
      authStore.validateLoginFields()

      authStore.setCurrentScreen('signup')
      authStore.signupState.setName('John')
      authStore.signupState.setEmail('valid@example.com')
      authStore.signupState.setPassword('password')
      const signupValid = authStore.validateSignupFields()

      expect(signupValid).toBe(true)
    })
  })
})
