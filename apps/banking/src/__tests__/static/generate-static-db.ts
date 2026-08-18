/**
 * Generate Static Database
 *
 * This script creates a static database file for use in static tests.
 * Run this script once to create the base database that will be copied
 * for each static test run.
 */

import { createStaticDatabase } from './simple-static-db-generator'

async function main() {
  try {
    console.log('Generating static database for tests...')
    await createStaticDatabase()
    console.log('Static database generated successfully!')
    console.log('You can now run static tests with: yarn test:static')
  } catch (error) {
    console.error('Failed to generate static database:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
