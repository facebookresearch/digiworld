// Copyright (c) Meta Platforms, Inc. and affiliates.
import { sqlite } from '../index'

export async function executeStatements(statements: string[]) {
  try {
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sqlite.execAsync(statement)
        } catch (error) {
          console.error('Failed to execute SQL statement:', statement, error)
          // If it's a "closed resource" error, try to reopen the connection
          if (
            error instanceof Error &&
            error.message.includes('closed resource')
          ) {
            console.log('Database connection closed, attempting to reopen...')
            // Wait a bit and try again
            await new Promise(resolve => setTimeout(resolve, 100))
            try {
              await sqlite.execAsync(statement)
              console.log('Successfully executed statement after reconnection')
            } catch (retryError) {
              console.error(
                'Failed to execute statement even after retry:',
                statement,
                retryError,
              )
              throw retryError
            }
          } else {
            throw error
          }
        }
      }
    }
    return true
  } catch (error) {
    console.error('Failed to execute statements:', error)
    throw error
  }
}
