// Copyright (c) Meta Platforms, Inc. and affiliates.
export interface User {
  id: number
  email: string
  password: string
  firstName: string
  lastName: string
  phoneNumber: string
  createdAt: string
  updatedAt: string
  settings: string // JSON string
  status: string // e.g., 'active', 'inactive'
}

export interface UserAddress {
  id: number
  userId: number
  label: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string
  latitude?: number
  longitude?: number
  isDefault: number // 0 or 1
  createdAt: string
  updatedAt: string
}

export interface Restaurant {
  id: number
  name: string
  description?: string
  address: string
  latitude?: number
  longitude?: number
  logo?: string
  rating?: number
  deliveryFee?: number
  minOrder?: number
  deliveryRadius?: number
  createdAt: string
}

export interface Category {
  id: number
  restaurantId: number
  name: string
  position?: number
}

export interface MenuItem {
  id: number
  restaurantId: number
  categoryId: number
  name: string
  description?: string
  price: number
  image?: string
  calories?: number
  isPopular?: number // 0 or 1
  isActive?: number // 0 or 1
  position?: number
}

export interface Order {
  id: number
  userId: number
  restaurantId: number
  addressId: number
  status: string
  total: number
  deliveryAddress: string
  paymentMethod: string
  specialInstructions?: string
  cutlery?: number // 0 or 1
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: number
  orderId: number
  menuItemId: number
  quantity: number
  price: number
  specialInstructions?: string
}

export interface Driver {
  id: number
  orderId: number
  name: string
  phone: string
  vehicle?: string
  assignedAt: string
}

export interface Feedback {
  id: number
  orderId: number
  foodRating: number
  deliveryRating: number
  comment?: string
  createdAt: string
}
