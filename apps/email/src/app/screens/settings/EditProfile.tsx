import { AutoImage, Text, TextField } from '@/components'
import { translate } from '@/i18n/translate'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { AntDesign, Feather, FontAwesome6, Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useNavigation } from '@react-navigation/native'
import { Camera, CameraMode, CameraType, CameraView } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const parseStoredDateOfBirth = (value?: string) => {
  if (!value) return new Date()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

const formatDateOfBirthForStorage = (value: Date) => {
  return value.toISOString().slice(0, 10)
}

const normalizeUSPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, '')

  if (digits.length === 10) {
    return `+1${digits}`
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }

  return null
}

export default function EditProfileScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore, sessionStore } = useStores()
  const navigation = useNavigation()
  const { trackScreenMount, trackTextChange, trackContentChange, trackClick } =
    useInteractionTracking('EditProfile', '/screens/settings/EditProfile')
  const { sessionTimeStamp } = useLocalSearchParams()

  const [firstName, setFirstName] = useState(
    userStore.userProfile?.firstName || '',
  )
  const [lastName, setLastName] = useState(
    userStore.userProfile?.lastName || '',
  )
  const [displayName, setDisplayName] = useState(
    userStore.userProfile?.displayName || '',
  )
  const [phoneNumber, setPhoneNumber] = useState(
    userStore.userProfile?.phoneNumber || '',
  )
  const [dateOfBirth, setDateOfBirth] = useState(
    parseStoredDateOfBirth(userStore.userProfile?.dateOfBirth),
  )

  const [cameraVisible, setCameraVisible] = useState(false)
  const ref = useRef<CameraView>(null)
  const [mode, setMode] = useState<CameraMode>('picture')
  const [facing, setFacing] = useState<CameraType>('back')
  const [recording, setRecording] = useState(false)
  const [email, setEmail] = useState(userStore.userProfile?.email || '')
  const [avatar, setAvatar] = useState(userStore.userProfile?.avatar || '')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const formattedDate = `${(dateOfBirth.getMonth() + 1).toString().padStart(2, '0')}/${dateOfBirth
    .getDate()
    .toString()
    .padStart(2, '0')}/${dateOfBirth.getFullYear().toString().slice(-2)}`

  const inputRefs = useRef<{ [key: string]: any }>({})
  const setRef = (name: string, ref: any) => {
    if (ref) {
      inputRefs.current[name] = ref
    }
  }

  useEffect(() => {
    ;(async () => {
      await Camera.requestCameraPermissionsAsync()
    })()
  }, [])

  const focusField = (name: string) => {
    inputRefs.current[name]?.focus()
  }

  const blurAllFields = () => {
    Keyboard.dismiss() // Dismiss keyboard
  }

  const handleSave = async () => {
    trackClick('saveButton')
    setEmail(email.trim())
    const normalizedPhoneNumber = phoneNumber
      ? normalizeUSPhoneNumber(phoneNumber)
      : ''
    const reg: any = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w\w+)+$/
    if (!firstName || !lastName || !email) {
      Alert.alert(
        translate('authScreen:editProfile.error'),
        translate('authScreen:editProfile.validationMsg'),
      )
      return
    } else if (reg.test(email.trim()) === false) {
      Alert.alert(
        translate('authScreen:editProfile.error'),
        translate('authScreen:editProfile.validEmail'),
      )
      return
    } else if (phoneNumber && !normalizedPhoneNumber) {
      Alert.alert(
        translate('authScreen:editProfile.error'),
        translate('authScreen:editProfile.validPhpne'),
      )
      return
    }
    await userStore.updateUserProfile({
      firstName,
      lastName,
      displayName,
      phoneNumber: normalizedPhoneNumber || '',
      dateOfBirth: formatDateOfBirthForStorage(dateOfBirth),
      email,
      avatar,
    })
    navigation.goBack()
  }

  const handleFocus = (field: string) => {
    trackClick(field)
  }

  const GalleryImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    })

    if (!result.canceled) {
      setAvatar(result.assets[0].uri)
      trackContentChange({ avatar: result.assets[0].uri })
    }
  }

  const pickImage = async () => {
    trackClick('PickImageButton')
    Alert.alert(
      '',
      'Profile photo',
      [
        {
          text: 'Camera',
          onPress: () => takePicture(),
          style: 'cancel',
        },
        { text: 'Gallery', onPress: () => GalleryImage() },
      ],
      { cancelable: false },
    )
  }

  const takePicture = async () => {
    setCameraVisible(true)
    const photo = await ref.current?.takePictureAsync()
    if (photo) {
      setCameraVisible(false)
      setAvatar(photo?.uri)
      trackContentChange({ avatar: photo?.uri })
    }
  }

  const recordVideo = async () => {
    if (recording) {
      setRecording(false)
      ref.current?.stopRecording()
      return
    }
    setRecording(true)
    await ref.current?.recordAsync()
  }

  const toggleMode = () => {
    setMode(prev => (prev === 'picture' ? 'video' : 'picture'))
  }

  const toggleFacing = () => {
    setFacing(prev => (prev === 'back' ? 'front' : 'back'))
  }

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    if (event.type === 'dismissed') {
      // User dismissed the modal
      trackContentChange({ showDatePicker: false })
      setShowDatePicker(false)
      return
    }

    if (event.type === 'set' && selectedDate) {
      // User selected a date and confirmed
      trackContentChange({ showDatePicker: false, dateOfBirth: selectedDate })
      setShowDatePicker(false)
      setDateOfBirth(selectedDate)
    }
  }

  const handleFieldChange =
    (
      field: 'firstName' | 'lastName' | 'email' | 'phoneNumber' | 'displayName',
    ) =>
    (value: string) => {
      trackTextChange(field, value)
      switch (field) {
        case 'firstName':
          setFirstName(value)
          break
        case 'lastName':
          setLastName(value)
          break
        case 'phoneNumber':
          setPhoneNumber(value)
          break
        case 'email':
          setEmail(value)
          break
        case 'displayName':
          setDisplayName(value)
          break
      }
    }

  useEffect(() => {
    trackScreenMount({
      firstName,
      lastName,
      displayName,
      phoneNumber,
      dateOfBirth,
      email,
      avatar,
      showDatePicker,
      time: Date.now(),
    })
  }, [])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        screen: 'editProfile',
        route: '/screens/settings/EditProfile',
      })
    }, [trackScreenMount]),
  )

  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession()

      if (session?.data) {
        const sessionData = session.data as any
        const formData: any = session.data.sessionData.formData

        Object.keys(formData || {}).forEach(key => {
          const value = formData[key]
          switch (key) {
            case 'email':
              setEmail(value)
              break
            case 'firstName':
              setFirstName(value)
              break
            case 'lastName':
              setLastName(value)
              break
            case 'phoneNumber':
              setPhoneNumber(value)
              break
            case 'dateOfBirth':
              setDateOfBirth(new Date(value))
              break
            case 'avatar':
              setAvatar(value)
              break
            case 'showDatePicker':
              setShowDatePicker(value)
              break
          }
        })
        setTimeout(() => {
          focusField(sessionData.sessionData.currentFocusedElement)
        }, 500)
      }
    }
  }, [sessionTimeStamp])

  const renderCamera = () => {
    return (
      <CameraView
        style={styles.camera}
        ref={ref}
        mode={mode}
        facing={facing}
        mute={false}
        responsiveOrientationWhenOrientationLocked
      >
        <View style={styles.shutterContainer}>
          <Pressable onPress={toggleMode}>
            {mode === 'picture' ? (
              <AntDesign name="picture" size={32} color="white" />
            ) : (
              <Feather name="video" size={32} color="white" />
            )}
          </Pressable>
          <Pressable onPress={mode === 'picture' ? takePicture : recordVideo}>
            {({ pressed }) => (
              <View
                style={[
                  styles.shutterBtn,
                  pressed ? styles.opacityLess : styles.opacityOne,
                ]}
              >
                <View
                  style={[
                    styles.shutterBtnInner,
                    mode === 'picture'
                      ? styles.shutterBtnNeutral
                      : styles.shutterBtnRed,
                  ]}
                />
              </View>
            )}
          </Pressable>
          <Pressable onPress={toggleFacing}>
            <FontAwesome6 name="rotate-left" size={32} color="white" />
          </Pressable>
        </View>
      </CameraView>
    )
  }

  return (
    <TouchableWithoutFeedback onPress={blurAllFields}>
      {cameraVisible ? (
        renderCamera()
      ) : (
        <LinearGradient
          colors={[
            theme.colors.palette.neutral100,
            theme.colors.palette.neutral300,
          ]}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerContainer}>
              <TouchableOpacity
                onPress={() => {
                  trackClick('BackButton')
                  navigation.goBack()
                }}
                style={styles.backButton}
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              <Text
                text="Profile"
                size="xl"
                weight="bold"
                style={styles.title}
              />
            </View>

            <View style={styles.avatarContainer}>
              <AutoImage source={{ uri: avatar }} style={styles.avatar} />
              <TouchableOpacity
                onPress={pickImage}
                style={styles.editIconContainer}
              >
                <Ionicons name="pencil" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldContainer}>
              <TextField
                ref={ref => setRef('firstName', ref)}
                placeholder="First Name"
                value={firstName}
                onChangeText={handleFieldChange('firstName')}
                style={styles.input}
                onFocus={() => handleFocus('firstName')}
              />
            </View>
            <View style={styles.fieldContainer}>
              <TextField
                ref={ref => setRef('lastName', ref)}
                placeholder="Last Name"
                value={lastName}
                onChangeText={handleFieldChange('lastName')}
                style={styles.input}
                onFocus={() => handleFocus('lastName')}
              />
            </View>
            <View style={styles.fieldContainer}>
              <TextField
                ref={ref => setRef('dob', ref)}
                placeholder="Date of Birth"
                value={formattedDate}
                onFocus={() => {
                  trackContentChange({ showDatePicker: true })
                  setShowDatePicker(true)
                  inputRefs.current.dob.blur()
                }}
                style={styles.input}
                RightAccessory={() => (
                  <Ionicons
                    name="calendar"
                    size={20}
                    color="gray"
                    style={styles.centerIcon}
                  />
                )}
              />
              {showDatePicker && (
                <DateTimePicker
                  maximumDate={new Date()}
                  value={dateOfBirth}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}
            </View>
            <View style={styles.fieldContainer}>
              <TextField
                ref={ref => setRef('email', ref)}
                placeholder="Email"
                value={email}
                onChangeText={handleFieldChange('email')}
                style={styles.input}
                onFocus={() => handleFocus('email')}
                RightAccessory={() => (
                  <Ionicons
                    name="mail"
                    size={20}
                    color="gray"
                    style={styles.centerIcon}
                  />
                )}
              />
            </View>
            <View style={styles.fieldContainer}>
              <TextField
                ref={ref => setRef('phone', ref)}
                placeholder="Phone Number"
                value={phoneNumber}
                onChangeText={handleFieldChange('phoneNumber')}
                style={styles.input}
                onFocus={() => handleFocus('phoneNumber')}
              />
            </View>

            <LinearGradient
              colors={[
                theme.colors.palette.primary500,
                theme.colors.palette.secondary500,
              ]}
              style={styles.saveButtonGradient}
            >
              <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                <Text text="Done" style={styles.saveButtonText} />
              </TouchableOpacity>
            </LinearGradient>
          </SafeAreaView>
        </LinearGradient>
      )}
    </TouchableWithoutFeedback>
  )
}
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    avatar: {
      borderRadius: 50,
      height: 100,
      width: 100,
    },
    avatarContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    backButton: {
      marginRight: 10,
    },
    camera: {
      flex: 1,
      width: '100%',
    },
    centerIcon: {
      alignSelf: 'center',
      marginHorizontal: 10,
    },
    editIconContainer: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 15,
      bottom: 25,
      justifyContent: 'flex-start',
      left: 40,
      padding: 5,
    },
    fieldContainer: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 10,
      elevation: 3,
      marginBottom: 15,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
    },
    gradient: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    headerContainer: {
      alignItems: 'center',
      flexDirection: 'row',
      marginBottom: 20,
    },
    input: {
      padding: 10,
    },
    safeArea: {
      flex: 1,
    },
    saveButton: {
      alignItems: 'center',
      paddingHorizontal: 30,
      paddingVertical: 10,
    },
    saveButtonGradient: {
      alignSelf: 'center',
      borderRadius: 25,
      marginTop: 20,
    },
    saveButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: 'bold',
    },
    shutterBtn: {
      alignItems: 'center',
      backgroundColor: theme.colors.transparent,
      borderColor: theme.colors.palette.neutral100,
      borderRadius: 45,
      borderWidth: 5,
      height: 85,
      justifyContent: 'center',
      width: 85,
    },
    shutterBtnInner: {
      borderRadius: 50,
      height: 70,
      width: 70,
    },
    shutterContainer: {
      alignItems: 'center',
      bottom: 44,
      flexDirection: 'row',
      justifyContent: 'space-between',
      left: 0,
      paddingHorizontal: 30,
      position: 'absolute',
      width: '100%',
    },
    title: {
      color: theme.colors.text,
      fontSize: 24,
    },
    shutterBtnNeutral: {
      backgroundColor: theme.colors.palette.neutral100,
    },
    shutterBtnRed: {
      backgroundColor: theme.colors.palette.angry500,
    },
    opacityOne: {
      opacity: 1,
    },
    opacityLess: {
      opacity: 0.5,
    },
  })
