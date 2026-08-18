// Copyright (c) Meta Platforms, Inc. and affiliates.
import { sql } from 'drizzle-orm'
import {
  users,
  userLocations,
  vehicleTypes,
  vehicles,
  paymentMethods,
  parkingZones,
  vehicleTypeRates,
  parkingHistory,
  notifications,
} from './schema'
import { db } from './index'
import { createReadJSONFile } from '@andojo/shared-mock-reader'
import usersStaticMock from '../data/mock-users.json'
import userLocationsMock from '../data/mock-user_locations.json'
import vehicleTypesMock from '../data/mock-vehicle_types.json'
import vehiclesMock from '../data/mock-vehicles.json'
import paymentMethodsMock from '../data/mock-payment_methods.json'
import parkingZonesMock from '../data/mock-parking_zones.json'
import vehicleTypeRatesMock from '../data/mock-vehicle_type_rates.json'
import parkingHistoryMock from '../data/mock-parking_history.json'
import notificationsMock from '../data/mock-notifications.json'

const bundledMocks = {
  'mock-users.json': usersStaticMock,
  'mock-user_locations.json': userLocationsMock,
  'mock-vehicle_types.json': vehicleTypesMock,
  'mock-vehicles.json': vehiclesMock,
  'mock-payment_methods.json': paymentMethodsMock,
  'mock-parking_zones.json': parkingZonesMock,
  'mock-vehicle_type_rates.json': vehicleTypeRatesMock,
  'mock-parking_history.json': parkingHistoryMock,
  'mock-notifications.json': notificationsMock,
}

export const readJSONFile = createReadJSONFile(bundledMocks)

