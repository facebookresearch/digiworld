// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotIn, types, cast, flow } from 'mobx-state-tree'

import { getRootStore } from './helpers/getRootStore'
import { withSetPropAction } from './helpers/withSetPropAction'

type AuthStoreType = Instance<typeof AuthStoreModel>

export const ValidationError = types.model('ValidationError', {
  field: types.string,
  message: types.string,
})

export const LoginState = types
  .model('LoginState', {
    email: types.optional(types.string, ''),
    password: types.optional(types.string, ''),
    isLoading: types.optional(types.boolean, false),
    currentFocused: types.maybeNull(types.string),
    validationErrors: types.array(ValidationError),
  })
  .actions(withSetPropAction)
  .actions(self => ({
    setEmail(value: string) {
      self.email = value
      self.validationErrors.replace(
        self.validationErrors.filter(error => error.field !== 'email'),
      )
    },
    setPassword(value: string) {
      self.password = value
      self.validationErrors.replace(
        self.validationErrors.filter(error => error.field !== 'password'),
      )
    },
    setFocused(field: string | null) {
      self.currentFocused = field
    },
    setValidationError(field: string, message: string) {
      const existingErrorIndex = self.validationErrors.findIndex(
        e => e.field === field,
      )
      if (existingErrorIndex >= 0) {
        self.validationErrors[existingErrorIndex] = cast({ field, message })
      } else {
        self.validationErrors.push(cast({ field, message }))
      }
    },
    clearValidationErrors() {
      self.validationErrors.clear()
    },
    reset() {
      self.email = ''
      self.password = ''
      self.isLoading = false
      self.currentFocused = null
      self.validationErrors.clear()
    },
  }))

export const SignupState = types
  .model('SignupState', {
    name: types.optional(types.string, ''),
    email: types.optional(types.string, ''),
    password: types.optional(types.string, ''),
    isLoading: types.optional(types.boolean, false),
    currentFocused: types.maybeNull(types.string),
    validationErrors: types.array(ValidationError),
  })
  .actions(withSetPropAction)
  .actions(self => ({
    setName(value: string) {
      self.name = value
      self.validationErrors.replace(
        self.validationErrors.filter(error => error.field !== 'name'),
      )
    },
    setEmail(value: string) {
      self.email = value
      self.validationErrors.replace(
        self.validationErrors.filter(error => error.field !== 'email'),
      )
    },
    setPassword(value: string) {
      self.password = value
      self.validationErrors.replace(
        self.validationErrors.filter(error => error.field !== 'password'),
      )
    },
    setFocused(field: string | null) {
      self.currentFocused = field
    },
    setValidationError(field: string, message: string) {
      const existingErrorIndex = self.validationErrors.findIndex(
        e => e.field === field,
      )
      if (existingErrorIndex >= 0) {
        self.validationErrors[existingErrorIndex] = cast({ field, message })
      } else {
        self.validationErrors.push(cast({ field, message }))
      }
    },
    clearValidationErrors() {
      self.validationErrors.clear()
    },
    reset() {
      self.name = ''
      self.email = ''
      self.password = ''
      self.isLoading = false
      self.currentFocused = null
      self.validationErrors.clear()
    },
  }))

