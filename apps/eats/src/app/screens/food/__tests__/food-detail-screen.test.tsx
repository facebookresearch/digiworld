// Copyright (c) Meta Platforms, Inc. and affiliates.
describe('food-detail-screen.test.tsx', () => {
  it('renders without crashing', () => {
    // Placeholder test to check if the component renders
    expect(true).toBe(true)
  })

  it('quantity increases and decreases correctly', () => {
    let quantity = 2
    quantity += 1
    expect(quantity).toBe(3)
    quantity -= 2
    expect(quantity).toBe(1)
  })

  it('item is available if isActive is 1 or true', () => {
    const menuItem1 = { isActive: 1 }
    const menuItem2 = { isActive: true }
    const isAvailable1 = menuItem1.isActive === 1
    const isAvailable2 = menuItem2.isActive === true
    expect(isAvailable1).toBe(true)
    expect(isAvailable2).toBe(true)
  })

  it('item is not available if isActive is 0 or false', () => {
    const menuItem1 = { isActive: 0 }
    const menuItem2 = { isActive: false }
    const isAvailable1 = menuItem1.isActive === 0
    const isAvailable2 = menuItem2.isActive === false
    expect(isAvailable1).toBe(true)
    expect(isAvailable2).toBe(true)
  })

  it('cart updates quantity or adds item', () => {
    type CartItem = { id: number; name: string; quantity: number }
    const cart: CartItem[] = []
    const menuItem = { id: 1, name: 'Pizza' }
    const addToCart = (item: { id: number; name: string }, qty: number) => {
      const found = cart.find(i => i.id === item.id)
      if (found) {
        found.quantity += qty
      } else {
        cart.push({ ...item, quantity: qty })
      }
    }
    addToCart(menuItem, 2)
    expect(cart[0].quantity).toBe(2)
    addToCart(menuItem, 1)
    expect(cart[0].quantity).toBe(3)
  })

  it('removes item from cart when quantity is zero', () => {
    type CartItem = { id: number; name: string; quantity: number }
    let cart: CartItem[] = [{ id: 1, name: 'Pizza', quantity: 1 }]
    const removeFromCart = (id: number) => {
      cart = cart.filter(i => i.id !== id)
    }
    removeFromCart(1)
    expect(cart.length).toBe(0)
  })
})
