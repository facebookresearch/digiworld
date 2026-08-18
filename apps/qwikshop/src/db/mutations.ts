import { sql } from 'drizzle-orm'
import { db } from '@/db/index'
import {
  users,
  products,
  carts,
  cartItems,
  orders,
  orderItems,
  addresses as addressesTable,
  productImages,
  categories,
  subcategories,
  paymentMethods,
  wishlists,
  reviews,
  promoCodes,
} from '@/db/schema'
import usersStaticMock from '../data/mock-users.json'
import productsStaticMock from '../data/mock-products.json'
import categoriesStaticMock from '../data/mock-categories.json'
import cartsStaticMock from '../data/mock-carts.json'
import ordersStaticMock from '../data/mock-orders.json'
import promoCodesStaticMock from '../data/mock-promo_codes.json'

import { createReadJSONFile } from '@andojo/shared-mock-reader'

const bundledMocks = {
  'mock-users.json': usersStaticMock,
  'mock-products.json': productsStaticMock,
  'mock-categories.json': categoriesStaticMock,
  'mock-carts.json': cartsStaticMock,
  'mock-orders.json': ordersStaticMock,
  'mock-promo_codes.json': promoCodesStaticMock,
}

export const readJSONFile = createReadJSONFile(bundledMocks)

export interface Address {
  id: number
  userId: number
  fullName: string
  street: string
  city: string
  state: string
  pincode: string
  phone: string | null
  isDefault: boolean
  country: string | null
}

// async function readJSONFile(filename: string) {
//   try {
//     // First ry to read from storage
//     const baseDir = Platform.select({
//       android: `${RNFS.ExternalDirectoryPath}/mockdata`,
//       ios: `${RNFS.DocumentDirectoryPath}/mockdata`,
//       default: '',
//     })

//     const filePath = `${baseDir}/${filename}`
//     const exists = await RNFS.exists(filePath)

//     if (exists) {
//       console.log(`Reading ${filename} from storage`)
//       const content = await RNFS.readFile(filePath, 'utf8')
//       return JSON.parse(content)
//     } else {
//       // If file doesn't exist in storage, use imported mock data
//       console.log(`File ${filename} not found in storage, using imported data`)
//       switch (filename) {
//         case 'mock_users.json':
//           return usersStaticMock
//         case 'mock_product_catalog.json':
//           return productsStaticMock
//         case 'mock_categories.json':
//           return categoriesStaticMock
//         case 'mock_carts.json':
//           return cartsStaticMock
//         case 'mock_orders.json':
//           return ordersStaticMock
//         case 'mock_promo_codes.json':
//           return promoCodesStaticMock
//         default:
//           console.error(`Unknown mock file: ${filename}`)
//           return null
//       }
//     }
//   } catch (error) {
//     console.error(`Error accessing ${filename}:`, error)
//     return null
//   }
// }

