import { useCallback } from 'react'
import { mutations } from '@/db/mutations'
import { db } from '@/db'
import { driversTable } from '@/db/schema'
import { OrderStatus } from '@/app/constants/orderStatus'

interface OrderStatusProps {
  orderId: number
  orderStatus: OrderStatus | undefined
  setOrderStatus: (status: OrderStatus) => void
  setBikePosition: (position: { lat: number; lng: number } | null) => void
  refreshDriverData: () => Promise<void>
  uiStore: any
}

const defaultBikePosition = { lat: 40.724803, lng: -73.994996 }

// Function to create a new driver record in the database
const createNewDriver = async (orderId: number) => {
  try {
    // Get all existing drivers from the database
    const existingDrivers = await db.select().from(driversTable).all()

    let driverData
    if (existingDrivers.length > 0) {
      // Pick a random driver from existing drivers
      const randomDriver =
        existingDrivers[Math.floor(Math.random() * existingDrivers.length)]
      driverData = {
        name: randomDriver.name,
        phone: randomDriver.phone,
        vehicle: randomDriver.vehicle,
      }
    } else {
      // Fallback data if no drivers exist in database
      driverData = {
        name: 'Charlie Driver',
        phone: '+15551234567',
        vehicle: 'Toyota Prius',
      }
    }

    // Create the driver record in the database
    await db.insert(driversTable).values({
      orderId: Number(orderId),
      name: driverData.name,
      phone: driverData.phone,
      vehicle: driverData.vehicle,
      assignedAt: new Date().toISOString(),
    })
    return driverData
  } catch (error) {
    console.error('❌ Error creating new driver:', error)
    throw error
  }
}

export const useOrderStatus = ({
  orderId,
  orderStatus,
  setOrderStatus,
  setBikePosition,
  refreshDriverData,
  uiStore,
}: OrderStatusProps) => {
  const handleStatusRefresh = useCallback(async () => {
    // Validate orderId
    if (!orderId || isNaN(orderId)) {
      return
    }

    let newStatus: OrderStatus | undefined = orderStatus

    if (orderStatus === OrderStatus.Pending) {
      newStatus = OrderStatus.Preparing
      try {
        await mutations.updateOrder(orderId, { status: newStatus })

        setOrderStatus(newStatus)
        setBikePosition(null) // Reset bike position
        uiStore.setOrderAnimationTimestamp(String(orderId), Date.now())
      } catch (error) {
        console.error('❌ Error updating order status from Pending:', {
          error,
          orderId,
          currentStatus: orderStatus,
          attemptedStatus: newStatus,
        })
        throw error
      }
      return
    } else if (orderStatus === OrderStatus.Preparing) {
      newStatus = OrderStatus.Assigned

      try {
        // First update the order status

        await mutations.updateOrder(orderId, { status: newStatus })

        // Then update the local state
        setOrderStatus(newStatus)

        // Set bike position and trigger animation
        setBikePosition(defaultBikePosition)
        uiStore.setOrderAnimationTimestamp(String(orderId), Date.now())

        // Create and assign a new driver
        try {
          await createNewDriver(orderId)
          await refreshDriverData()
        } catch (driverError) {
          console.error('❌ Error assigning driver:', {
            error: driverError,
            orderId,
          })
          // Don't throw here, as the order status is already updated
        }
      } catch (error) {
        console.error('❌ Error in Preparing to Assigned transition:', {
          error,
          orderId,
          currentStatus: orderStatus,
          attemptedStatus: newStatus,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined,
        })
        // Revert status and bike position if there's an error
        if (orderStatus) {
          setOrderStatus(orderStatus)
          setBikePosition(null)

          // Force trigger animation after rollback with a small delay
          setTimeout(() => {
            uiStore.setOrderAnimationTimestamp(String(orderId), Date.now())
            // Force another update after a short delay to ensure animation triggers
            setTimeout(() => {
              uiStore.setOrderAnimationTimestamp(String(orderId), Date.now())
            }, 100)
          }, 50)
        }
        throw error
      }
      return
    } else if (orderStatus === OrderStatus.Assigned) {
      newStatus = OrderStatus.OutForDelivery
      try {
        await mutations.updateOrder(orderId, { status: newStatus })
        setOrderStatus(newStatus)
        setBikePosition(null) // Reset bike position for delivery route
        uiStore.setOrderAnimationTimestamp(String(orderId), Date.now())
      } catch (error) {
        console.error('❌ Error updating status from Assigned:', {
          error,
          orderId,
          currentStatus: orderStatus,
          attemptedStatus: newStatus,
        })
        // Revert status and bike position if there's an error
        if (orderStatus) {
          setOrderStatus(orderStatus)
          setBikePosition(defaultBikePosition)
          uiStore.setOrderAnimationTimestamp(String(orderId), Date.now())
        }
        throw error
      }
    } else if (orderStatus === OrderStatus.OutForDelivery) {
      newStatus = OrderStatus.Delivered
      try {
        await mutations.updateOrder(orderId, { status: newStatus })
        setOrderStatus(newStatus)
        setBikePosition(null)
        uiStore.clearOrderAnimationTimestamp(String(orderId))
      } catch (error) {
        console.error('❌ Error updating status from OutForDelivery:', {
          error,
          orderId,
          currentStatus: orderStatus,
          attemptedStatus: newStatus,
        })
        // Revert status and bike position if there's an error
        if (orderStatus) {
          setOrderStatus(orderStatus)
          setBikePosition(null)
          uiStore.setOrderAnimationTimestamp(String(orderId), Date.now())
        }
        throw error
      }
    }

    if (newStatus && orderStatus) {
      try {
        await mutations.updateOrder(orderId, { status: newStatus })
        setOrderStatus(newStatus)
      } catch (error) {
        console.error('❌ Error in final status update:', {
          error,
          orderId,
          currentStatus: orderStatus,
          attemptedStatus: newStatus,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined,
        })
        setOrderStatus(orderStatus)
        throw error
      }
    }
  }, [
    orderId,
    orderStatus,
    setOrderStatus,
    setBikePosition,
    uiStore,
    refreshDriverData,
  ])

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      JSON.parse(event.nativeEvent.data)
    } catch (error) {
      console.error('Error parsing WebView message:', error)
    }
  }, [])

  return {
    handleStatusRefresh,
    handleWebViewMessage,
  }
}

export default useOrderStatus
