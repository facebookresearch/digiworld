import { useState, useEffect, useCallback } from 'react'

const useSearch = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 100) // Reduced from 150ms to 100ms for faster search

    return () => clearTimeout(timer)
  }, [searchQuery])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  return {
    searchQuery,
    debouncedSearchQuery,
    setSearchQuery,
    clearSearch,
  }
}

export default useSearch
