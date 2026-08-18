// Copyright (c) Meta Platforms, Inc. and affiliates.
import { OrderStatus } from '@/app/constants/orderStatus'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Screen, useTheme } from '@andojo/shared-theme'
import { useFocusEffect } from '@react-navigation/native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  StyleSheet,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { CancelledView } from './components/CancelledView'
import DeliveredView from './components/DeliveredView'
import { DriverCard } from './components/DriverCard'
import { MapView } from './components/MapView'
import { OrderStatusCard } from './components/OrderStatusCard'
import { useMapAnimation } from './hooks/useMapAnimation'
import { useOrderStatus } from './hooks/useOrderStatus'
import { useOrderTracking } from './hooks/useOrderTracking'

const OrderTrackingScreen = observer(() => {
  const { orderId, sessionId: urlSessionId } = useLocalSearchParams()
  const router = useRouter()
  const { uiStore, sessionStore } = useStores()
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('OrderTracking', '/screens/order/order-tracking')
  const webViewRef = useRef<WebView>(null)
  const [webViewKey, setWebViewKey] = useState(0)
  const [isWebViewReady, setIsWebViewReady] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [persistedOrderId, setPersistedOrderId] = useState<number | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(
    urlSessionId as string,
  )
  const { theme } = useTheme()
  const colors = theme.colors

  // Convert orderId to number safely
  const numericOrderId = useMemo(() => {
    if (!orderId) {
      return null
    }
    const id = Number(orderId)
    if (isNaN(id)) {
      return null
    }

    return id
  }, [orderId])

  // Handle deep link session ID
  useEffect(() => {
    if (urlSessionId) {
      setCurrentSessionId(urlSessionId as string)
    } else {
      // Create a new session if we don't have one
      const newSessionId = `session_${Date.now()}`

      setCurrentSessionId(newSessionId)
    }
  }, [urlSessionId])

  // Initialize order ID from URL params or session
  useEffect(() => {
    if (isInitialized) return

    if (numericOrderId) {
      setPersistedOrderId(numericOrderId)
      setIsInitialized(true)
    } else if (currentSessionId) {
      const session = sessionStore.getSession(currentSessionId)
      const sessionInfo = session?.data as any
      const formData = sessionInfo?.sessionData?.formData

      if (formData?.orderId) {
        setPersistedOrderId(formData.orderId)
        setIsInitialized(true)
      } else {
        console.error('❌ No valid order ID found in URL or session')
      }
    }
  }, [numericOrderId, currentSessionId, isInitialized, sessionStore])

  // Custom hooks for better state management
  const {
    order,
    driver,
    items,
    orderStatus,
    setOrderStatus,
    bikePosition,
    setBikePosition,
    refreshDriverData,
  } = useOrderTracking(persistedOrderId ?? 0)

  // Load session data if exists
  useEffect(() => {
    if (!currentSessionId || !persistedOrderId) {
      return
    }

    const session = sessionStore.getSession(currentSessionId)
    const sessionInfo = session?.data as any
    const formData = sessionInfo?.sessionData?.formData || {}

    // Restore other persisted state
    if (formData.orderStatus) {
      setOrderStatus(formData.orderStatus)
    }
    if (formData.bikePosition) {
      setBikePosition(formData.bikePosition)
    }
    if (formData.webViewKey) {
      setWebViewKey(formData.webViewKey)
    }
    if (formData.isWebViewReady) {
      setIsWebViewReady(formData.isWebViewReady)
    }

    // Restore feedback modal state from form data
    const shouldShowModal = formData.showFeedbackModal === true

    setShowFeedbackModal(shouldShowModal)

    if (shouldShowModal) {
      trackContentChange({
        action: 'feedback_modal_restored',
        orderId: persistedOrderId,
        timestamp: Date.now(),
      })
    }
  }, [currentSessionId, persistedOrderId])

  // Track screen mount with initial data
  useEffect(() => {
    if (!persistedOrderId) return

    trackScreenMount({
      orderId: persistedOrderId,
      orderStatus,
      timestamp: Date.now(),
      platform: Platform.OS,
      screenDimensions: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
      },
    })
  }, [persistedOrderId])

  const { handleStatusRefresh, handleWebViewMessage } = useOrderStatus({
    orderId: persistedOrderId ?? numericOrderId ?? 0,
    orderStatus,
    setOrderStatus,
    setBikePosition,
    refreshDriverData,
    uiStore,
  })

  const animationTimestamp = uiStore.orderAnimationTimestamps[orderId as string]

  const { injectedJS, handleWebViewLoad } = useMapAnimation({
    orderStatus,
    bikePosition,
    webViewRef,
    isWebViewReady,
    animationStartTimestamp: animationTimestamp,
  })

  // Handle WebView ready state
  const handleWebViewReady = useCallback(() => {
    setIsWebViewReady(true)

    // If status is Assigned, trigger animation after WebView is ready
    if (orderStatus === OrderStatus.Assigned) {
      uiStore.setOrderAnimationTimestamp(String(orderId), Date.now())
      handleWebViewLoad()
    }
  }, [orderStatus, orderId])

  // Add effect to handle refresh animation
  useEffect(() => {
    if (orderStatus === OrderStatus.Assigned) {
      // Reset WebView ready state to ensure proper initialization
      setIsWebViewReady(false)

      // Force WebView reload by updating the key
      setWebViewKey(prev => prev + 1)

      uiStore.setOrderAnimationTimestamp(String(orderId), Date.now())
    }
  }, [orderStatus])

  useEffect(() => {
    const timestamp = uiStore.orderAnimationTimestamps[orderId as string]

    const shouldInject =
      orderStatus === OrderStatus.Assigned &&
      isWebViewReady &&
      timestamp !== undefined

    if (shouldInject) {
      handleWebViewLoad()
    }
  }, [orderStatus, isWebViewReady])

  // Memoize components to prevent unnecessary re-renders
  const driverCard = useMemo(
    () => (
      <DriverCard
        driver={driver}
        orderStatus={orderStatus}
        onCall={() => {
          /* Handle call */
        }}
        onMessage={() => {
          /* Handle message */
        }}
      />
    ),
    [driver, orderStatus],
  )

  const orderStatusCard = useMemo(
    () => (
      <OrderStatusCard
        orderStatus={orderStatus}
        items={items}
        orderTotal={order?.total}
        refreshEnabled={true}
        onRefresh={handleStatusRefresh}
      />
    ),
    [orderStatus, items, order?.total, handleStatusRefresh],
  )

  const handleBackPress = useCallback(() => {
    trackClick('backButton')
    trackContentChange({
      action: 'navigation',
      destination: '/orders',
      timestamp: Date.now(),
    })
    router.replace('/orders')
  }, [router, trackClick, trackContentChange])

  // Update WebView key when orderStatus or bikePosition changes
  useEffect(() => {
    if (orderStatus === OrderStatus.Assigned) {
      setWebViewKey(prev => prev + 1)
    }
    trackContentChange({
      action: 'order_status_change',
      orderStatus,
      bikePosition,
      webViewKey,
      timestamp: Date.now(),
    })
  }, [orderStatus, bikePosition])

  // Reset WebView when order status changes
  useFocusEffect(
    useCallback(() => {
      if (orderStatus === OrderStatus.Assigned) {
        setIsWebViewReady(false)
        setWebViewKey(prev => prev + 1)
        uiStore.setOrderAnimationTimestamp(String(orderId), Date.now())
      }
    }, [orderStatus]),
  )

  // Handle feedback modal state changes
  const handleFeedbackModalChange = useCallback(
    (show: boolean) => {
      setShowFeedbackModal(show)

      // Update session data using trackContentChange
      trackContentChange({
        action: 'feedback_modal_state_change',
        showFeedbackModal: Boolean(show),
        orderId: persistedOrderId,
        timestamp: Date.now(),
        sessionData: {
          formData: {
            showFeedbackModal: Boolean(show),
            orderId: persistedOrderId,
          },
        },
      })
    },
    [currentSessionId, persistedOrderId, trackContentChange],
  )

  const styles = StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 0,
    },
    loadingIndicator: {
      marginTop: 40,
    },
  })

  const renderContent = () => {
    // Show loading spinner if order or orderStatus is not ready
    if (!order || !orderStatus) {
      return (
        <Screen style={styles.screenContainer}>
          <ActivityIndicator
            size="large"
            color={colors.palette.primary500}
            style={styles.loadingIndicator}
          />
        </Screen>
      )
    }

    if (orderStatus === OrderStatus.Delivered) {
      return (
        <DeliveredView
          onBackPress={handleBackPress}
          order={order}
          items={items}
          driver={driver}
          showFeedbackModal={showFeedbackModal}
          onFeedbackModalChange={handleFeedbackModalChange}
        />
      )
    }

    if (orderStatus === OrderStatus.Cancelled) {
      return (
        <CancelledView
          onBackPress={handleBackPress}
          order={order}
          items={items}
        />
      )
    }

    return (
      <>
        <MapView
          webViewRef={webViewRef}
          webViewKey={webViewKey}
          orderStatus={orderStatus}
          injectedJS={injectedJS}
          onMessage={handleWebViewMessage}
          onLoad={handleWebViewReady}
          onBackPress={handleBackPress}
        />
        {driverCard}
        {orderStatusCard}
      </>
    )
  }

  return <Screen style={styles.screenContainer}>{renderContent()}</Screen>
})

export default OrderTrackingScreen