export const mutations = {
  async initializeDatabase(): Promise<{
    success: boolean
    skipped?: boolean
    error?: any
  }> {
    try {
      const [userCountResult, vehicleTypeCountResult, parkingZoneCountResult] =
        await Promise.all([
          db.select().from(users).limit(1).execute(),
          db.select().from(vehicleTypes).limit(1).execute(),
          db.select().from(parkingZones).limit(1).execute(),
        ])

      const isAlreadySeeded =
        userCountResult.length > 0 ||
        vehicleTypeCountResult.length > 0 ||
        parkingZoneCountResult.length > 0

      if (isAlreadySeeded) {
        console.log('Database already initialized, skipping seeding.')
        return { success: true, skipped: true }
      }

      console.log('Seeding database with mock data...')
      // Read all mock data in parallel
      const [
        usersData,
        userLocationsData,
        vehicleTypesData,
        vehiclesData,
        paymentMethodsData,
        parkingZonesData,
        vehicleTypeRatesData,
        parkingHistoryData,
        notificationsData,
      ] = await Promise.all([
        readJSONFile('mock-users.json'),
        readJSONFile('mock-user_locations.json'),
        readJSONFile('mock-vehicle_types.json'),
        readJSONFile('mock-vehicles.json'),
        readJSONFile('mock-payment_methods.json'),
        readJSONFile('mock-parking_zones.json'),
        readJSONFile('mock-vehicle_type_rates.json'),
        readJSONFile('mock-parking_history.json'),
        readJSONFile('mock-notifications.json'),
      ])

      console.log('Clearing tables...')
      // Clear tables in reverse dependency order
      const clearTables = [
        'notifications',
        'parking_history',
        'vehicle_type_rates',
        'parking_zones',
        'payment_methods',
        'vehicles',
        'user_locations',
        'vehicle_types', // This was missing!
        'users',
      ]
      for (const table of clearTables) {
        await db.run(sql.raw(`DELETE FROM ${table}`))
      }

      // Seed in dependency order using batch inserts
      console.log('Seeding vehicle types...')
      if (vehicleTypesData.length > 0) {
        try {
          await db
            .insert(vehicleTypes)
            .values(
              vehicleTypesData.map((vehicleType: any) => ({
                id: vehicleType.id,
                code: vehicleType.code,
                name: vehicleType.name,
                description: vehicleType.description,
                metadata: vehicleType.metadata,
                createdAt: vehicleType.createdAt,
              })),
            )
            .run()
          console.log(`Loaded ${vehicleTypesData.length} vehicle types`)
        } catch (error: any) {
          // If batch insert fails due to conflicts, fall back to individual inserts
          console.warn(
            'Batch insert failed, falling back to individual inserts with error handling',
          )
          let loadedTypes = 0
          let failedTypes = 0
          for (const vehicleType of vehicleTypesData) {
            try {
              await db.insert(vehicleTypes).values(vehicleType).run()
              loadedTypes++
            } catch (err: any) {
              // Ignore UNIQUE constraint errors (vehicle type already exists)
              if (err?.code !== 'SQLITE_CONSTRAINT_UNIQUE') {
                throw err
              }
              failedTypes++
            }
          }
          console.log(
            `Loaded ${loadedTypes} vehicle types, skipped ${failedTypes} duplicates`,
          )
        }
      }

      console.log('Seeding users...')
      if (usersData.length > 0) {
        await db
          .insert(users)
          .values(
            usersData.map((user: any) => ({
              id: user.id,
              email: user.email,
              password: user.password,
              fullName: user.fullName,
              phoneNumber: user.phoneNumber,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
              status: user.status,
              settings: user.settings,
              metadata: user.metadata,
            })),
          )
          .run()
        console.log(`Loaded ${usersData.length} users`)
      }

      console.log('Seeding user locations...')
      if (userLocationsData.length > 0) {
        await db
          .insert(userLocations)
          .values(
            userLocationsData.map((location: any) => ({
              id: location.id,
              userId: location.userId,
              label: location.label,
              address: location.address,
              latitude: location.latitude,
              longitude: location.longitude,
              isDefault: location.isDefault,
              createdAt: location.createdAt,
              updatedAt: location.updatedAt,
              metadata: location.metadata,
            })),
          )
          .run()
        console.log(`Loaded ${userLocationsData.length} user locations`)
      }

      console.log('Seeding vehicles...')
      if (vehiclesData.length > 0) {
        await db
          .insert(vehicles)
          .values(
            vehiclesData.map((vehicle: any) => ({
              id: vehicle.id,
              userId: vehicle.userId,
              vehicleTypeId: vehicle.vehicleTypeId,
              plateNumber: vehicle.plateNumber,
              nickname: vehicle.nickname,
              make: vehicle.make,
              model: vehicle.model,
              color: vehicle.color,
              year: vehicle.year,
              isDefault: vehicle.isDefault,
              createdAt: vehicle.createdAt,
              updatedAt: vehicle.updatedAt,
              metadata: vehicle.metadata,
            })),
          )
          .run()
        console.log(`Loaded ${vehiclesData.length} vehicles`)
      }

      console.log('Seeding payment methods...')
      if (paymentMethodsData.length > 0) {
        await db
          .insert(paymentMethods)
          .values(
            paymentMethodsData.map((paymentMethod: any) => ({
              id: paymentMethod.id,
              userId: paymentMethod.userId,
              type: paymentMethod.type,
              provider: paymentMethod.provider,
              displayName: paymentMethod.displayName,
              cardNumber: paymentMethod.cardNumber,
              lastFour: paymentMethod.lastFour,
              expiryMonth: paymentMethod.expiryMonth,
              expiryYear: paymentMethod.expiryYear,
              isDefault: paymentMethod.isDefault,
              createdAt: paymentMethod.createdAt,
              updatedAt: paymentMethod.updatedAt,
              metadata: paymentMethod.metadata,
            })),
          )
          .run()
        console.log(`Loaded ${paymentMethodsData.length} payment methods`)
      }

      console.log('Seeding parking zones...')
      if (parkingZonesData.length > 0) {
        await db
          .insert(parkingZones)
          .values(
            parkingZonesData.map((zone: any) => ({
              id: zone.id,
              name: zone.name,
              description: zone.description,
              latitude: zone.latitude,
              longitude: zone.longitude,
              zoneCode: zone.zoneCode,
              operator: zone.operator,
              zoneType: zone.zoneType,
              capacity: zone.capacity,
              rateCurrency: zone.rateCurrency,
              rateMultiplier: zone.rateMultiplier,
              isActive: zone.isActive,
              createdAt: zone.createdAt,
              updatedAt: zone.updatedAt,
              metadata: zone.metadata,
            })),
          )
          .run()
        console.log(`Loaded ${parkingZonesData.length} parking zones`)
      }

      console.log('Seeding vehicle type rates...')
      if (vehicleTypeRatesData.length > 0) {
        await db
          .insert(vehicleTypeRates)
          .values(
            vehicleTypeRatesData.map((rate: any) => ({
              id: rate.id,
              vehicleTypeId: rate.vehicleTypeId,
              ratePerHour: rate.ratePerHour,
              currency: rate.currency,
              createdAt: rate.createdAt,
            })),
          )
          .run()
        console.log(`Loaded ${vehicleTypeRatesData.length} vehicle type rates`)
      }

      console.log('Seeding parking history...')
      if (parkingHistoryData.length > 0) {
        await db
          .insert(parkingHistory)
          .values(
            parkingHistoryData.map((history: any) => ({
              id: history.id,
              userId: history.userId,
              vehicleId: history.vehicleId,
              parkingZoneId: history.parkingZoneId,
              startTime: history.startTime,
              plannedEndTime: history.plannedEndTime,
              actualEndTime: history.actualEndTime,
              plannedDurationMinutes: history.plannedDurationMinutes,
              actualDurationMinutes: history.actualDurationMinutes,
              chargedAmount: history.chargedAmount,
              currency: history.currency,
              status: history.status,
              metadata: history.metadata,
              createdAt: history.createdAt,
              updatedAt: history.updatedAt,
            })),
          )
          .run()
        console.log(
          `Loaded ${parkingHistoryData.length} parking history records`,
        )
      }

      console.log('Seeding notifications...')
      if (notificationsData.length > 0) {
        await db
          .insert(notifications)
          .values(
            notificationsData.map((notif: any) => ({
              id: notif.id,
              userId: notif.userId,
              notificationType: notif.notificationType,
              title: notif.title,
              message: notif.message,
              relatedParkingHistoryId: notif.relatedParkingHistoryId,
              isRead: notif.isRead,
              readAt: notif.readAt,
              createdAt: notif.createdAt,
              expiresAt: notif.expiresAt,
              metadata: notif.metadata,
            })),
          )
          .run()
        console.log(`Loaded ${notificationsData.length} notifications`)
      }

      console.log('Database initialized successfully')
      return { success: true }
    } catch (error) {
      console.error('Error initializing database:', error)
      return { success: false, error }
    }
  },
}
