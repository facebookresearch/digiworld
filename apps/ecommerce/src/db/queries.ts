import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '@/db/index'
import {
  users,
  addresses,
  products,
  categories,
  carts,
  cartItems,
  orders,
  orderItems,
  productImages,
  paymentMethods,
  reviews,
  promoCodes,
} from './schema'

interface OrderItem {
  id: number
  productId: number
  productName: string
  productImage: string
  shortDescription: string
  sku: string | null
  seller: string
  quantity: number
  price: number
  discountedPrice: number
  total: number
  savedAmount: number | null
}

// User Queries
export const getUserByEmail = async (email: string) => {
  const results = await db.select().from(users).where(eq(users.email, email))
  return results[0]
}

export const getUserById = async (id: number) => {
  const results = await db.select().from(users).where(eq(users.id, id))
  return results[0]
}

// Address Queries
export const getUserAddresses = async (userId: number) => {
  return db.select().from(addresses).where(eq(addresses.userId, userId))
}

export const getDefaultAddress = async (userId: number) => {
  const results = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)))
  return results[0]
}

// Product Queries
export const getProducts = async (limit = 20, offset = 0) => {
  return db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      price: products.price,
      inStock: products.inStock,
      categoryId: products.categoryId,
      categoryName: products.categoryName,
      specs: products.specs,
      images: sql<
        { url: string }[]
      >`json_group_array(json_object('url', ${productImages.url}))`,
    })
    .from(products)
    .leftJoin(productImages, eq(products.id, productImages.productId))
    .groupBy(products.id)
    .limit(limit)
    .offset(offset)
}

export const getProductById = async (id: number) => {
  const results = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      price: products.price,
      inStock: products.inStock,
      categoryId: products.categoryId,
      categoryName: products.categoryName,
      specs: products.specs,
      images: sql<
        { url: string }[]
      >`json_group_array(json_object('url', ${productImages.url}))`,
    })
    .from(products)
    .leftJoin(productImages, eq(products.id, productImages.productId))
    .where(eq(products.id, id))
    .groupBy(products.id)
  return results[0]
}

// Category Queries
export const getCategories = async () => {
  return db.select().from(categories)
}

export const getProductsByCategory = async (
  category: number,
  limit = 20,
  offset = 0,
) => {
  return db
    .select()
    .from(products)
    .where(eq(products.categoryId, category))
    .limit(limit)
    .offset(offset)
}

// Cart Queries
export const getActiveCart = async (userId: number) => {
  const results = await db.select().from(carts).where(eq(carts.userId, userId))
  return results[0]
}

export const getCartForUser = async (userId: number) => {
  return db.select().from(cartItems).where(eq(cartItems.userId, userId))
}

// Map database status to MST OrderStatus
const mapOrderStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    processing: 'confirmed',
    'in transit': 'shipped',
    'order placed': 'pending',
    'payment confirmed': 'confirmed',
  }
  const normalizedStatus = status.toLowerCase()
  return statusMap[normalizedStatus] || normalizedStatus
}