export const mutations = {
  async initializeDatabase() {
    try {
      // Check if database is already initialized by checking all main tables
      const [existingUsers, existingCategories, existingProducts] =
        await Promise.all([
          db
            .select({ count: sql`count(*)` })
            .from(users)
            .get(),
          db
            .select({ count: sql`count(*)` })
            .from(categories)
            .get(),
          db
            .select({ count: sql`count(*)` })
            .from(products)
            .get(),
        ])

      const hasExistingData =
        (existingUsers as { count: number }).count > 0 ||
        (existingCategories as { count: number }).count > 0 ||
        (existingProducts as { count: number }).count > 0

      if (hasExistingData) {
        console.log('Database already has data, skipping initialization')
        return { success: true, skipped: true }
      }

      // Load all JSON files in parallel for faster data loading
      const [
        usersMock,
        productsMock,
        categoriesMock,
        cartsMock,
        ordersMock,
        promoCodesMock,
      ] = await Promise.all([
        readJSONFile('mock-users.json'),
        readJSONFile('mock-products.json'),
        readJSONFile('mock-categories.json'),
        readJSONFile('mock-carts.json'),
        readJSONFile('mock-orders.json'),
        readJSONFile('mock-promo_codes.json'),
      ])

      console.log('Starting fresh initialization...')
      console.log('Users:', usersMock.length)
      console.log('Products:', productsMock.length)
      console.log('Categories:', categoriesMock.length)
      console.log('Carts:', cartsMock.length)
      console.log('Orders:', ordersMock.length)
      console.log('Promo Codes:', promoCodesMock.length)

      // Create a map to store user IDs for reviews
      const userIdMap = new Map()

      // Insert in transaction - using batch operations for much faster initialization
      await db.transaction(async (tx: any) => {
        // Batch insert users first
        console.log('Inserting users...')
        if (usersMock.length > 0) {
          const userResults = await tx
            .insert(users)
            .values(
              usersMock.map((user: any) => ({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email,
                password: user.password,
                phoneNumber: user.phoneNumber || null,
                profilePicture: user.profilePicture || null,
                cartId: null,
              })),
            )
            .returning({ insertedId: users.id })

          // Map mock IDs to real IDs
          usersMock.forEach((user: any, index: number) => {
            const userId = userResults[index].insertedId
            userIdMap.set(user.id, userId)
            ;(user as any)._insertedId = userId
          })
        }

        // Batch insert wishlists
        const allWishlists: any[] = []
        usersMock.forEach((user: any) => {
          if (user.wishlistIds && Array.isArray(user.wishlistIds)) {
            user.wishlistIds.forEach((productId: any) => {
              allWishlists.push({
                userId: (user as any)._insertedId,
                productId,
              })
            })
          }
        })
        if (allWishlists.length > 0) {
          await tx.insert(wishlists).values(allWishlists)
        }

        // Batch insert addresses
        const allAddresses: any[] = []
        usersMock.forEach((user: any) => {
          if (user.addresses && Array.isArray(user.addresses)) {
            user.addresses.forEach((address: any) => {
              allAddresses.push({
                userId: (user as any)._insertedId,
                fullName: address.fullName,
                street: address.street,
                city: address.city,
                state: address.state,
                pincode: address.pincode,
                phone: address.phone || null,
                // @ts-ignore
                country: address.country || 'United States',
                isDefault: address.isDefault ? 1 : 0,
              })
            })
          }
        })
        if (allAddresses.length > 0) {
          const addressResults = await tx
            .insert(addressesTable)
            .values(allAddresses)
            .returning({ insertedId: addressesTable.id })

          // Map addresses to users for later use
          let addressIndex = 0
          usersMock.forEach((user: any) => {
            const userAddresses = new Map()
            if (user.addresses && Array.isArray(user.addresses)) {
              user.addresses.forEach((address: any) => {
                const addressId = addressResults[addressIndex].insertedId
                const addressKey = `${address.fullName}-${address.street}-${address.city}-${address.state}-${address.pincode}`
                userAddresses.set(addressKey, addressId)
                addressIndex++
              })
            }
            ;(user as any)._addressMap = userAddresses
          })
        }

        // Batch insert payment methods
        const allPaymentMethods: any[] = []
        usersMock.forEach((user: any) => {
          if (user.paymentMethods && Array.isArray(user.paymentMethods)) {
            user.paymentMethods.forEach((paymentMethod: any) => {
              allPaymentMethods.push({
                userId: (user as any)._insertedId,
                type: paymentMethod.type || 'card',
                cardType: paymentMethod.cardType || null,
                nameOnCard: paymentMethod.nameOnCard || null,
                cardNumber: paymentMethod.cardNumber || null,
                expiryMonth: paymentMethod.expiryMonth || null,
                expiryYear: paymentMethod.expiryYear || null,
                billingAddressId: paymentMethod.billingAddressId || null,
                isDefault: paymentMethod.isDefault ? 1 : 0,
              })
            })
          }
        })
        if (allPaymentMethods.length > 0) {
          await tx.insert(paymentMethods).values(allPaymentMethods)
        }

        // Batch insert categories
        console.log('Inserting categories...')
        const categoryMap = new Map()
        const subcategoryMap = new Map()

        if (categoriesMock.length > 0) {
          const categoryResults = await tx
            .insert(categories)
            .values(
              categoriesMock.map((category: any) => ({
                name: category.name,
                icon: category.icon,
              })),
            )
            .returning({ insertedId: categories.id })

          // Build category ID mapping
          categoriesMock.forEach((category: any, index: number) => {
            const categoryId = categoryResults[index].insertedId
            categoryMap.set(category.id, categoryId)
            ;(category as any)._insertedId = categoryId
          })

          // Batch insert all subcategories
          const allSubcategories: any[] = []
          categoriesMock.forEach((category: any) => {
            if (
              category.subcategories &&
              Array.isArray(category.subcategories)
            ) {
              category.subcategories.forEach((subcategory: any) => {
                allSubcategories.push({
                  name: subcategory.name,
                  parentCategoryId: (category as any)._insertedId,
                  _mockCategoryId: category.id,
                  _mockSubcategoryId: subcategory.id,
                })
              })
            }
          })

          if (allSubcategories.length > 0) {
            const subcategoryResults = await tx
              .insert(subcategories)
              .values(
                allSubcategories.map((sub: any) => ({
                  name: sub.name,
                  parentCategoryId: sub.parentCategoryId,
                })),
              )
              .returning({ insertedId: subcategories.id })

            // Build subcategory ID mapping
            allSubcategories.forEach((sub: any, index: number) => {
              const subcategoryId = subcategoryResults[index].insertedId
              const compositeKey = `${sub._mockCategoryId}-${sub._mockSubcategoryId}`
              subcategoryMap.set(compositeKey, subcategoryId)
            })
          }
        }

        // Verify category insertion
        const catCount = await tx
          .select({ count: sql`count(*)` })
          .from(categories)
          .get()
        console.log('Verified categories count:', catCount)

        // Batch insert products with mapped category IDs
        console.log('Inserting products...')
        const validProducts: any[] = []
        productsMock.forEach((product: any) => {
          const categoryId = categoryMap.get(product.categoryId)
          const compositeKey = `${product.categoryId}-${product.subcategoryId}`
          const subcategoryId = subcategoryMap.get(compositeKey)

          if (!categoryId || !subcategoryId) {
            console.error(
              `Missing category mapping for product ${product.name}:`,
              {
                categoryId: product.categoryId,
                subcategoryId: product.subcategoryId,
                compositeKey,
                foundCategoryId: categoryId,
                foundSubcategoryId: subcategoryId,
              },
            )
            return
          }

          validProducts.push({
            ...product,
            _categoryId: categoryId,
            _subcategoryId: subcategoryId,
          })
        })

        if (validProducts.length > 0) {
          const productResults = await tx
            .insert(products)
            .values(
              validProducts.map((product: any) => ({
                id: product.id,
                name: product.name,
                description: product.description,
                shortDescription: product.shortDescription,
                price: product.price,
                discountedPrice: product.discountedPrice,
                discountPercent: product.discountPercent,
                rating: product.rating,
                reviewCount: product.reviewCount,
                seller: product.seller,
                categoryId: product._categoryId,
                categoryName: product.categoryName,
                subcategoryId: product._subcategoryId,
                subcategoryName: product.subcategoryName,
                inStock: product.inStock ? 1 : 0,
                stockCount: product.stockCount,
                imageUrl: product.imageUrl,
                specs: JSON.stringify(product.specs),
                tags: JSON.stringify(product.tags),
                isFeatured: product.isFeatured ? 1 : 0,
              })),
            )
            .returning({ insertedId: products.id })

          // Store product IDs for later use
          validProducts.forEach((product: any, index: number) => {
            ;(product as any)._insertedId = productResults[index].insertedId
          })

          console.log(`Inserted ${productResults.length} products`)

          // Batch insert product images
          const allProductImages: any[] = []
          validProducts.forEach((product: any) => {
            if (product.imageGallery && Array.isArray(product.imageGallery)) {
              product.imageGallery.forEach((url: string, index: number) => {
                allProductImages.push({
                  productId: (product as any)._insertedId,
                  url,
                  position: index,
                })
              })
            }
          })
          if (allProductImages.length > 0) {
            await tx.insert(productImages).values(allProductImages)
          }

          // Batch insert reviews
          const allReviews: any[] = []
          const allReviewReplies: any[] = []
          validProducts.forEach((product: any) => {
            if (product.reviews && Array.isArray(product.reviews)) {
              product.reviews.forEach((review: any) => {
                const realUserId = userIdMap.get(review.userId)
                if (!realUserId) {
                  console.warn(
                    `Skipping review - User ID ${review.userId} not found for product ${product.name}`,
                  )
                  return
                }

                allReviews.push({
                  productId: (product as any)._insertedId,
                  userId: realUserId,
                  userName:
                    `${review.userFirstName} ${review.userLastName}`.trim(),
                  userAvatar: review.userProfilePic || null,
                  parentReviewId: null,
                  rating: review.rating,
                  title: review.title,
                  comment: review.text,
                  hasImage: review.hasImage ? 1 : 0,
                  imageUrl: review.imageUrl,
                  likesCount: review.helpfulCount || 0,
                  likedBy: '[]',
                  replies: JSON.stringify(review.replies || []),
                  replyCount: review.replies?.length || 0,
                  isVerifiedPurchase: review.isVerifiedPurchase ? 1 : 0,
                  status: 'published',
                  reviewDate: review.date,
                  _mockReview: review, // Store for replies processing
                  _productId: (product as any)._insertedId,
                })
              })
            }
          })

          if (allReviews.length > 0) {
            const reviewResults = await tx
              .insert(reviews)
              .values(
                allReviews.map((review: any) => {
                  const { _mockReview, _productId, ...reviewData } = review
                  return reviewData
                }),
              )
              .returning({ insertedId: reviews.id })

            // Store review IDs and prepare replies
            allReviews.forEach((review: any, index: number) => {
              const reviewId = reviewResults[index].insertedId
              if (
                review._mockReview.replies &&
                Array.isArray(review._mockReview.replies)
              ) {
                review._mockReview.replies.forEach((reply: any) => {
                  if (reply.from === 'Seller') {
                    allReviewReplies.push({
                      productId: review._productId,
                      userId: 1,
                      userName: reply.from,
                      userAvatar: null,
                      parentReviewId: reviewId,
                      rating: null,
                      title: null,
                      comment: reply.text,
                      hasImage: 0,
                      imageUrl: null,
                      likesCount: 0,
                      likedBy: '[]',
                      replies: '[]',
                      replyCount: 0,
                      isVerifiedPurchase: 0,
                      status: 'published',
                      reviewDate: reply.date,
                    })
                  }
                })
              }
            })

            // Batch insert review replies
            if (allReviewReplies.length > 0) {
              await tx.insert(reviews).values(allReviewReplies)
            }

            console.log(
              `Inserted ${reviewResults.length} reviews and ${allReviewReplies.length} replies`,
            )
          }
        }

        // Batch insert carts and cart items
        console.log('Inserting carts...')
        const validCarts: any[] = []
        cartsMock.forEach((cart: any) => {
          const user = usersMock.find((u: any) => u.id === cart.userId)
          if (!user || !(user as any)._insertedId) {
            console.error(`User not found for cart ${cart.userId}`)
            return
          }
          validCarts.push({
            ...cart,
            _userId: (user as any)._insertedId,
          })
        })

        if (validCarts.length > 0) {
          const cartResults = await tx
            .insert(carts)
            .values(
              validCarts.map((cart: any) => ({
                userId: cart._userId,
              })),
            )
            .returning({ insertedId: carts.id })

          // Batch insert cart items
          const allCartItems: any[] = []
          validCarts.forEach((cart: any, index: number) => {
            const cartId = cartResults[index].insertedId
            if (cart.items && Array.isArray(cart.items)) {
              cart.items.forEach((item: any) => {
                allCartItems.push({
                  userId: cart._userId,
                  cartId,
                  productId: item.productId,
                  productName: item.productName,
                  productImage: item.productImage,
                  shortDescription: item.shortDescription,
                  sku: item.sku,
                  categoryName: item.categoryName,
                  subcategoryName: item.subcategoryName,
                  seller: item.seller,
                  quantity: item.quantity,
                  price: item.price,
                  discountedPrice: item.discountedPrice,
                  total: item.total || 10000,
                  savedAmount: item.savedAmount,
                  inStock: item.inStock ? 1 : 0,
                })
              })
            }
          })
          if (allCartItems.length > 0) {
            await tx.insert(cartItems).values(allCartItems)
          }
        }

        // Batch insert promo codes
        console.log('Inserting promo codes...')
        if (promoCodesMock.length > 0) {
          await tx.insert(promoCodes).values(
            promoCodesMock.map((promoCode: any) => ({
              code: promoCode.code,
              description: promoCode.description,
              discountType: promoCode.discountType,
              discountValue: promoCode.discountValue,
              minPurchase: promoCode.minPurchase,
              maxDiscount: promoCode.maxDiscount,
              isFirstOrderOnly: promoCode.isFirstOrderOnly ? 1 : 0,
              validFrom: promoCode.validFrom,
              validUntil: promoCode.validUntil,
              isActive: promoCode.isActive ? 1 : 0,
              usageLimit: promoCode.usageLimit,
              usageCount: promoCode.usageCount,
              applicableCategories: JSON.stringify(
                promoCode.applicableCategories,
              ),
              termsAndConditions: JSON.stringify(promoCode.termsAndConditions),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })),
          )
        }

        // Batch insert orders and order items
        console.log('Inserting orders...')
        const validOrders: any[] = []
        const newAddresses: any[] = []

        // First pass: prepare orders and identify missing addresses
        ordersMock.forEach((order: any) => {
          const user = usersMock.find((u: any) => u.id === order.userId)
          if (!user || !(user as any)._insertedId) {
            console.error(`User not found for order ${order.id}`)
            return
          }

          const addressKey = `${order.deliveryAddress.fullName}-${order.deliveryAddress.street}-${order.deliveryAddress.city}-${order.deliveryAddress.state}-${order.deliveryAddress.pincode}`
          const shippingAddressId = (user as any)._addressMap?.get(addressKey)

          if (!shippingAddressId) {
            // Mark for new address creation
            newAddresses.push({
              userId: (user as any)._insertedId,
              fullName: order.deliveryAddress.fullName,
              street: order.deliveryAddress.street,
              city: order.deliveryAddress.city,
              state: order.deliveryAddress.state,
              pincode: order.deliveryAddress.pincode,
              phone: order.deliveryAddress.phone,
              isDefault: 0,
              _addressKey: addressKey,
              _userId: user.id,
            })
          }

          validOrders.push({
            ...order,
            _userId: (user as any)._insertedId,
            _addressKey: addressKey,
            _hasExistingAddress: !!shippingAddressId,
            _shippingAddressId: shippingAddressId,
          })
        })

        // Batch insert new addresses if needed
        if (newAddresses.length > 0) {
          const newAddressResults = await tx
            .insert(addressesTable)
            .values(
              newAddresses.map((addr: any) => {
                const { _addressKey, _userId, ...addressData } = addr
                return addressData
              }),
            )
            .returning({ insertedId: addressesTable.id })

          // Update address maps
          newAddresses.forEach((addr: any, index: number) => {
            const addressId = newAddressResults[index].insertedId
            const user = usersMock.find((u: any) => u.id === addr._userId)
            if (user && (user as any)._addressMap) {
              ;(user as any)._addressMap.set(addr._addressKey, addressId)
            }
            // Update orders with the new address ID
            validOrders.forEach((order: any) => {
              if (
                order._addressKey === addr._addressKey &&
                !order._hasExistingAddress
              ) {
                order._shippingAddressId = addressId
              }
            })
          })
        }

        // Batch insert orders
        if (validOrders.length > 0) {
          const orderResults = await tx
            .insert(orders)
            .values(
              validOrders.map((order: any) => ({
                userId: order._userId,
                orderNumber: order.orderNumber,
                status: order.status.toLowerCase(),
                totalAmount: order.grandTotal,
                subtotal: order.subtotal,
                totalSavings: order.totalSavings,
                shipping: order.shipping,
                tax: order.tax,
                couponDiscount: order.couponDiscount,
                couponCode: order.couponCode,
                shippingAddressId: order._shippingAddressId,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus?.toLowerCase() || 'pending',
                orderDate: order.orderDate,
                shippedDate: order.shippedDate,
                deliveryDate: order.deliveryDate,
                estimatedDeliveryDate: order.estimatedDeliveryDate,
                trackingNumber: order.trackingNumber,
                courierPartner: order.courierPartner,
                invoiceUrl: order.invoiceUrl,
                isGift: order.isGift ? 1 : 0,
                giftMessage: order.giftMessage,
              })),
            )
            .returning({ insertedId: orders.id })

          // Batch insert order items
          const allOrderItems: any[] = []
          validOrders.forEach((order: any, index: number) => {
            const orderId = orderResults[index].insertedId
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach((item: any) => {
                allOrderItems.push({
                  orderId,
                  productId: item.productId,
                  productName: item.productName,
                  productImage: item.productImage,
                  shortDescription: item.shortDescription || '',
                  sku: item.sku,
                  seller: item.seller || '',
                  quantity: item.quantity,
                  price: item.price,
                  discountedPrice: item.discountedPrice,
                  total: item.total,
                  savedAmount:
                    item.savedAmount ||
                    (item.price - item.discountedPrice) * item.quantity,
                })
              })
            }
          })
          if (allOrderItems.length > 0) {
            await tx.insert(orderItems).values(allOrderItems)
          }
          console.log(
            `Inserted ${orderResults.length} orders with ${allOrderItems.length} items`,
          )
        }
      })

      console.log('Database initialization complete!')
      return { success: true }
    } catch (error) {
      console.error('Failed to initialize database:', error)
      return { success: false, error }
    }
  },
}
