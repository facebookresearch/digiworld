// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotIn, SnapshotOut, types, flow } from 'mobx-state-tree'
import { withSetPropAction } from './helpers/withSetPropAction'
import { storage } from '../utils/storage'
import { authService } from '@/services/api/auth'
import { addressService } from '@/services/api/address'
import { paymentService } from '@/services/api/payment'
import {
  addToWishlist,
  removeFromWishlist,
  getWishlistIds,
} from '@/services/api/wishlist'

const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  USER_DATA: '@user_data',
}

const UserModel = types
  .model('User', {
    id: types.number,
    firstName: types.string,
    lastName: types.string,
    email: types.string,
    password: types.optional(types.string, ''),
    phoneNumber: types.maybeNull(types.string),
    profilePicture: types.maybeNull(types.string),
    cartId: types.maybeNull(types.number),
    dateJoined: types.Date,
    wishlistIds: types.maybeNull(types.array(types.number)),
  })
  .views(self => ({
    toJSON() {
      const { ...rest } = self
      return rest
    },
  }))

export const Address = types.model('Address', {
  id: types.number,
  userId: types.number,
  fullName: types.string,
  street: types.string,
  city: types.string,
  state: types.string,
  pincode: types.string,
  phone: types.maybeNull(types.string),
  country: types.maybeNull(types.string),
  isDefault: types.boolean,
  createdAt: types.string,
  updatedAt: types.string,
  deliveryInstructions: types.maybeNull(types.string),
})

export const PaymentMethod = types.model('PaymentMethod', {
  id: types.number,
  userId: types.number,
  type: types.string,
  cardType: types.maybeNull(types.string),
  nameOnCard: types.maybeNull(types.string),
  cardNumber: types.maybeNull(types.string),
  expiryMonth: types.maybeNull(types.string),
  expiryYear: types.maybeNull(types.string),
  billingAddressId: types.maybeNull(types.number),
  isDefault: types.boolean,
  createdAt: types.Date,
  updatedAt: types.Date,
})

export interface AddressType {
  id: number
  userId: number
  fullName: string
  street: string
  city: string
  state: string
  pincode: string
  phone: string
  isDefault: boolean
}

export interface PaymentMethodType {
  id: number
  userId: number
  type: string
  cardType?: string
  nameOnCard?: string
  cardNumber?: string
  expiryMonth?: string
  expiryYear?: string
  billingAddressId?: number
  isDefault: boolean
  createdAt: any
  updatedAt: any
}

