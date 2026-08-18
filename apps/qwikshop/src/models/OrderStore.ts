import { Instance, SnapshotIn, SnapshotOut, types, flow } from 'mobx-state-tree'
import { withSetPropAction } from './helpers/withSetPropAction'
import { queries } from '@/db/queries'

// Define the address model for orders
export const OrderAddressModel = types.model('OrderAddress', {
  fullName: types.string,
  street: types.string,
  city: types.string,
  state: types.string,
  pincode: types.string,
  phone: types.maybeNull(types.string),
})

// Define the order item model
export const OrderItemModel = types.model('OrderItem', {
  id: types.number,
  productId: types.number,
  productName: types.string,
  productImage: types.string,
  shortDescription: types.optional(types.string, ''),
  sku: types.optional(types.string, ''),
  seller: types.optional(types.string, ''),
  quantity: types.number,
  price: types.number,
  discountedPrice: types.number,
  total: types.number,
  savedAmount: types.optional(types.number, 0),
})

// Define the order status type
export const OrderStatus = types.enumeration('OrderStatus', [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
  'processing',
  'in transit',
  'order placed',
  'payment confirmed',
])

// Define the order model
export const OrderModel = types.model('Order', {
  id: types.number,
  userId: types.number,
  orderNumber: types.string,
  items: types.array(OrderItemModel),
  status: OrderStatus,
  totalAmount: types.number,
  shippingAddressId: types.maybeNull(types.number),
  deliveryAddress: types.maybeNull(OrderAddressModel),
  paymentMethod: types.string,
  // Optional fields with defaults
  subtotal: types.optional(types.number, 0),
  totalSavings: types.optional(types.number, 0),
  shipping: types.optional(types.number, 0),
  tax: types.optional(types.number, 0),
  grandTotal: types.optional(types.number, 0),
  couponDiscount: types.optional(types.number, 0),
  couponCode: types.maybeNull(types.string),
  orderDate: types.optional(types.string, () => new Date().toISOString()),
  shippedDate: types.maybeNull(types.string),
  deliveryDate: types.maybeNull(types.string),
  estimatedDeliveryDate: types.maybeNull(types.string),
  paymentStatus: types.optional(types.string, 'pending'),
  trackingNumber: types.maybeNull(types.string),
  courierPartner: types.maybeNull(types.string),
  invoiceUrl: types.maybeNull(types.string),
  isGift: types.optional(types.boolean, false),
  giftMessage: types.maybeNull(types.string),
  shippingAddressSnapshot: types.maybeNull(types.string),
})

