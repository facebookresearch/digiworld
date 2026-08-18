// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useCallback } from 'react'
import { WebView } from 'react-native-webview'
import { OrderStatus } from '@/app/constants/orderStatus'

interface MapAnimationProps {
  orderStatus: OrderStatus | undefined
  bikePosition: { lat: number; lng: number } | null
  webViewRef: React.RefObject<WebView>
  isWebViewReady: boolean
  animationStartTimestamp: number | undefined
}

const startPoint = { lat: 40.722502, lng: -73.996101 }
const endPoint = { lat: 40.722896, lng: -73.998494 }
const deliveryRoute = [
  startPoint,
  { lat: 40.72338, lng: -73.995715 },
  { lat: 40.724241, lng: -73.997743 },
  { lat: 40.72303, lng: -73.998778 },
  endPoint,
]

export const useMapAnimation = ({
  orderStatus,
  bikePosition,
  webViewRef,
  isWebViewReady,
  animationStartTimestamp,
}: MapAnimationProps) => {
  const injectedJS = `
    if (typeof initMap === 'function') {
      initMap(
        ${JSON.stringify(startPoint)},
        ${JSON.stringify(endPoint)},
        ${JSON.stringify(orderStatus)},
        ${JSON.stringify(orderStatus === OrderStatus.Assigned ? bikePosition : null)},
        ${JSON.stringify(orderStatus === OrderStatus.OutForDelivery ? deliveryRoute : null)},
        ${animationStartTimestamp || 'null'}
      );
    }
    true;
  `
  const handleWebViewLoad = useCallback(() => {
    if (webViewRef.current && isWebViewReady) {
      webViewRef.current.injectJavaScript(injectedJS)
    }
  }, [webViewRef, isWebViewReady, injectedJS])

  return {
    injectedJS,
    handleWebViewLoad,
  }
}
export default useMapAnimation
