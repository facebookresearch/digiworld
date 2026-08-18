// Copyright (c) Meta Platforms, Inc. and affiliates.
export interface ValidationError {
  field: string
  message: string
}

export const validateEmail = (email: string): ValidationError[] => {
  const errors: ValidationError[] = []
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!email.trim()) {
    errors.push({ field: 'email', message: 'Email is required' })
  } else if (!emailRegex.test(email.trim())) {
    errors.push({ field: 'email', message: 'Invalid email format' })
  }

  return errors
}

export const validatePassword = (password: string): ValidationError[] => {
  const errors: ValidationError[] = []

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' })
  }

  return errors
}

export const validateName = (
  name: string,
  field: 'firstName' | 'lastName',
): ValidationError[] => {
  const errors: ValidationError[] = []
  const displayField = field === 'firstName' ? 'First name' : 'Last name'

  if (!name.trim()) {
    errors.push({ field, message: `${displayField} is required` })
  } else if (name.trim().length < 2) {
    errors.push({
      field,
      message: `${displayField} must be at least 2 characters`,
    })
  } else if (!/^[a-zA-Z\s-']+$/.test(name.trim())) {
    errors.push({
      field,
      message: `${displayField} can only contain letters, spaces, hyphens, and apostrophes`,
    })
  }

  return errors
}

export const validateSignupData = (data: {
  username: string
  email: string
  password: string
}): ValidationError[] => {
  const errors: ValidationError[] = []

  if (!data.username) {
    errors.push({ field: 'username', message: 'Username is required' })
  } else if (data.username.length < 3) {
    errors.push({
      field: 'username',
      message: 'Username must be at least 3 characters',
    })
  }

  if (!data.email) {
    errors.push({ field: 'email', message: 'Email is required' })
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' })
  }

  if (!data.password) {
    errors.push({ field: 'password', message: 'Password is required' })
  } else if (data.password.length < 8) {
    errors.push({
      field: 'password',
      message: 'Password must be at least 8 characters',
    })
  }

  return errors
}

export const validateLoginData = (data: {
  email: string
  password: string
}): ValidationError[] => {
  const errors: ValidationError[] = []

  if (!data.email) {
    errors.push({ field: 'email', message: 'Email is required' })
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' })
  }

  if (!data.password) {
    errors.push({ field: 'password', message: 'Password is required' })
  } else if (data.password.length < 8) {
    errors.push({
      field: 'password',
      message: 'Password must be at least 8 characters',
    })
  }

  return errors
}

export const getFieldError = (
  errors: ValidationError[],
  field: string,
): string | undefined => {
  const error = errors.find(e => e.field === field)
  return error?.message
}

export const hasFieldError = (
  errors: ValidationError[],
  field: string,
): boolean => {
  return errors.some(e => e.field === field)
}

export const formatValidationErrors = (errors: ValidationError[]): string => {
  return errors.map(e => e.message).join('\n')
}
