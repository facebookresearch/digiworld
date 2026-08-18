/**
 * Static Parking Tests
 *
 * These tests use a pre-built database copy for fast, repeatable testing.
 * They validate business logic against known data states.
 */

import Database from 'better-sqlite3'
import {
  runStaticTest,
  runStaticTests,
  setupStaticTests,
  teardownStaticTests,
} from './static-test-setup'

// Type assertion helper for database queries
// const asAny = <T>(value: T): any => value as any

// Setup and teardown for Jest
beforeAll(async () => {
  await setupStaticTests()
})

afterAll(async () => {
  await teardownStaticTests()
})

describe('Static Parking Tests', () => {
  describe('User Management', () => {
    test('should have test users in database', async () => {
      await runStaticTest('User existence check', async db => {
        const users = db.prepare('SELECT * FROM users').all() as any[]
        expect(users.length).toBeGreaterThan(0)

        // Check user structure
        users.forEach((user: any) => {
          expect(user.email).toBeDefined()
          expect(user.password).toBeDefined()
          expect(user.full_name).toBeDefined()
        })
      })
    })

    test('should have valid user email formats', async () => {
      await runStaticTest('User email validation', async db => {
        const users = db.prepare('SELECT email FROM users').all() as any[]

        users.forEach((user: any) => {
          expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
        })
      })
    })
  })

  describe('Vehicle Type Management', () => {
    test('should have vehicle types in database', async () => {
      await runStaticTest('Vehicle type existence check', async db => {
        const vehicleTypes = db
          .prepare('SELECT * FROM vehicle_types')
          .all() as any[]
        expect(vehicleTypes.length).toBeGreaterThan(0)

        vehicleTypes.forEach((vt: any) => {
          expect(vt.code).toBeDefined()
          expect(vt.name).toBeDefined()
          expect(vt.code).toMatch(/^[a-z_]+$/) // Lowercase codes
        })
      })
    })

    test('should have unique vehicle type codes', async () => {
      await runStaticTest('Vehicle type code uniqueness', async db => {
        const vehicleTypes = db
          .prepare('SELECT code FROM vehicle_types')
          .all() as any[]
        const codes = vehicleTypes.map((vt: any) => vt.code)
        const uniqueCodes = new Set(codes)
        expect(codes.length).toBe(uniqueCodes.size)
      })
    })
  })

  describe('Vehicle Type Rates', () => {
    test('should have vehicle type rates', async () => {
      await runStaticTest('Vehicle type rate existence check', async db => {
        const rates = db
          .prepare('SELECT * FROM vehicle_type_rates')
          .all() as any[]
        expect(rates.length).toBeGreaterThan(0)

        rates.forEach((rate: any) => {
          expect(rate.vehicle_type_id).toBeDefined()
          expect(rate.rate_per_hour).toBeGreaterThan(0)
          expect(rate.currency).toBeDefined()
        })
      })
    })

    test('should have valid rate relationships', async () => {
      await runStaticTest('Rate relationship validation', async db => {
        const rates = db
          .prepare(
            `
          SELECT vtr.*, vt.code as vehicle_type_code, vt.name as vehicle_type_name
          FROM vehicle_type_rates vtr
          JOIN vehicle_types vt ON vtr.vehicle_type_id = vt.id
        `,
          )
          .all() as any[]

        expect(rates.length).toBeGreaterThan(0)

        rates.forEach((rate: any) => {
          expect(rate.vehicle_type_code).toBeDefined()
          expect(rate.vehicle_type_name).toBeDefined()
        })
      })
    })
  })

  describe('Vehicle Management', () => {
    test('should have vehicles in database', async () => {
      await runStaticTest('Vehicle existence check', async db => {
        const vehicles = db.prepare('SELECT * FROM vehicles').all() as any[]
        expect(vehicles.length).toBeGreaterThan(0)

        vehicles.forEach((vehicle: any) => {
          expect(vehicle.plate_number).toBeDefined()
          expect(vehicle.user_id).toBeDefined()
          expect(vehicle.vehicle_type_id).toBeDefined()
        })
      })
    })

    test('should have unique plate numbers', async () => {
      await runStaticTest('Plate number uniqueness', async db => {
        const vehicles = db
          .prepare('SELECT plate_number FROM vehicles')
          .all() as any[]
        const plateNumbers = vehicles.map((v: any) => v.plate_number)
        const uniquePlates = new Set(plateNumbers)
        expect(plateNumbers.length).toBe(uniquePlates.size)
      })
    })

    test('should have valid vehicle user relationships', async () => {
      await runStaticTest('Vehicle user relationship validation', async db => {
        const vehicles = db
          .prepare(
            `
          SELECT v.*, u.email, u.full_name
          FROM vehicles v
          JOIN users u ON v.user_id = u.id
        `,
          )
          .all() as any[]

        expect(vehicles.length).toBeGreaterThan(0)

        vehicles.forEach((vehicle: any) => {
          expect(vehicle.email).toBeDefined()
          expect(vehicle.full_name).toBeDefined()
        })
      })
    })

    test('should have valid vehicle type relationships', async () => {
      await runStaticTest('Vehicle type relationship validation', async db => {
        const vehicles = db
          .prepare(
            `
          SELECT v.*, vt.code as vehicle_type_code, vt.name as vehicle_type_name
          FROM vehicles v
          JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
        `,
          )
          .all() as any[]

        expect(vehicles.length).toBeGreaterThan(0)

        vehicles.forEach((vehicle: any) => {
          expect(vehicle.vehicle_type_code).toBeDefined()
          expect(vehicle.vehicle_type_name).toBeDefined()
        })
      })
    })
  })

  describe('Parking Zone Management', () => {
    test('should have parking zones in database', async () => {
      await runStaticTest('Parking zone existence check', async db => {
        const zones = db.prepare('SELECT * FROM parking_zones').all() as any[]
        expect(zones.length).toBeGreaterThan(0)

        zones.forEach((zone: any) => {
          expect(zone.name).toBeDefined()
          expect(zone.latitude).toBeDefined()
          expect(zone.longitude).toBeDefined()
          expect(zone.rate_multiplier).toBeGreaterThan(0)
          expect(zone.is_active).toBeDefined()
        })
      })
    })

    test('should have valid parking zone coordinates', async () => {
      await runStaticTest('Parking zone coordinate validation', async db => {
        const zones = db
          .prepare('SELECT latitude, longitude FROM parking_zones')
          .all() as any[]

        zones.forEach((zone: any) => {
          // Valid latitude range: -90 to 90
          expect(zone.latitude).toBeGreaterThanOrEqual(-90)
          expect(zone.latitude).toBeLessThanOrEqual(90)
          // Valid longitude range: -180 to 180
          expect(zone.longitude).toBeGreaterThanOrEqual(-180)
          expect(zone.longitude).toBeLessThanOrEqual(180)
        })
      })
    })

    test('should have valid rate multipliers', async () => {
      await runStaticTest('Rate multiplier validation', async db => {
        const zones = db
          .prepare('SELECT rate_multiplier FROM parking_zones')
          .all() as any[]

        zones.forEach((zone: any) => {
          expect(zone.rate_multiplier).toBeGreaterThan(0)
          expect(zone.rate_multiplier).toBeLessThanOrEqual(10) // Reasonable upper limit
        })
      })
    })
  })

  describe('Parking History', () => {
    test('should have parking history records', async () => {
      await runStaticTest('Parking history existence check', async db => {
        const history = db
          .prepare('SELECT * FROM parking_history LIMIT 10')
          .all() as any[]
        expect(history.length).toBeGreaterThan(0)

        history.forEach((h: any) => {
          expect(h.user_id).toBeDefined()
          expect(h.vehicle_id).toBeDefined()
          expect(h.parking_zone_id).toBeDefined()
          expect(h.start_time).toBeDefined()
          expect(h.status).toBeDefined()
        })
      })
    })

    test('should have valid parking history statuses', async () => {
      await runStaticTest('Parking history status validation', async db => {
        const history = db
          .prepare('SELECT status FROM parking_history')
          .all() as any[]

        const validStatuses = [
          'booked',
          'active',
          'ongoing',
          'extended',
          'completed',
          'expired',
        ]

        history.forEach((h: any) => {
          expect(validStatuses).toContain(h.status)
        })
      })
    })

    test('should have valid parking history relationships', async () => {
      await runStaticTest(
        'Parking history relationship validation',
        async db => {
          const history = db
            .prepare(
              `
          SELECT ph.*, u.email, v.plate_number, pz.name as zone_name
          FROM parking_history ph
          JOIN users u ON ph.user_id = u.id
          JOIN vehicles v ON ph.vehicle_id = v.id
          JOIN parking_zones pz ON ph.parking_zone_id = pz.id
          LIMIT 10
        `,
            )
            .all() as any[]

          expect(history.length).toBeGreaterThan(0)

          history.forEach((h: any) => {
            expect(h.email).toBeDefined()
            expect(h.plate_number).toBeDefined()
            expect(h.zone_name).toBeDefined()
          })
        },
      )
    })

    test('should have valid time relationships', async () => {
      await runStaticTest('Parking history time validation', async db => {
        const history = db
          .prepare(
            `
          SELECT start_time, planned_end_time, actual_end_time, planned_duration_minutes, actual_duration_minutes
          FROM parking_history
          WHERE start_time IS NOT NULL
          LIMIT 10
        `,
          )
          .all() as any[]

        history.forEach((h: any) => {
          expect(new Date(h.start_time).getTime()).not.toBeNaN()
          if (h.planned_end_time) {
            expect(new Date(h.planned_end_time).getTime()).not.toBeNaN()
          }
          if (h.actual_end_time) {
            expect(new Date(h.actual_end_time).getTime()).not.toBeNaN()
          }
          if (h.planned_duration_minutes) {
            expect(h.planned_duration_minutes).toBeGreaterThan(0)
          }
          if (h.actual_duration_minutes) {
            expect(h.actual_duration_minutes).toBeGreaterThan(0)
          }
        })
      })
    })
  })

  describe('Payment Method Management', () => {
    test('should have payment methods in database', async () => {
      await runStaticTest('Payment method existence check', async db => {
        const methods = db
          .prepare('SELECT * FROM payment_methods')
          .all() as any[]
        expect(methods.length).toBeGreaterThan(0)

        methods.forEach((method: any) => {
          expect(method.user_id).toBeDefined()
          expect(method.type).toBeDefined()
          expect(method.card_number).toBeDefined()
          expect(method.last_four).toBeDefined()
        })
      })
    })

    test('should have valid payment method types', async () => {
      await runStaticTest('Payment method type validation', async db => {
        const methods = db
          .prepare('SELECT type FROM payment_methods')
          .all() as any[]

        const validTypes = ['credit_card', 'debit_card', 'wallet']

        methods.forEach((method: any) => {
          expect(validTypes).toContain(method.type)
        })
      })
    })

    test('should have valid last four digits', async () => {
      await runStaticTest('Last four digits validation', async db => {
        const methods = db
          .prepare('SELECT last_four FROM payment_methods')
          .all() as any[]

        methods.forEach((method: any) => {
          expect(method.last_four).toMatch(/^\d{4}$/)
        })
      })
    })

    test('should have valid payment method user relationships', async () => {
      await runStaticTest(
        'Payment method user relationship validation',
        async db => {
          const methods = db
            .prepare(
              `
          SELECT pm.*, u.email, u.full_name
          FROM payment_methods pm
          JOIN users u ON pm.user_id = u.id
        `,
            )
            .all() as any[]

          expect(methods.length).toBeGreaterThan(0)

          methods.forEach((method: any) => {
            expect(method.email).toBeDefined()
            expect(method.full_name).toBeDefined()
          })
        },
      )
    })
  })

  describe('User Location Management', () => {
    test('should have user locations in database', async () => {
      await runStaticTest('User location existence check', async db => {
        const locations = db
          .prepare('SELECT * FROM user_locations')
          .all() as any[]
        expect(locations.length).toBeGreaterThan(0)

        locations.forEach((location: any) => {
          expect(location.user_id).toBeDefined()
          expect(location.address).toBeDefined()
        })
      })
    })

    test('should have valid user location coordinates', async () => {
      await runStaticTest('User location coordinate validation', async db => {
        const locations = db
          .prepare(
            'SELECT latitude, longitude FROM user_locations WHERE latitude IS NOT NULL',
          )
          .all() as any[]

        locations.forEach((location: any) => {
          expect(location.latitude).toBeGreaterThanOrEqual(-90)
          expect(location.latitude).toBeLessThanOrEqual(90)
          expect(location.longitude).toBeGreaterThanOrEqual(-180)
          expect(location.longitude).toBeLessThanOrEqual(180)
        })
      })
    })

    test('should have valid user location relationships', async () => {
      await runStaticTest('User location relationship validation', async db => {
        const locations = db
          .prepare(
            `
          SELECT ul.*, u.email, u.full_name
          FROM user_locations ul
          JOIN users u ON ul.user_id = u.id
        `,
          )
          .all() as any[]

        expect(locations.length).toBeGreaterThan(0)

        locations.forEach((location: any) => {
          expect(location.email).toBeDefined()
          expect(location.full_name).toBeDefined()
        })
      })
    })
  })

  describe('Notification Management', () => {
    test('should have notifications in database', async () => {
      await runStaticTest('Notification existence check', async db => {
        const notifications = db
          .prepare('SELECT * FROM notifications')
          .all() as any[]
        expect(notifications.length).toBeGreaterThan(0)

        notifications.forEach((notif: any) => {
          expect(notif.user_id).toBeDefined()
          expect(notif.notification_type).toBeDefined()
          expect(notif.title).toBeDefined()
          expect(notif.message).toBeDefined()
        })
      })
    })

    test('should have valid notification read status', async () => {
      await runStaticTest('Notification read status validation', async db => {
        const notifications = db
          .prepare('SELECT is_read FROM notifications')
          .all() as any[]

        notifications.forEach((notif: any) => {
          expect([0, 1]).toContain(notif.is_read)
        })
      })
    })

    test('should have valid notification user relationships', async () => {
      await runStaticTest(
        'Notification user relationship validation',
        async db => {
          const notifications = db
            .prepare(
              `
          SELECT n.*, u.email, u.full_name
          FROM notifications n
          JOIN users u ON n.user_id = u.id
        `,
            )
            .all() as any[]

          expect(notifications.length).toBeGreaterThan(0)

          notifications.forEach((notif: any) => {
            expect(notif.email).toBeDefined()
            expect(notif.full_name).toBeDefined()
          })
        },
      )
    })
  })

  describe('Data Integrity', () => {
    test('should maintain foreign key relationships', async () => {
      await runStaticTest('Foreign key validation', async db => {
        // Test vehicle-user relationships
        const orphanedVehicles = db
          .prepare(
            `
          SELECT v.* FROM vehicles v
          LEFT JOIN users u ON v.user_id = u.id
          WHERE u.id IS NULL
        `,
          )
          .all()

        expect(orphanedVehicles.length).toBe(0)

        // Test parking history relationships
        const orphanedHistory = db
          .prepare(
            `
          SELECT ph.* FROM parking_history ph
          LEFT JOIN users u ON ph.user_id = u.id
          LEFT JOIN vehicles v ON ph.vehicle_id = v.id
          LEFT JOIN parking_zones pz ON ph.parking_zone_id = pz.id
          WHERE u.id IS NULL OR v.id IS NULL OR pz.id IS NULL
        `,
          )
          .all()

        expect(orphanedHistory.length).toBe(0)
      })
    })

    test('should have consistent charge amounts', async () => {
      await runStaticTest('Charge amount validation', async db => {
        const history = db
          .prepare('SELECT charged_amount FROM parking_history')
          .all() as any[]

        history.forEach((h: any) => {
          expect(h.charged_amount).toBeGreaterThanOrEqual(0)
          expect(typeof h.charged_amount).toBe('number')
          expect(Number.isFinite(h.charged_amount)).toBe(true)
        })
      })
    })
  })

  describe('Business Logic Validation', () => {
    test('should maintain vehicle type rate consistency', async () => {
      await runStaticTest('Rate consistency check', async db => {
        const rates = db
          .prepare(
            `
          SELECT vtr.*, vt.code
          FROM vehicle_type_rates vtr
          JOIN vehicle_types vt ON vtr.vehicle_type_id = vt.id
        `,
          )
          .all() as any[]

        // Each vehicle type should have at most one rate (UNIQUE constraint)
        const vehicleTypeIds = rates.map((r: any) => r.vehicle_type_id)
        const uniqueVehicleTypeIds = new Set(vehicleTypeIds)
        expect(vehicleTypeIds.length).toBe(uniqueVehicleTypeIds.size)
      })
    })

    test('should validate parking cost calculations', async () => {
      await runStaticTest('Parking cost calculation validation', async db => {
        const history = db
          .prepare(
            `
          SELECT 
            ph.charged_amount,
            ph.planned_duration_minutes,
            vtr.rate_per_hour,
            pz.rate_multiplier
          FROM parking_history ph
          JOIN vehicles v ON ph.vehicle_id = v.id
          JOIN vehicle_type_rates vtr ON v.vehicle_type_id = vtr.vehicle_type_id
          JOIN parking_zones pz ON ph.parking_zone_id = pz.id
          WHERE ph.planned_duration_minutes IS NOT NULL
          LIMIT 10
        `,
          )
          .all() as any[]

        history.forEach((h: any) => {
          const expectedCost =
            ((h.rate_per_hour * h.planned_duration_minutes) / 60) *
            h.rate_multiplier
          // Allow small rounding differences
          expect(Math.abs(h.charged_amount - expectedCost)).toBeLessThan(0.01)
        })
      })
    })
  })

  describe('Performance Tests', () => {
    test('should handle complex queries efficiently', async () => {
      await runStaticTest('Query performance test', async db => {
        const startTime = Date.now()

        const result = db
          .prepare(
            `
          SELECT 
            u.email,
            u.full_name,
            COUNT(v.id) as vehicle_count,
            COUNT(ph.id) as parking_history_count,
            SUM(ph.charged_amount) as total_spent
          FROM users u
          LEFT JOIN vehicles v ON u.id = v.user_id
          LEFT JOIN parking_history ph ON u.id = ph.user_id
          GROUP BY u.id, u.email, u.full_name
          ORDER BY total_spent DESC
        `,
          )
          .all()

        const duration = Date.now() - startTime

        expect(result.length).toBeGreaterThan(0)
        expect(duration).toBeLessThan(1000) // Should complete within 1 second
      })
    })

    test('should handle parking zone queries efficiently', async () => {
      await runStaticTest('Parking zone query performance', async db => {
        const startTime = Date.now()

        const result = db
          .prepare(
            `
          SELECT 
            pz.name,
            pz.rate_multiplier,
            COUNT(ph.id) as booking_count,
            SUM(ph.charged_amount) as total_revenue
          FROM parking_zones pz
          LEFT JOIN parking_history ph ON pz.id = ph.parking_zone_id
          GROUP BY pz.id, pz.name, pz.rate_multiplier
          ORDER BY total_revenue DESC
        `,
          )
          .all()

        const duration = Date.now() - startTime

        expect(result.length).toBeGreaterThan(0)
        expect(duration).toBeLessThan(1000) // Should complete within 1 second
      })
    })
  })
})

