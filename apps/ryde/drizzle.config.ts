// Copyright (c) Meta Platforms, Inc. and affiliates.
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'expo',
  dialect: 'sqlite',
  verbose: true,
  strict: true,
  migrations: {
    table: '_migrations',
    schema: './drizzle/migrations',
  },
} satisfies Config
