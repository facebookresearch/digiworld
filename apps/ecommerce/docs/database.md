# Ecommerce Database Documentation

## Overview

This document outlines the SQLite and Drizzle ORM implementation in our offline-first e-commerce application. The database is designed to support a full-featured e-commerce platform with user management, product catalog, shopping cart, order processing, and promotional features.

## Database Architecture

### Core Principles

1. **Offline-First Design**
   - All data is stored locally using SQLite
   - Supports offline operations with sync capabilities
   - Maintains data consistency across offline/online states

2. **Data Relationships**
   - Users → Orders → Order Items
   - Users → Carts → Cart Items
   - Products → Categories/Subcategories
   - Products → Reviews → Users

3. **Data Integrity**
   - Foreign key constraints ensure referential integrity
   - Cascading deletes prevent orphaned records
   - Default values ensure data consistency

### Configuration

```typescript
// Database instance setup
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

const sqlite = SQLite.openDatabaseSync('andojoecommerce.db');
export const db = drizzle(sqlite);
```

## Schema Design

### User Management

#### Users Table

Stores user information and authentication details.

```typescript
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
});
```

Field descriptions:

| Field          | Type      | Description                               | Usage/Notes |
| -------------- | --------- | ----------------------------------------- | ----------- |
| id             | integer   | Primary key, auto-incrementing identifier | Used as foreign key in related tables |
| firstName      | text      | User's first name                         | Required for order processing |
| lastName       | text      | User's last name                          | Required for order processing |
| email          | text      | User's email (unique)                     | Used for authentication and notifications |
| password       | text      | Hashed password                           | Stored using secure hashing |
| phoneNumber    | text      | Contact number                            | Optional, used for order updates |
| profilePicture | text      | URL to profile picture                    | Optional, supports local/remote URLs |
| dateJoined     | timestamp | Account creation date                     | Used for user analytics |
| cartId         | text      | Active cart reference                     | Links to current shopping cart |
| createdAt      | timestamp | Record creation date                      | Audit trail |
| updatedAt      | timestamp | Last update timestamp                     | Audit trail |

**Relationships:**
- One-to-Many with Orders
- One-to-Many with Addresses
- One-to-Many with Reviews
- One-to-One with active Cart

**Query Examples:**

```typescript
// Get user profile
const getUserProfile = async (userId: number) => {
  return await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();
};

// Update user profile
const updateProfile = async (userId: number, data: Partial<User>) => {
  return await db
    .update(users)
    .set(data)
    .where(eq(users.id, userId))
    .run();
};
```

#### Addresses Table

Manages user delivery and billing addresses.

```typescript
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
});
```

Field descriptions:

| Field                | Type      | Description                               | Usage/Notes |
| ------------------- | --------- | ----------------------------------------- | ----------- |
| id                  | integer   | Primary key, auto-incrementing identifier | Referenced in orders |
| userId              | integer   | Reference to users table                  | Cascades on user deletion |
| fullName            | text      | Recipient's full name                     | May differ from user name |
| street              | text      | Street address                            | Primary address line |
| city                | text      | City name                                 | Used for shipping zones |
| state               | text      | State/province                            | Used for tax calculations |
| pincode             | text      | ZIP/postal code                           | Used for delivery routing |
| phone               | text      | Contact number                            | For delivery updates |
| country             | text      | Country name                              | For international shipping |
| deliveryInstructions| text      | Special delivery instructions             | Optional delivery notes |
| isDefault           | boolean   | Whether this is the default address       | One default per user |
| createdAt           | timestamp | Record creation date                      | Audit trail |
| updatedAt           | timestamp | Last update timestamp                     | Audit trail |

**Query Examples:**

```typescript
// Get user's addresses
const getUserAddresses = async (userId: number) => {
  return await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault))
    .all();
};

// Set default address
const setDefaultAddress = async (userId: number, addressId: number) => {
  return await db.transaction(async (tx) => {
    // Clear previous default
    await tx
      .update(addresses)
      .set({ isDefault: false })
      .where(eq(addresses.userId, userId));
    
    // Set new default
    await tx
      .update(addresses)
      .set({ isDefault: true })
      .where(eq(addresses.id, addressId));
  });
};
```

### Product Catalog

#### Categories Table

Top-level product classification.

