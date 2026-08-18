// Copyright (c) Meta Platforms, Inc. and affiliates.
import { types, flow, Instance } from 'mobx-state-tree'
import { queries } from '../db/queries'

// Type for cart items as they come from the database
interface DBCartItem {
  id: number
  cartId: number
  userId: number
  productId: number
  productName: string
  productImage: string
  shortDescription: string
  seller: string
  quantity: number
  price: number
  discountedPrice: number
  total: number
  inStock: boolean
  createdAt: string
  updatedAt: string
}

export const CartItemModel = types
  .model('CartItem')
  .props({
    id: types.number,
    cartId: types.number,
    userId: types.number,
    productId: types.number,
    productName: types.string,
    productImage: types.string,
    shortDescription: types.string,
    seller: types.string,
    quantity: types.number,
    price: types.number,
    discountedPrice: types.number,
    total: types.number,
    inStock: types.optional(types.boolean, true),
    createdAt: types.optional(types.string, () => new Date().toISOString()),
    updatedAt: types.optional(types.string, () => new Date().toISOString()),
  })
  .views(self => ({
    get savings() {
      return self.price * self.quantity - self.discountedPrice * self.quantity
    },
  }))
  .actions(self => ({
    updateFromDB(dbItem: DBCartItem) {
      self.id = dbItem.id
      self.cartId = dbItem.cartId
      self.updatedAt = dbItem.updatedAt
    },
    updateQuantity(newQuantity: number) {
      self.quantity = newQuantity
      self.total = newQuantity * self.discountedPrice
      self.updatedAt = new Date().toISOString()
    },
  }))

