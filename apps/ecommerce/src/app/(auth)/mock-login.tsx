// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useStores } from '@/models/helpers/useStores'
import { useLocalSearchParams } from 'expo-router'
import { observer } from 'mobx-react-lite'
import React, { useEffect, useState, useRef } from 'react'
import { TextInput, View } from 'react-native'

export default observer(function LoginScreen() {
  const { sessionId } = useLocalSearchParams()
  const { sessionStore, timeStamp } = useStores()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [, setIsSessionLoaded] = useState(false)
  const { trackScreenMount, trackContentChange } = useInteractionTracking(
    'Login',
    '/screens/auth/login',
  )
  const emailInputRef = useRef<TextInput>(null)
  const passwordInputRef = useRef<TextInput>(null)
  const [focusedInput, setFocusedInput] = useState('')

  // Load session data if it exists
  useEffect(() => {
    if (sessionId) {
      const session = sessionStore.getSession(sessionId as string)
      if (session?.data) {
        const sessionData = session.data as any
        console.log(
          'Session data received:',
          JSON.stringify(sessionData, null, 2),
        )

        if (sessionData.sessionData.formData) {
          const { email: savedEmail, password: savedPassword } =
            sessionData.sessionData.formData
          trackContentChange(sessionData.sessionData.formData)
          if (savedEmail) setEmail(savedEmail)
          if (savedPassword) setPassword(savedPassword)
        }

        setIsSessionLoaded(true)
        setTimeout(() => {
          setFocusedInput(sessionData.sessionData.currentFocusedElement)
        }, 500)
      }
    }
  }, [sessionId, timeStamp])

  useEffect(() => {
    trackScreenMount({
      formData: {
        email,
        password,
        timestamp: Date.now(),
      },
    })
  }, []) // Empty dependency array to run only on mount

  // Modify the focus effect to handle both inputs
  useEffect(() => {
    if (focusedInput === 'email' && emailInputRef.current) {
      emailInputRef.current.focus()
      emailInputRef.current.setSelection(email.length, email.length)
    } else if (focusedInput === 'password' && passwordInputRef.current) {
      passwordInputRef.current.focus()
      passwordInputRef.current.setSelection(password.length, password.length)
    }
  }, [focusedInput])

  return <View />
})