export const AuthStoreModel = types
  .model('AuthStore')
  .props({
    loginState: types.optional(LoginState, {}),
    signupState: types.optional(SignupState, {}),
    currentScreen: types.optional(
      types.enumeration(['login', 'signup', 'none']),
      'none',
    ),
  })
  .actions(withSetPropAction)
  .actions((self: any) => {
    const typedSelf = self as AuthStoreType
    return {
      setCurrentScreen(screen: 'login' | 'signup' | 'none') {
        typedSelf.currentScreen = screen
      },
      validateLoginFields() {
        const { email, password } = typedSelf.loginState
        let isValid = true

        if (!email) {
          typedSelf.loginState.setValidationError('email', 'Email is required')
          isValid = false
        } else if (!/\S+@\S+\.\S+/.test(email)) {
          typedSelf.loginState.setValidationError(
            'email',
            'Invalid email format',
          )
          isValid = false
        }

        if (!password) {
          typedSelf.loginState.setValidationError(
            'password',
            'Password is required',
          )
          isValid = false
        } else if (password.length < 6) {
          typedSelf.loginState.setValidationError(
            'password',
            'Password must be at least 6 characters',
          )
          isValid = false
        }

        return isValid
      },
      validateSignupFields() {
        const { name, email, password } = typedSelf.signupState
        let isValid = true

        if (!name) {
          typedSelf.signupState.setValidationError('name', 'Name is required')
          isValid = false
        }

        if (!email) {
          typedSelf.signupState.setValidationError('email', 'Email is required')
          isValid = false
        } else if (!/\S+@\S+\.\S+/.test(email)) {
          typedSelf.signupState.setValidationError(
            'email',
            'Invalid email format',
          )
          isValid = false
        }

        if (!password) {
          typedSelf.signupState.setValidationError(
            'password',
            'Password is required',
          )
          isValid = false
        } else if (password.length < 6) {
          typedSelf.signupState.setValidationError(
            'password',
            'Password must be at least 6 characters',
          )
          isValid = false
        }

        return isValid
      },
      login: flow(function* () {
        const { email, password } = typedSelf.loginState

        if (!typedSelf.validateLoginFields()) {
          return false
        }

        typedSelf.loginState.isLoading = true
        try {
          const rootStore = getRootStore(typedSelf)
          const success = yield rootStore.userStore.login(email, password)
          return success
        } catch (error) {
          console.error('Login failed:', error)
          return false
        } finally {
          typedSelf.loginState.isLoading = false
        }
      }),
      signup: flow(function* () {
        const { name, email, password } = typedSelf.signupState

        if (!typedSelf.validateSignupFields()) {
          return false
        }

        typedSelf.signupState.isLoading = true
        try {
          const rootStore = getRootStore(typedSelf)
          const success = yield rootStore.userStore.register({
            email,
            username: name.trim(),
            password,
          })
          return success
        } catch (error) {
          console.error('Signup failed:', error)
          return false
        } finally {
          typedSelf.signupState.isLoading = false
        }
      }),
      reset() {
        typedSelf.loginState.reset()
        typedSelf.signupState.reset()
        typedSelf.currentScreen = 'none'
      },
      restore(snapshot: any) {
        try {
          if (snapshot) {
            if (snapshot.currentScreen) {
              typedSelf.currentScreen = snapshot.currentScreen
            }

            if (snapshot.loginState) {
              typedSelf.loginState.email = snapshot.loginState.email || ''
              typedSelf.loginState.validationErrors.replace(
                snapshot.loginState.validationErrors || [],
              )
              typedSelf.loginState.password = snapshot.loginState.password || ''
              typedSelf.loginState.isLoading =
                snapshot.loginState.isLoading || false
              typedSelf.loginState.currentFocused =
                snapshot.loginState.currentFocused || null
            }

            if (snapshot.signupState) {
              typedSelf.signupState.name = snapshot.signupState.name || ''
              typedSelf.signupState.email = snapshot.signupState.email || ''
              typedSelf.signupState.validationErrors.replace(
                snapshot.signupState.validationErrors || [],
              )
              typedSelf.signupState.password =
                snapshot.signupState.password || ''
              typedSelf.signupState.isLoading =
                snapshot.signupState.isLoading || false
              typedSelf.signupState.currentFocused =
                snapshot.signupState.currentFocused || null
            }
          }
        } catch (error) {
          console.error('Error restoring auth store:', error)
          this.reset()
        }
      },
    }
  })

  .views(self => ({
    get activeState() {
      return self.currentScreen === 'login' ? self.loginState : self.signupState
    },
    get hasValidationErrors() {
      return this.activeState.validationErrors.length > 0
    },
    getValidationError(field: string) {
      return this.activeState.validationErrors.find(e => e.field === field)
        ?.message
    },
  }))

export interface AuthStore extends Instance<typeof AuthStoreModel> {}
export interface AuthStoreSnapshot extends SnapshotIn<typeof AuthStoreModel> {}

// Create a function to initialize the store with default values
export const createAuthStore = () => AuthStoreModel.create({})

// Export a singleton instance
export const authStore = createAuthStore()