export const UserStore = types
  .model('UserStore')
  .props({
    currentUser: types.maybeNull(UserModel),
    authToken: types.maybeNull(types.string),
    addresses: types.array(Address),
    paymentMethods: types.array(PaymentMethod),
  })
  .actions(withSetPropAction)
  .actions(self => {
    const store = self as any

    const loadAddressesFromDb = flow(function* () {
      if (!store.currentUser) return
      const addresses = yield addressService.getUserAddresses(
        store.currentUser.id,
      )
      store.addresses.replace(addresses)
    })

    const loadPaymentMethodsFromDb = flow(function* () {
      if (!store.currentUser) return
      const methods = yield paymentService.getUserPaymentMethods(
        store.currentUser.id,
      )
      store.paymentMethods.replace(
        methods.map((method: any) => ({
          ...method,
          isDefault: Boolean(method.isDefault),
          createdAt: method.createdAt ? new Date(method.createdAt) : new Date(),
          updatedAt: method.updatedAt ? new Date(method.updatedAt) : new Date(),
        })),
      )
    })

    // In setUser
    const setUser = flow(function* (user: any) {
      if (!user) {
        store.currentUser = null
        storage.delete(STORAGE_KEYS.USER_DATA)
        return
      }
      console.log('typeof user', typeof user)
      if (typeof user === 'string' || typeof user === 'number') {
        if (!self.currentUser) {
          const userData = storage.getString(STORAGE_KEYS.USER_DATA)
          if (userData) {
            user = JSON.parse(userData)
          }
          const wishlistIds = yield loadWishlistFromDb(user.id)
          const userWithWishlist = {
            ...user,
            wishlistIds,
            dateJoined: new Date(user.dateJoined),
          }
          store.currentUser = userWithWishlist
        }
      } else {
        const wishlistIds = yield loadWishlistFromDb(user.id)
        const userWithWishlist = {
          ...user,
          wishlistIds,
          dateJoined: new Date(user.dateJoined),
        }

        store.currentUser = userWithWishlist
        storage.set(STORAGE_KEYS.USER_DATA, JSON.stringify(userWithWishlist))
      }
    })

    // Load Wishlist on User Login
    const loadWishlistFromDb = flow(function* (userId: number) {
      const wishlistIds = yield getWishlistIds(userId)
      return wishlistIds
    })

    // Sync wishlist from database and update currentUser
    const syncWishlistFromDb = flow(function* (userId: number) {
      if (!store.currentUser) return
      const wishlistIds = yield getWishlistIds(userId)
      if (store.currentUser.wishlistIds) {
        store.currentUser.wishlistIds.replace(wishlistIds || [])
      } else {
        // If wishlistIds doesn't exist, recreate user with wishlistIds
        const currentUser = store.currentUser
        store.currentUser = {
          ...currentUser,
          wishlistIds: wishlistIds || [],
        } as any
      }
      // Sync with local storage
      storage.set(STORAGE_KEYS.USER_DATA, JSON.stringify(store.currentUser))
    })

    // Handle Wishlist Add/Remove
    const handleWishlisting = flow(function* (productId: number) {
      if (self.currentUser) {
        const userId = self.currentUser.id
        const wishlistIds = self.currentUser.wishlistIds || []
        // @ts-ignore
        const isWishlistedItem = wishlistIds.includes(productId)

        if (isWishlistedItem) {
          yield removeFromWishlist(userId, productId)
          // @ts-ignore
          self.currentUser.wishlistIds.replace(
            wishlistIds.filter((id: number) => id !== productId),
          )
        } else {
          yield addToWishlist(userId, productId)
          // @ts-ignore
          self.currentUser.wishlistIds.push(productId)
        }

        // ✅ Sync with local storage to persist changes
        storage.set(STORAGE_KEYS.USER_DATA, JSON.stringify(self.currentUser))
      }
    })

    const setAuthToken = (token: string | null) => {
      store.authToken = token
      if (token) {
        storage.set(STORAGE_KEYS.AUTH_TOKEN, token)
      } else {
        storage.delete(STORAGE_KEYS.AUTH_TOKEN)
      }
    }

    const setDefaultAddressLocally = flow(function* (addressId: number) {
      try {
        // First update locally
        const updatedAddresses = store.addresses.map(
          (address: Instance<typeof Address>) => ({
            ...address,
            isDefault: address.id === addressId,
            updatedAt: new Date().toISOString(),
          }),
        )

        store.addresses.replace(updatedAddresses)

        // Then update in the database
        if (store.currentUser) {
          const updatedAddressesFromDb = yield addressService.setDefaultAddress(
            addressId,
            store.currentUser.id,
          )
          // Update with fresh data from DB
          store.addresses.replace(updatedAddressesFromDb)
        }
      } catch (error) {
        console.error('Failed to set default address:', error)
        yield loadAddressesFromDb() // Reload on error
        throw error
      }
    })

    const setDefaultPaymentMethodLocally = (methodId: number) => {
      store.paymentMethods.replace(
        store.paymentMethods.map((method: PaymentMethodType) => ({
          ...method,
          isDefault: method.id === methodId,
          updatedAt: new Date(),
        })),
      )
    }

    return {
      setUser,
      setAuthToken,
      setDefaultAddressLocally,
      setDefaultPaymentMethodLocally,
      loadAddressesFromDb,
      loadPaymentMethodsFromDb,
      loadWishlistFromDb,
      syncWishlistFromDb,
      handleWishlisting,

      login: flow(function* (email: string, password: string) {
        try {
          const user = yield authService.loginUser(email, password)
          if (user) {
            // First set auth token so subsequent requests work
            setAuthToken('dummy-token')

            // Load all user-related data in parallel
            const [addresses, paymentMethods, wishlistIds] = yield Promise.all([
              addressService.getUserAddresses(user.id),
              paymentService.getUserPaymentMethods(user.id),
              getWishlistIds(user.id),
            ])

            // Prepare user data with all required fields
            const userWithData = {
              ...user,
              dateJoined: new Date(user.dateJoined),
              wishlistIds: wishlistIds || [],
            }

            // Update stores with loaded data
            store.addresses.replace(addresses || [])
            store.paymentMethods.replace(
              (paymentMethods || []).map((method: any) => ({
                ...method,
                isDefault: Boolean(method.isDefault),
                createdAt: new Date(method.createdAt),
                updatedAt: new Date(method.updatedAt),
              })),
            )

            // Finally set the user with complete data
            yield setUser(userWithData)

            return true
          }
          return false
        } catch (error) {
          console.error('Login failed:', error)
          setUser(null)
          setAuthToken(null)
          throw error
        }
      }),

      hydrate: flow(function* () {
        try {
          const storedToken = storage.getString(STORAGE_KEYS.AUTH_TOKEN)
          const storedUser = storage.getString(STORAGE_KEYS.USER_DATA)

          if (storedToken && storedUser) {
            const userData = JSON.parse(storedUser)
            const userWithDates = {
              ...userData,
              dateJoined: new Date(userData.dateJoined),
            }
            setAuthToken(storedToken)
            setUser(userWithDates)
            yield loadAddressesFromDb()
            yield loadPaymentMethodsFromDb()
            return true
          }
          return false
        } catch (error) {
          console.error('Hydration failed:', error)
          setUser(null)
          setAuthToken(null)
          return false
        }
      }),

      // Address management actions
      addAddress: flow(function* (
        address: Omit<AddressType, 'id' | 'userId' | 'isDefault'>,
      ) {
        if (!store.currentUser) return
        try {
          const newAddress = yield addressService.createAddress(
            store.currentUser.id,
            address,
          )
          yield loadAddressesFromDb()
          return newAddress
        } catch (error) {
          console.error('Failed to add address:', error)
          throw error
        }
      }),

      updateAddress: flow(function* (
        addressId: number,
        address: Omit<AddressType, 'id' | 'userId' | 'isDefault'>,
      ) {
        if (!store.currentUser) return
        try {
          yield addressService.updateAddress(
            addressId,
            store.currentUser.id,
            address,
          )
          yield loadAddressesFromDb()
        } catch (error) {
          console.error('Failed to update address:', error)
          throw error
        }
      }),

      async checkAddressHasPendingOrders(addressId: number) {
        return addressService.checkAddressHasPendingOrders(addressId)
      },

      async createAddressSnapshotsForCompletedOrders(addressId: number) {
        return addressService.createAddressSnapshotsForCompletedOrders(
          addressId,
        )
      },

      deleteAddress: flow(function* (addressId: number) {
        if (!store.currentUser) return

        try {
          yield addressService.deleteAddress(addressId, store.currentUser.id)
          // Update local state after successful deletion using MST action
          store.addresses.replace(
            store.addresses.filter((addr: any) => addr.id !== addressId),
          )
        } catch (error) {
          console.error('Failed to delete address:', error)
          throw error
        }
      }),

      setDefaultAddress: flow(function* (addressId: number) {
        if (!store.currentUser) return
        try {
          yield setDefaultAddressLocally(addressId)
        } catch (error) {
          yield loadAddressesFromDb()
          throw error
        }
      }),

      // Payment method management actions
      addPaymentMethod: flow(function* (
        method: Omit<PaymentMethodType, 'id' | 'userId' | 'isDefault'>,
      ) {
        if (!store.currentUser) return
        try {
          yield paymentService.createPaymentMethod(store.currentUser.id, method)
          yield loadPaymentMethodsFromDb()
        } catch (error) {
          console.error('Failed to add payment method:', error)
          throw error
        }
      }),

      updatePaymentMethod: flow(function* (
        methodId: number,
        method: Omit<PaymentMethodType, 'id' | 'userId' | 'isDefault'>,
      ) {
        if (!store.currentUser) return
        try {
          yield paymentService.updatePaymentMethod(
            methodId,
            store.currentUser.id,
            method,
          )
          yield loadPaymentMethodsFromDb()
        } catch (error) {
          console.error('Failed to update payment method:', error)
          throw error
        }
      }),

      deletePaymentMethod: flow(function* (methodId: number) {
        if (!store.currentUser) return
        try {
          yield paymentService.deletePaymentMethod(
            methodId,
            store.currentUser.id,
          )
          yield loadPaymentMethodsFromDb()
        } catch (error) {
          console.error('Failed to delete payment method:', error)
          throw error
        }
      }),

      setDefaultPaymentMethod: flow(function* (methodId: number) {
        if (!store.currentUser) return
        try {
          setDefaultPaymentMethodLocally(methodId)
          yield paymentService.setDefaultPaymentMethod(
            methodId,
            store.currentUser.id,
          )
        } catch (error) {
          yield loadPaymentMethodsFromDb()
          throw error
        }
      }),

      logout() {
        store.currentUser = null
        store.authToken = null
        store.addresses.clear()
        store.paymentMethods.clear()
        storage.delete(STORAGE_KEYS.AUTH_TOKEN)
        storage.delete(STORAGE_KEYS.USER_DATA)
      },

      restore(data: any) {
        const restoredUserId = data.currentUser?.id ?? self.currentUser?.id ?? 0
        if (data.currentUser) {
          // Ensure we have all required fields before setting user
          const userData = {
            id: data.currentUser.id,
            firstName: data.currentUser.firstName,
            lastName: data.currentUser.lastName,
            email: data.currentUser.email,
            password: data.currentUser.password || '',
            phoneNumber: data.currentUser.phoneNumber || null,
            profilePicture: data.currentUser.profilePicture || null,
            cartId: data.currentUser.cartId || null,
            // Ensure dateJoined is a Date object
            dateJoined: data.currentUser.dateJoined
              ? new Date(data.currentUser.dateJoined)
              : new Date(),
            wishlistIds: data.currentUser.wishlistIds || [],
          }
          // Only set user if we have all required fields
          if (
            userData.id &&
            userData.firstName &&
            userData.lastName &&
            userData.email
          ) {
            this.setUser(userData)
          } else {
            console.warn(
              'Incomplete user data during restore, setting currentUser to null',
            )
            this.setUser(null)
          }
        }
        if (data.authToken) this.setAuthToken(data.authToken)
        if (data.addresses) {
          self.addresses.replace(
            data.addresses.map((address: any) => ({
              id: Number(address.id),
              userId: Number(address.userId ?? restoredUserId),
              fullName: address.fullName || '',
              street: address.street || '',
              city: address.city || '',
              state: address.state || '',
              pincode: address.pincode || '',
              phone: address.phone ?? null,
              country: address.country ?? null,
              isDefault: Boolean(address.isDefault),
              createdAt: address.createdAt || new Date().toISOString(),
              updatedAt: address.updatedAt || new Date().toISOString(),
              deliveryInstructions: address.deliveryInstructions ?? null,
            })),
          )
        }
        if (data.paymentMethods) {
          self.paymentMethods.replace(
            data.paymentMethods.map((method: any) => ({
              ...method,
              userId: Number(method.userId ?? restoredUserId),
              billingAddressId: method.billingAddressId ?? null,
              isDefault: Boolean(method.isDefault),
              createdAt: method.createdAt
                ? new Date(method.createdAt)
                : new Date(),
              updatedAt: method.updatedAt
                ? new Date(method.updatedAt)
                : new Date(),
            })),
          )
        }
      },
    }
  })
  .views(store => ({
    get isAuthenticated() {
      return !!store.currentUser && !!store.authToken
    },
    get defaultAddress() {
      return store.addresses.find(address => address.isDefault)
    },
    get defaultPaymentMethod() {
      return store.paymentMethods.find(method => method.isDefault)
    },
    getAddressById(id: number) {
      return store.addresses.find(address => address.id === id)
    },
    getPaymentMethodById(id: number) {
      return store.paymentMethods.find(method => method.id === id)
    },
    get user() {
      return store.currentUser
    },
  }))

export interface UserStoreModel extends Instance<typeof UserStore> {}
export interface UserStoreSnapshotOut extends SnapshotOut<typeof UserStore> {}
export interface UserStoreSnapshotIn extends SnapshotIn<typeof UserStore> {}
