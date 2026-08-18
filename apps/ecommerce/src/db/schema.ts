// Copyright (c) Meta Platforms, Inc. and affiliates.
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm/sql'
// Users and Addresses
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  phoneNumber: text('phone_number'),
  profilePicture: text('profile_picture'),
  dateJoined: integer('date_joined', { mode: 'timestamp' }).$defaultFn(
    () => new Date(),
  ),
  cartId: text('cart_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date(),
  ),
})

export const addresses = sqliteTable('addresses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  street: text('street').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pincode: text('pincode').notNull(),
  phone: text('phone'),
  country: text('country'),
  deliveryInstructions: text('delivery_instructions'),
  isDefault: integer('is_default', { mode: 'boolean' })
    .notNull()
    .default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const paymentMethods = sqliteTable('payment_methods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  cardType: text('card_type'),
  nameOnCard: text('name_on_card'),
  cardNumber: text('card_number'),
  expiryMonth: text('expiry_month'),
  expiryYear: text('expiry_year'),
  billingAddressId: integer('billing_address_id').references(
    () => addresses.id,
    {
      onDelete: 'set null',
    },
  ),
  isDefault: integer('is_default', { mode: 'boolean' })
    .notNull()
    .default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date(),
  ),
})

// Product Catalog
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date(),
  ),
})

export const subcategories = sqliteTable('subcategories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  parentCategoryId: integer('parent_category_id')
    .notNull()
    .references(() => categories.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date(),
  ),
})

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  shortDescription: text('short_description'),
  price: real('price').notNull(),
  discountedPrice: real('discounted_price'),
  discountPercent: integer('discount_percent'),
  rating: real('rating'),
  reviewCount: integer('review_count'),
  seller: text('seller'),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id),
  categoryName: text('category_name').notNull(),
  subcategoryId: integer('subcategory_id')
    .notNull()
    .references(() => subcategories.id),
  subcategoryName: text('subcategory_name').notNull(),
  inStock: integer('in_stock', { mode: 'boolean' }).notNull().default(true),
  stockCount: integer('stock_count').notNull().default(0),
  imageUrl: text('image_url'),
  specs: text('specs'), // JSON string
  tags: text('tags'), // JSON array string
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false),
  dateAdded: integer('date_added', { mode: 'timestamp' }).$defaultFn(
    () => new Date(),
  ),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date(),
  ),
})

export const productImages = sqliteTable('product_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date(),
  ),
})

export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  userName: text('user_name').notNull(),
  userAvatar: text('user_avatar'),
  parentReviewId: integer('parent_review_id'),
  rating: integer('rating'),
  title: text('title'),
  comment: text('comment').notNull(),
  hasImage: integer('has_image', { mode: 'boolean' }).notNull().default(false),
  imageUrl: text('image_url'),
  likesCount: integer('likes_count').notNull().default(0),
  likedBy: text('liked_by').notNull().default('[]'),
  replies: text('replies').notNull().default('[]'),
  replyCount: integer('reply_count').notNull().default(0),
  isVerifiedPurchase: integer('is_verified_purchase', { mode: 'boolean' })
    .notNull()
    .default(false),
  status: text('status').notNull().default('published'),
  reviewDate: text('review_date').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const wishlists = sqliteTable('wishlists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date(),
  ),
})

export const promoCodes = sqliteTable('promo_codes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  description: text('description').notNull(),
  discountType: text('discount_type').notNull(), // 'fixed' or 'percentage'
  discountValue: real('discount_value').notNull(),
  minPurchase: real('min_purchase').notNull(),
  maxDiscount: real('max_discount').notNull(),
  validFrom: text('valid_from').notNull(),
  validUntil: text('valid_until').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull(),
  usageLimit: integer('usage_limit').notNull(),
  usageCount: integer('usage_count').notNull(),
  isFirstOrderOnly: integer('is_first_order_only', {
    mode: 'boolean',
  }).notNull(),
  applicableCategories: text('applicable_categories'), // JSON string of category names
  termsAndConditions: text('terms_and_conditions'), // JSON string of terms
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
})

// Shopping Cart
export type Cart = {
  id: number
  userId: number
  createdAt: string
  updatedAt: string
}

export const carts = sqliteTable('carts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const cartItems = sqliteTable('cart_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cartId: integer('cart_id')
    .notNull()
    .references(() => carts.id),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
  productName: text('product_name').notNull(),
  productImage: text('product_image').notNull(),
  shortDescription: text('short_description').notNull(),
  seller: text('seller').notNull(),
  quantity: integer('quantity').notNull(),
  price: real('price').notNull(),
  discountedPrice: real('discounted_price').notNull(),
  total: real('total').notNull(),
  inStock: integer('in_stock', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

// Orders
export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  orderNumber: text('order_number').notNull(),
  status: text('status').notNull().default('pending'),
  totalAmount: real('total_amount').notNull(),
  subtotal: real('subtotal').notNull(),
  totalSavings: real('total_savings').default(0),
  shipping: real('shipping').default(0),
  tax: real('tax').default(0),
  couponDiscount: real('coupon_discount').default(0),
  couponCode: text('coupon_code'),
  shippingAddressId: integer('shipping_address_id').references(
    () => addresses.id,
    {
      onDelete: 'set null',
    },
  ),
  shippingAddressSnapshot: text('shipping_address_snapshot'),
  paymentMethod: text('payment_method').notNull(),
  paymentStatus: text('payment_status').notNull().default('pending'),
  orderDate: text('order_date')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  shippedDate: text('shipped_date'),
  deliveryDate: text('delivery_date'),
  estimatedDeliveryDate: text('estimated_delivery_date'),
  trackingNumber: text('tracking_number'),
  courierPartner: text('courier_partner'),
  invoiceUrl: text('invoice_url'),
  isGift: integer('is_gift', { mode: 'boolean' }).default(false),
  giftMessage: text('gift_message'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const orderItems = sqliteTable('order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
  productName: text('product_name').notNull(),
  productImage: text('product_image').notNull(),
  shortDescription: text('short_description'),
  sku: text('sku'),
  seller: text('seller'),
  quantity: integer('quantity').notNull().default(1),
  price: real('price').notNull(),
  discountedPrice: real('discounted_price').notNull(),
  total: real('total').notNull(),
  savedAmount: real('saved_amount').default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export function serializeSettings(settings: any): string {
  return JSON.stringify(settings)
}

export function deserializeSettings<T>(settings: string): T {
  return JSON.parse(settings) as T
}