export const OrderStore = types
  .model('OrderStore')
  .props({
    orders: types.array(OrderModel),
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    pendingOrder: types.maybeNull(OrderModel),
    isEditing: types.optional(types.boolean, false),
  })
  .actions(withSetPropAction)
  .actions(self => ({
    recalculatePendingOrderTotals() {
      if (!self.pendingOrder) return

      self.pendingOrder.subtotal = self.pendingOrder.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      )
      self.pendingOrder.totalSavings = self.pendingOrder.items.reduce(
        (sum, item) => sum + item.savedAmount,
        0,
      )
      const couponDiscount = self.pendingOrder.couponDiscount || 0

      self.pendingOrder.grandTotal =
        self.pendingOrder.subtotal -
        self.pendingOrder.totalSavings -
        couponDiscount +
        self.pendingOrder.shipping +
        self.pendingOrder.tax
      self.pendingOrder.totalAmount = self.pendingOrder.grandTotal
    },
  }))
  .actions(self => ({
    startEditing(orderId: number) {
      const order = self.orders.find(o => o.id === orderId)
      if (!order) return

      // Create a deep clone of the order for editing
      self.pendingOrder = OrderModel.create(JSON.parse(JSON.stringify(order)))
      self.isEditing = true
    },

    cancelEditing() {
      self.pendingOrder = null
      self.isEditing = false
    },

    setError(message: string | null) {
      self.error = message
    },

    createOrder: flow(function* (orderData: any) {
      try {
        self.isLoading = true
        self.error = null

        if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
          throw new Error('Order must have at least one item')
        }

        // Transform the order data to match database schema
        const dbOrder = {
          userId: orderData.userId,
          orderNumber: `ORD-${Date.now()}`,
          status: 'pending',
          totalAmount: orderData.grandTotal || orderData.totalAmount,
          subtotal: orderData.subtotal || 0,
          totalSavings: orderData.totalSavings || 0,
          shipping: orderData.shipping || 0,
          tax:
            orderData.tax ||
            (orderData.grandTotal || orderData.totalAmount) * 0.1,
          couponDiscount: orderData.couponDiscount || 0,
          couponCode: orderData.couponCode,
          shippingAddressId:
            orderData.shippingAddressId || orderData.deliveryAddress?.id,
          paymentMethod: orderData.paymentMethod || 'card',
          paymentStatus: 'pending',
          orderDate: new Date().toISOString(),
          estimatedDeliveryDate: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          isGift: orderData.isGift || false,
          giftMessage: orderData.giftMessage,
          items: orderData.items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
            shortDescription: item.shortDescription || '',
            sku: item.sku || `SKU-${item.productId}`,
            seller: item.seller || '',
            quantity: item.quantity,
            price: item.price,
            discountedPrice: item.discountedPrice || item.price,
            total: item.total,
            savedAmount:
              (item.price - (item.discountedPrice || item.price)) *
              item.quantity,
          })),
        }

        if (!dbOrder.shippingAddressId) {
          throw new Error('Shipping address is required')
        }

        // Create order in database with items
        const createdOrder = yield queries.createOrder(dbOrder)
        if (!createdOrder) {
          throw new Error('Failed to create order in database')
        }

        // Transform the order for MST model with all required fields
        const transformedOrder = {
          ...createdOrder,
          items: createdOrder.items.map((item: any) => ({
            ...item,
            id: item.id,
            productId: item.productId,
          })),
          status: 'pending' as any,
          deliveryAddress: orderData.deliveryAddress,
          grandTotal: createdOrder.totalAmount,
        }

        console.log('Adding transformed order to store:', transformedOrder)
        self.orders.unshift(transformedOrder)
        return transformedOrder
      } catch (error: any) {
        console.error('Failed to create order:', error)
        self.error = error?.message || 'Failed to create order'
        throw error
      } finally {
        self.isLoading = false
      }
    }),
    updatePendingOrderItem(itemId: number, quantity: number) {
      if (!self.pendingOrder) return

      const item = self.pendingOrder.items.find(i => i.id === itemId)
      if (item) {
        item.quantity = quantity
        item.total = item.discountedPrice * quantity
        item.savedAmount = (item.price - item.discountedPrice) * quantity
      }
      self.recalculatePendingOrderTotals()
      return self.pendingOrder
    },

    removePendingOrderItem(itemId: number) {
      console.log('Removing item:', itemId)
      if (!self.pendingOrder) return

      // Create a snapshot of the current state
      const currentItems = self.pendingOrder.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        shortDescription: item.shortDescription,
        sku: item.sku,
        seller: item.seller,
        quantity: item.quantity,
        price: item.price,
        discountedPrice: item.discountedPrice,
        total: item.total,
        savedAmount: item.savedAmount,
      }))

      // Filter out the item to remove
      const updatedItems = currentItems.filter(i => i.id !== itemId)

      // Create a fresh pending order with all the existing data plus updated items
      const pendingOrderData = {
        ...JSON.parse(
          JSON.stringify({
            id: self.pendingOrder.id,
            userId: self.pendingOrder.userId,
            orderNumber: self.pendingOrder.orderNumber,
            status: self.pendingOrder.status,
            totalAmount: self.pendingOrder.totalAmount,
            subtotal: self.pendingOrder.subtotal,
            totalSavings: self.pendingOrder.totalSavings,
            shipping: self.pendingOrder.shipping,
            tax: self.pendingOrder.tax,
            couponDiscount: self.pendingOrder.couponDiscount,
            couponCode: self.pendingOrder.couponCode,
            shippingAddressId: self.pendingOrder.shippingAddressId,
            paymentMethod: self.pendingOrder.paymentMethod,
            paymentStatus: self.pendingOrder.paymentStatus,
            orderDate: self.pendingOrder.orderDate,
            shippedDate: self.pendingOrder.shippedDate,
            deliveryDate: self.pendingOrder.deliveryDate,
            estimatedDeliveryDate: self.pendingOrder.estimatedDeliveryDate,
            trackingNumber: self.pendingOrder.trackingNumber,
            courierPartner: self.pendingOrder.courierPartner,
            invoiceUrl: self.pendingOrder.invoiceUrl,
            isGift: self.pendingOrder.isGift,
            giftMessage: self.pendingOrder.giftMessage,
            deliveryAddress: self.pendingOrder.deliveryAddress,
          }),
        ),
        items: updatedItems,
      }

      // Replace the entire pending order to avoid detachment issues
      self.pendingOrder = OrderModel.create(pendingOrderData)
      self.recalculatePendingOrderTotals()

      return self.pendingOrder
    },

    saveChanges: flow(function* () {
      if (!self.pendingOrder) return

      try {
        // First update the database with complete item data
        const updatedOrder = yield queries.updateOrder({
          id: self.pendingOrder.id,
          items: self.pendingOrder.items.map(item => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
            shortDescription: item.shortDescription,
            sku: item.sku,
            seller: item.seller,
            quantity: item.quantity,
            price: item.price,
            discountedPrice: item.discountedPrice,
            total: item.discountedPrice * item.quantity,
            savedAmount: (item.price - item.discountedPrice) * item.quantity,
          })),
          subtotal: self.pendingOrder.subtotal,
          totalSavings: self.pendingOrder.totalSavings,
          grandTotal: self.pendingOrder.grandTotal,
        })

        if (!updatedOrder) {
          throw new Error('Failed to update order in database')
        }

        // Update the store with the fresh data
        const orderIndex = self.orders.findIndex(
          o => o.id === self.pendingOrder?.id,
        )
        if (orderIndex >= 0) {
          // Create a fresh order instance from the updated data
          const freshOrder = OrderModel.create({
            ...updatedOrder,
            items: self.pendingOrder.items.map(item => ({
              ...item,
              total: item.discountedPrice * item.quantity,
              savedAmount: (item.price - item.discountedPrice) * item.quantity,
            })),
          })

          // Replace the order in the store
          self.orders[orderIndex] = freshOrder
        }

        // Clear editing state
        self.pendingOrder = null
        self.isEditing = false

        return true
      } catch (error) {
        console.error('Failed to save order changes:', error)
        throw error
      }
    }),

    loadOrders: flow(function* (userId: number) {
      try {
        self.isLoading = true
        self.error = null

        const orders = yield queries.getUserOrders(userId)
        self.orders.replace(orders)
      } catch (error: any) {
        console.error('Failed to load orders:', error)
        self.error = error?.message || 'Failed to load orders'
      } finally {
        self.isLoading = false
      }
    }),

    loadOrderById: flow(function* (orderId: number, userId: number) {
      try {
        self.isLoading = true
        self.error = null

        const order = yield queries.getOrderById(orderId, userId)
        if (order) {
          // Update or add the order in the store
          const existingIndex = self.orders.findIndex(o => o.id === order.id)
          if (existingIndex >= 0) {
            self.orders[existingIndex] = order
          } else {
            self.orders.push(order)
          }
        }
        return order
      } catch (error: any) {
        console.error('Failed to load order:', error)
        self.error = error?.message || 'Failed to load order'
        return null
      } finally {
        self.isLoading = false
      }
    }),

    restore(data: any) {
      if (!data) return
      if (data.orders) self.orders.replace(data.orders)
      if (data.isLoading !== undefined) self.isLoading = data.isLoading
      if (data.error !== undefined) self.error = data.error
      if (data.pendingOrder) {
        self.pendingOrder = OrderModel.create(data.pendingOrder)
      }
      if (data.isEditing !== undefined) self.isEditing = data.isEditing
    },
  }))
  .views(self => ({
    getOrderById(id: number) {
      return self.orders.find(order => order.id === id)
    },

    get pendingOrders() {
      return self.orders.filter(order => order.status === 'pending')
    },

    get completedOrders() {
      return self.orders.filter(order => order.status === 'delivered')
    },
  }))

export interface OrderStoreModel extends Instance<typeof OrderStore> {}
export interface OrderStoreSnapshotOut extends SnapshotOut<typeof OrderStore> {}
export interface OrderStoreSnapshotIn extends SnapshotIn<typeof OrderStore> {}