// Order Queries
export const getUserOrders = async (userId: number) => {
  const orderResults = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalAmount: orders.totalAmount,
      subtotal: orders.subtotal,
      totalSavings: orders.totalSavings,
      shipping: orders.shipping,
      tax: orders.tax,
      couponDiscount: orders.couponDiscount,
      couponCode: orders.couponCode,
      shippingAddressId: orders.shippingAddressId,
      shippingAddressSnapshot: orders.shippingAddressSnapshot,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      orderDate: orders.orderDate,
      shippedDate: orders.shippedDate,
      deliveryDate: orders.deliveryDate,
      estimatedDeliveryDate: orders.estimatedDeliveryDate,
      trackingNumber: orders.trackingNumber,
      courierPartner: orders.courierPartner,
      invoiceUrl: orders.invoiceUrl,
      isGift: orders.isGift,
      giftMessage: orders.giftMessage,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))

  // For each order, get its items and shipping address
  const ordersWithDetails = await Promise.all(
    orderResults.map(async (order: any) => {
      const items = await db
        .select({
          id: orderItems.id,
          productId: orderItems.productId,
          productName: orderItems.productName,
          productImage: orderItems.productImage,
          shortDescription: orderItems.shortDescription,
          sku: orderItems.sku,
          seller: orderItems.seller,
          quantity: orderItems.quantity,
          price: orderItems.price,
          discountedPrice: orderItems.discountedPrice,
          total: orderItems.total,
          savedAmount: orderItems.savedAmount,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id))

      // Map items to ensure SKU is always present
      const itemsWithSku = items.map((item: OrderItem) => ({
        ...item,
        sku: item.sku || `SKU-${item.productId}`, // Ensure SKU is never null
      }))

      let deliveryAddress = null

      // If we have a shipping address ID, try to get the address
      if (order.shippingAddressId) {
        deliveryAddress = await db
          .select({
            fullName: addresses.fullName,
            street: addresses.street,
            city: addresses.city,
            state: addresses.state,
            pincode: addresses.pincode,
            phone: addresses.phone,
          })
          .from(addresses)
          .where(eq(addresses.id, order.shippingAddressId))
          .get()
      }

      // If address not found but we have a snapshot, use that
      if (!deliveryAddress && order.shippingAddressSnapshot) {
        try {
          deliveryAddress = JSON.parse(order.shippingAddressSnapshot)
        } catch (error) {
          console.error('Failed to parse address snapshot:', error)
        }
      }

      return {
        id: order.id,
        userId: order.userId,
        orderNumber:
          order.orderNumber || `ORD-${order.id.slice(0, 8).toUpperCase()}`,
        items: itemsWithSku,
        status: mapOrderStatus(order.status),
        totalAmount: order.totalAmount,
        subtotal: order.subtotal,
        totalSavings: order.totalSavings || 0,
        shipping: order.shipping || 0,
        tax: order.tax || order.totalAmount * 0.1,
        grandTotal: order.totalAmount,
        couponDiscount: order.couponDiscount || 0,
        couponCode: order.couponCode,
        shippingAddressId: order.shippingAddressId,
        deliveryAddress,
        shippingAddressSnapshot: order.shippingAddressSnapshot,
        paymentMethod: order.paymentMethod || 'card',
        paymentStatus: order.paymentStatus || 'pending',
        orderDate: order.orderDate || order.createdAt,
        shippedDate: order.shippedDate,
        deliveryDate: order.deliveryDate,
        estimatedDeliveryDate:
          order.estimatedDeliveryDate ||
          new Date(
            new Date(order.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        trackingNumber: order.trackingNumber,
        courierPartner: order.courierPartner,
        invoiceUrl: order.invoiceUrl,
        isGift: Boolean(order.isGift),
        giftMessage: order.giftMessage,
      }
    }),
  )

  return ordersWithDetails
}

// Get all payment methods for a user
export const getAllUserPaymentMethods = async (userId: number) => {
  const paymentInfo = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, userId))
  return paymentInfo.map((info: any) => ({
    ...info,
    isDefault: Boolean(info.isDefault),
  }))
}

// Get default payment method
export const defaultPaymentMethod = async (userId: number) => {
  const results = await db
    .select()
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.userId, userId),
        eq(paymentMethods.isDefault, true),
      ),
    )
  const paymentInfo = results[0]
  return paymentInfo
    ? {
        ...paymentInfo,
        isDefault: Boolean(paymentInfo.isDefault),
      }
    : null
}

