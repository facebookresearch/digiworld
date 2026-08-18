import { sqlite } from '../index'

export async function executeStatements(statements: string[]) {
  try {
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
