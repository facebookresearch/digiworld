import { db } from '@/db/index' // Import your database instance
import { addresses, orders } from '@/db/schema' // Import your address schema
import { and, eq, sql } from 'drizzle-orm'

interface AddressInput {
  fullName: string
  street: string
  city: string
  state: string
  pincode: string
  phone?: string
  isDefault?: boolean
  country?: string
  deliveryInstructions?: string
}

export const addressService = {
  async getUserAddresses(userId: number) {
    const add = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, userId))

    return add.map((addr: any) => ({
      ...addr,
      isDefault: Boolean(addr.isDefault),
    }))
  },

  async getAddress(addressId: number, userId: number) {
    const results = await db
      .select()
      .from(addresses)
      .where(eq(addresses.id, addressId))
      .and(eq(addresses.userId, userId))
    return results[0] || null
  },

  async createAddress(userId: number, address: AddressInput) {
    const result = await db
      .insert(addresses)
      .values({
        userId,
        fullName: address.fullName,
        street: address.street,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        phone: address.phone || null,
        country: address.country || null,
        isDefault: address.isDefault ? 1 : 0,
        deliveryInstructions: address.deliveryInstructions || null,
      })
      .returning()
    return result[0]
  },

  async updateAddress(
    addressId: number,
    userId: number,
    address: Partial<AddressInput>,
  ) {
    console.log('[UserStore]: Updating address', address)
    const result = await db
      .update(addresses)
      .set({
        ...address,
        isDefault: address.isDefault ? 1 : 0,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId))) // Corrected usage
      .returning()

    return result[0]
  },

  async checkAddressHasPendingOrders(addressId: number) {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.shippingAddressId, addressId),
          eq(orders.status, 'pending'),
        ),
      )
      .get()

    return result.count > 0
  },

  async createAddressSnapshotsForCompletedOrders(addressId: number) {
    // First get the address details
    const address = await db
      .select()
      .from(addresses)
      .where(eq(addresses.id, addressId))
      .get()

    if (!address) throw new Error('Address not found')

    // Create a snapshot of the address
    const addressSnapshot = JSON.stringify({
      fullName: address.fullName,
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      phone: address.phone,
      deletedAt: new Date().toISOString(),
    })

    // Update completed orders with this address
    await db
      .update(orders)
      .set({
        shippingAddressSnapshot: addressSnapshot,
        shippingAddressId: null,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(orders.shippingAddressId, addressId),
          sql`${orders.status} != 'pending'`,
        ),
      )
  },

  async deleteAddress(addressId: number, userId: number) {
    // First check for pending orders
    const hasPending = await this.checkAddressHasPendingOrders(addressId)
    if (hasPending) {
      throw new Error('Cannot delete address with pending orders')
    }

    // Create snapshots for completed orders
    await this.createAddressSnapshotsForCompletedOrders(addressId)

    // Now safe to delete the address
    await db
      .delete(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
  },

  async setDefaultAddress(addressId: number, userId: number) {
    try {
      // First unset all defaults
      await db
        .update(addresses)
        .set({
          isDefault: 0,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(addresses.userId, userId))

      // Then set the new default
      await db
        .update(addresses)
        .set({
          isDefault: 1,
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))

      // Return fresh data as plain objects
      const results = await db
        .select()
        .from(addresses)
        .where(eq(addresses.userId, userId))

      return results.map((addr: any) => ({
        ...addr,
        isDefault: Boolean(addr.isDefault),
        createdAt: addr.createdAt.toString(),
        updatedAt: addr.updatedAt.toString(),
      }))
    } catch (error) {
      console.error('Error in setDefaultAddress:', error)
      throw error
    }
  },
}