export const CartStore = types
  .model('CartStore')
  .props({
    items: types.array(CartItemModel),
    error: types.maybeNull(types.string),
    isLoading: types.optional(types.boolean, false),
  })
  .views(self => {
    const getOriginalSubtotal = () =>
      self.items.reduce((acc, item) => acc + item.price * item.quantity, 0)
    const getDiscountedSubtotal = () =>
      self.items.reduce(
        (acc, item) => acc + item.discountedPrice * item.quantity,
        0,
      )
    const getSavings = () => getOriginalSubtotal() - getDiscountedSubtotal()
    const getTax = (amount: number) => amount * 0.1 // 10% tax

    return {
      get originalSubtotal() {
        return getOriginalSubtotal()
      },
      get discountedSubtotal() {
        return getDiscountedSubtotal()
      },
      get savings() {
        return getSavings()
      },
      get subtotal() {
        return getDiscountedSubtotal() // This is after item-level discounts
      },
      get tax() {
        return getTax(this.subtotal)
      },
      get total() {
        return this.subtotal + this.tax // Include tax in total
      },
      get totalItems() {
        return self.items.reduce((acc, item) => acc + item.quantity, 0)
      },
      getItemByProductId(productId: number) {
        return self.items.find(item => item.productId === productId)
      },
    }
  })
  .actions(store => {
    const self = store as any

    const setError = (message: string | null) => {
      self.error = message
    }

    const setLoading = (loading: boolean) => {
      self.isLoading = loading
    }

    const replaceItems = (items: DBCartItem[]) => {
      self.items.replace(items.map(item => CartItemModel.create(item)))
    }

    const addItemToStore = (item: Instance<typeof CartItemModel>) => {
      self.items.push(item)
    }

    const removeItemFromStore = (index: number) => {
      self.items.splice(index, 1)
    }

    const restoreItem = (
      index: number,
      item: Instance<typeof CartItemModel>,
    ) => {
      self.items.splice(index, 0, item)
    }

    const loadCart = flow(function* (userId: number) {
      try {
        setError(null)
        setLoading(true)
        const items = yield queries.getCartItems(userId)
        replaceItems(items)
      } catch (error) {
        console.error('Failed to load cart:', error)
        setError('Failed to load cart')
      } finally {
        setLoading(false)
      }
    })

    const addItem = flow(function* (
      userId: number,
      product: any,
      quantity = 1,
    ) {
      const tempId = Date.now()
      try {
        setError(null)
        // Check if product already exists in cart
        const existingItem = self.items.find(
          item => item.productId === product.id,
        )
        if (existingItem) {
          yield updateItemQuantity(
            existingItem.id,
            existingItem.quantity + quantity,
            userId,
          )
          return existingItem
        }

        // Create cart item with complete product details
        const cartItem = CartItemModel.create({
          id: tempId,
          cartId: 0, // Will be updated after DB insert
          userId,
          productId: product.id,
          productName: product.name,
          productImage: product.imageUrl || product.image || '',
          shortDescription:
            product.description || product.shortDescription || '',
          seller: product.seller || '',
          quantity,
          price: Number(product.price),
          discountedPrice: Number(product.discountedPrice || product.price),
          total: quantity * Number(product.discountedPrice || product.price),
          inStock: product.inStock ?? true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        // Add to store immediately for optimistic update
        addItemToStore(cartItem)

        // Sync with database
        const dbItem = yield queries.addToCart(userId, {
          productId: product.id,
          productName: product.name,
          productImage: product.imageUrl || product.image || '',
          shortDescription:
            product.description || product.shortDescription || '',
          seller: product.seller || '',
          quantity,
          price: Number(product.price),
          discountedPrice: Number(product.discountedPrice || product.price),
          total: quantity * Number(product.discountedPrice || product.price),
          inStock: product.inStock ?? true,
          userId,
        })
        if (!dbItem || !dbItem.id) {
          throw new Error('Failed to add item to cart: Invalid server response')
        }

        // Update the temporary item with database values
        cartItem.updateFromDB({
          ...dbItem,
          updatedAt: dbItem.updatedAt || new Date().toISOString(),
        })

        return cartItem
      } catch (error) {
        console.error('Failed to add item to cart from else:', error)
        // Remove the temporary item if database operation failed
        const index = self.items.findIndex((item: any) => item.id === tempId)
        if (index !== -1) {
          removeItemFromStore(index)
        }
        setError('Failed to add item to cart')
        throw error
      }
    })

    const updateItemQuantity = flow(function* (
      itemId: number,
      quantity: number,
    ) {
      try {
        setError(null)
        setLoading(true)

        const item = self.items.find((item: any) => item.id === itemId)
        if (item) {
          const oldQuantity = item.quantity
          item.updateQuantity(quantity)

          try {
            yield queries.updateCartItemQuantity(itemId, quantity)
          } catch (error) {
            console.error('Failed to sync quantity update to DB:', error)
            item.updateQuantity(oldQuantity)
            setError('Failed to update item quantity')
          }
        }
      } catch (error) {
        console.error('Failed to update item quantity:', error)
        setError('Failed to update item quantity')
      } finally {
        setLoading(false)
      }
    })

    const removeItem = flow(function* (itemId: number) {
      try {
        setError(null)
        setLoading(true)

        const itemIndex = self.items.findIndex(item => item.id === itemId)
        if (itemIndex === -1) return

        const removedItem = self.items[itemIndex]
        removeItemFromStore(itemIndex)

        try {
          yield queries.removeFromCart(itemId)
        } catch (error) {
          console.error('Failed to sync item removal to DB:', error)
          restoreItem(itemIndex, removedItem)
          setError('Failed to remove item from cart')
        }
      } catch (error) {
        console.error('Failed to remove item from cart:', error)
        setError('Failed to remove item from cart')
      } finally {
        setLoading(false)
      }
    })

    const clearCart = flow(function* (userId: number) {
      try {
        setError(null)
        setLoading(true)

        const oldItems = [...self.items]
        self.items.clear()

        try {
          yield queries.clearCart(userId)
        } catch (error) {
          console.error('Failed to sync cart clear to DB:', error)
          replaceItems(oldItems as DBCartItem[])
          setError('Failed to clear cart')
        }
      } catch (error) {
        console.error('Failed to clear cart:', error)
        setError('Failed to clear cart')
      } finally {
        setLoading(false)
      }
    })

    const restore = (data: any) => {
      if (!data) return
      if (data.items) self.items.replace(data.items)
      if (data.error !== undefined) self.error = data.error
      if (data.isLoading !== undefined) self.isLoading = data.isLoading
    }

    return {
      loadCart,
      addItem,
      updateItemQuantity,
      removeItem,
      clearCart,
      restore,
    }
  })

export interface CartStoreModel extends Instance<typeof CartStore> {}
export interface CartItem extends Instance<typeof CartItemModel> {}
