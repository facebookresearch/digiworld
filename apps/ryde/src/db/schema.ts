import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phoneNumber: text('phone_number').notNull().unique(),
  createdAt: text('created_at')
    .notNull()
    .default("(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))"),
  settings: text('settings').notNull(),
  status: text('status').notNull(),
})

export const userAddresses = sqliteTable('user_addresses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  address: text('address').notNull(),
  isDefault: integer('is_default').notNull(), // 0 or 1
  createdAt: text('created_at')
    .notNull()
    .default("(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))"),
})

export const rideOptions = sqliteTable('ride_options', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  base_fare: real('base_fare').notNull(),
  rate_per_km: real('rate_per_km').notNull(),
  icon: text('icon'),
})

export const drivers = sqliteTable('drivers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  vehicleName: text('vehicle_name').notNull(),
  vehicleNumber: text('vehicle_number').notNull(),
  vehicleType: text('vehicle_type').notNull(),
  rideOptionId: integer('ride_option_id')
    .notNull()
    .references(() => rideOptions.id, { onDelete: 'cascade' }),
  rating: real('rating'),
  profilePicture: text('profile_picture'),
})

export const rides = sqliteTable('rides', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  driverId: integer('driver_id').references(() => drivers.id),
  pickupLocation: text('pickup_location').notNull(),
  dropLocation: text('drop_location').notNull(),
  status: text('status').notNull(), // CHECK constraint not directly supported
  startTime: text('start_time'),
  endTime: text('end_time'),
  distanceKm: real('distance_km'),
  fareAmount: real('fare_amount'),
  feedbackSubmitted: integer('feedback_submitted').default(0),
  paymentMode: text('payment_mode'),
})

export const userPaymentMethods = sqliteTable('user_payment_methods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['digital_wallet', 'credit_card'] }).notNull(),
  provider: text('provider'),
  accountNumber: text('account_number'),
  isDefault: integer('is_default').notNull().default(0),
})

export const feedback = sqliteTable('feedback', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  rideId: integer('ride_id')
    .notNull()
    .references(() => rides.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  submittedAt: text('submitted_at')
    .notNull()
    .default("(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))"),
})