export const getOrderById = async (orderId: number, userId: number) => {
  const order = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalAmount: orders.totalAmount,
      subtotal: orders.subtotal,
      totalSavings: orders.totalSavings,
      shipping: orders.shipping,
      tax: orders.tax,
      couponDiscount: orders.couponDiscount,
      couponCode: orders.couponCode,
      shippingAddressId: orders.shippingAddressId,
      shippingAddressSnapshot: orders.shippingAddressSnapshot,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      orderDate: orders.orderDate,
      shippedDate: orders.shippedDate,
      deliveryDate: orders.deliveryDate,
      estimatedDeliveryDate: orders.estimatedDeliveryDate,
      trackingNumber: orders.trackingNumber,
      courierPartner: orders.courierPartner,
      invoiceUrl: orders.invoiceUrl,
      isGift: orders.isGift,
      giftMessage: orders.giftMessage,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .get()

  if (!order) return null

  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      productName: orderItems.productName,
      productImage: orderItems.productImage,
      shortDescription: orderItems.shortDescription,
      sku: orderItems.sku,
      seller: orderItems.seller,
      quantity: orderItems.quantity,
      price: orderItems.price,
      discountedPrice: orderItems.discountedPrice,
      total: orderItems.total,
      savedAmount: orderItems.savedAmount,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))

  // Map items to ensure SKU is always present
  const itemsWithSku = items.map((item: OrderItem) => ({
    ...item,
    sku: item.sku || `SKU-${item.productId}`, // Ensure SKU is never null
  }))

  let deliveryAddress = null

  // If we have a shipping address ID, try to get the address
  if (order.shippingAddressId) {
    deliveryAddress = await db
      .select({
        fullName: addresses.fullName,
        street: addresses.street,
        city: addresses.city,
        state: addresses.state,
        pincode: addresses.pincode,
        phone: addresses.phone,
      })
      .from(addresses)
      .where(eq(addresses.id, order.shippingAddressId))
      .get()
  }

  // If address not found but we have a snapshot, use that
  if (!deliveryAddress && order.shippingAddressSnapshot) {
    try {
      deliveryAddress = JSON.parse(order.shippingAddressSnapshot)
    } catch (error) {
      console.error('Failed to parse address snapshot:', error)
    }
  }

  return {
    id: order.id,
    userId: order.userId,
    orderNumber:
      order.orderNumber || `ORD-${order.id.slice(0, 8).toUpperCase()}`,
    items: itemsWithSku,
    status: mapOrderStatus(order.status),
    totalAmount: order.totalAmount,
    subtotal: order.subtotal,
    totalSavings: order.totalSavings || 0,
    shipping: order.shipping || 0,
    tax: order.tax || order.totalAmount * 0.1,
    grandTotal: order.totalAmount,
    couponDiscount: order.couponDiscount || 0,
    couponCode: order.couponCode,
    shippingAddressId: order.shippingAddressId,
    deliveryAddress,
    shippingAddressSnapshot: order.shippingAddressSnapshot,
    paymentMethod: order.paymentMethod || 'card',
    paymentStatus: order.paymentStatus || 'pending',
    orderDate: order.orderDate || order.createdAt,
    shippedDate: order.shippedDate,
    deliveryDate: order.deliveryDate,
    estimatedDeliveryDate:
      order.estimatedDeliveryDate ||
      new Date(
        new Date(order.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    trackingNumber: order.trackingNumber,
    courierPartner: order.courierPartner,
    invoiceUrl: order.invoiceUrl,
    isGift: Boolean(order.isGift),
    giftMessage: order.giftMessage,
  }
}

// Add getOrders as an alias for getUserOrders to match what OrderStore expects
export const getOrders = getUserOrders

// Database Check
export const isDatabaseInitialized = async () => {
  try {
    await db.select().from(users).limit(1)
    return true
  } catch (error) {
    return false
  }
}
export const getActivePromoCodes = async () => {
  return await db
    .select()
    .from(promoCodes)
    .where(and(eq(promoCodes.isActive, true)))
    .then((codes: any) =>
      codes.map((code: any) => ({
        ...code,
        applicableCategories: JSON.parse(code.applicableCategories || '[]'),
        termsAndConditions: JSON.parse(code.termsAndConditions || '[]'),
        isFirstOrderOnly: Boolean(code.isFirstOrderOnly),
      })),
    )
}

export const getPromoCodeByCode = async (code: string) => {
  const result = await db
    .select()
    .from(promoCodes)
    .where(eq(promoCodes.code, code.toUpperCase()))
    .limit(1)
    .then((codes: any) => codes[0])

  if (!result) return null

  return {
    ...result,
    applicableCategories: JSON.parse(result.applicableCategories || '[]'),
    termsAndConditions: JSON.parse(result.termsAndConditions || '[]'),
  }
}

export const validatePromoCode = async (
  code: string,
  cartTotal: number,
  isFirstOrder: boolean,
  categoryNames?: string[],
) => {
  const promoCode = await getPromoCodeByCode(code)

  if (!promoCode) return { isValid: false, message: 'Invalid promo code' }

  const now = new Date()
  const validFrom = new Date(promoCode.validFrom)
  const validUntil = new Date(promoCode.validUntil)

  if (!promoCode.isActive) {
    return { isValid: false, message: 'This promo code is not active' }
  }

  if (now < validFrom || now > validUntil) {
    return { isValid: false, message: 'This promo code has expired' }
  }

  if (promoCode.usageCount >= promoCode.usageLimit) {
    return {
      isValid: false,
      message: 'This promo code has reached its usage limit',
    }
  }

  if (cartTotal < promoCode.minPurchase) {
    return {
      isValid: false,
      message: `Minimum purchase amount of $${promoCode.minPurchase} required`,
    }
  }

  if (promoCode.isFirstOrderOnly && !isFirstOrder) {
    return {
      isValid: false,
      message: 'This promo code is valid for first orders only',
    }
  }

  if (promoCode.applicableCategories.length > 0 && categoryNames) {
    const hasValidCategory = categoryNames.some(category =>
      promoCode.applicableCategories.includes(category),
    )
    if (!hasValidCategory) {
      return {
        isValid: false,
        message: `This promo code is only valid for ${promoCode.applicableCategories.join(', ')}`,
      }
    }
  }

  return {
    isValid: true,
    promoCode,
    message: 'Promo code applied successfully',
  }
}

export const calculateDiscount = async (code: string, cartTotal: number) => {
  const promoCode = await getPromoCodeByCode(code)
  if (!promoCode) return 0

  let discount = 0
  if (promoCode.discountType === 'percentage') {
    discount = (cartTotal * promoCode.discountValue) / 100
  } else {
    discount = promoCode.discountValue
  }

  // Ensure discount doesn't exceed maximum allowed
  return Math.min(discount, promoCode.maxDiscount)
}

export const incrementPromoCodeUsage = async (code: string) => {
  return await db
    .update(promoCodes)
    .set({
      usageCount: sql`${promoCodes.usageCount} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(promoCodes.code, code.toUpperCase()))
    .returning()
    .get()
}

export const queries = {
  async isDatabaseInitialized() {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .get()
    return result && (result as { count: number }).count > 0
  },

  async getProducts() {
    const productsWithImages = await db.transaction(async (tx: any) => {
      const allProducts = await tx.select().from(products)

      // Fetch images for all products
      const productIds = allProducts.map((p: any) => p.id)
      const images = await tx
        .select()
        .from(productImages)
        .where(sql`product_id IN ${productIds}`)
        .orderBy(productImages.position)

      // Group images by product
      const imagesByProduct = images.reduce((acc: any, img: any) => {
        if (!acc[img.productId]) {
          acc[img.productId] = []
        }
        acc[img.productId].push(img.url)
        return acc
      }, {})

      // Combine products with their images
      return allProducts.map((product: any) => ({
        ...product,
        images: imagesByProduct[product.id] || [],
        metadata: product.specs ? JSON.parse(product.specs) : null,
      }))
    })

    return productsWithImages
  },

  async getProductsByCategory(category: number) {
    const productsWithImages = await db.transaction(async (tx: any) => {
      const filteredProducts = await tx
        .select()
        .from(products)
        .where(eq(products.categoryId, category))

      // Fetch images for filtered products
      const productIds = filteredProducts.map((p: any) => p.id)
      const images = await tx
        .select()
        .from(productImages)
        .where(sql`product_id IN ${productIds}`)
        .orderBy(productImages.position)

      // Group images by product
      const imagesByProduct = images.reduce((acc: any, img: any) => {
        if (!acc[img.productId]) {
          acc[img.productId] = []
        }
        acc[img.productId].push(img.url)
        return acc
      }, {})

      // Combine products with their images
      return filteredProducts.map((product: any) => ({
        ...product,
        images: imagesByProduct[product.id] || [],
        metadata: product.specs ? JSON.parse(product.specs) : null,
      }))
    })

    return productsWithImages
  },

  async getProductById(id: number) {
    const productWithImages = await db.transaction(async (tx: any) => {
      const product = await tx
        .select()
        .from(products)
        .where(eq(products.id, id))
        .get()

      if (!product) return null

      const images = await tx
        .select()
        .from(productImages)
        .where(eq(productImages.productId, id))
        .orderBy(productImages.position)

      return {
        ...product,
        images: images.map((img: any) => img.url),
        metadata: product.specs ? JSON.parse(product.specs) : null,
      }
    })

    return productWithImages
  },

  getCartItems: async (userId: number) => {
    let cart = await db
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .get()
    console.log(cart, cart)
    if (!cart) {
      // 🚀 Let SQLite handle auto-incrementing ID
      const result = await db.insert(carts).values({ userId })

      // 🔥 Fetch the newly inserted cart (using lastInsertRowId)
      cart = await db
        .select()
        .from(carts)
        .where(eq(carts.id, result.lastInsertRowId))
        .get()
    }

    return await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, cart.id))
      .orderBy(desc(cartItems.id))
  },

  addToCart: async (userId: number, item: any) => {
    let cart = await db
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .get()
    console.log('cart', cart)

    if (!cart) {
      const result = await db.insert(carts).values({ userId })
      cart = await db
        .select()
        .from(carts)
        .where(eq(carts.id, result.lastInsertRowId))
        .get()
    }

    const result = await db.insert(cartItems).values({
      cartId: cart.id,
      userId,
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage,
      shortDescription: item.shortDescription,
      seller: item.seller,
      quantity: item.quantity,
      price: item.price,
      discountedPrice: item.discountedPrice,
      total: item.quantity * item.discountedPrice,
      inStock: item.inStock,
    })

    console.log('result.lastInsertRowId:', result.lastInsertRowId)

    // Instead of using lastInsertRowId, fetch the latest inserted item
    const insertedItem = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, cart.id))
      .orderBy(desc(cartItems.id)) // 🔥 Ensures we get the latest inserted row
      .limit(1) // Gets only the most recent entry
      .get()

    console.log('insertedItem:', insertedItem)
    return insertedItem
  },

  updateCartItemQuantity: async (itemId: number, quantity: number) => {
    const item = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.id, itemId))
      .get()
    if (!item) return

    return await db
      .update(cartItems)
      .set({
        quantity,
        total: quantity * item.discountedPrice,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(cartItems.id, itemId))
  },

  removeFromCart: async (itemId: number) => {
    return await db.delete(cartItems).where(eq(cartItems.id, itemId))
  },

  clearCart: async (userId: number) => {
    const cart = await db
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .get()
    if (cart) {
      return await db.delete(cartItems).where(eq(cartItems.cartId, cart.id))
    }
  },

  // Order Queries
  async getUserOrders(userId: number) {
    const orderResults = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        subtotal: orders.subtotal,
        totalSavings: orders.totalSavings,
        shipping: orders.shipping,
        tax: orders.tax,
        couponDiscount: orders.couponDiscount,
        couponCode: orders.couponCode,
        shippingAddressId: orders.shippingAddressId,
        shippingAddressSnapshot: orders.shippingAddressSnapshot,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        orderDate: orders.orderDate,
        shippedDate: orders.shippedDate,
        deliveryDate: orders.deliveryDate,
        estimatedDeliveryDate: orders.estimatedDeliveryDate,
        trackingNumber: orders.trackingNumber,
        courierPartner: orders.courierPartner,
        invoiceUrl: orders.invoiceUrl,
        isGift: orders.isGift,
        giftMessage: orders.giftMessage,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))

    // For each order, get its items and shipping address
    const ordersWithDetails = await Promise.all(
      orderResults.map(async (order: any) => {
        const items = await db
          .select({
            id: orderItems.id,
            productId: orderItems.productId,
            productName: orderItems.productName,
            productImage: orderItems.productImage,
            shortDescription: orderItems.shortDescription,
            sku: orderItems.sku,
            seller: orderItems.seller,
            quantity: orderItems.quantity,
            price: orderItems.price,
            discountedPrice: orderItems.discountedPrice,
            total: orderItems.total,
            savedAmount: orderItems.savedAmount,
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id))

        // Map items to ensure SKU is always present
        const itemsWithSku = items.map((item: OrderItem) => ({
          ...item,
          sku: item.sku || `SKU-${item.productId}`, // Ensure SKU is never null
        }))

        let deliveryAddress = null

        // If we have a shipping address ID, try to get the address
        if (order.shippingAddressId) {
          deliveryAddress = await db
            .select({
              fullName: addresses.fullName,
              street: addresses.street,
              city: addresses.city,
              state: addresses.state,
              pincode: addresses.pincode,
              phone: addresses.phone,
            })
            .from(addresses)
            .where(eq(addresses.id, order.shippingAddressId))
            .get()
        }

        // If address not found but we have a snapshot, use that
        if (!deliveryAddress && order.shippingAddressSnapshot) {
          try {
            deliveryAddress = JSON.parse(order.shippingAddressSnapshot)
          } catch (error) {
            console.error('Failed to parse address snapshot:', error)
          }
        }

        return {
          id: order.id,
          userId: order.userId,
          orderNumber:
            order.orderNumber || `ORD-${order.id.slice(0, 8).toUpperCase()}`,
          items: itemsWithSku,
          status: mapOrderStatus(order.status),
          totalAmount: order.totalAmount,
          subtotal: order.subtotal,
          totalSavings: order.totalSavings || 0,
          shipping: order.shipping || 0,
          tax: order.tax || order.totalAmount * 0.1,
          grandTotal: order.totalAmount,
          couponDiscount: order.couponDiscount || 0,
          couponCode: order.couponCode,
          shippingAddressId: order.shippingAddressId,
          deliveryAddress,
          shippingAddressSnapshot: order.shippingAddressSnapshot,
          paymentMethod: order.paymentMethod || 'card',
          paymentStatus: order.paymentStatus || 'pending',
          orderDate: order.orderDate || order.createdAt,
          shippedDate: order.shippedDate,
          deliveryDate: order.deliveryDate,
          estimatedDeliveryDate:
            order.estimatedDeliveryDate ||
            new Date(
              new Date(order.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          trackingNumber: order.trackingNumber,
          courierPartner: order.courierPartner,
          invoiceUrl: order.invoiceUrl,
          isGift: Boolean(order.isGift),
          giftMessage: order.giftMessage,
        }
      }),
    )
    return ordersWithDetails
  },

  // Alias for getUserOrders to match what OrderStore expects
  getOrders: async function (userId: number) {
    return this.getUserOrders(userId)
  },

  async getOrderById(orderId: number, userId: number) {
    const order = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        subtotal: orders.subtotal,
        totalSavings: orders.totalSavings,
        shipping: orders.shipping,
        tax: orders.tax,
        couponDiscount: orders.couponDiscount,
        couponCode: orders.couponCode,
        shippingAddressId: orders.shippingAddressId,
        shippingAddressSnapshot: orders.shippingAddressSnapshot,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        orderDate: orders.orderDate,
        shippedDate: orders.shippedDate,
        deliveryDate: orders.deliveryDate,
        estimatedDeliveryDate: orders.estimatedDeliveryDate,
        trackingNumber: orders.trackingNumber,
        courierPartner: orders.courierPartner,
        invoiceUrl: orders.invoiceUrl,
        isGift: orders.isGift,
        giftMessage: orders.giftMessage,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .get()

    if (!order) return null

    const items = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        productName: orderItems.productName,
        productImage: orderItems.productImage,
        shortDescription: orderItems.shortDescription,
        sku: orderItems.sku,
        seller: orderItems.seller,
        quantity: orderItems.quantity,
        price: orderItems.price,
        discountedPrice: orderItems.discountedPrice,
        total: orderItems.total,
        savedAmount: orderItems.savedAmount,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))

    // Map items to ensure SKU is always present
    const itemsWithSku = items.map((item: OrderItem) => ({
      ...item,
      sku: item.sku || `SKU-${item.productId}`, // Ensure SKU is never null
    }))

    let deliveryAddress = null

    // If we have a shipping address ID, try to get the address
    if (order.shippingAddressId) {
      deliveryAddress = await db
        .select({
          fullName: addresses.fullName,
          street: addresses.street,
          city: addresses.city,
          state: addresses.state,
          pincode: addresses.pincode,
          phone: addresses.phone,
        })
        .from(addresses)
        .where(eq(addresses.id, order.shippingAddressId))
        .get()
    }

    // If address not found but we have a snapshot, use that
    if (!deliveryAddress && order.shippingAddressSnapshot) {
      try {
        deliveryAddress = JSON.parse(order.shippingAddressSnapshot)
      } catch (error) {
        console.error('Failed to parse address snapshot:', error)
      }
    }

    return {
      id: order.id,
      userId: order.userId,
      orderNumber:
        order.orderNumber || `ORD-${order.id.slice(0, 8).toUpperCase()}`,
      items: itemsWithSku,
      status: mapOrderStatus(order.status),
      totalAmount: order.totalAmount,
      subtotal: order.subtotal,
      totalSavings: order.totalSavings || 0,
      shipping: order.shipping || 0,
      tax: order.tax || order.totalAmount * 0.1,
      grandTotal: order.totalAmount,
      couponDiscount: order.couponDiscount || 0,
      couponCode: order.couponCode,
      shippingAddressId: order.shippingAddressId,
      deliveryAddress,
      shippingAddressSnapshot: order.shippingAddressSnapshot,
      paymentMethod: order.paymentMethod || 'card',
      paymentStatus: order.paymentStatus || 'pending',
      orderDate: order.orderDate || order.createdAt,
      shippedDate: order.shippedDate,
      deliveryDate: order.deliveryDate,
      estimatedDeliveryDate:
        order.estimatedDeliveryDate ||
        new Date(
          new Date(order.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      trackingNumber: order.trackingNumber,
      courierPartner: order.courierPartner,
      invoiceUrl: order.invoiceUrl,
      isGift: Boolean(order.isGift),
      giftMessage: order.giftMessage,
    }
  },

  async updateOrder(orderData: any) {
    return await db.transaction(async (tx: any) => {
      try {
        // Update order totals
        await tx
          .update(orders)
          .set({
            subTotal: orderData.subtotal,
            totalSavings: orderData.totalSavings,
            totalAmount: orderData.grandTotal,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(orders.id, orderData.id))

        // Delete all existing items - they will be CASCADE deleted due to foreign key
        await tx.delete(orderItems).where(eq(orderItems.orderId, orderData.id))

        // Insert all items fresh - this ensures deleted items are gone
        for (const item of orderData.items) {
          await tx.insert(orderItems).values({
            orderId: orderData.id,
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
            shortDescription: item.shortDescription || '',
            sku: item.sku || '',
            seller: item.seller || '',
            quantity: item.quantity,
            price: item.price,
            discountedPrice: item.discountedPrice,
            total: item.total,
            savedAmount: item.savedAmount,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }

        // Return updated order
        return await tx
          .select()
          .from(orders)
          .where(eq(orders.id, orderData.id))
          .get()
      } catch (e) {
        console.error('Error in updateOrder transaction:', e)
        throw e
      }
    })
  },

  createOrder: async (order: any) => {
    return await db.transaction(async (tx: any) => {
      try {
        // Create the order first without specifying an ID (let SQLite auto-increment)
        const orderResult = await tx.insert(orders).values({
          userId: order.userId,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: order.totalAmount,
          subtotal: order.subtotal,
          totalSavings: order.totalSavings,
          shipping: order.shipping,
          tax: order.tax,
          couponDiscount: order.couponDiscount,
          couponCode: order.couponCode,
          shippingAddressId: order.shippingAddressId,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          orderDate: order.orderDate,
          estimatedDeliveryDate: order.estimatedDeliveryDate,
          isGift: order.isGift,
          giftMessage: order.giftMessage,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        // Get the newly created order ID
        const orderId = orderResult.lastInsertRowId

        // Insert all order items with the correct orderId
        for (const item of order.items) {
          await tx.insert(orderItems).values({
            orderId,
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }

        // Fetch the complete order with items
        const createdOrder = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, orderId))
          .get()

        const orderItemsList = await tx
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, orderId))

        const address = await tx
          .select()
          .from(addresses)
          .where(eq(addresses.id, order.shippingAddressId))
          .get()

        return {
          ...createdOrder,
          items: orderItemsList,
          deliveryAddress: address && {
            fullName: address.fullName,
            street: address.street,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            phone: address.phone,
          },
        }
      } catch (error) {
        console.error('Error in createOrder transaction:', error)
        throw error
      }
    })
  },

  getAllUserPaymentMethods,
  defaultPaymentMethod,

  // Review Queries
  async getProductReviews(productId: number, offset = 0) {
    const results = await db
      .select()
      .from(reviews)
      .where(eq(reviews.productId, productId))
      .limit(10)
      .offset(offset) // make sure `offset` is defined appropriately

    return results
  },

  async addReview(review: {
    productId: number
    userId: number
    userName: string
    userAvatar?: string
    rating: number
    title?: string
    comment: string
    hasImage?: boolean
    imageUrl?: string
    isVerifiedPurchase?: boolean
  }) {
    try {
      return await db
        .insert(reviews)
        .values({
          ...review,
          hasImage: review.hasImage ? 1 : 0,
          isVerifiedPurchase: review.isVerifiedPurchase ? 1 : 0,
          likesCount: 0,
          likedBy: '[]',
          replyCount: 0,
          status: 'published',
          reviewDate: new Date().toISOString(),
        })
        .returning()
        .get()
    } catch (error) {
      console.error('Error in addReview:', error)
      throw error
    }
  },

  async addReply(
    parentReviewId: number,
    reply: {
      productId: number
      userId: number
      userName: string
      userAvatar?: string
      comment: string
    },
  ) {
    try {
      const result = await db
        .insert(reviews)
        .values({
          ...reply,
          parentReviewId,
          hasImage: 0,
          isVerifiedPurchase: 0,
          likesCount: 0,
          likedBy: '[]',
          replyCount: 0,
          status: 'published',
          reviewDate: new Date().toISOString(),
        })
        .returning()
        .get()

      if (result) {
        // Update parent review's reply count
        await db
          .update(reviews)
          .set({
            replyCount: sql`${reviews.replyCount} + 1`,
          })
          .where(eq(reviews.id, parentReviewId))
          .run()
      }

      return result
    } catch (error) {
      console.error('Error in addReply:', error)
      throw error
    }
  },

  async toggleReviewLike(reviewId: number, userId: number) {
    const review = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .then((res: any) => res[0]) // mimic findFirst

    if (!review) {
      throw new Error('Review not found')
    }

    const userIdStr = userId

    let likedBy: number[]
    try {
      console.log('review.likedBy', review.likedBy, typeof review.likedBy)
      likedBy = JSON.parse(review.likedBy ?? '[]')
      if (!Array.isArray(likedBy)) likedBy = []
    } catch {
      likedBy = []
    }

    const isLiked = likedBy.includes(userIdStr)
    const updatedLikedBy = isLiked
      ? likedBy.filter((id: number) => id !== userIdStr)
      : [...likedBy, userIdStr]

    await db
      .update(reviews)
      .set({
        likesCount: sql`${reviews.likesCount} ${isLiked ? sql`- 1` : sql`+ 1`}`,
        likedBy: JSON.stringify(updatedLikedBy),
      })
      .where(eq(reviews.id, reviewId))

    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .then((res: any) => res[0])
  },
  getActivePromoCodes,
  getPromoCodeByCode,
  validatePromoCode,
  calculateDiscount,
  incrementPromoCodeUsage,
}
