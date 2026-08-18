import { useState, useCallback } from 'react'
import { queries } from '@/db/queries'
import { DatabaseUser } from '@/app/types'

const useContactData = () => {
  const [databaseUsers, setDatabaseUsers] = useState<DatabaseUser[]>([])
  const [loadingDatabaseUsers, setLoadingDatabaseUsers] = useState(false)

  const loadDatabaseUsers = useCallback(async () => {
    try {
      setLoadingDatabaseUsers(true)
      console.log('🔍 Loading database users...')
      const users = await queries.getAllUsers()
      setDatabaseUsers(users)
      console.log('✅ Database users loaded:', users.length)
    } catch (error) {
      console.error('❌ Error loading database users:', error)
    } finally {
      setLoadingDatabaseUsers(false)
    }
  }, [])

  return {
    databaseUsers,
    loadingDatabaseUsers,
    loadDatabaseUsers,
  }
}

export type { DatabaseUser }
export default useContactData
