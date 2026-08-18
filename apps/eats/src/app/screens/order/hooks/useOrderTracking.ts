import { useState, useEffect, useRef } from 'react'
import { queries } from '@/db/queries'
import { OrderStatus } from '@/app/constants/orderStatus'
import { useStores } from '@/models/helpers/useStores'

interface OrderTrackingState {
  order: any
  driver: any
  items: any[]
  orderStatus: OrderStatus | undefined
  bikePosition: { lat: number; lng: number } | null
  setOrderStatus: (status: OrderStatus) => void
  setBikePosition: (position: { lat: number; lng: number } | null) => void
  refreshDriverData: () => Promise<void>
}

const defaultBikePosition = { lat: 40.721575, lng: -73.996439 }

export const useOrderTracking = (orderId: number): OrderTrackingState => {
  const { uiStore } = useStores()
  const [order, setOrder] = useState<any>(null)
  const [driver, setDriver] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [orderStatus, setOrderStatus] = useState<OrderStatus | undefined>(
    undefined,
  )
  const [bikePosition, setBikePosition] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const prevOrderId = useRef<number | null>(null)
  const prevBikePosition = useRef<{ lat: number; lng: number } | null>(null)
  const prevOrderStatus = useRef<OrderStatus | undefined>(undefined)
  const animationTimeout = useRef<NodeJS.Timeout | null>(null)

  const fetchDriverData = async () => {
    try {
      if (order?.id) {
        const d = await queries.getDriverByOrderId(order.id)
        setDriver(d)
      }
    } catch (error) {
      console.error('Error fetching driver data:', error)
    }
  }

  const triggerAnimation = () => {
    const timestamp = Date.now()

    uiStore.setOrderAnimationTimestamp(String(orderId), timestamp)
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const o = await queries.getOrderById(orderId)

        setOrder(o)

        if (o) {
          await fetchDriverData()
          const its = await queries.getOrderItemsForOrder(o.id)
          const itemsWithMenu = await Promise.all(
            its.map(async (item: any) => {
              const menu = await queries.getMenuItemById(item.menuItemId)
              return {
                ...item,
                menuName: menu?.name,
                menuImage: menu?.image,
                menuPrice: menu?.price,
              }
            }),
          )
          setItems(itemsWithMenu)
        }
      } catch (error) {
        console.error('Error fetching order data:', error)
      }
    }

    fetchData()
  }, [orderId])

  useEffect(() => {
    if (order?.status && orderId && prevOrderId.current !== orderId) {
      const status = order.status.toLowerCase() as OrderStatus

      setOrderStatus(status)
      prevOrderId.current = orderId
    }
  }, [order, orderId])

  // Fetch driver data when order status changes to Assigned or Delivered
  useEffect(() => {
    if (
      orderStatus === OrderStatus.Assigned ||
      orderStatus === OrderStatus.OutForDelivery ||
      orderStatus === OrderStatus.Delivered
    ) {
      fetchDriverData()
    }
  }, [orderStatus])

  // Add a new effect to fetch driver data when the screen is focused
  useEffect(() => {
    if (
      order?.id &&
      (orderStatus === OrderStatus.Assigned ||
        orderStatus === OrderStatus.OutForDelivery ||
        orderStatus === OrderStatus.Delivered)
    ) {
      fetchDriverData()
    }
  }, [order?.id, orderStatus])

  useEffect(() => {
    let newPosition: { lat: number; lng: number } | null = null

    if (orderStatus === OrderStatus.OutForDelivery) {
      newPosition = null
    } else if (orderStatus === OrderStatus.Assigned) {
      newPosition = defaultBikePosition
    } else {
      newPosition = null
    }

    // Check if status is Assigned (either from rollback or normal change)
    const isAssigned = orderStatus === OrderStatus.Assigned

    // Update position and trigger animation if:
    // 1. Position has changed, or
    // 2. Status is Assigned
    if (
      JSON.stringify(newPosition) !==
        JSON.stringify(prevBikePosition.current) ||
      isAssigned
    ) {
      setBikePosition(newPosition)
      prevBikePosition.current = newPosition

      // Always update animation timestamp when:
      // 1. Position changes, or
      // 2. Status is Assigned
      if ((newPosition && orderId) || isAssigned) {
        // Clear any existing timeout
        if (animationTimeout.current) {
          clearTimeout(animationTimeout.current)
        }

        // Trigger animation immediately when status is Assigned
        if (isAssigned) {
          triggerAnimation()

          // Schedule another animation after a short delay to ensure it triggers
          animationTimeout.current = setTimeout(() => {
            triggerAnimation()
          }, 500)
        } else if (newPosition) {
          // For other position changes, trigger animation once
          triggerAnimation()
        }
      }
    }

    // Update previous status
    prevOrderStatus.current = orderStatus
  }, [orderStatus, orderId, uiStore])

  return {
    order,
    driver,
    items,
    orderStatus,
    bikePosition,
    setOrderStatus,
    setBikePosition,
    refreshDriverData: fetchDriverData,
  }
}

export default useOrderTracking
