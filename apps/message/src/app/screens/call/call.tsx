import { useStores } from '@/models/helpers/useStores'
import { mutations } from '@/db/mutations'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import {
  useAppTheme,
  type Theme,
  metrics,
  Screen,
  Text,
} from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Animated,
} from 'react-native'

export default function CallScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const {
    contactId,
    contactName,
    contactAvatar,
    callType = 'voice',
    simulateIncoming,
    sessionId,
    sessionTimeStamp,
  } = useLocalSearchParams<{
    contactId: string
    contactName: string
    contactAvatar?: string
    callType: 'voice' | 'video'
    simulateIncoming?: string
    sessionId?: string
    sessionTimeStamp?: string
  }>()

  console.log('URL Parameters:', {
    contactId,
    contactName,
    contactAvatar: contactAvatar ? 'present' : 'not present',
    callType,
    simulateIncoming,
    sessionId,
  })

  const router = useRouter()
  const { userStore, sessionStore } = useStores()
  const [isCallActive, setIsCallActive] = useState(false)
  const [isRinging, setIsRinging] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(false)
  const [isHold, setIsHold] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)

  // Incoming call simulation states
  const [isIncomingCall, setIsIncomingCall] = useState(false)
  const [incomingCallType, setIncomingCallType] = useState<'voice' | 'video'>(
    'voice',
  )
  const [incomingCallAnimation] = useState(new Animated.Value(0))
  const [ringingAnimation] = useState(new Animated.Value(0))

  // Store the current call ID for database updates
  const [currentCallId, setCurrentCallId] = useState<string | null>(null)
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)
  const [currentUserAvatarLoadFailed, setCurrentUserAvatarLoadFailed] =
    useState(false)

  // Session restoration state
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)

  // Contact information state for session restoration
  const [restoredContactId, setRestoredContactId] = useState<string | null>(
    null,
  )
  const [restoredContactName, setRestoredContactName] = useState<string | null>(
    null,
  )
  const [restoredContactAvatar, setRestoredContactAvatar] = useState<
    string | null
  >(null)
  const [restoredCallType, setRestoredCallType] = useState<'voice' | 'video'>(
    'voice',
  )

  // Reset session loaded state when sessionId or sessionTimeStamp changes
  useEffect(() => {
    setIsSessionLoaded(false)
    setRestoredContactId(null)
    setRestoredContactName(null)
    setRestoredContactAvatar(null)
    setRestoredCallType('voice')
  }, [sessionId, sessionTimeStamp])

  // Setup interaction tracking
  const { trackClick, trackContentChange } = useInteractionTracking(
    'Call',
    `/screens/call/call`,
  )

  // Computed contact values that prioritize session restoration when sessionTimeStamp is present
  const effectiveContactId = sessionTimeStamp
    ? restoredContactId || contactId
    : contactId || restoredContactId
  const effectiveContactName = sessionTimeStamp
    ? restoredContactName || contactName || 'Unknown Contact'
    : contactName || restoredContactName || 'Unknown Contact'
  const effectiveContactAvatar = sessionTimeStamp
    ? restoredContactAvatar || contactAvatar
    : contactAvatar || restoredContactAvatar
  const effectiveCallType = sessionTimeStamp
    ? restoredCallType || callType
    : callType || restoredCallType

  // Set video enabled state based on effective call type
  useEffect(() => {
    setIsVideoEnabled(effectiveCallType === 'video')
  }, [effectiveCallType])

  // Track call state changes with debouncing
  const saveCallState = useCallback(
    (stateData: any) => {
      // Only track if we have essential data
      if (effectiveContactId && effectiveContactName) {
        const callStateData = {
          action: 'call_state_change',
          contactId: effectiveContactId,
          contactName: effectiveContactName,
          contactAvatar: effectiveContactAvatar,
          callType: effectiveCallType,
          ...stateData,
          timestamp: Date.now(),
        }

        // Log call state data without avatar to avoid console clutter
        const loggableCallState = { ...callStateData }
        if (loggableCallState.contactAvatar) {
          loggableCallState.contactAvatar = 'present (base64 data)'
        }
        console.log('Saving call state to session:', loggableCallState)
        trackContentChange(callStateData)
      }
    },
    [
      trackContentChange,
      effectiveContactId,
      effectiveContactName,
      effectiveContactAvatar,
      effectiveCallType,
    ],
  )

  // Avatar validation function
  const isValidBase64 = (str: string) => {
    try {
      if (!str) return false
      if (str.startsWith('data:image')) {
        // Full data URL - extract base64 part
        const base64Part = str.split(',')[1]
        if (!base64Part) return false
        // Try to decode to check if valid
        atob(base64Part)
        return true
      } else if (str.includes('base64')) {
        // Plain base64 string - try to decode
        atob(str)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const handleAvatarError = () => {
    console.log('Avatar image failed to load for:', effectiveContactName)
    setAvatarLoadFailed(true)
  }

  const handleCurrentUserAvatarError = () => {
    console.log('Current user avatar image failed to load')
    setCurrentUserAvatarLoadFailed(true)
  }

  // Start call when screen mounts
  useEffect(() => {
    if (effectiveContactId) {
      // Check if we should simulate incoming call
      if (simulateIncoming === 'true') {
        simulateIncomingCall(effectiveCallType)
      } else {
        startCall()
      }
    }
  }, [effectiveContactId, simulateIncoming, effectiveCallType])

  // Restore state from session when sessionTimeStamp is present
  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession()

      if (session?.data?.sessionData) {
        const savedState = session.data.sessionData.formData as any

        // Log session restoration data without avatar to avoid console clutter
        const loggableState = { ...savedState }
        if (loggableState.contactAvatar) {
          loggableState.contactAvatar = 'present (base64 data)'
        }
        console.log('Session restoration - saved state:', loggableState)

        // Restore state from session
        if (savedState) {
          // Restore contact information if exists
          if (savedState.contactId) {
            setRestoredContactId(savedState.contactId)
          }
          if (savedState.contactName) {
            setRestoredContactName(savedState.contactName)
          }
          if (savedState.contactAvatar) {
            setRestoredContactAvatar(savedState.contactAvatar)
          }
          if (savedState.callType) {
            console.log('Restoring callType from session:', savedState.callType)
            setRestoredCallType(savedState.callType)
          }

          // Restore call state if exists
          if (savedState.isCallActive !== undefined) {
            setIsCallActive(savedState.isCallActive)
          }
          if (savedState.isRinging !== undefined) {
            setIsRinging(savedState.isRinging)
          }
          if (savedState.callDuration !== undefined) {
            setCallDuration(savedState.callDuration)
          }
          if (savedState.isMuted !== undefined) {
            setIsMuted(savedState.isMuted)
          }
          if (savedState.isSpeakerOn !== undefined) {
            setIsSpeakerOn(savedState.isSpeakerOn)
          }
          if (savedState.isHold !== undefined) {
            setIsHold(savedState.isHold)
          }
          if (savedState.isVideoEnabled !== undefined) {
            setIsVideoEnabled(savedState.isVideoEnabled)
          }
          if (savedState.isIncomingCall !== undefined) {
            setIsIncomingCall(savedState.isIncomingCall)
          }
          if (savedState.incomingCallType !== undefined) {
            setIncomingCallType(savedState.incomingCallType)
          }
        }
      }
      setIsSessionLoaded(true)
    } else if (!isSessionLoaded) {
      // When no session exists, just set isSessionLoaded to true
      setIsSessionLoaded(true)
    }
  }, [sessionTimeStamp, sessionStore])

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isCallActive])

  // Incoming call animation
  useEffect(() => {
    if (isIncomingCall) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(incomingCallAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(incomingCallAnimation, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      )
      pulseAnimation.start()
      return () => pulseAnimation.stop()
    }
    return undefined
  }, [isIncomingCall, incomingCallAnimation])

  // Ringing animation
  useEffect(() => {
    if (isRinging) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(ringingAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(ringingAnimation, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      )
      pulseAnimation.start()
      return () => pulseAnimation.stop()
    }
    return undefined
  }, [isRinging, ringingAnimation])

  const startCall = useCallback(async () => {
    try {
      // Start with ringing state
      setIsRinging(true)
      trackClick(`start_${effectiveCallType}_call`)

      // Track call state change
      saveCallState({
        isRinging: true,
        isCallActive: false,
        callDuration: 0,
        action: 'call_started',
      })

      // Create call history entry
      if (userStore.currentUser?.id && effectiveContactId) {
        console.log(
          'Creating call history with effectiveCallType:',
          effectiveCallType,
        )
        const callData = {
          id: `call_${Date.now()}_${Math.random()}`,
          callerId: userStore.currentUser.id,
          receiverId: effectiveContactId,
          callType: effectiveCallType,
          duration: 0,
          timestamp: Math.floor(Date.now() / 1000),
          wasMissed: 0,
        }

        const result = await mutations.createCallHistory(callData)
        if (!result.success) {
          console.error('Failed to save call history:', result.error)
        } else {
          // Store the call ID for later updates
          setCurrentCallId(result.id || null)
          console.log('Call history created with ID:', result.id)
        }
      }

      // After 4 seconds, transition to active call
      setTimeout(() => {
        setIsRinging(false)
        setIsCallActive(true)
        setCallDuration(0)

        // Track call state change
        saveCallState({
          isRinging: false,
          isCallActive: true,
          callDuration: 0,
          action: 'call_answered',
        })
      }, 4000)
    } catch (error) {
      console.error('Error starting call:', error)
      Alert.alert('Error', 'Failed to start call')
    }
  }, [
    effectiveContactId,
    userStore.currentUser?.id,
    trackClick,
    effectiveCallType,
  ])

  const endCall = useCallback(async () => {
    try {
      setIsCallActive(false)
      trackClick(`end_${effectiveCallType}_call`)

      // Track call state change
      saveCallState({
        isCallActive: false,
        callDuration,
        action: 'call_ended',
      })

      // Update call duration in database
      if (userStore.currentUser?.id && effectiveContactId && currentCallId) {
        console.log(
          `${effectiveCallType} call ended. Duration: ${callDuration} seconds`,
        )

        // Update the call with final duration using the stored call ID
        await mutations.updateCallHistory(currentCallId, {
          duration: callDuration,
        })
        console.log('Call duration updated:', callDuration, 'seconds')
      }

      // Navigate back
      router.back()
    } catch (error) {
      console.error('Error ending call:', error)
    }
  }, [
    callDuration,
    effectiveContactId,
    userStore.currentUser?.id,
    trackClick,
    router,
    effectiveCallType,
    currentCallId,
  ])

  // Simulate incoming call
  const simulateIncomingCall = useCallback(
    (type: 'voice' | 'video') => {
      setIncomingCallType(type)
      setIsIncomingCall(true)
      trackClick(`simulate_incoming_${type}_call`)

      // Track call state change
      saveCallState({
        isIncomingCall: true,
        incomingCallType: type,
        action: 'incoming_call_simulated',
      })
    },
    [trackClick, saveCallState],
  )

  // Answer incoming call
  const answerIncomingCall = useCallback(async () => {
    setIsIncomingCall(false)
    setIsCallActive(true)
    setCallDuration(0)
    trackClick(`answer_incoming_${incomingCallType}_call`)

    // Track call state change
    saveCallState({
      isIncomingCall: false,
      isCallActive: true,
      callDuration: 0,
      action: 'incoming_call_answered',
    })

    // Create call history entry for answered incoming call
    if (userStore.currentUser?.id && effectiveContactId) {
      const callData = {
        id: `call_${Date.now()}_${Math.random()}`,
        callerId: effectiveContactId, // Contact is calling us
        receiverId: userStore.currentUser.id,
        callType: incomingCallType,
        duration: 0,
        timestamp: Math.floor(Date.now() / 1000),
        wasMissed: 0,
      }

      const result = await mutations.createCallHistory(callData)
      if (!result.success) {
        console.error('Failed to save answered call history:', result.error)
      } else {
        // Store the call ID for later updates
        setCurrentCallId(result.id || null)
        console.log('Answered call history created with ID:', result.id)
      }
    }
  }, [incomingCallType, trackClick, userStore.currentUser?.id, contactId])

  // Reject incoming call
  const rejectIncomingCall = useCallback(async () => {
    setIsIncomingCall(false)
    trackClick(`reject_incoming_${incomingCallType}_call`)

    // Track call state change
    saveCallState({
      isIncomingCall: false,
      action: 'incoming_call_rejected',
    })

    // Create call history entry for rejected incoming call
    if (userStore.currentUser?.id && effectiveContactId) {
      const callData = {
        id: `call_${Date.now()}_${Math.random()}`,
        callerId: effectiveContactId, // Contact is calling us
        receiverId: userStore.currentUser.id,
        callType: incomingCallType,
        duration: 0,
        timestamp: Math.floor(Date.now() / 1000),
        wasMissed: 1, // Mark as missed
      }

      const result = await mutations.createCallHistory(callData)
      if (!result.success) {
        console.error('Failed to save rejected call history:', result.error)
      } else {
        console.log('Rejected call recorded:', result.id)
        // Store the call ID for potential updates
        setCurrentCallId(result.id || null)
      }
    }

    // Navigate back after rejection
    setTimeout(() => {
      router.back()
    }, 500)
  }, [
    incomingCallType,
    trackClick,
    router,
    userStore.currentUser?.id,
    effectiveContactId,
  ])

  // Simulate missed call (long press on incoming call)
  const simulateMissedCall = useCallback(async () => {
    try {
      trackClick(`simulate_missed_${incomingCallType}_call`)

      // Create call history entry as missed call
      if (userStore.currentUser?.id && effectiveContactId) {
        const callData = {
          id: `call_${Date.now()}_${Math.random()}`,
          callerId: effectiveContactId, // Contact is calling us
          receiverId: userStore.currentUser.id,
          callType: incomingCallType,
          duration: 0,
          timestamp: Math.floor(Date.now() / 1000),
          wasMissed: 1, // Mark as missed
        }

        const result = await mutations.createCallHistory(callData)
        if (!result.success) {
          console.error('Failed to save missed call history:', result.error)
        } else {
          console.log('Missed call recorded:', result.id)
          // Store the call ID for potential updates
          setCurrentCallId(result.id || null)
        }
      }

      // Don't dismiss the screen, just mark as missed
      console.log('Call marked as missed via long press')
      router.back()
    } catch (error) {
      console.error('Error simulating missed call:', error)
    }
  }, [
    incomingCallType,
    trackClick,
    userStore.currentUser?.id,
    effectiveContactId,
  ])

  const toggleMute = useCallback(() => {
    const newMuteState = !isMuted
    setIsMuted(newMuteState)
    trackClick('toggle_mute')

    // Track call state change
    saveCallState({
      isMuted: newMuteState,
      action: 'mute_toggled',
    })
  }, [isMuted, trackClick, saveCallState])

  const toggleSpeaker = useCallback(() => {
    const newSpeakerState = !isSpeakerOn
    setIsSpeakerOn(newSpeakerState)
    trackClick('toggle_speaker')

    // Track call state change
    saveCallState({
      isSpeakerOn: newSpeakerState,
      action: 'speaker_toggled',
    })
  }, [isSpeakerOn, trackClick, saveCallState])

  const toggleHold = useCallback(() => {
    const newHoldState = !isHold
    setIsHold(newHoldState)
    trackClick('toggle_hold')

    // Track call state change
    saveCallState({
      isHold: newHoldState,
      action: 'hold_toggled',
    })
  }, [isHold, trackClick, saveCallState])

  const toggleVideo = useCallback(() => {
    const newVideoState = !isVideoEnabled
    setIsVideoEnabled(newVideoState)
    trackClick('toggle_video')

    // Track call state change
    saveCallState({
      isVideoEnabled: newVideoState,
      action: 'video_toggled',
    })
  }, [isVideoEnabled, trackClick, saveCallState])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Render incoming call interface
  if (isIncomingCall) {
    console.log('RENDERING INCOMING CALL INTERFACE')
    return (
      <Screen
        preset="fixed"
        backgroundColor={theme.colors.palette.neutral900}
        safeAreaEdges={['top', 'bottom']}
      >
        <View style={styles.incomingCallContainer}>
          {/* Background with gradient overlay */}
          <View style={styles.incomingCallBackground}>
            {effectiveContactAvatar &&
            effectiveContactAvatar.trim() !== '' &&
            isValidBase64(effectiveContactAvatar) &&
            !avatarLoadFailed ? (
              <Image
                source={{
                  uri: effectiveContactAvatar.startsWith('data:image')
                    ? effectiveContactAvatar
                    : `data:image/png;base64,${effectiveContactAvatar}`,
                }}
                style={styles.incomingCallBackgroundImage}
                resizeMode="cover"
                onError={handleAvatarError}
              />
            ) : (
              <View style={styles.incomingCallBackgroundPlaceholder} />
            )}
            <View style={styles.incomingCallOverlay} />
          </View>

          {/* Incoming Call Content */}
          <View style={styles.incomingCallContent}>
            {/* Contact Avatar */}
            <Animated.View
              style={[
                styles.incomingCallAvatarContainer,
                {
                  transform: [
                    {
                      scale: incomingCallAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {effectiveContactAvatar &&
              effectiveContactAvatar.trim() !== '' &&
              isValidBase64(effectiveContactAvatar) &&
              !avatarLoadFailed ? (
                <Image
                  source={{
                    uri: effectiveContactAvatar.startsWith('data:image')
                      ? effectiveContactAvatar
                      : `data:image/png;base64,${effectiveContactAvatar}`,
                  }}
                  style={styles.incomingCallAvatar}
                  resizeMode="cover"
                  onError={handleAvatarError}
                />
              ) : (
                <View style={styles.incomingCallAvatarPlaceholder}>
                  <Text
                    text={
                      effectiveContactName
                        ?.split(' ')
                        .map(word => word.charAt(0).toUpperCase())
                        .join('')
                        .slice(0, 2) || 'U'
                    }
                    size="xxl"
                    weight="bold"
                    style={styles.incomingCallAvatarText}
                  />
                </View>
              )}
            </Animated.View>

            {/* Contact Name */}
            <Text
              text={effectiveContactName}
              size="xxl"
              weight="bold"
              style={styles.incomingCallName}
            />

            {/* Call Type and Status */}
            <Text
              text={`Incoming ${incomingCallType === 'video' ? 'Video' : 'Voice'} Call`}
              size="large"
              style={styles.incomingCallType}
            />

            {/* Call Actions */}
            <View style={styles.incomingCallActions}>
              {/* Reject Call Button */}
              <TouchableOpacity
                style={styles.rejectCallButton}
                onPress={rejectIncomingCall}
                onLongPress={simulateMissedCall}
              >
                <Ionicons
                  name="call"
                  size={32}
                  color={theme.colors.palette.neutral100}
                />
              </TouchableOpacity>

              {/* Answer Call Button */}
              <TouchableOpacity
                style={styles.answerCallButton}
                onPress={answerIncomingCall}
              >
                <Ionicons
                  name="call"
                  size={32}
                  color={theme.colors.palette.neutral100}
                />
              </TouchableOpacity>
            </View>

            {/* Additional Info */}
            <View style={styles.incomingCallInfo}>
              <Text
                text="Tap green to answer, red to reject"
                size="small"
                style={styles.incomingCallHint}
              />
            </View>
          </View>
        </View>
      </Screen>
    )
  }

  // Render video call interface
  console.log('Video call condition check:', {
    effectiveCallType,
    isVideoEnabled,
    shouldRenderVideo: effectiveCallType === 'video' && isVideoEnabled,
  })

  if (effectiveCallType === 'video' && isVideoEnabled) {
    console.log('RENDERING VIDEO CALL INTERFACE')
    return (
      <Screen
        preset="fixed"
        backgroundColor={theme.colors.palette.neutral900}
        safeAreaEdges={['top', 'bottom']}
      >
        <View style={styles.videoContainer}>
          {/* Main Video Preview - Using Contact Avatar */}
          <View style={styles.mainVideoContainer}>
            {effectiveContactAvatar && effectiveContactAvatar.trim() !== '' ? (
              <Image
                source={{
                  uri: effectiveContactAvatar.startsWith('data:image')
                    ? effectiveContactAvatar
                    : `data:image/png;base64,${effectiveContactAvatar}`,
                }}
                style={styles.mainVideo}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.mainVideoPlaceholder}>
                <View style={styles.mainVideoAvatarPlaceholder}>
                  <Text
                    text={
                      effectiveContactName
                        ?.split(' ')
                        .map(word => word.charAt(0).toUpperCase())
                        .join('')
                        .slice(0, 2) || 'U'
                    }
                    size="xxl"
                    weight="bold"
                    style={styles.placeholderText}
                  />
                </View>
              </View>
            )}

            {/* Video Overlay */}
            <View style={styles.videoOverlay}>
              {/* Top Bar */}
              <View style={styles.videoTopBar}>
                <TouchableOpacity
                  style={styles.videoBackButton}
                  onPress={() => router.back()}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={theme.colors.palette.neutral100}
                  />
                </TouchableOpacity>

                <View style={styles.videoCallInfo}>
                  <Text
                    text={effectiveContactName}
                    size="large"
                    weight="bold"
                    style={styles.videoContactName}
                  />
                  {isCallActive && !isRinging && (
                    <Text
                      text={formatDuration(callDuration)}
                      size="medium"
                      style={styles.videoCallDuration}
                    />
                  )}
                </View>
              </View>

              {/* Center Profile Section */}
              <View style={styles.videoCenterSection}>
                <Animated.View
                  style={{
                    transform: [
                      {
                        scale: isRinging
                          ? ringingAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.05],
                            })
                          : 1,
                      },
                    ],
                  }}
                >
                  {effectiveContactAvatar &&
                  isValidBase64(effectiveContactAvatar) &&
                  !avatarLoadFailed ? (
                    <Image
                      source={{
                        uri: effectiveContactAvatar.startsWith('data:image')
                          ? effectiveContactAvatar
                          : `data:image/png;base64,${effectiveContactAvatar}`,
                      }}
                      style={styles.videoCenterAvatar}
                      onError={handleAvatarError}
                    />
                  ) : (
                    <View style={styles.videoCenterAvatarPlaceholder}>
                      <Text
                        text={
                          effectiveContactName
                            ?.split(' ')
                            .map(word => word.charAt(0).toUpperCase())
                            .join('')
                            .slice(0, 2) || 'U'
                        }
                        size="xxl"
                        weight="bold"
                        style={styles.videoCenterAvatarText}
                      />
                    </View>
                  )}
                </Animated.View>
                <Text
                  text={effectiveContactName}
                  size="large"
                  weight="bold"
                  style={styles.videoCenterName}
                />
                <Text
                  text={
                    isRinging
                      ? 'Ringing...'
                      : isCallActive
                        ? 'Video calling...'
                        : 'Starting video call...'
                  }
                  size="medium"
                  style={styles.videoCenterStatus}
                />
                {isCallActive && !isRinging && (
                  <Text
                    text={formatDuration(callDuration)}
                    size="large"
                    weight="bold"
                    style={styles.videoCenterDuration}
                  />
                )}
              </View>

              {/* Bottom Controls */}
              <View style={styles.videoBottomControls}>
                <View style={styles.videoControlRow}>
                  <TouchableOpacity
                    style={[
                      styles.videoControlButton,
                      isMuted && styles.videoControlButtonActive,
                    ]}
                    onPress={toggleMute}
                  >
                    <Ionicons
                      name={isMuted ? 'mic-off' : 'mic'}
                      size={24}
                      color={
                        isMuted
                          ? theme.colors.palette.angry500
                          : theme.colors.palette.neutral100
                      }
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.videoControlButton,
                      isVideoEnabled && styles.videoControlButtonActive,
                    ]}
                    onPress={toggleVideo}
                  >
                    <Ionicons
                      name={isVideoEnabled ? 'videocam' : 'videocam-off'}
                      size={24}
                      color={
                        isVideoEnabled
                          ? theme.colors.palette.primary500
                          : theme.colors.palette.angry500
                      }
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.videoControlButton,
                      isSpeakerOn && styles.videoControlButtonActive,
                    ]}
                    onPress={toggleSpeaker}
                  >
                    <Ionicons
                      name={isSpeakerOn ? 'volume-high' : 'volume-medium'}
                      size={24}
                      color={
                        isSpeakerOn
                          ? theme.colors.palette.primary500
                          : theme.colors.palette.neutral100
                      }
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.videoControlButton,
                      isHold && styles.videoControlButtonActive,
                    ]}
                    onPress={toggleHold}
                  >
                    <Ionicons
                      name="pause"
                      size={24}
                      color={
                        isHold
                          ? theme.colors.palette.accent400
                          : theme.colors.palette.neutral100
                      }
                    />
                  </TouchableOpacity>
                </View>

                {/* End Call Button */}
                <TouchableOpacity
                  style={styles.videoEndCallButton}
                  onPress={endCall}
                >
                  <Ionicons
                    name="call"
                    size={32}
                    color={theme.colors.palette.neutral100}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Picture-in-Picture Current User Video */}
          <View style={styles.pipContainer}>
            {userStore.currentUser?.avatarUrl &&
            isValidBase64(userStore.currentUser.avatarUrl) &&
            !currentUserAvatarLoadFailed ? (
              <Image
                source={{
                  uri: userStore.currentUser.avatarUrl.startsWith('data:image')
                    ? userStore.currentUser.avatarUrl
                    : `data:image/png;base64,${userStore.currentUser.avatarUrl}`,
                }}
                style={styles.pipVideo}
                resizeMode="cover"
                onError={handleCurrentUserAvatarError}
              />
            ) : (
              <View style={styles.pipPlaceholder}>
                <Text
                  text={
                    userStore.currentUser?.name
                      ?.split(' ')
                      .map(word => word.charAt(0).toUpperCase())
                      .join('')
                      .slice(0, 2) || 'U'
                  }
                  size="medium"
                  weight="bold"
                  style={styles.pipPlaceholderText}
                />
              </View>
            )}
            <View style={styles.pipOverlay}>
              <Text
                text={userStore.currentUser?.name || 'You'}
                size="small"
                style={styles.pipContactName}
              />
            </View>
          </View>
        </View>
      </Screen>
    )
  }

  // Render audio call interface
  console.log('RENDERING AUDIO CALL INTERFACE')
  return (
    <Screen
      preset="fixed"
      backgroundColor={theme.colors.palette.neutral900}
      safeAreaEdges={['top', 'bottom']}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="close"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
        </View>

        {/* Contact Info */}
        <View style={styles.contactSection}>
          <Animated.View
            style={{
              transform: [
                {
                  scale: isRinging
                    ? ringingAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.05],
                      })
                    : 1,
                },
              ],
            }}
          >
            <View style={styles.avatarContainer}>
              {effectiveContactAvatar &&
              isValidBase64(effectiveContactAvatar) &&
              !avatarLoadFailed ? (
                <Image
                  source={{
                    uri: effectiveContactAvatar.startsWith('data:image')
                      ? effectiveContactAvatar
                      : `data:image/png;base64,${effectiveContactAvatar}`,
                  }}
                  style={styles.avatar}
                  onError={handleAvatarError}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text
                    text={
                      effectiveContactName
                        ?.split(' ')
                        .map(word => word.charAt(0).toUpperCase())
                        .join('')
                        .slice(0, 2) || 'U'
                    }
                    size="xxl"
                    weight="bold"
                    style={styles.avatarText}
                  />
                </View>
              )}
            </View>
          </Animated.View>

          <Text
            text={effectiveContactName}
            size="xxl"
            weight="bold"
            style={styles.contactName}
          />
          <Text
            text={
              isRinging
                ? 'Ringing...'
                : isCallActive
                  ? `${effectiveCallType === 'video' ? 'Video' : 'Voice'} calling...`
                  : 'Starting call...'
            }
            size="medium"
            style={styles.callStatus}
          />
          {isCallActive && !isRinging && (
            <Text
              text={formatDuration(callDuration)}
              size="large"
              weight="bold"
              style={styles.callDuration}
            />
          )}
        </View>

        {/* Call Controls */}
        <View style={styles.controlsContainer}>
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                isMuted && styles.controlButtonActive,
              ]}
              onPress={toggleMute}
            >
              <Ionicons
                name={isMuted ? 'mic-off' : 'mic'}
                size={24}
                color={
                  isMuted
                    ? theme.colors.palette.angry500
                    : theme.colors.palette.neutral100
                }
              />
            </TouchableOpacity>

            {effectiveCallType === 'video' && (
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  isVideoEnabled && styles.controlButtonActive,
                ]}
                onPress={toggleVideo}
              >
                <Ionicons
                  name={isVideoEnabled ? 'videocam' : 'videocam-off'}
                  size={24}
                  color={
                    isVideoEnabled
                      ? theme.colors.palette.primary500
                      : theme.colors.palette.angry500
                  }
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.controlButton,
                isSpeakerOn && styles.controlButtonActive,
              ]}
              onPress={toggleSpeaker}
            >
              <Ionicons
                name={isSpeakerOn ? 'volume-high' : 'volume-medium'}
                size={24}
                color={
                  isSpeakerOn
                    ? theme.colors.palette.primary500
                    : theme.colors.palette.neutral100
                }
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlButton,
                isHold && styles.controlButtonActive,
              ]}
              onPress={toggleHold}
            >
              <Ionicons
                name="pause"
                size={24}
                color={
                  isHold
                    ? theme.colors.palette.accent400
                    : theme.colors.palette.neutral100
                }
              />
            </TouchableOpacity>
          </View>

          {/* End Call Button */}
          <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
            <Ionicons
              name="call"
              size={32}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: metrics.medium,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingTop: metrics.large,
    },
    backButton: {
      padding: metrics.small,
      backgroundColor: theme.colors.palette.neutral800 + '40',
      borderRadius: metrics.borderRadiusLarge,
    },
    contactSection: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarContainer: {
      marginBottom: metrics.large,
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    avatarPlaceholder: {
      backgroundColor: theme.colors.palette.primary500,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: theme.colors.palette.neutral100,
    },
    contactName: {
      color: theme.colors.palette.neutral100,
      marginBottom: metrics.small,
      textAlign: 'center',
    },
    callStatus: {
      color: theme.colors.palette.neutral300,
      marginBottom: metrics.medium,
      textAlign: 'center',
    },
    callDuration: {
      color: theme.colors.palette.primary500,
      textAlign: 'center',
    },
    controlsContainer: {
      paddingBottom: metrics.xl,
    },
    controlRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: metrics.large,
      marginBottom: metrics.xl,
    },
    controlButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.palette.neutral800 + '40',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral700,
    },
    controlButtonActive: {
      backgroundColor: theme.colors.palette.primary500 + '20',
      borderColor: theme.colors.palette.primary500,
    },
    endCallButton: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.colors.palette.angry500,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      shadowColor: theme.colors.palette.angry500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    // Video call styles
    videoContainer: {
      flex: 1,
      position: 'relative',
    },
    mainVideoContainer: {
      flex: 1,
      position: 'relative',
    },
    mainVideo: {
      width: '100%',
      height: '100%',
    },
    mainVideoPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.palette.primary500,
      justifyContent: 'center',
      alignItems: 'center',
    },
    mainVideoAvatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.colors.palette.primary500,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      color: theme.colors.palette.neutral100,
    },
    videoOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'space-between',
    },
    videoTopBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: metrics.xl,
      paddingHorizontal: metrics.medium,
      backgroundColor: theme.colors.palette.neutral900,
    },
    videoBackButton: {
      padding: metrics.small,
      backgroundColor: theme.colors.palette.neutral800 + '40',
      borderRadius: metrics.borderRadiusLarge,
    },
    videoCallInfo: {
      alignItems: 'center',
    },
    videoContactName: {
      color: theme.colors.palette.neutral100,
      marginBottom: metrics.tiny,
    },
    videoCallDuration: {
      color: theme.colors.palette.primary500,
    },
    videoCenterSection: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: metrics.medium,
    },
    videoCenterAvatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      marginBottom: metrics.small,
    },
    videoCenterAvatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.palette.primary500,
      justifyContent: 'center',
      alignItems: 'center',
    },
    videoCenterAvatarText: {
      color: theme.colors.palette.neutral100,
    },
    videoCenterName: {
      color: theme.colors.palette.neutral100,
      textAlign: 'center',
    },
    videoCenterStatus: {
      color: theme.colors.palette.neutral300,
      marginTop: metrics.tiny,
      textAlign: 'center',
    },
    videoCenterDuration: {
      color: theme.colors.palette.primary500,
      textAlign: 'center',
    },
    videoBottomControls: {
      paddingBottom: metrics.xl,
      alignItems: 'center',
    },
    videoControlRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: metrics.large,
      marginBottom: metrics.xl,
    },
    videoControlButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.palette.neutral800 + '40',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral700,
    },
    videoControlButtonActive: {
      backgroundColor: theme.colors.palette.primary500 + '20',
      borderColor: theme.colors.palette.primary500,
    },
    videoEndCallButton: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.colors.palette.angry500,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.angry500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    pipContainer: {
      position: 'absolute',
      top: metrics.xl + 60,
      right: metrics.medium,
      width: 120,
      height: 160,
      borderRadius: metrics.borderRadiusMedium,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral100,
    },
    pipVideo: {
      width: '100%',
      height: '100%',
    },
    pipPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.palette.primary500,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pipPlaceholderText: {
      color: theme.colors.palette.neutral100,
    },
    pipOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.palette.neutral900,
      opacity: 0.9,
      padding: metrics.tiny,
    },
    pipContactName: {
      color: theme.colors.palette.neutral100,
      textAlign: 'center',
    },
    // Incoming call styles
    incomingCallContainer: {
      flex: 1,
      position: 'relative',
    },
    incomingCallBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    incomingCallBackgroundImage: {
      width: '100%',
      height: '100%',
    },
    incomingCallBackgroundPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.palette.primary500,
    },
    incomingCallOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.palette.neutral900 + '50',
    },
    incomingCallContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: metrics.large,
    },
    incomingCallAvatarContainer: {
      marginBottom: metrics.xl,
      padding: metrics.medium,
      borderRadius: 100,
      backgroundColor: theme.colors.palette.neutral100 + '20',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    incomingCallAvatar: {
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: theme.colors.palette.neutral400,
      borderWidth: 4,
      borderColor: theme.colors.palette.neutral100,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 8,
    },
    incomingCallAvatarPlaceholder: {
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: theme.colors.palette.primary500,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: theme.colors.palette.neutral100,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 8,
    },
    incomingCallAvatarText: {
      color: theme.colors.palette.neutral100,
    },
    incomingCallName: {
      color: theme.colors.palette.neutral100,
      marginBottom: metrics.small,
      textAlign: 'center',
    },
    incomingCallType: {
      color: theme.colors.palette.neutral300,
      marginBottom: metrics.medium,
      textAlign: 'center',
    },
    incomingCallTimer: {
      color: theme.colors.palette.primary500,
      marginBottom: metrics.xl,
      textAlign: 'center',
    },
    incomingCallActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      marginBottom: metrics.xl,
    },
    rejectCallButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.palette.angry500,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.angry500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    answerCallButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.palette.success500,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.success500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    incomingCallInfo: {
      alignItems: 'center',
    },
    incomingCallHint: {
      color: theme.colors.palette.neutral400,
      textAlign: 'center',
    },
  })