```typescript
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
});
```

Field descriptions:

| Field     | Type      | Description                               | Usage/Notes |
| --------- | --------- | ----------------------------------------- | ----------- |
| id        | integer   | Primary key                               | Referenced by products |
| name      | text      | Category name                             | Used in navigation |
| icon      | text      | Icon identifier/URL                       | UI display |
| createdAt | timestamp | Creation timestamp                        | Audit trail |
| updatedAt | timestamp | Last update                              | Audit trail |

**Query Examples:**

```typescript
// Get all categories with product counts
const getCategoriesWithCounts = async () => {
  return await db
    .select({
      category: categories,
      productCount: sql<number>`count(${products.id})`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .all();
};
```

#### Subcategories Table

Detailed product classification under main categories.

```typescript
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
});
```

Field descriptions:

| Field            | Type      | Description                          | Usage/Notes |
| --------------- | --------- | ------------------------------------ | ----------- |
| id              | integer   | Primary key                          | Referenced by products |
| name            | text      | Subcategory name                     | Used in filtering |
| parentCategoryId| integer   | Reference to parent category         | Category hierarchy |
| createdAt       | timestamp | Creation timestamp                   | Audit trail |
| updatedAt       | timestamp | Last update                         | Audit trail |

**Query Examples:**

```typescript
// Get subcategories for a category
const getCategorySubcategories = async (categoryId: number) => {
  return await db
    .select()
    .from(subcategories)
    .where(eq(subcategories.parentCategoryId, categoryId))
    .all();
};

// Get category with all subcategories
const getCategoryWithSubcategories = async (categoryId: number) => {
  return await db
    .select({
      category: categories,
      subcategories: sql<SubCategory[]>`json_group_array(json_object(
        'id', ${subcategories.id},
        'name', ${subcategories.name}
      ))`,
    })
    .from(categories)
    .leftJoin(subcategories, eq(subcategories.parentCategoryId, categories.id))
    .where(eq(categories.id, categoryId))
    .groupBy(categories.id)
    .get();
};
```

#### Products Table

Central product information storage.

```typescript
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
});
```

Field descriptions:

| Field            | Type      | Description                          | Usage/Notes |
| --------------- | --------- | ------------------------------------ | ----------- |
| id              | integer   | Primary key                          | Referenced across system |
| name            | text      | Product name                         | Display and search |
| description     | text      | Full product description             | Rich text supported |
| shortDescription| text      | Brief product summary                | List views |
| price           | real      | Original price                       | Base price |
| discountedPrice | real      | Current selling price                | After discounts |
| discountPercent | integer   | Discount percentage                  | For display |
| rating          | real      | Average rating                       | Calculated from reviews |
| reviewCount     | integer   | Number of reviews                    | For display |
| seller          | text      | Seller information                   | For marketplace setup |
| categoryId      | integer   | Main category reference              | Category navigation |
| categoryName    | text      | Denormalized category name           | Quick access |
| subcategoryId   | integer   | Subcategory reference                | Detailed classification |
| subcategoryName | text      | Denormalized subcategory name        | Quick access |
| inStock         | boolean   | Current availability                 | Inventory status |
| stockCount      | integer   | Available quantity                   | Inventory management |
| imageUrl        | text      | Primary product image                | Main display |
| specs           | text      | Technical specifications (JSON)      | Structured data |
| tags            | text      | Search and filter tags (JSON)        | Enhanced search |
| isFeatured      | boolean   | Featured product flag                | Homepage display |
| dateAdded       | timestamp | When product was added               | Product age |
| createdAt       | timestamp | Record creation date                 | Audit trail |
| updatedAt       | timestamp | Last update timestamp                | Audit trail |

**Query Examples:**

