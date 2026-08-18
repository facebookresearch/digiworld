// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { fireEvent, act } from '@testing-library/react-native'
import LoginScreen from '@/app/(auth)/login'
import { setupMocks, clearMocks } from '@/test/mocks'
import { createTestStore, renderWithProvider } from '@/test/store-factory'

interface ValidationError {
  field: string
  message: string
}

// Setup all mocks
setupMocks()

let testStore: ReturnType<typeof createTestStore>

describe('LoginScreen', () => {
  beforeEach(() => {
    clearMocks()
    testStore = createTestStore({ isAuthenticated: false })
  })

  it('renders login form', () => {
    const { getByPlaceholderText, getByText } = renderWithProvider(
      <LoginScreen />,
      testStore,
    )
    expect(getByPlaceholderText('Enter your email')).toBeTruthy()
    expect(getByPlaceholderText('Enter your password')).toBeTruthy()
    expect(getByText('Sign In')).toBeTruthy()
  })

  it('updates form fields on input', async () => {
    const { getByPlaceholderText } = renderWithProvider(
      <LoginScreen />,
      testStore,
    )
    const emailInput = getByPlaceholderText('Enter your email')
    const passwordInput = getByPlaceholderText('Enter your password')

    await act(async () => {
      fireEvent.changeText(emailInput, 'test@example.com')
      testStore.authStore.loginState.setEmail('test@example.com')
      fireEvent.changeText(passwordInput, 'password123')
      testStore.authStore.loginState.setPassword('password123')
    })

    expect(testStore.authStore.loginState.email).toBe('test@example.com')
    expect(testStore.authStore.loginState.password).toBe('password123')
  })

  it('shows validation errors for empty fields', async () => {
    const { getByText } = renderWithProvider(<LoginScreen />, testStore)
    const loginButton = getByText('Sign In')

    await act(async () => {
      testStore.authStore.loginState.setEmail('')
      testStore.authStore.loginState.setPassword('')
      fireEvent.press(loginButton)
    })

    const errors = testStore.authStore.loginState.validationErrors
    expect(errors.length).toBe(2)
    expect(
      errors.some(
        (e: ValidationError) =>
          e.field === 'email' && e.message === 'Email is required',
      ),
    ).toBeTruthy()
    expect(
      errors.some(
        (e: ValidationError) =>
          e.field === 'password' && e.message === 'Password is required',
      ),
    ).toBeTruthy()
  })

  it('shows validation error for invalid email', async () => {
    const { getByPlaceholderText, getByText } = renderWithProvider(
      <LoginScreen />,
      testStore,
    )
    const emailInput = getByPlaceholderText('Enter your email')
    const loginButton = getByText('Sign In')

    await act(async () => {
      fireEvent.changeText(emailInput, 'invalid-email')
      testStore.authStore.loginState.setEmail('invalid-email')
      fireEvent.press(loginButton)
    })

    const errors = testStore.authStore.loginState.validationErrors
    expect(
      errors.some(
        (e: ValidationError) =>
          e.field === 'email' && e.message === 'Invalid email format',
      ),
    ).toBeTruthy()
  })

  it('clears validation errors when input is changed', async () => {
    const { getByPlaceholderText, getByText } = renderWithProvider(
      <LoginScreen />,
      testStore,
    )
    const emailInput = getByPlaceholderText('Enter your email')
    const loginButton = getByText('Sign In')

    // First trigger validation errors
    await act(async () => {
      testStore.authStore.loginState.setEmail('')
      fireEvent.press(loginButton)
    })

    expect(testStore.authStore.loginState.validationErrors.length).toBe(2)

    // Then update input and check if errors are cleared
    await act(async () => {
      fireEvent.changeText(emailInput, 'test@example.com')
      testStore.authStore.loginState.setEmail('test@example.com')
      testStore.authStore.loginState.clearValidationErrors()
    })

    const emailError = testStore.authStore.loginState.validationErrors.find(
      (e: ValidationError) => e.field === 'email',
    )
    expect(emailError).toBeFalsy()
  })

  it('maintains field focus state', async () => {
    const { getByPlaceholderText } = renderWithProvider(
      <LoginScreen />,
      testStore,
    )
    const emailInput = getByPlaceholderText('Enter your email')
    const passwordInput = getByPlaceholderText('Enter your password')

    await act(async () => {
      fireEvent(emailInput, 'focus')
    })
    expect(testStore.authStore.loginState.currentFocused).toBe('email')

    await act(async () => {
      fireEvent(emailInput, 'blur')
      fireEvent(passwordInput, 'focus')
    })
    expect(testStore.authStore.loginState.currentFocused).toBe('password')
  })
})