describe('Static Test Suite Performance', () => {
  test('should run all static tests efficiently', async () => {
    const tests = [
      {
        name: 'Quick user check',
        fn: async (db: Database.Database) => {
          const userCount = db
            .prepare('SELECT COUNT(*) as count FROM users')
            .get() as any
          expect(userCount.count).toBeGreaterThan(0)
        },
      },
      {
        name: 'Quick vehicle check',
        fn: async (db: Database.Database) => {
          const vehicleCount = db
            .prepare('SELECT COUNT(*) as count FROM vehicles')
            .get() as any
          expect(vehicleCount.count).toBeGreaterThan(0)
        },
      },
      {
        name: 'Quick parking zone check',
        fn: async (db: Database.Database) => {
          const zoneCount = db
            .prepare('SELECT COUNT(*) as count FROM parking_zones')
            .get() as any
          expect(zoneCount.count).toBeGreaterThan(0)
        },
      },
      {
        name: 'Quick parking history check',
        fn: async (db: Database.Database) => {
          const historyCount = db
            .prepare('SELECT COUNT(*) as count FROM parking_history')
            .get() as any
          expect(historyCount.count).toBeGreaterThan(0)
        },
      },
    ]

    const results = await runStaticTests(tests)

    // All tests should pass
    results.forEach(result => {
      expect(result.success).toBe(true)
    })

    // Total execution time should be reasonable
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
    expect(totalDuration).toBeLessThan(5000) // Should complete within 5 seconds
  })
})
