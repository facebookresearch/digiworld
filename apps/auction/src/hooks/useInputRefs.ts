// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useRef, useCallback } from 'react'
import { TextInput } from 'react-native'

type InputRef =
  | TextInput
  | { focusInput?: () => void; blurInput?: () => void }
  | null

export const useInputRefs = () => {
  const inputRefs = useRef<{ [key: string]: InputRef }>({})

  // Register a ref against a field name so we can programmatically control each ref
  const registerRef = useCallback((name: string, ref: InputRef) => {
    if (ref) {
      inputRefs.current[name] = ref
    } else {
      delete inputRefs.current[name]
    }
  }, [])

  // Function to focus a specific field
  const focusField = useCallback((fieldName: string) => {
    const ref = inputRefs.current[fieldName]
    if (ref) {
      if ('focusInput' in ref && typeof ref.focusInput === 'function') {
        ref.focusInput()
      } else if ('focus' in ref && typeof ref.focus === 'function') {
        ;(ref as TextInput).focus()
      }
    }
  }, [])

  // Function to blur currently focused input
  const blurActiveInput = useCallback(() => {
    Object.values(inputRefs.current).forEach(input => {
      if (input) {
        if ('blurInput' in input && typeof input.blurInput === 'function') {
          input.blurInput()
        } else if ('blur' in input && typeof input.blur === 'function') {
          ;(input as TextInput).blur()
        }
      }
    })
  }, [])

  // Function to focus a field and move cursor to end (for prefilled values)
  const focusFieldAtEnd = useCallback((fieldName: string, value?: string) => {
    const ref = inputRefs.current[fieldName]
    if (ref) {
      if ('focusInput' in ref && typeof ref.focusInput === 'function') {
        ref.focusInput()
      } else if ('focus' in ref && typeof ref.focus === 'function') {
        const textInput = ref as TextInput
        textInput.focus()
        // Move cursor to end if value is provided
        if (value !== undefined && 'setNativeProps' in textInput) {
          setTimeout(() => {
            textInput.setNativeProps({
              selection: { start: value.length, end: value.length },
            })
          }, 100)
        }
      }
    }
  }, [])

  return {
    inputRefs,
    registerRef,
    focusField,
    blurActiveInput,
    focusFieldAtEnd,
  }
}
