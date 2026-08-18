// Copyright (c) Meta Platforms, Inc. and affiliates.
import { sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// Users table: stores user account information
export const usersTable = sqliteTable('users', {
  id: integer('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phoneNumber: text('phone_number').notNull().unique(),
  createdAt: text('created_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
  updatedAt: text('updated_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
  settings: text('settings').notNull(), // JSON string
  status: text('status').notNull(), // e.g., 'active', 'inactive'
})

// User addresses: stores multiple addresses per user
export const userAddressesTable = sqliteTable('user_addresses', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull(), // FK to users.id
  label: text('label').notNull(), // e.g., 'Home', 'Office'
  addressLine1: text('address_line_1').notNull(),
  addressLine2: text('address_line_2'),
  city: text('city').notNull(),
  state: text('state').notNull(),
  postalCode: text('postal_code').notNull(),
  country: text('country').notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  isDefault: integer('is_default').notNull(), // boolean (0/1)
  createdAt: text('created_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
  updatedAt: text('updated_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
})

// Restaurants table: stores restaurant info
export const restaurantsTable = sqliteTable('restaurants', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  address: text('address').notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  logo: text('logo'),
  rating: real('rating'),
  deliveryFee: real('delivery_fee'),
  minOrder: real('min_order'),
  deliveryRadius: integer('delivery_radius'),
  createdAt: text('created_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
})

// Categories: menu categories per restaurant
export const categoriesTable = sqliteTable('categories', {
  id: integer('id').primaryKey(),
  restaurantId: integer('restaurant_id').notNull(), // FK to restaurants.id
  name: text('name').notNull(),
  position: integer('position'), // Controls display order of menu categories in restaurant menu
})

// Menu items: food/drink items
export const menuItemsTable = sqliteTable('menu_items', {
  id: integer('id').primaryKey(),
  restaurantId: integer('restaurant_id').notNull(), // FK to restaurants.id
  categoryId: integer('category_id').notNull(), // FK to categories.id
  name: text('name').notNull(),
  description: text('description'),
  price: real('price').notNull(),
  image: text('image'),
  calories: integer('calories'),
  isPopular: integer('is_popular'), // boolean (0/1)
  isActive: integer('is_active'), // boolean (0/1)
  position: integer('position'),
})

// Orders: stores order info
export const ordersTable = sqliteTable('orders', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull(), // FK to users.id
  restaurantId: integer('restaurant_id').notNull(), // FK to restaurants.id
  addressId: integer('address_id').notNull(), // FK to user_addresses.id
  status: text('status').notNull(), // e.g., 'pending', 'delivered'
  total: real('total').notNull(),
  deliveryAddress: text('delivery_address').notNull(),
  paymentMethod: text('payment_method').notNull(),
  specialInstructions: text('special_instructions'), // overall order instructions
  cutlery: integer('cutlery'), // boolean (0/1), whether user wants cutlery
  createdAt: text('created_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
  updatedAt: text('updated_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
})

// Order items: items in each order
export const orderItemsTable = sqliteTable('order_items', {
  id: integer('id').primaryKey(),
  orderId: integer('order_id').notNull(), // FK to orders.id
  menuItemId: integer('menu_item_id').notNull(), // FK to menu_items.id
  quantity: integer('quantity').notNull(),
  price: real('price').notNull(),
  specialInstructions: text('special_instructions'),
})

// Drivers: delivery drivers assigned to orders
export const driversTable = sqliteTable('drivers', {
  id: integer('id').primaryKey(),
  orderId: integer('order_id').notNull(), // FK to orders.id
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  vehicle: text('vehicle'),
  assignedAt: text('assigned_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
})

// Feedback: ratings and comments for orders
export const feedbackTable = sqliteTable('feedback', {
  id: integer('id').primaryKey(),
  orderId: integer('order_id').notNull(), // FK to orders.id
  foodRating: integer('food_rating').notNull(), // 1-5
  deliveryRating: integer('delivery_rating').notNull(), // 1-5
  comment: text('comment'),
  createdAt: text('created_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
})
