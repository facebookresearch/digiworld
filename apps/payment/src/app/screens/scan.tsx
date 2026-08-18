import { Text } from '@/components'
import { useAppTheme } from '@andojo/shared-theme'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { Camera, CameraView } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import React, { useEffect, useState, useCallback } from 'react'
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
  Dimensions,
} from 'react-native'
import { useStores } from '@/models'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

const { width, height } = Dimensions.get('window')

export default function ScanScreen() {
  const { theme } = useAppTheme()
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scanned, setScanned] = useState(false)
  const [flash, setFlash] = useState(false)
  const insets = useSafeAreaInsets()
  const scanLinePosition = useSharedValue(0)
  const borderOpacity = useSharedValue(0.2)
  const { userStore, sessionStore } = useStores()
  const params = useLocalSearchParams()
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('QRScanner', '/screens/scan')

  // Session parameters
  const sessionId =
    typeof params.sessionId === 'string' ? params.sessionId : null
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(255, 255, 255, ${borderOpacity.value})`,
  }))

  const animatedScanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLinePosition.value }],
  }))

  // Load session data if exists
  useEffect(() => {
    if (params.sessionTimeStamp) {
      try {
        const session = sessionStore.getSession(sessionId as string)
        if (session?.data?.sessionData) {
          const savedState = session.data.sessionData.formData as any
          if (savedState) {
            // Restore scanner state from session
            if (savedState.flash !== undefined) {
              setFlash(savedState.flash)
            }
            if (savedState.scanned !== undefined) {
              setScanned(savedState.scanned)
            }

            trackContentChange({
              event: 'session_state_restored',
              restoredValues: {
                flash: savedState.flash,
                scanned: savedState.scanned,
              },
              timestamp: Date.now(),
            })
          }
        }
      } catch (error) {
        console.error('Error loading session data:', error)
      }
      setIsSessionLoaded(true)
    } else if (!isSessionLoaded) {
      setIsSessionLoaded(true)
    }
  }, [params.sessionTimeStamp, sessionStore])

  // Track screen mount and update session state when camera permission changes
  useFocusEffect(
    useCallback(() => {
      // Track the screen mount with current state
      trackScreenMount({
        hasPermission,
        flash,
        scanned,
        timestamp: Date.now(),
        platform: Platform.OS,
        screenDimensions: {
          width,
          height,
        },
        sessionId,
      })
    }, [
      hasPermission,
      flash,
      scanned,
      sessionId,
      isSessionLoaded,
      width,
      height,
    ]),
  )

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync()
      setHasPermission(status === 'granted')

      // Track permission result
      trackContentChange({
        event: 'camera_permission_result',
        granted: status === 'granted',
        timestamp: Date.now(),
      })
    }

    getCameraPermissions()
  }, [trackContentChange])

  useEffect(() => {
    scanLinePosition.value = withRepeat(
      withSequence(
        withTiming(200, { duration: 1000 }),
        withTiming(0, { duration: 1000 }),
      ),
      -1,
    )

    borderOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1000 }),
        withTiming(0.2, { duration: 1000 }),
      ),
      -1,
    )
  }, [])

  useEffect(() => {
    const getGalleryPermission = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to use this feature.',
        )

        // Track permission result
        trackContentChange({
          event: 'gallery_permission_result',
          granted: false,
          timestamp: Date.now(),
        })
      } else {
        trackContentChange({
          event: 'gallery_permission_result',
          granted: true,
          timestamp: Date.now(),
        })
      }
    }

    getGalleryPermission()
  }, [trackContentChange])

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true)
    try {
      trackContentChange({
        event: 'qr_code_scanned',
        data,
        timestamp: Date.now(),
      })

      if (!isNaN(Number(data.trim()))) {
        if (userStore.currentUser?.id === Number(data)) {
          trackContentChange({
            event: 'scan_error',
            errorType: 'self_scan',
            timestamp: Date.now(),
          })
          Alert.alert('You cannot send money to yourself')
          return
        }

        // If the session needs to be passed to next screen
        if (sessionId) {
          router.push({
            pathname: '/screens/contact/[id]',
            params: {
              id: Number(data.trim()),
              sessionId,
            },
          })
        } else {
          router.push({
            pathname: '/screens/contact/[id]',
            params: { id: Number(data.trim()) },
          })
        }
      } else {
        trackContentChange({
          event: 'scan_error',
          errorType: 'invalid_code',
          data,
          timestamp: Date.now(),
        })
        Alert.alert(
          `Invalid QR Code ${data}`,
          'This QR code is not a valid payment code.',
        )
      }
    } catch (error) {
      trackContentChange({
        event: 'scan_error',
        errorType: 'processing_error',
        timestamp: Date.now(),
      })
      Alert.alert('Error', 'Could not process QR code.')
    }
  }

  const toggleFlash = () => {
    const newFlashState = !flash
    setFlash(newFlashState)
    trackClick('toggle_flash')
    trackContentChange({
      event: 'flash_toggled',
      flashEnabled: newFlashState,
      timestamp: Date.now(),
    })
  }

  const pickImageAndScan = async () => {
    trackClick('pick_image')
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      })

      if (!result.canceled && result.assets[0].uri) {
        const scannedBarcodes = await Camera.scanFromURLAsync(
          result.assets[0].uri,
        )

        if (scannedBarcodes.length > 0) {
          handleBarCodeScanned({ data: scannedBarcodes[0].data })
        } else {
          Alert.alert(
            'No QR Code Found',
            'The selected image does not contain a valid QR code.',
          )
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Could not process the selected image.')
    }
  }

  const styles = createStyles(theme)

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text text="Requesting camera permission..." />
      </View>
    )
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text text="No access to camera" />
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => {
            trackClick('go_back_no_permission')
            router.back()
          }}
        >
          <Text text="Go Back" style={styles.permissionButtonText} />
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CameraView
        style={styles.camera}
        facing={flash ? 'front' : 'back'}
        enableTorch={flash}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                trackClick('close_scanner')
                router.back()
              }}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={toggleFlash}
                style={styles.headerButton}
              >
                <Ionicons
                  name={flash ? 'camera-reverse' : 'camera-reverse'}
                  size={28}
                  color="white"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={pickImageAndScan}
                style={styles.headerButton}
              >
                <MaterialIcons name="photo-library" size={28} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Scanner Frame */}
          <View style={styles.scannerFrame}>
            <Animated.View style={[styles.scannerBorder, animatedBorderStyle]}>
              <Animated.View style={[styles.scanLine, animatedScanLineStyle]} />
            </Animated.View>
          </View>

          {/* Bottom Text */}
          <View style={styles.bottomContainer}>
            <Text
              text="Scan a QR code to pay"
              size="lg"
              weight="medium"
              style={styles.bottomText}
            />
            <View style={styles.actionButtons}>
              {scanned && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    trackClick('scan_again')
                    setScanned(false)
                    trackContentChange({
                      event: 'scan_again_requested',
                      timestamp: Date.now(),
                    })
                  }}
                >
                  <Text
                    text="Tap to Scan Again"
                    style={styles.actionButtonText}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </CameraView>
    </View>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'black',
    },
    camera: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 40,
    },
    scannerFrame: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scannerBorder: {
      width: 250,
      height: 250,
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.5)',
      borderRadius: 24,
      overflow: 'hidden',
    },
    scanLine: {
      height: 2,
      width: '100%',
      backgroundColor: theme.colors.palette.primary500,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.5,
      shadowRadius: 5,
    },
    bottomContainer: {
      alignItems: 'center',
      marginTop: 40,
      marginBottom: 20,
      width: '100%',
    },
    bottomText: {
      color: 'white',
      textAlign: 'center',
    },
    actionButtons: {
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      gap: 12,
      marginTop: 16,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 12,
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 8,
      width: '80%',
    },
    actionButtonText: {
      color: 'white',
      fontSize: 16,
    },
    permissionButton: {
      marginTop: 20,
      padding: 12,
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 8,
    },
    permissionButtonText: {
      color: 'white',
      fontSize: 16,
      textAlign: 'center',
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerButton: {
      marginLeft: 20,
    },
  })
