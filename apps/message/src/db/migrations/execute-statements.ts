// Copyright (c) Meta Platforms, Inc. and affiliates.
import { getSqlite } from '../index'

export async function executeStatements(statements: string[]) {
  try {
    // Get fresh instance each time to avoid using stale closed connection
    const sqlite = getSqlite()
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sqlite.execAsync(statement)
        } catch (error) {
          console.error('Failed to execute SQL statement:', statement, error)
          throw error
        }
      }
    }
    return true
  } catch (error) {
    console.error('Failed to execute statements:', error)
    throw error
  }
}
