import React from 'react'
import { View, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import { Text, Button, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { OrderStatus } from '@/app/constants/orderStatus'

const MAP_HTML = 'file:///android_asset/web/map.html'

interface MapViewProps {
  webViewRef: React.RefObject<WebView>
  webViewKey: number
  orderStatus: OrderStatus | undefined
  injectedJS: string
  onMessage: (event: any) => void
  onLoad: () => void
  onBackPress: () => void
}

export const MapView: React.FC<MapViewProps> = ({
  webViewRef,
  webViewKey,
  orderStatus,
  injectedJS,
  onMessage,
  onLoad,
  onBackPress,
}) => {
  const { theme } = useTheme()
  const colors = theme.colors

  const getStatusText = () => {
    switch (orderStatus) {
      case OrderStatus.Pending:
        return 'Order Placed'
      case OrderStatus.Preparing:
        return 'Preparing your order'
      case OrderStatus.Assigned:
        return 'Driver assigned'
      case OrderStatus.OutForDelivery:
        return 'Order is on the way'
      case OrderStatus.Delivered:
        return 'Order delivered'
      case OrderStatus.Cancelled:
        return 'Order cancelled'
      default:
        return 'Tracking your order'
    }
  }

  const getStatusIcon = () => {
    switch (orderStatus) {
      case OrderStatus.Pending:
        return 'time-outline'
      case OrderStatus.Preparing:
        return 'restaurant-outline'
      case OrderStatus.Assigned:
        return 'person-outline'
      case OrderStatus.OutForDelivery:
        return 'bicycle-outline'
      case OrderStatus.Delivered:
        return 'checkmark-circle-outline'
      case OrderStatus.Cancelled:
        return 'close-circle-outline'
      default:
        return 'help-circle-outline'
    }
  }

  const styles = StyleSheet.create({
    mapContainer: {
      height: '60%',
      overflow: 'hidden',
      backgroundColor: colors.palette.neutral200,
    },
    headerOverlay: {
      position: 'absolute',
      top: 32,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      zIndex: 10,
    },
    backButtonOverlay: {
      backgroundColor: colors.palette.primary500,
      borderRadius: 20,
      padding: 6,
      marginRight: 12,
      elevation: 2,
      shadowColor: colors.palette.neutral900,
      shadowOpacity: 0.08,
      shadowRadius: 4,
    },
    statusContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginEnd: 18,
      marginLeft: 8,
      backgroundColor: colors.palette.neutral100,
      borderRadius: 16,
      shadowColor: colors.palette.neutral900,
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    statusIcon: {
      marginRight: 8,
    },
    headerOverlayText: {
      color: colors.text,
      fontSize: 20,
      textAlign: 'center',
    },
  })

  return (
    <View style={styles.mapContainer}>
      <WebView
        key={`${webViewKey}-${orderStatus}`}
        ref={webViewRef}
        source={{ uri: MAP_HTML }}
        style={StyleSheet.absoluteFill}
        injectedJavaScript={injectedJS}
        onMessage={onMessage}
        onLoad={onLoad}
        onLoadEnd={() => {
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(injectedJS)
          }
        }}
      />
      <View style={styles.headerOverlay}>
        <Button
          style={styles.backButtonOverlay}
          LeftAccessory={() => (
            <Ionicons
              name="arrow-back"
              color={colors.palette.neutral100}
              size={24}
            />
          )}
          onPress={onBackPress}
        />
        <View style={styles.statusContainer}>
          <Ionicons
            name={getStatusIcon()}
            size={24}
            color={colors.palette.primary500}
            style={styles.statusIcon}
          />
          <Text size="large" weight="bold" style={styles.headerOverlayText}>
            {getStatusText()}
          </Text>
        </View>
      </View>
    </View>
  )
}

export default MapView