```typescript
// Get featured products
const getFeaturedProducts = async () => {
  return await db
    .select()
    .from(products)
    .where(and(
      eq(products.isFeatured, true),
      eq(products.inStock, true)
    ))
    .orderBy(desc(products.rating))
    .limit(10)
    .all();
};

// Search products
const searchProducts = async (query: string) => {
  return await db
    .select()
    .from(products)
    .where(
      or(
        like(products.name, `%${query}%`),
        like(products.description, `%${query}%`),
        like(products.tags, `%${query}%`)
      )
    )
    .all();
};

// Get products by category with filters
const getProductsByCategory = async (
  categoryId: number,
  filters: {
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  }
) => {
  let query = db
    .select()
    .from(products)
    .where(eq(products.categoryId, categoryId));

  if (filters.minPrice !== undefined) {
    query = query.where(gte(products.price, filters.minPrice));
  }
  if (filters.maxPrice !== undefined) {
    query = query.where(lte(products.price, filters.maxPrice));
  }
  if (filters.inStock !== undefined) {
    query = query.where(eq(products.inStock, filters.inStock));
  }

  return await query.all();
};
```

#### Product Images Table

Manages multiple images per product.

```typescript
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
});
```

Field descriptions:

| Field     | Type      | Description                          | Usage/Notes |
| --------- | --------- | ------------------------------------ | ----------- |
| id        | integer   | Primary key                          | Internal reference |
| productId | integer   | Reference to product                 | Cascades on delete |
| url       | text      | Image URL/path                       | Supports local/remote |
| position  | integer   | Display order                        | Gallery ordering |
| createdAt | timestamp | Creation timestamp                   | Audit trail |
| updatedAt | timestamp | Last update                         | Audit trail |

**Query Examples:**

```typescript
// Get product images in order
const getProductImages = async (productId: number) => {
  return await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.position))
    .all();
};
```

#### Reviews Table

Manages product reviews and ratings.

```typescript
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
});
```

Field descriptions:

| Field             | Type      | Description                          | Usage/Notes |
| ---------------- | --------- | ------------------------------------ | ----------- |
| id               | integer   | Primary key                          | Review identifier |
| productId        | integer   | Reference to product                 | Product being reviewed |
| userId           | integer   | Reference to user                    | Review author |
| userName         | text      | Author's name                        | Display name |
| userAvatar       | text      | Author's avatar                      | Profile picture |
| parentReviewId   | integer   | Parent review for replies            | Review threading |
| rating           | integer   | Star rating (1-5)                    | Product rating |
| title           | text      | Review title                         | Optional heading |
| comment         | text      | Review content                       | Main review text |
| hasImage        | boolean   | Has attached image                   | Image flag |
| imageUrl        | text      | Review image                         | Optional image |
| likesCount      | integer   | Number of likes                      | Social engagement |
| likedBy         | text      | Users who liked (JSON)               | Like tracking |
| replies         | text      | Reply reviews (JSON)                 | Nested replies |
| replyCount      | integer   | Number of replies                    | Quick count |
| isVerifiedPurchase| boolean  | Verified buyer                       | Purchase verification |
| status          | text      | Review status                        | Moderation state |
| reviewDate      | timestamp | Review submission date               | Display date |
| createdAt       | timestamp | Record creation                      | Audit trail |
| updatedAt       | timestamp | Last update                         | Audit trail |

**Query Examples:**

```typescript
// Get product reviews with user details
const getProductReviews = async (productId: number) => {
  return await db
    .select({
      review: reviews,
      user: {
        id: users.id,
        name: sql`${users.firstName} || ' ' || ${users.lastName}`,
        avatar: users.profilePicture,
      },
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(
      and(
        eq(reviews.productId, productId),
        eq(reviews.status, 'published'),
        isNull(reviews.parentReviewId)
      )
    )
    .orderBy(desc(reviews.createdAt))
    .all();
};

// Get review replies
const getReviewReplies = async (reviewId: number) => {
  return await db
    .select()
    .from(reviews)
    .where(eq(reviews.parentReviewId, reviewId))
    .orderBy(asc(reviews.createdAt))
    .all();
};

// Update product rating
const updateProductRating = async (productId: number) => {
  const result = await db
    .select({
      avgRating: sql<number>`avg(${reviews.rating})`,
      count: sql<number>`count(*)`,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.productId, productId),
        eq(reviews.status, 'published'),
        isNotNull(reviews.rating)
      )
    )
    .get();

  if (result) {
    await db
      .update(products)
      .set({
        rating: result.avgRating,
        reviewCount: result.count,
      })
      .where(eq(products.id, productId))
      .run();
  }
};
```

#### Shopping Cart Tables

##### Carts Table

Active shopping sessions.

```typescript
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
});
```

Field descriptions:

