/** @type {import('drizzle-kit').Config} */
module.exports = {
  schema: './src/db/schema.ts', // Path to your schema file
  out: './drizzle', // Output directory for generated files
  dialect: 'sqlite', // Database dialect
  driver: 'expo', // Database driver
  dbCredentials: {
    url: 'andojomails.db',
  },
  verbose: true,
  strict: true,
  migration: {
    migrationsFolder: './drizzle/migrations',
    migrationsTable: '_migrations',
  },
}
