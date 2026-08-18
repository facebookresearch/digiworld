// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotOut, types } from 'mobx-state-tree'
import { MenuItem } from './types'

const CartItemModel = types.model('CartItem', {
  menuItem: types.frozen<MenuItem>(),
  quantity: types.number,
})

export const CartStore = types
  .model('CartStore', {
    items: types.array(CartItemModel),
  })
  .views(self => ({
    get totalItems() {
      return self.items.reduce((sum, item) => sum + item.quantity, 0)
    },
    get subtotal() {
      return self.items.reduce(
        (sum, item) => sum + item.menuItem.price * item.quantity,
        0,
      )
    },
    get isEmpty() {
      return self.items.length === 0
    },
  }))
  .actions(self => ({
    addToCart(menuItem: MenuItem, quantity: number = 1) {
      const existing = self.items.find(i => i.menuItem.id === menuItem.id)
      if (existing) {
        existing.quantity += quantity
      } else {
        self.items.push({ menuItem, quantity })
      }
    },
    removeFromCart(menuItemId: number) {
      const idx = self.items.findIndex(i => i.menuItem.id === menuItemId)
      if (idx > -1) self.items.splice(idx, 1)
    },
    updateQuantity(menuItemId: number, quantity: number) {
      const item = self.items.find(i => i.menuItem.id === menuItemId)
      if (item) item.quantity = quantity
    },
    clearCart() {
      self.items.clear()
    },
    restore(data: any) {
      Object.keys(data).forEach(key => {
        if (key in self) {
          ;(self as any)[key] = data[key]
        }
      })
    },
  }))

export interface ICartStore extends Instance<typeof CartStore> {}
export interface CartStoreSnapshot extends SnapshotOut<typeof CartStore> {}