| Field     | Type      | Description                          | Usage/Notes |
| --------- | --------- | ------------------------------------ | ----------- |
| id        | integer   | Primary key                          | Cart identifier |
| userId    | integer   | Owner reference                      | User association |
| createdAt | timestamp | Cart creation                        | Session start |
| updatedAt | timestamp | Last modification                    | Activity tracking |

**Query Examples:**

```typescript
// Get or create user's cart
const getUserCart = async (userId: number) => {
  let cart = await db
    .select()
    .from(carts)
    .where(eq(carts.userId, userId))
    .get();

  if (!cart) {
    const result = await db
      .insert(carts)
      .values({ userId })
      .run();
    
    cart = await db
      .select()
      .from(carts)
      .where(eq(carts.id, result.lastInsertRowId))
      .get();
  }

  return cart;
};
```

##### Cart Items Table

Products in shopping carts.

```typescript
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
});
```

Field descriptions:

| Field            | Type      | Description                          | Usage/Notes |
| --------------- | --------- | ------------------------------------ | ----------- |
| id              | integer   | Primary key                          | Item identifier |
| cartId          | integer   | Cart reference                       | Parent cart |
| userId          | integer   | User reference                       | Quick access |
| productId       | integer   | Product reference                    | Product link |
| productName     | text      | Denormalized product name            | Display without joins |
| productImage    | text      | Product image URL                    | Quick display |
| shortDescription| text      | Product summary                      | Cart display |
| seller          | text      | Seller information                   | Order grouping |
| quantity        | integer   | Quantity selected                    | Order amount |
| price           | real      | Original price                       | Price tracking |
| discountedPrice | real      | Applied price                        | With discounts |
| total           | real      | Line item total                      | quantity × price |
| inStock         | boolean   | Current availability                 | Stock check |
| createdAt       | timestamp | Item addition                        | Audit trail |
| updatedAt       | timestamp | Last modification                    | Audit trail |

**Query Examples:**

```typescript
// Get cart items with product details
const getCartItems = async (cartId: number) => {
  return await db
    .select({
      item: cartItems,
      product: {
        id: products.id,
        name: products.name,
        image: products.imageUrl,
        stock: products.stockCount,
      },
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.cartId, cartId))
    .all();
};

// Add item to cart
const addToCart = async (
  cartId: number,
  userId: number,
  productId: number,
  quantity: number
) => {
  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .get();

  if (!product) throw new Error('Product not found');

  const existingItem = await db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.productId, productId)
      )
    )
    .get();

  if (existingItem) {
    return await db
      .update(cartItems)
      .set({
        quantity: existingItem.quantity + quantity,
        total: (existingItem.quantity + quantity) * product.discountedPrice,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(cartItems.id, existingItem.id))
      .run();
  }

  return await db
    .insert(cartItems)
    .values({
      cartId,
      userId,
      productId,
      productName: product.name,
      productImage: product.imageUrl,
      shortDescription: product.shortDescription,
      seller: product.seller,
      quantity,
      price: product.price,
      discountedPrice: product.discountedPrice,
      total: quantity * product.discountedPrice,
      inStock: product.inStock,
    })
    .run();
};
```

## Migration System

The app uses a simple migration system to manage schema changes:

```typescript
// Example migration
export async function up(db: Database) {
  await db.schema
    .alterTable('products')
    .addColumn('discountedPrice', 'real')
    .execute();
}

export async function down(db: Database) {
  await db.schema
    .alterTable('products')
    .dropColumn('discountedPrice')
    .execute();
}
```

For running migrations:
```typescript
import { migrate } from './migrate';

// Run migrations on app startup
await migrate(db);
```

## Best Practices

1. **Data Integrity**
   - Use transactions for related operations
   - Maintain referential integrity
   - Validate data before insertion
   - Keep denormalized data in sync

2. **Performance**
   - Index frequently queried columns
   - Use appropriate data types
   - Optimize complex queries
   - Monitor query performance

3. **Security**
   - Validate user permissions
   - Sanitize user inputs
   - Implement proper access controls
   - Secure sensitive data

4. **Maintenance**
   - Regular backups
   - Schema versioning
   - Data cleanup routines
   - Monitor database size

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Expo SQLite Guide](https://docs.expo.dev/versions/latest/sdk/sqlite/)
